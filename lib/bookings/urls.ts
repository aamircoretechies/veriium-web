export function buildConfirmationUrl(jobId: string, token: string): string {
  return `/public/confirmation/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`;
}

export function buildCalendarIcsUrl(jobId: string, token: string): string {
  return `/api/bookings/${encodeURIComponent(jobId)}/calendar.ics?token=${encodeURIComponent(token)}`;
}

export function buildJobStatusUrl(jobId: string, token: string): string {
  return `/j/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`;
}

export function buildPaymentUrl(jobId: string, token: string): string {
  return `/public/payment?jobId=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`;
}

export function buildSummaryUrl(jobId: string, token: string): string {
  return `/public/summary?jobId=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`;
}
