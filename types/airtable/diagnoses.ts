export type { DiagnosesRecord as DiagnosisFields } from "./generated/records";

import type { DiagnosisCategory } from "./enums";
import type { Driveability } from "./enums";
import type { FixNowVsWait } from "./enums";
import type { DiagnosisConfidence } from "./enums";

/** Parsed AI diagnosis payload (§5.3). */
export type ParsedDiagnosis = {
  title: string;
  explanation: string;
  if_addressed: string;
  if_ignored: string;
  driveability_answer: string;
  category: DiagnosisCategory;
  driveability: Driveability;
  fix_now_vs_wait: FixNowVsWait;
  cost_estimate_low: number;
  cost_estimate_high: number;
  confidence: DiagnosisConfidence;
};
