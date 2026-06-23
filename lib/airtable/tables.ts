import { getEnv } from "@/config/env";
import {
  AIRTABLE_TABLES,
  AIRTABLE_TABLE_ENV_KEYS,
  type AirtableTable,
  type AirtableTableIdMap,
} from "@/types/airtable/tables";

/** Resolve a logical table name to its Airtable table ID from env. */
export function getTableId(table: AirtableTable): string {
  const envKey = AIRTABLE_TABLE_ENV_KEYS[table];
  return getEnv()[envKey];
}

/** All six table IDs keyed by logical table name. */
export function getTableIdMap(): AirtableTableIdMap {
  const env = getEnv();
  return {
    [AIRTABLE_TABLES.DRIVERS]: env.AIRTABLE_TABLE_DRIVERS,
    [AIRTABLE_TABLES.MECHANICS]: env.AIRTABLE_TABLE_MECHANICS,
    [AIRTABLE_TABLES.JOBS]: env.AIRTABLE_TABLE_JOBS,
    [AIRTABLE_TABLES.DIAGNOSES]: env.AIRTABLE_TABLE_DIAGNOSES,
    [AIRTABLE_TABLES.PAYMENTS]: env.AIRTABLE_TABLE_PAYMENTS,
    [AIRTABLE_TABLES.ACTION_ITEMS]: env.AIRTABLE_TABLE_ACTION_ITEMS,
  };
}
