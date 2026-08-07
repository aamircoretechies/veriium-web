import { redirect } from "next/navigation";

import {
  InvalidJobAccessTokenError,
  verifyJobAccessToken,
} from "@/lib/auth/signed-url";
import { isJobPaymentSetupComplete } from "@/lib/payments/assert-setup-complete";
import { buildPaymentUrl } from "@/lib/bookings/urls";
import BookingConfirmation from "../../../../src_mirror/imports/Booking/BookingConfirmation";

type ConfirmationPageProps = {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ token?: string; setup_intent?: string }>;
};

export default async function ConfirmationPage({
  params,
  searchParams,
}: ConfirmationPageProps) {
  const { jobId } = await params;
  const { token, setup_intent: setupIntentId } = await searchParams;

  if (!token) {
    redirect("/public?error=invalid_link");
  }

  try {
    await verifyJobAccessToken(jobId, token);
  } catch (error) {
    if (error instanceof InvalidJobAccessTokenError) {
      redirect("/public?error=invalid_link");
    }
    throw error;
  }

  // 3DS return lands here before payment/complete runs client-side.
  if (!setupIntentId) {
    const paymentComplete = await isJobPaymentSetupComplete(jobId);
    if (!paymentComplete) {
      redirect(buildPaymentUrl(jobId, token));
    }
  }

  return <BookingConfirmation jobId={jobId} token={token} />;
}
