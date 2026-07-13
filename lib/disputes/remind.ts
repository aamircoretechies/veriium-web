import { getAirtableClient } from "@/lib/airtable";
import { getDriverById } from "@/lib/drivers/lookup";
import type { DisputeReminderHours } from "@/lib/edge/constants";
import { JOB_STATUS } from "@/lib/jobs/status";
import { getJobById } from "@/lib/jobs/lookup";
import { sendSms } from "@/lib/twilio/sms";
import { disputeReminderDriver } from "@/lib/twilio/templates";
import type { ActionItemFields } from "@/types/airtable/action-items";
import { ACTION_ITEM_TYPE, type ActionItemType } from "@/types/airtable/enums";
import { createActionItemSchema } from "@/types/airtable/schemas";

const REMINDER_ACTION_ITEM_TYPES: Record<DisputeReminderHours, ActionItemType> = {
  24: ACTION_ITEM_TYPE.OPEN_DISPUTE,
  48: ACTION_ITEM_TYPE.OPEN_DISPUTE,
  72: ACTION_ITEM_TYPE.DRIVER_NON_RESPONSE_72H,
};

export type DisputeRemindResult = {
  jobId: string;
  reminder: DisputeReminderHours;
  skipped?: boolean;
  reason?: string;
  action?: "dispute_reminder_sent";
};

export async function runDisputeRemind(
  jobId: string,
  reminder: DisputeReminderHours,
): Promise<DisputeRemindResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== JOB_STATUS.completed_pending_confirmation) {
    return {
      jobId,
      reminder,
      skipped: true,
      reason: "status_not_pending_confirmation",
    };
  }

  const driverId = job.fields.driver_id?.[0];
  if (driverId) {
    try {
      const driver = await getDriverById(driverId);
      if (driver.fields.phone_number) {
        await sendSms(driver.fields.phone_number, disputeReminderDriver(reminder));
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
    description: `Dispute reminder — ${reminder}h\nDriver has not confirmed or disputed job ${jobId} after ${reminder} hours.`,
    linked_job_id: [jobId],
    linked_driver_id: job.fields.driver_id,
    linked_mechanic_id: job.fields.mechanic_id,
  });

  const client = getAirtableClient();
  await client.createRecord<ActionItemFields>("action-items", actionItemFields, {
    typecast: true,
  });

  return { jobId, reminder, action: "dispute_reminder_sent" };
}
