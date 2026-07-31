import { findPaymentByJobAndType } from "./record";
import { PaymentSetupIncompleteError } from "./errors";

/** Whether the job has a succeeded setup_intent payment row. */
export async function isJobPaymentSetupComplete(
  jobId: string,
): Promise<boolean> {
  const payment = await findPaymentByJobAndType(jobId, "setup_intent");
  return payment?.fields.status === "succeeded";
}

/** Require succeeded setup_intent before matching or mechanic acceptance. */
export async function assertJobPaymentSetupComplete(
  jobId: string,
): Promise<void> {
  if (!(await isJobPaymentSetupComplete(jobId))) {
    throw new PaymentSetupIncompleteError(jobId);
  }
}
