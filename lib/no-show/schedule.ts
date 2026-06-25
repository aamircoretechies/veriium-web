import { getNoShowDelaySeconds, NO_SHOW_CHECK_PATH } from "@/lib/edge/constants";
import { scheduleJob } from "@/lib/qstash/schedule";
import type { NoShowCheckPayload } from "@/types/api/service";

/** Schedule the 15-minute no-show eligibility check after ARRIVED (§9.2). */
export async function scheduleNoShowCheck(jobId: string): Promise<void> {
  const body: NoShowCheckPayload = { jobId };

  await scheduleJob({
    path: NO_SHOW_CHECK_PATH,
    body,
    delaySeconds: getNoShowDelaySeconds(),
  });
}
