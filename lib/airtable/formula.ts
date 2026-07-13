import { FIELDS } from "@/types/airtable/generated/fields";

export { FIELDS };

export function escapeAirtableString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function fieldRef(fieldName: string): string {
  return `{${fieldName}}`;
}

export function eq(fieldName: string, value: string | number | boolean): string {
  if (typeof value === "boolean") {
    return `${fieldRef(fieldName)}=${value ? "TRUE()" : "FALSE()"}`;
  }
  if (typeof value === "number") {
    return `${fieldRef(fieldName)}=${value}`;
  }
  return `${fieldRef(fieldName)}='${escapeAirtableString(value)}'`;
}

export function notBlank(fieldName: string): string {
  return `NOT(${fieldRef(fieldName)}=BLANK())`;
}

export function isBlank(fieldName: string): string {
  return `${fieldRef(fieldName)}=BLANK()`;
}

export function linkedRecord(fieldName: string, recordId: string): string {
  return `FIND('${escapeAirtableString(recordId)}', ARRAYJOIN(${fieldRef(fieldName)}, ','))`;
}

export function and(...clauses: string[]): string {
  const filtered = clauses.filter(Boolean);
  if (filtered.length === 0) return "";
  if (filtered.length === 1) return filtered[0]!;
  return `AND(${filtered.join(", ")})`;
}

export function or(...clauses: string[]): string {
  const filtered = clauses.filter(Boolean);
  if (filtered.length === 0) return "";
  if (filtered.length === 1) return filtered[0]!;
  return `OR(${filtered.join(", ")})`;
}

export function findInJoin(fieldName: string, needle: string): string {
  return `FIND('${escapeAirtableString(needle)}', ARRAYJOIN(${fieldRef(fieldName)}, ','))`;
}
