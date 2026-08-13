"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ReceiptUploadPanel from "@/app/components/mechanic/ReceiptUploadPanel";
import type { MechanicJobDetail } from "@/types/api/mechanic-job-view";
import type { JobsStatus } from "@/types/airtable/generated/enums";
import Footer from "../../../app/components/Footer";
import imgCarRepair from "../LandingDesktopV2/4943cb7fc6a48d7dc22bbbde539341ff388b0172.webp";
import { useMechanicAuth } from "./MechanicAuthContext";
import MechanicTopNav from "./MechanicTopNav";

const TOKEN_KEY = "veriium_mechanic_token";

const PROGRESS_STATUSES: readonly JobsStatus[] = [
  "matched_awaiting_payment",
  "accepted_by_mechanic",
  "en_route",
  "arrived",
  "diagnosing",
  "quote_provided",
  "awaiting_customer_approval",
  "approved_parts_pickup",
  "in_progress",
  "completed_pending_confirmation",
  "confirmed",
];

function Badge({
  children,
  variant = "neutral",
}: {
  children: React.ReactNode;
  variant?: "neutral" | "success" | "warning" | "danger" | "brand";
}) {
  const colors = {
    neutral: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800",
    brand: "bg-[#ffa270]/20 text-[#e8854a]",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-['Albert_Sans:Bold',sans-serif] font-bold ${colors[variant]}`}
    >
      {children}
    </span>
  );
}

function StatusBadge({
  label,
  variant = "brand",
}: {
  label: string;
  variant?: "neutral" | "success" | "warning" | "danger" | "brand";
}) {
  return <Badge variant={variant}>{label}</Badge>;
}

function getProgressPercent(status: JobsStatus): number {
  const index = PROGRESS_STATUSES.indexOf(status);
  if (index < 0) {
    return 0;
  }
  if (PROGRESS_STATUSES.length <= 1) {
    return 100;
  }
  return (index / (PROGRESS_STATUSES.length - 1)) * 100;
}

function formatVehicle(job: MechanicJobDetail): string {
  const parts = [job.vehicle.year, job.vehicle.make, job.vehicle.model].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(" ") : "Vehicle details pending";
}

export default function MechanicRepairDetail() {
  const params = useParams();
  const repairId = params?.repairId as string | undefined;
  const router = useRouter();
  const { hydrated, mechanic, signOut } = useMechanicAuth();
  const [job, setJob] = useState<MechanicJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJob = useCallback(async () => {
    if (!repairId) {
      setError("Job not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setError("Please sign in to view this job.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/mechanics/jobs/${repairId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        signOut();
        return;
      }

      const data = (await res.json()) as {
        job?: MechanicJobDetail;
        error?: { message?: string };
      };

      if (!res.ok) {
        throw new Error(data.error?.message ?? "Failed to load job.");
      }

      if (!data.job) {
        throw new Error("Job not found.");
      }

      setJob(data.job);
    } catch (err) {
      setJob(null);
      setError(err instanceof Error ? err.message : "Failed to load job.");
    } finally {
      setLoading(false);
    }
  }, [repairId, signOut]);

  useEffect(() => {
    if (!hydrated || !mechanic) {
      return;
    }
    void loadJob();
  }, [hydrated, mechanic, loadJob]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-2xl">
          Loading...
        </h1>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-2xl text-red-600">
          {error ?? "Job not found."}
        </h1>
        <button
          onClick={() => router.push("/mechanic/repairs")}
          className="text-[#e8854a] font-medium bg-transparent border-none cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const diagnosisText = job.diagnosisSummary ?? job.issueText;
  const progressPercent = getProgressPercent(job.status);
  const showProgress = job.listStatus === "active";
  const showPayoutCard =
    job.quoteTotal != null ||
    job.partsCost != null ||
    job.platformFee != null ||
    job.mechanicPayout != null;

  return (
    <div className="bg-white flex flex-col relative w-full min-h-screen overflow-x-hidden font-['Albert_Sans:Regular',sans-serif]">
      <div className="relative z-10 w-full max-w-[1440px] px-[24px] md:px-[60px] lg:px-[100px] flex flex-col gap-[32px] mx-auto pb-[80px]">
        <MechanicTopNav activeTab="my-repairs" />

        <div className="mt-[-16px] mb-[-16px]">
          <button
            onClick={() => router.push("/mechanic/repairs")}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors font-['Albert_Sans:Medium',sans-serif] cursor-pointer bg-transparent border-none p-0"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[48px] items-start">
          <div className="flex flex-col gap-[16px]">
            <div className="flex items-center gap-3">
              <StatusBadge
                label={job.statusLabel}
                variant={job.requotePending ? "warning" : "brand"}
              />
              {job.serviceTypeLabel && (
                <Badge variant="neutral">{job.serviceTypeLabel}</Badge>
              )}
            </div>

            <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[36px] text-black leading-[1.1] tracking-[-0.5px]">
              {job.title}
            </h1>

            <p className="text-[15px] text-gray-600">
              {job.dateLabel}:{" "}
              <span className="font-medium text-black">{job.dateValue}</span>
            </p>

            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-[12px] p-6 grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-[13px] text-gray-500 mb-1">Est. Cost Range</p>
                <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px]">
                  {job.estimatedCostRange ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[13px] text-gray-500 mb-1">{job.costLabel}</p>
                <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px]">
                  {job.costValue}
                </p>
              </div>
              <div>
                <p className="text-[13px] text-gray-500 mb-1">ZIP Code</p>
                <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px]">
                  {job.zipCode ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[13px] text-gray-500 mb-1">Service</p>
                <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px]">
                  {job.serviceTypeLabel ?? "—"}
                </p>
              </div>
            </div>

            {showProgress && (
              <div className="mt-6 flex flex-col gap-4 p-6 border border-[#D2D2D2] rounded-[12px]">
                <div className="flex justify-between items-center">
                  <h3 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px]">
                    Repair Progress
                  </h3>
                  <span className="text-[13px] text-gray-500">
                    Status: {job.statusLabel}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2">
                  <div
                    className="bg-[#ffa270] h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[13px] font-medium text-gray-600 mt-1">
                  <span>Accepted</span>
                  <span className="text-black font-bold">{job.statusLabel}</span>
                  <span>Completed</span>
                </div>
                <p className="text-[13px] text-gray-500 mt-1">
                  Update job status via SMS commands (ENROUTE, ARRIVED, etc.).
                </p>
              </div>
            )}
          </div>

          <div className="w-full h-[300px] md:h-[400px] rounded-[16px] overflow-hidden border border-[#D2D2D2]">
            <img
              src={imgCarRepair.src}
              alt="Vehicle"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[32px] pt-4">
          <div className="border border-[#D2D2D2] rounded-[12px] p-[32px] flex flex-col gap-[20px]">
            <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
              Customer Information
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Name</span>
                <span className="font-medium">{job.customerName}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Phone</span>
                {job.driver.phone ? (
                  <a
                    href={`tel:${job.driver.phone}`}
                    className="font-medium text-[#e8854a]"
                  >
                    {job.driver.phone}
                  </a>
                ) : (
                  <span className="font-medium">—</span>
                )}
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Scheduled</span>
                <span className="font-medium">
                  {job.scheduledTimeLabel ?? "As soon as possible"}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">ZIP</span>
                <span className="font-medium">{job.zipCode ?? "—"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Service</span>
                <span className="font-medium">{job.serviceTypeLabel ?? "—"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Vehicle</span>
                <span className="font-medium">{formatVehicle(job)}</span>
              </div>
            </div>
          </div>

          <div className="border border-[#D2D2D2] rounded-[12px] p-[32px] flex flex-col gap-[20px]">
            <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
              Initial Diagnosis
            </h2>
            {diagnosisText ? (
              <p className="text-[15px] leading-relaxed text-gray-700 bg-gray-50 p-4 rounded-lg">
                {diagnosisText}
              </p>
            ) : (
              <p className="text-[15px] text-gray-500">No diagnosis available yet.</p>
            )}
            {job.issueText && job.diagnosisSummary && (
              <div className="mt-2">
                <h3 className="text-[14px] font-bold text-gray-900 mb-1">
                  Customer Notes:
                </h3>
                <p className="text-[14px] text-gray-600 italic">
                  &ldquo;{job.issueText}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {job.requotePending && (
          <div className="border border-yellow-300 bg-yellow-50 rounded-[12px] p-[24px] flex flex-col gap-2 mt-4">
            <div className="flex items-center gap-2">
              <Badge variant="warning">Requote Pending</Badge>
              <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-yellow-950">
                Waiting for driver approval
              </h2>
            </div>
            <p className="text-[14px] text-yellow-900">
              Driver must reply APPROVE or DECLINE via SMS. Quote/requote
              cannot be approved in this app.
            </p>
            {job.requoteReason && (
              <p className="text-[14px] text-yellow-900">
                Reason: {job.requoteReason}
              </p>
            )}
            {(job.originalPartsCostLabel || job.partsCostLabel) && (
              <p className="text-[14px] font-medium text-yellow-950">
                Parts:{" "}
                {job.originalPartsCostLabel
                  ? `was ${job.originalPartsCostLabel}, now ${job.partsCostLabel ?? "—"}`
                  : job.partsCostLabel}
                {job.finalPriceLabel ? ` (new total ${job.finalPriceLabel})` : ""}
              </p>
            )}
          </div>
        )}

        {showPayoutCard && (
          <div className="border border-[#D2D2D2] rounded-[12px] p-[32px] flex flex-col gap-[20px] mt-4">
            <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
              Quote &amp; payout
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Labor quote</span>
                <span className="font-medium">{job.quoteTotalLabel ?? "—"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Parts</span>
                <span className="font-medium">{job.partsCostLabel ?? "—"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Platform fee (15%)</span>
                <span className="font-medium">{job.platformFeeLabel ?? "—"}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500">Your payout</span>
                <span className="font-medium">{job.mechanicPayoutLabel ?? "—"}</span>
              </div>
            </div>
          </div>
        )}

        {repairId && job.listStatus === "active" && (
          <div className="mt-4">
            <ReceiptUploadPanel
              jobId={repairId}
              receiptStatus={job.receiptStatus}
              quotedPartsCost={job.partsCost}
              onSubmitted={() => void loadJob()}
            />
          </div>
        )}

        {job.listStatus === "completed" && (
          <div className="border border-[#22c55e] bg-green-50 rounded-[12px] p-[32px] flex flex-col gap-[20px] w-full mt-4">
            <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-green-900 flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17L4 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Repair Completed
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-2">
              <div>
                <p className="text-[13px] text-green-800 mb-1">{job.costLabel}</p>
                <p className="font-bold text-[18px] text-green-950">
                  {job.costValue}
                </p>
              </div>
              <div>
                <p className="text-[13px] text-green-800 mb-1">Your payout</p>
                <p className="font-bold text-[18px] text-green-950">
                  {job.mechanicPayoutLabel ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[13px] text-green-800 mb-1">Completed On</p>
                <p className="font-bold text-[18px] text-green-950">
                  {job.dateValue}
                </p>
              </div>
              <div>
                <p className="text-[13px] text-green-800 mb-1">Status</p>
                <p className="font-bold text-[18px] text-green-950">
                  {job.statusLabel}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
