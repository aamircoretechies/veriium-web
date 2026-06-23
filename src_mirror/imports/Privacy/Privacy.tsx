"use client";
import React from "react";
import Footer from "../../../app/components/Footer";
import PublicHeader from "@/app/components/PublicHeader";

export default function Privacy() {
  return (
    <div className="bg-white min-h-screen flex flex-col w-full overflow-x-hidden">
      <PublicHeader />

      <main className="flex-1 max-w-[1000px] mx-auto px-6 md:px-10 py-16 sm:py-24 flex flex-col w-full">
        <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[32px] sm:text-[40px] text-black text-center mb-12">
          Privacy Policy
        </h1>

        <div className="flex flex-col gap-6 max-w-[800px] mx-auto w-full font-['Albert_Sans:Regular',sans-serif] text-[15px] sm:text-[16px] text-black leading-relaxed">
          <p className="font-['Albert_Sans:Bold',sans-serif] font-bold">
            Last Updated: June 23, 2026
          </p>

          <p>
            Veriium is committed to protecting your privacy. This Privacy Policy describes how we collect, use, and share information when you use our website, mobile application, and connected services.
          </p>

          <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] mt-6 mb-2">1. Information We Collect</h2>
          <p>
            We collect information you provide directly, such as your name, phone number, email address, vehicle details, service history, and payment details. We also collect location coordinates to match you with nearby mechanics.
          </p>

          <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] mt-6 mb-2">2. How We Use Information</h2>
          <p>
            We use the information we collect to facilitate vehicle diagnostic matching, payment authorization, and communication between mechanics and users. We also use it to maintain the security of our services and improve our platform.
          </p>

          <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] mt-6 mb-2">3. Information Sharing</h2>
          <p>
            We share vehicle details, customer notes, and booking location with matched mechanics. We do not sell your personal data to third parties. We use secure third-party payment processors to handle all card authorizations and payouts.
          </p>

          <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] mt-6 mb-2">4. Your Choices</h2>
          <p>
            You can access, update, or request deletion of your personal information by contacting support. You may also disable location services, though doing so may prevent us from matching you with mechanics.
          </p>

          <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] mt-6 mb-2">5. Contact Us</h2>
          <p>
            If you have questions about this policy or our privacy practices, please reach out to us through our contact form.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
