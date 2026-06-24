import { getEnv } from "@/config/env";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";
const TWILIO_VERIFY_BASE = "https://verify.twilio.com/v2";

export type TwilioErrorBody = {
  code?: number;
  message?: string;
  more_info?: string;
  status?: number;
};

export class TwilioError extends Error {
  readonly code: number;
  readonly status: number;

  constructor(code: number, message: string, status: number) {
    super(message);
    this.name = "TwilioError";
    this.code = code;
    this.status = status;
  }
}

export type TwilioRequestInit = {
  method?: "GET" | "POST" | "DELETE";
  body?: Record<string, string>;
};

function getCredentials(): { accountSid: string; authToken: string } {
  const env = getEnv();
  return {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
  };
}

function authorizationHeader(accountSid: string, authToken: string): string {
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString(
    "base64",
  );
  return `Basic ${credentials}`;
}

async function parseTwilioError(response: Response): Promise<TwilioError> {
  let body: TwilioErrorBody | undefined;

  try {
    body = (await response.json()) as TwilioErrorBody;
  } catch {
    // Non-JSON error bodies fall back to status text.
  }

  const code = body?.code ?? 0;
  const message =
    body?.message ?? (response.statusText || "Twilio request failed");

  return new TwilioError(code, message, response.status);
}

function toFormBody(body?: Record<string, string>): string | undefined {
  if (!body) {
    return undefined;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    params.set(key, value);
  }
  return params.toString();
}

async function request<T>(
  baseUrl: string,
  path: string,
  init?: TwilioRequestInit,
): Promise<T> {
  const { accountSid, authToken } = getCredentials();
  const url = `${baseUrl}${path}`;
  const method = init?.method ?? "GET";
  const formBody = toFormBody(init?.body);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: authorizationHeader(accountSid, authToken),
      ...(formBody ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: formBody,
  });

  if (!response.ok) {
    throw await parseTwilioError(response);
  }

  return (await response.json()) as T;
}

/** Twilio REST API (Messages, etc.) under `/2010-04-01/Accounts/{sid}/...`. */
export function twilioApiRequest<T>(
  path: string,
  init?: TwilioRequestInit,
): Promise<T> {
  const { accountSid } = getCredentials();
  return request<T>(`${TWILIO_API_BASE}/Accounts/${accountSid}`, path, init);
}

/** Twilio Verify v2 API under `/v2/Services/{sid}/...`. */
export function twilioVerifyRequest<T>(
  path: string,
  init?: TwilioRequestInit,
): Promise<T> {
  const env = getEnv();
  return request<T>(
    `${TWILIO_VERIFY_BASE}/Services/${env.TWILIO_VERIFY_SERVICE_SID}`,
    path,
    init,
  );
}
