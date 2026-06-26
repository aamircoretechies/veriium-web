import { z } from "zod";

/** UI service badge keys (Find Mechanic filters + mechanic cards). */
export const mechanicServiceKeySchema = z.enum([
  "engine",
  "brakes",
  "suspension",
  "electrical",
  "diagnostics",
  "general",
  "other",
]);

export const mechanicSearchMinRatingSchema = z.union([
  z.literal(0),
  z.literal(3),
  z.literal(4),
  z.literal(4.5),
]);

export const mechanicSearchServiceTypeFilterSchema = z.enum([
  "all",
  "mobile",
  "shop",
]);

export const mechanicSearchSortSchema = z.enum([
  "distance",
  "rating",
  "reviews",
  "experience",
]);

export const mechanicSearchQuerySchema = z.object({
  zip: z
    .string()
    .regex(/^\d{1,5}$/, "ZIP must be 1–5 digits.")
    .optional(),
  minRating: z.coerce
    .number()
    .pipe(mechanicSearchMinRatingSchema)
    .default(0),
  aseCertifiedOnly: z.boolean().default(false),
  services: z.array(mechanicServiceKeySchema).default([]),
  availableTodayOnly: z.boolean().default(false),
  maxDistance: z.coerce.number().min(5).max(50).default(50),
  serviceType: mechanicSearchServiceTypeFilterSchema.default("all"),
  sort: mechanicSearchSortSchema.default("distance"),
});

export const mechanicListingSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string(),
  rating: z.number(),
  reviewCount: z.number().int().nonnegative(),
  yearsExperience: z.number().int().nonnegative(),
  aseCertified: z.boolean(),
  services: z.array(mechanicServiceKeySchema),
  zipCode: z.string(),
  city: z.string(),
  state: z.string(),
  distance: z.number().nonnegative(),
  mobileAvailable: z.boolean(),
  shopAvailable: z.boolean(),
  availableToday: z.boolean(),
  bio: z.string(),
  languages: z.array(z.string()),
});

export const mechanicSearchResponseSchema = z.object({
  mechanics: z.array(mechanicListingSchema),
  total: z.number().int().nonnegative(),
});

export type MechanicServiceKey = z.infer<typeof mechanicServiceKeySchema>;
export type MechanicSearchMinRating = z.infer<
  typeof mechanicSearchMinRatingSchema
>;
export type MechanicSearchServiceTypeFilter = z.infer<
  typeof mechanicSearchServiceTypeFilterSchema
>;
export type MechanicSearchSort = z.infer<typeof mechanicSearchSortSchema>;
export type MechanicSearchQuery = z.infer<typeof mechanicSearchQuerySchema>;
export type MechanicListing = z.infer<typeof mechanicListingSchema>;
export type MechanicSearchResponse = z.infer<typeof mechanicSearchResponseSchema>;

const MECHANIC_SEARCH_QUERY_KEYS = [
  "zip",
  "minRating",
  "aseCertifiedOnly",
  "services",
  "availableTodayOnly",
  "maxDistance",
  "serviceType",
  "sort",
] as const;

function parseQueryBoolean(value: string): boolean {
  return value === "true" || value === "1";
}

/**
 * Extract `GET /api/mechanics/search` query params from URL search params.
 * Omits absent keys so Zod defaults apply; coerces booleans and splits `services`.
 */
export function parseMechanicSearchQuery(
  searchParams: URLSearchParams,
): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  for (const key of MECHANIC_SEARCH_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value === null || value === "") {
      continue;
    }

    switch (key) {
      case "aseCertifiedOnly":
      case "availableTodayOnly":
        query[key] = parseQueryBoolean(value);
        break;
      case "services":
        query[key] = value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      default:
        query[key] = value;
        break;
    }
  }

  return query;
}
