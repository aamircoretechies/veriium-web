import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { sendSms } from "@/lib/twilio/sms";
import { tier1Assignment } from "@/lib/twilio/templates";
import { buildJobSmsContext } from "./job-context";
import { markMechanicAssigned } from "./mechanic-update";
import { listTier1Mechanics, poolQueryFromJob } from "./query";

export type Tier1Result = {
  mechanicId: string;
  mechanicPhone: string;
};

/**
 * Pick the Tier 1 mechanic, link them to the job, and send the assignment SMS.
 * Returns null when no eligible mechanics are in the pool.
 */
export async function runTier1(jobId: string): Promise<Tier1Result | null> {
  const job = await getJobById(jobId);
  const poolQuery = poolQueryFromJob(job);

  if (!poolQuery.zipCode) {
    return null;
  }

  const candidates = await listTier1Mechanics(poolQuery);
  const mechanic = candidates[0];
  if (!mechanic?.fields.phone) {
    return null;
  }

  await updateJobStatus(jobId, {
    mechanic: [mechanic.id],
  });
  await markMechanicAssigned(mechanic.id);

  const smsContext = buildJobSmsContext(job);
  try {
    await sendSms(
      mechanic.fields.phone,
      tier1Assignment({
        zipCode: smsContext.zipCode,
        categoryLabel: smsContext.categoryLabel,
        vehicleLabel: smsContext.vehicleLabel,
        serviceTypeLabel: smsContext.serviceTypeLabel,
      }),
    );
  } catch (error) {
    console.error(`[matching/tier1] Failed to send assignment SMS for ${jobId}:`, error);
  }

  return {
    mechanicId: mechanic.id,
    mechanicPhone: mechanic.fields.phone,
  };
}
