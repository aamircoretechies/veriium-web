import {
  getStaleAvailabilitySeconds,
  STALE_AVAILABILITY_PATH,
} from "@/lib/edge/constants";
import { scheduleJob } from "@/lib/qstash/schedule";
import type { StaleAvailabilityPayload } from "@/types/api/service";

/** Schedule the 7-day stale-availability check when a mechanic goes `available` (§4.8). */
export async function scheduleStaleAvailabilityCheck(
  mechanicId: string,
): Promise<void> {
  const body: StaleAvailabilityPayload = { mechanicId };

  await scheduleJob({
    path: STALE_AVAILABILITY_PATH,
    body,
    delaySeconds: getStaleAvailabilitySeconds(),
  });
}
