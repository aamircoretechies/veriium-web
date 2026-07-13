import {
  getPaymentRetryDelaySeconds,
  PAYMENT_RETRY_PATH,
} from "@/lib/edge/constants";
import { getJobById } from "@/lib/jobs/lookup";
import { mergeQuoteDetails, parseQuoteDetails } from "@/lib/jobs/quote-details";
import { updateJobStatus } from "@/lib/jobs/update";
import { scheduleJob } from "@/lib/qstash/schedule";
import type { PaymentRetryPayload } from "@/types/api/service";

export async function schedulePaymentRetry(
  jobId: string,
  paymentType: PaymentRetryPayload["paymentType"],
): Promise<void> {
  const job = await getJobById(jobId);
  const details = parseQuoteDetails(job.fields.quote_details);
  if (details.payment_retry_qstash_id?.trim()) {
    return;
  }

  const body: PaymentRetryPayload = { jobId, paymentType };

  const response = await scheduleJob({
    path: PAYMENT_RETRY_PATH,
    body,
    delaySeconds: getPaymentRetryDelaySeconds(),
  });

  const messageId =
    "messageId" in response && typeof response.messageId === "string"
      ? response.messageId
      : undefined;

  if (messageId) {
    await updateJobStatus(jobId, {
      quote_details: mergeQuoteDetails(job.fields.quote_details, {
        payment_retry_qstash_id: messageId,
      }),
    });
  }
}
