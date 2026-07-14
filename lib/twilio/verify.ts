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

/**
 * Fixed OTP accepted when Twilio Verify is skipped:
 * - local `next dev` (`NODE_ENV=development`), or
 * - `ALLOW_DEV_OTP=true` (e.g. Vercel Preview testing).
 */
export const DEV_OTP_CODE = "000000";

function isDevOtpBypass(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_DEV_OTP === "true"
  );
}

/** Start SMS OTP verification for a phone number (E.164). */
export async function startVerification(
  phoneE164: string,
): Promise<VerificationResponse> {
  if (isDevOtpBypass()) {
    console.info(
      `[dev-otp] Skipping Twilio Verify. Code for ${phoneE164}: ${DEV_OTP_CODE}`,
    );
    return {
      sid: `VE_dev_${Date.now()}`,
      status: "pending",
      to: phoneE164,
      channel: "sms",
    };
  }

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
  if (isDevOtpBypass()) {
    const valid = code.trim() === DEV_OTP_CODE;
    console.info(
      `[dev-otp] Check for ${phoneE164}: ${valid ? "approved" : "rejected"} (expected ${DEV_OTP_CODE})`,
    );
    return {
      sid: `VE_dev_check_${Date.now()}`,
      status: valid ? "approved" : "pending",
      to: phoneE164,
      valid,
    };
  }

  return twilioVerifyRequest<VerificationCheckResponse>("/VerificationCheck", {
    method: "POST",
    body: {
      To: phoneE164,
      Code: code,
    },
  });
}
