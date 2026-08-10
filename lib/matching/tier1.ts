import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { sendSms } from "@/lib/twilio/sms";
import { tier1Assignment } from "@/lib/twilio/templates";
import { refetchMechanicIfEligible } from "./assert-eligible";
import { buildJobSmsContext } from "./job-context";
import { markMechanicAssigned } from "./mechanic-update";
import { listTier1Mechanics, poolQueryFromJob } from "./query";

export type Tier1Result = {
  mechanicId: string;
  mechanicPhone: string;
};

export async function runTier1(jobId: string): Promise<Tier1Result | null> {
  const job = await getJobById(jobId);
  const poolQuery = poolQueryFromJob(job);

  if (!poolQuery.zipCode) {
    return null;
  }

  const candidates = await listTier1Mechanics(poolQuery);
  const smsContext = buildJobSmsContext(job);

  for (const candidate of candidates) {
    const mechanic = await refetchMechanicIfEligible(candidate.id, 1);
    if (!mechanic) {
      console.warn(
        `[matching/tier1] Skipping mechanic ${candidate.id} for ${jobId}: no longer eligible at send time`,
      );
      continue;
    }

    if (!mechanic.fields.phone_number) {
      continue;
    }

    await updateJobStatus(jobId, {
      mechanic_id: [mechanic.id],
    });
    await markMechanicAssigned(mechanic.id);

    try {
      await sendSms(
        mechanic.fields.phone_number,
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
      mechanicPhone: mechanic.fields.phone_number,
    };
  }

  return null;
}
