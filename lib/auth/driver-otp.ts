import {
  checkVerification,
  startVerification,
  TwilioError,
} from "@/lib/twilio";
import { normalizeUsPhone } from "@/lib/phone";

export class InvalidOtpError extends Error {
  constructor(message = "Invalid or expired verification code.") {
    super(message);
    this.name = "InvalidOtpError";
  }
}

/** Send an SMS OTP to a driver's phone. */
export async function sendDriverOtp(phone: string): Promise<void> {
  const phoneE164 = normalizeUsPhone(phone);

  try {
    await startVerification(phoneE164);
  } catch (error) {
    if (error instanceof TwilioError) {
      throw error;
    }
    throw error;
  }
}

/** Verify a driver's OTP. */
export async function verifyDriverOtp(
  phone: string,
  code: string,
): Promise<void> {
  const phoneE164 = normalizeUsPhone(phone);

  let check;
  try {
    check = await checkVerification(phoneE164, code);
  } catch (error) {
    if (error instanceof TwilioError) {
      throw new InvalidOtpError();
    }
    throw error;
  }

  if (!check.valid || check.status !== "approved") {
    throw new InvalidOtpError();
  }
}
