import { z } from "zod";

export const submitReceiptBodySchema = z.object({
  receiptUrl: z.string().url(),
  receiptTotal: z.number().finite().nonnegative(),
});

export const submitReceiptResponseSchema = z.object({
  jobId: z.string(),
  receiptStatus: z.literal("submitted"),
  receiptUrl: z.string().url(),
  receiptTotal: z.number().finite().nonnegative().optional(),
  source: z.enum(["mms", "web"]),
});

export type SubmitReceiptBody = z.infer<typeof submitReceiptBodySchema>;
export type SubmitReceiptResponse = z.infer<typeof submitReceiptResponseSchema>;
