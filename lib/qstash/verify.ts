import {
  verifySignatureAppRouter,
  type VerifySignatureConfig,
} from "@upstash/qstash/nextjs";
import type { NextRequest } from "next/server";
import { getEnv } from "@/config/env";

type VerifySignatureAppRouterHandler = Parameters<
  typeof verifySignatureAppRouter
>[0];

/**
 * Wrap an App Router handler with QStash signature verification.
 * Signing keys are read from validated env on first request.
 */
export function verifyQStashSignature(
  handler: VerifySignatureAppRouterHandler,
  config?: VerifySignatureConfig,
) {
  let verifiedHandler: ReturnType<typeof verifySignatureAppRouter> | undefined;

  return async (request: Request | NextRequest, params?: unknown) => {
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
