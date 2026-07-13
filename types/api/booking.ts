import { z } from "zod";

export const bookingVehicleSchema = z.object({
  year: z.coerce.number().int().positive().optional(),
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  vin: z.string().min(1).optional(),
});

/** API accepts canonical values plus UI alias `onsite` (normalized in validate-intake). */
export const bookingServiceTypeSchema = z.enum([
  "mobile_repair",
  "dropoff",
  "onsite",
]);

export const bookingRequestSchema = z.object({
  diagnosisId: z.string().min(1),
  name: z.string().min(1),
  zip: z.string().regex(/^\d{5}$/, "ZIP code must be 5 digits."),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  serviceType: bookingServiceTypeSchema,
  vehicle: bookingVehicleSchema.optional(),
  additionalDetails: z.string().optional(),
  scheduledTime: z.string().datetime().optional(),
  smsConsent: z.literal(true),
  phoneConsent: z.literal(true),
  verificationCode: z
    .string()
    .regex(/^\d{6}$/, "Code must be exactly 6 digits."),
});

export const bookingResponseSchema = z.object({
  jobId: z.string().min(1),
  driverId: z.string().min(1),
  signedUrl: z.string().url(),
});

export type BookingVehicle = z.infer<typeof bookingVehicleSchema>;
export type BookingServiceTypeInput = z.infer<typeof bookingServiceTypeSchema>;
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
export type BookingResponse = z.infer<typeof bookingResponseSchema>;
