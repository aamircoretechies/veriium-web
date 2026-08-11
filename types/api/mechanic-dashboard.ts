import { z } from "zod";

import { mechanicAuthSummarySchema } from "@/types/api/mechanic-auth";

export const mechanicDashboardProfileSchema = z.object({
  photoUrl: z.string().url().optional(),
  bio: z.string(),
  languages: z.array(z.string()),
  certifiedStatus: z.enum(["certified", "not_certified", "pending_review"]),
  certifications: z.string().optional(),
});

export const mechanicDashboardServiceSetupSchema = z.object({
  zipCodes: z.array(z.string()),
  categoryLabels: z.array(z.string()),
  tools: z.array(z.string()),
  shopAddress: z.string().optional(),
  mobileAvailable: z.boolean(),
  shopAvailable: z.boolean(),
});

export const mechanicMeResponseSchema = z.object({
  mechanic: mechanicAuthSummarySchema,
  profile: mechanicDashboardProfileSchema,
  serviceSetup: mechanicDashboardServiceSetupSchema,
});

export type MechanicDashboardProfile = z.infer<
  typeof mechanicDashboardProfileSchema
>;
export type MechanicDashboardServiceSetup = z.infer<
  typeof mechanicDashboardServiceSetupSchema
>;
export type MechanicMeResponse = z.infer<typeof mechanicMeResponseSchema>;
