import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { sendSms } from "@/lib/twilio/sms";
import { servicePartsEta } from "@/lib/twilio/templates";
import { assertMechanicAssigned, type ServiceCommandResult } from "../guards";

async function notifyDriverPartsEta(
  jobId: string,
  minutes: number,
): Promise<void> {
  const job = await getJobById(jobId);
  const driverId = job.fields.driver_id?.[0];
  if (!driverId) {
    return;
  }

  try {
    const driver = await getDriverById(driverId);
    await sendSms(driver.fields.phone_number, servicePartsEta(minutes));
  } catch (error) {
    console.error(
      `[service/parts] Failed to notify driver for job ${jobId}:`,
      error,
    );
  }
}

/**
 * PARTS [minutes] — log parts ETA; no status change (§7.2).
 * Valid while job is in active service (`diagnosing` … `in_progress`).
 */
export async function handleParts(
  jobId: string,
  mechanicId: string,
  remainder: string,
): Promise<ServiceCommandResult> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  const minutes = Number.parseInt(remainder.trim(), 10);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    console.warn(
      `[service/parts] Invalid ETA "${remainder}" for job ${jobId}; logging only`,
    );
  } else {
    console.log(
      `[service/parts] Job ${jobId}: parts ETA ${minutes} minutes (status=${job.fields.status})`,
    );
    await notifyDriverPartsEta(jobId, minutes);
  }

  return {
    jobId,
    status: job.fields.status,
    action: "parts_eta_logged",
  };
}
