import { getEnv } from "@/config/env";
import type {
  AirtableErrorBody,
  AirtableListResponse,
  AirtableRecord,
} from "@/types/airtable/common";
import type { AirtableTable } from "@/types/airtable/tables";
import { getTableId } from "./tables";

const AIRTABLE_API_BASE = "https://api.airtable.com/v0";

export class AirtableError extends Error {
  readonly type: string;
  readonly status: number;

  constructor(type: string, message: string, status: number) {
    super(message);
    this.name = "AirtableError";
    this.type = type;
    this.status = status;
  }
}

export type ListRecordsOptions = {
  maxRecords?: number;
  pageSize?: number;
  offset?: string;
  view?: string;
  filterByFormula?: string;
  sort?: Array<{ field: string; direction?: "asc" | "desc" }>;
  fields?: string[];
  cellFormat?: "json" | "string";
  timeZone?: string;
  userLocale?: string;
};

export type CreateRecordOptions = {
  typecast?: boolean;
};

export type UpdateRecordOptions = {
  typecast?: boolean;
};

export type AirtableClient = {
  listRecords: <TFields>(
    table: AirtableTable,
    options?: ListRecordsOptions,
  ) => Promise<AirtableListResponse<TFields>>;
  getRecord: <TFields>(
    table: AirtableTable,
    recordId: string,
  ) => Promise<AirtableRecord<TFields>>;
  createRecord: <TFields>(
    table: AirtableTable,
    fields: Partial<TFields>,
    options?: CreateRecordOptions,
  ) => Promise<AirtableRecord<TFields>>;
  updateRecord: <TFields>(
    table: AirtableTable,
    recordId: string,
    fields: Partial<TFields>,
    options?: UpdateRecordOptions,
  ) => Promise<AirtableRecord<TFields>>;
};

function buildListQuery(options?: ListRecordsOptions): string {
  if (!options) {
    return "";
  }

  const params = new URLSearchParams();

  if (options.maxRecords !== undefined) {
    params.set("maxRecords", String(options.maxRecords));
  }
  if (options.pageSize !== undefined) {
    params.set("pageSize", String(options.pageSize));
  }
  if (options.offset) {
    params.set("offset", options.offset);
  }
  if (options.view) {
    params.set("view", options.view);
  }
  if (options.filterByFormula) {
    params.set("filterByFormula", options.filterByFormula);
  }
  if (options.cellFormat) {
    params.set("cellFormat", options.cellFormat);
  }
  if (options.timeZone) {
    params.set("timeZone", options.timeZone);
  }
  if (options.userLocale) {
    params.set("userLocale", options.userLocale);
  }
  if (options.fields?.length) {
    for (const field of options.fields) {
      params.append("fields[]", field);
    }
  }
  if (options.sort?.length) {
    options.sort.forEach((item, index) => {
      params.set(`sort[${index}][field]`, item.field);
      if (item.direction) {
        params.set(`sort[${index}][direction]`, item.direction);
      }
    });
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

async function parseAirtableError(response: Response): Promise<AirtableError> {
  let body: AirtableErrorBody | undefined;

  try {
    body = (await response.json()) as AirtableErrorBody;
  } catch {
    // Non-JSON error bodies fall back to status text.
  }

  const type = body?.error?.type ?? "UNKNOWN";
  const message =
    body?.error?.message ?? (response.statusText || "Request failed");

  return new AirtableError(type, message, response.status);
}

function createRequest(
  apiKey: string,
  baseId: string,
): <T>(table: AirtableTable, path: string, init?: RequestInit) => Promise<T> {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  return async <T>(
    table: AirtableTable,
    path: string,
    init?: RequestInit,
  ): Promise<T> => {
    const tableId = getTableId(table);
    const url = `${AIRTABLE_API_BASE}/${baseId}/${tableId}${path}`;

    const response = await fetch(url, {
      ...init,
      headers: {
        ...headers,
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw await parseAirtableError(response);
    }

    return (await response.json()) as T;
  };
}

function createClient(): AirtableClient {
  const env = getEnv();
  const request = createRequest(env.AIRTABLE_API_KEY, env.AIRTABLE_BASE_ID);

  return {
    async listRecords<TFields>(
      table: AirtableTable,
      options?: ListRecordsOptions,
    ): Promise<AirtableListResponse<TFields>> {
      const query = buildListQuery(options);
      return request<AirtableListResponse<TFields>>(table, query, {
        method: "GET",
      });
    },

    async getRecord<TFields>(
      table: AirtableTable,
      recordId: string,
    ): Promise<AirtableRecord<TFields>> {
      return request<AirtableRecord<TFields>>(table, `/${recordId}`, {
        method: "GET",
      });
    },

    async createRecord<TFields>(
      table: AirtableTable,
      fields: Partial<TFields>,
      options?: CreateRecordOptions,
    ): Promise<AirtableRecord<TFields>> {
      const query =
        options?.typecast !== undefined
          ? `?typecast=${options.typecast}`
          : "";

      return request<AirtableRecord<TFields>>(table, query, {
        method: "POST",
        body: JSON.stringify({ fields }),
      });
    },

    async updateRecord<TFields>(
      table: AirtableTable,
      recordId: string,
      fields: Partial<TFields>,
      options?: UpdateRecordOptions,
    ): Promise<AirtableRecord<TFields>> {
      const query =
        options?.typecast !== undefined
          ? `?typecast=${options.typecast}`
          : "";

      return request<AirtableRecord<TFields>>(table, `/${recordId}${query}`, {
        method: "PATCH",
        body: JSON.stringify({ fields }),
      });
    },
  };
}

let cachedClient: AirtableClient | undefined;
let testClientOverride: AirtableClient | undefined;

/** Replace the singleton client (matching manual tests). Pass `undefined` to reset. */
export function setAirtableClientForTests(client: AirtableClient | undefined): void {
  testClientOverride = client;
  cachedClient = client;
}

/** Lazily constructed singleton Airtable REST client. */
export function getAirtableClient(): AirtableClient {
  if (testClientOverride) {
    return testClientOverride;
  }
  if (!cachedClient) {
    cachedClient = createClient();
  }
  return cachedClient;
}
