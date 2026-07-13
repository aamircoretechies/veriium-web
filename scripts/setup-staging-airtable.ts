/**
 * Provisions staging Airtable base from docs/schema.json and seeds matching fixtures.
 *
 * Prerequisites:
 * - Staging base must not already contain schema tables (Drivers, Mechanics, etc.)
 * - Airtable's default table is fine; it is removed after the six schema tables exist
 * - .env.local must have AIRTABLE_API_KEY and AIRTABLE_BASE_ID for staging
 * - PAT scopes: schema.bases:read, schema.bases:write, data.records:read, data.records:write
 * - Token user must be base creator
 *
 * Usage:
 *   npm run airtable:setup-staging
 *   npm run airtable:setup-staging -- --dry-run
 *   npm run airtable:setup-staging -- --resume   # finish cleanup/seed if schema tables already exist
 *   npm run airtable:setup-staging -- --resume --sync-field-names
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createAirtableMetadataClient,
  type CreateFieldPayload,
  type MetadataField,
  type MetadataTable,
} from "@/lib/airtable/metadata-client";
import { MECHANIC_SEARCH_FIXTURE_FIELDS } from "@/lib/mechanics/search-fixtures";
import {
  driverSeedFields,
  JOB_STATUS,
  TEST_CATEGORY,
  TEST_ZIP,
} from "./schema-test-helpers";

const SCHEMA_PATH = resolve(process.cwd(), "docs/schema.json");
const RUN_ID = Date.now().toString(36);

const TABLE_ENV_KEYS: Record<string, string> = {
  Drivers: "AIRTABLE_TABLE_DRIVERS",
  Mechanics: "AIRTABLE_TABLE_MECHANICS",
  Jobs: "AIRTABLE_TABLE_JOBS",
  Diagnoses: "AIRTABLE_TABLE_DIAGNOSES",
  Payments: "AIRTABLE_TABLE_PAYMENTS",
  "Action Items": "AIRTABLE_TABLE_ACTION_ITEMS",
};

const SATELLITE_TABLES = new Set(["Payments", "Diagnoses", "Action Items"]);
const PREFER_LINK_TABLES = new Set(["Diagnoses", "Action Items"]);
const SCHEMA_TABLE_NAMES = new Set(Object.keys(TABLE_ENV_KEYS));

type SchemaField = {
  id: string;
  name: string;
  type: string;
  options?: {
    choices?: Array<{ id?: string; name: string; color?: string }>;
    linkedTableId?: string;
    inverseLinkFieldId?: string;
    prefersSingleRecordLink?: boolean;
    recordLinkFieldId?: string;
    dateFormat?: { name?: string; format?: string };
    timeFormat?: { name?: string; format?: string };
    timeZone?: string;
    precision?: number;
    symbol?: string;
    icon?: string;
    color?: string;
    isReversed?: boolean;
    isValid?: boolean;
  };
};

type SchemaTable = {
  id: string;
  name: string;
  description?: string;
  primaryFieldId: string;
  fields: SchemaField[];
};

type Schema = {
  tables: SchemaTable[];
};

type FieldRef = {
  table: SchemaTable;
  field: SchemaField;
};

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq === -1) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    console.warn("[setup-staging-airtable] No .env.local found; using process.env only.");
  }
}

function loadSchema(): Schema {
  return JSON.parse(readFileSync(SCHEMA_PATH, "utf8")) as Schema;
}

function applySeedEnvDefaults(): void {
  const defaults: Record<string, string> = {
    QSTASH_TOKEN: "staging-setup-placeholder",
    QSTASH_CURRENT_SIGNING_KEY: "staging-setup-placeholder",
    QSTASH_NEXT_SIGNING_KEY: "staging-setup-placeholder",
    APP_URL: "http://localhost:3000",
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function buildFieldIndex(schema: Schema): Map<string, FieldRef> {
  const index = new Map<string, FieldRef>();
  for (const table of schema.tables) {
    for (const field of table.fields) {
      index.set(field.id, { table, field });
    }
  }
  return index;
}

function isScalarField(field: SchemaField): boolean {
  return field.type !== "multipleRecordLinks" && field.type !== "count";
}

function toCreateFieldPayload(field: SchemaField): CreateFieldPayload {
  const payload: CreateFieldPayload = {
    name: field.name,
    type: field.type,
  };

  if (!field.options) {
    return payload;
  }

  switch (field.type) {
    case "singleSelect":
    case "multipleSelects":
      payload.options = {
        choices: (field.options.choices ?? [])
          .filter((choice) => choice.name.trim().length > 0)
          .map((choice) => ({
            name: choice.name,
            ...(choice.color ? { color: choice.color } : {}),
          })),
      };
      break;
    case "dateTime":
      payload.options = {
        timeZone: field.options.timeZone,
        dateFormat: { name: field.options.dateFormat?.name },
        timeFormat: { name: field.options.timeFormat?.name },
      };
      break;
    case "checkbox":
      payload.options = {
        icon: field.options.icon,
        color: field.options.color,
      };
      break;
    case "number":
      payload.options = {
        precision: field.options.precision,
      };
      break;
    case "currency":
      payload.options = {
        precision: field.options.precision,
        symbol: field.options.symbol,
      };
      break;
    default:
      break;
  }

  return payload;
}

function shouldCreateLinkField(
  field: SchemaField,
  partner: SchemaField,
  tableName: string,
  partnerTableName: string,
): boolean {
  const single = field.options?.prefersSingleRecordLink === true;
  const partnerSingle = partner.options?.prefersSingleRecordLink === true;

  if (single && !partnerSingle) {
    return true;
  }
  if (!single && partnerSingle) {
    return false;
  }

  if (single && partnerSingle) {
    if (SATELLITE_TABLES.has(tableName) && !SATELLITE_TABLES.has(partnerTableName)) {
      return true;
    }
    if (SATELLITE_TABLES.has(partnerTableName) && !SATELLITE_TABLES.has(tableName)) {
      return false;
    }
    return tableName < partnerTableName;
  }

  if (PREFER_LINK_TABLES.has(tableName) && !PREFER_LINK_TABLES.has(partnerTableName)) {
    return true;
  }
  if (PREFER_LINK_TABLES.has(partnerTableName) && !PREFER_LINK_TABLES.has(tableName)) {
    return false;
  }
  if (tableName === "Jobs") {
    return true;
  }
  if (partnerTableName === "Jobs") {
    return false;
  }

  return field.id < partner.id;
}

function findFieldByName(table: MetadataTable, name: string): MetadataField | undefined {
  return table.fields.find((field) => field.name === name);
}

function buildProdToStagingTableMap(
  schema: Schema,
  stagingTables: MetadataTable[],
): Map<string, string> {
  const stagingByName = new Map(stagingTables.map((table) => [table.name, table.id]));
  const map = new Map<string, string>();
  for (const table of schema.tables) {
    const stagingId = stagingByName.get(table.name);
    if (stagingId) {
      map.set(table.id, stagingId);
    }
  }
  return map;
}

async function syncLinkFieldNames(
  meta: ReturnType<typeof createAirtableMetadataClient>,
  baseId: string,
  schema: Schema,
  prodTableToStaging: Map<string, string>,
  dryRun: boolean,
): Promise<number> {
  const stagingSchema = await meta.getBaseSchema(baseId);
  const stagingByName = new Map(
    stagingSchema.tables.map((table) => [table.name, table]),
  );
  let renamed = 0;

  for (const table of schema.tables) {
    const stagingTable = stagingByName.get(table.name);
    if (!stagingTable) {
      continue;
    }

    const stagingFieldByName = new Map(
      stagingTable.fields.map((field) => [field.name, field]),
    );

    for (const field of table.fields) {
      if (field.type !== "multipleRecordLinks" || stagingFieldByName.has(field.name)) {
        continue;
      }

      const linkedProdTableId = field.options?.linkedTableId;
      const linkedStagingTableId = linkedProdTableId
        ? prodTableToStaging.get(linkedProdTableId)
        : undefined;
      if (!linkedStagingTableId) {
        continue;
      }

      const wrongField = stagingTable.fields.find(
        (candidate) =>
          candidate.type === "multipleRecordLinks" &&
          candidate.options?.linkedTableId === linkedStagingTableId &&
          candidate.name !== field.name,
      );
      if (!wrongField) {
        continue;
      }

      if (dryRun) {
        console.log(`  ~ ${table.name}.${wrongField.name} → ${field.name}`);
      } else {
        await meta.updateField(baseId, stagingTable.id, wrongField.id, {
          name: field.name,
        });
        console.log(`  ~ ${table.name}.${wrongField.name} → ${field.name}`);
      }
      renamed += 1;
    }
  }

  return renamed;
}

function partitionExistingTables(tables: MetadataTable[]): {
  schemaTables: MetadataTable[];
  extraTables: MetadataTable[];
} {
  const schemaTables: MetadataTable[] = [];
  const extraTables: MetadataTable[] = [];
  for (const table of tables) {
    if (SCHEMA_TABLE_NAMES.has(table.name)) {
      schemaTables.push(table);
    } else {
      extraTables.push(table);
    }
  }
  return { schemaTables, extraTables };
}

function assertBaseReadyForSetup(
  tables: MetadataTable[],
  resume: boolean,
): { extraTables: MetadataTable[]; existingSchemaByName: Map<string, MetadataTable> } {
  const { schemaTables, extraTables } = partitionExistingTables(tables);
  const existingSchemaByName = new Map(
    schemaTables.map((table) => [table.name, table]),
  );

  if (schemaTables.length === SCHEMA_TABLE_NAMES.size) {
    if (resume) {
      return { extraTables, existingSchemaByName };
    }
    throw new Error(
      "Staging base already has all six schema tables. " +
        "Re-run with --resume to remove extra tables and seed, or delete schema tables and start fresh.",
    );
  }

  if (schemaTables.length > 0) {
    const found = schemaTables.map((table) => table.name).join(", ");
    throw new Error(
      `Staging base is partially provisioned (${found}). ` +
        "Delete the schema tables manually, then re-run.",
    );
  }

  return { extraTables, existingSchemaByName };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const resume = process.argv.includes("--resume");
  const syncFieldNamesOnly = process.argv.includes("--sync-field-names");
  loadEnvFile();

  const schema = loadSchema();
  const fieldIndex = buildFieldIndex(schema);

  if (dryRun) {
    for (const table of schema.tables) {
      const scalarCount = table.fields.filter(isScalarField).length - 1;
      const linkFields = table.fields.filter((f) => f.type === "multipleRecordLinks");
      let canonicalLinks = 0;
      for (const field of linkFields) {
        const inverseFieldId = field.options?.inverseLinkFieldId;
        if (!inverseFieldId) {
          continue;
        }
        const partnerRef = fieldIndex.get(inverseFieldId);
        if (
          partnerRef &&
          shouldCreateLinkField(
            field,
            partnerRef.field,
            table.name,
            partnerRef.table.name,
          )
        ) {
          canonicalLinks += 1;
        }
      }
      const countCount = table.fields.filter((f) => f.type === "count").length;
      console.log(
        `Would create table "${table.name}" + ${scalarCount} scalar fields, ` +
          `${canonicalLinks} link field(s), ${countCount} count field(s)`,
      );
    }
    console.log(
      "\nWould warn about any non-schema tables left in the base (delete manually in Airtable UI).",
    );
    console.log("Would seed 10 mechanics, 2 drivers, and 2 jobs after schema setup.");
    return;
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) {
    throw new Error(
      "Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID in .env.local / process.env.",
    );
  }

  const meta = createAirtableMetadataClient(apiKey);

  const existing = await meta.getBaseSchema(baseId);

  if (syncFieldNamesOnly) {
    const prodTableToStaging = buildProdToStagingTableMap(schema, existing.tables);
    console.log(`[setup-staging-airtable] Syncing link field names (base=${baseId})...\n`);
    const renamed = await syncLinkFieldNames(
      meta,
      baseId,
      schema,
      prodTableToStaging,
      dryRun,
    );
    console.log(`\nDone. Fields renamed: ${renamed}`);
    return;
  }

  const { extraTables: extraTablesAtStart, existingSchemaByName } =
    assertBaseReadyForSetup(existing.tables, resume);
  if (extraTablesAtStart.length > 0) {
    const names = extraTablesAtStart.map((table) => `"${table.name}"`).join(", ");
    console.log(
      `Found ${extraTablesAtStart.length} non-schema table(s) in base: ${names}\n`,
    );
  }

  const prodTableToStaging = new Map<string, string>();
  const prodFieldToStaging = new Map<string, string>();
  let fieldsCreated = 0;
  let tablesCreated = 0;

  console.log(`[setup-staging-airtable] base=${baseId}${resume ? " (resume)" : ""}\n`);

  if (resume) {
    for (const table of schema.tables) {
      const stagingTable = existingSchemaByName.get(table.name);
      if (!stagingTable) {
        throw new Error(`Resume requires existing table "${table.name}"`);
      }
      prodTableToStaging.set(table.id, stagingTable.id);
    }
    console.log("Resume: skipping schema creation (six tables already present).\n");

    console.log("Phase 1b: Syncing link field names...");
    const renamed = await syncLinkFieldNames(
      meta,
      baseId,
      schema,
      prodTableToStaging,
      dryRun,
    );
    if (renamed === 0) {
      console.log("  (all link field names match schema.json)");
    }
    console.log();
  } else {
    console.log("Phase 1: Creating tables and scalar fields...");
    for (const table of schema.tables) {
      const primaryField = table.fields.find((field) => field.id === table.primaryFieldId);
      if (!primaryField) {
        throw new Error(`Primary field not found for table ${table.name}`);
      }

      const createdTable = await meta.createTable(baseId, {
        name: table.name,
        ...(table.description ? { description: table.description } : {}),
        fields: [toCreateFieldPayload(primaryField)],
      });

      prodTableToStaging.set(table.id, createdTable.id);
      prodFieldToStaging.set(primaryField.id, createdTable.primaryFieldId);
      tablesCreated += 1;
      console.log(`  + ${table.name} (${createdTable.id})`);

      for (const field of table.fields) {
        if (field.id === primaryField.id || !isScalarField(field)) {
          continue;
        }

        const createdField = await meta.createField(
          baseId,
          createdTable.id,
          toCreateFieldPayload(field),
        );
        prodFieldToStaging.set(field.id, createdField.id);
        fieldsCreated += 1;
      }
    }

    console.log("\nPhase 2: Creating link fields...");
    const createdLinkPairs = new Set<string>();

    for (const table of schema.tables) {
      const stagingTableId = prodTableToStaging.get(table.id);
      if (!stagingTableId) {
        throw new Error(`Missing staging table id for ${table.name}`);
      }

      for (const field of table.fields) {
        if (field.type !== "multipleRecordLinks") {
          continue;
        }

        const inverseFieldId = field.options?.inverseLinkFieldId;
        const linkedProdTableId = field.options?.linkedTableId;
        if (!inverseFieldId || !linkedProdTableId) {
          throw new Error(`Link field ${table.name}.${field.name} missing link options`);
        }

        const pairKey = [field.id, inverseFieldId].sort().join(":");
        if (createdLinkPairs.has(pairKey)) {
          continue;
        }

        const partnerRef = fieldIndex.get(inverseFieldId);
        if (!partnerRef) {
          throw new Error(`Inverse field ${inverseFieldId} not found in schema`);
        }

        if (
          !shouldCreateLinkField(
            field,
            partnerRef.field,
            table.name,
            partnerRef.table.name,
          )
        ) {
          continue;
        }

        const stagingLinkedTableId = prodTableToStaging.get(linkedProdTableId);
        if (!stagingLinkedTableId) {
          throw new Error(
            `Missing staging table for linked prod table ${linkedProdTableId}`,
          );
        }

        const createdField = await meta.createField(baseId, stagingTableId, {
          name: field.name,
          type: "multipleRecordLinks",
          options: { linkedTableId: stagingLinkedTableId },
        });

        prodFieldToStaging.set(field.id, createdField.id);
        fieldsCreated += 1;
        createdLinkPairs.add(pairKey);

        const inverseStagingId = createdField.options?.inverseLinkFieldId as
          | string
          | undefined;
        if (inverseStagingId) {
          prodFieldToStaging.set(inverseFieldId, inverseStagingId);
        } else {
          const linkedTable = await meta.getTable(baseId, stagingLinkedTableId);
          const inverseByName = findFieldByName(linkedTable, partnerRef.field.name);
          if (inverseByName) {
            prodFieldToStaging.set(inverseFieldId, inverseByName.id);
          }
        }

        console.log(`  + ${table.name}.${field.name}`);
      }
    }

    console.log("\nPhase 2b: Syncing link field names...");
    const renamed = await syncLinkFieldNames(
      meta,
      baseId,
      schema,
      prodTableToStaging,
      dryRun,
    );
    if (renamed === 0) {
      console.log("  (all link field names match schema.json)");
    }

    console.log("\nPhase 3: Creating count fields...");
    for (const table of schema.tables) {
      const stagingTableId = prodTableToStaging.get(table.id);
      if (!stagingTableId) {
        continue;
      }

      for (const field of table.fields) {
        if (field.type !== "count") {
          continue;
        }

        const prodLinkFieldId = field.options?.recordLinkFieldId;
        if (!prodLinkFieldId) {
          throw new Error(
            `Count field ${table.name}.${field.name} missing recordLinkFieldId`,
          );
        }

        const stagingLinkFieldId = prodFieldToStaging.get(prodLinkFieldId);
        if (!stagingLinkFieldId) {
          console.warn(
            `  ! Skipping ${table.name}.${field.name}: linked field not mapped`,
          );
          continue;
        }

        try {
          const createdField = await meta.createField(baseId, stagingTableId, {
            name: field.name,
            type: "count",
            options: { recordLinkFieldId: stagingLinkFieldId },
          });
          prodFieldToStaging.set(field.id, createdField.id);
          fieldsCreated += 1;
          console.log(`  + ${table.name}.${field.name}`);
        } catch (error) {
          console.warn(
            `  ! Skipping ${table.name}.${field.name}: count fields cannot be created via API. ` +
              `Add manually in Airtable UI on Jobs → count linked records from "Action Items".`,
          );
          if (
            error instanceof Error &&
            !error.message.includes("UNSUPPORTED_FIELD_TYPE_FOR_CREATE")
          ) {
            throw error;
          }
        }
      }
    }
  }

  console.log("\nPhase 4: Checking for leftover non-schema tables...");
  const afterSchema = await meta.getBaseSchema(baseId);
  const { extraTables } = partitionExistingTables(afterSchema.tables);
  if (extraTables.length === 0) {
    console.log("  (none)");
  } else {
    for (const table of extraTables) {
      console.log(
        `  ! "${table.name}" (${table.id}) — delete manually in Airtable UI if unwanted`,
      );
    }
    console.log(
      "\n  Note: Airtable requires at least one table per base and does not expose a delete-table API.",
    );
    console.log(
      "  After this script creates the six schema tables, you can remove extras in the UI.",
    );
  }

  console.log("\nPhase 5: Seeding records...");
  for (const table of schema.tables) {
    const envKey = TABLE_ENV_KEYS[table.name];
    const stagingTableId = prodTableToStaging.get(table.id);
    if (envKey && stagingTableId) {
      process.env[envKey] = stagingTableId;
    }
  }
  applySeedEnvDefaults();

  const { getAirtableClient } = await import("@/lib/airtable");
  const client = getAirtableClient();

  const existingMechanics = await client.listRecords("mechanics", { maxRecords: 1 });
  if (existingMechanics.records.length > 0) {
    console.log("  Mechanics already seeded; skipping record creation.");
  } else {
    let mechanicsSeeded = 0;
    for (const fields of MECHANIC_SEARCH_FIXTURE_FIELDS) {
      await client.createRecord("mechanics", fields);
      mechanicsSeeded += 1;
    }

    const driverIds: string[] = [];
    for (const suffix of ["01", "02"]) {
      const record = await client.createRecord("drivers", {
        ...driverSeedFields(RUN_ID, suffix, {
          name: `Staging Driver ${RUN_ID}-${suffix}`,
        }),
      });
      driverIds.push(record.id);
    }

    let jobsSeeded = 0;
    for (const driverId of driverIds) {
      await client.createRecord("jobs", {
        status: JOB_STATUS.matched_awaiting_response,
        match_tier: 1,
        match_tier_started_at: new Date().toISOString(),
        zip_code: TEST_ZIP,
        diagnosis_category: TEST_CATEGORY,
        service_type: "mobile_repair",
        vehicle_year: 2020,
        vehicle_make: "Toyota",
        vehicle_model: "Camry",
        driver_id: [driverId],
      });
      jobsSeeded += 1;
    }

    console.log(`  Mechanics seeded: ${mechanicsSeeded}`);
    console.log(`  Drivers seeded: ${driverIds.length}`);
    console.log(`  Jobs seeded: ${jobsSeeded}`);
  }

  console.log("\nDone.");
  console.log(`  Tables created: ${tablesCreated}`);
  console.log(`  Leftover non-schema tables: ${extraTables.length}`);
  console.log(`  Fields created: ${fieldsCreated}`);

  console.log("\n# Staging Airtable table IDs (copy into .env.local)");
  for (const table of schema.tables) {
    const envKey = TABLE_ENV_KEYS[table.name];
    const stagingId = prodTableToStaging.get(table.id);
    if (envKey && stagingId) {
      console.log(`${envKey}=${stagingId}`);
    }
  }
}

main().catch((error) => {
  console.error(
    "[setup-staging-airtable] Failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
