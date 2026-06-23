"use client";
import React from "react";
import Footer from "../../../app/components/Footer";
import PublicHeader from "@/app/components/PublicHeader";

interface AboutUsProps {}

export default function AboutUs({}: AboutUsProps = {}) {
  return (
    <div className="bg-white min-h-screen flex flex-col w-full overflow-x-hidden">
      <PublicHeader />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1000px] mx-auto px-6 md:px-10 py-16 sm:py-24 flex flex-col w-full">
        <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[32px] sm:text-[40px] text-black text-center mb-12">
          About Us
        </h1>

        {/* Hero Image Placeholder */}
        <div className="w-full aspect-[16/9] sm:aspect-[2/1] bg-[#ececec] rounded-[12px] mb-16"></div>

        {/* Content Body */}
        <div className="flex flex-col gap-6 max-w-[800px] mx-auto w-full">
          <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] sm:text-[18px] text-black leading-relaxed">
            Veriium helps drivers understand car problems, see fair pricing, and connect with verified mechanics — without confusion or pressure.
          </p>

          <p className="font-['Albert_Sans:Regular',sans-serif] text-[15px] sm:text-[16px] text-black leading-relaxed">
            Car repair has long been an industry where people feel unsure, overcharged, or talked down to. Most drivers don't know what questions to ask — and they shouldn't have to.
          </p>

          <p className="font-['Albert_Sans:Regular',sans-serif] text-[15px] sm:text-[16px] text-black leading-relaxed">
            Veriium brings clarity to every step of the process. We explain what's happening with your car, what it typically costs in your area, and what your options are before any work begins.
          </p>

          <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] sm:text-[16px] text-black mt-2">
            Our standard is simple:
          </p>

          <ul className="flex flex-col gap-3 ml-2">
            <li className="font-['Albert_Sans:Regular',sans-serif] italic text-[15px] sm:text-[16px] text-black">
              Clear explanations
            </li>
            <li className="font-['Albert_Sans:Regular',sans-serif] italic text-[15px] sm:text-[16px] text-black">
              Transparent pricing
            </li>
            <li className="font-['Albert_Sans:Regular',sans-serif] italic text-[15px] sm:text-[16px] text-black">
              Verified professionals
            </li>
          </ul>

          <p className="font-['Albert_Sans:Regular',sans-serif] text-[15px] sm:text-[16px] text-black mt-4">
            Every time.
          </p>

          <p className="font-['Albert_Sans:Regular',sans-serif] text-[15px] sm:text-[16px] text-black mt-4">
            No pressure. No surprises. Just honest service.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

