import {
  getRequoteTimeoutDelaySeconds,
  REQUOTE_TIMEOUT_CHECK_PATH,
} from "@/lib/edge/constants";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { getQStashClient } from "@/lib/qstash/client";
import { scheduleJob } from "@/lib/qstash/schedule";
import type { RequoteTimeoutPayload } from "@/types/api/service";

/** Schedule the 2-hour requote response deadline after driver requote SMS (§5.5). */
export async function scheduleRequoteTimeout(jobId: string): Promise<void> {
  const body: RequoteTimeoutPayload = { jobId };

  const response = await scheduleJob({
    path: REQUOTE_TIMEOUT_CHECK_PATH,
    body,
    delaySeconds: getRequoteTimeoutDelaySeconds(),
  });

  const messageId =
    "messageId" in response && typeof response.messageId === "string"
      ? response.messageId
      : undefined;

  if (messageId) {
    await updateJobStatus(jobId, {
      requote_timeout_qstash_id: messageId,
    });
  }
}

/** Cancel a pending requote timeout when the driver APPROVEs or DECLINEs. */
export async function cancelRequoteTimeout(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  const messageId = job.fields.requote_timeout_qstash_id?.trim();
  if (!messageId) {
    return;
  }

  if (!messageId.startsWith("mock-qstash-")) {
    try {
      const client = getQStashClient();
      await client.messages.delete(messageId);
    } catch (error) {
      console.warn(
        `[requotes/schedule] Failed to cancel requote timeout for job ${jobId}:`,
        error,
      );
    }
  }

  await updateJobStatus(jobId, { requote_timeout_qstash_id: "" });
}
