import { z } from "zod";

import { parsedDiagnosisSchema } from "@/types/airtable/schemas";

export const diagnosisRequestSchema = z.object({
  input: z.string().min(1),
});

export const diagnosisResponseSchema = parsedDiagnosisSchema.extend({
  diagnosisId: z.string().min(1),
  safety_flag: z.boolean(),
  safety_message: z.string().optional(),
});

export type DiagnosisRequest = z.infer<typeof diagnosisRequestSchema>;
export type DiagnosisResponse = z.infer<typeof diagnosisResponseSchema>;
