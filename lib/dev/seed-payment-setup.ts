import { isJobPaymentSetupComplete } from "@/lib/payments/assert-setup-complete";
import { createPaymentRecord } from "@/lib/payments/record";

/** Seed a succeeded setup_intent row for local dev matching bypass. */
export async function ensureDevPaymentSetup(jobId: string): Promise<void> {
  if (await isJobPaymentSetupComplete(jobId)) {
    return;
  }

  await createPaymentRecord({
    type: "setup_intent",
    amount: 0,
    status: "succeeded",
    stripe_setup_intent_id: `dev-setup-${jobId}`,
    job_id: [jobId],
  });
}
