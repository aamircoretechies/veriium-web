import { getJobById } from "@/lib/jobs/lookup";
import { getMechanicById } from "@/lib/mechanics/lookup";
import { sendSms } from "@/lib/twilio/sms";
import { noShowEligibleMechanic } from "@/lib/twilio/templates";

export type NoShowCheckResult = {
  jobId: string;
  skipped?: boolean;
  reason?: string;
  action?: "no_show_eligible_notified";
};

/**
 * QStash worker — 15 min after ARRIVED, notify mechanic they may report NOSHOW (§9.2).
 * Idempotent no-op when the job has already left `arrived`.
 */
export async function runNoShowCheck(jobId: string): Promise<NoShowCheckResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== "arrived") {
    return { jobId, skipped: true, reason: "status_not_arrived" };
  }

  const mechanicId = job.fields.mechanic_id?.[0];
  if (!mechanicId) {
    return { jobId, skipped: true, reason: "no_mechanic" };
  }

  const mechanic = await getMechanicById(mechanicId);
  const phone = mechanic.fields.phone_number;
  if (!phone) {
    return { jobId, skipped: true, reason: "no_mechanic_phone" };
  }

  try {
    await sendSms(phone, noShowEligibleMechanic());
  } catch (error) {
    console.error(`[no-show/check] Failed to notify mechanic for job ${jobId}:`, error);
    throw error;
  }

  return { jobId, action: "no_show_eligible_notified" };
}
