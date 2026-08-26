import { z } from "zod";
import { isValidUsPhone } from "@/lib/phone";
import {
  DETAILS_MAX,
  EMAIL_MAX,
  FULL_NAME_MAX,
  MAKE_MAX,
  MAKE_PATTERN,
  MODEL_MAX,
  MODEL_PATTERN,
  VEHICLE_YEAR_MIN,
  VIN_OR_PLATE_MAX,
  VIN_OR_PLATE_MIN,
  VIN_OR_PLATE_PATTERN,
  ZIP_MAX,
  daysInMonth,
  getVehicleYearMax,
} from "@/lib/bookings/booking-form";
import {
  EMAIL_PATTERN,
  FULL_NAME_PATTERN,
} from "@/lib/mechanics/apply-form";

const vehicleYearMax = getVehicleYearMax();
const vehicleYearMessage = `Enter a vehicle year from ${VEHICLE_YEAR_MIN} to ${vehicleYearMax}.`;

export const bookingVehicleSchema = z.object({
  year: z.coerce
    .number({ error: vehicleYearMessage })
    .refine(
      (value) =>
        Number.isInteger(value) &&
        value >= VEHICLE_YEAR_MIN &&
        value <= vehicleYearMax,
      vehicleYearMessage,
    )
    .optional(),
  make: z
    .string()
    .trim()
    .min(1)
    .max(MAKE_MAX, `Make must be ${MAKE_MAX} characters or fewer.`)
    .regex(
      MAKE_PATTERN,
      "Make can only include letters, numbers, spaces, and hyphens.",
    )
    .optional(),
  model: z
    .string()
    .trim()
    .min(1)
    .max(MODEL_MAX, `Model must be ${MODEL_MAX} characters or fewer.`)
    .regex(
      MODEL_PATTERN,
      "Model can only include letters, numbers, spaces, and hyphens.",
    )
    .optional(),
  vin: z
    .string()
    .trim()
    .min(
      VIN_OR_PLATE_MIN,
      `Enter a VIN or license plate (${VIN_OR_PLATE_MIN}–${VIN_OR_PLATE_MAX} letters or numbers).`,
    )
    .max(
      VIN_OR_PLATE_MAX,
      `Enter a VIN or license plate (${VIN_OR_PLATE_MIN}–${VIN_OR_PLATE_MAX} letters or numbers).`,
    )
    .regex(
      VIN_OR_PLATE_PATTERN,
      `Enter a VIN or license plate (${VIN_OR_PLATE_MIN}–${VIN_OR_PLATE_MAX} letters or numbers).`,
    )
    .optional(),
});

/** API accepts canonical values plus UI alias `onsite` (normalized in validate-intake). */
export const bookingServiceTypeSchema = z.enum([
  "mobile_repair",
  "dropoff",
  "onsite",
]);

export const bookingScheduleSlotSchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12),
    day: z.coerce.number().int().min(1).max(31),
    time: z.enum(["morning", "afternoon", "evening"]),
  })
  .refine((slot) => slot.day <= daysInMonth(slot.month), {
    message: "Please choose a valid date.",
    path: ["day"],
  });

export const bookingRequestSchema = z.object({
  diagnosisId: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(2, "Enter your first and last name.")
    .max(FULL_NAME_MAX, `Name must be ${FULL_NAME_MAX} characters or fewer.`)
    .regex(
      FULL_NAME_PATTERN,
      "Name can only include letters, spaces, hyphens, and apostrophes.",
    )
    .refine(
      (value) => value.split(/\s+/).filter(Boolean).length >= 2,
      "Enter your first and last name.",
    ),
  zip: z
    .string()
    .regex(new RegExp(`^\\d{${ZIP_MAX}}$`), "ZIP code must be 5 digits."),
  phone: z
    .string()
    .min(1, "Enter a valid 10-digit US phone number.")
    .refine(isValidUsPhone, "Enter a valid 10-digit US phone number."),
  email: z
    .string()
    .trim()
    .max(EMAIL_MAX, `Email must be ${EMAIL_MAX} characters or fewer.`)
    .email("Enter a valid email address.")
    .regex(EMAIL_PATTERN, "Enter a valid email address.")
    .optional(),
  serviceType: bookingServiceTypeSchema,
  vehicle: bookingVehicleSchema.optional(),
  additionalDetails: z
    .string()
    .max(DETAILS_MAX, `Details must be ${DETAILS_MAX} characters or fewer.`)
    .optional(),
  attachmentUrls: z.array(z.string().url()).max(5).optional(),
  scheduledTime: z.string().datetime().optional(),
  scheduleSlot: bookingScheduleSlotSchema.optional(),
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
  scheduledTime: z.string().datetime().optional(),
});

export type BookingVehicle = z.infer<typeof bookingVehicleSchema>;
export type BookingServiceTypeInput = z.infer<typeof bookingServiceTypeSchema>;
export type BookingScheduleSlot = z.infer<typeof bookingScheduleSlotSchema>;
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
export type BookingResponse = z.infer<typeof bookingResponseSchema>;
