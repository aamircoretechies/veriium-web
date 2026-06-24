import { z } from "zod";

export const matchEscalationTierSchema = z.union([
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const matchEscalatePayloadSchema = z.object({
  jobId: z.string().min(1),
  tier: matchEscalationTierSchema,
});

export const startMatchingResponseSchema = z.object({
  jobId: z.string(),
  tier1MechanicId: z.string().nullable(),
  scheduledEscalations: z.boolean(),
});

export type StartMatchingResponse = z.infer<typeof startMatchingResponseSchema>;
