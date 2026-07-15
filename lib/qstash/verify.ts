import {
  verifySignatureAppRouter,
  type VerifySignatureConfig,
} from "@upstash/qstash/nextjs";
import type { NextRequest } from "next/server";
import { getEnv } from "@/config/env";
import { isQstashDev } from "@/lib/dev/flags";

type VerifySignatureAppRouterHandler = Parameters<
  typeof verifySignatureAppRouter
>[0];

/**
 * Wrap an App Router handler with QStash signature verification.
 * Signing keys are read from validated env on first request.
 *
 * When `QSTASH_DEV=true`, local mock callbacks (no Upstash signature) are allowed.
 */
export function verifyQStashSignature(
  handler: VerifySignatureAppRouterHandler,
  config?: VerifySignatureConfig,
) {
  let verifiedHandler: ReturnType<typeof verifySignatureAppRouter> | undefined;

  return async (request: Request | NextRequest, params?: unknown) => {
    if (isQstashDev()) {
      const mockHeader = request.headers.get("x-qstash-dev-mock");
      if (mockHeader?.startsWith("mock-qstash-")) {
        return handler(request as never, params as never);
      }

      // Manual demo invoke: same secret as start-matching / sms-inbound
      try {
        const env = getEnv();
        const secret = request.headers.get("x-matching-dev-secret");
        if (secret && secret === env.MATCHING_DEV_SECRET) {
          return handler(request as never, params as never);
        }
      } catch {
        // Fall through to normal signature verification
      }
    }

    const env = getEnv();

    if (!verifiedHandler) {
      verifiedHandler = verifySignatureAppRouter(handler, {
        currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
        ...config,
      });
    }

    return verifiedHandler(request, params);
  };
}

export type { VerifySignatureConfig };
