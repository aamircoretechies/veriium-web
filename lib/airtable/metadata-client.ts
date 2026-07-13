const AIRTABLE_META_BASE = "https://api.airtable.com/v0/meta";
const WRITE_DELAY_MS = 200;

export type MetadataField = {
  id: string;
  name: string;
  type: string;
  description?: string;
  options?: Record<string, unknown>;
};

export type MetadataTable = {
  id: string;
  name: string;
  description?: string;
  primaryFieldId: string;
  fields: MetadataField[];
};

export type MetadataBaseSchema = {
  tables: MetadataTable[];
};

export type CreateFieldPayload = {
  name: string;
  type: string;
  description?: string;
  options?: Record<string, unknown>;
};

export type UpdateFieldPayload = {
  name?: string;
  description?: string;
};

export type CreateTablePayload = {
  name: string;
  description?: string;
  fields: CreateFieldPayload[];
};

export class AirtableMetadataError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "AirtableMetadataError";
    this.status = status;
    this.body = body;
  }
}

export type AirtableMetadataClient = {
  getBaseSchema: (baseId: string) => Promise<MetadataBaseSchema>;
  getTable: (baseId: string, tableId: string) => Promise<MetadataTable>;
  createTable: (
    baseId: string,
    payload: CreateTablePayload,
  ) => Promise<MetadataTable>;
  createField: (
    baseId: string,
    tableId: string,
    payload: CreateFieldPayload,
  ) => Promise<MetadataField>;
  updateField: (
    baseId: string,
    tableId: string,
    fieldId: string,
    payload: UpdateFieldPayload,
  ) => Promise<MetadataField>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createAirtableMetadataClient(
  apiKey: string,
  options?: { writeDelayMs?: number },
): AirtableMetadataClient {
  const writeDelayMs = options?.writeDelayMs ?? WRITE_DELAY_MS;
  let lastWriteAt = 0;

  async function request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const isWrite = init?.method === "POST" || init?.method === "PATCH";
    if (isWrite) {
      const elapsed = Date.now() - lastWriteAt;
      if (elapsed < writeDelayMs) {
        await sleep(writeDelayMs - elapsed);
      }
      lastWriteAt = Date.now();
    }

    const response = await fetch(`${AIRTABLE_META_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    const body = await response.text();
    if (!response.ok) {
      throw new AirtableMetadataError(
        `Airtable Metadata API ${response.status}: ${body}`,
        response.status,
        body,
      );
    }

    return body ? (JSON.parse(body) as T) : ({} as T);
  }

  return {
    async getBaseSchema(baseId) {
      return request<MetadataBaseSchema>(`/bases/${baseId}/tables`);
    },

    async getTable(baseId, tableId) {
      const schema = await request<MetadataBaseSchema>(
        `/bases/${baseId}/tables`,
      );
      const table = schema.tables.find((entry) => entry.id === tableId);
      if (!table) {
        throw new AirtableMetadataError(
          `Table ${tableId} not found in base ${baseId}`,
          404,
          "",
        );
      }
      return table;
    },

    async createTable(baseId, payload) {
      return request<MetadataTable>(`/bases/${baseId}/tables`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },

    async createField(baseId, tableId, payload) {
      return request<MetadataField>(
        `/bases/${baseId}/tables/${tableId}/fields`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    },

    async updateField(baseId, tableId, fieldId, payload) {
      return request<MetadataField>(
        `/bases/${baseId}/tables/${tableId}/fields/${fieldId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );
    },
  };
}
