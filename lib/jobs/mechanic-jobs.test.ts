import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapJobToListItem, classifyMechanicJobListStatus } from "@/lib/jobs/mechanic-jobs";
import { buildJobSchedulingFields } from "@/lib/jobs/mechanic-view";
import { JOB_STATUS } from "@/lib/jobs/status";
import type { MechanicJobView } from "@/types/api/mechanic-job-view";
import type { AirtableRecord } from "@/types/airtable/common";
import type { JobFields } from "@/types/airtable/jobs";

function makeJob(
  overrides: Partial<JobFields> = {},
): AirtableRecord<JobFields> {
  return {
    id: "recJOB123",
    fields: {
      status: JOB_STATUS.in_progress,
      zip_code: "90210",
      service_type: "mobile_repair",
      scheduled_time: "2026-08-15T18:00:00.000Z",
      vehicle_year: 2020,
      vehicle_make: "Toyota",
      vehicle_model: "Camry",
      diagnosis_summary: "Brake issue",
      ...overrides,
    },
  } as AirtableRecord<JobFields>;
}

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

describe("buildJobSchedulingFields", () => {
  it("returns zip, service type label, and scheduled time label", () => {
    const fields = buildJobSchedulingFields(makeJob());

    assert.equal(fields.zipCode, "90210");
    assert.equal(fields.serviceTypeLabel, "Mobile repair");
    assert.match(fields.scheduledTimeLabel ?? "", /Aug/);
  });

  it("omits scheduled time label when not scheduled", () => {
    const fields = buildJobSchedulingFields(
      makeJob({ scheduled_time: undefined }),
    );

    assert.equal(fields.scheduledTimeLabel, undefined);
  });
});

describe("mapJobToListItem", () => {
  it("includes driver contact and scheduling fields without driver_id", async () => {
    const driverCache = new Map<string, MechanicJobView["driver"]>();
    const item = await mapJobToListItem(makeJob(), "active", driverCache);

    assert.equal(item.customerName, "Customer");
    assert.deepEqual(item.driver, { zip: "90210" });
    assert.equal(item.zipCode, "90210");
    assert.equal(item.serviceTypeLabel, "Mobile repair");
    assert.match(item.scheduledTimeLabel ?? "", /Aug/);
    assert.equal(item.listStatus, "active");
    assert.equal(item.jobId, "recJOB123");
  });

  it("includes mechanic payout fields on completed jobs", async () => {
    const driverCache = new Map<string, MechanicJobView["driver"]>();
    const item = await mapJobToListItem(
      makeJob({
        status: JOB_STATUS.confirmed,
        mechanic_payout: 195.5,
        completed_at: "2026-08-16T18:00:00.000Z",
      }),
      "completed",
      driverCache,
    );

    assert.equal(item.mechanicPayout, 195.5);
    assert.equal(item.mechanicPayoutLabel, "$195.50");
  });
});
