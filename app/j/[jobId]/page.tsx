import { redirect } from "next/navigation";

import { AirtableError, getAirtableClient } from "@/lib/airtable";
import { isTokenValidForJob } from "@/lib/auth/signed-url";
import type { JobFields } from "@/types/airtable/jobs";
import JobStatus from "../../../src_mirror/imports/JobStatus/JobStatus";

type DriverJobPageProps = {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function DriverJobPage({
  params,
  searchParams,
}: DriverJobPageProps) {
  const { jobId } = await params;
  const { token } = await searchParams;

  if (!token) {
    redirect("/public?error=invalid_link");
  }

  try {
    const client = getAirtableClient();
    const job = await client.getRecord<JobFields>("jobs", jobId);

    if (!(await isTokenValidForJob(jobId, job.fields, token))) {
      redirect("/public?error=invalid_link");
    }
  } catch (error) {
    if (error instanceof AirtableError && error.status === 404) {
      redirect("/public?error=invalid_link");
    }
    throw error;
  }

  return <JobStatus />;
}
