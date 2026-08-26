import { z } from "zod";

import { parsedDiagnosisSchema } from "@/types/airtable/schemas";
import {
  DIAGNOSIS_EMPTY_INPUT_MESSAGE,
} from "@/lib/diagnosis/errors";
import { DIAGNOSIS_INPUT_MAX } from "@/lib/diagnosis/validate-input";

export const diagnosisRequestSchema = z.object({
  input: z
    .string()
    .trim()
    .min(1, DIAGNOSIS_EMPTY_INPUT_MESSAGE)
    .max(
      DIAGNOSIS_INPUT_MAX,
      `Please keep your issue description to ${DIAGNOSIS_INPUT_MAX} characters or fewer.`,
    ),
});

export const diagnosisResponseSchema = parsedDiagnosisSchema.extend({
  diagnosisId: z.string().min(1),
  safety_flag: z.boolean(),
  safety_message: z.string().optional(),
});

export type DiagnosisRequest = z.infer<typeof diagnosisRequestSchema>;
export type DiagnosisResponse = z.infer<typeof diagnosisResponseSchema>;
