import { twilioVerifyRequest } from "./client";

export type VerificationStatus =
  | "pending"
  | "approved"
  | "canceled"
  | "max_attempts_reached"
  | "deleted"
  | "failed"
  | "expired";

export type VerificationResponse = {
  sid: string;
  status: VerificationStatus;
  to: string;
  channel: string;
};

export type VerificationCheckResponse = {
  sid: string;
  status: VerificationStatus;
  to: string;
  valid: boolean;
};

/** Start SMS OTP verification for a phone number (E.164). */
export async function startVerification(
  phoneE164: string,
): Promise<VerificationResponse> {
  return twilioVerifyRequest<VerificationResponse>("/Verifications", {
    method: "POST",
    body: {
      To: phoneE164,
      Channel: "sms",
    },
  });
}

/** Check an OTP code against an in-flight verification. */
export async function checkVerification(
  phoneE164: string,
  code: string,
): Promise<VerificationCheckResponse> {
  return twilioVerifyRequest<VerificationCheckResponse>("/VerificationCheck", {
    method: "POST",
    body: {
      To: phoneE164,
      Code: code,
    },
  });
}
