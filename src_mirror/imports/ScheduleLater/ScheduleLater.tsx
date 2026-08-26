"use client";
import React, { useEffect, useState } from "react";
import Footer from "../../../app/components/Footer";
import PublicHeader from "@/app/components/PublicHeader";
import {
  EMAIL_MAX,
  FULL_NAME_MAX,
  OTP_LENGTH,
  PHONE_INPUT_MAX,
  ZIP_MAX,
  type BookingFormFieldErrors,
  daysInMonth,
  firstBookingFieldError,
  formatPhoneInput,
  sanitizeEmailInput,
  sanitizeNameInput,
  sanitizeOtpInput,
  sanitizeZipInput,
  validateBookingFormFields,
} from "@/lib/bookings/booking-form";
import {
  clearScheduleLaterIntake,
  readScheduleLaterIntake,
  type ScheduleLaterIntake,
} from "@/lib/bookings/schedule-later-intake";
import { formatScheduledTimeForDisplay } from "@/lib/bookings/scheduled-time";
import type { BookingResponse } from "@/types/api/booking";

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

export default function ScheduleLater() {
  const [intake, setIntake] = useState<ScheduleLaterIntake | null>(null);
  const [name, setName] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [phoneConsent, setPhoneConsent] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<BookingFormFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [scheduledTimeLabel, setScheduledTimeLabel] = useState("");

  useEffect(() => {
    const saved = readScheduleLaterIntake();
    if (!saved?.diagnosisId) {
      setError("Start with a diagnosis before scheduling for later.");
      return;
    }

    setIntake(saved);
    setName(sanitizeNameInput(saved.name ?? ""));
    setZip(sanitizeZipInput(saved.zip ?? ""));
    setPhone(formatPhoneInput(saved.phone ?? ""));
    setEmail(sanitizeEmailInput(saved.email ?? ""));
  }, []);

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

  function validateForm(): boolean {
    if (!intake?.diagnosisId) {
      setError("Start with a diagnosis before scheduling for later.");
      return false;
    }
    const errors = validateBookingFormFields(
      {
        name,
        zip,
        phone,
        email,
        smsConsent,
        phoneConsent,
        month,
        day,
        time,
      },
      {
        requireContact: true,
        requireConsents: true,
        requireScheduleSlot: true,
      },
    );
    return !applyFieldErrors(errors);
  }

  async function handleSendCode() {
    if (!validateForm()) {
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
    if (!intake?.diagnosisId) {
      setError("Start with a diagnosis before scheduling for later.");
      return;
    }

    const errors = validateBookingFormFields(
      {
        name,
        zip,
        phone,
        email,
        smsConsent,
        phoneConsent,
        month,
        day,
        time,
        verificationCode,
      },
      {
        requireContact: true,
        requireConsents: true,
        requireScheduleSlot: true,
        requireOtp: true,
      },
    );
    if (applyFieldErrors(errors)) {
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosisId: intake.diagnosisId,
          name: name.trim(),
          zip: zip.trim(),
          phone,
          ...(email.trim() ? { email: email.trim() } : {}),
          serviceType: intake.serviceType,
          ...(intake.vehicle ? { vehicle: intake.vehicle } : {}),
          ...(intake.additionalDetails
            ? { additionalDetails: intake.additionalDetails }
            : {}),
          ...(intake.attachmentUrls?.length
            ? { attachmentUrls: intake.attachmentUrls }
            : {}),
          scheduleSlot: {
            month: Number(month),
            day: Number(day),
            time,
          },
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
      clearScheduleLaterIntake();
      setScheduledTimeLabel(
        data.scheduledTime
          ? formatScheduledTimeForDisplay(data.scheduledTime)
          : "",
      );
      setIsSubmitted(true);
    } catch {
      setError("Unable to schedule your request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otpSent) {
      void handleSubmitBooking();
    } else {
      void handleSendCode();
    }
  }

  return (
    <div className="bg-white min-h-screen flex flex-col w-full overflow-x-hidden">
      <PublicHeader />

      <main className="flex-1 flex justify-center items-center px-4 sm:px-6 py-12 sm:py-24 w-full">
        {isSubmitted ? (
          <div className="w-full max-w-[800px] flex flex-col items-center justify-center text-center p-8 sm:p-12 min-h-[300px]">
            <div className="mb-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[22px] sm:text-[24px] text-black mb-4">
              You&apos;re all set!
            </h1>

            <p className="font-['Albert_Sans:Regular',sans-serif] font-semibold text-[14px] sm:text-[15px] text-black">
              {scheduledTimeLabel
                ? `You will be notified of your match via text message ${scheduledTimeLabel}.`
                : "You will be notified of your match via text message at your scheduled time."}
            </p>
          </div>
        ) : (
          <div className="w-full max-w-[800px] bg-[#f7f7f7] rounded-[12px] border border-[#ebebeb] p-8 sm:p-12">
            <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[24px] sm:text-[28px] text-black mb-2">
              Schedule Mechanic Later
            </h1>
            <p className="font-['Albert_Sans:Regular',sans-serif] text-[14px] sm:text-[15px] text-[#555] mb-8">
              Add your information below to schedule a time for one of our verified mechanics to reach out about your issue.
            </p>

            <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                    Name <span className="text-[#e44]">*</span>
                  </label>
                  <input
                    type="text"
                    autoComplete="name"
                    maxLength={FULL_NAME_MAX}
                    placeholder="Andrea Vaccaro"
                    value={name}
                    aria-invalid={!!fieldErrors.name}
                    onChange={(e) => {
                      setName(sanitizeNameInput(e.target.value));
                      clearFieldError("name");
                    }}
                    className="w-full border border-[#d2d2d2] bg-white rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
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
                    className="w-full border border-[#d2d2d2] bg-white rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
                  />
                  <FieldError message={fieldErrors.zip} />
                </div>

                <div>
                  <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                    Phone Number <span className="text-[#e44]">*</span>
                  </label>
                  <div className="flex">
                    <span className="flex items-center border border-r-0 border-[#d2d2d2] bg-white rounded-l-[8px] px-2.5 text-[14px] text-[#888] font-['Albert_Sans:Regular',sans-serif] select-none whitespace-nowrap gap-1">
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
                      className="flex-1 min-w-0 border border-[#d2d2d2] bg-white rounded-r-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
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
                    className="w-full border border-[#d2d2d2] bg-white rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif]"
                  />
                  <FieldError message={fieldErrors.email} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[400px]">
                <div>
                  <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                    Date <span className="text-[#e44]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={month}
                      aria-invalid={!!fieldErrors.month || !!fieldErrors.day}
                      onChange={(e) => {
                        const nextMonth = e.target.value;
                        setMonth(nextMonth);
                        const maxDay = daysInMonth(Number(nextMonth));
                        if (day && Number(day) > maxDay) {
                          setDay("");
                        }
                        clearFieldError("month");
                        clearFieldError("day");
                        clearFieldError("time");
                      }}
                      className="w-full border border-[#d2d2d2] bg-white rounded-[8px] px-3 py-2.5 text-[14px] text-black outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif] appearance-none"
                    >
                      <option value="" disabled hidden>Month</option>
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                    <select
                      value={day}
                      aria-invalid={!!fieldErrors.day}
                      onChange={(e) => {
                        setDay(e.target.value);
                        clearFieldError("day");
                        clearFieldError("time");
                      }}
                      className="w-full border border-[#d2d2d2] bg-white rounded-[8px] px-3 py-2.5 text-[14px] text-black outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif] appearance-none"
                    >
                      <option value="" disabled hidden>Day</option>
                      {Array.from(
                        { length: daysInMonth(Number(month) || 12) },
                        (_, i) => (
                          <option key={i + 1} value={String(i + 1)}>
                            {i + 1}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <FieldError message={fieldErrors.month || fieldErrors.day} />
                </div>

                <div>
                  <label className="block text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1.5">
                    Time <span className="text-[#e44]">*</span>
                  </label>
                  <select
                    value={time}
                    aria-invalid={!!fieldErrors.time}
                    onChange={(e) => {
                      setTime(e.target.value);
                      clearFieldError("time");
                    }}
                    className="w-full border border-[#d2d2d2] bg-white rounded-[8px] px-3 py-2.5 text-[14px] text-black outline-none focus:border-[#ffa270] transition-colors duration-150 font-['Albert_Sans:Regular',sans-serif] appearance-none"
                  >
                    <option value="" disabled hidden>Select Time</option>
                    <option value="morning">Morning (8am - 12pm)</option>
                    <option value="afternoon">Afternoon (12pm - 5pm)</option>
                    <option value="evening">Evening (5pm - 8pm)</option>
                  </select>
                  <FieldError message={fieldErrors.time} />
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-3">
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
                  <span className="text-[13px] text-black font-['Albert_Sans:SemiBold',sans-serif] font-semibold leading-[1.5]">
                    I agree to receive request-related SMS texts from Veriium. <span className="text-[#e44]">*</span>
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
                <div>
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
                    className="w-full max-w-[200px] border border-[#d2d2d2] bg-white rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors duration-150 tracking-[0.3em] text-center font-['Albert_Sans:Regular',sans-serif]"
                    autoFocus
                  />
                  <FieldError message={fieldErrors.verificationCode} />
                </div>
              )}

              {error && (
                <p className="text-[13px] text-red-500 font-['Albert_Sans:Regular',sans-serif]">
                  {error}
                </p>
              )}

              <div className="mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-[300px] bg-[#ffa270] rounded-[10px] py-3.5 font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-black hover:brightness-110 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer text-center disabled:opacity-70"
                >
                  {loading
                    ? otpSent
                      ? "Scheduling…"
                      : "Sending code…"
                    : otpSent
                      ? "Confirm Schedule"
                      : "Schedule Later"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
