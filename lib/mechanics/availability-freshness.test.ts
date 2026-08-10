import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  availabilityIsFresh,
  availabilityIsStale,
  buildFreshAvailabilityFormulaClause,
} from "./availability-freshness";

const ORIGINAL_ENV = process.env.STALE_AVAILABILITY_SECONDS;

describe("availability freshness (W2-G §4.8)", () => {
  beforeEach(() => {
    process.env.STALE_AVAILABILITY_SECONDS = "604800";
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.STALE_AVAILABILITY_SECONDS;
    } else {
      process.env.STALE_AVAILABILITY_SECONDS = ORIGINAL_ENV;
    }
  });

  it("treats missing timestamp as stale", () => {
    assert.equal(availabilityIsStale(undefined), true);
    assert.equal(availabilityIsFresh(undefined), false);
  });

  it("treats recent timestamp as fresh", () => {
    const recent = new Date().toISOString();
    assert.equal(availabilityIsStale(recent), false);
    assert.equal(availabilityIsFresh(recent), true);
  });

  it("treats expired timestamp as stale", () => {
    const expired = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    assert.equal(availabilityIsStale(expired), true);
    assert.equal(availabilityIsFresh(expired), false);
  });

  it("buildFreshAvailabilityFormulaClause includes freshness window", () => {
    const clause = buildFreshAvailabilityFormulaClause();
    assert.match(clause, /availability_updated_at/);
    assert.match(clause, /IS_AFTER/);
    assert.match(clause, /DATEADD\(NOW\(\), -604800, 'seconds'\)/);
  });
});
