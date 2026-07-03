import { z } from "zod";
import { isValidUsPhone } from "@/lib/phone";

const serviceCheckboxSchema = z.record(z.string(), z.boolean());

const usPhoneSchema = z
  .string()
  .min(1, "Phone number is required.")
  .refine(isValidUsPhone, "Enter a valid US phone number, e.g. (555) 123-4567.");

export const mechanicApplicationSchema = z.object({
  fullName: z.string().min(1),
  phone: usPhoneSchema,
  email: z.string().email().optional(),
  bio: z.string().max(250).optional(),
  languages: z.string().optional(),
  yearsExperience: z.number().int().nonnegative().optional(),
  aseCertified: z.boolean().optional(),
  otherCertifications: z.string().optional(),
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
