import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_APPOINTMENT_DURATION_MS,
  buildBookingCalendarIcs,
} from "./calendar";

describe("buildBookingCalendarIcs", () => {
  it("uses scheduled_time for DTSTART and a 2-hour window", () => {
    const start = new Date("2026-07-15T14:30:00.000Z");
    const ics = buildBookingCalendarIcs({
      jobId: "recJOB123",
      job: {
        zip_code: "30019",
        service_type: "mobile_repair",
        scheduled_time: start.toISOString(),
      },
      diagnosisSummary: "Brake noise when stopping",
      signedUrl: "https://veriium.com/j/recJOB123?token=abc",
    });

    assert.match(ics, /^BEGIN:VCALENDAR/);
    assert.match(ics, /BEGIN:VEVENT/);
    assert.match(ics, /SUMMARY:Veriium repair appointment/);
    assert.match(ics, /DTSTART:20260715T143000Z/);
    assert.match(ics, /DTEND:20260715T163000Z/);
    assert.match(ics, /LOCATION:Mobile repair — ZIP 30019/);
    assert.match(ics, /Brake noise when stopping/);
    assert.match(ics, /END:VEVENT/);
    assert.match(ics, /END:VCALENDAR/);
  });

  it("falls back to created_at when scheduled_time is missing", () => {
    const createdAt = new Date("2026-07-10T10:00:00.000Z");
    const ics = buildBookingCalendarIcs({
      jobId: "recJOB456",
      job: {
        zip_code: "30043",
        service_type: "dropoff",
        created_at: createdAt.toISOString(),
      },
      signedUrl: "https://veriium.com/j/recJOB456?token=def",
    });

    const expectedEnd = new Date(
      createdAt.getTime() + DEFAULT_APPOINTMENT_DURATION_MS,
    )
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");

    assert.match(ics, /DTSTART:20260710T100000Z/);
    assert.match(ics, new RegExp(`DTEND:${expectedEnd}`));
    assert.match(ics, /LOCATION:Drop-off repair — ZIP 30043/);
  });
});
