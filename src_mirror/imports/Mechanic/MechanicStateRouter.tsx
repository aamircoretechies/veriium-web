"use client";
import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMechanicAuth } from "./MechanicAuthContext";
import MechanicSetupWizard from "./MechanicSetupWizard";

export default function MechanicStateRouter({ children }: { children: ReactNode }) {
  const { mechanic, hydrated, signOut } = useMechanicAuth();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !mechanic) {
      router.replace("/m/signin");
    }
  }, [mechanic, hydrated, router]);

  if (!hydrated || !mechanic) {
    return null;
  }

  const { accountState, setupComplete } = mechanic;

  if (accountState === "application_submitted") {
    return <StatusScreen icon="📋" badgeColor="bg-blue-100 text-blue-700" badge="Application Submitted" title="We've received your application" message="Thank you for applying! Our team typically processes applications within 1–3 business days. We'll reach out to you via email or SMS once we've reviewed your information." mechanicName={mechanic.name} onSignOut={() => { signOut(); router.push("/public"); }} />;
  }

  if (accountState === "under_review") {
    return <StatusScreen icon="🔍" badgeColor="bg-yellow-100 text-yellow-700" badge="Under Review" title="Your application is under review" message="Our team is actively reviewing your application and credentials. We'll notify you as soon as a decision is made. This usually takes 1–3 business days." mechanicName={mechanic.name} onSignOut={() => { signOut(); router.push("/public"); }} />;
  }

  if (accountState === "needs_more_info") {
    return <StatusScreen icon="📎" badgeColor="bg-orange-100 text-orange-700" badge="Action Required" title="We need a bit more info" message="Our review team has flagged your application and needs additional information or documents to proceed. Please check the email we sent to you for specific instructions." cta={{ label: "Contact Support", onClick: () => router.push("/public/contact") }} mechanicName={mechanic.name} onSignOut={() => { signOut(); router.push("/public"); }} />;
  }

  if (accountState === "rejected") {
    return <StatusScreen icon="❌" badgeColor="bg-red-100 text-red-700" badge="Application Rejected" title="Your application was not approved" message="After careful review, we're unable to approve your application at this time. If you believe this was made in error or have new information to provide, please reach out to our support team." cta={{ label: "Contact Support", onClick: () => router.push("/public/contact") }} mechanicName={mechanic.name} onSignOut={() => { signOut(); router.push("/public"); }} />;
  }

  if (accountState === "suspended") {
    return <StatusScreen icon="🚫" badgeColor="bg-gray-100 text-gray-600" badge="Account Suspended" title="Your account has been suspended" message="Your mechanic account has been temporarily suspended. This may be due to a policy violation or pending review. Please contact our support team for more information." cta={{ label: "Contact Support", onClick: () => router.push("/public/contact") }} mechanicName={mechanic.name} onSignOut={() => { signOut(); router.push("/public"); }} />;
  }

  if (accountState === "approved" && !setupComplete) {
    return <MechanicSetupWizard />;
  }

  return <>{children}</>;
}
function StatusScreen({ icon, badgeColor, badge, title, message, mechanicName, cta, onSignOut }: { icon: string; badgeColor: string; badge: string; title: string; message: string; mechanicName: string; cta?: { label: string; onClick: () => void }; onSignOut: () => void; }) {
  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col font-['Albert_Sans:Regular',sans-serif]">
      <header className="bg-white border-b border-[#f0f0f0] px-6 md:px-[100px] py-5 flex items-center justify-between">
        <span className="font-['Inter:Bold',sans-serif] font-bold text-[26px] text-black tracking-[0.1px]">VERIIUM</span>
        <div className="flex items-center gap-4">
          <span className="text-[14px] text-[#888] hidden sm:block">{mechanicName}</span>
          <button onClick={onSignOut} className="text-[13px] font-['Albert_Sans:Bold',sans-serif] font-bold text-[#e11d48] hover:text-[#be123c] transition-colors bg-transparent border-none cursor-pointer">Sign Out</button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[520px] bg-white rounded-[24px] shadow-[0_4px_40px_rgba(0,0,0,0.07)] border border-[#e8e8e8] p-10 flex flex-col items-center text-center gap-6">
          <span className="text-[56px] leading-none">{icon}</span>

          <span className={`text-[13px] font-['Albert_Sans:Bold',sans-serif] font-bold px-4 py-1.5 rounded-full ${badgeColor}`}>{badge}</span>

          <div className="flex flex-col gap-3">
            <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[24px] text-black leading-snug">{title}</h1>
            <p className="text-[15px] text-[#555] leading-[1.75] font-['Albert_Sans:Regular',sans-serif]">{message}</p>
          </div>

          <div className="flex flex-col gap-3 w-full mt-2">
            {cta && (<button onClick={cta.onClick} className="w-full bg-[#ffa270] hover:brightness-110 active:scale-95 transition-all duration-150 text-black font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] py-3.5 rounded-[12px]">{cta.label}</button>)}
            <button onClick={onSignOut} className="w-full border border-[#d2d2d2] hover:bg-[#f5f5f5] text-black text-[15px] py-3.5 rounded-[12px] bg-white">Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
