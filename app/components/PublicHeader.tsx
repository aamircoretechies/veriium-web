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
      <header className="bg-white flex items-center justify-between px-6 md:px-[100px] py-[30px] w-full border-b border-[#f0f0f0] shrink-0">
        <div
          className="font-['Inter:Bold',sans-serif] font-bold text-[28px] sm:text-[32px] text-black tracking-[0.1px] cursor-pointer select-none hover:opacity-75 transition-opacity"
          onClick={() => router.push('/public')}
        >
          VERIIUM
        </div>

        <button
          className="flex md:hidden flex-col gap-[5px] cursor-pointer p-[8px] select-none"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          <div className="w-[24px] h-[3px] bg-black rounded-full" />
          <div className="w-[24px] h-[3px] bg-black rounded-full" />
          <div className="w-[24px] h-[3px] bg-black rounded-full" />
        </button>
      </header>
    </>
  );
}
