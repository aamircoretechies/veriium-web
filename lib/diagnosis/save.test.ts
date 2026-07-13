import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createDiagnosisSchema } from "@/types/airtable/schemas";
import { validateDiagnosisInput } from "./validate-input";

describe("diagnosis validation metadata", () => {
  it("marks R3 when safety keywords are present", () => {
    const result = validateDiagnosisInput(
      "My car brakes failed and I cannot stop on the highway",
    );

    assert.equal(result.validation_rule_triggered, "R3");
    assert.equal(result.safety_flag, true);
    assert.ok(result.safety_message);
  });

  it("marks none when validation passes without safety keywords", () => {
    const result = validateDiagnosisInput(
      "My car makes a grinding noise when I brake at low speed",
    );

    assert.equal(result.validation_rule_triggered, "none");
    assert.equal(result.safety_flag, false);
  });

  it("accepts diagnosis metadata fields in createDiagnosisSchema", () => {
    const parsed = createDiagnosisSchema.parse({
      input_text: "My car makes a grinding noise when I brake",
      input_length: 42,
      validation_rule_triggered: "none",
      ai_called: true,
      ai_latency_ms: 812,
      ai_response_summary: "Likely brake pad wear",
    });

    assert.equal(parsed.validation_rule_triggered, "none");
    assert.equal(parsed.ai_called, true);
    assert.equal(parsed.input_length, 42);
    assert.equal(parsed.ai_latency_ms, 812);
  });
});
