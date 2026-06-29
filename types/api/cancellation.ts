import { z } from "zod";

/** POST /api/jobs/[jobId]/cancel body */
export const cancelJobRequestSchema = z.object({
  token: z.string().min(1),
});

/** POST /api/jobs/[jobId]/cancel response */
export const cancelJobResponseSchema = z.object({
  jobId: z.string().min(1),
  status: z.string().min(1),
  action: z.literal("cancelled"),
  feeCharged: z.boolean(),
  partsCharged: z.boolean(),
  partsChargeAmount: z.number().nonnegative().optional(),
});

export type CancelJobRequest = z.infer<typeof cancelJobRequestSchema>;
export type CancelJobResponse = z.infer<typeof cancelJobResponseSchema>;
