/**
 * Logical table identifiers. REST calls resolve these to Airtable table IDs via env.
 */

export const AIRTABLE_TABLES = {
  DRIVERS: "drivers",
  MECHANICS: "mechanics",
  JOBS: "jobs",
  DIAGNOSES: "diagnoses",
  PAYMENTS: "payments",
  ACTION_ITEMS: "action-items",
} as const;

export type AirtableTable =
  (typeof AIRTABLE_TABLES)[keyof typeof AIRTABLE_TABLES];

/** Env var names that hold each table's Airtable table ID (`tbl…`). */
export const AIRTABLE_TABLE_ENV_KEYS = {
  [AIRTABLE_TABLES.DRIVERS]: "AIRTABLE_TABLE_DRIVERS",
  [AIRTABLE_TABLES.MECHANICS]: "AIRTABLE_TABLE_MECHANICS",
  [AIRTABLE_TABLES.JOBS]: "AIRTABLE_TABLE_JOBS",
  [AIRTABLE_TABLES.DIAGNOSES]: "AIRTABLE_TABLE_DIAGNOSES",
  [AIRTABLE_TABLES.PAYMENTS]: "AIRTABLE_TABLE_PAYMENTS",
  [AIRTABLE_TABLES.ACTION_ITEMS]: "AIRTABLE_TABLE_ACTION_ITEMS",
} as const satisfies Record<AirtableTable, string>;

export type AirtableTableEnvKey =
  (typeof AIRTABLE_TABLE_ENV_KEYS)[AirtableTable];

/** Resolved table ID per logical table (values from `getEnv()`). */
export type AirtableTableIdMap = Record<AirtableTable, string>;
