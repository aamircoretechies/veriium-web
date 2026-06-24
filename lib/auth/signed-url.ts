import { getEnv } from "@/config/env";
import type { JobFields } from "@/types/airtable/jobs";

const INTERIM_EXPIRY_DAYS = 90;
const COMPLETION_GRACE_DAYS = 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type JobAccessPayload = {
  jobId: string;
  iat: number;
  exp: number;
};

export class InvalidJobAccessTokenError extends Error {
  constructor(message = "Invalid or expired job access link.") {
    super(message);
    this.name = "InvalidJobAccessTokenError";
  }
}

function base64UrlEncode(data: string | Uint8Array): string {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signPayload(payloadB64: string): Promise<string> {
  const key = await getHmacKey(getEnv().SIGNED_URL_SECRET);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64),
  );
  return base64UrlEncode(new Uint8Array(signature));
}

/** Issue an HMAC token for driver job access (~90-day interim expiry). */
export async function signJobAccessToken(jobId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: JobAccessPayload = {
    jobId,
    iat: now,
    exp: now + INTERIM_EXPIRY_DAYS * 24 * 60 * 60,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  return `${payloadB64}.${await signPayload(payloadB64)}`;
}

/** Constant-time HMAC verify plus JWT-style `exp` check. */
export async function verifyJobAccessToken(
  jobId: string,
  token: string,
): Promise<void> {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new InvalidJobAccessTokenError();
  }

  const [payloadB64, signatureB64] = parts;
  const expectedSig = await signPayload(payloadB64);
  const sigBuf = base64UrlDecode(signatureB64);
  const expectedBuf = base64UrlDecode(expectedSig);

  if (!timingSafeEqual(sigBuf, expectedBuf)) {
    throw new InvalidJobAccessTokenError();
  }

  let payload: JobAccessPayload;
  try {
    payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64)),
    ) as JobAccessPayload;
  } catch {
    throw new InvalidJobAccessTokenError();
  }

  if (payload.jobId !== jobId) {
    throw new InvalidJobAccessTokenError();
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new InvalidJobAccessTokenError();
  }
}

/** HMAC verify plus completion-based expiry (60 days after `completed_at`). */
export async function isTokenValidForJob(
  jobId: string,
  job: Pick<JobFields, "completed_at">,
  token: string,
): Promise<boolean> {
  try {
    await verifyJobAccessToken(jobId, token);
  } catch {
    return false;
  }

  if (job.completed_at) {
    const completedAt = new Date(job.completed_at).getTime();
    const expiry = completedAt + COMPLETION_GRACE_DAYS * MS_PER_DAY;
    if (Date.now() > expiry) {
      return false;
    }
  }

  return true;
}

export async function buildSignedJobUrl(jobId: string): Promise<string> {
  const token = await signJobAccessToken(jobId);
  const appUrl = getEnv().APP_URL.replace(/\/$/, "");
  return `${appUrl}/j/${jobId}?token=${encodeURIComponent(token)}`;
}
