import type { BookingServiceTypeInput, BookingVehicle } from "@/types/api/booking";

export const SCHEDULE_LATER_INTAKE_KEY = "veriium:schedule-later-intake";

export type ScheduleLaterIntake = {
  diagnosisId: string;
  serviceType: BookingServiceTypeInput;
  name?: string;
  zip?: string;
  phone?: string;
  email?: string;
  additionalDetails?: string;
  attachmentUrls?: string[];
  vehicle?: BookingVehicle;
};

export function saveScheduleLaterIntake(intake: ScheduleLaterIntake): void {
  sessionStorage.setItem(SCHEDULE_LATER_INTAKE_KEY, JSON.stringify(intake));
}

export function readScheduleLaterIntake(): ScheduleLaterIntake | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(SCHEDULE_LATER_INTAKE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ScheduleLaterIntake;
  } catch {
    return null;
  }
}

export function clearScheduleLaterIntake(): void {
  sessionStorage.removeItem(SCHEDULE_LATER_INTAKE_KEY);
}
