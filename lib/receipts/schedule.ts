import { getReceiptDeadlineDelaySeconds, RECEIPT_CHECK_PATH } from "@/lib/edge/constants";
import { scheduleJob } from "@/lib/qstash/schedule";
import type { ReceiptCheckPayload } from "@/types/api/service";

/** Schedule the 24-hour parts receipt deadline check after QUOTE (Exhibit A §5.3). */
export async function scheduleReceiptDeadlineCheck(jobId: string): Promise<void> {
  const body: ReceiptCheckPayload = { jobId };

  await scheduleJob({
    path: RECEIPT_CHECK_PATH,
    body,
    delaySeconds: getReceiptDeadlineDelaySeconds(),
  });
}
