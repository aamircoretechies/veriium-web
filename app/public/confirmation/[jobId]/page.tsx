import { redirect } from "next/navigation";

import BookingConfirmation from "../../../../src_mirror/imports/Booking/BookingConfirmation";

type ConfirmationPageProps = {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function ConfirmationPage({
  params,
  searchParams,
}: ConfirmationPageProps) {
  const { jobId } = await params;
  const { token } = await searchParams;

  if (!token) {
    redirect("/public?error=invalid_link");
  }

  return <BookingConfirmation jobId={jobId} token={token} />;
}
