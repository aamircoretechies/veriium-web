import type { VehicleLookupQuery } from "@/types/api/vehicle-lookup";
import { NhtsaLookupError } from "./errors";
import {
  decodeVinValues,
  getAllMakes,
  getModelsForMake,
  getModelsForMakeYear,
} from "./nhtsa";

export type VehicleVinLookupResult = {
  vin: string;
  year?: number;
  make?: string;
  model?: string;
};

export type VehicleModelsLookupResult = {
  models: string[];
};

export type VehicleMakeOption = {
  id: number;
  name: string;
};

export type VehicleMakesLookupResult = {
  makes: VehicleMakeOption[];
};

export type VehicleLookupResult =
  | VehicleVinLookupResult
  | VehicleModelsLookupResult
  | VehicleMakesLookupResult;

function parseModelYear(value: string | undefined): number | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const year = Number.parseInt(value, 10);
  return Number.isFinite(year) ? year : undefined;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function uniqueSortedModels(results: Array<{ Model_Name?: string }>): string[] {
  const names = new Set<string>();

  for (const result of results) {
    const name = result.Model_Name?.trim();
    if (name) {
      names.add(name);
    }
  }

  if (names.size === 0) {
    throw new NhtsaLookupError(
      "not_found",
      "No models were found for that query.",
    );
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}

async function lookupByVin(vin: string): Promise<VehicleVinLookupResult> {
  const decoded = await decodeVinValues(vin);
  const make = normalizeOptionalText(decoded.Make);
  const year = parseModelYear(decoded.ModelYear);

  if (!make && year === undefined) {
    throw new NhtsaLookupError(
      "not_found",
      "No vehicle was found for that VIN.",
    );
  }

  return {
    vin: normalizeOptionalText(decoded.VIN) ?? vin,
    year,
    make,
    model: normalizeOptionalText(decoded.Model),
  };
}

async function lookupModelsForMakeYear(
  make: string,
  year: number,
): Promise<VehicleModelsLookupResult> {
  const results = await getModelsForMakeYear(make, year);
  return { models: uniqueSortedModels(results) };
}

async function lookupModelsForMake(
  make: string,
): Promise<VehicleModelsLookupResult> {
  const results = await getModelsForMake(make);
  return { models: uniqueSortedModels(results) };
}

async function lookupAllMakes(): Promise<VehicleMakesLookupResult> {
  const results = await getAllMakes();
  const makes = results
    .map((result) => {
      const id = result.Make_ID;
      const name = result.Make_Name?.trim();
      if (id === undefined || !name) {
        return null;
      }
      return { id, name };
    })
    .filter((make): make is VehicleMakeOption => make !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (makes.length === 0) {
    throw new NhtsaLookupError("not_found", "No vehicle makes are available.");
  }

  return { makes };
}

export async function lookupVehicle(
  query: VehicleLookupQuery,
): Promise<VehicleLookupResult> {
  if ("vin" in query) {
    return lookupByVin(query.vin);
  }

  if ("resource" in query) {
    return lookupAllMakes();
  }

  if ("year" in query) {
    return lookupModelsForMakeYear(query.make, query.year);
  }

  return lookupModelsForMake(query.make);
}
