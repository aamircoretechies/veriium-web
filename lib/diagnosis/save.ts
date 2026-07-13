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

function formatCostEstimate(low: number, high: number): string {
  return `${low}-${high}`;
}

export async function saveDiagnosis(
  input: SaveDiagnosisInput,
): Promise<string> {
  const rawPayload = {
    ...(input.ai.raw_response ? JSON.parse(input.ai.raw_response) : {}),
    fix_now_vs_wait: input.ai.parsed.fix_now_vs_wait,
    safety_flag: input.validation.safety_flag,
    cost_estimate_low: input.ai.parsed.cost_estimate_low,
    cost_estimate_high: input.ai.parsed.cost_estimate_high,
  };

  const trimmedInput = input.driverInput.trim();

  const fields = createDiagnosisSchema.parse({
    input_text: trimmedInput,
    input_length: trimmedInput.length,
    validation_rule_triggered: input.validation.validation_rule_triggered,
    ai_called: true,
    ai_latency_ms: input.ai.latency_ms,
    ai_response_raw: JSON.stringify(rawPayload),
    ai_response_summary: input.ai.parsed.summary,
    ai_response_category: input.ai.parsed.category,
    ai_response_driveability: input.ai.parsed.driveability,
    ai_response_cost_estimate: formatCostEstimate(
      input.ai.parsed.cost_estimate_low,
      input.ai.parsed.cost_estimate_high,
    ),
    ai_response_confidence: input.ai.parsed.confidence,
  });

  const client = getAirtableClient();
  const record = await client.createRecord<DiagnosisFields>(
    "diagnoses",
    fields as DiagnosisFields,
    { typecast: true },
  );

  return record.id;
}
