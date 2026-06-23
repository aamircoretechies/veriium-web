"use client";
import { useRouter } from "next/navigation";
import DiagnosisResult from "../../../src_mirror/imports/Diagnosis/DiagnosisResult";

export default function PublicDiagnosisPage() {
  const router = useRouter();
  
  return (
    <DiagnosisResult onMatchFound={() => router.push('/public/match')} />
  );
}
