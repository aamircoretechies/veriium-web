import { GWINNETT_ZIP_CODES } from "@/lib/constants/gwinnett-zips";
import {
  isFutureScheduleSlot,
  isScheduleTimeSlot,
} from "@/lib/bookings/scheduled-time";
import {
  EMAIL_MAX,
  FULL_NAME_MAX,
  formatPhoneInput,
  isTechnicalValidationMessage,
  isValidEmail,
  isValidFullName,
  sanitizeEmailInput,
  sanitizeNameInput,
} from "@/lib/mechanics/apply-form";
import { isValidUsPhone } from "@/lib/phone";

export {
  EMAIL_MAX,
  FULL_NAME_MAX,
  formatPhoneInput,
  isValidEmail,
  isValidFullName,
  sanitizeEmailInput,
  sanitizeNameInput,
};

export const ZIP_MAX = 5;
export const PHONE_INPUT_MAX = 14;
export const VEHICLE_YEAR_MIN = 1900;
export const VEHICLE_YEAR_DIGITS = 4;
export const MAKE_MAX = 40;
export const MODEL_MAX = 50;
export const VIN_OR_PLATE_MAX = 17;
export const VIN_OR_PLATE_MIN = 2;
export const DETAILS_MAX = 500;
export const OTP_LENGTH = 6;

/** Letters, numbers, spaces, hyphens, apostrophes, and periods (e.g. Mercedes-Benz, F-150). */
export const MAKE_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\s'.\-]{0,39}$/u;
export const MODEL_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\s'.\-]{0,49}$/u;
export const VIN_OR_PLATE_PATTERN = /^[A-Z0-9][A-Z0-9 \-]{1,16}$/i;

const GWINNETT_ZIP_SET = new Set<string>(GWINNETT_ZIP_CODES);
const VEHICLE_NAME_DISALLOWED = /[^\p{L}\p{N}\s'.\-]/gu;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

export function getVehicleYearMax(now = new Date()): number {
  return now.getFullYear() + 1;
}

export function sanitizeZipInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, ZIP_MAX);
}

export function isValidZipFormat(value: string): boolean {
  return new RegExp(`^\\d{${ZIP_MAX}}$`).test(value.trim());
}

export function isInServiceArea(zip: string): boolean {
  return GWINNETT_ZIP_SET.has(zip.trim());
}

export function sanitizeVehicleYearInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, VEHICLE_YEAR_DIGITS);
}

export function isValidVehicleYear(value: string, now = new Date()): boolean {
  if (!/^\d{4}$/.test(value.trim())) return false;
  const year = Number.parseInt(value.trim(), 10);
  return year >= VEHICLE_YEAR_MIN && year <= getVehicleYearMax(now);
}

export function sanitizeMakeInput(value: string): string {
  return value.replace(VEHICLE_NAME_DISALLOWED, "").slice(0, MAKE_MAX);
}

export function isValidMake(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && MAKE_PATTERN.test(trimmed);
}

export function sanitizeModelInput(value: string): string {
  return value.replace(VEHICLE_NAME_DISALLOWED, "").slice(0, MODEL_MAX);
}

export function isValidModel(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && MODEL_PATTERN.test(trimmed);
}

export function sanitizeVinOrPlateInput(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9 \-]/g, "")
    .slice(0, VIN_OR_PLATE_MAX);
}

export function isValidVinOrPlate(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < VIN_OR_PLATE_MIN || trimmed.length > VIN_OR_PLATE_MAX) {
    return false;
  }
  return VIN_OR_PLATE_PATTERN.test(trimmed);
}

export function sanitizeDetailsInput(value: string): string {
  return value.replace(CONTROL_CHARS, "").slice(0, DETAILS_MAX);
}

export function sanitizeOtpInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function isValidOtp(value: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(value);
}

export function daysInMonth(month: number): number {
  if (month === 2) return 29;
  if ([4, 6, 9, 11].includes(month)) return 30;
  if (month >= 1 && month <= 12) return 31;
  return 31;
}

export function isValidScheduleDate(month: string, day: string): boolean {
  const parsedMonth = Number(month);
  const parsedDay = Number(day);
  if (
    !Number.isInteger(parsedMonth) ||
    parsedMonth < 1 ||
    parsedMonth > 12 ||
    !Number.isInteger(parsedDay) ||
    parsedDay < 1
  ) {
    return false;
  }
  return parsedDay <= daysInMonth(parsedMonth);
}

export type BookingFormFieldErrors = Partial<{
  name: string;
  zip: string;
  phone: string;
  email: string;
  year: string;
  make: string;
  model: string;
  vin: string;
  details: string;
  smsConsent: string;
  phoneConsent: string;
  month: string;
  day: string;
  time: string;
  verificationCode: string;
}>;

export type BookingFormValues = {
  name: string;
  zip: string;
  phone: string;
  email: string;
  year?: string;
  make?: string;
  model?: string;
  vin?: string;
  details?: string;
  smsConsent?: boolean;
  phoneConsent?: boolean;
  month?: string;
  day?: string;
  time?: string;
  verificationCode?: string;
};

function validateZip(zip: string, required: boolean): string | undefined {
  const trimmed = zip.trim();
  if (!trimmed) {
    return required ? "Enter a 5-digit ZIP code." : undefined;
  }
  if (!isValidZipFormat(trimmed)) {
    return "ZIP code must be 5 digits.";
  }
  if (!isInServiceArea(trimmed)) {
    return "This ZIP code is outside our current service area.";
  }
  return undefined;
}

