import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { sendSms } from "@/lib/twilio/sms";
import { serviceDiagnosingDriver } from "@/lib/twilio/templates";
import {
  assertMechanicAssigned,
  type ServiceCommandResult,
} from "../guards";
import { InvalidServiceCommandError } from "../errors";

const DIAGNOSING_FROM_STATUSES = new Set([
  "arrived",
  "vehicle_received",
]);

async function notifyDriverDiagnosing(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  const driverId = job.fields.driver_id?.[0];
  if (!driverId) {
    return;
  }

  try {
    const driver = await getDriverById(driverId);
    await sendSms(driver.fields.phone_number, serviceDiagnosingDriver());
  } catch (error) {
    console.error(
      `[service/diagnosing] Failed to notify driver for job ${jobId}:`,
      error,
    );
  }
}

/** DIAGNOSING — `arrived` or `vehicle_received` → `diagnosing`; SMS driver. */
export async function handleDiagnosing(
  jobId: string,
  mechanicId: string,
): Promise<ServiceCommandResult> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  if (!DIAGNOSING_FROM_STATUSES.has(job.fields.status)) {
    throw new InvalidServiceCommandError("DIAGNOSING", job.fields.status);
  }

  const updated = await updateJobStatus(jobId, { status: "diagnosing" });
  await notifyDriverDiagnosing(jobId);

  return {
    jobId,
    status: updated.fields.status,
    action: "diagnosing",
  };
}
