import { buildSignedJobUrl } from "@/lib/auth/signed-url";
import { getJobById } from "@/lib/jobs/lookup";
import { jobStatusOr } from "@/lib/jobs/status";
import { completeSetup } from "@/lib/payments/complete-setup";
import {
  SetupIntentMetadataError,
  SetupIntentNotFoundError,
} from "@/lib/payments/errors";
import { getStripe } from "@/lib/stripe/client";
import type { PaymentCompleteResponse } from "@/types/api/payment";

export class SetupIntentNotReadyError extends Error {
  constructor(message = "Payment setup has not completed yet.") {
    super(message);
    this.name = "SetupIntentNotReadyError";
  }
}

export class SetupIntentJobMismatchError extends Error {
  constructor(message = "SetupIntent does not belong to this booking.") {
    super(message);
    this.name = "SetupIntentJobMismatchError";
  }
}

export async function completeBookingPayment(
  jobId: string,
  setupIntentId: string,
): Promise<PaymentCompleteResponse> {
  const stripe = getStripe();
  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

  if (setupIntent.metadata?.jobId !== jobId) {
    throw new SetupIntentJobMismatchError();
  }

  if (setupIntent.status !== "succeeded") {
    throw new SetupIntentNotReadyError();
  }

  await completeSetup(setupIntent);

  const job = await getJobById(jobId);
  return {
    jobId,
    status: jobStatusOr(job.fields.status),
    signedUrl: await buildSignedJobUrl(jobId),
  };
}
