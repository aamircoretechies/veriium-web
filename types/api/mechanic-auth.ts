import { z } from "zod";
import { isValidUsPhone } from "@/lib/phone";
import { MECHANIC_STATUSES } from "@/types/airtable/enums";
import { availabilityStatusSchema } from "@/types/airtable/schemas";

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

export const mechanicAuthSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  accountState: z.enum(MECHANIC_STATUSES),
  setupComplete: z.boolean(),
  availabilityOn: z.boolean(),
});

export type MechanicAuthSummaryResponse = z.infer<typeof mechanicAuthSummarySchema>;

export { mechanicMeResponseSchema, type MechanicMeResponse } from "@/types/api/mechanic-dashboard";

export const setMechanicAvailabilityResponseSchema = z.object({
  mechanicId: z.string(),
  availabilityOn: z.boolean(),
  availabilityStatus: availabilityStatusSchema,
  availabilityUpdatedAt: z.string().optional(),
});

export type SetMechanicAvailabilityResponse = z.infer<
  typeof setMechanicAvailabilityResponseSchema
>;
