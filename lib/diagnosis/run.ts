import type { DiagnosisResponse } from "@/types/api/diagnosis";
import { callOpenAiDiagnosis } from "./ai";
import { saveDiagnosis } from "./save";
import { validateDiagnosisInput } from "./validate-input";

export async function runDiagnosis(input: string): Promise<DiagnosisResponse> {
  const validation = validateDiagnosisInput(input);
  const ai = await callOpenAiDiagnosis(input);
  const diagnosisId = await saveDiagnosis({
    driverInput: input,
    ai,
    validation,
  });

  return {
    diagnosisId,
    ...ai.parsed,
    safety_flag: validation.safety_flag,
    ...(validation.safety_message
      ? { safety_message: validation.safety_message }
      : {}),
  };
}
