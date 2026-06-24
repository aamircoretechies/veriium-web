import {
  DIAGNOSIS_DETAIL_MESSAGE,
  DIAGNOSIS_NOT_CAR_MESSAGE,
  DIAGNOSIS_SAFETY_MESSAGE,
  InputValidationError,
} from "./errors";
import { CAR_KEYWORDS, SAFETY_KEYWORDS } from "./keywords";

const ENGLISH_TOKEN_PATTERN = /[a-zA-Z]{2,}/g;

export type DiagnosisValidationResult = {
  safety_flag: boolean;
  safety_message?: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeyword(input: string, keyword: string): boolean {
  const pattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i");
  return pattern.test(input);
}

function countEnglishTokens(input: string): number {
  return (input.match(ENGLISH_TOKEN_PATTERN) ?? []).length;
}

function hasCarKeyword(input: string): boolean {
  return CAR_KEYWORDS.some((keyword) => matchesKeyword(input, keyword));
}

function hasSafetyKeyword(input: string): boolean {
  return SAFETY_KEYWORDS.some((keyword) => matchesKeyword(input, keyword));
}

/**
 * Pre-AI validation rules R1–R4 (§5.2), evaluated in order: R1 → R4 → R2 → R3.
 */
export function validateDiagnosisInput(input: string): DiagnosisValidationResult {
  const trimmed = input.trim();

  if (trimmed.length < 10) {
    throw new InputValidationError("R1", DIAGNOSIS_DETAIL_MESSAGE);
  }

  if (countEnglishTokens(trimmed) < 2) {
    throw new InputValidationError("R4", DIAGNOSIS_DETAIL_MESSAGE);
  }

  if (!hasCarKeyword(trimmed)) {
    throw new InputValidationError("R2", DIAGNOSIS_NOT_CAR_MESSAGE);
  }

  if (hasSafetyKeyword(trimmed)) {
    return {
      safety_flag: true,
      safety_message: DIAGNOSIS_SAFETY_MESSAGE,
    };
  }

  return { safety_flag: false };
}
