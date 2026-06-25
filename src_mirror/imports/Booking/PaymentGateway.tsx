"use client";

import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { StripeElementsProvider } from "@/app/components/stripe/StripeElementsProvider";
import { Button } from "@/app/components/ui/button";
import type { PaymentSetupResponse } from "@/types/api/payment";

import Footer from "../../../app/components/Footer";

interface PaymentGatewayProps {
  jobId: string;
  token: string;
  onBack?: () => void;
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error?.message ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

function PaymentSetupForm({
  jobId,
  token,
}: {
  jobId: string;
  token: string;
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

    const returnUrl = `${window.location.origin}/public/confirmation/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`;

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

    router.push(
      `/public/confirmation/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`,
    );
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initSetupIntent() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/bookings/${encodeURIComponent(jobId)}/payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          if (!cancelled) {
            setError(await parseApiError(res));
          }
          return;
        }

        const data = (await res.json()) as PaymentSetupResponse;
        if (!cancelled) {
          setClientSecret(data.clientSecret);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to start payment setup. Please try again.");
        }
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
  }, [jobId, token]);

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
          </div>
        )}

        {!loading && clientSecret && (
          <StripeElementsProvider clientSecret={clientSecret}>
            <PaymentSetupForm jobId={jobId} token={token} />
          </StripeElementsProvider>
        )}
      </div>

      <Footer />
    </div>
  );
}
