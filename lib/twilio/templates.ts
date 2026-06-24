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

type MatchJobDetails = {
  zipCode: string;
  categoryLabel?: string;
  vehicleLabel?: string;
  serviceTypeLabel?: string;
};

function formatJobDetails(details: MatchJobDetails): string {
  const parts = [
    details.vehicleLabel,
    details.categoryLabel,
    details.serviceTypeLabel,
    `ZIP ${details.zipCode}`,
  ].filter(Boolean);

  return parts.join(" · ");
}

/** §6.1 — Tier 1 direct assignment to one mechanic. */
export function tier1Assignment(details: MatchJobDetails): string {
  return `Veriium: New job — ${formatJobDetails(details)}. Reply ACCEPT within 10 min to take it, or DECLINE to pass.`;
}

/** §6.1 — Tier 2 broadcast; first YES wins. */
export function tier2Broadcast(details: MatchJobDetails): string {
  return `Veriium: Open job nearby — ${formatJobDetails(details)}. Reply YES to claim (first YES wins) or NO to skip.`;
}

/** §6.1 — Tier 3 open call; no category filter in mechanic pool. */
export function tier3Broadcast(details: MatchJobDetails): string {
  const parts = [
    details.vehicleLabel,
    details.serviceTypeLabel,
    `ZIP ${details.zipCode}`,
  ].filter(Boolean);

  return `Veriium: Urgent open job — ${parts.join(" · ")}. Reply YES to claim (first YES wins) or NO to skip.`;
}

/** §6.1 — Driver update when matching escalates to admin. */
export function tier4DriverUpdate(): string {
  return "Veriium: We're still finding the right mechanic for your job. We'll text you with an update within 1 hour.";
}

/** §6.1 — Admin alert for manual matching. */
export function tier4AdminAlert(jobId: string, details: MatchJobDetails): string {
  return `Veriium Admin: Job ${jobId} needs manual match — ${formatJobDetails(details)}. Assign in Airtable.`;
}

/** §6.1 — Notify driver when a mechanic accepts. */
export function matchAcceptedDriver(): string {
  return "Veriium: Great news — a mechanic accepted your job! They'll be in touch shortly with next steps.";
}

/** Sent when a mechanic replies YES after the job is already assigned. */
export function matchAlreadyAssigned(): string {
  return "Veriium: This job was already claimed by another mechanic. Thanks for responding!";
}
