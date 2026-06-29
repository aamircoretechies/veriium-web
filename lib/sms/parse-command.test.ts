import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseSmsCommand } from "./parse-command";

describe("parseSmsCommand — REQUOTE", () => {
  it("parses REQUOTE PARTS $YY with reason", () => {
    const parsed = parseSmsCommand("REQUOTE PARTS $120 wrong part number");
    assert.equal(parsed.kind, "requote");
    if (parsed.kind === "requote") {
      assert.equal(parsed.remainder, "PARTS $120 wrong part number");
    }
  });

  it("is case-insensitive", () => {
    const parsed = parseSmsCommand("requote parts $95 supplier price increase");
    assert.equal(parsed.kind, "requote");
    if (parsed.kind === "requote") {
      assert.equal(parsed.remainder, "parts $95 supplier price increase");
    }
  });

  it("returns unknown for unrelated bodies", () => {
    const parsed = parseSmsCommand("hello");
    assert.equal(parsed.kind, "unknown");
  });
});
