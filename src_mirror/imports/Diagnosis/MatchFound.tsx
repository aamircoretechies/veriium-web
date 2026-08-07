"use client";

import { CheckCircle } from "lucide-react";
import type { ReactNode } from "react";

import Footer from "../../../app/components/Footer";
import {
  shouldShowMechanicMatchCard,
  type MatchUiPhase,
} from "@/lib/bookings/poll-summary";
import type { BookingSummary } from "@/types/api/booking-summary";

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

function getMechanicFirstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first || name;
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
      <div className="w-[180px] h-[200px] sm:w-[220px] sm:h-[240px] rounded-[14px] overflow-hidden shrink-0 bg-[#f0ebe4] mx-auto sm:mx-0">
        <img
          src={profilePhotoUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="w-[180px] h-[200px] sm:w-[220px] sm:h-[240px] rounded-[14px] shrink-0 bg-[#ffa270] mx-auto sm:mx-0 flex items-center justify-center">
      <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-white text-[48px] select-none">
        {getMechanicInitials(name)}
      </span>
    </div>
  );
}

function MechanicMatchCard({
  mechanic,
  onContinue,
}: {
  mechanic: NonNullable<BookingSummary["mechanic"]>;
  onContinue?: () => void;
}) {
  const firstName = getMechanicFirstName(mechanic.name);
  const isCertified = mechanic.certifiedStatus === "certified";

  return (
    <>
      <div>
        <h1 className="font-['Fustat:Bold',sans-serif] font-bold text-[28px] sm:text-[32px] text-black leading-tight mb-2">
          Match Found
        </h1>
        <p className="text-[15px] text-[#444] font-['Albert_Sans:Regular',sans-serif] leading-[1.7] max-w-[680px]">
          Good news! {mechanic.name} is a verified mechanic available near you
          ready to help fix your problem. See details below and click to
          continue.
        </p>
      </div>

      <div className="bg-white rounded-[20px] border border-[#e8e8e8] shadow-[0px_4px_30px_0px_rgba(0,0,0,0.06)] p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
          <MechanicAvatar
            name={mechanic.name}
            profilePhotoUrl={mechanic.profilePhotoUrl}
          />

          <div className="flex flex-col gap-3 flex-1">
            <div>
              <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[24px] sm:text-[28px] text-black">
                {mechanic.name}
              </h2>
              {isCertified ? (
                <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[14px] text-[#555] mt-0.5">
                  ASE Certified
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-[18px] h-[18px] text-[#34a853]" />
                <span className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#444]">
                  Background Checked
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-[18px] h-[18px] text-[#34a853]" />
                <span className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#444]">
                  Verified Parts Pricing
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-[18px] h-[18px] text-[#34a853]" />
                <span className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#444]">
                  Rated for Efficiency
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2.5 bg-[#fff3e8] border border-[#ffd9b8] rounded-[12px] px-5 py-3">
            <span className="text-[22px]">🏅</span>
            <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-black">
              Verified Pro
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-center max-w-[700px] mx-auto w-full">
        <button
          type="button"
          onClick={onContinue}
          className="w-full max-w-[500px] bg-[#ffa270] rounded-[12px] py-4 font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] text-black hover:brightness-110 active:scale-[0.98] transition-all duration-150 shadow-sm cursor-pointer select-none"
        >
          Continue with {firstName}
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
      if (summary && shouldShowMechanicMatchCard(summary)) {
        content = (
          <MechanicMatchCard
            mechanic={summary.mechanic!}
            onContinue={onContinue}
          />
        );
      } else {
        content = <SearchingForMechanic zip={summary?.zip} />;
      }
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
