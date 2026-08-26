"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { uploadToCloudinary } from "@/lib/cloudinary/upload";
import {
  DETAILS_MAX,
  EMAIL_MAX,
  FULL_NAME_MAX,
  MAKE_MAX,
  MODEL_MAX,
  OTP_LENGTH,
  PHONE_INPUT_MAX,
  VIN_OR_PLATE_MAX,
  ZIP_MAX,
  type BookingFormFieldErrors,
  firstBookingFieldError,
  formatPhoneInput,
  sanitizeDetailsInput,
  sanitizeEmailInput,
  sanitizeMakeInput,
  sanitizeModelInput,
  sanitizeNameInput,
  sanitizeOtpInput,
  sanitizeVehicleYearInput,
  sanitizeVinOrPlateInput,
  sanitizeZipInput,
  validateBookingFormFields,
} from "@/lib/bookings/booking-form";
import { saveScheduleLaterIntake } from "@/lib/bookings/schedule-later-intake";
import type { BookingResponse } from "@/types/api/booking";
import type { DiagnosisResponse } from "@/types/api/diagnosis";
import type { FixNowVsWait } from "@/types/airtable/enums";

const MAX_ATTACHMENTS = 5;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-[12px] text-red-500 mt-1 font-['Albert_Sans:Regular',sans-serif]">
      {message}
    </p>
  );
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error?.message ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

const URGENCY_BADGES: Partial<Record<FixNowVsWait, string>> = {
  now: "Fix now",
  soon: "Time-sensitive",
};

