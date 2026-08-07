import { redirect } from "next/navigation";

import BookingSummary from "../../../src_mirror/imports/Booking/BookingSummary";

type SummaryPageProps = {
  searchParams: Promise<{ jobId?: string; token?: string }>;
};

export default async function SummaryPage({ searchParams }: SummaryPageProps) {
  const { jobId, token } = await searchParams;

  if (!jobId || !token) {
    redirect("/public?error=invalid_link");
  }

  return <BookingSummary jobId={jobId} token={token} />;
}
