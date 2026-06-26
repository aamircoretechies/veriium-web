import {
  createInMemoryAirtableClient,
  getAirtableClient,
  type AirtableClient,
} from "@/lib/airtable";
import { seedMechanicSearchFixtures } from "@/lib/mechanics/search-fixtures";

function hasAirtableConfig(): boolean {
  return Boolean(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID);
}

function shouldUseMock(): boolean {
  if (process.env.FIND_MECHANIC_MOCK === "1") {
    return true;
  }
  if (process.env.FIND_MECHANIC_MOCK === "0") {
    return false;
  }
  return !hasAirtableConfig();
}

let mockClient: ReturnType<typeof createInMemoryAirtableClient> | undefined;
let mockSeedPromise: Promise<void> | undefined;

function getMockSearchClient(): AirtableClient {
  if (!mockClient) {
    mockClient = createInMemoryAirtableClient();
    mockSeedPromise = seedMechanicSearchFixtures(mockClient);
  }
  return mockClient;
}

/**
 * Airtable client for mechanic browse search.
 * Uses in-memory fixtures when `FIND_MECHANIC_MOCK=1` or Airtable is not configured.
 */
export async function getMechanicSearchClient(): Promise<AirtableClient> {
  if (shouldUseMock()) {
    const client = getMockSearchClient();
    await mockSeedPromise;
    return client;
  }

  return getAirtableClient();
}
