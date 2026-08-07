"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import MatchFound from "../../../src_mirror/imports/Diagnosis/MatchFound";
import {
  BOOKING_POLL_INTERVAL_MS,
  BookingSummaryFetchError,
  fetchBookingSummary,
  getMatchUiPhase,
  shouldPollBookingPhase,
  type MatchUiPhase,
} from "@/lib/bookings/poll-summary";
import type { BookingSummary } from "@/types/api/booking-summary";

function MatchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const token = searchParams.get("token");

  const [phase, setPhase] = useState<MatchUiPhase>("loading");
  const [summary, setSummary] = useState<BookingSummary | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const phaseRef = useRef<MatchUiPhase>("loading");

  const handleContinue = useCallback(() => {
    if (jobId && token) {
      router.push(
        `/public/payment?jobId=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`,
      );
      return;
    }

    router.push("/public/payment");
  }, [jobId, router, token]);

  const handleGoHome = useCallback(() => {
    router.push("/public");
  }, [router]);

  useEffect(() => {
    if (!jobId || !token) {
      router.replace("/public?error=invalid_link");
    }
  }, [jobId, router, token]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (!jobId || !token) {
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const abortController = new AbortController();

    const applySummary = (nextSummary: BookingSummary) => {
      if (cancelled) {
        return;
      }

      const nextPhase = getMatchUiPhase(nextSummary.status);
      setSummary(nextSummary);
      setPhase(nextPhase);
      setErrorMessage(undefined);
      phaseRef.current = nextPhase;

      if (!shouldPollBookingPhase(nextPhase) && intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const poll = async () => {
      try {
        const nextSummary = await fetchBookingSummary(
          jobId,
          token,
          abortController.signal,
        );
        applySummary(nextSummary);
      } catch (error) {
        if (cancelled || abortController.signal.aborted) {
          return;
        }

        if (error instanceof BookingSummaryFetchError) {
          if (error.code === "invalid_token" || error.code === "booking_not_found") {
            setPhase("terminal");
            setErrorMessage(error.message);
            phaseRef.current = "terminal";
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = undefined;
            }
            return;
          }
        }

        if (phaseRef.current === "loading") {
          setPhase("searching");
          phaseRef.current = "searching";
        }
      }
    };

    void poll();

    intervalId = setInterval(() => {
      if (!shouldPollBookingPhase(phaseRef.current)) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = undefined;
        }
        return;
      }

      void poll();
    }, BOOKING_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      abortController.abort();
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [jobId, token]);

  if (!jobId || !token) {
    return null;
  }

  return (
    <MatchFound
      phase={phase}
      summary={summary}
      errorMessage={errorMessage}
      onBack={() => router.back()}
      onContinue={phase === "matched" ? handleContinue : undefined}
      onGoHome={handleGoHome}
    />
  );
}

export default function MatchPage() {
  return (
    <Suspense>
      <MatchPageContent />
    </Suspense>
  );
}
