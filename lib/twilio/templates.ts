import { getEnv } from "@/config/env";

function mechanicSignInUrl(phoneE164: string): string {
  const env = getEnv();
  const base = env.APP_URL.replace(/\/$/, "");
  return `${base}/m/signin?phone=${encodeURIComponent(phoneE164)}`;
}

/** §4.9 — Application Received (sent when a mechanic submits an application). */
export function applicationReceived(): string {
  return "Veriium: Got your application! We review every applicant manually within 48 hours. We'll text you with next steps. — Devar";
}

/** §4.9 — Approved (includes sign-in link with URL-encoded E.164 phone). */
export function approved(phoneE164: string): string {
  const url = mechanicSignInUrl(phoneE164);
  return `Veriium: You're approved! Welcome aboard. Sign in to set up your profile and start accepting jobs: ${url} Questions? Reply to this text — I'm here.`;
}

/** §4.9 — Needs More Info (includes sign-in link and admin review notes). */
export function needsMoreInfo(phoneE164: string, reviewNotes: string): string {
  const url = mechanicSignInUrl(phoneE164);
  const notes = reviewNotes.trim();
  return `Veriium: We need a bit more info on your application. Sign in to update: ${url} What we need: ${notes}`;
}

/** §4.9 — Rejected (static copy). */
export function rejected(): string {
  return "Veriium: Thanks for applying. We're not able to bring you onto the platform right now. You're welcome to reapply in 90 days as we continue to grow.";
}

/**
 * Not defined in §4.9 — sent on `suspended` status per §11.2 webhook side effects.
 * Short lockout message; copy flagged for founder review.
 */
export function suspended(): string {
  return "Veriium: Your Veriium Pro account has been suspended. Sign-in is disabled. Reply to this text or contact support if you believe this is an error.";
}
