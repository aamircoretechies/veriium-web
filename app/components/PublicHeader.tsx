"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PublicHeaderProps {
  hideAuthButtons?: boolean;
}

export default function PublicHeader({ hideAuthButtons }: PublicHeaderProps = {}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="bg-white  mx-auto flex items-center justify-between py-[20px] w-full border-b border-[#f0f0f0] shrink-0">
        <div className="max-w-[1440px]  mx-auto flex items-center justify-between px-6  w-full">
        {/* Logo */}
        <div
          className="font-['Inter:Bold',sans-serif] font-bold text-[28px] sm:text-[32px] text-black tracking-[0.1px] cursor-pointer select-none hover:opacity-75 transition-opacity"
          onClick={() => router.push('/public')}
        >
          VERIIUM
        </div>

        {/* Desktop nav */}
        {!hideAuthButtons && (
          <nav className="hidden md:flex items-center gap-3">
            <button
              onClick={() => router.push('/public/find-mechanic')}
              className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[15px] text-black px-5 py-[10px] rounded-[10px] border border-[#e0e0e0] hover:border-[#ffa270] hover:text-[#ffa270] transition-colors duration-200 select-none cursor-pointer whitespace-nowrap"
            >
              Find a Mechanic
            </button>
            <button
              onClick={() => router.push('/mechanics/apply')}
              className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-black bg-[#ffa270] px-5 py-[10px] rounded-[10px] hover:bg-[#ff8f52] transition-colors duration-200 select-none cursor-pointer whitespace-nowrap"
            >
              Apply for Mechanic
            </button>
          </nav>
        )}

        {/* Mobile hamburger */}
        <button
          className="flex md:hidden flex-col gap-[5px] cursor-pointer p-[8px] select-none"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <div className="w-[24px] h-[3px] bg-black rounded-full" />
          <div className="w-[24px] h-[3px] bg-black rounded-full" />
          <div className="w-[24px] h-[3px] bg-black rounded-full" />
        </button>
        </div>
      </header>

      {/* Mobile slide-in menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col md:hidden">
          <div className="flex flex-1 overflow-hidden">
            <div
              className="flex-1 bg-black/50 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <div className="w-[78%] bg-white flex flex-col justify-between py-[36px] px-[28px] overflow-y-auto shadow-2xl">
              {/* Close button */}
              <div>
                <div className="flex items-center justify-between mb-[36px]">
                  <span
                    className="font-['Inter:Bold',sans-serif] font-bold text-[24px] text-black tracking-[0.1px] cursor-pointer select-none"
                    onClick={() => { setMenuOpen(false); router.push('/public'); }}
                  >
                    VERIIUM
                  </span>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="text-black text-[24px] leading-none cursor-pointer hover:opacity-70 transition-opacity select-none"
                    aria-label="Close menu"
                  >
                    ✕
                  </button>
                </div>

                <nav className="flex flex-col gap-[28px]">
                  <button
                    onClick={() => { setMenuOpen(false); router.push('/public/find-mechanic'); }}
                    className="text-left font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-black cursor-pointer hover:text-[#ffa270] transition-colors duration-200 select-none"
                  >
                    Find a Mechanic
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); router.push('/public/about'); }}
                    className="text-left font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-black cursor-pointer hover:text-[#ffa270] transition-colors duration-200 select-none"
                  >
                    About Us
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); router.push('/public/contact'); }}
                    className="text-left font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-black cursor-pointer hover:text-[#ffa270] transition-colors duration-200 select-none"
                  >
                    Contact
                  </button>
                </nav>
              </div>

              <div className="flex flex-col gap-3 mt-[40px]">
                <button
                  onClick={() => { setMenuOpen(false); router.push('/public/find-mechanic'); }}
                  className="w-full font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[16px] text-black py-[14px] rounded-[12px] border border-[#e0e0e0] hover:border-[#ffa270] hover:text-[#ffa270] transition-colors duration-200 select-none cursor-pointer"
                >
                  Find a Mechanic
                </button>
                <button
                  onClick={() => { setMenuOpen(false); router.push('/mechanics/apply'); }}
                  className="w-full font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] text-black bg-[#ffa270] py-[14px] rounded-[12px] hover:bg-[#ff8f52] transition-colors duration-200 select-none cursor-pointer"
                >
                  Apply for Mechanic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
