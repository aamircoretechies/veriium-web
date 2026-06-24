import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Validate Twilio's `X-Twilio-Signature` header (HMAC-SHA1 over URL + sorted params).
 *
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
export function validateTwilioInbound(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  const sortedKeys = Object.keys(params).sort();
  let payload = url;
  for (const key of sortedKeys) {
    payload += key + params[key];
  }

  const expected = createHmac("sha1", authToken).update(payload).digest("base64");
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);

  if (sigBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(sigBuf, expectedBuf);
}
