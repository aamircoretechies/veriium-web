import { z } from "zod";

import { mechanicLanguageSchema } from "@/types/airtable/schemas";
import { mechanicDashboardProfileSchema } from "@/types/api/mechanic-dashboard";

export const mechanicProfilePatchSchema = z
  .object({
    photoUrl: z.string().url().optional(),
    bio: z.string().max(250).optional(),
    languages: z.array(mechanicLanguageSchema).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const mechanicProfilePatchResponseSchema = z.object({
  profile: mechanicDashboardProfileSchema,
});

export type MechanicProfilePatchRequest = z.infer<
  typeof mechanicProfilePatchSchema
>;
export type MechanicProfilePatchResponse = z.infer<
  typeof mechanicProfilePatchResponseSchema
>;
