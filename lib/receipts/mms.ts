import { getEnv } from "@/config/env";
import { findActiveJobForMechanic } from "@/lib/jobs/lookup";
import { findMechanicByPhone } from "@/lib/mechanics/lookup";
import { normalizeUsPhone } from "@/lib/phone";
import { uploadBufferToCloudinary } from "@/lib/cloudinary/server-upload";
import { jobRequiresReceipt } from "./eligibility";
import { submitReceipt } from "./submit";

export type HandleReceiptMmsInput = {
  from: string;
  mediaUrl: string;
  mediaContentType?: string;
};

export type HandleReceiptMmsResult =
  | { action: "receipt_mms_handled"; jobId: string; receiptUrl: string }
  | { action: "receipt_mms_no_mechanic" }
  | { action: "receipt_mms_no_active_job" }
  | { action: "receipt_mms_not_required" }
  | { action: "receipt_mms_download_failed"; detail: string };

async function downloadTwilioMedia(mediaUrl: string): Promise<ArrayBuffer> {
  const env = getEnv();
  const credentials = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);

  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) {
    throw new Error(`Twilio media download failed: ${res.status}`);
  }

  return res.arrayBuffer();
}

/** Process inbound MMS from assigned mechanic as parts receipt upload. */
export async function handleReceiptMms(
  input: HandleReceiptMmsInput,
): Promise<HandleReceiptMmsResult> {
  const phoneE164 = normalizeUsPhone(input.from);
  const mechanic = await findMechanicByPhone(phoneE164);
  if (!mechanic) {
    return { action: "receipt_mms_no_mechanic" };
  }

  const job = await findActiveJobForMechanic(phoneE164);
  if (!job) {
    return { action: "receipt_mms_no_active_job" };
  }

  if (!jobRequiresReceipt(job.fields)) {
    return { action: "receipt_mms_not_required" };
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await downloadTwilioMedia(input.mediaUrl);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "download failed";
    console.error(`[receipts/mms] Media download failed for job ${job.id}:`, error);
    return { action: "receipt_mms_download_failed", detail };
  }

  const receiptUrl = await uploadBufferToCloudinary(buffer, {
    folder: `receipts/${job.id}`,
    mimeType: input.mediaContentType,
  });

  const result = await submitReceipt({
    jobId: job.id,
    mechanicId: mechanic.id,
    receiptUrl,
    source: "mms",
  });

  return {
    action: "receipt_mms_handled",
    jobId: result.jobId,
    receiptUrl: result.receiptUrl,
  };
}
