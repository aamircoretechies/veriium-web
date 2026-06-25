import { getAirtableClient } from "@/lib/airtable";
import { getDriverById } from "@/lib/drivers/lookup";
import type { DisputeReminderHours } from "@/lib/edge/constants";
import { getJobById } from "@/lib/jobs/lookup";
import { sendSms } from "@/lib/twilio/sms";
import { disputeReminderDriver } from "@/lib/twilio/templates";
import type { ActionItemFields } from "@/types/airtable/action-items";
import type { ActionItemType } from "@/types/airtable/enums";
import { createActionItemSchema } from "@/types/airtable/schemas";

const REMINDER_ACTION_ITEM_TYPES: Record<DisputeReminderHours, ActionItemType> = {
  24: "dispute_reminder_24h",
  48: "dispute_reminder_48h",
  72: "dispute_reminder_72h",
};

export type DisputeRemindResult = {
  jobId: string;
  reminder: DisputeReminderHours;
  skipped?: boolean;
  reason?: string;
  action?: "dispute_reminder_sent";
};

/**
 * QStash worker — send dispute reminder SMS + admin action item (§9.3).
 * Idempotent no-op when the job is no longer awaiting driver confirmation.
 */
export async function runDisputeRemind(
  jobId: string,
  reminder: DisputeReminderHours,
): Promise<DisputeRemindResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== "completed_pending_confirmation") {
    return {
      jobId,
      reminder,
      skipped: true,
      reason: "status_not_pending_confirmation",
    };
  }

  const driverId = job.fields.driver?.[0];
  if (driverId) {
    try {
      const driver = await getDriverById(driverId);
      if (driver.fields.phone) {
        await sendSms(driver.fields.phone, disputeReminderDriver(reminder));
      }
    } catch (error) {
      console.error(
        `[disputes/remind] Failed to SMS driver for job ${jobId}:`,
        error,
      );
    }
  }

  const actionItemFields = createActionItemSchema.parse({
    type: REMINDER_ACTION_ITEM_TYPES[reminder],
    status: "open",
    title: `Dispute reminder — ${reminder}h`,
    notes: `Driver has not confirmed or disputed job ${jobId} after ${reminder} hours.`,
    job: [jobId],
    driver: job.fields.driver,
    mechanic: job.fields.mechanic,
  });

  const client = getAirtableClient();
  await client.createRecord<ActionItemFields>("action-items", actionItemFields, {
    typecast: true,
  });

  return { jobId, reminder, action: "dispute_reminder_sent" };
}
