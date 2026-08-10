"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReceiptUploadPanel from "@/app/components/mechanic/ReceiptUploadPanel";
import type { MechanicJobView } from "@/types/api/mechanic-job-view";

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[#ffa270]/20 px-2.5 py-1 text-xs font-bold font-['Albert_Sans:Bold',sans-serif] text-[#e8854a]">
      {label}
    </span>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-[#ebebeb] bg-[#f7f7f7] p-5">
      <h2 className="font-['Albert_Sans:Bold',sans-serif] text-[15px] font-bold text-black">
        {title}
      </h2>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[12px] font-medium uppercase tracking-wide text-[#888]">
        {label}
      </span>
      <span className="text-[15px] text-[#333]">{value}</span>
    </div>
  );
}

export default function MechanicJobReceiptPage({
  jobId,
}: {
  jobId: string;
}) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [job, setJob] = useState<MechanicJobView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadJob = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(
        `/api/jobs/${jobId}/mechanic-view`,
        window.location.origin,
      );
      if (token) {
        url.searchParams.set("token", token);
      }

      const sessionToken = localStorage.getItem("veriium_mechanic_token");
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const res = await fetch(url.toString(), { headers });
      const data = (await res.json()) as MechanicJobView & {
        error?: { message?: string };
      };

      if (!res.ok) {
        throw new Error(data.error?.message ?? "Failed to load job.");
      }

      setJob(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job.");
    } finally {
      setLoading(false);
    }
  }, [jobId, token]);

  useEffect(() => {
    void loadJob();
  }, [loadJob]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center p-6">
        <p className="text-gray-600">Loading…</p>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6">
        <p className="text-center text-red-600">{error ?? "Job not found."}</p>
      </main>
    );
  }

  const vehicleLabel = [
    job.vehicle.year,
    job.vehicle.make,
    job.vehicle.model,
  ]
    .filter(Boolean)
    .join(" ");

  const summaryText = job.diagnosisSummary ?? job.issueText;

  return (
    <main className="mx-auto min-h-screen max-w-lg p-6 font-['Albert_Sans:Regular',sans-serif]">
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-['Albert_Sans:Bold',sans-serif] text-2xl font-bold">
            Active Job
          </h1>
          <StatusBadge label={job.statusLabel} />
        </div>
        {vehicleLabel && (
          <p className="text-[15px] text-gray-600">{vehicleLabel}</p>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-4">
        <InfoCard title="Job details">
          <DetailRow label="Service type" value={job.serviceTypeLabel} />
          <DetailRow label="ZIP" value={job.zipCode} />
          <DetailRow
            label="Scheduled"
            value={job.scheduledTimeLabel ?? "As soon as possible"}
          />
          {summaryText && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] font-medium uppercase tracking-wide text-[#888]">
                Issue
              </span>
              <p className="text-[15px] leading-[1.6] text-[#333]">
                {summaryText}
              </p>
            </div>
          )}
        </InfoCard>

        <InfoCard title="Driver contact">
          <DetailRow label="Name" value={job.driver.name} />
          {job.driver.phone ? (
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] font-medium uppercase tracking-wide text-[#888]">
                Phone
              </span>
              <a
                href={`tel:${job.driver.phone}`}
                className="text-[15px] font-medium text-[#e8854a] underline"
              >
                {job.driver.phone}
              </a>
            </div>
          ) : null}
          <DetailRow label="ZIP" value={job.driver.zip} />
        </InfoCard>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <h2 className="font-['Albert_Sans:Bold',sans-serif] text-lg font-bold">
          Parts receipt
        </h2>
        {job.partsCost != null && job.partsCost > 0 && (
          <p className="text-[14px] text-gray-500">
            Quoted parts: ${job.partsCost.toFixed(2)}
          </p>
        )}
        {job.partsReimbursementForfeited && (
          <p className="text-[14px] font-medium text-red-700">
            Parts reimbursement flagged as forfeited pending admin review.
          </p>
        )}
      </div>

      <ReceiptUploadPanel
        jobId={jobId}
        token={token}
        receiptStatus={job.receiptStatus}
        onSubmitted={() => void loadJob()}
      />
    </main>
  );
}
