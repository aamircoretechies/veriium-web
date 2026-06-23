"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingConfirmation() {
  const router = useRouter();

  // Redirect to the job status page after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      // Typically, the backend would return a unique Job ID. We use a mock ID here.
      router.push('/job/V-849201');
    }, 4000); // 4 second delay before redirecting

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center font-['Albert_Sans:Regular',sans-serif] px-[20px]">
      <div className="flex flex-col items-center max-w-[600px] text-center">
        {/* Checkmark SVG matching the reference */}
        <div className="mb-8">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17l-5-5" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[32px] md:text-[40px] text-black mb-6">
          You're all set!
        </h1>
        
        <p className="font-['Albert_Sans:Medium',sans-serif] text-[18px] md:text-[20px] text-black leading-relaxed">
          You will be notified when Daniel C. is ready to fix<br className="hidden md:block" /> your car.
        </p>

        <p className="mt-12 text-gray-400 text-sm animate-pulse">
          Redirecting to your Job Status page...
        </p>
      </div>
    </div>
  );
}
