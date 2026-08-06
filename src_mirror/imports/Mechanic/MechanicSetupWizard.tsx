"use client";
import { useState } from "react";
import { useMechanicAuth } from "./MechanicAuthContext";
import type { MechanicSetupResponse } from "@/types/api/mechanic-setup";

const TOKEN_KEY = "veriium_mechanic_token";

const STEPS = [
  { id: 1, title: "Welcome to Veriium!", subtitle: "Let's get your account ready in 2 quick steps." },
  { id: 2, title: "Payout Details", subtitle: "Where should we send your earnings?" },
  { id: 3, title: "Confirm Your Service Area", subtitle: "Make sure your coverage area is accurate so customers nearby can find you." },
];

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error?.message ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

export default function MechanicSetupWizard() {
  const { mechanic, refreshMechanic, signOut } = useMechanicAuth();
  const [step, setStep] = useState(1);
  const [bankName, setBankName] = useState("");
  const [accountLast4, setAccountLast4] = useState("");
  const [routingNote, setRoutingNote] = useState("Direct Deposit");
  const [primaryZip, setPrimaryZip] = useState("30043");
  const [serviceRadius, setServiceRadius] = useState("20");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleComplete = async () => {
    const zip = primaryZip.trim();
    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a valid 5-digit ZIP code.");
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      signOut();
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/mechanics/setup", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ serviceZipCodes: [zip] }),
      });

      if (res.status === 401 || res.status === 403) {
        signOut();
        return;
      }

      if (!res.ok) {
        setError(await parseApiError(res));
        return;
      }

      const data = (await res.json()) as MechanicSetupResponse;
      if (!data.mechanic.setupComplete) {
        setError("Setup could not be confirmed. Please try again or contact support.");
        return;
      }

      await refreshMechanic();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col font-['Albert_Sans:Regular',sans-serif]">
      <header className="bg-white border-b border-[#f0f0f0] px-6 md:px-[100px] py-5 flex items-center justify-between">
        <span className="font-['Inter:Bold',sans-serif] font-bold text-[26px] text-black tracking-[0.1px]">VERIIUM</span>
        <span className="text-[14px] text-[#888]">Welcome, {mechanic?.name?.split(" ")[0]}</span>
      </header>

      <div className="w-full h-[3px] bg-[#f0f0f0]"><div className="h-full bg-[#ffa270] transition-all duration-500" style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }} /></div>

      <div className="flex items-center justify-center gap-2 pt-8 pb-4">
        {STEPS.map((s) => (
          <div key={s.id} className={`flex items-center gap-2`}>
            <div className={`w-[28px] h-[28px] rounded-full flex items-center justify-center text-[13px] font-bold ${step === s.id ? "bg-[#ffa270] text-black scale-110" : step > s.id ? "bg-black text-white" : "bg-[#e8e8e8] text-[#888]"}`}>{step > s.id ? "✓" : s.id}</div>
            {s.id < STEPS.length && <div className={`w-[40px] sm:w-[64px] h-[2px] rounded-full ${step > s.id ? "bg-black" : "bg-[#e8e8e8]"}`} />}
          </div>
        ))}
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-6 pb-16">
        <div className="w-full max-w-[520px] bg-white rounded-[24px] shadow-[0_4px_40px_rgba(0,0,0,0.07)] border border-[#e8e8e8] p-8 md:p-10 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-['Albert_Sans:Bold',sans-serif] font-bold text-[#ffa270] uppercase tracking-wider">Step {step} of {STEPS.length}</span>
            <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[22px] sm:text-[26px] text-black leading-snug">{STEPS[step - 1].title}</h1>
            <p className="text-[14px] text-[#888]">{STEPS[step - 1].subtitle}</p>
          </div>

          {step === 1 && (
            <div className="flex flex-col gap-5"><div className="bg-[#f7f7f7] rounded-[14px] p-5 border border-[#ebebeb] flex flex-col gap-3"><p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-black">✅ Your account is approved</p><p className="text-[14px] text-[#555] leading-[1.7]">Congratulations, <strong>{mechanic?.name}</strong>! You're just two quick steps away from going live on Veriium.</p><p className="text-[14px] text-[#555] leading-[1.7]">We'll walk you through confirming your payout details and service area. After that, you can set your <strong>Availability toggle</strong> whenever you're ready to accept jobs.</p></div><div className="bg-[#fff8f5] border border-[#ffd9b8] rounded-[12px] p-4 flex gap-3 items-start"><span className="text-[20px]">💡</span><p className="text-[13px] text-[#775] leading-[1.65]">Your availability will be set to <strong>OFF</strong> by default. You choose when to go live.</p></div></div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4"><div className="flex flex-col gap-1.5"><label className="text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black">Bank / Payment Method Name</label><input type="text" placeholder="e.g. Chase, Wells Fargo, Cash App" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5" /></div><div className="flex flex-col gap-1.5"><label className="text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black">Last 4 digits of Account</label><input type="text" maxLength={4} placeholder="1234" value={accountLast4} onChange={(e) => setAccountLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5" /></div><div className="flex flex-col gap-1.5"><label className="text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black">Payout Method</label><select value={routingNote} onChange={(e) => setRoutingNote(e.target.value)} className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5 bg-white"><option>Direct Deposit</option><option>Check</option><option>Zelle</option><option>Cash App</option></select></div><p className="text-[12px] text-[#aaa] leading-[1.6]">ⓘ In the real app, this would be handled securely via Stripe Connect or a similar provider. This is a placeholder.</p></div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5"><div className="flex flex-col gap-4"><div className="flex flex-col gap-1.5"><label className="text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black">Primary ZIP Code</label><input type="text" placeholder="e.g. 30043" value={primaryZip} onChange={(e) => setPrimaryZip(e.target.value)} className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5" maxLength={5} /></div><div className="flex flex-col gap-1.5"><label className="text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black">Service Radius (miles)</label><input type="number" min="1" max="100" placeholder="e.g. 20" value={serviceRadius} onChange={(e) => setServiceRadius(e.target.value)} className="w-full border border-[#d2d2d2] rounded-[8px] px-3 py-2.5" /></div></div><div className="bg-[#f7f7f7] border border-[#ebebeb] rounded-[12px] p-4 flex flex-col gap-2"><p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[14px] text-black">🎉 You're almost there!</p><p className="text-[13px] text-[#555] leading-[1.65]">After completing setup, your availability will start as <strong>OFF</strong>. Head to your dashboard and flip the toggle when you're ready to receive job requests.</p></div></div>
          )}

          {error && (
            <p className="text-[13px] text-[#e11d48] leading-[1.6]">{error}</p>
          )}

          <div className="flex gap-3 mt-2">
            {step > 1 && <button onClick={() => setStep(step - 1)} disabled={submitting} className="flex-1 border border-[#d2d2d2] hover:bg-[#f5f5f5] text-black text-[15px] py-3.5 rounded-[12px] disabled:opacity-50">Back</button>}
            {step < STEPS.length ? <button onClick={() => setStep(step + 1)} className="flex-[2] bg-[#ffa270] hover:brightness-110 text-black font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] py-3.5 rounded-[12px]">Continue</button> : <button onClick={() => void handleComplete()} disabled={submitting} className="flex-[2] bg-black hover:bg-[#222] text-white font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] py-3.5 rounded-[12px] disabled:opacity-50">{submitting ? "Saving…" : "Go to Dashboard →"}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
