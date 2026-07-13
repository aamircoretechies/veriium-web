import { z } from "zod";

/** POST /api/bookings/[jobId]/payment body */
export const paymentSetupRequestSchema = z.object({
  token: z.string().min(1),
});

/** POST /api/bookings/[jobId]/payment response */
export const paymentSetupResponseSchema = z.object({
  clientSecret: z.string().min(1),
  setupIntentId: z.string().min(1),
});

/** POST /api/bookings/[jobId]/payment/complete body */
export const paymentCompleteRequestSchema = z.object({
  token: z.string().min(1),
  setupIntentId: z.string().min(1),
});

/** POST /api/bookings/[jobId]/payment/complete response */
export const paymentCompleteResponseSchema = z.object({
  jobId: z.string().min(1),
  status: z.string().min(1),
  signedUrl: z.string().url(),
});

export type PaymentSetupRequest = z.infer<typeof paymentSetupRequestSchema>;
export type PaymentSetupResponse = z.infer<typeof paymentSetupResponseSchema>;
export type PaymentCompleteRequest = z.infer<typeof paymentCompleteRequestSchema>;
export type PaymentCompleteResponse = z.infer<typeof paymentCompleteResponseSchema>;
