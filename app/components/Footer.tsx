"use client";

import { useRouter } from "next/navigation";

export default function Footer({ onLinkClick }: { onLinkClick?: (name: string) => void }) {
  const router = useRouter();

  const handleClick = (name: string) => {
    if (name === "About") {
      router.push('/public/about');
      return;
    }
    if (name === "Contact") {
      router.push('/public/contact');
      return;
    }
    if (name === "Terms of Service") {
      router.push('/public/terms');
      return;
    }
    if (name === "Privacy Policy") {
      router.push('/public/privacy');
      return;
    }
    if (name === "Apply as a Mechanic") {
      router.push('/mechanics/apply');
      return;
    }
    if (onLinkClick) {
      onLinkClick(name);
    }
  };

  return (
    <div className="bg-black w-full" data-name="Footer">
      <div className="max-w-[1440px] mx-auto overflow-clip pb-[30px] md:pb-[10px] px-6 pt-[60px] rounded-[24px]">
        <div className="flex flex-col md:flex-row justify-between gap-10 md:gap-[400px] items-start w-full mb-[40px] md:mb-[97px]">
          <div className="flex flex-col gap-[10px] items-start">
            <div className="pb-[10px] w-full">
              <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-white leading-normal">Company</p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-[10px] font-semibold text-[16px] text-white whitespace-nowrap leading-normal">
              <span onClick={() => handleClick('About')} className="font-['Albert_Sans:SemiBold',sans-serif] cursor-pointer transition-colors duration-200 hover:text-[#ffa270]">About</span>
              <span className="hidden md:inline font-['Fustat:SemiBold',sans-serif] text-white/40">|</span>
              <span onClick={() => handleClick('Education')} className="font-['Albert_Sans:SemiBold',sans-serif] cursor-pointer transition-colors duration-200 hover:text-[#ffa270]">Education</span>
              <span className="hidden md:inline font-['Fustat:SemiBold',sans-serif] text-white/40">|</span>
              <span onClick={() => handleClick('Apply as a Mechanic')} className="font-['Albert_Sans:SemiBold',sans-serif] cursor-pointer transition-colors duration-200 hover:text-[#ffa270]">Apply as a Mechanic</span>
              <span className="hidden md:inline font-['Fustat:SemiBold',sans-serif] text-white/40">|</span>
              <span onClick={() => handleClick('Contact')} className="font-['Albert_Sans:SemiBold',sans-serif] cursor-pointer transition-colors duration-200 hover:text-[#ffa270]">Contact</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-[10px] font-semibold text-[16px] text-white whitespace-nowrap leading-normal">
              <span onClick={() => handleClick('Privacy Policy')} className="font-['Albert_Sans:SemiBold',sans-serif] cursor-pointer transition-colors duration-200 hover:text-[#ffa270]">Privacy Policy</span>
              <span className="hidden md:inline font-['Fustat:SemiBold',sans-serif] text-white/40">|</span>
              <span onClick={() => handleClick('Terms of Service')} className="font-['Albert_Sans:SemiBold',sans-serif] cursor-pointer transition-colors duration-200 hover:text-[#ffa270]">Terms of Service</span>
            </div>
          </div>

          <div className="flex flex-col gap-[10px] items-start w-[162px]">
            <div className="pb-[10px] w-full">
              <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-white leading-normal">Social</p>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-[10px] font-semibold text-[16px] text-white whitespace-nowrap leading-normal">
              <span onClick={() => handleClick('Instagram')} className="font-['Albert_Sans:SemiBold',sans-serif] cursor-pointer transition-colors duration-200 hover:text-[#ffa270]">Instagram</span>
              <span className="hidden md:inline font-['Fustat:SemiBold',sans-serif] text-white/40">|</span>
              <span onClick={() => handleClick('LinkedIn')} className="font-['Albert_Sans:SemiBold',sans-serif] cursor-pointer transition-colors duration-200 hover:text-[#ffa270]">LinkedIn</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center md:items-start justify-center w-full border-t border-white/10 md:border-none pt-6 md:pt-0">
          <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[16px] text-white whitespace-nowrap leading-normal">© 2025 Veriium</p>
        </div>
      </div>
    </div>
  );
}
