import { getEnv } from "@/config/env";

function prefix(key: keyof Pick<
  ReturnType<typeof getEnv>,
  | "PAYMENT_KEY_PREFIX_SETUP"
  | "PAYMENT_KEY_PREFIX_DIAGNOSTIC"
  | "PAYMENT_KEY_PREFIX_CANCEL"
  | "PAYMENT_KEY_PREFIX_TIP"
  | "PAYMENT_KEY_PREFIX_RECOVERY"
  | "PAYMENT_KEY_PREFIX_INSTALLED"
  | "PAYMENT_KEY_PREFIX_PARTS_CANCEL"
>): string {
  return getEnv()[key];
}

/** Card-save SetupIntent Stripe idempotency key. */
export function setupKey(jobId: string): string {
  return `${prefix("PAYMENT_KEY_PREFIX_SETUP")}${jobId}`;
}

/** Final manual-capture PaymentIntent — §10.2. */
export function finalKey(jobId: string): string {
  return jobId;
}

/** $35 diagnostic fee PaymentIntent — §10.2. */
export function diagnosticKey(jobId: string): string {
  return `${prefix("PAYMENT_KEY_PREFIX_DIAGNOSTIC")}${jobId}`;
}

/** $50 cancellation fee PaymentIntent — §10.2. */
export function cancelKey(jobId: string): string {
  return `${prefix("PAYMENT_KEY_PREFIX_CANCEL")}${jobId}`;
}

/** Tip Payment Link — §10.2. */
export function tipKey(jobId: string): string {
  return `${prefix("PAYMENT_KEY_PREFIX_TIP")}${jobId}`;
}

/** Final payment recovery Payment Link — Exhibit A §4. */
export function recoveryKey(jobId: string): string {
  return `${prefix("PAYMENT_KEY_PREFIX_RECOVERY")}${jobId}`;
}

/** Suffix for a second off-session charge attempt when the original PI is terminal. */
export function paymentRetryKey(baseKey: string): string {
  return `${baseKey}-retry`;
}

/** Installed parts charge on requote decline — §5.5. */
export function installedPartsKey(jobId: string): string {
  return `${prefix("PAYMENT_KEY_PREFIX_INSTALLED")}${jobId}`;
}

/** Parts charge on post-approve cancellation — Exhibit A §5.6. */
export function partsCancelKey(jobId: string): string {
  return `${prefix("PAYMENT_KEY_PREFIX_PARTS_CANCEL")}${jobId}`;
}
