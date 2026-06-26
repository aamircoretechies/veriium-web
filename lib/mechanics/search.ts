import { getMechanicSearchClient } from "@/lib/mechanics/search-client";
import { buildMechanicSearchFormula } from "@/lib/mechanics/search-formula";
import { mapMechanicToListing } from "@/lib/mechanics/search-mapper";
import type {
  MechanicListing,
  MechanicSearchQuery,
  MechanicSearchResponse,
  MechanicSearchSort,
} from "@/types/api/mechanic-search";
import type { MechanicFields } from "@/types/airtable/mechanics";

const MAX_RECORDS = 100;

function effectiveSort(query: MechanicSearchQuery): MechanicSearchSort {
  if (!query.zip && query.sort === "distance") {
    return "experience";
  }
  return query.sort;
}

function sortMechanics(
  listings: MechanicListing[],
  sort: MechanicSearchSort,
): MechanicListing[] {
  const sorted = [...listings];

  switch (sort) {
    case "distance":
      sorted.sort((left, right) => left.distance - right.distance);
      break;
    case "rating":
      sorted.sort((left, right) => right.rating - left.rating);
      break;
    case "reviews":
      sorted.sort((left, right) => right.reviewCount - left.reviewCount);
      break;
    case "experience":
      sorted.sort((left, right) => right.yearsExperience - left.yearsExperience);
      break;
  }

  return sorted;
}

function applyPostFilters(
  listings: MechanicListing[],
  query: MechanicSearchQuery,
): MechanicListing[] {
  let filtered = listings;

  if (query.zip && query.maxDistance < 50) {
    filtered = filtered.filter(
      (listing) => listing.distance <= query.maxDistance,
    );
  }

  // minRating is accepted but ineffective until reviews ship (all listings rate 0).

  return filtered;
}

export async function searchMechanics(
  query: MechanicSearchQuery,
): Promise<MechanicSearchResponse> {
  const client = await getMechanicSearchClient();
  const response = await client.listRecords<MechanicFields>("mechanics", {
    filterByFormula: buildMechanicSearchFormula(query),
    maxRecords: MAX_RECORDS,
  });

  const listings = response.records.map((record) =>
    mapMechanicToListing(record, query.zip),
  );
  const filtered = applyPostFilters(listings, query);
  const mechanics = sortMechanics(filtered, effectiveSort(query));

  return {
    mechanics,
    total: mechanics.length,
  };
}