function validateName(name: string, required: boolean): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) {
    return required ? "Enter your first and last name." : undefined;
  }
  if (!isValidFullName(name)) {
    return "Enter your first and last name using letters only.";
  }
  return undefined;
}

function validatePhone(phone: string, required: boolean): string | undefined {
  if (!phone.trim()) {
    return required ? "Enter a valid 10-digit US phone number." : undefined;
  }
  if (!isValidUsPhone(phone)) {
    return "Enter a valid 10-digit US phone number.";
  }
  return undefined;
}

/** Contact, vehicle, consent, and optional schedule-slot checks for Diagnose forms. */
export function validateBookingFormFields(
  input: BookingFormValues,
  options: {
    requireContact?: boolean;
    requireConsents?: boolean;
    requireScheduleSlot?: boolean;
    requireOtp?: boolean;
  } = {},
): BookingFormFieldErrors {
  const requireContact = options.requireContact ?? true;
  const requireConsents = options.requireConsents ?? false;
  const requireScheduleSlot = options.requireScheduleSlot ?? false;
  const requireOtp = options.requireOtp ?? false;
  const errors: BookingFormFieldErrors = {};

  const nameError = validateName(input.name, requireContact);
  if (nameError) errors.name = nameError;

  const zipError = validateZip(input.zip, requireContact);
  if (zipError) errors.zip = zipError;

  const phoneError = validatePhone(input.phone, requireContact);
  if (phoneError) errors.phone = phoneError;

  if (input.email.trim() && !isValidEmail(input.email)) {
    errors.email = "Enter a valid email address, e.g. john@example.com.";
  }

  const year = input.year?.trim() ?? "";
  if (year && !isValidVehicleYear(year)) {
    errors.year = `Enter a vehicle year from ${VEHICLE_YEAR_MIN} to ${getVehicleYearMax()}.`;
  }

  const make = input.make?.trim() ?? "";
  if (make && !isValidMake(make)) {
    errors.make = "Make can only include letters, numbers, spaces, and hyphens.";
  }

  const model = input.model?.trim() ?? "";
  if (model && !isValidModel(model)) {
    errors.model =
      "Model can only include letters, numbers, spaces, and hyphens.";
  }

  const vin = input.vin?.trim() ?? "";
  if (vin && !isValidVinOrPlate(vin)) {
    errors.vin = `Enter a VIN or license plate (${VIN_OR_PLATE_MIN}–${VIN_OR_PLATE_MAX} letters or numbers).`;
  }

  const details = input.details ?? "";
  if (details.length > DETAILS_MAX) {
    errors.details = `Details must be ${DETAILS_MAX} characters or fewer.`;
  }

  if (requireConsents) {
    if (!input.smsConsent) {
      errors.smsConsent = "Please agree to receive request related SMS texts.";
    }
    if (!input.phoneConsent) {
      errors.phoneConsent =
        "Please acknowledge that providing your phone number creates a Veriium account.";
    }
  }

  if (requireScheduleSlot) {
    if (!input.month || !input.day) {
      errors.day = "Please choose a date.";
    } else if (!isValidScheduleDate(input.month, input.day)) {
      errors.day = "Please choose a valid date.";
    }

    if (!input.time || !isScheduleTimeSlot(input.time)) {
      errors.time = "Please choose a time.";
    } else if (
      input.month &&
      input.day &&
      isValidScheduleDate(input.month, input.day) &&
      !isFutureScheduleSlot(Number(input.month), Number(input.day), input.time)
    ) {
      errors.time = "Please choose a future date and time.";
    }
  }

  if (requireOtp && !isValidOtp(input.verificationCode ?? "")) {
    errors.verificationCode = "Please enter the 6-digit code we sent to your phone.";
  }

  return errors;
}

export function firstBookingFieldError(
  errors: BookingFormFieldErrors,
): string | undefined {
  return Object.values(errors).find(Boolean);
}

const BOOKING_FIELD_MESSAGES: Record<string, string> = {
  name: "Enter your first and last name using letters only.",
  zip: "ZIP code must be 5 digits.",
  phone: "Enter a valid 10-digit US phone number.",
  email: "Enter a valid email address, e.g. john@example.com.",
  additionalDetails: `Details must be ${DETAILS_MAX} characters or fewer.`,
  verificationCode: "Please enter the 6-digit code we sent to your phone.",
  make: "Make can only include letters, numbers, spaces, and hyphens.",
  model: "Model can only include letters, numbers, spaces, and hyphens.",
  vin: `Enter a VIN or license plate (${VIN_OR_PLATE_MIN}–${VIN_OR_PLATE_MAX} letters or numbers).`,
  year: `Enter a vehicle year from ${VEHICLE_YEAR_MIN} to ${getVehicleYearMax()}.`,
  day: "Please choose a valid date.",
  time: "Please choose a future date and time.",
};

export function formatBookingValidationIssues(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): string {
  const messages = issues.map((issue) => {
    const root = String(issue.path[0] ?? "");
    const nested = issue.path[1] != null ? String(issue.path[1]) : "";
    const field = nested && root === "vehicle" ? nested : root;
    if (issue.message && !isTechnicalValidationMessage(issue.message)) {
      return issue.message;
    }
    return (
      BOOKING_FIELD_MESSAGES[field] ??
      "Please check your details and try again."
    );
  });
  return [...new Set(messages)].join("\n");
}
