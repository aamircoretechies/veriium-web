import { GWINNETT_ZIP_LOCATIONS } from "@/lib/constants/gwinnett-zips";

export type ZipCentroid = {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
};

const CENTROID_BY_ZIP = new Map<string, ZipCentroid>(
  GWINNETT_ZIP_LOCATIONS.map((location) => [
    location.zip,
    {
      zip: location.zip,
      city: location.city,
      state: location.state,
      lat: location.lat,
      lng: location.lng,
    },
  ]),
);

/** Look up a pilot ZIP centroid. Returns undefined for unknown ZIPs. */
export function getZipCentroid(zip: string): ZipCentroid | undefined {
  return CENTROID_BY_ZIP.get(zip.trim());
}

/** City and state for a pilot ZIP (used by mechanic search mapper). */
export function getZipCityState(
  zip: string,
): { city: string; state: string } | undefined {
  const centroid = getZipCentroid(zip);
  if (!centroid) {
    return undefined;
  }

  return { city: centroid.city, state: centroid.state };
}
