import { findNearestServiceZip } from "@/lib/geo/distance";
import { getZipCityState } from "@/lib/geo/zip-centroids";
import { mapCategoriesToUiServices } from "@/lib/mechanics/map-categories";
import { normalizeServiceCategories } from "@/lib/mechanics/normalize-categories";
import type { MechanicListing } from "@/types/api/mechanic-search";
import type { AirtableRecord } from "@/types/airtable/common";
import type { MechanicFields } from "@/types/airtable/mechanics";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function parseServiceZipCodes(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(/[\n,]+/)
    .map((zip) => zip.trim())
    .filter(Boolean);
}

function resolveListingZip(
  searchZip: string | undefined,
  serviceZipCodes: string[],
): string {
  if (searchZip) {
    const nearest = findNearestServiceZip(searchZip, serviceZipCodes);
    if (nearest) {
      return nearest.zip;
    }
  }

  return serviceZipCodes[0] ?? "";
}

export function mapMechanicToListing(
  record: AirtableRecord<MechanicFields>,
  searchZip?: string,
): MechanicListing {
  const fields = record.fields;
  const serviceZipCodes = parseServiceZipCodes(fields.service_zip_codes);
  const nearest =
    searchZip && serviceZipCodes.length > 0
      ? findNearestServiceZip(searchZip, serviceZipCodes)
      : undefined;
  const listingZip = resolveListingZip(searchZip, serviceZipCodes);
  const location = getZipCityState(listingZip);
  const name = fields.name ?? "Mechanic";

  return {
    id: record.id,
    name,
    avatar: initialsFromName(name),
    rating: 0,
    reviewCount: 0,
    yearsExperience: 0,
    aseCertified: fields.certified_status === "certified",
    services: mapCategoriesToUiServices(
      normalizeServiceCategories(fields.service_categories),
    ),
    zipCode: listingZip,
    city: location?.city ?? "",
    state: location?.state ?? "",
    distance: nearest?.distance ?? 0,
    mobileAvailable: Boolean(fields.phone_number?.trim()),
    shopAvailable: Boolean(fields.shop_address?.trim()),
    availableToday: fields.availability_status === "available",
    bio: fields.bio ?? "",
    languages: fields.languages ?? [],
  };
}
