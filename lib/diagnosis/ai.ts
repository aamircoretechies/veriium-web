import { getEnv } from "@/config/env";
import { parsedDiagnosisSchema } from "@/types/airtable/schemas";
import type { ParsedDiagnosis } from "@/types/airtable/diagnoses";
import { AiDiagnosisError } from "./errors";
import { DIAGNOSIS_SYSTEM_PROMPT } from "./prompt";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const FETCH_TIMEOUT_MS = 30_000;

const aiDiagnosisSchema = parsedDiagnosisSchema.refine(
  (data) => data.cost_estimate_high >= data.cost_estimate_low,
  { message: "cost_estimate_high must be greater than or equal to cost_estimate_low" },
);

export type AiDiagnosisResult = {
  raw_response: string;
  parsed: ParsedDiagnosis;
};

function extractJsonContent(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return trimmed;
}

function parseDiagnosisContent(content: string): ParsedDiagnosis {
  const jsonText = extractJsonContent(content);
  let payload: unknown;

  try {
    payload = JSON.parse(jsonText);
  } catch {
    throw new AiDiagnosisError("AI response was not valid JSON.");
  }

  const parsed = aiDiagnosisSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AiDiagnosisError("AI response did not match the diagnosis schema.");
  }

  return parsed.data;
}

async function requestOpenAiCompletion(input: string): Promise<string> {
  const env = getEnv();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.DIAGNOSIS_AI_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: DIAGNOSIS_SYSTEM_PROMPT },
          { role: "user", content: input },
        ],
      }),
    });

    if (!response.ok) {
      throw new AiDiagnosisError("AI provider returned an error.");
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = body.choices?.[0]?.message?.content;

    if (!content?.trim()) {
      throw new AiDiagnosisError("AI provider returned an empty response.");
    }

    return content;
  } catch (error) {
    if (error instanceof AiDiagnosisError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiDiagnosisError("AI request timed out.");
    }
    throw new AiDiagnosisError();
  } finally {
    clearTimeout(timeout);
  }
}

export async function callOpenAiDiagnosis(input: string): Promise<AiDiagnosisResult> {
  let lastError: AiDiagnosisError | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw_response = await requestOpenAiCompletion(input);

    try {
      const parsed = parseDiagnosisContent(raw_response);
      return { raw_response, parsed };
    } catch (error) {
      if (error instanceof AiDiagnosisError) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new AiDiagnosisError();
}
