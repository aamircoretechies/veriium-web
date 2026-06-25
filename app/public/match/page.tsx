"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import MatchFound from "../../../src_mirror/imports/Diagnosis/MatchFound";

function MatchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const token = searchParams.get("token");

  const handleContinue = () => {
    if (jobId && token) {
      router.push(
        `/public/payment?jobId=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`,
      );
      return;
    }

    router.push("/public/payment");
  };

  return (
    <MatchFound onBack={() => router.back()} onContinue={handleContinue} />
  );
}

export default function MatchPage() {
  return (
    <Suspense>
      <MatchPageContent />
    </Suspense>
  );
}
