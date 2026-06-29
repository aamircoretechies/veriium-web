/** QStash worker paths for Phase 6 edge-case jobs. */
export const NO_SHOW_CHECK_PATH = "/api/jobs/no-show/check";
export const DISPUTE_REMIND_PATH = "/api/jobs/dispute/remind";
export const STALE_AVAILABILITY_PATH = "/api/mechanics/availability/stale";
export const RECEIPT_CHECK_PATH = "/api/jobs/receipt/check";
export const QUOTE_TIMEOUT_CHECK_PATH = "/api/jobs/quote/timeout";
export const REQUOTE_TIMEOUT_CHECK_PATH = "/api/jobs/requote/timeout";

const DEFAULT_NO_SHOW_DELAY_SECONDS = 900;
const DEFAULT_DISPUTE_REMINDER_DELAYS_SECONDS = [86400, 172800, 259200] as const;
const DEFAULT_STALE_AVAILABILITY_SECONDS = 604800;
const DEFAULT_CANCELLATION_FREE_HOURS = 24;
const DEFAULT_RECEIPT_DEADLINE_SECONDS = 86400;
const DEFAULT_QUOTE_TIMEOUT_SECONDS = 7200;
const DEFAULT_REQUOTE_TIMEOUT_SECONDS = 7200;

export type DisputeReminderHours = 24 | 48 | 72;

/**
 * Seconds after `arrived` before a mechanic may report NOSHOW (§9.2).
 * Override: `NO_SHOW_DELAY_SECONDS`.
 */
export function getNoShowDelaySeconds(): number {
  const raw = process.env.NO_SHOW_DELAY_SECONDS?.trim();
  if (!raw) {
    return DEFAULT_NO_SHOW_DELAY_SECONDS;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    console.warn(
      "[edge] Invalid NO_SHOW_DELAY_SECONDS; using default:",
      raw,
    );
    return DEFAULT_NO_SHOW_DELAY_SECONDS;
  }

  return value;
}

/**
 * Comma-separated dispute reminder delays in seconds (24h / 48h / 72h).
 * Override: `DISPUTE_REMINDER_DELAYS_SECONDS=86400,172800,259200`.
 */
export function getDisputeReminderDelaysSeconds(): readonly [
  number,
  number,
  number,
] {
  const raw = process.env.DISPUTE_REMINDER_DELAYS_SECONDS?.trim();
  if (!raw) {
    return DEFAULT_DISPUTE_REMINDER_DELAYS_SECONDS;
  }

  const parts = raw.split(",").map((part) => Number.parseInt(part.trim(), 10));
  if (
    parts.length !== 3 ||
    parts.some((value) => !Number.isFinite(value) || value < 0)
  ) {
    console.warn(
      "[edge] Invalid DISPUTE_REMINDER_DELAYS_SECONDS; using defaults:",
      raw,
    );
    return DEFAULT_DISPUTE_REMINDER_DELAYS_SECONDS;
  }

  return [parts[0]!, parts[1]!, parts[2]!];
}

export const DISPUTE_REMINDER_HOURS: readonly DisputeReminderHours[] = [
  24, 48, 72,
];

/**
 * Seconds after going `available` before availability is marked stale (§4.8).
 * Override: `STALE_AVAILABILITY_SECONDS`.
 */
export function getStaleAvailabilitySeconds(): number {
  const raw = process.env.STALE_AVAILABILITY_SECONDS?.trim();
  if (!raw) {
    return DEFAULT_STALE_AVAILABILITY_SECONDS;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    console.warn(
      "[edge] Invalid STALE_AVAILABILITY_SECONDS; using default:",
      raw,
    );
    return DEFAULT_STALE_AVAILABILITY_SECONDS;
  }

  return value;
}

/**
 * Hours before `appointment_window_start` when driver cancel is free (§9.1).
 * Override: `CANCELLATION_FREE_HOURS`.
 */
export function getCancellationFreeHours(): number {
  const raw = process.env.CANCELLATION_FREE_HOURS?.trim();
  if (!raw) {
    return DEFAULT_CANCELLATION_FREE_HOURS;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    console.warn(
      "[edge] Invalid CANCELLATION_FREE_HOURS; using default:",
      raw,
    );
    return DEFAULT_CANCELLATION_FREE_HOURS;
  }

  return value;
}

/**
 * Seconds after QUOTE before parts receipt forfeiture check (Exhibit A §5.3).
 * Override: `RECEIPT_DEADLINE_SECONDS`.
 */
export function getReceiptDeadlineDelaySeconds(): number {
  const raw = process.env.RECEIPT_DEADLINE_SECONDS?.trim();
  if (!raw) {
    return DEFAULT_RECEIPT_DEADLINE_SECONDS;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    console.warn(
      "[edge] Invalid RECEIPT_DEADLINE_SECONDS; using default:",
      raw,
    );
    return DEFAULT_RECEIPT_DEADLINE_SECONDS;
  }

  return value;
}

/**
 * Seconds after driver quote SMS before auto-decline (Exhibit A §3.4).
 * Override: `QUOTE_TIMEOUT_SECONDS`.
 */
export function getQuoteTimeoutDelaySeconds(): number {
  const raw = process.env.QUOTE_TIMEOUT_SECONDS?.trim();
  if (!raw) {
    return DEFAULT_QUOTE_TIMEOUT_SECONDS;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    console.warn(
      "[edge] Invalid QUOTE_TIMEOUT_SECONDS; using default:",
      raw,
    );
    return DEFAULT_QUOTE_TIMEOUT_SECONDS;
  }

  return value;
}

/**
 * Seconds after driver requote SMS before auto-decline (Exhibit A §5.5).
 * Override: `REQUOTE_TIMEOUT_SECONDS`.
 */
export function getRequoteTimeoutDelaySeconds(): number {
  const raw = process.env.REQUOTE_TIMEOUT_SECONDS?.trim();
  if (!raw) {
    return DEFAULT_REQUOTE_TIMEOUT_SECONDS;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    console.warn(
      "[edge] Invalid REQUOTE_TIMEOUT_SECONDS; using default:",
      raw,
    );
    return DEFAULT_REQUOTE_TIMEOUT_SECONDS;
  }

  return value;
}
