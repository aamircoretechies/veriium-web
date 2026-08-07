import type {
  PaymentCompleteResponse,
  PaymentSetupResponse,
} from "@/types/api/payment";

export class BookingPaymentApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BookingPaymentApiError";
    this.code = code;
  }
}

async function parseApiErrorResponse(
  res: Response,
): Promise<{ code: string; message: string }> {
  let code = "request_failed";
  let message = "Something went wrong. Please try again.";

  try {
    const data = (await res.json()) as {
      error?: { code?: string; message?: string };
    };
    code = data.error?.code ?? code;
    message = data.error?.message ?? message;
  } catch {
    // Keep defaults.
  }

  return { code, message };
}

export async function fetchPaymentSetupClient(
  jobId: string,
  token: string,
): Promise<PaymentSetupResponse> {
  const res = await fetch(
    `/api/bookings/${encodeURIComponent(jobId)}/payment`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    },
  );

  if (!res.ok) {
    const { code, message } = await parseApiErrorResponse(res);
    throw new BookingPaymentApiError(code, message);
  }

  return (await res.json()) as PaymentSetupResponse;
}

export async function completeBookingPaymentClient(
  jobId: string,
  token: string,
  setupIntentId: string,
): Promise<PaymentCompleteResponse> {
  const res = await fetch(
    `/api/bookings/${encodeURIComponent(jobId)}/payment/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, setupIntentId }),
    },
  );

  if (!res.ok) {
    const { code, message } = await parseApiErrorResponse(res);
    throw new BookingPaymentApiError(code, message);
  }

  return (await res.json()) as PaymentCompleteResponse;
}
