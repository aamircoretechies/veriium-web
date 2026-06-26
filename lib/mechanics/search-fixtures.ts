import type { AirtableClient } from "@/lib/airtable";
import type { AirtableRecord } from "@/types/airtable/common";
import type { MechanicFields } from "@/types/airtable/mechanics";

const SETUP_COMPLETED_AT = "2025-01-15T12:00:00.000Z";

/** Approved mechanic rows for in-memory search (Gwinnett pilot ZIPs). */
export const MECHANIC_SEARCH_FIXTURE_FIELDS: Partial<MechanicFields>[] = [
  {
    status: "approved",
    setup_wizard_completed_at: SETUP_COMPLETED_AT,
    full_name: "Marcus Thompson",
    bio: "ASE-certified mobile mechanic specializing in brakes and engine diagnostics across Lawrenceville.",
    languages: "English",
    years_experience: 14,
    ase_certified: true,
    service_zip_codes: ["30043", "30044", "30045"],
    service_categories: ["brakes", "engine_diagnostics"],
    mobile_available: true,
    shop_available: false,
    availability_status: "available",
  },
  {
    status: "approved",
    setup_wizard_completed_at: SETUP_COMPLETED_AT,
    full_name: "Anita Patel",
    bio: "Shop-based suspension and general maintenance expert serving Duluth and Peachtree Corners.",
    languages: "English, Hindi",
    years_experience: 9,
    ase_certified: true,
    service_zip_codes: ["30096", "30097", "30092"],
    service_categories: ["suspension_steering", "general_maintenance"],
    mobile_available: false,
    shop_available: true,
    availability_status: "available",
  },
  {
    status: "approved",
    setup_wizard_completed_at: SETUP_COMPLETED_AT,
    full_name: "Robert Chen",
    bio: "Electrical systems and OBD diagnostics for modern vehicles. Mobile and shop service in Norcross.",
    languages: "English, Mandarin",
    years_experience: 11,
    ase_certified: false,
    service_zip_codes: ["30071", "30092"],
    service_categories: ["electrical", "engine_diagnostics"],
    mobile_available: true,
    shop_available: true,
    availability_status: "busy",
  },
  {
    status: "approved",
    setup_wizard_completed_at: SETUP_COMPLETED_AT,
    full_name: "Elena Rodriguez",
    bio: "Mobile brake and maintenance specialist covering Suwanee and nearby neighborhoods.",
    languages: "English, Spanish",
    years_experience: 7,
    ase_certified: true,
    service_zip_codes: ["30024", "30043"],
    service_categories: ["brakes", "general_maintenance"],
    mobile_available: true,
    shop_available: false,
    availability_status: "available",
  },
  {
    status: "approved",
    setup_wizard_completed_at: SETUP_COMPLETED_AT,
    full_name: "William Jackson",
    bio: "General repairs and specialty jobs at my Buford shop. Call ahead for same-week appointments.",
    languages: "English",
    years_experience: 20,
    ase_certified: false,
    service_zip_codes: ["30518", "30024"],
    service_categories: ["general_maintenance", "unknown"],
    mobile_available: false,
    shop_available: true,
    availability_status: "offline",
  },
  {
    status: "approved",
    setup_wizard_completed_at: SETUP_COMPLETED_AT,
    full_name: "Jasmine Williams",
    bio: "Full-service mobile mechanic for brakes, electrical, and suspension work in Snellville.",
    languages: "English",
    years_experience: 6,
    ase_certified: true,
    service_zip_codes: ["30039", "30045", "30046"],
    service_categories: ["brakes", "electrical", "suspension_steering"],
    mobile_available: true,
    shop_available: true,
    availability_status: "available",
  },
  {
    status: "approved",
    setup_wizard_completed_at: SETUP_COMPLETED_AT,
    full_name: "David Kim",
    bio: "Engine diagnostics and electrical troubleshooting with fast mobile response in Peachtree Corners.",
    languages: "English, Korean",
    years_experience: 5,
    ase_certified: true,
    service_zip_codes: ["30092", "30071", "30096"],
    service_categories: ["engine_diagnostics", "electrical"],
    mobile_available: true,
    shop_available: false,
    availability_status: "available",
  },
  {
    status: "under_review",
    setup_wizard_completed_at: SETUP_COMPLETED_AT,
    full_name: "Pending Applicant",
    service_zip_codes: ["30043"],
    service_categories: ["brakes"],
    mobile_available: true,
    shop_available: false,
    availability_status: "available",
  },
];

/** Insert fixture mechanics into an in-memory Airtable client (idempotent). */
export async function seedMechanicSearchFixtures(
  client: AirtableClient,
): Promise<void> {
  const existing = await client.listRecords<MechanicFields>("mechanics", {
    maxRecords: 1,
  });
  if (existing.records.length > 0) {
    return;
  }

  for (const fields of MECHANIC_SEARCH_FIXTURE_FIELDS) {
    await client.createRecord<MechanicFields>("mechanics", fields);
  }
}

export type MechanicSearchFixtureRecord = AirtableRecord<MechanicFields>;
