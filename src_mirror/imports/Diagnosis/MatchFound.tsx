"use client";

import type { ReactNode } from "react";

import Footer from "../../../app/components/Footer";
import type { BookingSummary } from "@/types/api/booking-summary";
import type { MatchUiPhase } from "@/lib/bookings/poll-summary";

export type { MatchUiPhase };

interface MatchFoundProps {
  phase: MatchUiPhase;
  summary?: BookingSummary;
  errorMessage?: string;
  onBack: () => void;
  onContinue?: () => void;
  onGoHome?: () => void;
}

function MatchPageShell({
  onBack,
  children,
}: {
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="w-full flex items-center justify-between px-[24px] sm:px-[80px] py-[28px] border-b border-[#f0f0f0]">
        <span
          className="font-['Inter:Bold',sans-serif] font-bold text-[28px] text-black tracking-[0.1px] cursor-pointer"
          onClick={onBack}
        >
          VERIIUM
        </span>
        <div className="flex items-center gap-[24px]" />
      </div>

      <div className="flex-1 w-full max-w-[980px] mx-auto px-[24px] sm:px-[40px] py-[40px] sm:py-[50px] flex flex-col gap-[28px]">
        {children}
      </div>

      <Footer onLinkClick={onBack} />
    </div>
  );
}

function SearchingForMechanic({ zip }: { zip?: string }) {
  const locationLabel = zip?.trim() ? zip.trim() : "your area";

  return (
    <div className="flex flex-col items-center py-8">
      <div className="w-16 h-16 rounded-full border-[2px] border-[#ffa270] border-t-transparent animate-spin mb-6" />

      <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-black mb-3">
        Finding available mechanics near {locationLabel}...
      </p>

      <p className="font-['Albert_Sans:Regular',sans-serif] text-[15px] text-[#444] text-center max-w-[560px] leading-[1.7]">
        <strong className="font-bold text-black">
          We&apos;re contacting nearby verified mechanics.
        </strong>{" "}
        Please stay on this page or you will be notified via text message when
        you are matched with a mechanic.
      </p>
    </div>
  );
}

function MatchedShell({ onContinue }: { onContinue?: () => void }) {
  return (
    <>
      <div>
        <h1 className="font-['Fustat:Bold',sans-serif] font-bold text-[28px] sm:text-[32px] text-black leading-tight mb-2">
          Match Found
        </h1>
        <p className="text-[15px] text-[#444] font-['Albert_Sans:Regular',sans-serif] leading-[1.7] max-w-[680px]">
          A verified mechanic accepted your job. Click continue to proceed with
          your booking.
        </p>
      </div>

      <div className="flex justify-center max-w-[700px] mx-auto w-full">
        <button
          type="button"
          onClick={onContinue}
          className="w-full max-w-[500px] bg-[#ffa270] rounded-[12px] py-4 font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] text-black hover:brightness-110 active:scale-[0.98] transition-all duration-150 shadow-sm cursor-pointer select-none"
        >
          Continue
        </button>
      </div>
    </>
  );
}

function Tier4Message() {
  return (
    <div className="flex flex-col items-center py-8 text-center max-w-[560px] mx-auto">
      <h1 className="font-['Fustat:Bold',sans-serif] font-bold text-[28px] sm:text-[32px] text-black leading-tight mb-4">
        Still searching
      </h1>
      <p className="font-['Albert_Sans:Regular',sans-serif] text-[15px] text-[#444] leading-[1.7]">
        We&apos;re still finding the right mechanic for your job. We&apos;ll
        text you with an update within 1 hour.
      </p>
    </div>
  );
}

function StatusMessage({
  title,
  message,
  onGoHome,
}: {
  title: string;
  message: string;
  onGoHome?: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-8 text-center max-w-[560px] mx-auto gap-6">
      <div>
        <h1 className="font-['Fustat:Bold',sans-serif] font-bold text-[28px] sm:text-[32px] text-black leading-tight mb-4">
          {title}
        </h1>
        <p className="font-['Albert_Sans:Regular',sans-serif] text-[15px] text-[#444] leading-[1.7]">
          {message}
        </p>
      </div>
      {onGoHome ? (
        <button
          type="button"
          onClick={onGoHome}
          className="w-full max-w-[500px] bg-[#ffa270] rounded-[12px] py-4 font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] text-black hover:brightness-110 active:scale-[0.98] transition-all duration-150 shadow-sm cursor-pointer select-none"
        >
          Back to home
        </button>
      ) : null}
    </div>
  );
}

export default function MatchFound({
  phase,
  summary,
  errorMessage,
  onBack,
  onContinue,
  onGoHome,
}: MatchFoundProps) {
  let content: ReactNode;

  switch (phase) {
    case "loading":
      content = <SearchingForMechanic zip={summary?.zip} />;
      break;
    case "searching":
      content = <SearchingForMechanic zip={summary?.zip} />;
      break;
    case "matched":
      content = <MatchedShell onContinue={onContinue} />;
      break;
    case "tier4":
      content = <Tier4Message />;
      break;
    case "cancelled":
      content = (
        <StatusMessage
          title="Booking cancelled"
          message="This booking is no longer active. You can start a new request from the home page."
          onGoHome={onGoHome}
        />
      );
      break;
    case "terminal":
      content = (
        <StatusMessage
          title="Unable to continue"
          message={
            errorMessage ??
            "This booking isn't available for matching. Please start a new request from the home page."
          }
          onGoHome={onGoHome}
        />
      );
      break;
  }

  return <MatchPageShell onBack={onBack}>{content}</MatchPageShell>;
}
