"use client";
import React from "react";
import Footer from "../../../app/components/Footer";
import PublicHeader from "@/app/components/PublicHeader";

interface ContactUsProps {
  onBack: () => void;
}

export default function ContactUs({ onBack }: ContactUsProps) {
  return (
    <div className="bg-white min-h-screen flex flex-col w-full overflow-x-hidden">
      <PublicHeader />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1200px] mx-auto px-6 md:px-[100px] py-12 sm:py-20 flex flex-col w-full">
        <div className="flex flex-col max-w-2xl gap-2">
          <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[14px] text-gray-500 uppercase tracking-widest">
            Contact Us
          </span>
          <h1 className="font-serif font-bold text-[48px] sm:text-[64px] text-[#222] leading-none mb-2">
            Let's talk.
          </h1>
          <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[16px] sm:text-[18px] text-[#555] leading-relaxed max-w-lg">
            Questions about a booking, want to join as a mechanic, or just need a hand? Send us a note and a real person will get back to you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 sm:gap-20 mt-12 items-start">
          {/* Left Column - Form */}
          <div className="w-full bg-white border border-[#e5e5e5] rounded-[16px] p-6 sm:p-10 shadow-sm">
            <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
              <div className="flex flex-col gap-2">
                <label className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[14px] text-black">Name</label>
                <input type="text" placeholder="Your name" className="w-full h-[48px] px-4 border border-[#e5e5e5] rounded-[8px] focus:outline-none focus:border-[#da7355] font-['Albert_Sans:Regular',sans-serif] text-[16px] text-black placeholder:text-[#999] bg-[#fafafa]" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[14px] text-black">Email</label>
                <input type="email" placeholder="you@email.com" className="w-full h-[48px] px-4 border border-[#e5e5e5] rounded-[8px] focus:outline-none focus:border-[#da7355] font-['Albert_Sans:Regular',sans-serif] text-[16px] text-black placeholder:text-[#999] bg-[#fafafa]" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[14px] text-black">
                  Phone <span className="font-normal text-[#888]">(optional)</span>
                </label>
                <input type="tel" placeholder="(555) 555-5555" className="w-full h-[48px] px-4 border border-[#e5e5e5] rounded-[8px] focus:outline-none focus:border-[#da7355] font-['Albert_Sans:Regular',sans-serif] text-[16px] text-black placeholder:text-[#999] bg-[#fafafa]" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[14px] text-black">What's this about?</label>
                <div className="relative">
                  <select className="w-full h-[48px] px-4 border border-[#e5e5e5] rounded-[8px] focus:outline-none focus:border-[#da7355] font-['Albert_Sans:Regular',sans-serif] text-[16px] text-black appearance-none bg-[#fafafa] cursor-pointer">
                    <option>General question</option>
                    <option>Booking inquiry</option>
                    <option>Join as a mechanic</option>
                    <option>Other</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[14px] text-black">Message</label>
                <textarea placeholder="How can we help?" className="w-full h-[120px] p-4 border border-[#e5e5e5] rounded-[8px] focus:outline-none focus:border-[#da7355] font-['Albert_Sans:Regular',sans-serif] text-[16px] text-black placeholder:text-[#999] bg-[#fafafa] resize-none" />
              </div>

              <button type="button" className="w-full h-[48px] mt-2 bg-[#da7355] hover:bg-[#c96649] text-white font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] rounded-[8px] transition-colors">
                Send message
              </button>
            </form>
          </div>

          {/* Right Column - Info */}
          <div className="flex flex-col gap-8 pt-4">
            <div className="flex flex-col gap-1">
              <h3 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[12px] text-[#888] uppercase tracking-wider">Email</h3>
              <a href="mailto:hello@veriium.com" className="font-['Albert_Sans:Medium',sans-serif] text-[16px] text-[#da7355] hover:underline">
                hello@veriium.com
              </a>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[12px] text-[#888] uppercase tracking-wider">Service Area</h3>
              <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] text-[#333]">
                Gwinnett County, GA
              </p>
              <p className="font-['Albert_Sans:Regular',sans-serif] text-[16px] text-[#666]">
                Mobile and drop-off repair
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[12px] text-[#888] uppercase tracking-wider">Hours</h3>
              <p className="font-['Albert_Sans:Regular',sans-serif] text-[16px] text-[#666]">
                Monday–Saturday, 8am–8pm ET
              </p>
            </div>

            <div className="bg-[#f8f8f8] border border-[#e5e5e5] rounded-[12px] p-6 mt-4 flex flex-col gap-5 max-w-[360px]">
              <h3 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[12px] text-[#888] uppercase tracking-wider">What happens next</h3>
              <ul className="flex flex-col gap-4">
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-[24px] h-[24px] rounded-full bg-[#da7355] text-white font-bold text-[13px] flex items-center justify-center">
                    1
                  </div>
                  <p className="font-['Albert_Sans:Regular',sans-serif] text-[15px] text-[#555] leading-tight pt-0.5">
                    We read every message that comes in.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-[24px] h-[24px] rounded-full bg-[#da7355] text-white font-bold text-[13px] flex items-center justify-center">
                    2
                  </div>
                  <p className="font-['Albert_Sans:Regular',sans-serif] text-[15px] text-[#555] leading-tight pt-0.5">
                    A real person — not a bot — writes back.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-[24px] h-[24px] rounded-full bg-[#da7355] text-white font-bold text-[13px] flex items-center justify-center">
                    3
                  </div>
                  <p className="font-['Albert_Sans:Regular',sans-serif] text-[15px] text-[#555] leading-tight pt-0.5">
                    Usually within one business day.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
