"use client";

import Link from "next/link";

import { Button } from "@/app/components/ui/button";

interface BookingConfirmationProps {
  jobId: string;
  token: string;
}

function buildCalendarIcsUrl(jobId: string, token: string): string {
  return `/api/bookings/${encodeURIComponent(jobId)}/calendar.ics?token=${encodeURIComponent(token)}`;
}

function buildJobStatusUrl(jobId: string, token: string): string {
  return `/j/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`;
}

export default function BookingConfirmation({
  jobId,
  token,
}: BookingConfirmationProps) {
  const calendarUrl = buildCalendarIcsUrl(jobId, token);
  const jobStatusUrl = buildJobStatusUrl(jobId, token);

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

        <div className="mt-10 flex flex-col gap-3 w-full max-w-[400px]">
          <Button
            asChild
            className="w-full bg-[#ffa270] hover:bg-[#ff8f52] text-black font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] h-12"
          >
            <a href={calendarUrl}>Add to calendar</a>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] h-12"
          >
            <Link href={jobStatusUrl}>View job status</Link>
          </Button>
        </div>

        <p className="mt-8 text-gray-500 text-sm leading-relaxed">
          Save the appointment to your calendar, then track your repair anytime
          from your job page.
        </p>
      </div>
    </div>
  );
}
