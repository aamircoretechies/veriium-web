import { Suspense } from "react";
import MechanicJobReceiptPage from "./MechanicJobReceiptPage";

type PageProps = { params: Promise<{ jobId: string }> };

export default async function Page({ params }: PageProps) {
  const { jobId } = await params;

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
