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

/** Installed parts charge on requote decline — §5.5. */
export function installedPartsKey(jobId: string): string {
  return `installed-${jobId}`;
}
