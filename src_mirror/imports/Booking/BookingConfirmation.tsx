"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface BookingConfirmationProps {
  jobId: string;
  token: string;
}

export default function BookingConfirmation({
  jobId,
  token,
}: BookingConfirmationProps) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(
        `/j/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`,
      );
    }, 4000);

    return () => clearTimeout(timer);
  }, [jobId, token, router]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center font-['Albert_Sans:Regular',sans-serif] px-[20px]">
      <div className="flex flex-col items-center max-w-[600px] text-center">
        <div className="mb-8">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M20 6L9 17l-5-5"
              stroke="#1a1a1a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[32px] md:text-[40px] text-black mb-6">
          You&apos;re all set!
        </h1>

        <p className="font-['Albert_Sans:Medium',sans-serif] text-[18px] md:text-[20px] text-black leading-relaxed">
          You will be notified when your mechanic is ready to fix
          <br className="hidden md:block" /> your car.
        </p>

        <p className="mt-12 text-gray-400 text-sm animate-pulse">
          Redirecting to your Job Status page...
        </p>
      </div>
    </div>
  );
}
