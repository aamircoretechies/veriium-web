"use client";

import Footer from "../../../app/components/Footer";

function Logo() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center overflow-clip p-[20px] relative shrink-0" data-name="LOGO">
      <div className="[word-break:break-word] flex flex-col font-['Inter:Bold',sans-serif] font-bold justify-center leading-[0] not-italic relative shrink-0 text-[30px] text-white tracking-[0.1px] whitespace-nowrap">
        <p className="leading-[20px]">VERIIUM</p>
      </div>
    </div>
  );
}

export default function LandingMobile() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[600px] mx-auto px-4 py-12">
        <Logo />
      </div>
      <Footer />
    </div>
  );
}
