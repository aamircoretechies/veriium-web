import { getEnv } from "@/config/env";
import { isSmsMock } from "@/lib/dev/flags";
import { twilioApiRequest } from "./client";

export type SendSmsResult = {
  sid: string;
  status: string;
  to: string;
  body: string;
};

function mockSmsResult(to: string, body: string): SendSmsResult {
  const result = {
    sid: `SMmock${Date.now()}`,
    status: "queued",
    to,
    body,
  };
  const log = (globalThis as { __manualTestSmsLog?: SendSmsResult[] })
    .__manualTestSmsLog;
  log?.push(result);
  console.info(`[sms-mock] To ${to}: ${body}`);
  return result;
}

/**
 * Send an outbound SMS via the configured Messaging Service.
 * Falls back to `TWILIO_PHONE_NUMBER` as `From` when no service SID is set.
 *
 * When `SMS_MOCK=1` or local/`ALLOW_DEV_OTP` bypass is on, logs the message
 * and returns a fake SID (no Twilio Messaging call).
 */
export async function sendSms(
  to: string,
  body: string,
): Promise<SendSmsResult> {
  if (
    process.env.MATCHING_MANUAL_TEST === "1" ||
    process.env.QUOTE_MANUAL_TEST === "1" ||
    process.env.REQUOTE_MANUAL_TEST === "1" ||
    isSmsMock()
  ) {
    return mockSmsResult(to, body);
  }

  const env = getEnv();

  const payload: Record<string, string> = {
    To: to,
    Body: body,
  };

  if (env.TWILIO_MESSAGING_SERVICE_SID) {
    payload.MessagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;
  } else if (env.TWILIO_PHONE_NUMBER) {
    payload.From = env.TWILIO_PHONE_NUMBER;
  } else {
    throw new Error(
      "SMS requires TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER",
    );
  }

  return twilioApiRequest<SendSmsResult>("/Messages.json", {
    method: "POST",
    body: payload,
  });
}
