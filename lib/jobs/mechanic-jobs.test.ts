import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyMechanicJobListStatus } from "@/lib/jobs/mechanic-jobs";
import { JOB_STATUS } from "@/lib/jobs/status";

describe("classifyMechanicJobListStatus", () => {
  it("classifies in-progress service statuses as active", () => {
    assert.equal(
      classifyMechanicJobListStatus(JOB_STATUS.accepted_by_mechanic),
      "active",
    );
    assert.equal(classifyMechanicJobListStatus(JOB_STATUS.en_route), "active");
    assert.equal(classifyMechanicJobListStatus(JOB_STATUS.in_progress), "active");
  });

  it("classifies matched_awaiting_payment as active", () => {
    assert.equal(
      classifyMechanicJobListStatus(JOB_STATUS.matched_awaiting_payment),
      "active",
    );
  });

  it("classifies terminal completion statuses as completed", () => {
    assert.equal(
      classifyMechanicJobListStatus(JOB_STATUS.completed_pending_confirmation),
      "completed",
    );
    assert.equal(
      classifyMechanicJobListStatus(JOB_STATUS.confirmed),
      "completed",
    );
    assert.equal(
      classifyMechanicJobListStatus(JOB_STATUS.disputed),
      "completed",
    );
    assert.equal(
      classifyMechanicJobListStatus(JOB_STATUS.refunded),
      "completed",
    );
  });

  it("excludes pre-match and cancelled statuses", () => {
    assert.equal(
      classifyMechanicJobListStatus(JOB_STATUS.matched_awaiting_response),
      null,
    );
    assert.equal(classifyMechanicJobListStatus(JOB_STATUS.draft), null);
    assert.equal(classifyMechanicJobListStatus(JOB_STATUS.cancelled), null);
    assert.equal(
      classifyMechanicJobListStatus(JOB_STATUS.no_show_pending_review),
      null,
    );
  });
});
