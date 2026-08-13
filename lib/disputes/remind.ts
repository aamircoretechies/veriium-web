import { getAirtableClient } from "@/lib/airtable";
import { buildSignedJobUrl } from "@/lib/auth/signed-url";
import { getDriverById } from "@/lib/drivers/lookup";
import type { DisputeReminderHours } from "@/lib/edge/constants";
import { JOB_STATUS } from "@/lib/jobs/status";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { sendSms } from "@/lib/twilio/sms";
import { disputeReminderDriver } from "@/lib/twilio/templates";
import type { ActionItemFields } from "@/types/airtable/action-items";
import { ACTION_ITEM_TYPE, type ActionItemType } from "@/types/airtable/enums";
import type { JobFields } from "@/types/airtable/jobs";
import { createActionItemSchema } from "@/types/airtable/schemas";

const REMINDER_ACTION_ITEM_TYPES: Record<DisputeReminderHours, ActionItemType> = {
  24: ACTION_ITEM_TYPE.OPEN_DISPUTE,
  48: ACTION_ITEM_TYPE.OPEN_DISPUTE,
  72: ACTION_ITEM_TYPE.DRIVER_NON_RESPONSE_72H,
};

const REMINDER_SENT_AT_FIELD: Record<
  DisputeReminderHours,
  "reminder_1_sent_at" | "reminder_2_sent_at" | "escalated_at"
> = {
  24: "reminder_1_sent_at",
  48: "reminder_2_sent_at",
  72: "escalated_at",
};

function parseTimestampMs(value?: string): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? ms : undefined;
}

/**
 * True when this reminder hour was already sent (QStash replay).
 * 72h uses `escalated_at`, which matching Tier 4 may already have set —
 * only treat it as sent if it is on/after a prior 24h/48h reminder stamp.
 */
function isDisputeReminderAlreadySent(
  fields: JobFields,
  reminder: DisputeReminderHours,
): boolean {
  const sentAt = parseTimestampMs(fields[REMINDER_SENT_AT_FIELD[reminder]]);
  if (sentAt === undefined) {
    return false;
  }

  if (reminder !== 72) {
    return true;
  }

  const reminder1 = parseTimestampMs(fields.reminder_1_sent_at);
  const reminder2 = parseTimestampMs(fields.reminder_2_sent_at);
  const latestDisputeReminder = Math.max(
    reminder1 ?? Number.NEGATIVE_INFINITY,
    reminder2 ?? Number.NEGATIVE_INFINITY,
  );
  if (!Number.isFinite(latestDisputeReminder)) {
    return false;
  }

  return sentAt >= latestDisputeReminder;
}

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

  if (isDisputeReminderAlreadySent(job.fields, reminder)) {
    return {
      jobId,
      reminder,
      skipped: true,
      reason: "already_sent",
    };
  }

  const driverId = job.fields.driver_id?.[0];
  if (driverId) {
    try {
      const driver = await getDriverById(driverId);
      if (driver.fields.phone_number) {
        const jobUrl = await buildSignedJobUrl(jobId);
        await sendSms(
          driver.fields.phone_number,
          disputeReminderDriver(reminder, jobUrl),
        );
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

  await updateJobStatus(jobId, {
    [REMINDER_SENT_AT_FIELD[reminder]]: new Date().toISOString(),
  });

  return { jobId, reminder, action: "dispute_reminder_sent" };
}
