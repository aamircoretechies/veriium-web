"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/app/components/ui/button";
import {
  BookingPaymentApiError,
  completeBookingPaymentClient,
} from "@/lib/bookings/complete-payment-client";

interface BookingConfirmationProps {
  jobId: string;
  token: string;
}

function buildCalendarIcsUrl(jobId: string, token: string): string {
  return `/api/bookings/${encodeURIComponent(jobId)}/calendar.ics?token=${encodeURIComponent(token)}`;
}

function buildJobStatusUrl(jobId: string, token: string): string {
  return `/j/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`;
}

function buildConfirmationUrl(jobId: string, token: string): string {
  return `/public/confirmation/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`;
}

function BookingConfirmationContent({
  jobId,
  token,
}: BookingConfirmationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setupIntentId = searchParams.get("setup_intent");
  const redirectStatus = searchParams.get("redirect_status");

  const [ready, setReady] = useState(!setupIntentId);
  const [error, setError] = useState("");

  useEffect(() => {
    const intentId = setupIntentId;
    if (!intentId) {
      return;
    }

    if (redirectStatus === "failed") {
      setError("Unable to save your payment method. Please try again.");
      return;
    }

    let cancelled = false;

    async function completeRedirectedSetup() {
      try {
        await completeBookingPaymentClient(jobId, token, intentId);
        if (!cancelled) {
          router.replace(buildConfirmationUrl(jobId, token));
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof BookingPaymentApiError
              ? err.message
              : "Unable to confirm your payment method. Please try again.",
          );
        }
      }
    }

    void completeRedirectedSetup();

    return () => {
      cancelled = true;
    };
  }, [jobId, redirectStatus, router, setupIntentId, token]);

  const calendarUrl = buildCalendarIcsUrl(jobId, token);
  const jobStatusUrl = buildJobStatusUrl(jobId, token);

  if (!ready) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-['Albert_Sans:Regular',sans-serif] px-[20px]">
        <p className="text-[15px] text-gray-500">Confirming your payment…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-['Albert_Sans:Regular',sans-serif] px-[20px]">
        <div className="flex flex-col items-center max-w-[600px] text-center">
          <p className="text-[15px] text-red-600 mb-6">{error}</p>
          <Button
            asChild
            className="bg-[#ffa270] hover:bg-[#ff8f52] text-black font-['Albert_Sans:Bold',sans-serif] font-bold"
          >
            <Link
              href={`/public/payment?jobId=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`}
            >
              Return to payment
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center font-['Albert_Sans:Regular',sans-serif] px-[20px]">
      <div className="flex flex-col items-center max-w-[600px] text-center">
        <div className="mb-8">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 6L9 17l-5-5"
              stroke="#1a1a1a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[32px] md:text-[40px] text-black mb-6">
          You&apos;re all set!
        </h1>

        <p className="font-['Albert_Sans:Medium',sans-serif] text-[18px] md:text-[20px] text-black leading-relaxed">
          You will be notified when your mechanic is ready to fix
          <br className="hidden md:block" /> your car.
        </p>

        <div className="mt-10 flex flex-col gap-3 w-full max-w-[400px]">
          <Button
            asChild
            className="w-full bg-[#ffa270] hover:bg-[#ff8f52] text-black font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] h-12"
          >
            <a href={calendarUrl}>Add to calendar</a>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] h-12"
          >
            <Link href={jobStatusUrl}>View job status</Link>
          </Button>
        </div>

        <p className="mt-8 text-gray-500 text-sm leading-relaxed">
          Save the appointment to your calendar, then track your repair anytime
          from your job page.
        </p>
      </div>
    </div>
  );
}

export default function BookingConfirmation({
  jobId,
  token,
}: BookingConfirmationProps) {
  return (
    <Suspense>
      <BookingConfirmationContent jobId={jobId} token={token} />
    </Suspense>
  );
}
