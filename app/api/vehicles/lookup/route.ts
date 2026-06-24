import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/response";
import { NhtsaLookupError } from "@/lib/vehicles/errors";
import { lookupVehicle } from "@/lib/vehicles/lookup";
import { vehicleLookupQuerySchema } from "@/types/api/vehicle-lookup";

const VEHICLE_LOOKUP_QUERY_KEYS = ["vin", "year", "make", "resource"] as const;

function parseVehicleLookupQuery(
  searchParams: URLSearchParams,
): Record<string, string> {
  const query: Record<string, string> = {};

  for (const key of VEHICLE_LOOKUP_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value !== null) {
      query[key] = value;
    }
  }

  return query;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = vehicleLookupQuerySchema.safeParse(
    parseVehicleLookupQuery(searchParams),
  );

  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  try {
    const result = await lookupVehicle(parsed.data);
    return jsonOk(result);
  } catch (error) {
    if (error instanceof NhtsaLookupError) {
      const status = error.code === "not_found" ? 404 : 502;
      return jsonError(status, error.code, error.message);
    }
    throw error;
  }
}
