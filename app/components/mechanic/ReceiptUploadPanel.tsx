"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { uploadToCloudinary } from "@/lib/cloudinary/upload";

const TOKEN_KEY = "veriium_mechanic_token";

export type ReceiptUploadPanelProps = {
  jobId: string;
  token?: string | null;
  receiptStatus?: string | null;
  onSubmitted?: () => void;
};

export default function ReceiptUploadPanel({
  jobId,
  token: tokenProp,
  receiptStatus,
  onSubmitted,
}: ReceiptUploadPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const showUpload =
    receiptStatus === "pending" ||
    receiptStatus === "overdue" ||
    receiptStatus === "invalid" ||
    !receiptStatus;

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      setError(null);
      setUploading(true);

      try {
        const receiptUrl = await uploadToCloudinary(file);

        const url = new URL(`/api/jobs/${jobId}/receipt`, window.location.origin);
        if (tokenProp && !localStorage.getItem(TOKEN_KEY)) {
          url.searchParams.set("token", tokenProp);
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        const bearer =
          typeof window !== "undefined"
            ? localStorage.getItem(TOKEN_KEY)
            : null;
        if (bearer) {
          headers.Authorization = `Bearer ${bearer}`;
        }

        const res = await fetch(url.toString(), {
          method: "POST",
          headers,
          body: JSON.stringify({ receiptUrl }),
        });

        const data = (await res.json()) as {
          error?: { message?: string };
        };

        if (!res.ok) {
          throw new Error(data.error?.message ?? "Failed to submit receipt.");
        }

        setSuccess(true);
        onSubmitted?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [jobId, onSubmitted, tokenProp],
  );

  if (success || receiptStatus === "submitted") {
    return (
      <div className="rounded-[12px] border border-green-200 bg-green-50 p-4 text-[14px] text-green-900">
        Parts receipt submitted. Thank you!
      </div>
    );
  }

  if (!showUpload) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-[#ffa270]/40 bg-[#fff8f5] p-5">
      <h3 className="font-['Albert_Sans:Bold',sans-serif] text-[16px] font-bold text-black">
        Parts Receipt Required
      </h3>
      <p className="text-[14px] leading-relaxed text-gray-600">
        Upload a photo of your parts receipt within 24 hours of submitting your quote.
        {receiptStatus === "overdue" && (
          <span className="mt-1 block font-medium text-red-700">
            Deadline passed — parts reimbursement may be forfeited. Upload anyway for admin review.
          </span>
        )}
        {receiptStatus === "invalid" && (
          <span className="mt-1 block font-medium text-amber-700">
            Previous receipt was marked invalid. Please upload a clearer photo.
          </span>
        )}
      </p>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-[8px] border-2 border-dashed border-gray-300 bg-white p-6 transition-colors hover:bg-gray-50">
        <Upload className="mb-2 h-8 w-8 text-gray-400" />
        <span className="text-[14px] font-medium text-gray-600">
          {uploading ? "Uploading…" : "Click to upload receipt photo"}
        </span>
        <span className="text-[12px] text-gray-400">JPG, PNG, or PDF</span>
        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          disabled={uploading}
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {error && <p className="text-[13px] text-red-600">{error}</p>}
    </div>
  );
}
