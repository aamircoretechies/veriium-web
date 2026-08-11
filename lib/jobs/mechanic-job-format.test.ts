import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatCustomerDisplayName,
  formatDiagnosisCostEstimate,
  formatMechanicJobStatusLabel,
} from "@/lib/jobs/mechanic-job-format";
import { JOB_STATUS } from "@/lib/jobs/status";

describe("mechanic-job-format", () => {
  it("formats customer display names", () => {
    assert.equal(formatCustomerDisplayName("Andrea Smith"), "Andrea S.");
    assert.equal(formatCustomerDisplayName("Madonna"), "Madonna");
    assert.equal(formatCustomerDisplayName(undefined), "Customer");
  });

  it("formats diagnosis cost estimate ranges", () => {
    assert.equal(formatDiagnosisCostEstimate("200-350"), "$200 – $350");
    assert.equal(formatDiagnosisCostEstimate(undefined), undefined);
  });

  it("formats mechanic job status labels", () => {
    assert.equal(
      formatMechanicJobStatusLabel(JOB_STATUS.in_progress),
      "Repair Started",
    );
    assert.equal(
      formatMechanicJobStatusLabel(JOB_STATUS.matched_awaiting_payment),
      "Awaiting Payment",
    );
  });
});
