"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GWINNETT_ZIP_CODES } from "@/lib/constants/gwinnett-zips";
import type { BookingResponse } from "@/types/api/booking";
import type { DiagnosisResponse } from "@/types/api/diagnosis";
import type {
  DiagnosisCategory,
  Driveability,
  FixNowVsWait,
} from "@/types/airtable/enums";

const GWINNETT_ZIP_SET = new Set<string>(GWINNETT_ZIP_CODES);

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error?.message ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

const CATEGORY_LABELS: Record<DiagnosisCategory, string> = {
  battery_starting: "Battery & Starting",
  brakes: "Brakes",
  oil_maintenance: "Oil & Maintenance",
  engine_diagnostics: "Engine",
  transmission: "Transmission",
  tires_wheels: "Tires & Wheels",
  electrical: "Electrical",
  ac_heating: "A/C & Heating",
  suspension_steering: "Suspension & Steering",
  exhaust: "Exhaust",
  fuel_system: "Fuel System",
  general_maintenance: "General Maintenance",
  unknown: "General",
};

const URGENCY_BADGES: Partial<Record<FixNowVsWait, string>> = {
  now: "Fix now",
  soon: "Time-sensitive",
};

const DRIVEABILITY_TEXT: Record<Driveability, string> = {
  safe: "Your vehicle appears safe to drive for now, but have a mechanic verify the issue soon.",
  caution: "Short trips may be possible, but continued driving increases the risk of further damage.",
  do_not_drive: "Do not drive this vehicle until a mechanic inspects it.",
};

function formatCost(low: number, high: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return `${formatter.format(low)} – ${formatter.format(high)}`;
}

function splitSummary(summary: string): { title: string; body: string } {
  const match = summary.match(/^(.+?[.!?])\s+([\s\S]+)$/);
  if (match) {
    return { title: match[1], body: match[2] };
  }
  return { title: summary, body: "" };
}

interface DiagnosticModalProps {
  diagnosis: DiagnosisResponse;
  onClose: () => void;
  onFindMechanic?: () => void;
}

