import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDiagnosisSchema,
  parsedDiagnosisSchema,
} from "@/types/airtable/schemas";
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

  it("accepts structured kid-friendly fields in parsedDiagnosisSchema", () => {
    const parsed = parsedDiagnosisSchema.parse({
      title: "Coolant leak detected.",
      explanation:
        "Based on your description, this appears to be a coolant leak in your car. Coolant is a liquid that keeps your car's engine from getting too hot. Right now, some of that liquid is escaping, which can cause the engine to overheat if it's not fixed.",
      if_addressed:
        "helps prevent engine overheating and more expensive repairs",
      if_ignored: "Can lead to overheating, breakdowns, or engine damage",
      driveability_answer:
        "Short trips may be possible, but continued driving increases the risk of overheating.",
      category: "engine_diagnostics",
      driveability: "caution",
      fix_now_vs_wait: "soon",
      cost_estimate_low: 200,
      cost_estimate_high: 350,
      confidence: "high",
    });

    assert.equal(parsed.title, "Coolant leak detected.");
    assert.equal(parsed.fix_now_vs_wait, "soon");
    assert.equal(parsed.driveability, "caution");
  });

  it("rejects legacy summary-only AI payloads", () => {
    const result = parsedDiagnosisSchema.safeParse({
      summary: "Likely a coolant leak in your car.",
      category: "engine_diagnostics",
      driveability: "caution",
      fix_now_vs_wait: "soon",
      cost_estimate_low: 200,
      cost_estimate_high: 350,
      confidence: "high",
    });

    assert.equal(result.success, false);
  });
});
