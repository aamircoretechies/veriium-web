"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useMechanicAuth,
  MOCK_MECHANICS,
  MechanicAccountState,
  MechanicUser,
} from "../../components/mechanic/MechanicAuthContext";

type SignInStep = "phone" | "code";

const STATE_LABELS: Record<MechanicAccountState, { label: string; color: string; description: string }> = {
  application_submitted: {
    label: "Application Submitted",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Application just submitted, awaiting initial triage.",
  },
  under_review: {
    label: "Under Review",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    description: "Application is actively being reviewed by Veriium.",
  },
  needs_more_info: {
    label: "Needs More Info",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    description: "Reviewer requires additional documents or information.",
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-700 border-green-200",
    description: "Mechanic is approved. Must complete setup wizard before going live.",
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-700 border-red-200",
    description: "Application was rejected. Not eligible to access the platform.",
  },
  suspended: {
    label: "Suspended",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    description: "Account has been suspended.",
  },
};

function formatPhoneFromParam(raw: string): string {
  const decoded = decodeURIComponent(raw).trim();
  return decoded.replace(/^\+1/, "").replace(/\D/g, "").slice(0, 10);
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error?.message ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

function MechanicSignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useMechanicAuth();

  const [step, setStep] = useState<SignInStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDevTools, setShowDevTools] = useState(false);

  const showDevPanel = process.env.NODE_ENV === "development";

  useEffect(() => {
    const phoneParam = searchParams.get("phone");
    if (phoneParam) {
      setPhone(formatPhoneFromParam(phoneParam));
    }
  }, [searchParams]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/mechanic/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        setError(await parseApiError(res));
        return;
      }

      setStep("code");
      setCode("");
    } catch {
      setError("Unable to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Please enter the 6-digit code we sent to your phone.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/mechanic/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });

      if (!res.ok) {
        setError(await parseApiError(res));
        return;
      }

      const data = (await res.json()) as { token: string; mechanic: MechanicUser };
      signIn(data.mechanic, data.token);
      router.push("/mechanic");
    } catch {
      setError("Unable to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = (state: MechanicAccountState) => {
    if (state === "approved") {
      signIn({ ...MOCK_MECHANICS.approved, setupComplete: false });
    } else {
      signIn(MOCK_MECHANICS[state]);
    }
    router.push("/mechanic");
  };

  const handleDevLoginApprovedSetupDone = () => {
    signIn({ ...MOCK_MECHANICS.approved, setupComplete: true, availabilityOn: false });
    router.push("/mechanic");
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col items-center justify-center px-4 font-['Albert_Sans:Regular',sans-serif]">
      <button
        onClick={() => router.push("/public")}
        className="font-['Inter:Bold',sans-serif] font-bold text-[28px] text-black tracking-[0.1px] mb-10 cursor-pointer hover:opacity-75 transition-opacity select-none bg-transparent border-none outline-none"
      >
        VERIIUM
      </button>

      <div className="w-full max-w-[420px] bg-white rounded-[20px] shadow-[0_4px_32px_rgba(0,0,0,0.08)] border border-[#e8e8e8] p-8 md:p-10 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[26px] text-black leading-tight">
            Mechanic Sign In
          </h1>
          <p className="text-[14px] text-[#888] font-['Albert_Sans:Regular',sans-serif]">
            {step === "phone"
              ? "Enter your phone number to receive a verification code"
              : "Enter the 6-digit code sent to your phone"}
          </p>
        </div>

        {step === "phone" ? (
          <form onSubmit={handleSendCode} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black">
                Phone Number
              </label>
              <div className="flex">
                <span className="flex items-center border border-r-0 border-[#d2d2d2] rounded-l-[8px] px-3 text-[14px] text-[#888] bg-[#f9f9f9] select-none whitespace-nowrap">
                  +1 🇺🇸
                </span>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 min-w-0 border border-[#d2d2d2] rounded-r-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-[13px] text-red-500 font-['Albert_Sans:Regular',sans-serif]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ffa270] hover:brightness-110 active:scale-95 transition-all duration-150 text-black font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] py-3.5 rounded-[10px] cursor-pointer border-none outline-none shadow-sm mt-1 disabled:opacity-70"
            >
              {loading ? "Sending code…" : "Send Verification Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black">
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 text-[14px] text-black placeholder:text-[#bbb] outline-none focus:border-[#ffa270] transition-colors tracking-[0.3em] text-center"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-[13px] text-red-500 font-['Albert_Sans:Regular',sans-serif]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ffa270] hover:brightness-110 active:scale-95 transition-all duration-150 text-black font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] py-3.5 rounded-[10px] cursor-pointer border-none outline-none shadow-sm mt-1 disabled:opacity-70"
            >
              {loading ? "Verifying…" : "Verify & Sign In"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError("");
              }}
              className="text-[13px] text-[#888] hover:text-black transition-colors bg-transparent border-none cursor-pointer"
            >
              Use a different phone number
            </button>
          </form>
        )}

        <div className="border-t border-[#f0f0f0] pt-4 flex flex-col gap-3 text-center">
          <p className="text-[13px] text-[#888]">
            Want to join as a mechanic?{" "}
            <button
              onClick={() => router.push("/mechanics/apply")}
              className="text-[#ffa270] font-semibold hover:underline bg-transparent border-none cursor-pointer outline-none"
            >
              Apply here
            </button>
          </p>
        </div>
      </div>

      {showDevPanel && (
        <div className="w-full max-w-[420px] mt-6">
          <button
            onClick={() => setShowDevTools(!showDevTools)}
            className="w-full text-[12px] text-[#aaa] hover:text-[#888] transition-colors bg-transparent border-none cursor-pointer py-2 font-['Albert_Sans:Regular',sans-serif] flex items-center justify-center gap-2"
          >
            <span className="text-[10px]">{showDevTools ? "▲" : "▼"}</span>
            Developer Tools — Sign in as any account state
          </button>

          {showDevTools && (
            <div className="bg-white rounded-[16px] border border-[#e8e8e8] shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-5 mt-2 flex flex-col gap-3">
              <p className="text-[11px] text-[#aaa] font-['Albert_Sans:Regular',sans-serif] uppercase tracking-wider">
                Mock Account States
              </p>
              {(Object.keys(STATE_LABELS) as MechanicAccountState[]).map((state) => (
                <button
                  key={state}
                  onClick={() => handleDevLogin(state)}
                  className={`flex flex-col items-start gap-0.5 w-full text-left px-4 py-3 rounded-[10px] border cursor-pointer transition-all hover:shadow-sm active:scale-[0.98] bg-white ${STATE_LABELS[state].color}`}
                >
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[13px]">
                    {STATE_LABELS[state].label}
                  </span>
                  <span className="font-['Albert_Sans:Regular',sans-serif] text-[11px] opacity-80">
                    {STATE_LABELS[state].description}
                  </span>
                </button>
              ))}

              <button
                onClick={handleDevLoginApprovedSetupDone}
                className="flex flex-col items-start gap-0.5 w-full text-left px-4 py-3 rounded-[10px] border cursor-pointer transition-all hover:shadow-sm active:scale-[0.98] bg-white bg-emerald-100 text-emerald-700 border-emerald-200"
              >
                <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[13px]">
                  Approved + Setup Complete
                </span>
                <span className="font-['Albert_Sans:Regular',sans-serif] text-[11px] opacity-80">
                  Approved mechanic who has finished the setup wizard. Goes directly to dashboard (availability OFF).
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      <p className="text-[12px] text-[#bbb] mt-8 font-['Albert_Sans:Regular',sans-serif]">
        © 2026 Veriium. Mechanic Portal.
      </p>
    </div>
  );
}

export default function MechanicSignInPage() {
  return (
    <Suspense>
      <MechanicSignInContent />
    </Suspense>
  );
}
