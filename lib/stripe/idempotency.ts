/** Card-save SetupIntent Airtable row key. */
export function setupKey(jobId: string): string {
  return `setup-${jobId}`;
}

/** Final manual-capture PaymentIntent — §10.2. */
export function finalKey(jobId: string): string {
  return jobId;
}

/** $35 diagnostic fee PaymentIntent — §10.2. */
export function diagnosticKey(jobId: string): string {
  return `diagnostic-${jobId}`;
}

/** $50 cancellation fee PaymentIntent — §10.2. */
export function cancelKey(jobId: string): string {
  return `cancel-${jobId}`;
}

/** Tip Payment Link — §10.2. */
export function tipKey(jobId: string): string {
  return `tip-${jobId}`;
}

/** Final payment recovery Payment Link — Exhibit A §4 (INFERRED). */
export function recoveryKey(jobId: string): string {
  return `recovery-${jobId}`;
}

/** Suffix for a second off-session charge attempt when the original PI is terminal. */
export function paymentRetryKey(baseKey: string): string {
  return `${baseKey}-retry`;
}

/** Installed parts charge on requote decline — §5.5. */
export function installedPartsKey(jobId: string): string {
  return `installed-${jobId}`;
}

/** Parts charge on post-approve cancellation — Exhibit A §5.6. */
export function partsCancelKey(jobId: string): string {
  return `parts-cancel-${jobId}`;
}
