import type {
  DiagnosisCategory,
  JobStatus,
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
  quote_submitted_at?: AirtableDateTime;
  quote_approved_at?: AirtableDateTime;
  quote_declined_at?: AirtableDateTime;
  in_progress_at?: AirtableDateTime;
  completed_at?: AirtableDateTime;
  confirmed_at?: AirtableDateTime;
  disputed_at?: AirtableDateTime;
  cancelled_at?: AirtableDateTime;
};
