/**
 * Generates types/airtable/generated/* from docs/schema.json.
 * Run: npm run generate:airtable
 */
import * as fs from "node:fs";
import * as path from "node:path";

type SchemaField = {
  id: string;
  name: string;
  type: string;
  options?: {
    choices?: Array<{ id: string; name: string }>;
    linkedTableId?: string;
  };
};

type SchemaTable = {
  id: string;
  name: string;
  fields: SchemaField[];
};

type Schema = {
  tables: SchemaTable[];
};

const ROOT = path.resolve(__dirname, "..");
const SCHEMA_PATH = path.join(ROOT, "docs/schema.json");
const OUT_DIR = path.join(ROOT, "types/airtable/generated");

const TABLE_KEYS: Record<string, string> = {
  Drivers: "Drivers",
  Mechanics: "Mechanics",
  Jobs: "Jobs",
  Diagnoses: "Diagnoses",
  Payments: "Payments",
  "Action Items": "ActionItems",
};

const CANONICAL_SERVICE_CATEGORIES = [
  "battery_starting",
  "brakes",
  "oil_maintenance",
  "engine_diagnostics",
  "transmission",
  "tires_wheels",
  "electrical",
  "ac_heating",
  "suspension_steering",
  "exhaust",
  "fuel_system",
  "general_maintenance",
] as const;

function toTsStringLiteral(value: string): string {
  return JSON.stringify(value);
}

function toPascalCase(tableName: string): string {
  return TABLE_KEYS[tableName] ?? tableName.replace(/\s+/g, "");
}

function fieldNameToTsKey(fieldName: string): string {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName)) {
    return fieldName;
  }
  return JSON.stringify(fieldName);
}

function tsTypeForField(field: SchemaField): string {
  switch (field.type) {
    case "singleLineText":
    case "phoneNumber":
    case "email":
    case "multilineText":
    case "url":
      return "string";
    case "number":
    case "currency":
    case "count":
      return "number";
    case "checkbox":
      return "boolean";
    case "dateTime":
      return "string";
    case "singleSelect": {
      const choices =
        field.options?.choices?.map((c) => c.name).filter(Boolean) ?? [];
      if (choices.length === 0) return "string";
      return choices.map((c) => toTsStringLiteral(c)).join(" | ");
    }
    case "multipleSelects": {
      const choices =
        field.options?.choices?.map((c) => c.name).filter(Boolean) ?? [];
      if (choices.length === 0) return "string[]";
      const union = choices.map((c) => toTsStringLiteral(c)).join(" | ");
      return `(${union})[]`;
    }
    case "multipleRecordLinks":
      return "string[]";
    case "multipleAttachments":
      return "import('@/types/airtable/fields').AirtableAttachment[]";
    default:
      return "unknown";
  }
}

function enumNameForField(tableKey: string, fieldName: string): string {
  const fieldPart = fieldName
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");
  return `${tableKey}${fieldPart}`;
}

function generateTables(schema: Schema): string {
  const lines = [
    "/** AUTO-GENERATED from docs/schema.json — do not edit. */",
    "",
    "export const SCHEMA_TABLE_IDS = {",
  ];
  for (const table of schema.tables) {
    const key = toPascalCase(table.name);
    lines.push(`  ${key}: ${toTsStringLiteral(table.id)},`);
  }
  lines.push("} as const;", "");
  lines.push("export type SchemaTableKey = keyof typeof SCHEMA_TABLE_IDS;");
  return lines.join("\n");
}

function generateFields(schema: Schema): string {
  const lines = [
    "/** AUTO-GENERATED from docs/schema.json — do not edit. */",
    "",
    "export const FIELDS = {",
  ];
  for (const table of schema.tables) {
    const key = toPascalCase(table.name);
    lines.push(`  ${key}: {`);
    for (const field of table.fields) {
      const tsKey = fieldNameToTsKey(field.name);
      lines.push(`    ${tsKey}: ${toTsStringLiteral(field.name)},`);
    }
    lines.push("  },");
  }
  lines.push("} as const;", "");
  lines.push("export type FieldsFor<T extends keyof typeof FIELDS> =");
  lines.push("  (typeof FIELDS)[T][keyof (typeof FIELDS)[T]];");
  return lines.join("\n");
}

function generateRecords(schema: Schema): string {
  const lines = [
    "/** AUTO-GENERATED from docs/schema.json — do not edit. */",
    "",
    'import type { AirtableAttachment } from "@/types/airtable/fields";',
    "",
  ];

  for (const table of schema.tables) {
    const key = toPascalCase(table.name);
    const recordName = `${key}Record`;
    lines.push(`export type ${recordName} = {`);
    for (const field of table.fields) {
      const optional = "optional";
      const tsType = tsTypeForField(field).replace(
        "import('@/types/airtable/fields').AirtableAttachment[]",
        "AirtableAttachment[]",
      );
      lines.push(`  ${fieldNameToTsKey(field.name)}?: ${tsType};`);
    }
    lines.push("};", "");
  }

  return lines.join("\n");
}

function generateEnums(schema: Schema): string {
  const lines = [
    "/** AUTO-GENERATED from docs/schema.json — do not edit. */",
    "",
  ];

  for (const table of schema.tables) {
    const tableKey = toPascalCase(table.name);
    for (const field of table.fields) {
      if (field.type !== "singleSelect" && field.type !== "multipleSelects") {
        continue;
      }
      const choices =
        field.options?.choices?.map((c) => c.name).filter((n) => n !== "") ??
        [];
      if (choices.length === 0) continue;

      const enumName = enumNameForField(tableKey, field.name);
      const constName = enumName
        .replace(/([A-Z])/g, "_$1")
        .toUpperCase()
        .replace(/^_/, "");

      lines.push(
        `export const ${constName} = [${choices.map((c) => toTsStringLiteral(c)).join(", ")}] as const;`,
      );
      lines.push(`export type ${enumName} = (typeof ${constName})[number];`, "");
    }
  }

  lines.push(
    "/** Canonical snake_case service categories — preferred write set. */",
    `export const SERVICE_CATEGORIES_CANONICAL = [${CANONICAL_SERVICE_CATEGORIES.map((c) => toTsStringLiteral(c)).join(", ")}] as const;`,
    "export type ServiceCategoryCanonical =",
    "  (typeof SERVICE_CATEGORIES_CANONICAL)[number];",
    "",
    "/** Legacy Title Case options — read-time normalize only; remove from Airtable later. */",
    `export const SERVICE_CATEGORIES_LEGACY = [`,
    '  "Engine Repair", "Brakes", "Diagnostics", "Transmission",',
    '  "Electrical Systems", "Suspension", "Hybrid Systems",',
    '  "Oil Change", "Air Conditioning",',
    "] as const;",
    "export type ServiceCategoryLegacy =",
    "  (typeof SERVICE_CATEGORIES_LEGACY)[number];",
    "",
  );

  return lines.join("\n");
}

function generateIndex(): string {
  return [
    "/** AUTO-GENERATED from docs/schema.json — do not edit. */",
    "",
    'export * from "./tables";',
    'export * from "./fields";',
    'export * from "./records";',
    'export * from "./enums";',
    "",
  ].join("\n");
}

function main(): void {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, "utf8")) as Schema;
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files: Record<string, string> = {
    "tables.ts": generateTables(schema),
    "fields.ts": generateFields(schema),
    "records.ts": generateRecords(schema),
    "enums.ts": generateEnums(schema),
    "index.ts": generateIndex(),
  };

  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT_DIR, name), content);
  }

  console.log(`Generated ${Object.keys(files).length} files in ${OUT_DIR}`);
}

main();
