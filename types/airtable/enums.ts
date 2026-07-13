/**
 * Schema-aligned enums from docs/schema.json (generated) plus app-only values.
 */
export {
  ACTION_ITEMS_PRIORITY,
  ACTION_ITEMS_STATUS,
  ACTION_ITEMS_TYPE,
  DIAGNOSES_AI_RESPONSE_CATEGORY,
  DIAGNOSES_AI_RESPONSE_CONFIDENCE,
  DIAGNOSES_AI_RESPONSE_DRIVEABILITY,
  DIAGNOSES_VALIDATION_RULE_TRIGGERED,
  JOBS_CANCELLED_BY,
  JOBS_DIAGNOSIS_CATEGORY,
  JOBS_DIAGNOSIS_DRIVEABILITY,
  JOBS_PAYMENT_STATUS,
  JOBS_SERVICE_TYPE,
  JOBS_STATUS,
  MECHANICS_AVAILABILITY_STATUS,
  MECHANICS_BACKGROUND_CHECK_STATUS,
  MECHANICS_CERTIFIED_STATUS,
  MECHANICS_LANGUAGES,
  MECHANICS_SERVICE_CATEGORIES,
  MECHANICS_TOOLS_CONFIRMED,
  PAYMENTS_STATUS,
  PAYMENTS_TYPE,
  SERVICE_CATEGORIES_CANONICAL,
  SERVICE_CATEGORIES_LEGACY,
  type ActionItemsPriority,
  type ActionItemsStatus,
  type ActionItemsType,
  type DiagnosesAiResponseCategory,
  type DiagnosesAiResponseConfidence,
  type DiagnosesAiResponseDriveability,
  type DiagnosesValidationRuleTriggered,
  type JobsCancelledBy,
  type JobsDiagnosisCategory,
  type JobsDiagnosisDriveability,
  type JobsPaymentStatus,
  type JobsServiceType,
  type JobsStatus,
  type MechanicsAvailabilityStatus,
  type MechanicsBackgroundCheckStatus,
  type MechanicsCertifiedStatus,
  type MechanicsLanguages,
  type MechanicsServiceCategories,
  type MechanicsToolsConfirmed,
  type PaymentsStatus,
  type PaymentsType,
  type ServiceCategoryCanonical,
  type ServiceCategoryLegacy,
} from "./generated/enums";

import type { ActionItemsType } from "./generated/enums";

/** Alias for generated JobsStatus. */
export type JobStatus = import("./generated/enums").JobsStatus;

export { JOBS_STATUS as JOB_STATUSES } from "./generated/enums";

export type PaymentStatus = import("./generated/enums").PaymentsStatus;
export { PAYMENTS_STATUS as PAYMENT_STATUSES } from "./generated/enums";

export type PaymentType = import("./generated/enums").PaymentsType;
export { PAYMENTS_TYPE as PAYMENT_TYPES } from "./generated/enums";

export type ActionItemStatus = import("./generated/enums").ActionItemsStatus;
export { ACTION_ITEMS_STATUS as ACTION_ITEM_STATUSES } from "./generated/enums";

export type ActionItemType = ActionItemsType;
export { ACTION_ITEMS_TYPE as ACTION_ITEM_TYPES } from "./generated/enums";

export type AvailabilityStatus =
  import("./generated/enums").MechanicsAvailabilityStatus;
export {
  MECHANICS_AVAILABILITY_STATUS as AVAILABILITY_STATUSES,
} from "./generated/enums";

/** Schema action item type literals used in create paths. */
export const ACTION_ITEM_TYPE = {
  PENDING_MECHANIC_APPROVAL: "Pending mechanic approval",
  NO_SHOW_REPORT: "No-show report filed",
  OPEN_DISPUTE: "Open dispute",
  FAILED_CANCELLATION_FEE: "Failed cancellation fee charge",
  FAILED_DIAGNOSTIC_FEE: "Failed diagnostic fee charge",
  NO_MECHANIC_TIER4: "No mechanic available Tier 4",
  PARTS_FLAGGED: "Parts cost flagged",
  RECEIPT_NOT_SUBMITTED: "Receipt not submitted",
  DRIVER_NON_RESPONSE_72H: "Driver non-response 72h",
  CHARGEBACK: "Chargeback received",
} as const satisfies Record<string, ActionItemsType>;

/** Canonical diagnosis categories for AI + matching (snake_case). */
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

export const DRIVEABILITY_VALUES = ["safe", "caution", "do_not_drive"] as const;
export type Driveability = (typeof DRIVEABILITY_VALUES)[number];

export const FIX_NOW_VS_WAIT_VALUES = ["now", "soon", "can_wait"] as const;
export type FixNowVsWait = (typeof FIX_NOW_VS_WAIT_VALUES)[number];

export const DIAGNOSIS_CONFIDENCE_VALUES = ["high", "medium", "low"] as const;
export type DiagnosisConfidence =
  (typeof DIAGNOSIS_CONFIDENCE_VALUES)[number];

export const SERVICE_TYPES = ["mobile_repair", "dropoff"] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

/** Stored in Jobs.quote_details JSON — not an Airtable column. */
export const RECEIPT_STATUSES = [
  "pending",
  "submitted",
  "overdue",
  "invalid",
] as const;
export type ReceiptStatus = (typeof RECEIPT_STATUSES)[number];

/** @deprecated Use MechanicsRecord.approved + background_check_status */
export type MechanicStatus =
  | "application_submitted"
  | "under_review"
  | "needs_more_info"
  | "approved"
  | "rejected"
  | "suspended";

export const MECHANIC_STATUSES = [
  "application_submitted",
  "under_review",
  "needs_more_info",
  "approved",
  "rejected",
  "suspended",
] as const;
