import type { PublishRequest, PublishResponse } from "@upstash/qstash";
import { getEnv } from "@/config/env";
import { getQStashClient } from "./client";

export type ScheduleJobOptions<TBody = unknown> = {
  /** API route path, e.g. `/api/jobs/test`. */
  path: string;
  body: TBody;
  /** Relative delay in seconds. Ignored when `notBefore` is set. */
  delaySeconds?: number;
  /** Absolute delivery time as a Unix timestamp in seconds (UTC). */
  notBefore?: number;
};

function buildAbsoluteUrl(path: string, appUrl: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${appUrl.replace(/\/$/, "")}${normalizedPath}`;
}

/** Publish a delayed job to a worker route under `APP_URL`. */
export async function scheduleJob<TBody = unknown>(
  options: ScheduleJobOptions<TBody>,
): Promise<PublishResponse<PublishRequest>> {
  if (
    process.env.MATCHING_MANUAL_TEST === "1" ||
    process.env.PHASE6_MANUAL_TEST === "1" ||
    process.env.RECEIPT_MANUAL_TEST === "1" ||
    process.env.QUOTE_MANUAL_TEST === "1"
  ) {
    return {
      messageId: `mock-qstash-${Date.now()}`,
    } as PublishResponse<PublishRequest>;
  }

  const env = getEnv();
  const client = getQStashClient();

  return client.publishJSON({
    url: buildAbsoluteUrl(options.path, env.APP_URL),
    body: options.body,
    ...(options.notBefore !== undefined
      ? { notBefore: options.notBefore }
      : options.delaySeconds !== undefined
        ? { delay: options.delaySeconds }
        : {}),
  });
}
