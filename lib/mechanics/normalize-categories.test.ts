import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeServiceCategories,
  normalizeServiceCategory,
  serviceCategoryMatchClause,
  serviceCategoryMatchValues,
} from "./normalize-categories";

describe("normalizeServiceCategory", () => {
  it("passes through canonical snake_case values", () => {
    assert.equal(normalizeServiceCategory("brakes"), "brakes");
    assert.equal(normalizeServiceCategory("ac_heating"), "ac_heating");
  });

  it("maps legacy Title Case values to canonical", () => {
    assert.equal(normalizeServiceCategory("Brakes"), "brakes");
    assert.equal(normalizeServiceCategory("Oil Change"), "oil_maintenance");
    assert.equal(normalizeServiceCategory("Electrical Systems"), "electrical");
    assert.equal(normalizeServiceCategory("Engine Repair"), "engine_diagnostics");
  });

  it("falls back to general_maintenance for unknown values", () => {
    assert.equal(normalizeServiceCategory("mystery"), "general_maintenance");
  });
});

describe("normalizeServiceCategories", () => {
  it("dedupes after normalizing legacy aliases", () => {
    const result = normalizeServiceCategories([
      "Brakes",
      "brakes",
      "Diagnostics",
    ]);
    assert.deepEqual(result, ["brakes", "engine_diagnostics"]);
  });
});

describe("serviceCategoryMatchValues", () => {
  it("includes canonical and legacy aliases", () => {
    assert.deepEqual(serviceCategoryMatchValues("brakes"), ["brakes", "Brakes"]);
    assert.deepEqual(serviceCategoryMatchValues("engine_diagnostics"), [
      "engine_diagnostics",
      "Engine Repair",
      "Diagnostics",
    ]);
  });

  it("returns empty for unknown category", () => {
    assert.deepEqual(serviceCategoryMatchValues("unknown"), []);
  });
});

describe("serviceCategoryMatchClause", () => {
  it("builds OR clause for legacy aliases", () => {
    const clause = serviceCategoryMatchClause("brakes");
    assert.match(clause, /OR\(/);
    assert.match(clause, /brakes/);
    assert.match(clause, /Brakes/);
  });

  it("uses single FIND for categories without legacy aliases", () => {
    const clause = serviceCategoryMatchClause("tires_wheels");
    assert.doesNotMatch(clause, /OR\(/);
    assert.match(clause, /tires_wheels/);
  });
});
