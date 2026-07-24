const EASTERN_TZ = "America/New_York";

export const SCHEDULE_TIME_SLOTS = ["morning", "afternoon", "evening"] as const;
export type ScheduleTimeSlot = (typeof SCHEDULE_TIME_SLOTS)[number];

const SLOT_LOCAL_TIME: Record<
  ScheduleTimeSlot,
  { hour: number; minute: number }
> = {
  morning: { hour: 10, minute: 0 },
  afternoon: { hour: 14, minute: 30 },
  evening: { hour: 18, minute: 30 },
};

type EasternParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getEasternParts(date: Date): EasternParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour") % 24,
    minute: read("minute"),
  };
}

function resolveScheduleYear(month: number, day: number, now = new Date()): number {
  const easternNow = getEasternParts(now);
  const candidate = month * 100 + day;
  const today = easternNow.month * 100 + easternNow.day;
  return candidate < today ? easternNow.year + 1 : easternNow.year;
}

/** Map Eastern wall-clock to the UTC instant Airtable stores in `scheduled_time`. */
export function easternDateTimeToUtcIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  const desired: EasternParts = { year, month, day, hour, minute };
  let candidate = new Date(Date.UTC(year, month - 1, day, hour + 5, minute));

  for (let attempt = 0; attempt < 48; attempt++) {
    const actual = getEasternParts(candidate);
    if (
      actual.year === desired.year &&
      actual.month === desired.month &&
      actual.day === desired.day &&
      actual.hour === desired.hour &&
      actual.minute === desired.minute
    ) {
      return candidate.toISOString();
    }

    const diffMinutes =
      (desired.day - actual.day) * 24 * 60 +
      (desired.hour - actual.hour) * 60 +
      (desired.minute - actual.minute);
    candidate = new Date(candidate.getTime() + diffMinutes * 60_000);
  }

  throw new Error("Could not resolve Eastern scheduled time.");
}

export function buildScheduledTimeIso(
  month: number,
  day: number,
  timeSlot: ScheduleTimeSlot,
  now = new Date(),
): string {
  const { hour, minute } = SLOT_LOCAL_TIME[timeSlot];
  const year = resolveScheduleYear(month, day, now);
  return easternDateTimeToUtcIso(year, month, day, hour, minute);
}

export function formatScheduledTimeForDisplay(
  scheduledTimeIso: string,
  now = new Date(),
): string {
  const date = new Date(scheduledTimeIso);
  if (!Number.isFinite(date.getTime())) {
    return scheduledTimeIso;
  }

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    month: "long",
    day: "numeric",
  }).format(date);

  const timeLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  const year = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: EASTERN_TZ,
      year: "numeric",
    }).format(date),
  );
  const currentYear = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: EASTERN_TZ,
      year: "numeric",
    }).format(now),
  );

  const prefix = year !== currentYear ? `${dateLabel}, ${year} ` : `${dateLabel} `;
  return `${prefix}at ${timeLabel}`;
}
