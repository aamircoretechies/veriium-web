import { z } from "zod";

export const noShowCheckPayloadSchema = z.object({
  jobId: z.string().min(1),
});

export type NoShowCheckPayload = z.infer<typeof noShowCheckPayloadSchema>;

export const disputeRemindPayloadSchema = z.object({
  jobId: z.string().min(1),
  reminder: z.union([z.literal(24), z.literal(48), z.literal(72)]),
});

export type DisputeRemindPayload = z.infer<typeof disputeRemindPayloadSchema>;

export const staleAvailabilityPayloadSchema = z.object({
  mechanicId: z.string().min(1),
});

export type StaleAvailabilityPayload = z.infer<
  typeof staleAvailabilityPayloadSchema
>;

export const receiptCheckPayloadSchema = z.object({
  jobId: z.string().min(1),
});

export type ReceiptCheckPayload = z.infer<typeof receiptCheckPayloadSchema>;
