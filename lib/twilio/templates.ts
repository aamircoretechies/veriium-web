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

/** §7.2 — Driver update when mechanic begins diagnosing. */
export function serviceDiagnosingDriver(): string {
  return "Veriium: Your mechanic has started diagnosing your vehicle. You'll receive a quote shortly.";
}

type ServiceQuoteDetails = {
  quoteAmount: number;
  partsCost: number;
  onHand: boolean;
  nonOemOrUsedParts?: boolean;
  nonOemPartsDescription?: string;
};

function truncateDescription(description: string, maxLength = 80): string {
  const trimmed = description.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 3)}...`;
}

/** §7.2 — Driver quote approval request. */
export function serviceQuoteDriver(details: ServiceQuoteDetails): string {
  const total = details.quoteAmount + details.partsCost;
  const onHandNote = details.onHand
    ? " Parts are on hand — repair can start right after approval."
    : "";
  const nonOemNote = details.nonOemOrUsedParts
    ? ` Parts may include non-OEM or used components.${
        details.nonOemPartsDescription
          ? ` Details: ${truncateDescription(details.nonOemPartsDescription)}.`
          : ""
      }`
    : "";

  return `Veriium: Your quote is ready — labor $${details.quoteAmount.toFixed(2)}, parts $${details.partsCost.toFixed(2)} (total $${total.toFixed(2)}).${nonOemNote}${onHandNote} Reply APPROVE to accept or DECLINE to cancel.`;
}

/** Exhibit A §5.8 — Driver consent for non-OEM or used parts. */
export function partsConsentDriver(description?: string): string {
  const detailNote = description
    ? ` Details: ${truncateDescription(description)}.`
    : "";

  return `Veriium: Your mechanic proposed non-OEM or used parts for this repair.${detailNote} Reply YES to consent and proceed.`;
}

/** Exhibit A §3.4 — driver notification after quote decline or 2h timeout. */
export function serviceQuoteDeclinedDriver(): string {
  return "Veriium: You declined the repair quote (or did not respond within 2 hours). A $35 diagnostic fee has been charged to your card on file.";
}

type ServiceRequoteDetails = {
  quoteAmount: number;
  previousPartsCost: number;
  newPartsCost: number;
  reason?: string;
};

/** Exhibit A §3.2 — Driver requote approval request. */
export function serviceRequoteDriver(details: ServiceRequoteDetails): string {
  const total = details.quoteAmount + details.newPartsCost;
  const reasonNote = details.reason ? ` Reason: ${details.reason}.` : "";

  return `Veriium: Your mechanic submitted a revised parts quote — was $${details.previousPartsCost.toFixed(2)}, now $${details.newPartsCost.toFixed(2)} (new total $${total.toFixed(2)}).${reasonNote} Reply APPROVE to accept or DECLINE to stop work.`;
}

type ServiceRequoteDeclinedDetails = {
  installedPartsCharge: number;
  diagnosticCharged: boolean;
};

/** Exhibit A §5.5 — driver notification after requote decline or 2h timeout. */
export function serviceRequoteDeclinedDriver(
  details: ServiceRequoteDeclinedDetails,
): string {
  const partsNote =
    details.installedPartsCharge > 0
      ? ` Installed parts: $${details.installedPartsCharge.toFixed(2)}.`
      : "";
  const diagnosticNote = details.diagnosticCharged
    ? " A $35 diagnostic fee has also been charged."
    : "";

  return `Veriium: You declined the revised parts quote (or did not respond within 2 hours).${partsNote}${diagnosticNote} The job has been cancelled.`;
}

/** §7.2 — Driver parts ETA update. */
export function servicePartsEta(minutes: number): string {
  return `Veriium: Your mechanic expects parts to arrive in about ${minutes} minutes.`;
}

type ServiceDoneDetails = {
  finalPrice: number;
  partsVariance?: number;
};

/** §9.3 — Driver confirmation / dispute prompt after DONE. */
export function serviceDoneDriver(
  finalPriceOrDetails: number | ServiceDoneDetails,
): string {
  const details =
    typeof finalPriceOrDetails === "number"
      ? { finalPrice: finalPriceOrDetails }
      : finalPriceOrDetails;
  const { finalPrice, partsVariance } = details;

  let message = `Veriium: Your repair is complete. Final total: $${finalPrice.toFixed(2)}.`;

  if (
    partsVariance !== undefined &&
    partsVariance !== 0 &&
    Math.abs(partsVariance) > 0.005
  ) {
    const direction = partsVariance > 0 ? "higher" : "lower";
    message += ` Parts receipt was $${Math.abs(partsVariance).toFixed(2)} ${direction} than quoted (within allowed tolerance).`;
  }

  return `${message} Reply 2 to confirm and complete payment, or 1 to dispute.`;
}

/** §9.1 / Exhibit A §5.6 — Driver confirmation after cancellation. */
type CancellationDriverDetails = {
  feeCharged: boolean;
  partsCharge: number;
};

export function cancellationDriver(details: CancellationDriverDetails): string {
  const { feeCharged, partsCharge } = details;
  const hasParts = partsCharge > 0;

  if (feeCharged && hasParts) {
    return `Veriium: Your job has been cancelled. A $50 cancellation fee and $${partsCharge.toFixed(2)} for installed parts have been charged per our policy.`;
  }

  if (feeCharged) {
    return "Veriium: Your job has been cancelled. A $50 cancellation fee has been charged per our policy.";
  }

  if (hasParts) {
    return `Veriium: Your job has been cancelled. $${partsCharge.toFixed(2)} for installed parts has been charged. No cancellation fee applies.`;
  }

  return "Veriium: Your job has been cancelled. No cancellation fee applies.";
}

/** §9.1 / Exhibit A §5.6 — Mechanic alert when the driver cancels. */
export function cancellationMechanic(partsCharged: boolean): string {
  if (partsCharged) {
    return "Veriium: The customer cancelled this job. Installed parts have been charged to the customer — you may keep the parts. You're back on the available list and can accept new jobs.";
  }

  return "Veriium: The customer cancelled this job. You're back on the available list and can accept new jobs.";
}

/** §9.2 — Mechanic prompt when no-show window opens after ARRIVED. */
export function noShowEligibleMechanic(): string {
  return "Veriium: Customer not here? Reply NOSHOW to report a no-show.";
}

/** §9.3 — Driver reminder to confirm or dispute after DONE. */
export function disputeReminderDriver(hours: 24 | 48 | 72): string {
  return `Veriium: Reminder — your repair is awaiting confirmation (${hours}h). Reply 2 to confirm and complete payment, or 1 to dispute.`;
}
