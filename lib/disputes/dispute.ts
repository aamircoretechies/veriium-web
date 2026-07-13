import { getAirtableClient } from "@/lib/airtable";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import type { ActionItemFields } from "@/types/airtable/action-items";
import { ACTION_ITEM_TYPE, type JobStatus } from "@/types/airtable/enums";
import { createActionItemSchema } from "@/types/airtable/schemas";

export class InvalidDriverDisputeError extends Error {
  readonly jobId: string;
  readonly jobStatus: JobStatus;

  constructor(jobId: string, jobStatus: JobStatus) {
    super(
      `Driver dispute is not valid for job ${jobId} in status ${jobStatus}`,
    );
    this.name = "InvalidDriverDisputeError";
    this.jobId = jobId;
    this.jobStatus = jobStatus;
  }
}

export type DisputeJobResult = {
  jobId: string;
  status: string;
  action: "disputed";
};

/** Driver replies `1` — hold payment and flag for admin review (§9.3). */
export async function disputeJob(jobId: string): Promise<DisputeJobResult> {
  const job = await getJobById(jobId);

  if (job.fields.status !== "completed_pending_confirmation") {
    throw new InvalidDriverDisputeError(jobId, job.fields.status);
  }

  const updated = await updateJobStatus(jobId, { status: "disputed" });

  const actionItemFields = createActionItemSchema.parse({
    type: ACTION_ITEM_TYPE.OPEN_DISPUTE,
    status: "open",
    description: `Driver disputed final charge for job ${jobId}.`,
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
    action: "disputed",
  };
}
