import { Client } from "@upstash/qstash";
import { getEnv } from "@/config/env";

let cachedClient: Client | undefined;

function createClient(): Client {
  const env = getEnv();
  return new Client({
    token: env.QSTASH_TOKEN,
    baseUrl: env.QSTASH_URL,
  });
}

/** Lazily constructed singleton QStash client. */
export function getQStashClient(): Client {
  if (!cachedClient) {
    cachedClient = createClient();
  }
  return cachedClient;
}
