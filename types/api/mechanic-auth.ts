import { z } from "zod";
import { isValidUsPhone } from "@/lib/phone";

const usPhoneSchema = z
  .string()
  .min(1, "Phone number is required.")
  .refine(isValidUsPhone, "Enter a valid US phone number, e.g. (555) 123-4567.");

export const sendMechanicCodeSchema = z.object({
  phone: usPhoneSchema,
});

export const verifyMechanicCodeSchema = z.object({
  phone: usPhoneSchema,
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
