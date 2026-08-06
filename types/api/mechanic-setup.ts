import { z } from "zod";
import { mechanicAuthSummarySchema } from "@/types/api/mechanic-auth";

export const mechanicSetupRequestSchema = z.object({
  serviceZipCodes: z
    .array(z.string().regex(/^\d{5}$/, "Each ZIP must be exactly 5 digits."))
    .min(1, "At least one service ZIP code is required."),
});

export const mechanicSetupResponseSchema = z.object({
  mechanic: mechanicAuthSummarySchema,
});

export type MechanicSetupRequest = z.infer<typeof mechanicSetupRequestSchema>;
export type MechanicSetupResponse = z.infer<typeof mechanicSetupResponseSchema>;