export default function DiagnosticModal({
  diagnosis,
  onClose,
  onFindMechanic,
}: DiagnosticModalProps) {
  const router = useRouter();
  const [serviceType, setServiceType] = useState<"onsite" | "dropoff">("onsite");
  const [name, setName] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [phoneConsent, setPhoneConsent] = useState(false);
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [vin, setVin] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { title: diagnosisTitle, body: diagnosisBody } = splitSummary(diagnosis.summary);

  function validateForm(): string | null {
    if (!name.trim()) return "Please enter your name.";
    const zipTrimmed = zip.trim();
    if (!/^\d{5}$/.test(zipTrimmed)) return "ZIP code must be 5 digits.";
    if (!GWINNETT_ZIP_SET.has(zipTrimmed)) {
      return "This ZIP code is outside our current service area.";
    }
    if (!phone.trim()) return "Please enter your phone number.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Please enter a valid email address.";
    }
    if (year.trim()) {
      const yearNum = Number(year.trim());
      if (!Number.isInteger(yearNum) || yearNum <= 0) {
        return "Please enter a valid vehicle year.";
      }
    }
    if (!smsConsent) return "Please agree to receive request-related SMS texts.";
    if (!phoneConsent) {
      return "Please acknowledge that providing your phone number creates a Veriium account.";
    }
    return null;
  }

  async function handleSendCode() {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/driver/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        setError(await parseApiError(res));
        return;
      }

      setOtpSent(true);
      setVerificationCode("");
    } catch {
      setError("Unable to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitBooking() {
    if (!/^\d{6}$/.test(verificationCode)) {
      setError("Please enter the 6-digit code we sent to your phone.");
      return;
    }

    setError("");
    setLoading(true);

    const vehicle =
      year.trim() || make.trim() || model.trim() || vin.trim()
        ? {
            ...(year.trim() ? { year: Number(year.trim()) } : {}),
            ...(make.trim() ? { make: make.trim() } : {}),
            ...(model.trim() ? { model: model.trim() } : {}),
            ...(vin.trim() ? { vin: vin.trim() } : {}),
          }
        : undefined;

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosisId: diagnosis.diagnosisId,
          name: name.trim(),
          zip: zip.trim(),
          phone,
          ...(email.trim() ? { email: email.trim() } : {}),
          serviceType,
          ...(vehicle ? { vehicle } : {}),
          ...(details.trim() ? { additionalDetails: details.trim() } : {}),
          smsConsent: true,
          phoneConsent: true,
          verificationCode,
        }),
      });

      if (!res.ok) {
        setError(await parseApiError(res));
        return;
      }

      const data = (await res.json()) as BookingResponse;
      onFindMechanic?.();
      const jobUrl = new URL(data.signedUrl);
      router.push(`${jobUrl.pathname}${jobUrl.search}`);
    } catch {
      setError("Unable to complete your booking. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleFindMechanicClick() {
    if (otpSent) {
      void handleSubmitBooking();
    } else {
      void handleSendCode();
    }
  }

  return (
    <div id="diagnostic-form" className="bg-white rounded-[24px] shadow-[1px_4px_32px_0px_rgba(0,0,0,0.1)] w-full shrink-0 overflow-hidden">
      {/* Header with close */}
      <div className="flex items-start justify-between px-6 sm:px-10 pt-6 sm:pt-10 pb-2">
        <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[18px] sm:text-[22px] text-black leading-tight">
          Based on the entered issue, your diagnosis is:
        </p>
        <button
          onClick={onClose}
          className="text-[#888] hover:text-black text-[26px] leading-none transition-colors duration-150 ml-6 shrink-0 mt-1 cursor-pointer"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="px-6 sm:px-10 pb-6 sm:pb-10 flex flex-col gap-6">
        {diagnosis.safety_flag && diagnosis.safety_message && (
          <div className="bg-[#fff3ee] border border-[#ff6b35] rounded-[12px] px-4 py-3">
            <p className="text-[15px] text-[#b33a00] font-['Albert_Sans:SemiBold',sans-serif] font-semibold leading-[1.5]">
              {diagnosis.safety_message}
            </p>
          </div>
        )}

        {/* Diagnosis Card */}
        <div className="bg-[#f7f7f7] rounded-[14px] p-4 sm:p-6 border border-[#ebebeb]">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] sm:text-[20px] text-black">
              {diagnosisTitle}
            </span>
            {URGENCY_BADGES[diagnosis.fix_now_vs_wait] && (
              <span className="bg-[#FF6B35] text-white text-[12px] font-['Albert_Sans:Bold',sans-serif] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                {URGENCY_BADGES[diagnosis.fix_now_vs_wait]}
              </span>
            )}
            <span className="bg-[#e8e8e8] text-[#444] text-[12px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold px-3 py-1 rounded-full whitespace-nowrap">
              {CATEGORY_LABELS[diagnosis.category]}
            </span>
          </div>

          <p className="text-[15px] text-[#444] font-['Albert_Sans:Regular',sans-serif] leading-[1.7] mb-4">
            {diagnosisBody ? `${diagnosisBody} ` : ""}
            A verified mechanic will confirm the diagnosis before any work begins.
          </p>

          <div className="mb-4">
            <p className="text-[15px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1">
              Can I keep driving?
            </p>
            <p className="text-[15px] text-[#444] font-['Albert_Sans:Regular',sans-serif] leading-[1.7]">
              {DRIVEABILITY_TEXT[diagnosis.driveability]}
            </p>
          </div>

          <p className="text-[14px] text-[#888] font-['Albert_Sans:Regular',sans-serif] leading-[1.6] italic">
            Include additional details about this issue and add your zip code to be matched with a trusted mechanic near you.
          </p>
        </div>

        {/* Estimated Repair Cost */}
        <div className="bg-[#f7f7f7] rounded-[12px] px-4 sm:px-6 py-3 sm:py-4 border border-[#ebebeb]">
          <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[15px] sm:text-[16px] text-black">
            Estimated repair cost:{" "}
            <span className="text-[#222]">
              {formatCost(diagnosis.cost_estimate_low, diagnosis.cost_estimate_high)}
            </span>
          </p>
          <p className="text-[12px] text-[#aaa] font-['Albert_Sans:Regular',sans-serif] mt-0.5">
            Final cost is confirmed by mechanic before any work begins.
          </p>
        </div>

        {/* Divider */}
        <hr className="border-[#eee] my-1" />

        {/* Share More */}
        <div>
          <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-black mb-4">
            Share more:
          </p>

          {/* Name / Zip / Phone / Email row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                Name <span className="text-[#e44]">*</span>
              </label>
              <input
                type="text"
                placeholder="John"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                Zip Code <span className="text-[#e44]">*</span>
              </label>
              <input
                type="text"
                placeholder="200100"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                Phone Number <span className="text-[#e44]">*</span>
              </label>
              <div className="flex">
                <span className="flex items-center border border-r-0 border-[#d2d2d2] rounded-l-[8px] px-2.5 text-[14px] text-[#888] bg-[#f9f9f9] font-['Albert_Sans:Regular',sans-serif] select-none whitespace-nowrap gap-1">
                  +1 🇺🇸
                </span>
                <input
                  type="tel"
                  placeholder="(000) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 min-w-0 border border-[#d2d2d2] rounded-r-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
                />
              </div>
              <p className="text-[11px] text-[#aaa] mt-1 font-['Albert_Sans:Regular',sans-serif]">
                ⓘ Only is the standard
              </p>
            </div>
            <div>
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                Email <span className="text-[#aaa] font-normal">(optional)</span>
              </label>
              <input
                type="email"
                placeholder="johnsmith@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
              />
            </div>
          </div>

          {/* Vehicle Details row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                Year <span className="text-[#aaa] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 2018"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                Make <span className="text-[#aaa] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Toyota"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                Model <span className="text-[#aaa] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Camry"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                VIN/License Plate No. <span className="text-[#aaa] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
              />
            </div>
          </div>

          {/* Details */}
          <div className="mb-6">
            <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
              Details <span className="text-[#aaa] font-normal">(optional)</span>
            </label>
            <textarea
              placeholder="Add any other details about this issue"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 resize-none font-['Albert_Sans:Regular',sans-serif]"
            />
          </div>

          {/* Photos/Videos */}
          <div className="mb-6">
            <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
              Photos/Videos <span className="text-[#aaa] font-normal">(optional)</span>
            </label>
            <div className="flex items-center w-full max-w-[320px]">
              <div className="flex-1 border border-[#d2d2d2] rounded-l-[8px] border-r-0 px-4 py-2 bg-white flex items-center h-[42px]">
                <span className="text-[#aaa] text-[14px] font-['Albert_Sans:Light',sans-serif]">Add up to 5 items</span>
              </div>
              <button
                type="button"
                className="bg-[#ffa270] text-black font-['Albert_Sans:Bold',sans-serif] font-bold text-[14px] px-6 rounded-[8px] hover:brightness-110 transition-all h-[42px] -ml-2 relative z-10 cursor-pointer"
              >
                Upload
              </button>
            </div>
          </div>

          {/* Service type */}
          <div className="mb-6">
            <p className="text-[14px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-3">
              Would you like to drop off your car or schedule a pick up?{" "}
              <span className="text-[#e44]">*</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[500px]">
              <button
                type="button"
                onClick={() => setServiceType("onsite")}
                className={`border-2 rounded-[12px] p-5 text-left transition-all duration-150 cursor-pointer ${
                  serviceType === "onsite"
                    ? "border-[#ffa270] bg-[#fff8f5]"
                    : "border-[#e0e0e0] bg-white hover:border-[#ffa270]/50"
                }`}
              >
                <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-black mb-1">
                  On-site repair
                </p>
                <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[13px] text-[#666] leading-[1.5]">
                  A mechanic comes to your location to repair your car
                </p>
              </button>
              <button
                type="button"
                onClick={() => setServiceType("dropoff")}
                className={`border-2 rounded-[12px] p-5 text-left transition-all duration-150 cursor-pointer ${
                  serviceType === "dropoff"
                    ? "border-[#ffa270] bg-[#fff8f5]"
                    : "border-[#e0e0e0] bg-white hover:border-[#ffa270]/50"
                }`}
              >
                <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-black mb-1">
                  Drop off car
                </p>
                <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[13px] text-[#666] leading-[1.5]">
                  Drop your car off yourself to a nearby mechanic shop
                </p>
              </button>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-[#eee] my-2" />

          {/* Consents */}
          <div className="flex flex-col gap-2.5 mb-6 mt-4">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
                className="mt-[3px] accent-[#ffa270] shrink-0"
              />
              <span className="text-[13px] text-[#555] font-['Albert_Sans:Regular',sans-serif] leading-[1.5]">
                I agree to receive request-related SMS texts from Veriium *
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={phoneConsent}
                onChange={(e) => setPhoneConsent(e.target.checked)}
                className="mt-[3px] accent-[#ffa270] shrink-0"
              />
              <span className="text-[13px] text-[#555] font-['Albert_Sans:Regular',sans-serif] leading-[1.5]">
                I understand that providing my phone number will automatically create an account in Veriium *
              </span>
            </label>
          </div>

          {otpSent && (
            <div className="mb-4">
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                Verification code <span className="text-[#e44]">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="w-full max-w-[200px] border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 tracking-[0.3em] text-center font-['Albert_Sans:Regular',sans-serif]"
                autoFocus
              />
              <p className="text-[12px] text-[#888] mt-1.5 font-['Albert_Sans:Regular',sans-serif]">
                Enter the 6-digit code sent to your phone.
              </p>
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setVerificationCode("");
                  setError("");
                }}
                className="text-[12px] text-[#888] hover:text-black transition-colors mt-1 bg-transparent border-none cursor-pointer p-0 font-['Albert_Sans:Regular',sans-serif]"
              >
                Use a different phone number
              </button>
            </div>
          )}

          {error && (
            <p className="text-[13px] text-red-500 font-['Albert_Sans:Regular',sans-serif] mb-2">
              {error}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mt-4 w-full max-w-[500px]">
            <button
              type="button"
              onClick={() => router.push('/public/schedule-later')}
              disabled={loading}
              className="flex-1 bg-[#ebebeb] hover:bg-[#e0e0e0] border border-black rounded-[10px] py-3.5 font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-black hover:brightness-105 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer text-center disabled:opacity-70"
            >
              Schedule Later
            </button>
            <button
              type="button"
              onClick={handleFindMechanicClick}
              disabled={loading}
              className="flex-1 bg-[#ffa270] rounded-[10px] py-3.5 font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-black hover:brightness-110 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer text-center disabled:opacity-70"
            >
              {loading
                ? otpSent
                  ? "Booking…"
                  : "Sending code…"
                : otpSent
                  ? "Confirm & Book"
                  : "Find Mechanic Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
