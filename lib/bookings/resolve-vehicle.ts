import type { BookingVehicle } from "@/types/api/booking";
import { lookupVehicle as defaultLookupVehicle } from "@/lib/vehicles/lookup";
import { NhtsaLookupError } from "@/lib/vehicles/errors";
import { InvalidVehicleError } from "./errors";

export type ResolvedVehicle = {
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
};

type VehicleLookup = typeof defaultLookupVehicle;

function stripUndefined(vehicle: ResolvedVehicle): ResolvedVehicle {
  return {
    ...(vehicle.year !== undefined ? { year: vehicle.year } : {}),
    ...(vehicle.make ? { make: vehicle.make } : {}),
    ...(vehicle.model ? { model: vehicle.model } : {}),
    ...(vehicle.vin ? { vin: vehicle.vin } : {}),
  };
}

function normalizeVehicleInput(
  vehicle?: BookingVehicle,
): BookingVehicle | undefined {
  if (!vehicle) {
    return undefined;
  }

  const normalized: BookingVehicle = {
    year: vehicle.year,
    make: vehicle.make?.trim() || undefined,
    model: vehicle.model?.trim() || undefined,
    vin: vehicle.vin?.trim() || undefined,
  };

  if (
    normalized.year === undefined &&
    !normalized.make &&
    !normalized.model &&
    !normalized.vin
  ) {
    return undefined;
  }

  return normalized;
}

function modelMatches(
  models: string[],
  requestedModel: string,
): boolean {
  const target = requestedModel.trim().toLowerCase();
  return models.some((model) => model.trim().toLowerCase() === target);
}

/**
 * Validate and enrich vehicle intake via NHTSA before persisting on a job.
 * Partial or empty vehicle input is allowed.
 */
export async function resolveVehicle(
  vehicle?: BookingVehicle,
  options?: { lookup?: VehicleLookup },
): Promise<ResolvedVehicle | undefined> {
  const lookup = options?.lookup ?? defaultLookupVehicle;
  const normalized = normalizeVehicleInput(vehicle);
  if (!normalized) {
    return undefined;
  }

  try {
    if (normalized.vin) {
      const decoded = await lookup({ vin: normalized.vin });
      if (!("vin" in decoded)) {
        throw new InvalidVehicleError("Unable to decode vehicle from VIN.");
      }

      return stripUndefined({
        vin: decoded.vin,
        year: decoded.year,
        make: decoded.make,
        model: decoded.model,
      });
    }

    if (
      normalized.year !== undefined &&
      normalized.make &&
      normalized.model
    ) {
      const modelsResult = await lookup({
        year: normalized.year,
        make: normalized.make,
      });

      if (!("models" in modelsResult)) {
        throw new InvalidVehicleError("Unable to verify vehicle make and model.");
      }

      if (!modelMatches(modelsResult.models, normalized.model)) {
        throw new InvalidVehicleError(
          "No vehicle was found for that year, make, and model.",
        );
      }

      return stripUndefined({
        year: normalized.year,
        make: normalized.make,
        model: normalized.model,
      });
    }

    return stripUndefined({
      year: normalized.year,
      make: normalized.make,
      model: normalized.model,
      vin: normalized.vin,
    });
  } catch (error) {
    if (error instanceof InvalidVehicleError) {
      throw error;
    }
    if (error instanceof NhtsaLookupError) {
      throw new InvalidVehicleError(error.message);
    }
    throw error;
  }
}
