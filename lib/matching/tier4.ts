import { createAwaitingAdminMatchActionItem } from "@/lib/action-items/create";
import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { getMatchTier, JOB_STATUS } from "@/lib/jobs/status";
import { sendSms } from "@/lib/twilio/sms";
import {
  tier4AdminAlert,
  tier4DriverUpdate,
} from "@/lib/twilio/templates";
import { buildJobSmsContext } from "./job-context";

function getAdminPhone(): string {
  const phone = process.env.VERIIUM_ADMIN_PHONE?.trim();
  if (!phone) {
    throw new Error("VERIIUM_ADMIN_PHONE is required for Tier 4 admin alerts");
  }
  return phone;
}

export async function runTier4(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  const status = job.fields.status;
  const tier = getMatchTier(job);

  if (
    status === JOB_STATUS.awaiting_admin_match ||
    status === JOB_STATUS.accepted_by_mechanic
  ) {
    return;
  }

  if (status !== JOB_STATUS.matched_awaiting_response || tier !== 3) {
    return;
  }

  await updateJobStatus(jobId, {
    status: JOB_STATUS.awaiting_admin_match,
    escalated_at: new Date().toISOString(),
  });

  const refreshed = await getJobById(jobId);
  const smsContext = buildJobSmsContext(refreshed);
  await createAwaitingAdminMatchActionItem({
    jobId,
    zipCode: smsContext.zipCode,
    driver: refreshed.fields.driver_id,
  });

  const driverId = refreshed.fields.driver_id?.[0];
  if (driverId) {
    try {
      const driver = await getDriverById(driverId);
      if (driver.fields.phone_number) {
        await sendSms(driver.fields.phone_number, tier4DriverUpdate());
      }
    } catch (error) {
      console.error(`[matching/tier4] Failed to notify driver for ${jobId}:`, error);
    }
  }

  try {
    await sendSms(
      getAdminPhone(),
      tier4AdminAlert(jobId, {
        zipCode: smsContext.zipCode,
        categoryLabel: smsContext.categoryLabel,
        vehicleLabel: smsContext.vehicleLabel,
        serviceTypeLabel: smsContext.serviceTypeLabel,
      }),
    );
  } catch (error) {
    console.error(`[matching/tier4] Failed to notify admin for ${jobId}:`, error);
  }
}
