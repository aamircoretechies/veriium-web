"use client";
import { CheckCircle, Clock, RefreshCw, Star } from "lucide-react";
import mechanicImg from "./mechanic-daniel.png";
import Footer from "../../../app/components/Footer";

interface MatchFoundProps {
  onBack: () => void;
  onContinue?: () => void;
}

export default function MatchFound({
  onBack,
  onContinue,
}: MatchFoundProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Nav */}
      <div className="w-full flex items-center justify-between px-[24px] sm:px-[80px] py-[28px] border-b border-[#f0f0f0]">
        <span className="font-['Inter:Bold',sans-serif] font-bold text-[28px] text-black tracking-[0.1px] cursor-pointer" onClick={onBack}>
          VERIIUM
        </span>
        <div className="flex items-center gap-[24px]">
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 w-full max-w-[980px] mx-auto px-[24px] sm:px-[40px] py-[40px] sm:py-[50px] flex flex-col gap-[28px]">
        {/* Title Row */}
        <div>
          <h1 className="font-['Fustat:Bold',sans-serif] font-bold text-[28px] sm:text-[32px] text-black leading-tight mb-2">
            Match Found
          </h1>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <p className="text-[15px] text-[#444] font-['Albert_Sans:Regular',sans-serif] leading-[1.7] max-w-[680px]">
              Good news! Daniel C. is a verified mechanic available near you ready to help fix your problem. See details below and click to continue.
            </p>
            <button className="flex items-center gap-2 text-[#ffa270] hover:text-[#ff8a50] transition-colors duration-200 cursor-pointer shrink-0 mt-1">
              <RefreshCw className="w-4 h-4" />
              <span className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[15px]">New Match</span>
            </button>
          </div>
        </div>

        {/* Mechanic Card */}
        <div className="bg-white rounded-[20px] border border-[#e8e8e8] shadow-[0px_4px_30px_0px_rgba(0,0,0,0.06)] p-6 sm:p-8 flex flex-col gap-6">
          {/* Profile section */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            {/* Photo */}
            <div className="w-[180px] h-[200px] sm:w-[220px] sm:h-[240px] rounded-[14px] overflow-hidden shrink-0 bg-[#f0ebe4] mx-auto sm:mx-0">
              <img
                src={mechanicImg.src}
                alt="Daniel C."
                className="w-full h-full object-cover"
              />
            </div>

            {/* Info */}
            <div className="flex flex-col gap-3 flex-1">
              <div>
                <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[24px] sm:text-[28px] text-black">
                  Daniel C.
                </h2>
                <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[14px] text-[#555] mt-0.5">
                  ASE Certified
                </p>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 text-[#f5a623] fill-[#f5a623]" />
                  ))}
                </div>
                <span className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#666]">
                  <strong className="font-semibold text-black">(149</strong> Customer Reviews)
                </span>
              </div>

              <p className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#555] leading-[1.7] mt-1">
                Daniel has 12 years of experience and specializes in brake and suspension repairs. Customers consistently rate him highly for clear communication and efficiency.
              </p>

              <p className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#555] italic mt-1">
                <strong className="font-semibold not-italic">Speaks:</strong> <em>English, Spanish</em>
              </p>

              {/* Badges */}
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-[18px] h-[18px] text-[#34a853]" />
                  <span className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#444]">Background Checked</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-[18px] h-[18px] text-[#34a853]" />
                  <span className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#444]">Verified Parts Pricing</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-[18px] h-[18px] text-[#34a853]" />
                  <span className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#444]">Rated for Efficiency</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2.5 bg-[#fff3e8] border border-[#ffd9b8] rounded-[12px] px-5 py-3">
              <span className="text-[22px]">🏅</span>
              <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-black">Verified Pro</span>
            </div>
            <div className="flex flex-col items-center bg-[#f7f7f7] border border-[#e8e8e8] rounded-[12px] px-6 py-3 min-w-[140px]">
              <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-black">2 hours</span>
              <span className="font-['Albert_Sans:Regular',sans-serif] text-[12px] text-[#888]">Completion Time</span>
            </div>
            <div className="flex flex-col items-center bg-[#fff3e8] border border-[#ffd9b8] rounded-[12px] px-6 py-3 min-w-[140px]">
              <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-black">$200 – $350</span>
              <span className="font-['Albert_Sans:Regular',sans-serif] text-[12px] text-[#888]">Cost</span>
            </div>
          </div>

          {/* Availability note */}
          <div className="flex items-center gap-2.5 justify-center">
            <Clock className="w-4 h-4 text-[#888]" />
            <p className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#555]">
              Daniel can begin working on your vehicle in as early as <strong className="font-bold text-black">25 minutes</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center max-w-[700px] mx-auto w-full">
          <button
            onClick={onContinue}
            className="w-full max-w-[500px] bg-[#ffa270] rounded-[12px] py-4 font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] text-black hover:brightness-110 active:scale-[0.98] transition-all duration-150 shadow-sm cursor-pointer select-none"
          >
            Continue with Daniel C.
          </button>
        </div>
      </div>

      {/* Footer */}
      <Footer onLinkClick={onBack} />
    </div>
  );
}
