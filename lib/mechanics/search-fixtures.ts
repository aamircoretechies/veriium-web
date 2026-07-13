import type { AirtableClient } from "@/lib/airtable";
import type { AirtableRecord } from "@/types/airtable/common";
import type { MechanicFields } from "@/types/airtable/mechanics";

/** Approved mechanic rows for in-memory search (Gwinnett pilot ZIPs). */
export const MECHANIC_SEARCH_FIXTURE_FIELDS: Partial<MechanicFields>[] = [
  {
    approved: true,
    background_check_status: "cleared",
    name: "Marcus Thompson",
    phone_number: "+16785550101",
    bio: "ASE-certified mobile mechanic specializing in brakes and engine diagnostics across Lawrenceville.",
    languages: ["English"],
    certified_status: "certified",
    service_zip_codes: "30043\n30044\n30045",
    service_categories: ["brakes", "engine_diagnostics"],
    profile_photo_url: "https://example.com/marcus.jpg",
    availability_status: "available",
  },
  {
    approved: true,
    background_check_status: "cleared",
    name: "Anita Patel",
    shop_address: "123 Main St, Duluth, GA",
    bio: "Shop-based suspension and general maintenance expert serving Duluth and Peachtree Corners.",
    languages: ["English", "Other"],
    certified_status: "certified",
    service_zip_codes: "30096\n30097\n30092",
    service_categories: ["suspension_steering", "general_maintenance"],
    profile_photo_url: "https://example.com/anita.jpg",
    availability_status: "available",
  },
  {
    approved: true,
    background_check_status: "cleared",
    name: "Robert Chen",
    phone_number: "+16785550103",
    shop_address: "456 Oak Ave, Norcross, GA",
    bio: "Electrical systems and OBD diagnostics for modern vehicles. Mobile and shop service in Norcross.",
    languages: ["English", "Other"],
    certified_status: "not_certified",
    service_zip_codes: "30071\n30092",
    service_categories: ["electrical", "engine_diagnostics"],
    profile_photo_url: "https://example.com/robert.jpg",
    availability_status: "busy",
  },
  {
    approved: true,
    background_check_status: "cleared",
    name: "Elena Rodriguez",
    phone_number: "+16785550104",
    bio: "Mobile AC and heating specialist across Lawrenceville and Snellville.",
    languages: ["English", "Spanish"],
    certified_status: "certified",
    service_zip_codes: "30043\n30039",
    service_categories: ["ac_heating"],
    profile_photo_url: "https://example.com/elena.jpg",
    availability_status: "available",
  },
  {
    approved: true,
    background_check_status: "cleared",
    name: "William Jackson",
    shop_address: "789 Peachtree Pkwy, Peachtree Corners, GA",
    bio: "Transmission and drivetrain shop serving northeast Gwinnett.",
    languages: ["English"],
    certified_status: "certified",
    service_zip_codes: "30092\n30096",
    service_categories: ["transmission"],
    profile_photo_url: "https://example.com/william.jpg",
    availability_status: "available",
  },
  {
    approved: true,
    background_check_status: "cleared",
    name: "Jasmine Williams",
    phone_number: "+16785550106",
    shop_address: "321 Buford Hwy, Lawrenceville, GA",
    bio: "Full-service mobile and shop mechanic for brakes, tires, and oil changes.",
    languages: ["English"],
    certified_status: "certified",
    service_zip_codes: "30043\n30044",
    service_categories: ["brakes", "oil_maintenance", "tires_wheels"],
    profile_photo_url: "https://example.com/jasmine.jpg",
    availability_status: "available",
  },
  {
    approved: true,
    background_check_status: "cleared",
    name: "David Kim",
    phone_number: "+16785550107",
    bio: "Hybrid and electrical diagnostics specialist. Mobile service in Duluth.",
    languages: ["English", "Other"],
    certified_status: "certified",
    service_zip_codes: "30096\n30097",
    service_categories: ["electrical", "engine_diagnostics"],
    profile_photo_url: "https://example.com/david.jpg",
    availability_status: "available",
  },
  {
    approved: true,
    background_check_status: "cleared",
    name: "Tyler Brooks",
    phone_number: "+16785550108",
    bio: "Mobile general maintenance in Auburn and northeast Gwinnett.",
    languages: ["English"],
    certified_status: "not_certified",
    service_zip_codes: "30011",
    service_categories: ["general_maintenance"],
    profile_photo_url: "https://example.com/tyler.jpg",
    availability_status: "available",
  },
  {
    approved: false,
    background_check_status: "pending",
    name: "Pending Applicant",
    phone_number: "+16785550109",
    service_zip_codes: "30043",
    service_categories: ["brakes"],
    profile_photo_url: "https://example.com/pending.jpg",
    availability_status: "offline",
  },
];

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
