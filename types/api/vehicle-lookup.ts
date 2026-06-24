import { z } from "zod";

/** VIN decode — `?vin=…` */
const vehicleLookupVinQuerySchema = z
  .object({
    vin: z.string().min(1),
  })
  .strict();

/** Models for make and year — `?year=…&make=…` */
const vehicleLookupYearMakeQuerySchema = z
  .object({
    year: z.coerce.number().int().positive(),
    make: z.string().min(1),
  })
  .strict();

/** Models for make — `?make=…` */
const vehicleLookupMakeQuerySchema = z
  .object({
    make: z.string().min(1),
  })
  .strict();

/** All makes — `?resource=makes` */
const vehicleLookupMakesResourceQuerySchema = z
  .object({
    resource: z.literal("makes"),
  })
  .strict();

export const vehicleLookupQuerySchema = z.union([
  vehicleLookupVinQuerySchema,
  vehicleLookupYearMakeQuerySchema,
  vehicleLookupMakeQuerySchema,
  vehicleLookupMakesResourceQuerySchema,
]);

export type VehicleLookupQuery = z.infer<typeof vehicleLookupQuerySchema>;
