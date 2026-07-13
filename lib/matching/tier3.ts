import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { getMatchTier, JOB_STATUS } from "@/lib/jobs/status";
import { sendSms } from "@/lib/twilio/sms";
import { tier3Broadcast } from "@/lib/twilio/templates";
import type { AirtableRecord } from "@/types/airtable/common";
import type { MechanicFields } from "@/types/airtable/mechanics";
import { buildJobSmsContext } from "./job-context";
import { listTier3Mechanics, poolQueryFromJob } from "./query";
import { runTier4 } from "./tier4";

async function broadcastTier3Sms(
  jobId: string,
  mechanics: AirtableRecord<MechanicFields>[],
): Promise<void> {
  const job = await getJobById(jobId);
  const smsContext = buildJobSmsContext(job);
  const body = tier3Broadcast({
    zipCode: smsContext.zipCode,
    categoryLabel: smsContext.categoryLabel,
    vehicleLabel: smsContext.vehicleLabel,
    serviceTypeLabel: smsContext.serviceTypeLabel,
  });

  await Promise.all(
    mechanics
      .filter((mechanic) => mechanic.fields.phone_number)
      .map(async (mechanic) => {
        try {
          await sendSms(mechanic.fields.phone_number!, body);
        } catch (error) {
          console.error(
            `[matching/tier3] Failed to broadcast to ${mechanic.id} for ${jobId}:`,
            error,
          );
        }
      }),
  );
}

export async function runTier3(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  const status = job.fields.status;
  const tier = getMatchTier(job);

  if (
    status === JOB_STATUS.awaiting_admin_match ||
    status === JOB_STATUS.accepted_by_mechanic ||
    tier >= 3
  ) {
    return;
  }

  if (status !== JOB_STATUS.matched_awaiting_response || tier !== 2) {
    return;
  }

  const now = new Date().toISOString();
  await updateJobStatus(jobId, {
    status: JOB_STATUS.matched_awaiting_response,
    match_tier: 3,
    match_tier_started_at: now,
  });

  const refreshed = await getJobById(jobId);
  const mechanics = await listTier3Mechanics(poolQueryFromJob(refreshed));

  if (mechanics.length === 0) {
    await runTier4(jobId);
    return;
  }

  await broadcastTier3Sms(jobId, mechanics);
}
