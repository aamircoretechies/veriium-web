import { getEnv } from "@/config/env";
import { twilioApiRequest } from "./client";

export type SendSmsResult = {
  sid: string;
  status: string;
  to: string;
  body: string;
};

/**
 * Send an outbound SMS via the configured Messaging Service.
 * Falls back to `TWILIO_PHONE_NUMBER` as `From` when no service SID is set.
 */
export async function sendSms(
  to: string,
  body: string,
): Promise<SendSmsResult> {
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
