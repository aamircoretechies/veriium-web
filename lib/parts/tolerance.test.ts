import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isWithinTolerance,
  partsToleranceBand,
} from "./tolerance";

describe("partsToleranceBand", () => {
  it("uses $25 floor for low parts costs", () => {
    assert.equal(partsToleranceBand(80), 25);
  });

  it("uses 10% for higher parts costs", () => {
    assert.equal(partsToleranceBand(300), 30);
  });
});

describe("isWithinTolerance", () => {
  it("allows receipt exactly at tolerance boundary", () => {
    assert.equal(isWithinTolerance(80, 105), true);
  });

  it("rejects receipt above tolerance", () => {
    assert.equal(isWithinTolerance(80, 105.01), false);
  });

  it("allows receipt below quoted parts", () => {
    assert.equal(isWithinTolerance(80, 70), true);
  });
});
