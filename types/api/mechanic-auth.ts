import { z } from "zod";

export const sendMechanicCodeSchema = z.object({
  phone: z.string().min(1),
});

export const verifyMechanicCodeSchema = z.object({
  phone: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "Code must be exactly 6 digits."),
});

export const setMechanicAvailabilitySchema = z.object({
  available: z.boolean(),
});

export type SendMechanicCodeRequest = z.infer<typeof sendMechanicCodeSchema>;
export type VerifyMechanicCodeRequest = z.infer<typeof verifyMechanicCodeSchema>;
export type SetMechanicAvailabilityRequest = z.infer<
  typeof setMechanicAvailabilitySchema
>;
