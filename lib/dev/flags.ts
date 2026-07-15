/**
 * Staging / local demo bypasses (Milestone 5 without live Twilio / QStash / Cloudinary).
 *
 * Explicit `*_MOCK=0` always disables that bypass.
 * Explicit `*_MOCK=1` (or `QSTASH_DEV=true`) always enables it.
 * Otherwise falls back to local/`ALLOW_DEV_OTP` for a zero-config demos path.
 */

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

function isFalsy(value: string | undefined): boolean {
  return value === "0" || value === "false";
}

/** Local next dev or preview OTP mode (`ALLOW_DEV_OTP=true`). */
export function isDevBypassMode(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_DEV_OTP === "true" ||
    // Client bundles cannot read server-only ALLOW_DEV_OTP; mirror for UI mocks.
    process.env.NEXT_PUBLIC_ALLOW_DEV_OTP === "true"
  );
}

function resolveMockFlag(
  explicit: string | undefined,
  fallbackEnabled: boolean,
): boolean {
  if (isFalsy(explicit)) {
    return false;
  }
  if (isTruthy(explicit)) {
    return true;
  }
  return fallbackEnabled;
}

/** Log outbound SMS instead of calling Twilio Messaging. */
export function isSmsMock(): boolean {
  return resolveMockFlag(process.env.SMS_MOCK, isDevBypassMode());
}

/**
 * Skip real QStash publish; return `mock-qstash-*` ids.
 * Also skips worker signature verification so local callbacks can hit routes.
 * Enable with `QSTASH_DEV=true` or `SCHEDULE_MOCK=1` (already in Phase 0 .env.local).
 */
export function isQstashDev(): boolean {
  if (isFalsy(process.env.QSTASH_DEV) || isFalsy(process.env.SCHEDULE_MOCK)) {
    return false;
  }
  return (
    isTruthy(process.env.QSTASH_DEV) || isTruthy(process.env.SCHEDULE_MOCK)
  );
}

/**
 * Client/server receipt upload without Cloudinary.
 * Uses a public placeholder URL (Airtable attachments require HTTPS).
 */
export function isReceiptUploadMock(): boolean {
  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
    process.env.CLOUDINARY_CLOUD_NAME;
  const noCloudinary = !cloudName?.trim();
  return resolveMockFlag(
    process.env.RECEIPT_UPLOAD_MOCK ?? process.env.NEXT_PUBLIC_RECEIPT_UPLOAD_MOCK,
    isDevBypassMode() && noCloudinary,
  );
}

/** Public HTTPS image used when receipt upload is mocked. */
export const MOCK_RECEIPT_IMAGE_URL =
  "https://placehold.co/800x600.png?text=Veriium+Receipt+Demo";
