/** Gwinnett County pilot ZIP allowlist (PDF Appendix A) with centroid metadata. */
export const GWINNETT_ZIP_LOCATIONS = [
  {
    zip: "30043",
    city: "Lawrenceville",
    state: "GA",
    lat: 34.0047,
    lng: -84.013,
  },
  {
    zip: "30044",
    city: "Lawrenceville",
    state: "GA",
    lat: 33.922,
    lng: -84.073,
  },
  {
    zip: "30045",
    city: "Lawrenceville",
    state: "GA",
    lat: 33.937,
    lng: -83.961,
  },
  {
    zip: "30046",
    city: "Lawrenceville",
    state: "GA",
    lat: 33.939,
    lng: -83.985,
  },
  {
    zip: "30096",
    city: "Duluth",
    state: "GA",
    lat: 33.9824,
    lng: -84.1511,
  },
  {
    zip: "30097",
    city: "Duluth",
    state: "GA",
    lat: 34.0265,
    lng: -84.163,
  },
  {
    zip: "30071",
    city: "Norcross",
    state: "GA",
    lat: 33.9412,
    lng: -84.2136,
  },
  {
    zip: "30092",
    city: "Peachtree Corners",
    state: "GA",
    lat: 33.9715,
    lng: -84.221,
  },
  {
    zip: "30039",
    city: "Snellville",
    state: "GA",
    lat: 33.8573,
    lng: -84.0199,
  },
  {
    zip: "30024",
    city: "Suwanee",
    state: "GA",
    lat: 34.063,
    lng: -84.083,
  },
  {
    zip: "30518",
    city: "Buford",
    state: "GA",
    lat: 34.1207,
    lng: -83.9893,
  },
] as const;

export type GwinnettZipLocation = (typeof GWINNETT_ZIP_LOCATIONS)[number];
export type GwinnettZipCode = GwinnettZipLocation["zip"];

/** Pilot ZIP strings only — derived from {@link GWINNETT_ZIP_LOCATIONS}. */
export const GWINNETT_ZIP_CODES: readonly GwinnettZipCode[] =
  GWINNETT_ZIP_LOCATIONS.map((location) => location.zip);
