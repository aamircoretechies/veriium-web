"use client";

import { useCallback, useState, type FormEvent } from "react";
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
  const [pasteUrl, setPasteUrl] = useState("");

  const cloudinaryConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  );

  const showUpload =
    receiptStatus === "pending" ||
    receiptStatus === "overdue" ||
    receiptStatus === "invalid" ||
    !receiptStatus;

  const submitReceiptUrl = useCallback(
    async (receiptUrl: string) => {
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
    },
    [jobId, tokenProp],
  );

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      setError(null);
      setUploading(true);

      try {
        const receiptUrl = await uploadToCloudinary(file);
        await submitReceiptUrl(receiptUrl);
        setSuccess(true);
        onSubmitted?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [onSubmitted, submitReceiptUrl],
  );

  const handlePasteUrl = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const trimmed = pasteUrl.trim();
      if (!/^https:\/\//i.test(trimmed)) {
        setError("Enter a public https:// image URL.");
        return;
      }

      setError(null);
      setUploading(true);
      try {
        await submitReceiptUrl(trimmed);
        setSuccess(true);
        onSubmitted?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submit failed.");
      } finally {
        setUploading(false);
      }
    },
    [onSubmitted, pasteUrl, submitReceiptUrl],
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
        {!cloudinaryConfigured && (
          <span className="mt-1 block text-[13px] text-gray-500">
            Staging: file upload uses a placeholder image (Cloudinary not configured). You can also paste a public HTTPS URL below.
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
      <form onSubmit={(e) => void handlePasteUrl(e)} className="flex flex-col gap-2">
        <label className="text-[12px] font-medium text-gray-600">
          Or paste a public HTTPS receipt URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            placeholder="https://…"
            disabled={uploading}
            className="min-w-0 flex-1 rounded-[8px] border border-gray-300 px-3 py-2 text-[14px]"
          />
          <button
            type="submit"
            disabled={uploading || !pasteUrl.trim()}
            className="shrink-0 rounded-[8px] bg-[#ffa270] px-4 py-2 text-[14px] font-semibold text-black disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </form>
      {error && <p className="text-[13px] text-red-600">{error}</p>}
    </div>
  );
}