function formatCost(low: number, high: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return `${formatter.format(low)} – ${formatter.format(high)}`;
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
  const [fieldErrors, setFieldErrors] = useState<BookingFormFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cloudinaryConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  );

  function bookingValues() {
    return {
      name,
      zip,
      phone,
      email,
      year,
      make,
      model,
      vin,
      details,
      smsConsent,
      phoneConsent,
    };
  }

  function applyFieldErrors(errors: BookingFormFieldErrors): boolean {
    setFieldErrors(errors);
    const first = firstBookingFieldError(errors);
    if (first) {
      setError(first);
      return true;
    }
    setError("");
    return false;
  }

  function clearFieldError(field: keyof BookingFormFieldErrors) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleMediaSelect(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const remaining = MAX_ATTACHMENTS - attachmentUrls.length;
    if (remaining <= 0) {
      setUploadError(`You can add up to ${MAX_ATTACHMENTS} photos or videos.`);
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      setUploadError(`Only ${remaining} more item(s) can be added.`);
    } else {
      setUploadError("");
    }

    setUploadingMedia(true);
    try {
      const uploaded = await Promise.all(
        selected.map(async (file) => ({
          name: file.name,
          url: await uploadToCloudinary(file),
        })),
      );
      setAttachmentUrls((current) => [
        ...current,
        ...uploaded.map((item) => item.url),
      ]);
      setAttachmentNames((current) => [
        ...current,
        ...uploaded.map((item) => item.name),
      ]);
    } catch {
      setUploadError("Failed to upload file. Please try again.");
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleRemoveAttachment(index: number) {
    setAttachmentUrls((current) => current.filter((_, i) => i !== index));
    setAttachmentNames((current) => current.filter((_, i) => i !== index));
    setUploadError("");
  }

  async function handleSendCode() {
    const errors = validateBookingFormFields(bookingValues(), {
      requireContact: true,
      requireConsents: true,
    });
    if (applyFieldErrors(errors)) {
      return;
    }
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
    const errors = validateBookingFormFields(
      { ...bookingValues(), verificationCode },
      {
        requireContact: true,
        requireConsents: true,
        requireOtp: true,
      },
    );
    if (applyFieldErrors(errors)) {
      return;
    }
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
          ...(attachmentUrls.length ? { attachmentUrls } : {}),
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
      const accessToken = jobUrl.searchParams.get("token");
      if (!accessToken) {
        setError("Unable to continue to matching. Please try again.");
        return;
      }
      router.push(
        `/public/match?jobId=${encodeURIComponent(data.jobId)}&token=${encodeURIComponent(accessToken)}`,
      );
    } catch {
      setError("Unable to complete your booking. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleScheduleLaterClick() {
    const errors = validateBookingFormFields(bookingValues(), {
      requireContact: false,
      requireConsents: false,
    });
    if (applyFieldErrors(errors)) {
      return;
    }

    const vehicle =
      year.trim() || make.trim() || model.trim() || vin.trim()
        ? {
            ...(year.trim() ? { year: Number(year.trim()) } : {}),
            ...(make.trim() ? { make: make.trim() } : {}),
            ...(model.trim() ? { model: model.trim() } : {}),
            ...(vin.trim() ? { vin: vin.trim() } : {}),
          }
        : undefined;

    saveScheduleLaterIntake({
      diagnosisId: diagnosis.diagnosisId,
      serviceType,
      name: name.trim() || undefined,
      zip: zip.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      additionalDetails: details.trim() || undefined,
      ...(attachmentUrls.length ? { attachmentUrls } : {}),
      ...(vehicle ? { vehicle } : {}),
    });
    router.push("/public/schedule-later");
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
              {diagnosis.title}
            </span>
            {URGENCY_BADGES[diagnosis.fix_now_vs_wait] && (
              <span className="bg-[#ffd84d] text-black text-[12px] font-['Albert_Sans:Bold',sans-serif] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                {URGENCY_BADGES[diagnosis.fix_now_vs_wait]}
              </span>
            )}
          </div>

          <p className="text-[15px] text-[#444] font-['Albert_Sans:Regular',sans-serif] leading-[1.75] mb-5">
            {diagnosis.explanation} A verified mechanic will confirm the
            diagnosis before any work begins.
          </p>

          <div className="mb-5">
            <p className="text-[15px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-2">
              What does this mean for you?
            </p>
            <ul className="list-disc ml-5 text-[15px] text-[#444] font-['Albert_Sans:Regular',sans-serif] leading-[1.9] space-y-0.5">
              <li>
                If{" "}
                <strong className="text-black font-semibold">
                  addressed soon
                </strong>
                : {diagnosis.if_addressed}
              </li>
              <li>
                If{" "}
                <strong className="text-black font-semibold">ignored</strong>:{" "}
                {diagnosis.if_ignored}
              </li>
            </ul>
          </div>

          <div className="mb-5">
            <p className="text-[15px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1">
              Can I keep driving?
            </p>
            <p className="text-[15px] text-[#444] font-['Albert_Sans:Regular',sans-serif] leading-[1.75]">
              {diagnosis.driveability_answer}
            </p>
          </div>

          <p className="text-[14px] text-[#888] font-['Albert_Sans:Regular',sans-serif] leading-[1.6]">
            Include additional details about this issue and add your zip code to
            be matched with a trusted mechanic near you.
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
                autoComplete="name"
                maxLength={FULL_NAME_MAX}
                placeholder="John Smith"
                value={name}
                aria-invalid={!!fieldErrors.name}
                onChange={(e) => {
                  setName(sanitizeNameInput(e.target.value));
                  clearFieldError("name");
                }}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
              />
              <FieldError message={fieldErrors.name} />
            </div>
            <div>
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                Zip Code <span className="text-[#e44]">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={ZIP_MAX}
                placeholder="30043"
                value={zip}
                aria-invalid={!!fieldErrors.zip}
                onChange={(e) => {
                  setZip(sanitizeZipInput(e.target.value));
                  clearFieldError("zip");
                }}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
              />
              <FieldError message={fieldErrors.zip} />
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
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={PHONE_INPUT_MAX}
                  placeholder="(000) 000-0000"
                  value={phone}
                  aria-invalid={!!fieldErrors.phone}
                  onChange={(e) => {
                    setPhone(formatPhoneInput(e.target.value));
                    clearFieldError("phone");
                  }}
                  className="flex-1 min-w-0 border border-[#d2d2d2] rounded-r-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
                />
              </div>
              <FieldError message={fieldErrors.phone} />
            </div>
            <div>
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                Email <span className="text-[#aaa] font-normal">(optional)</span>
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={EMAIL_MAX}
                placeholder="johnsmith@gmail.com"
                value={email}
                aria-invalid={!!fieldErrors.email}
                onChange={(e) => {
                  setEmail(sanitizeEmailInput(e.target.value));
                  clearFieldError("email");
                }}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
              />
              <FieldError message={fieldErrors.email} />
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
                inputMode="numeric"
                maxLength={4}
                placeholder="e.g. 2018"
                value={year}
                aria-invalid={!!fieldErrors.year}
                onChange={(e) => {
                  setYear(sanitizeVehicleYearInput(e.target.value));
                  clearFieldError("year");
                }}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
              />
              <FieldError message={fieldErrors.year} />
            </div>
            <div>
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                Make <span className="text-[#aaa] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                maxLength={MAKE_MAX}
                placeholder="e.g. Toyota"
                value={make}
                aria-invalid={!!fieldErrors.make}
                onChange={(e) => {
                  setMake(sanitizeMakeInput(e.target.value));
                  clearFieldError("make");
                }}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
              />
              <FieldError message={fieldErrors.make} />
            </div>
            <div>
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                Model <span className="text-[#aaa] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                maxLength={MODEL_MAX}
                placeholder="e.g. Camry"
                value={model}
                aria-invalid={!!fieldErrors.model}
                onChange={(e) => {
                  setModel(sanitizeModelInput(e.target.value));
                  clearFieldError("model");
                }}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
              />
              <FieldError message={fieldErrors.model} />
            </div>
            <div>
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                VIN/License Plate No. <span className="text-[#aaa] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                maxLength={VIN_OR_PLATE_MAX}
                placeholder="Optional"
                value={vin}
                aria-invalid={!!fieldErrors.vin}
                onChange={(e) => {
                  setVin(sanitizeVinOrPlateInput(e.target.value));
                  clearFieldError("vin");
                }}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
              />
              <FieldError message={fieldErrors.vin} />
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
              maxLength={DETAILS_MAX}
              aria-invalid={!!fieldErrors.details}
              onChange={(e) => {
                setDetails(sanitizeDetailsInput(e.target.value));
                clearFieldError("details");
              }}
              rows={4}
              className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 resize-none font-['Albert_Sans:Regular',sans-serif]"
            />
            <div className="flex items-start justify-between gap-2 mt-1">
              <FieldError message={fieldErrors.details} />
              <p className="text-[11px] text-[#aaa] font-['Albert_Sans:Regular',sans-serif] ml-auto">
                {details.length}/{DETAILS_MAX}
              </p>
            </div>
          </div>

          {/* Photos/Videos */}
          <div className="mb-6">
            <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
              Photos/Videos <span className="text-[#aaa] font-normal">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => void handleMediaSelect(e.target.files)}
            />
            <div className="flex items-center w-full max-w-[320px]">
              <div className="flex-1 border border-[#d2d2d2] rounded-l-[8px] border-r-0 px-4 py-2 bg-white flex items-center h-[42px] min-w-0">
                <span className="text-[#aaa] text-[14px] font-['Albert_Sans:Light',sans-serif] truncate">
                  {attachmentUrls.length > 0
                    ? `${attachmentUrls.length} of ${MAX_ATTACHMENTS} added`
                    : "Add up to 5 items"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingMedia || attachmentUrls.length >= MAX_ATTACHMENTS}
                className="bg-[#ffa270] text-black font-['Albert_Sans:Bold',sans-serif] font-bold text-[14px] px-6 rounded-[8px] hover:brightness-110 transition-all h-[42px] -ml-2 relative z-10 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {uploadingMedia ? "Uploading…" : "Upload"}
              </button>
            </div>
            {!cloudinaryConfigured && (
              <p className="text-[12px] text-[#888] mt-1.5 font-['Albert_Sans:Regular',sans-serif]">
                Staging: uploads use a placeholder image when Cloudinary is not configured.
              </p>
            )}
            {attachmentNames.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {attachmentNames.map((fileName, index) => (
                  <li
                    key={`${fileName}-${index}`}
                    className="flex items-center justify-between gap-2 text-[13px] text-[#555] font-['Albert_Sans:Regular',sans-serif]"
                  >
                    <span className="truncate">{fileName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-[#888] hover:text-black shrink-0 bg-transparent border-none cursor-pointer p-0"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {uploadError && (
              <p className="text-[13px] text-red-500 font-['Albert_Sans:Regular',sans-serif] mt-1.5">
                {uploadError}
              </p>
            )}
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
                className={`border-2 rounded-[12px] p-5 text-left transition-all duration-150 cursor-pointer ${serviceType === "onsite"
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
                className={`border-2 rounded-[12px] p-5 text-left transition-all duration-150 cursor-pointer ${serviceType === "dropoff"
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
                onChange={(e) => {
                  setSmsConsent(e.target.checked);
                  clearFieldError("smsConsent");
                }}
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
                onChange={(e) => {
                  setPhoneConsent(e.target.checked);
                  clearFieldError("phoneConsent");
                }}
                className="mt-[3px] accent-[#ffa270] shrink-0"
              />
              <span className="text-[13px] text-[#555] font-['Albert_Sans:Regular',sans-serif] leading-[1.5]">
                I understand that providing my phone number will automatically create an account in Veriium *
              </span>
            </label>
            <FieldError message={fieldErrors.smsConsent || fieldErrors.phoneConsent} />
          </div>

          {otpSent && (
            <div className="mb-4">
              <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                Verification code <span className="text-[#e44]">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern={`\\d{${OTP_LENGTH}}`}
                maxLength={OTP_LENGTH}
                placeholder="000000"
                value={verificationCode}
                aria-invalid={!!fieldErrors.verificationCode}
                onChange={(e) => {
                  setVerificationCode(sanitizeOtpInput(e.target.value));
                  clearFieldError("verificationCode");
                }}
                className="w-full max-w-[200px] border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 tracking-[0.3em] text-center font-['Albert_Sans:Regular',sans-serif]"
                autoFocus
              />
              <FieldError message={fieldErrors.verificationCode} />
              <p className="text-[12px] text-[#888] mt-1.5 font-['Albert_Sans:Regular',sans-serif]">
                Enter the 6-digit code sent to your phone.
              </p>
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setVerificationCode("");
                  setError("");
                  clearFieldError("verificationCode");
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
              onClick={handleScheduleLaterClick}
              disabled={loading || uploadingMedia}
              className="flex-1 bg-[#ebebeb] hover:bg-[#e0e0e0] border border-black rounded-[10px] py-3.5 font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-black hover:brightness-105 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer text-center disabled:opacity-70"
            >
              Schedule Later
            </button>
            <button
              type="button"
              onClick={handleFindMechanicClick}
              disabled={loading || uploadingMedia}
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
