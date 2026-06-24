import { NhtsaLookupError } from "./errors";

export const NHTSA_VPIC_BASE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles";
const FETCH_TIMEOUT_MS = 10_000;

type NhtsaResponse<T> = {
  Count?: number;
  Message?: string;
  Results?: T[];
};

type VinDecodeResult = {
  VIN?: string;
  ModelYear?: string;
  Make?: string;
  Model?: string;
  ErrorCode?: string;
  ErrorText?: string;
};

type MakeModelResult = {
  Make_ID?: number;
  Make_Name?: string;
  Model_ID?: number;
  Model_Name?: string;
};

type MakeResult = {
  Make_ID?: number;
  Make_Name?: string;
};

async function nhtsaFetch<T>(path: string): Promise<NhtsaResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${NHTSA_VPIC_BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new NhtsaLookupError(
        "upstream_error",
        "Vehicle lookup service returned an error.",
      );
    }

    return (await response.json()) as NhtsaResponse<T>;
  } catch (error) {
    if (error instanceof NhtsaLookupError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new NhtsaLookupError(
        "upstream_error",
        "Vehicle lookup request timed out.",
      );
    }
    throw new NhtsaLookupError(
      "upstream_error",
      "Unable to reach the vehicle lookup service.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function requireResults<T>(
  body: NhtsaResponse<T>,
  emptyMessage: string,
): T[] {
  const results = body.Results;
  if (!Array.isArray(results) || results.length === 0) {
    throw new NhtsaLookupError("not_found", emptyMessage);
  }
  return results;
}

export async function decodeVinValues(vin: string): Promise<VinDecodeResult> {
  const body = await nhtsaFetch<VinDecodeResult>(
    `/DecodeVinValues/${encodeURIComponent(vin)}?format=json`,
  );
  const [result] = requireResults(
    body,
    "No vehicle was found for that VIN.",
  );
  return result;
}

export async function getModelsForMakeYear(
  make: string,
  year: number,
): Promise<MakeModelResult[]> {
  const body = await nhtsaFetch<MakeModelResult>(
    `/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`,
  );
  return requireResults(
    body,
    "No models were found for that make and year.",
  );
}

export async function getModelsForMake(make: string): Promise<MakeModelResult[]> {
  const body = await nhtsaFetch<MakeModelResult>(
    `/GetModelsForMake/${encodeURIComponent(make)}?format=json`,
  );
  return requireResults(body, "No models were found for that make.");
}

export async function getAllMakes(): Promise<MakeResult[]> {
  const body = await nhtsaFetch<MakeResult>("/GetAllMakes?format=json");
  return requireResults(body, "No vehicle makes are available.");
}
