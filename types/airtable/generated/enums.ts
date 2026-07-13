/** AUTO-GENERATED from docs/schema.json — do not edit. */

export const MECHANICS_SERVICE_CATEGORIES = ["battery_starting", "brakes", "oil_maintenance", "engine_diagnostics", "transmission", "tires_wheels", "electrical", "ac_heating", "suspension_steering", "exhaust", "fuel_system", "general_maintenance", "Engine Repair", "Brakes", "Diagnostics", "Transmission", "Electrical Systems", "Suspension", "Hybrid Systems", "Oil Change", "Air Conditioning"] as const;
export type MechanicsServiceCategories = (typeof MECHANICS_SERVICE_CATEGORIES)[number];

export const MECHANICS_AVAILABILITY_STATUS = ["available", "busy", "offline"] as const;
export type MechanicsAvailabilityStatus = (typeof MECHANICS_AVAILABILITY_STATUS)[number];

export const MECHANICS_BACKGROUND_CHECK_STATUS = ["not_submitted", "pending", "cleared", "failed"] as const;
export type MechanicsBackgroundCheckStatus = (typeof MECHANICS_BACKGROUND_CHECK_STATUS)[number];

export const MECHANICS_LANGUAGES = ["English", "Spanish", "Other"] as const;
export type MechanicsLanguages = (typeof MECHANICS_LANGUAGES)[number];

export const MECHANICS_TOOLS_CONFIRMED = ["OBD2 scanner", "Jack and stands", "Basic tool kit", "Battery tester", "Brake tools", "AC manifold", "Transmission jack", "Electrical multimeter", "Other"] as const;
export type MechanicsToolsConfirmed = (typeof MECHANICS_TOOLS_CONFIRMED)[number];

export const MECHANICS_CERTIFIED_STATUS = ["certified", "not_certified", "pending_review"] as const;
export type MechanicsCertifiedStatus = (typeof MECHANICS_CERTIFIED_STATUS)[number];

export const PAYMENTS_STATUS = ["requires_action", "requires_confirmation", "processing", "succeeded", "canceled", "requires_payment_method", "refunded"] as const;
export type PaymentsStatus = (typeof PAYMENTS_STATUS)[number];

export const PAYMENTS_TYPE = ["setup_intent", "final_pi", "cancellation_fee", "diagnostic_fee", "tip", "refund"] as const;
export type PaymentsType = (typeof PAYMENTS_TYPE)[number];

export const DIAGNOSES_AI_RESPONSE_CATEGORY = ["battery_starting", "brakes", "oil_maintenance", "engine_diagnostics", "transmission", "tires_wheels", "electrical", "ac_heating", "suspension_steerting", "exhaust", "fuel_system", "general_maintenance", "unknown"] as const;
export type DiagnosesAiResponseCategory = (typeof DIAGNOSES_AI_RESPONSE_CATEGORY)[number];

export const DIAGNOSES_AI_RESPONSE_DRIVEABILITY = ["safe", "caution", "do_not_drive", "Not Driveable", "Driveable with Caution", "Driveable"] as const;
export type DiagnosesAiResponseDriveability = (typeof DIAGNOSES_AI_RESPONSE_DRIVEABILITY)[number];

export const DIAGNOSES_VALIDATION_RULE_TRIGGERED = ["none", "R1", "R2", "R3", "R4"] as const;
export type DiagnosesValidationRuleTriggered = (typeof DIAGNOSES_VALIDATION_RULE_TRIGGERED)[number];

export const DIAGNOSES_AI_RESPONSE_CONFIDENCE = ["high", "medium", "low"] as const;
export type DiagnosesAiResponseConfidence = (typeof DIAGNOSES_AI_RESPONSE_CONFIDENCE)[number];

export const ACTION_ITEMS_PRIORITY = ["high", "medium", "low"] as const;
export type ActionItemsPriority = (typeof ACTION_ITEMS_PRIORITY)[number];

export const ACTION_ITEMS_STATUS = ["open", "in_progress", "resolved", "dismissed"] as const;
export type ActionItemsStatus = (typeof ACTION_ITEMS_STATUS)[number];

export const ACTION_ITEMS_TYPE = ["Pending mechanic approval", "No-show report filed", "Open dispute", "Failed cancellation fee charge", "Failed diagnostic fee charge", "No mechanic available Tier 4", "Parts cost flagged", "Receipt not submitted", "Work paused requested", "Driver non-response 72h", "Driver SMS opt-out", "Reminder cron failed", "Mechanic availability inactive", "Chargeback received"] as const;
export type ActionItemsType = (typeof ACTION_ITEMS_TYPE)[number];

export const JOBS_STATUS = ["draft", "matched_awaiting_payment", "matched_awaiting_response", "accepted_by_mechanic", "en_route", "arrived", "vehicle_received", "diagnosing", "quote_provided", "awaiting_customer_approval", "approved_parts_pickup", "in_progress", "completed_pending_confirmation", "confirmed", "disputed", "refunded", "cancelled", "cancelled_after_diagnosis", "no_show_pending_review", "awaiting_admin_match", "Scheduled", "Cancelled", "In Progress"] as const;
export type JobsStatus = (typeof JOBS_STATUS)[number];

export const JOBS_DIAGNOSIS_CATEGORY = ["battery_starting", "brakes", "oil_maintenance", "engine_diagnostics", "transmission", "tires_wheels", "electrical", "ac_heating", "suspension_steering", "exhaust", "fuel_system", "general_maintenance", "unknown", "Engine", "Electrical", "Transmission", "N/A", "HVAC", "Emissions", "Tires", "Maintenance", "Steering", "Cooling System", "Belts & Hoses", "Fuel System", "Exhaust", "Lighting"] as const;
export type JobsDiagnosisCategory = (typeof JOBS_DIAGNOSIS_CATEGORY)[number];

export const JOBS_DIAGNOSIS_DRIVEABILITY = ["safe", "caution", "do_not_drive", "No", "Yes", "N/A"] as const;
export type JobsDiagnosisDriveability = (typeof JOBS_DIAGNOSIS_DRIVEABILITY)[number];

export const JOBS_SERVICE_TYPE = ["mobile_repair", "dropoff"] as const;
export type JobsServiceType = (typeof JOBS_SERVICE_TYPE)[number];

export const JOBS_PAYMENT_STATUS = ["pending", "succeeded", "failed", "refunded", "disputed", "cancelled", "Paid", "Unpaid", "Cancelled", "Pending"] as const;
export type JobsPaymentStatus = (typeof JOBS_PAYMENT_STATUS)[number];

export const JOBS_CANCELLED_BY = ["driver", "mechanic", "admin", "system"] as const;
export type JobsCancelledBy = (typeof JOBS_CANCELLED_BY)[number];

/** Canonical snake_case service categories — preferred write set. */
export const SERVICE_CATEGORIES_CANONICAL = ["battery_starting", "brakes", "oil_maintenance", "engine_diagnostics", "transmission", "tires_wheels", "electrical", "ac_heating", "suspension_steering", "exhaust", "fuel_system", "general_maintenance"] as const;
export type ServiceCategoryCanonical =
  (typeof SERVICE_CATEGORIES_CANONICAL)[number];

/** Legacy Title Case options — read-time normalize only; remove from Airtable later. */
export const SERVICE_CATEGORIES_LEGACY = [
  "Engine Repair", "Brakes", "Diagnostics", "Transmission",
  "Electrical Systems", "Suspension", "Hybrid Systems",
  "Oil Change", "Air Conditioning",
] as const;
export type ServiceCategoryLegacy =
  (typeof SERVICE_CATEGORIES_LEGACY)[number];
