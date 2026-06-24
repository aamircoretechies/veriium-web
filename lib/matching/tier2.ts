import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { sendSms } from "@/lib/twilio/sms";
import { tier2Broadcast } from "@/lib/twilio/templates";
import type { AirtableRecord } from "@/types/airtable/common";
import type { MechanicFields } from "@/types/airtable/mechanics";
import { buildJobSmsContext } from "./job-context";
import { listTier2Mechanics, poolQueryFromJob } from "./query";
import { runTier3 } from "./tier3";

async function broadcastTier2Sms(
  jobId: string,
  mechanics: AirtableRecord<MechanicFields>[],
): Promise<void> {
  const job = await getJobById(jobId);
  const smsContext = buildJobSmsContext(job);
  const body = tier2Broadcast({
    zipCode: smsContext.zipCode,
    categoryLabel: smsContext.categoryLabel,
    vehicleLabel: smsContext.vehicleLabel,
    serviceTypeLabel: smsContext.serviceTypeLabel,
  });

  await Promise.all(
    mechanics
      .filter((mechanic) => mechanic.fields.phone)
      .map(async (mechanic) => {
        try {
          await sendSms(mechanic.fields.phone!, body);
        } catch (error) {
          console.error(
            `[matching/tier2] Failed to broadcast to ${mechanic.id} for ${jobId}:`,
            error,
          );
        }
      }),
  );
}

/**
 * Escalate to Tier 2 broadcast. Idempotent when the job is already `matched_tier2`.
 * Cascades to Tier 3 immediately when the broadcast pool is empty.
 */
export async function runTier2(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  const status = job.fields.status;

  if (status === "matched_tier2" || status === "matched_tier3" || status === "awaiting_admin_match" || status === "accepted_by_mechanic") {
    return;
  }

  if (status !== "matched") {
    return;
  }

  await updateJobStatus(jobId, { status: "matched_tier2" });

  const refreshed = await getJobById(jobId);
  const mechanics = await listTier2Mechanics(poolQueryFromJob(refreshed));

  if (mechanics.length === 0) {
    await runTier3(jobId);
    return;
  }

  await broadcastTier2Sms(jobId, mechanics);
}
