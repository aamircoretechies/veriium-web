import { redirect } from "next/navigation";

import PaymentGateway from "../../../src_mirror/imports/Booking/PaymentGateway";

type PaymentPageProps = {
  searchParams: Promise<{ jobId?: string; token?: string }>;
};

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const { jobId, token } = await searchParams;

  if (!jobId || !token) {
    redirect("/public?error=invalid_link");
  }

  return <PaymentGateway jobId={jobId} token={token} />;
}
