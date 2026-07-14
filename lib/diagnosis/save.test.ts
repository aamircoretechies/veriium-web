import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createDiagnosisSchema } from "@/types/airtable/schemas";
import { InputValidationError } from "./errors";
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

  it("R2 accepts car-related symptoms without the word car", () => {
    const samples = [
      "Engine makes a loud knocking sound today",
      "Brakes squealing at every stop light",
      "Transmission slipping when I accelerate hard",
      "Battery is dead after sitting overnight",
      "The check engine light came on yesterday",
      "Won't start this morning at all now",
      "Braking feels soft and spongy lately",
    ];

    for (const sample of samples) {
      const result = validateDiagnosisInput(sample);
      assert.equal(result.validation_rule_triggered, "none", sample);
    }
  });

  it("R2 blocks clearly non-car input", () => {
    assert.throws(
      () => validateDiagnosisInput("I love pizza and movies today"),
      (error: unknown) =>
        error instanceof InputValidationError && error.code === "R2",
    );
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
