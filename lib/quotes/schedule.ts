import {
  getQuoteTimeoutDelaySeconds,
  QUOTE_TIMEOUT_CHECK_PATH,
} from "@/lib/edge/constants";
import { getJobById } from "@/lib/jobs/lookup";
import { mergeQuoteDetails, parseQuoteDetails } from "@/lib/jobs/quote-details";
import { updateJobStatus } from "@/lib/jobs/update";
import { getQStashClient } from "@/lib/qstash/client";
import { scheduleJob } from "@/lib/qstash/schedule";
import type { QuoteTimeoutPayload } from "@/types/api/service";

export async function scheduleQuoteTimeout(jobId: string): Promise<void> {
  const body: QuoteTimeoutPayload = { jobId };

  const response = await scheduleJob({
    path: QUOTE_TIMEOUT_CHECK_PATH,
    body,
    delaySeconds: getQuoteTimeoutDelaySeconds(),
  });

  const messageId =
    "messageId" in response && typeof response.messageId === "string"
      ? response.messageId
      : undefined;

  if (messageId) {
    const job = await getJobById(jobId);
    await updateJobStatus(jobId, {
      quote_details: mergeQuoteDetails(job.fields.quote_details, {
        quote_timeout_qstash_id: messageId,
      }),
    });
  }
}

export async function cancelQuoteTimeout(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  const messageId = parseQuoteDetails(
    job.fields.quote_details,
  ).quote_timeout_qstash_id?.trim();
  if (!messageId) {
    return;
  }

  if (!messageId.startsWith("mock-qstash-")) {
    try {
      const client = getQStashClient();
      await client.messages.delete(messageId);
    } catch (error) {
      console.warn(
        `[quotes/schedule] Failed to cancel quote timeout for job ${jobId}:`,
        error,
      );
    }
  }

  await updateJobStatus(jobId, {
    quote_details: mergeQuoteDetails(job.fields.quote_details, {
      quote_timeout_qstash_id: "",
    }),
  });
}
