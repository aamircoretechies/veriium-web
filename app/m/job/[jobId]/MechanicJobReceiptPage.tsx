"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReceiptUploadPanel from "@/app/components/mechanic/ReceiptUploadPanel";

type JobReceiptView = {
  jobId: string;
  status: string;
  partsCost: number | null;
  receiptStatus: string | null;
  partsReimbursementForfeited: boolean;
  vehicle: { year: number | null; make: string | null; model: string | null };
};

export default function MechanicJobReceiptPage({
  jobId,
}: {
  jobId: string;
}) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [job, setJob] = useState<JobReceiptView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadJob = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(`/api/jobs/${jobId}/receipt`, window.location.origin);
      if (token) {
        url.searchParams.set("token", token);
      }

      const sessionToken = localStorage.getItem("veriium_mechanic_token");
      const headers: Record<string, string> = {};
      if (sessionToken) {
        headers.Authorization = `Bearer ${sessionToken}`;
      }

      const res = await fetch(url.toString(), { headers });
      const data = (await res.json()) as JobReceiptView & {
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

  const vehicleLabel = [job.vehicle.year, job.vehicle.make, job.vehicle.model]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="mx-auto min-h-screen max-w-lg p-6 font-['Albert_Sans:Regular',sans-serif]">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="font-['Albert_Sans:Bold',sans-serif] text-2xl font-bold">
          Upload Parts Receipt
        </h1>
        {vehicleLabel && (
          <p className="text-[15px] text-gray-600">{vehicleLabel}</p>
        )}
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
