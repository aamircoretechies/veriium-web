import { getZipCentroid } from "@/lib/geo/zip-centroids";

/** Mean Earth radius in statute miles. */
const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in miles between two lat/lng points (Haversine). */
export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

/** Distance in miles between two ZIP centroids. Unknown ZIPs yield undefined. */
export function distanceBetweenZips(
  zipA: string,
  zipB: string,
): number | undefined {
  const a = getZipCentroid(zipA);
  const b = getZipCentroid(zipB);
  if (!a || !b) {
    return undefined;
  }

  return haversineMiles(a.lat, a.lng, b.lat, b.lng);
}

export type NearestServiceZipResult = {
  zip: string;
  distance: number;
};

/**
 * Minimum Haversine distance from a search ZIP to any mechanic service ZIP
 * with a known centroid. Skips service ZIPs outside the pilot centroid table.
 */
export function findNearestServiceZip(
  searchZip: string,
  serviceZipCodes: string[],
): NearestServiceZipResult | undefined {
  const search = getZipCentroid(searchZip);
  if (!search) {
    return undefined;
  }

  let nearest: NearestServiceZipResult | undefined;

  for (const zip of serviceZipCodes) {
    const centroid = getZipCentroid(zip);
    if (!centroid) {
      continue;
    }

    const distance = haversineMiles(
      search.lat,
      search.lng,
      centroid.lat,
      centroid.lng,
    );

    if (!nearest || distance < nearest.distance) {
      nearest = { zip: centroid.zip, distance };
    }
  }

  return nearest;
}
