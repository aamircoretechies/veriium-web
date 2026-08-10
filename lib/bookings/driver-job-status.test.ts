import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatCostEstimateRange,
  formatDriveabilitySeverity,
  getDriverJobUiPhase,
  getDriverQuoteUiStatus,
  getDriverTimelineStepIndex,
  shouldPollDriverJobStatus,
  shouldShowDiagnosisSection,
  shouldShowQuoteSection,
} from "./driver-job-status";
import { JOB_STATUS } from "@/lib/jobs/status";

describe("getDriverTimelineStepIndex", () => {
  it("maps early booking statuses to mechanic assigned", () => {
    assert.equal(
      getDriverTimelineStepIndex(JOB_STATUS.accepted_by_mechanic),
      1,
    );
    assert.equal(
      getDriverTimelineStepIndex(JOB_STATUS.matched_awaiting_payment),
      1,
    );
  });

  it("maps service progression statuses", () => {
    assert.equal(getDriverTimelineStepIndex(JOB_STATUS.en_route), 2);
    assert.equal(getDriverTimelineStepIndex(JOB_STATUS.arrived), 3);
    assert.equal(getDriverTimelineStepIndex(JOB_STATUS.vehicle_received), 3);
    assert.equal(getDriverTimelineStepIndex(JOB_STATUS.diagnosing), 4);
    assert.equal(getDriverTimelineStepIndex(JOB_STATUS.quote_provided), 5);
    assert.equal(
      getDriverTimelineStepIndex(JOB_STATUS.awaiting_customer_approval),
      5,
    );
    assert.equal(
      getDriverTimelineStepIndex(JOB_STATUS.approved_parts_pickup),
      6,
    );
    assert.equal(getDriverTimelineStepIndex(JOB_STATUS.in_progress), 6);
    assert.equal(
      getDriverTimelineStepIndex(JOB_STATUS.completed_pending_confirmation),
      7,
    );
    assert.equal(getDriverTimelineStepIndex(JOB_STATUS.confirmed), 7);
  });
});

describe("shouldPollDriverJobStatus", () => {
  it("polls during active repair statuses", () => {
    assert.equal(shouldPollDriverJobStatus(JOB_STATUS.en_route), true);
    assert.equal(shouldPollDriverJobStatus(JOB_STATUS.diagnosing), true);
    assert.equal(
      shouldPollDriverJobStatus(JOB_STATUS.completed_pending_confirmation),
      true,
    );
  });

  it("stops polling for terminal and pre-match statuses", () => {
    assert.equal(shouldPollDriverJobStatus(JOB_STATUS.confirmed), false);
    assert.equal(shouldPollDriverJobStatus(JOB_STATUS.cancelled), false);
    assert.equal(
      shouldPollDriverJobStatus(JOB_STATUS.matched_awaiting_response),
      false,
    );
    assert.equal(shouldPollDriverJobStatus(JOB_STATUS.disputed), false);
  });
});

describe("getDriverJobUiPhase", () => {
  it("classifies cancelled, pre-match, and terminal statuses", () => {
    assert.equal(getDriverJobUiPhase(JOB_STATUS.cancelled), "cancelled");
    assert.equal(
      getDriverJobUiPhase(JOB_STATUS.matched_awaiting_response),
      "pre_match",
    );
    assert.equal(getDriverJobUiPhase(JOB_STATUS.disputed), "terminal");
    assert.equal(getDriverJobUiPhase(JOB_STATUS.en_route), "active");
  });
});

describe("section visibility helpers", () => {
  it("shows diagnosis and quote sections at the right steps", () => {
    assert.equal(shouldShowDiagnosisSection(3), false);
    assert.equal(shouldShowDiagnosisSection(4), true);
    assert.equal(shouldShowQuoteSection(4), false);
    assert.equal(shouldShowQuoteSection(5), true);
  });
});

describe("formatters", () => {
  it("formats cost estimate ranges", () => {
    assert.equal(formatCostEstimateRange(150, 300), "$150 - $300");
    assert.equal(formatCostEstimateRange(150, undefined), "$150");
    assert.equal(formatCostEstimateRange(undefined, undefined), undefined);
  });

  it("maps driveability to severity labels", () => {
    assert.equal(formatDriveabilitySeverity("do_not_drive"), "High");
    assert.equal(formatDriveabilitySeverity("caution"), "Medium");
    assert.equal(formatDriveabilitySeverity("safe"), "Low");
  });
});

describe("getDriverQuoteUiStatus", () => {
  it("derives quote UI state from job status", () => {
    assert.equal(
      getDriverQuoteUiStatus(JOB_STATUS.awaiting_customer_approval),
      "pending",
    );
    assert.equal(getDriverQuoteUiStatus(JOB_STATUS.in_progress), "approved");
    assert.equal(
      getDriverQuoteUiStatus(JOB_STATUS.cancelled_after_diagnosis),
      "declined",
    );
    assert.equal(getDriverQuoteUiStatus(JOB_STATUS.en_route), "none");
  });
});
