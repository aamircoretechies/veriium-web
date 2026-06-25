import {
  DISPUTE_REMIND_PATH,
  DISPUTE_REMINDER_HOURS,
  getDisputeReminderDelaysSeconds,
} from "@/lib/edge/constants";
import { scheduleJob } from "@/lib/qstash/schedule";
import type { DisputeRemindPayload } from "@/types/api/service";

/** Schedule 24h / 48h / 72h dispute reminder workers after DONE (§9.3). */
export async function scheduleDisputeReminders(jobId: string): Promise<void> {
  const delays = getDisputeReminderDelaysSeconds();

  await Promise.all(
    DISPUTE_REMINDER_HOURS.map((reminder, index) => {
      const body: DisputeRemindPayload = { jobId, reminder };
      return scheduleJob({
        path: DISPUTE_REMIND_PATH,
        body,
        delaySeconds: delays[index],
      });
    }),
  );
}
