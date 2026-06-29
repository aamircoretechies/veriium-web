import {
  getPaymentRetryDelaySeconds,
  PAYMENT_RETRY_PATH,
} from "@/lib/edge/constants";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { scheduleJob } from "@/lib/qstash/schedule";
import type { PaymentRetryPayload } from "@/types/api/service";

/** Schedule the 24-hour off-session payment retry after first failure (Exhibit A §4). */
export async function schedulePaymentRetry(
  jobId: string,
  paymentType: PaymentRetryPayload["paymentType"],
): Promise<void> {
  const job = await getJobById(jobId);
  if (job.fields.payment_retry_qstash_id?.trim()) {
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
      payment_retry_qstash_id: messageId,
    });
  }
}
