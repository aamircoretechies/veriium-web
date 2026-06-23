import type {
  DiagnosisCategory,
  DiagnosisConfidence,
  Driveability,
  FixNowVsWait,
} from "./enums";
import type { AirtableLinkedRecords } from "./fields";

/**
 * Parsed AI diagnosis payload (§5.3 required JSON schema).
 */
export type ParsedDiagnosis = {
  summary: string;
  category: DiagnosisCategory;
  driveability: Driveability;
  fix_now_vs_wait: FixNowVsWait;
  cost_estimate_low: number;
  cost_estimate_high: number;
  confidence: DiagnosisConfidence;
};

/**
 * Diagnoses table — AI input, raw response, parsed fields (§11.1).
 */
export type DiagnosisFields = {
  driver_input?: string;
  raw_response?: string;

  // Parsed §5.3 fields (stored on record or derived from raw_response)
  summary?: string;
  category?: DiagnosisCategory;
  driveability?: Driveability;
  fix_now_vs_wait?: FixNowVsWait;
  cost_estimate_low?: number;
  cost_estimate_high?: number;
  confidence?: DiagnosisConfidence;
  safety_flag?: boolean;

  driver?: AirtableLinkedRecords;
  job?: AirtableLinkedRecords;
};
