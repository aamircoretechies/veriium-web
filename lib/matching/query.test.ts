import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildTier1Formula,
  buildTier2Formula,
  buildTier3Formula,
} from "./query";

const QUERY = {
  zipCode: "30043",
  category: "brakes" as const,
  serviceType: "mobile_repair" as const,
};

describe("buildTier2Formula (W2-B §8.2 confirmation)", () => {
  it("requires approved mechanics with setup wizard complete", () => {
    const formula = buildTier2Formula(QUERY);
    assert.match(formula, /approved/);
    assert.match(formula, /background_check_status/);
    assert.match(formula, /setup_wizard_completed_at/);
  });

  it("includes available and busy mechanics (recently busy pool)", () => {
    const formula = buildTier2Formula(QUERY);
    assert.match(formula, /OR\(/);
    assert.match(formula, /availability_status.*available/);
    assert.match(formula, /availability_status.*busy/);
  });

  it("filters by job ZIP", () => {
    const formula = buildTier2Formula(QUERY);
    assert.match(formula, /30043/);
    assert.match(formula, /service_zip_codes/);
  });

  it("retains diagnosis category (unlike Tier 3)", () => {
    const tier2 = buildTier2Formula(QUERY);
    const tier3 = buildTier3Formula(QUERY);
    assert.match(tier2, /brakes/);
    assert.doesNotMatch(tier3, /brakes/);
  });

  it("omits Tier 1 assignment cooldown so recently busy mechanics qualify", () => {
    const tier1 = buildTier1Formula(QUERY);
    const tier2 = buildTier2Formula(QUERY);
    assert.match(tier1, /last_assigned_at/);
    assert.doesNotMatch(tier2, /last_assigned_at/);
  });
});

describe("buildTier3Formula (W2-C §8.3 confirmation)", () => {
  it("requires approved mechanics with setup wizard complete", () => {
    const formula = buildTier3Formula(QUERY);
    assert.match(formula, /approved/);
    assert.match(formula, /background_check_status/);
    assert.match(formula, /setup_wizard_completed_at/);
  });

  it("includes only available mechanics (not busy)", () => {
    const formula = buildTier3Formula(QUERY);
    assert.match(formula, /availability_status.*available/);
    assert.doesNotMatch(formula, /availability_status.*busy/);
  });

  it("filters by job ZIP", () => {
    const formula = buildTier3Formula(QUERY);
    assert.match(formula, /30043/);
    assert.match(formula, /service_zip_codes/);
  });

  it("drops diagnosis category so any approved mechanic in ZIP qualifies", () => {
    const formula = buildTier3Formula(QUERY);
    assert.doesNotMatch(formula, /brakes/);
    assert.doesNotMatch(formula, /service_categories/);
  });

  it("omits Tier 1 assignment cooldown", () => {
    const tier1 = buildTier1Formula(QUERY);
    const tier3 = buildTier3Formula(QUERY);
    assert.match(tier1, /last_assigned_at/);
    assert.doesNotMatch(tier3, /last_assigned_at/);
  });
});
