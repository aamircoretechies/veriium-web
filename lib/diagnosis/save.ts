import { getAirtableClient } from "@/lib/airtable";
import type { DiagnosisFields } from "@/types/airtable/diagnoses";
import { createDiagnosisSchema } from "@/types/airtable/schemas";
import type { AiDiagnosisResult } from "./ai";
import type { DiagnosisValidationResult } from "./validate-input";

export type SaveDiagnosisInput = {
  driverInput: string;
  ai: AiDiagnosisResult;
  validation: DiagnosisValidationResult;
};

export async function saveDiagnosis(
  input: SaveDiagnosisInput,
): Promise<string> {
  const fields = createDiagnosisSchema.parse({
    driver_input: input.driverInput,
    raw_response: input.ai.raw_response,
    summary: input.ai.parsed.summary,
    category: input.ai.parsed.category,
    driveability: input.ai.parsed.driveability,
    fix_now_vs_wait: input.ai.parsed.fix_now_vs_wait,
    cost_estimate_low: input.ai.parsed.cost_estimate_low,
    cost_estimate_high: input.ai.parsed.cost_estimate_high,
    confidence: input.ai.parsed.confidence,
    safety_flag: input.validation.safety_flag,
  });

  const client = getAirtableClient();
  const record = await client.createRecord<DiagnosisFields>(
    "diagnoses",
    fields,
    { typecast: true },
  );

  return record.id;
}
