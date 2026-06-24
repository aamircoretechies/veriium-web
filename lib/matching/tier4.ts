import { createAwaitingAdminMatchActionItem } from "@/lib/action-items/create";
import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
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

/**
 * Escalate to admin manual matching. Idempotent when already `awaiting_admin_match`.
 */
export async function runTier4(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  const status = job.fields.status;

  if (status === "awaiting_admin_match" || status === "accepted_by_mechanic") {
    return;
  }

  if (status !== "matched_tier3") {
    return;
  }

  await updateJobStatus(jobId, { status: "awaiting_admin_match" });

  const refreshed = await getJobById(jobId);
  const smsContext = buildJobSmsContext(refreshed);
  await createAwaitingAdminMatchActionItem({
    jobId,
    zipCode: smsContext.zipCode,
    driver: refreshed.fields.driver,
  });

  const driverId = refreshed.fields.driver?.[0];
  if (driverId) {
    try {
      const driver = await getDriverById(driverId);
      await sendSms(driver.fields.phone, tier4DriverUpdate());
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
