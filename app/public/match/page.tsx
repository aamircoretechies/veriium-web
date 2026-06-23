"use client";
import { useRouter } from "next/navigation";
import MatchFound from "../../../src_mirror/imports/Diagnosis/MatchFound";

export default function MatchPage() {
  const router = useRouter();

  return (
    <MatchFound 
      onBack={() => router.back()} 
      onContinue={() => router.push("/public/payment")} 
    />
  );
}

