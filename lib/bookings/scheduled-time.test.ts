import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GWINNETT_ZIP_CODES } from "@/lib/constants/gwinnett-zips";
import { InvalidScheduledTimeError } from "./errors";
import {
  buildScheduledTimeIso,
  formatScheduledTimeForDisplay,
} from "./scheduled-time";
import { validateBookingIntake } from "./validate-intake";

const baseBooking = {
  diagnosisId: "recDiagnosis123",
  name: "Jane Driver",
  zip: GWINNETT_ZIP_CODES[0],
  phone: "(555) 123-4567",
  serviceType: "onsite" as const,
  smsConsent: true as const,
  phoneConsent: true as const,
  verificationCode: "123456",
};

describe("buildScheduledTimeIso", () => {
  it("maps a schedule slot to a future UTC ISO timestamp", () => {
    const now = new Date("2026-07-24T12:00:00.000Z");
    const iso = buildScheduledTimeIso(8, 15, "afternoon", now);

    assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.ok(Date.parse(iso) > now.getTime());
  });
});

describe("formatScheduledTimeForDisplay", () => {
  it("formats an ISO timestamp in Eastern time", () => {
    const label = formatScheduledTimeForDisplay("2026-12-12T19:30:00.000Z");
    assert.match(label, /December 12 at /);
  });
});

describe("validateBookingIntake scheduleSlot", () => {
  it("converts scheduleSlot to scheduled_time", () => {
    const now = new Date("2026-07-24T12:00:00.000Z");
    const intake = validateBookingIntake({
      ...baseBooking,
      scheduleSlot: {
        month: 8,
        day: 15,
        time: "afternoon",
      },
    });

    assert.ok(intake.scheduledTime);
    assert.ok(Date.parse(intake.scheduledTime!) > now.getTime());
  });

  it("rejects schedule slots in the past", () => {
    assert.throws(
      () =>
        validateBookingIntake({
          ...baseBooking,
          scheduledTime: "2020-01-01T12:00:00.000Z",
        }),
      InvalidScheduledTimeError,
    );
  });
});
