import type {
  AvailabilityStatus,
  DiagnosisCategory,
  MechanicStatus,
} from "./enums";
import type {
  AirtableAttachment,
  AirtableDateTime,
  AirtableLinkedRecords,
} from "./fields";

/**
 * Mechanics table — applicants + approved pros (§11.1, §11.3).
 */
export type MechanicFields = {
  // §11.3 — account state & workflow
  status: MechanicStatus;
  availability_status?: AvailabilityStatus;
  setup_wizard_completed_at?: AirtableDateTime;
  approved_at?: AirtableDateTime;
  under_review_at?: AirtableDateTime;
  rejected_at?: AirtableDateTime;
  suspended_at?: AirtableDateTime;
  review_notes?: string;
  last_assigned_at?: AirtableDateTime;

  // Application / profile (§4.3, §4.10, §6.2)
  full_name?: string;
  phone?: string;
  email?: string;
  profile_photo?: AirtableAttachment[];
  driver_license?: AirtableAttachment[];
  ase_certification?: AirtableAttachment[];
  insurance_document?: AirtableAttachment[];
  bio?: string;
  languages?: string;
  years_experience?: number;
  ase_certified?: boolean;
  other_certifications?: string;

  // Service setup (§8.1 matching filters)
  service_zip_codes?: string[];
  service_categories?: DiagnosisCategory[];
  tools_confirmed?: boolean;
  transport_confirmed?: boolean;
  mobile_repairs_confirmed?: boolean;
  mobile_available?: boolean;
  shop_available?: boolean;
  shop_address?: string;
  service_radius?: number;

  // Linked records
  jobs?: AirtableLinkedRecords;
};
