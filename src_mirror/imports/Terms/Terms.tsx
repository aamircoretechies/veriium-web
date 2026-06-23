"use client";
import React from "react";
import Footer from "../../../app/components/Footer";
import PublicHeader from "@/app/components/PublicHeader";

export default function Terms() {
  return (
    <div className="bg-white min-h-screen flex flex-col w-full overflow-x-hidden">
      <PublicHeader />

      <main className="flex-1 max-w-[1000px] mx-auto px-6 md:px-10 py-16 sm:py-24 flex flex-col w-full">
        <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[32px] sm:text-[40px] text-black text-center mb-12">
          Terms of Service
        </h1>

        <div className="flex flex-col gap-6 max-w-[800px] mx-auto w-full font-['Albert_Sans:Regular',sans-serif] text-[15px] sm:text-[16px] text-black leading-relaxed">
          <p className="font-['Albert_Sans:Bold',sans-serif] font-bold">
            Last Updated: June 23, 2026
          </p>

          <p>
            Welcome to Veriium. By using our platform, website, or mobile application, you agree to comply with and be bound by the following terms and conditions. Please read them carefully.
          </p>

          <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] mt-6 mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the services provided by Veriium, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service, along with our Privacy Policy.
          </p>

          <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] mt-6 mb-2">2. Description of Services</h2>
          <p>
            Veriium connects vehicle owners with independent, verified mobile mechanics. Veriium does not directly perform auto repair services. The independent mechanics are solely responsible for the quality, safety, and legality of the repairs performed.
          </p>

          <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] mt-6 mb-2">3. User Responsibilities</h2>
          <p>
            You agree to provide accurate, current, and complete information during the booking process. You are responsible for ensuring that the vehicle is accessible to the mechanic at the scheduled time and location.
          </p>

          <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] mt-6 mb-2">4. Payouts and Fees</h2>
          <p>
            Payment authorizations are placed on your card at the time of booking confirmation. No final charge is processed until the mechanic completes the service and you approve the final cost. Diagnostic and cancellation fees are outlined during checkout.
          </p>

          <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] mt-6 mb-2">5. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Veriium shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the platform or services provided by independent mechanics.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
