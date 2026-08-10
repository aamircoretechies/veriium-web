"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Separator } from "@/app/components/ui/separator";
import Footer from "../../../app/components/Footer";
import {
  DRIVER_TIMELINE_STEPS,
  formatCostEstimateRange,
  formatCurrency,
  formatDriveabilitySeverity,
  getDriverJobUiPhase,
  getDriverQuoteUiStatus,
  getDriverTimelineLabel,
  getDriverTimelineStepIndex,
  shouldPollDriverJobStatus,
  shouldShowDiagnosisSection,
  shouldShowQuoteSection,
} from "@/lib/bookings/driver-job-status";
import {
  BOOKING_POLL_INTERVAL_MS,
  BookingSummaryFetchError,
  fetchBookingSummary,
  formatBookingScheduledTime,
  formatBookingServiceTypeLabel,
  formatBookingVehicleLabel,
} from "@/lib/bookings/poll-summary";
import type { BookingSummary } from "@/types/api/booking-summary";

interface JobStatusProps {
  jobId: string;
  token: string;
}

function getMechanicInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "M";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function MechanicAvatar({
  name,
  profilePhotoUrl,
}: {
  name: string;
  profilePhotoUrl?: string;
}) {
  if (profilePhotoUrl) {
    return (
      <img
        src={profilePhotoUrl}
        alt={name}
        className="w-16 h-16 rounded-full border-2 border-gray-200 object-cover"
      />
    );
  }

  return (
    <div className="w-16 h-16 rounded-full border-2 border-gray-200 bg-[#ffa270] flex items-center justify-center shrink-0">
      <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-white text-lg select-none">
        {getMechanicInitials(name)}
      </span>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex-1 w-full flex items-center justify-center py-24">
      <div className="w-12 h-12 rounded-full border-[2px] border-[#ffa270] border-t-transparent animate-spin" />
    </div>
  );
}

function StatusMessage({
  title,
  message,
  onGoHome,
}: {
  title: string;
  message: string;
  onGoHome?: () => void;
}) {
  return (
    <div className="flex-1 w-full max-w-4xl py-[40px] px-[20px] flex flex-col items-center justify-center text-center gap-6">
      <div>
        <h1 className="text-3xl font-['Albert_Sans:Bold',sans-serif] font-bold text-black mb-2">
          {title}
        </h1>
        <p className="text-gray-600 max-w-md">{message}</p>
      </div>
      {onGoHome ? (
        <Button
          className="bg-[#ffa270] hover:bg-[#ff8f52] text-black font-bold"
          onClick={onGoHome}
        >
          Back to home
        </Button>
      ) : null}
    </div>
  );
}

