import type { AirtableListResponse, AirtableRecord } from "@/types/airtable/common";
import type { AirtableTable } from "@/types/airtable/tables";
import { MECHANIC_ASSIGNMENT_COOLDOWN_MINUTES } from "@/lib/matching/constants";
import type {
  AirtableClient,
  CreateRecordOptions,
  ListRecordsOptions,
  UpdateRecordOptions,
} from "./client";

type StoredRecord = AirtableRecord<Record<string, unknown>>;

function splitTopLevelArgs(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (const char of input) {
    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      current += char;
      continue;
    }
    if (char === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null || value === "") {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  return false;
}

function fieldValue(fields: Record<string, unknown>, name: string): unknown {
  return fields[name];
}

function findInJoin(needle: string, fieldValue: unknown): boolean {
  if (Array.isArray(fieldValue)) {
    return fieldValue.map(String).join(",").includes(needle);
  }
  if (typeof fieldValue === "string") {
    return fieldValue.includes(needle);
  }
  return false;
}

function evaluateFormula(
  fields: Record<string, unknown>,
  formula: string,
): boolean {
  const trimmed = formula.trim();

  if (trimmed.startsWith("AND(") && trimmed.endsWith(")")) {
    return splitTopLevelArgs(trimmed.slice(4, -1)).every((part) =>
      evaluateFormula(fields, part),
    );
  }

  if (trimmed.startsWith("OR(") && trimmed.endsWith(")")) {
    return splitTopLevelArgs(trimmed.slice(3, -1)).some((part) =>
      evaluateFormula(fields, part),
    );
  }

  if (trimmed.startsWith("NOT(") && trimmed.endsWith(")")) {
    return !evaluateFormula(fields, trimmed.slice(4, -1));
  }

  const equality = trimmed.match(/^\{([^}]+)\}\s*=\s*'([^']*)'$/);
  if (equality) {
    const [, field, value] = equality;
    return String(fieldValue(fields, field!) ?? "") === value;
  }

  const boolField = trimmed.match(/^\{([^}]+)\}\s*=\s*TRUE\(\)$/);
  if (boolField) {
    return Boolean(fieldValue(fields, boolField[1]!));
  }

  const blankCheck = trimmed.match(/^\{([^}]+)\}\s*=\s*BLANK\(\)$/);
  if (blankCheck) {
    return isBlank(fieldValue(fields, blankCheck[1]!));
  }

  const findMatch = trimmed.match(
    /^FIND\('([^']*)', ARRAYJOIN\(\{([^}]+)\}, ','\)\)$/,
  );
  if (findMatch) {
    const [, needle, field] = findMatch;
    return findInJoin(needle!, fieldValue(fields, field!));
  }

  const isBeforeMatch = trimmed.match(
    /^IS_BEFORE\(\{([^}]+)\}, DATEADD\(NOW\(\), -(\d+), 'minutes'\)\)$/,
  );
  if (isBeforeMatch) {
    const [, field, minutes] = isBeforeMatch;
    const value = fieldValue(fields, field!);
    if (isBlank(value)) {
      return false;
    }
    const cutoff = Date.now() - Number(minutes) * 60_000;
    return new Date(String(value)).getTime() < cutoff;
  }

  return false;
}

function sortRecords<TFields>(
  records: AirtableRecord<TFields>[],
  sort?: ListRecordsOptions["sort"],
): AirtableRecord<TFields>[] {
  if (!sort?.length) {
    return records;
  }

  const [{ field, direction = "asc" }] = sort;
  const factor = direction === "desc" ? -1 : 1;

  return [...records].sort((left, right) => {
    const leftValue = (left.fields as Record<string, unknown>)[field];
    const rightValue = (right.fields as Record<string, unknown>)[field];
    if (leftValue === rightValue) {
      return 0;
    }
    if (isBlank(leftValue)) {
      return -1 * factor;
    }
    if (isBlank(rightValue)) {
      return 1 * factor;
    }
    return String(leftValue).localeCompare(String(rightValue)) * factor;
  });
}

let recordCounter = 0;

function nextId(table: AirtableTable): string {
  recordCounter += 1;
  return `recMock${table}${recordCounter}`;
}

/**
 * In-memory Airtable client for local matching manual tests when the base is
 * not configured or unreachable.
 */
export function createInMemoryAirtableClient(): AirtableClient & {
  reset: () => void;
  dump: () => Record<AirtableTable, StoredRecord[]>;
} {
  const store: Record<AirtableTable, StoredRecord[]> = {
    drivers: [],
    mechanics: [],
    jobs: [],
    diagnoses: [],
    payments: [],
    "action-items": [],
  };

  const client: AirtableClient & {
    reset: () => void;
    dump: () => Record<AirtableTable, StoredRecord[]>;
  } = {
    reset() {
      for (const table of Object.keys(store) as AirtableTable[]) {
        store[table] = [];
      }
      recordCounter = 0;
    },

    dump() {
      return store;
    },

    async listRecords<TFields>(
      table: AirtableTable,
      options?: ListRecordsOptions,
    ): Promise<AirtableListResponse<TFields>> {
      let records = store[table] as AirtableRecord<TFields>[];

      if (options?.filterByFormula) {
        records = records.filter((record) =>
          evaluateFormula(
            record.fields as Record<string, unknown>,
            options.filterByFormula!,
          ),
        );
      }

      records = sortRecords(records, options?.sort);

      if (options?.maxRecords !== undefined) {
        records = records.slice(0, options.maxRecords);
      }

      return { records };
    },

    async getRecord<TFields>(
      table: AirtableTable,
      recordId: string,
    ): Promise<AirtableRecord<TFields>> {
      const record = store[table].find((row) => row.id === recordId);
      if (!record) {
        throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
      }
      return record as AirtableRecord<TFields>;
    },

    async createRecord<TFields>(
      table: AirtableTable,
      fields: Partial<TFields>,
      _options?: CreateRecordOptions,
    ): Promise<AirtableRecord<TFields>> {
      const record: StoredRecord = {
        id: nextId(table),
        fields: { ...fields } as Record<string, unknown>,
        createdTime: new Date().toISOString(),
      };
      store[table].push(record);
      return record as AirtableRecord<TFields>;
    },

    async updateRecord<TFields>(
      table: AirtableTable,
      recordId: string,
      fields: Partial<TFields>,
      _options?: UpdateRecordOptions,
    ): Promise<AirtableRecord<TFields>> {
      const index = store[table].findIndex((row) => row.id === recordId);
      if (index === -1) {
        throw Object.assign(new Error("NOT_FOUND"), { status: 404 });
      }

      const updated: StoredRecord = {
        ...store[table][index]!,
        fields: {
          ...store[table][index]!.fields,
        },
      };
      for (const [key, value] of Object.entries(fields)) {
        if (value === null || value === undefined) {
          delete updated.fields[key];
        } else {
          updated.fields[key] = value;
        }
      }
      store[table][index] = updated;
      return updated as AirtableRecord<TFields>;
    },
  };

  return client;
}

/** Re-export cooldown constant for formula tests that reference 15 minutes. */
export const MOCK_COOLDOWN_MINUTES = MECHANIC_ASSIGNMENT_COOLDOWN_MINUTES;
