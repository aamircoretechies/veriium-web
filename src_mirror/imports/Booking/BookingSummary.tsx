"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Footer from "../../../app/components/Footer";
import {
  BookingSummaryFetchError,
  canAccessBookingSummary,
  fetchBookingSummary,
  formatBookingScheduledTime,
  formatBookingServiceTypeLabel,
  formatBookingVehicleLabel,
} from "@/lib/bookings/poll-summary";
import type { BookingSummary as BookingSummaryData } from "@/types/api/booking-summary";

interface BookingSummaryProps {
  jobId: string;
  token: string;
}

function getMechanicInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "M";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function MechanicAvatar({
  name,
  profilePhotoUrl,
}: {
  name: string;
  profilePhotoUrl?: string;
}) {
  if (profilePhotoUrl) {
    return (
      <div className="w-[72px] h-[72px] rounded-full overflow-hidden shrink-0 bg-[#f0ebe4]">
        <img
          src={profilePhotoUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="w-[72px] h-[72px] rounded-full shrink-0 bg-[#ffa270] flex items-center justify-center">
      <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-white text-[24px] select-none">
        {getMechanicInitials(name)}
      </span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4 py-3 border-b border-[#f0f0f0] last:border-b-0">
      <span className="text-[14px] text-[#666] font-['Albert_Sans:Regular',sans-serif] shrink-0">
        {label}
      </span>
      <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[14px] text-black text-right">
        {value}
      </span>
    </div>
  );
}

export default function BookingSummary({ jobId, token }: BookingSummaryProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<BookingSummaryData | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    async function loadSummary() {
      setLoading(true);
      setError("");

      try {
        const data = await fetchBookingSummary(
          jobId,
          token,
          abortController.signal,
        );

        if (cancelled) {
          return;
        }

        if (!canAccessBookingSummary(data)) {
          router.replace(
            `/public/match?jobId=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`,
          );
          return;
        }

        setSummary(data);
      } catch (err) {
        if (cancelled || abortController.signal.aborted) {
          return;
        }

        if (err instanceof BookingSummaryFetchError) {
          if (
            err.code === "invalid_token" ||
            err.code === "booking_not_found"
          ) {
            router.replace("/public?error=invalid_link");
            return;
          }
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load booking summary. Please try again.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [jobId, router, token]);

  const handleContinueToPayment = () => {
    router.push(
      `/public/payment?jobId=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`,
    );
  };

  const mechanic = summary?.mechanic;

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

      <div className="flex-1 w-full max-w-[800px] mx-auto px-[24px] py-[60px] flex flex-col">
        <div className="w-full mb-[40px]">
          <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[32px] text-black mb-4">
            Review your booking
          </h1>
          <p className="text-[15px] text-[#444] leading-relaxed">
            Confirm your appointment details below. You&apos;ll add a payment
            method on the next step — nothing will be charged until your repair
            is complete.
          </p>
        </div>

        {loading && (
          <div className="w-full py-16 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-[2px] border-[#ffa270] border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="w-full border border-red-200 rounded-[12px] bg-red-50 px-4 py-3">
            <p className="text-[14px] text-red-600">{error}</p>
          </div>
        )}

        {!loading && summary && mechanic && (
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-[20px] border border-[#e8e8e8] shadow-[0px_4px_30px_0px_rgba(0,0,0,0.06)] p-6 sm:p-8">
              <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-black mb-2">
                Appointment details
              </h2>
              <DetailRow
                label="Vehicle"
                value={formatBookingVehicleLabel(summary)}
              />
              <DetailRow
                label="Service"
                value={formatBookingServiceTypeLabel(summary.serviceType)}
              />
              <DetailRow label="ZIP code" value={summary.zip ?? "—"} />
              <DetailRow
                label="Scheduled time"
                value={formatBookingScheduledTime(summary.scheduledTime)}
              />
            </div>

            <div className="bg-white rounded-[20px] border border-[#e8e8e8] shadow-[0px_4px_30px_0px_rgba(0,0,0,0.06)] p-6 sm:p-8">
              <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-black mb-4">
                Your mechanic
              </h2>
              <div className="flex items-center gap-4">
                <MechanicAvatar
                  name={mechanic.name}
                  profilePhotoUrl={mechanic.profilePhotoUrl}
                />
                <div>
                  <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
                    {mechanic.name}
                  </p>
                  {mechanic.certifiedStatus === "certified" ? (
                    <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[14px] text-[#555] mt-0.5">
                      ASE Certified
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleContinueToPayment}
                className="w-full max-w-[500px] bg-[#ffa270] rounded-[12px] py-4 font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] text-black hover:brightness-110 active:scale-[0.98] transition-all duration-150 shadow-sm cursor-pointer select-none"
              >
                Continue to payment
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
