import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AirtableRecord } from "@/types/airtable/common";
import type { MechanicFields } from "@/types/airtable/mechanics";

import { isMechanicEligibleForTierSend } from "./assert-eligible";

function mechanicRecord(
  availabilityStatus?: MechanicFields["availability_status"],
  availabilityUpdatedAt?: string,
): AirtableRecord<MechanicFields> {
  return {
    id: "rec-test",
    createdTime: "2026-01-01T00:00:00.000Z",
    fields: {
      availability_status: availabilityStatus,
      availability_updated_at: availabilityUpdatedAt,
    },
  };
}

const freshTimestamp = new Date().toISOString();
const staleTimestamp = new Date(
  Date.now() - 8 * 24 * 60 * 60 * 1000,
).toISOString();

describe("isMechanicEligibleForTierSend (W2-E §4.8)", () => {
  describe("Tier 1 and Tier 3 — available only", () => {
    for (const tier of [1, 3] as const) {
      it(`tier ${tier}: available with fresh timestamp is eligible`, () => {
        assert.equal(
          isMechanicEligibleForTierSend(
            mechanicRecord("available", freshTimestamp),
            tier,
          ),
          true,
        );
      });

      it(`tier ${tier}: available with stale timestamp is not eligible`, () => {
        assert.equal(
          isMechanicEligibleForTierSend(
            mechanicRecord("available", staleTimestamp),
            tier,
          ),
          false,
        );
      });

      it(`tier ${tier}: busy is not eligible`, () => {
        assert.equal(
          isMechanicEligibleForTierSend(
            mechanicRecord("busy", freshTimestamp),
            tier,
          ),
          false,
        );
      });

      it(`tier ${tier}: offline is not eligible`, () => {
        assert.equal(
          isMechanicEligibleForTierSend(
            mechanicRecord("offline", freshTimestamp),
            tier,
          ),
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
    it("available with fresh timestamp is eligible", () => {
      assert.equal(
        isMechanicEligibleForTierSend(
          mechanicRecord("available", freshTimestamp),
          2,
        ),
        true,
      );
    });

    it("available with stale timestamp is not eligible", () => {
      assert.equal(
        isMechanicEligibleForTierSend(
          mechanicRecord("available", staleTimestamp),
          2,
        ),
        false,
      );
    });

    it("busy is eligible even with stale availability timestamp", () => {
      assert.equal(
        isMechanicEligibleForTierSend(
          mechanicRecord("busy", staleTimestamp),
          2,
        ),
        true,
      );
    });

    it("offline is not eligible", () => {
      assert.equal(
        isMechanicEligibleForTierSend(
          mechanicRecord("offline", freshTimestamp),
          2,
        ),
        false,
      );
    });
  });
});
