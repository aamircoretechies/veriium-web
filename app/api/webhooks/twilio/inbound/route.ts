import { getEnv } from "@/config/env";
import { handleInboundSms } from "@/lib/sms/inbound";
import { validateTwilioInbound } from "@/lib/twilio/validate-inbound";

const TWILIO_SIGNATURE_HEADER = "x-twilio-signature";

function emptyTwimlResponse(): Response {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function webhookUrl(request: Request): string {
  const env = getEnv();
  const pathname = new URL(request.url).pathname;
  return `${env.APP_URL.replace(/\/$/, "")}${pathname}`;
}

function formFieldsToRecord(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") {
      params[key] = value;
    }
  });
  return params;
}

export async function POST(request: Request) {
  const env = getEnv();
  const signature = request.headers.get(TWILIO_SIGNATURE_HEADER);

  if (!signature) {
    return new Response("Forbidden", { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const params = formFieldsToRecord(formData);
  const url = webhookUrl(request);

  if (
    !validateTwilioInbound(env.TWILIO_AUTH_TOKEN, signature, url, params)
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const from = params.From;
  const body = params.Body;
  const messageSid = params.MessageSid;

  if (!from || body === undefined || !messageSid) {
    return new Response("Bad Request", { status: 400 });
  }

  await handleInboundSms({
    From: from,
    Body: body,
    MessageSid: messageSid,
  });

  return emptyTwimlResponse();
}
