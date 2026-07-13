import { getAirtableClient } from "@/lib/airtable";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { MechanicNotAssignedError } from "@/lib/matching/errors";
import type { ActionItemFields } from "@/types/airtable/action-items";
import { ACTION_ITEM_TYPE } from "@/types/airtable/enums";
import { createActionItemSchema } from "@/types/airtable/schemas";
import { isNoShowEligible } from "./eligibility";
import { NoShowNotEligibleError } from "@/lib/service/errors";

export type ReportNoShowResult = {
  jobId: string;
  status: string;
  action: "no_show_reported";
};

function mechanicLinkedToJob(job: Awaited<ReturnType<typeof getJobById>>, mechanicId: string): boolean {
  return job.fields.mechanic_id?.includes(mechanicId) ?? false;
}

/**
 * Mechanic reports NOSHOW when eligible → `no_show_pending_review` + admin alert (§9.2).
 */
export async function reportNoShow(
  jobId: string,
  mechanicId: string,
): Promise<ReportNoShowResult> {
  const job = await getJobById(jobId);

  if (!mechanicLinkedToJob(job, mechanicId)) {
    throw new MechanicNotAssignedError(jobId, mechanicId);
  }

  if (!isNoShowEligible(job)) {
    throw new NoShowNotEligibleError(jobId);
  }

  const updated = await updateJobStatus(jobId, {
    status: "no_show_pending_review",
  });

  const actionItemFields = createActionItemSchema.parse({
    type: ACTION_ITEM_TYPE.NO_SHOW_REPORT,
    status: "open",
    description: `Mechanic reported customer no-show for job ${jobId}.`,
    linked_job_id: [jobId],
    linked_driver_id: job.fields.driver_id,
    linked_mechanic_id: job.fields.mechanic_id,
  });

  const client = getAirtableClient();
  await client.createRecord<ActionItemFields>("action-items", actionItemFields, {
    typecast: true,
  });

  return {
    jobId,
    status: updated.fields.status,
    action: "no_show_reported",
  };
}
