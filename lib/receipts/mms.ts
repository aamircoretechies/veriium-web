import { getEnv } from "@/config/env";
import {
  isReceiptUploadMock,
  isSmsMock,
  MOCK_RECEIPT_IMAGE_URL,
} from "@/lib/dev/flags";
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

async function downloadMedia(mediaUrl: string): Promise<ArrayBuffer> {
  // Staging: public HTTPS sample / pasted URLs (no Twilio Basic auth).
  if (isSmsMock()) {
    const res = await fetch(mediaUrl);
    if (!res.ok) {
      throw new Error(`Media download failed: ${res.status}`);
    }
    return res.arrayBuffer();
  }

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

async function resolveReceiptUrl(
  jobId: string,
  mediaUrl: string,
  buffer: ArrayBuffer,
  mimeType?: string,
): Promise<string> {
  if (isReceiptUploadMock()) {
    // Prefer the inbound media URL when it is already public HTTPS (Airtable fetchable).
    if (/^https:\/\//i.test(mediaUrl)) {
      console.info(
        `[receipts/mms] Receipt upload mock — using media URL for job ${jobId}`,
      );
      return mediaUrl;
    }
    console.info(
      `[receipts/mms] Receipt upload mock — placeholder URL for job ${jobId}`,
    );
    return MOCK_RECEIPT_IMAGE_URL;
  }

  return uploadBufferToCloudinary(buffer, {
    folder: `receipts/${jobId}`,
    mimeType,
  });
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
    buffer = await downloadMedia(input.mediaUrl);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "download failed";
    console.error(`[receipts/mms] Media download failed for job ${job.id}:`, error);
    return { action: "receipt_mms_download_failed", detail };
  }

  const receiptUrl = await resolveReceiptUrl(
    job.id,
    input.mediaUrl,
    buffer,
    input.mediaContentType,
  );

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
