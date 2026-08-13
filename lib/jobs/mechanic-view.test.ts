import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { stringifyQuoteDetails } from "@/lib/jobs/quote-details";
import { mapMechanicJobPayoutFields } from "@/lib/jobs/mechanic-view";
import { JOB_STATUS } from "@/lib/jobs/status";
import type { JobFields } from "@/types/airtable/jobs";

describe("mapMechanicJobPayoutFields", () => {
  it("maps stored quote and payout fields with currency labels", () => {
    const payout = mapMechanicJobPayoutFields({
      status: JOB_STATUS.quote_provided,
      quote_total: 245,
      parts_cost: 80,
      platform_fee: 36.75,
      mechanic_payout: 288.25,
      final_price: 325,
    } as JobFields);

    assert.equal(payout.quoteTotal, 245);
    assert.equal(payout.quoteTotalLabel, "$245.00");
    assert.equal(payout.partsCost, 80);
    assert.equal(payout.partsCostLabel, "$80.00");
    assert.equal(payout.platformFee, 36.75);
    assert.equal(payout.platformFeeLabel, "$36.75");
    assert.equal(payout.mechanicPayout, 288.25);
    assert.equal(payout.mechanicPayoutLabel, "$288.25");
    assert.equal(payout.finalPrice, 325);
    assert.equal(payout.finalPriceLabel, "$325.00");
    assert.equal(payout.requotePending, false);
    assert.equal(payout.requoteReason, null);
    assert.equal(payout.originalPartsCost, null);
  });

  it("flags requote-pending jobs and exposes original parts", () => {
    const payout = mapMechanicJobPayoutFields({
      status: JOB_STATUS.awaiting_customer_approval,
      quote_total: 245,
      parts_cost: 120,
      platform_fee: 36.75,
      mechanic_payout: 328.25,
      final_price: 365,
      quote_details: stringifyQuoteDetails({
        requote: true,
        requote_reason: "extra rotor",
        original_parts_cost: 80,
      }),
    } as JobFields);

    assert.equal(payout.requotePending, true);
    assert.equal(payout.requoteReason, "extra rotor");
    assert.equal(payout.originalPartsCost, 80);
    assert.equal(payout.originalPartsCostLabel, "$80.00");
    assert.equal(payout.partsCost, 120);
    assert.equal(payout.mechanicPayout, 328.25);
  });

  it("returns null money fields before a quote", () => {
    const payout = mapMechanicJobPayoutFields({
      status: JOB_STATUS.diagnosing,
    } as JobFields);

    assert.equal(payout.quoteTotal, null);
    assert.equal(payout.quoteTotalLabel, null);
    assert.equal(payout.partsCost, null);
    assert.equal(payout.platformFee, null);
    assert.equal(payout.mechanicPayout, null);
    assert.equal(payout.finalPrice, null);
    assert.equal(payout.requotePending, false);
  });
});
