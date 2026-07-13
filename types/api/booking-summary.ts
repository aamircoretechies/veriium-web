import { z } from "zod";

import {
  diagnosisCategorySchema,
  diagnosisConfidenceSchema,
  driveabilitySchema,
  fixNowVsWaitSchema,
  jobStatusSchema,
  serviceTypeSchema,
} from "@/types/airtable/schemas";

export const bookingSummaryMechanicSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  profilePhotoUrl: z.string().url().optional(),
  certifiedStatus: z.string().optional(),
});

export const bookingSummaryDiagnosisSchema = z.object({
  summary: z.string().optional(),
  category: diagnosisCategorySchema.optional(),
  driveability: driveabilitySchema.optional(),
  fixNowVsWait: fixNowVsWaitSchema.optional(),
  costEstimateLow: z.number().int().nonnegative().optional(),
  costEstimateHigh: z.number().int().nonnegative().optional(),
  confidence: diagnosisConfidenceSchema.optional(),
});

export const bookingSummarySchema = z.object({
  jobId: z.string().min(1),
  status: jobStatusSchema,
  zip: z.string().optional(),
  serviceType: serviceTypeSchema.optional(),
  scheduledTime: z.string().datetime().optional(),
  safetyFlag: z.boolean().optional(),
  vehicleYear: z.number().int().positive().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vin: z.string().optional(),
  issueText: z.string().optional(),
  diagnosis: bookingSummaryDiagnosisSchema,
  mechanic: bookingSummaryMechanicSchema.optional(),
  signedUrl: z.string().url(),
});

export type BookingSummary = z.infer<typeof bookingSummarySchema>;
