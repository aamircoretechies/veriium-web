import type { JobFields } from "@/types/airtable/jobs";

export const DEFAULT_APPOINTMENT_DURATION_MS = 2 * 60 * 60 * 1000;

export type BookingCalendarInput = {
  jobId: string;
  job: Pick<
    JobFields,
    "zip_code" | "service_type" | "scheduled_time" | "created_at"
  >;
  diagnosisSummary?: string;
  signedUrl: string;
};

function formatIcsUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function resolveStartDate(job: BookingCalendarInput["job"]): Date {
  if (job.scheduled_time) {
    return new Date(job.scheduled_time);
  }
  if (job.created_at) {
    return new Date(job.created_at);
  }
  return new Date();
}

function buildLocation(job: BookingCalendarInput["job"]): string {
  const zip = job.zip_code ?? "your area";
  if (job.service_type === "dropoff") {
    return `Drop-off repair — ZIP ${zip}`;
  }
  return `Mobile repair — ZIP ${zip}`;
}

export function buildBookingCalendarIcs(input: BookingCalendarInput): string {
  const start = resolveStartDate(input.job);
  const end = new Date(start.getTime() + DEFAULT_APPOINTMENT_DURATION_MS);
  const now = new Date();
  const uid = `veriium-${input.jobId}@veriium.com`;
  const summary = "Veriium repair appointment";
  const descriptionParts = [
    input.diagnosisSummary?.trim(),
    `Job link: ${input.signedUrl}`,
  ].filter(Boolean);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Veriium//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsUtc(now)}`,
    `DTSTART:${formatIcsUtc(start)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(descriptionParts.join("\\n"))}`,
    `LOCATION:${escapeIcsText(buildLocation(input.job))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.join("\r\n")}\r\n`;
}
