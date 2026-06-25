import { getCancellationFreeHours } from "@/lib/edge/constants";

/**
 * True when the appointment is fewer than `CANCELLATION_FREE_HOURS` away (§9.1).
 * Missing `appointmentWindowStart` is treated as not late (no fee).
 */
export function isLateCancellation(appointmentWindowStart: string | undefined): boolean {
  if (!appointmentWindowStart) {
    return false;
  }

  const startMs = Date.parse(appointmentWindowStart);
  if (!Number.isFinite(startMs)) {
    return false;
  }

  const freeMs = getCancellationFreeHours() * 60 * 60 * 1000;
  return startMs - Date.now() < freeMs;
}
