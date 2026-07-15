import type { PublishRequest, PublishResponse } from "@upstash/qstash";
import { getEnv } from "@/config/env";
import { isQstashDev } from "@/lib/dev/flags";
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

function resolveDelayMs(options: ScheduleJobOptions): number {
  if (options.notBefore !== undefined) {
    return Math.max(0, options.notBefore * 1000 - Date.now());
  }
  if (options.delaySeconds !== undefined) {
    return Math.max(0, options.delaySeconds * 1000);
  }
  return 0;
}

/**
 * In `QSTASH_DEV` mode, fire the worker locally after the delay so timers
 * still demonstrate without Upstash callbacks (next dev only; serverless
 * may drop the timer if the isolate freezes — use short delays for demos).
 */
function scheduleLocalCallback<TBody>(
  options: ScheduleJobOptions<TBody>,
  messageId: string,
): void {
  const delayMs = resolveDelayMs(options);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const url = buildAbsoluteUrl(options.path, appUrl);

  const fire = () => {
    void fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-qstash-dev-mock": messageId,
      },
      body: JSON.stringify(options.body),
    }).then(
      (res) => {
        console.info(
          `[qstash-dev] Local callback ${options.path} → ${res.status} (${messageId})`,
        );
      },
      (error: unknown) => {
        console.warn(
          `[qstash-dev] Local callback failed for ${options.path}:`,
          error,
        );
      },
    );
  };

  if (delayMs === 0) {
    fire();
  } else {
    console.info(
      `[qstash-dev] Scheduling local callback ${options.path} in ${Math.round(delayMs / 1000)}s (${messageId})`,
    );
    setTimeout(fire, delayMs);
  }
}

/** Publish a delayed job to a worker route under `APP_URL`. */
export async function scheduleJob<TBody = unknown>(
  options: ScheduleJobOptions<TBody>,
): Promise<PublishResponse<PublishRequest>> {
  if (
    process.env.MATCHING_MANUAL_TEST === "1" ||
    process.env.PHASE6_MANUAL_TEST === "1" ||
    process.env.RECEIPT_MANUAL_TEST === "1" ||
    process.env.QUOTE_MANUAL_TEST === "1" ||
    process.env.REQUOTE_MANUAL_TEST === "1" ||
    process.env.PAYMENTS_MANUAL_TEST === "1"
  ) {
    return {
      messageId: `mock-qstash-${Date.now()}`,
    } as PublishResponse<PublishRequest>;
  }

  if (isQstashDev()) {
    const messageId = `mock-qstash-${Date.now()}`;
    scheduleLocalCallback(options, messageId);
    return { messageId } as PublishResponse<PublishRequest>;
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
