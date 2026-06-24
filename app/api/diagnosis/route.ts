import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api/response";
import { AiDiagnosisError, InputValidationError } from "@/lib/diagnosis/errors";
import { runDiagnosis } from "@/lib/diagnosis/run";
import { diagnosisRequestSchema } from "@/types/api/diagnosis";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = diagnosisRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      400,
      "validation_error",
      z.prettifyError(parsed.error),
    );
  }

  try {
    const result = await runDiagnosis(parsed.data.input);
    return jsonOk(result);
  } catch (error) {
    if (error instanceof InputValidationError) {
      return jsonError(400, error.code, error.message);
    }
    if (error instanceof AiDiagnosisError) {
      return jsonError(502, "ai_error", error.message);
    }
    throw error;
  }
}