export default function JobStatus({ jobId, token }: JobStatusProps) {
  const router = useRouter();
  const [summary, setSummary] = useState<BookingSummary | undefined>();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const statusRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const abortController = new AbortController();

    const applySummary = (nextSummary: BookingSummary) => {
      if (cancelled) {
        return;
      }

      const phase = getDriverJobUiPhase(nextSummary.status);
      if (phase === "pre_match") {
        router.replace(
          `/public/match?jobId=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`,
        );
        return;
      }

      setSummary(nextSummary);
      setLoading(false);
      setFetchError("");
      statusRef.current = nextSummary.status;

      if (!shouldPollDriverJobStatus(nextSummary.status) && intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const poll = async () => {
      try {
        const nextSummary = await fetchBookingSummary(
          jobId,
          token,
          abortController.signal,
        );
        applySummary(nextSummary);
      } catch (error) {
        if (cancelled || abortController.signal.aborted) {
          return;
        }

        if (error instanceof BookingSummaryFetchError) {
          if (
            error.code === "invalid_token" ||
            error.code === "booking_not_found"
          ) {
            router.replace("/public?error=invalid_link");
            return;
          }
        }

        if (!statusRef.current) {
          setLoading(false);
          setFetchError("Unable to load job status. Retrying…");
        }
      }
    };

    void poll();

    intervalId = setInterval(() => {
      if (statusRef.current && !shouldPollDriverJobStatus(statusRef.current as BookingSummary["status"])) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = undefined;
        }
        return;
      }

      void poll();
    }, BOOKING_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      abortController.abort();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [jobId, router, token]);

  const uiPhase = summary ? getDriverJobUiPhase(summary.status) : "active";
  const currentStepIndex = summary
    ? getDriverTimelineStepIndex(summary.status)
    : 0;
  const timelineLabel = summary
    ? getDriverTimelineLabel(summary.status)
    : "Status update pending";
  const quoteUiStatus = summary
    ? getDriverQuoteUiStatus(summary.status)
    : "none";
  const mechanic = summary?.mechanic;
  const diagnosis = summary?.diagnosis;
  const costEstimateRange = formatCostEstimateRange(
    diagnosis?.costEstimateLow,
    diagnosis?.costEstimateHigh,
  );
  const driveabilitySeverity = formatDriveabilitySeverity(diagnosis?.driveability);
  const quoteAmount = formatCurrency(summary?.quoteTotal);
  const showDiagnosis = shouldShowDiagnosisSection(currentStepIndex);
  const showQuote = shouldShowQuoteSection(currentStepIndex);

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col items-center font-['Albert_Sans:Regular',sans-serif]">
      <div className="bg-black w-full flex items-center justify-between px-[24px] md:px-[100px] py-[20px] shrink-0 sticky top-0 z-50">
        <div className="cursor-pointer" onClick={() => router.push("/public")}>
          <span className="font-['Inter:Bold',sans-serif] font-bold text-[28px] text-white tracking-[0.1px]">
            VERIIUM
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/80 font-medium hidden md:inline">
            Booking: {jobId}
          </span>
          <Button variant="outline" className="text-black bg-white hover:bg-gray-100 border-none font-bold">
            Support
          </Button>
        </div>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && fetchError && !summary && (
        <StatusMessage title="Unable to load job" message={fetchError} />
      )}

      {!loading && uiPhase === "cancelled" && (
        <StatusMessage
          title="Booking cancelled"
          message="This booking is no longer active. You can start a new request from the home page."
          onGoHome={() => router.push("/public")}
        />
      )}

      {!loading && uiPhase === "terminal" && summary && (
        <StatusMessage
          title="Booking update"
          message={`This booking is in a ${summary.status.replace(/_/g, " ")} state. Contact support if you need help.`}
          onGoHome={() => router.push("/public")}
        />
      )}

      {!loading && uiPhase === "active" && summary && (
        <div className="flex-1 w-full max-w-4xl py-[40px] px-[20px] flex flex-col gap-[32px]">
          {fetchError ? (
            <div className="border border-amber-200 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {fetchError}
            </div>
          ) : null}

          <div>
            <h1 className="text-3xl font-['Albert_Sans:Bold',sans-serif] font-bold text-black mb-2">
              Job Status
            </h1>
            <p className="text-gray-600">Track your repair progress in real-time.</p>
          </div>

          <Card className="border-none shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
            <CardHeader className="bg-gray-50 border-b pb-4">
              <CardTitle className="text-lg font-['Albert_Sans:Bold',sans-serif]">
                Live Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative">
                <div className="absolute left-[15px] md:left-[19px] top-4 bottom-4 w-1 bg-gray-200 rounded-full" />

                <div className="flex flex-col gap-6">
                  {DRIVER_TIMELINE_STEPS.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;

                    return (
                      <div
                        key={step.id}
                        className={`flex items-start gap-4 relative z-10 ${!isCompleted && !isCurrent ? "opacity-40" : ""}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
                            isCompleted
                              ? "bg-[#ffa270] border-[#ffa270] text-black"
                              : isCurrent
                                ? "bg-white border-[#ffa270] text-[#ffa270]"
                                : "bg-white border-gray-300 text-gray-300"
                          }`}
                        >
                          {isCompleted && !isCurrent ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${isCurrent ? "bg-[#ffa270]" : "bg-transparent"}`}
                            />
                          )}
                        </div>
                        <div className="flex flex-col mt-1">
                          <span
                            className={`font-['Albert_Sans:Bold',sans-serif] font-bold ${isCurrent ? "text-black text-lg" : "text-gray-700"}`}
                          >
                            {step.label}
                          </span>
                          {isCurrent ? (
                            <span className="text-sm text-[#ffa270] font-medium mt-0.5">
                              Currently active
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-[32px]">
            <Card className="border-none shadow-[0_4px_24px_rgba(0,0,0,0.04)] h-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-['Albert_Sans:Bold',sans-serif]">
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">Vehicle</span>
                  <span className="font-['Albert_Sans:Bold',sans-serif] text-right">
                    {formatBookingVehicleLabel(summary)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">Service</span>
                  <span className="font-medium text-right">
                    {formatBookingServiceTypeLabel(summary.serviceType)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">Time</span>
                  <span className="font-medium text-right">
                    {formatBookingScheduledTime(summary.scheduledTime)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">Status</span>
                  <Badge className="bg-[#ffa270] hover:bg-[#ffa270] text-black border-none uppercase text-xs px-2 py-0.5">
                    {timelineLabel}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-[0_4px_24px_rgba(0,0,0,0.04)] h-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-['Albert_Sans:Bold',sans-serif]">
                  Your Mechanic
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mechanic ? (
                  <>
                    <div className="flex items-center gap-4">
                      <MechanicAvatar
                        name={mechanic.name}
                        profilePhotoUrl={mechanic.profilePhotoUrl}
                      />
                      <div>
                        <h3 className="font-['Albert_Sans:Bold',sans-serif] text-lg text-black">
                          {mechanic.name}
                        </h3>
                        {mechanic.certifiedStatus === "certified" ? (
                          <p className="text-sm text-gray-600">ASE Certified</p>
                        ) : null}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Verified Trust Badges</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="bg-green-50 text-green-700 border border-green-200">
                          ✓ Background Checked
                        </Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-600">Mechanic details will appear once assigned.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {showDiagnosis && (
            <div className="grid md:grid-cols-2 gap-[32px]">
              <Card className="border-none shadow-[0_4px_24px_rgba(0,0,0,0.04)] bg-amber-50/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-['Albert_Sans:Bold',sans-serif] flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Diagnosis Result
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Identified Issue</p>
                    <p className="font-['Albert_Sans:Bold',sans-serif] text-lg text-black">
                      {diagnosis?.summary ?? summary.issueText ?? "Diagnosis in progress"}
                    </p>
                  </div>
                  {driveabilitySeverity ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Severity</p>
                        <p className="font-medium text-red-600">{driveabilitySeverity}</p>
                      </div>
                    </div>
                  ) : null}
                  {costEstimateRange ? (
                    <div>
                      <p className="text-sm text-gray-500">Original Estimate Range</p>
                      <p className="font-medium text-gray-700">{costEstimateRange}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {showQuote && (
                <Card className="border-none shadow-[0_4px_24px_rgba(0,0,0,0.04)] border-2 border-[#ffa270]">
                  <CardHeader className="bg-[#ffa270]/10 pb-4">
                    <CardTitle className="text-lg font-['Albert_Sans:Bold',sans-serif]">
                      Official Quote
                    </CardTitle>
                    <CardDescription className="text-black font-medium text-2xl mt-1">
                      {quoteAmount ?? "Quote pending"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {quoteUiStatus === "pending" && (
                      <>
                        <p className="text-sm text-gray-600">
                          Reply APPROVE or DECLINE to the text thread to respond to this quote.
                        </p>
                        <div className="flex gap-3 mt-2">
                          <Button
                            className="flex-1 bg-[#ffa270] hover:bg-[#ff8f52] text-black font-bold h-12"
                            disabled
                          >
                            Approve Work
                          </Button>
                          <Button variant="outline" className="flex-1 h-12 font-bold" disabled>
                            Decline
                          </Button>
                        </div>
                      </>
                    )}

                    {quoteUiStatus === "approved" && (
                      <div className="bg-green-50 text-green-700 p-3 rounded-lg text-center font-bold mt-4 border border-green-200">
                        Quote Approved! Repair will now begin.
                      </div>
                    )}

                    {quoteUiStatus === "declined" && (
                      <div className="bg-red-50 text-red-700 p-3 rounded-lg text-center font-bold mt-4 border border-red-200">
                        Quote Declined. You will only be charged the diagnostic fee.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <Card className="border-none shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-['Albert_Sans:Bold',sans-serif]">
                Payment & Completion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Card on File</p>
                    <p className="font-medium">
                      {summary.paymentSetupComplete
                        ? "Payment method on file"
                        : "Payment method pending"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Final Payment Status</p>
                    <p className="font-medium text-gray-700">
                      {quoteUiStatus === "approved"
                        ? "Awaiting Repair Completion"
                        : quoteUiStatus === "declined"
                          ? "Charging Diagnostic Fee"
                          : quoteUiStatus === "pending"
                            ? "Pending Approval"
                            : "In progress"}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl flex flex-col justify-center items-center text-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-['Albert_Sans:Bold',sans-serif] text-black">
                      Repair Summary & Receipt
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Available once the repair is completed.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-2 font-bold"
                    disabled={currentStepIndex < 7}
                  >
                    Download Full Receipt
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Footer />
    </div>
  );
}
