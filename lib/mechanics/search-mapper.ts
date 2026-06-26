import { findNearestServiceZip } from "@/lib/geo/distance";
import { getZipCityState } from "@/lib/geo/zip-centroids";
import { mapCategoriesToUiServices } from "@/lib/mechanics/map-categories";
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

function parseLanguages(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((language) => language.trim())
    .filter(Boolean);
}

function resolveListingZip(
  searchZip: string | undefined,
  serviceZipCodes: string[] | undefined,
): string {
  const zips = serviceZipCodes ?? [];
  if (searchZip) {
    const nearest = findNearestServiceZip(searchZip, zips);
    if (nearest) {
      return nearest.zip;
    }
  }

  return zips[0] ?? "";
}

export function mapMechanicToListing(
  record: AirtableRecord<MechanicFields>,
  searchZip?: string,
): MechanicListing {
  const fields = record.fields;
  const serviceZipCodes = fields.service_zip_codes ?? [];
  const nearest =
    searchZip && serviceZipCodes.length > 0
      ? findNearestServiceZip(searchZip, serviceZipCodes)
      : undefined;
  const listingZip = resolveListingZip(searchZip, serviceZipCodes);
  const location = getZipCityState(listingZip);

  return {
    id: record.id,
    name: fields.full_name ?? "Mechanic",
    avatar: initialsFromName(fields.full_name ?? ""),
    rating: 0,
    reviewCount: 0,
    yearsExperience: fields.years_experience ?? 0,
    aseCertified: fields.ase_certified ?? false,
    services: mapCategoriesToUiServices(fields.service_categories),
    zipCode: listingZip,
    city: location?.city ?? "",
    state: location?.state ?? "",
    distance: nearest?.distance ?? 0,
    mobileAvailable: fields.mobile_available ?? false,
    shopAvailable: fields.shop_available ?? false,
    availableToday: fields.availability_status === "available",
    bio: fields.bio ?? "",
    languages: parseLanguages(fields.languages),
  };
}
