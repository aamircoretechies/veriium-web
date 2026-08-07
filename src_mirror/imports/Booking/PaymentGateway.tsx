"use client";

import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { StripeElementsProvider } from "@/app/components/stripe/StripeElementsProvider";
import { Button } from "@/app/components/ui/button";
import {
  BookingPaymentApiError,
  completeBookingPaymentClient,
  fetchPaymentSetupClient,
} from "@/lib/bookings/complete-payment-client";

import Footer from "../../../app/components/Footer";

interface PaymentGatewayProps {
  jobId: string;
  token: string;
  onBack?: () => void;
}

function buildConfirmationUrl(jobId: string, token: string): string {
  return `/public/confirmation/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`;
}

function buildSummaryUrl(jobId: string, token: string): string {
  return `/public/summary?jobId=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`;
}

const setupIntentInflight = new Map<
  string,
  ReturnType<typeof fetchPaymentSetupClient>
>();

function fetchSetupIntent(jobId: string, token: string) {
  const key = `${jobId}:${token}`;
  const existing = setupIntentInflight.get(key);
  if (existing) {
    return existing;
  }

  const promise = fetchPaymentSetupClient(jobId, token);
  setupIntentInflight.set(key, promise);
  void promise.finally(() => {
    setupIntentInflight.delete(key);
  });

  return promise;
}

function PaymentSetupForm({
  jobId,
  token,
  setupIntentId,
}: {
  jobId: string;
  token: string;
  setupIntentId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSecureRepair = async () => {
    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);
    setError("");

    const returnUrl = `${window.location.origin}${buildConfirmationUrl(jobId, token)}`;

    const { error: confirmError } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Unable to save your payment method.");
      setSubmitting(false);
      return;
    }

    try {
      await completeBookingPaymentClient(jobId, token, setupIntentId);
      router.push(buildConfirmationUrl(jobId, token));
    } catch (err) {
      setError(
        err instanceof BookingPaymentApiError
          ? err.message
          : "Unable to confirm your payment method. Please try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full mb-[60px]">
        <PaymentElement />
      </div>

      {error && (
        <p className="w-full max-w-[500px] text-[13px] text-red-500 mb-4 text-center">
          {error}
        </p>
      )}

      <Button
        onClick={() => void handleSecureRepair()}
        disabled={!stripe || !elements || submitting}
        className="w-full max-w-[500px] bg-[#ffa270] hover:bg-[#ff8f52] text-black font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] h-14 rounded-[8px] disabled:opacity-70"
      >
        {submitting ? "Securing…" : "Secure My Repair"}
      </Button>
    </>
  );
}

export default function PaymentGateway({
  jobId,
  token,
}: PaymentGatewayProps) {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupIntentId, setSetupIntentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initSetupIntent() {
      setLoading(true);
      setError("");
      setErrorCode(null);

      try {
        const data = await fetchSetupIntent(jobId, token);
        if (!cancelled) {
          setClientSecret(data.clientSecret);
          setSetupIntentId(data.setupIntentId);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        if (err instanceof BookingPaymentApiError) {
          if (err.code === "payment_already_completed") {
            router.replace(buildConfirmationUrl(jobId, token));
            return;
          }
          if (err.code === "invalid_token") {
            router.replace("/public?error=invalid_link");
            return;
          }
          setErrorCode(err.code);
          setError(err.message);
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to start payment setup. Please try again.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initSetupIntent();

    return () => {
      cancelled = true;
    };
  }, [jobId, router, token]);

  return (
    <div className="min-h-screen bg-white flex flex-col font-['Albert_Sans:Regular',sans-serif]">
      <div className="w-full flex items-center justify-between px-[24px] md:px-[100px] py-[28px] border-b border-[#f0f0f0]">
        <span
          className="font-['Inter:Bold',sans-serif] font-bold text-[28px] text-black tracking-[0.1px] cursor-pointer"
          onClick={() => router.push("/public")}
        >
          VERIIUM
        </span>
        <div className="flex items-center gap-[24px]" />
      </div>

      <div className="flex-1 w-full max-w-[800px] mx-auto px-[24px] py-[60px] flex flex-col items-center">
        <div className="w-full text-left mb-[60px]">
          <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[32px] text-black mb-4">
            Secure Your Payment
          </h1>
          <p className="text-[15px] text-black leading-relaxed">
            To reserve your mechanic and confirm your appointment, please add a
            payment method. You will always approve the final amount before
            anything is charged. You won&apos;t be charged until your mechanic
            finishes and confirms the final cost.
          </p>
          <p className="text-[15px] font-['Albert_Sans:Bold',sans-serif] font-bold text-black mt-4">
            Your card will be securely held and only charged once your repair is
            complete.
          </p>
        </div>

        {loading && (
          <div className="w-full h-[250px] border border-gray-200 rounded-[12px] flex items-center justify-center bg-gray-50 mb-[60px]">
            <p className="text-[15px] text-gray-500">Loading secure payment form…</p>
          </div>
        )}

        {!loading && error && (
          <div className="w-full border border-red-200 rounded-[12px] bg-red-50 px-4 py-3 mb-[60px]">
            <p className="text-[14px] text-red-600">{error}</p>
            {errorCode === "job_not_payable" && (
              <Link
                href={buildSummaryUrl(jobId, token)}
                className="mt-3 inline-block text-[14px] font-['Albert_Sans:Bold',sans-serif] font-bold text-black underline"
              >
                Return to booking summary
              </Link>
            )}
          </div>
        )}

        {!loading && clientSecret && setupIntentId && (
          <StripeElementsProvider clientSecret={clientSecret}>
            <PaymentSetupForm
              jobId={jobId}
              token={token}
              setupIntentId={setupIntentId}
            />
          </StripeElementsProvider>
        )}
      </div>

      <Footer />
    </div>
  );
}
