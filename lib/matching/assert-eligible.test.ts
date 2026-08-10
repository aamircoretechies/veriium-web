import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AirtableRecord } from "@/types/airtable/common";
import type { MechanicFields } from "@/types/airtable/mechanics";

import { isMechanicEligibleForTierSend } from "./assert-eligible";

function mechanicRecord(
  availabilityStatus?: MechanicFields["availability_status"],
): AirtableRecord<MechanicFields> {
  return {
    id: "rec-test",
    fields: {
      availability_status: availabilityStatus,
    },
  };
}

describe("isMechanicEligibleForTierSend (W2-E §4.8)", () => {
  describe("Tier 1 and Tier 3 — available only", () => {
    for (const tier of [1, 3] as const) {
      it(`tier ${tier}: available is eligible`, () => {
        assert.equal(
          isMechanicEligibleForTierSend(mechanicRecord("available"), tier),
          true,
        );
      });

      it(`tier ${tier}: busy is not eligible`, () => {
        assert.equal(
          isMechanicEligibleForTierSend(mechanicRecord("busy"), tier),
          false,
        );
      });

      it(`tier ${tier}: offline is not eligible`, () => {
        assert.equal(
          isMechanicEligibleForTierSend(mechanicRecord("offline"), tier),
          false,
        );
      });

      it(`tier ${tier}: missing status is not eligible`, () => {
        assert.equal(
          isMechanicEligibleForTierSend(mechanicRecord(undefined), tier),
          false,
        );
      });
    }
  });

  describe("Tier 2 — available or busy", () => {
    it("available is eligible", () => {
      assert.equal(
        isMechanicEligibleForTierSend(mechanicRecord("available"), 2),
        true,
      );
    });

    it("busy is eligible", () => {
      assert.equal(
        isMechanicEligibleForTierSend(mechanicRecord("busy"), 2),
        true,
      );
    });

    it("offline is not eligible", () => {
      assert.equal(
        isMechanicEligibleForTierSend(mechanicRecord("offline"), 2),
        false,
      );
    });
  });
});
