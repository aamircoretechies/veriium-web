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

export type PaymentSetupRequest = z.infer<typeof paymentSetupRequestSchema>;
export type PaymentSetupResponse = z.infer<typeof paymentSetupResponseSchema>;
