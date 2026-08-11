import { formatServiceCategoryLabels } from "@/lib/mechanics/category-labels";
import { normalizeServiceCategories } from "@/lib/mechanics/normalize-categories";
import { parseMechanicZipCodes } from "@/lib/mechanics/zip-codes";
import type {
  MechanicDashboardProfile,
  MechanicDashboardServiceSetup,
} from "@/types/api/mechanic-dashboard";
import type { AirtableRecord } from "@/types/airtable/common";
import type { MechanicFields } from "@/types/airtable/mechanics";

export function toMechanicDashboardProfile(
  record: AirtableRecord<MechanicFields>,
): MechanicDashboardProfile {
  const { fields } = record;

  return {
    photoUrl: fields.profile_photo_url?.trim() || undefined,
    bio: fields.bio?.trim() ?? "",
    languages: fields.languages ?? [],
    certifiedStatus: fields.certified_status ?? "not_certified",
    certifications: fields.certifications?.trim() || undefined,
  };
}

export function toMechanicDashboardServiceSetup(
  record: AirtableRecord<MechanicFields>,
): MechanicDashboardServiceSetup {
  const { fields } = record;
  const zipCodes = parseMechanicZipCodes(fields.service_zip_codes);
  const categoryLabels = formatServiceCategoryLabels(
    normalizeServiceCategories(fields.service_categories),
  );

  return {
    zipCodes,
    categoryLabels,
    tools: fields.tools_confirmed ?? [],
    shopAddress: fields.shop_address?.trim() || undefined,
    mobileAvailable: Boolean(fields.approved),
    shopAvailable: Boolean(fields.shop_address?.trim()),
  };
}
