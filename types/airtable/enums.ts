/**
 * Domain enums from Veriium_Build_Scope_for_Developer_v3.pdf
 * (§4.7, §5.3, §8, §9–11, Appendix B/C).
 *
 * Field names in table interfaces use these literal values.
 * Align with the live Airtable base if column option labels differ.
 */

/** §11.3 / Appendix C — mechanic account state. */
export const MECHANIC_STATUSES = [
  "application_submitted",
  "under_review",
  "needs_more_info",
  "approved",
  "rejected",
  "suspended",
] as const;

export type MechanicStatus = (typeof MECHANIC_STATUSES)[number];

/** §11.3 / §4.8 — availability toggle (defaults to offline on approval). */
export const AVAILABILITY_STATUSES = [
  "available",
  "busy",
  "offline",
  "stale",
] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

/** Appendix B — job lifecycle. */
export const JOB_STATUSES = [
  "draft",
  "matched_awaiting_payment",
  "matched",
  "matched_tier2",
  "matched_tier3",
  "awaiting_admin_match",
  "accepted_by_mechanic",
  "en_route",
  "vehicle_received",
  "arrived",
  "diagnosing",
  "quote_pending_admin",
  "quote_submitted",
  "quote_approved",
  "awaiting_parts_consent",
  "quote_declined",
  "requote_submitted",
  "in_progress",
  "completed_pending_confirmation",
  "confirmed",
  "disputed",
  "refunded",
  "cancelled",
  "no_show_pending_review",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

/** §5.3 — AI diagnosis category enum. */
export const DIAGNOSIS_CATEGORIES = [
  "battery_starting",
  "brakes",
  "oil_maintenance",
  "engine_diagnostics",
  "transmission",
  "tires_wheels",
  "electrical",
  "ac_heating",
  "suspension_steering",
  "exhaust",
  "fuel_system",
  "general_maintenance",
  "unknown",
] as const;

export type DiagnosisCategory = (typeof DIAGNOSIS_CATEGORIES)[number];

/** §5.3 — driveability assessment. */
export const DRIVEABILITY_VALUES = ["safe", "caution", "do_not_drive"] as const;

export type Driveability = (typeof DRIVEABILITY_VALUES)[number];

/** §5.3 — urgency recommendation. */
export const FIX_NOW_VS_WAIT_VALUES = ["now", "soon", "can_wait"] as const;

export type FixNowVsWait = (typeof FIX_NOW_VS_WAIT_VALUES)[number];

/** §5.3 — model confidence. */
export const DIAGNOSIS_CONFIDENCE_VALUES = ["high", "medium", "low"] as const;

export type DiagnosisConfidence = (typeof DIAGNOSIS_CONFIDENCE_VALUES)[number];

/** §6 / §7 — mobile on-site vs shop drop-off. */
export const SERVICE_TYPES = ["mobile_repair", "dropoff"] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

/** §10.2 — payment record kinds + idempotency key prefixes. */
export const PAYMENT_TYPES = [
  "setup",
  "final",
  "cancellation_fee",
  "diagnostic_fee",
  "tip",
  "installed_parts",
  "parts_cancellation",
] as const;

export type PaymentType = (typeof PAYMENT_TYPES)[number];

/** Stripe-aligned payment row status. */
export const PAYMENT_STATUSES = [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "canceled",
  "requires_action",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * §11.1 — admin alert types (11 total per scope doc).
 * Derived from onboarding, matching, disputes, and Stripe webhooks.
 */
export const ACTION_ITEM_TYPES = [
  "new_mechanic_application",
  "awaiting_admin_match",
  "no_show_pending_review",
  "dispute",
  "dispute_reminder_24h",
  "dispute_reminder_48h",
  "dispute_reminder_72h",
  "setup_failed",
  "payment_failed",
  "charge_dispute",
  "cancellation_review",
  "receipt_overdue",
  "receipt_review",
  "parts_flagged",
] as const;

export type ActionItemType = (typeof ACTION_ITEM_TYPES)[number];

/** Exhibit A §5.3 — parts receipt submission state (field names INFERRED). */
export const RECEIPT_STATUSES = [
  "pending",
  "submitted",
  "overdue",
  "invalid",
] as const;

export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

export const ACTION_ITEM_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "dismissed",
] as const;

export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number];
