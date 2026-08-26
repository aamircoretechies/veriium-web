import { z } from "zod";
import { isValidUsPhone } from "@/lib/phone";
import {
  BIO_MAX,
  EMAIL_MAX,
  EMAIL_PATTERN,
  FULL_NAME_MAX,
  FULL_NAME_PATTERN,
  LANGUAGES_MAX,
  LANGUAGES_PATTERN,
  OTHER_CERTS_MAX,
  OTHER_CERTS_PATTERN,
  YEARS_EXPERIENCE_MAX,
} from "@/lib/mechanics/apply-form";

const serviceCheckboxSchema = z.record(z.string(), z.boolean());

const usPhoneSchema = z
  .string()
  .min(1, "Phone number is required.")
  .refine(isValidUsPhone, "Enter a valid US phone number, e.g. (555) 123-4567.");

export const mechanicApplicationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(FULL_NAME_MAX, `Name must be ${FULL_NAME_MAX} characters or fewer.`)
    .regex(
      FULL_NAME_PATTERN,
      "Name can only include letters, spaces, hyphens, and apostrophes.",
    )
    .refine(
      (value) => value.split(/\s+/).filter(Boolean).length >= 2,
      "Enter your first and last name.",
    ),
  phone: usPhoneSchema,
  email: z
    .string()
    .trim()
    .max(EMAIL_MAX, `Email must be ${EMAIL_MAX} characters or fewer.`)
    .email("Enter a valid email address.")
    .regex(EMAIL_PATTERN, "Enter a valid email address.")
    .optional(),
  bio: z
    .string()
    .max(BIO_MAX, `About Me must be ${BIO_MAX} characters or fewer.`)
    .optional(),
  languages: z
    .string()
    .max(LANGUAGES_MAX, `Languages must be ${LANGUAGES_MAX} characters or fewer.`)
    .regex(
      LANGUAGES_PATTERN,
      "Languages can only include letters, spaces, commas, and hyphens.",
    )
    .optional(),
  yearsExperience: z
    .number({
      error: `Enter whole years of experience from 0 to ${YEARS_EXPERIENCE_MAX}.`,
    })
    .refine(
      (value) =>
        Number.isInteger(value) &&
        value >= 0 &&
        value <= YEARS_EXPERIENCE_MAX,
      `Enter whole years of experience from 0 to ${YEARS_EXPERIENCE_MAX}.`,
    )
    .optional(),
  aseCertified: z.boolean().optional(),
  otherCertifications: z
    .string()
    .max(
      OTHER_CERTS_MAX,
      `Other certifications must be ${OTHER_CERTS_MAX} characters or fewer.`,
    )
    .regex(
      OTHER_CERTS_PATTERN,
      "Certifications can only include letters, numbers, and common punctuation.",
    )
    .optional(),
  services: serviceCheckboxSchema,
  mobileAvailable: z.boolean().optional(),
  shopAvailable: z.boolean().optional(),
  primaryZip: z.string().min(1),
  additionalZips: z.union([z.string(), z.array(z.string())]).optional(),
  serviceRadius: z.number().nonnegative().optional(),
  shopAddress: z.string().optional(),
  toolsConfirmed: z.boolean().optional(),
  transportConfirmed: z.boolean().optional(),
  mobileRepairsConfirmed: z.boolean().optional(),
  profilePhotoUrl: z.string().url().optional(),
  driverLicenseUrl: z.string().url().optional(),
  aseCertificationUrl: z.string().url().optional(),
  insuranceDocumentUrl: z.string().url().optional(),
});

export type MechanicApplicationRequest = z.infer<
  typeof mechanicApplicationSchema
>;
