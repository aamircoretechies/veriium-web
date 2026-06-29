import type {
  DiagnosisCategory,
  JobStatus,
  ReceiptStatus,
  ServiceType,
} from "./enums";
import type { AirtableDateTime, AirtableLinkedRecords } from "./fields";

/**
 * Jobs table — bookings with status, timestamps, financials, links (§11.1).
 */
export type JobFields = {
  status: JobStatus;

  // Links
  driver?: AirtableLinkedRecords;
  mechanic?: AirtableLinkedRecords;
  diagnosis?: AirtableLinkedRecords;

  // Intake / matching (§5.4, §8)
  zip_code?: string;
  diagnosis_category?: DiagnosisCategory;
  service_type?: ServiceType;
  appointment_window_start?: AirtableDateTime;
  safety_flag?: boolean;

  // Vehicle intake (§5.4) — column names aligned with live Airtable Jobs table
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  vin?: string;
  additional_details?: string;

  // Quote & payout (§7.2–7.3)
  quote_amount?: number;
  parts_cost?: number;
  final_price?: number;
  mechanic_payout?: number;
  platform_fee?: number;
  on_hand?: boolean;

  // Non-OEM / used parts consent (Exhibit A §5.8 — field names INFERRED)
  non_oem_or_used_parts?: boolean;
  non_oem_parts_description?: string;
  non_oem_consent_at?: AirtableDateTime;

  // Quote hardening (Exhibit A §3.4 — quote_timeout_qstash_id INFERRED)
  quote_timeout_qstash_id?: string;

  // Requote (Exhibit A §3.2, §5.5 — field names INFERRED)
  original_parts_cost?: number;
  requote_reason?: string;
  requote_timeout_qstash_id?: string;
  parts_variance?: number;

  // Parts receipt (Exhibit A §5.3)
  receipt_url?: string;
  receipt_status?: ReceiptStatus;
  receipt_submitted_at?: AirtableDateTime;
  receipt_total?: number;
  parts_reimbursement_forfeited?: boolean;

  // Payment (§5.4)
  cancellation_policy_accepted_at?: AirtableDateTime;
  payment_setup_at?: AirtableDateTime;

  // Lifecycle timestamps
  matched_at?: AirtableDateTime;
  accepted_at?: AirtableDateTime;
  en_route_at?: AirtableDateTime;
  arrived_at?: AirtableDateTime;
  vehicle_received_at?: AirtableDateTime;
  diagnosing_at?: AirtableDateTime;
  quote_pending_admin_at?: AirtableDateTime;
  quote_submitted_at?: AirtableDateTime;
  quote_approved_at?: AirtableDateTime;
  awaiting_parts_consent_at?: AirtableDateTime;
  quote_declined_at?: AirtableDateTime;
  requote_submitted_at?: AirtableDateTime;
  requote_approved_at?: AirtableDateTime;
  requote_declined_at?: AirtableDateTime;
  in_progress_at?: AirtableDateTime;
  completed_at?: AirtableDateTime;
  confirmed_at?: AirtableDateTime;
  disputed_at?: AirtableDateTime;
  cancelled_at?: AirtableDateTime;
};
