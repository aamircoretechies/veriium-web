import { z } from "zod";

/** Body for `POST /api/dev/sms-inbound` — simulates Twilio inbound SMS/MMS. */
export const devSmsInboundSchema = z.object({
  /** E.164 or US-format phone of the sender (mechanic or driver). */
  from: z.string().min(5, "from phone is required"),
  /** SMS body (e.g. DIAGNOSING, QUOTE $245 PARTS $80 ON_HAND, APPROVE). */
  body: z.string().default(""),
  /** Optional media URL for receipt MMS staging (public HTTPS preferred). */
  mediaUrl: z.string().url().optional(),
  mediaContentType: z.string().optional(),
});

export type DevSmsInboundRequest = z.infer<typeof devSmsInboundSchema>;
