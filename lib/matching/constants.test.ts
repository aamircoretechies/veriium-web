import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  buildEscalationNotBefore,
  DEFAULT_TIER_DELAYS_SECONDS,
  getTierDelaysSeconds,
} from "./constants";

const ORIGINAL_DELAYS = process.env.MATCHING_TIER_DELAYS_SECONDS;

afterEach(() => {
  if (ORIGINAL_DELAYS === undefined) {
    delete process.env.MATCHING_TIER_DELAYS_SECONDS;
  } else {
    process.env.MATCHING_TIER_DELAYS_SECONDS = ORIGINAL_DELAYS;
  }
});

describe("DEFAULT_TIER_DELAYS_SECONDS (W2-D §8.4 confirmation)", () => {
  it("fires Tier 2 at +10 min from match_tier_started_at", () => {
    assert.equal(DEFAULT_TIER_DELAYS_SECONDS.tier2, 10 * 60);
  });

  it("fires Tier 3 at +25 min total from match_tier_started_at", () => {
    assert.equal(DEFAULT_TIER_DELAYS_SECONDS.tier3, 25 * 60);
  });

  it("fires Tier 4 at +55 min total from match_tier_started_at", () => {
    assert.equal(DEFAULT_TIER_DELAYS_SECONDS.tier4, 55 * 60);
  });

  it("matches §8.4 tier windows (15 min T2, 30 min T3)", () => {
    const tier2Window =
      DEFAULT_TIER_DELAYS_SECONDS.tier3 - DEFAULT_TIER_DELAYS_SECONDS.tier2;
    const tier3Window =
      DEFAULT_TIER_DELAYS_SECONDS.tier4 - DEFAULT_TIER_DELAYS_SECONDS.tier3;
    assert.equal(tier2Window, 15 * 60);
    assert.equal(tier3Window, 30 * 60);
  });
});

describe("getTierDelaysSeconds", () => {
  it("returns defaults when env is unset", () => {
    delete process.env.MATCHING_TIER_DELAYS_SECONDS;
    assert.deepEqual(getTierDelaysSeconds(), DEFAULT_TIER_DELAYS_SECONDS);
  });

  it("parses MATCHING_TIER_DELAYS_SECONDS override", () => {
    process.env.MATCHING_TIER_DELAYS_SECONDS = "60,120,180";
    assert.deepEqual(getTierDelaysSeconds(), {
      tier2: 60,
      tier3: 120,
      tier4: 180,
    });
  });

  it("falls back to defaults for invalid override", () => {
    process.env.MATCHING_TIER_DELAYS_SECONDS = "bad,data";
    assert.deepEqual(getTierDelaysSeconds(), DEFAULT_TIER_DELAYS_SECONDS);
  });
});

describe("buildEscalationNotBefore (W2-D §8.4 confirmation)", () => {
  it("offsets QStash notBefore from match_tier_started_at", () => {
    const startedAt = "2026-01-15T12:00:00.000Z";
    const baseUnix = Math.floor(new Date(startedAt).getTime() / 1000);
    const notBefore = buildEscalationNotBefore(startedAt);

    assert.equal(notBefore.tier2, baseUnix + 600);
    assert.equal(notBefore.tier3, baseUnix + 1500);
    assert.equal(notBefore.tier4, baseUnix + 3300);
  });
});
