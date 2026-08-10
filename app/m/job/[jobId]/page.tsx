import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AirtableError, getAirtableClient } from "@/lib/airtable";
import { isTokenValidForJob } from "@/lib/auth/signed-url";
import type { JobFields } from "@/types/airtable/jobs";
import MechanicJobReceiptPage from "./MechanicJobReceiptPage";

type PageProps = {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { jobId } = await params;
  const { token } = await searchParams;

  if (token) {
    try {
      const client = getAirtableClient();
      const job = await client.getRecord<JobFields>("jobs", jobId);

      if (!(await isTokenValidForJob(jobId, job.fields, token))) {
        redirect("/m/signin?error=invalid_link");
      }
    } catch (error) {
      if (error instanceof AirtableError && error.status === 404) {
        redirect("/m/signin?error=invalid_link");
      }
      throw error;
    }
  }

  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-lg items-center justify-center p-6">
          <p className="text-gray-600">Loading…</p>
        </main>
      }
    >
      <MechanicJobReceiptPage jobId={jobId} />
    </Suspense>
  );
}
