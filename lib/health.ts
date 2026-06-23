import { AirtableError, getAirtableClient } from "@/lib/airtable";
import { AIRTABLE_TABLES } from "@/types/airtable/tables";

export type HealthChecks = {
  airtable: "ok" | "error";
  airtableError?: string;
};

export type HealthStatus = {
  status: "ok";
  timestamp: string;
  checks: HealthChecks;
};

/** Lightweight connectivity probe — lists one record from the drivers table. */
export async function getHealthStatus(): Promise<HealthStatus> {
  const checks: HealthChecks = { airtable: "ok" };

  try {
    await getAirtableClient().listRecords(AIRTABLE_TABLES.DRIVERS, {
      maxRecords: 1,
    });
  } catch (error) {
    checks.airtable = "error";
    if (error instanceof AirtableError) {
      checks.airtableError = `${error.type}: ${error.message}`;
    } else if (error instanceof Error) {
      checks.airtableError = error.message;
    } else {
      checks.airtableError = "Unknown error";
    }
  }

  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    checks,
  };
}
