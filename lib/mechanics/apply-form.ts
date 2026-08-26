export const FULL_NAME_MAX = 80;
export const PHONE_DIGITS_MAX = 10;
export const EMAIL_MAX = 254;
export const YEARS_EXPERIENCE_MAX = 50;
export const BIO_MAX = 250;
export const LANGUAGES_MAX = 100;
export const OTHER_CERTS_MAX = 200;

/** Letters, spaces, hyphens, apostrophes, and periods (e.g. O'Brien, Mary-Jane, Jr.). */
export const FULL_NAME_PATTERN = /^[\p{L}][\p{L}\s'.’\-]{0,79}$/u;
export const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
export const LANGUAGES_PATTERN = /^[\p{L},\-\s]*$/u;
export const OTHER_CERTS_PATTERN = /^[\p{L}\p{N},.\-\/()&+\s]*$/u;

const NAME_DISALLOWED = /[^\p{L}\s'.’\-]/gu;
const LANGUAGES_DISALLOWED = /[^\p{L},\-\s]/gu;
const OTHER_CERTS_DISALLOWED = /[^\p{L}\p{N},.\-\/()&+\s]/gu;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

export function sanitizeNameInput(value: string): string {
  return value.replace(NAME_DISALLOWED, "").slice(0, FULL_NAME_MAX);
}

export function isValidFullName(value: string): boolean {
  const trimmed = value.trim();
  if (!FULL_NAME_PATTERN.test(trimmed)) return false;
  return trimmed.split(/\s+/).filter(Boolean).length >= 2;
}

export function formatPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, PHONE_DIGITS_MAX);

  if (digits.length === 0) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function sanitizeEmailInput(value: string): string {
  let cleaned = value
    .replace(/\s/g, "")
    .replace(/[^A-Za-z0-9.@_%+\-]/g, "")
    .slice(0, EMAIL_MAX);
  const at = cleaned.indexOf("@");
  if (at !== -1) {
    cleaned = cleaned.slice(0, at + 1) + cleaned.slice(at + 1).replace(/@/g, "");
  }
  return cleaned;
}

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > EMAIL_MAX) return false;
  return EMAIL_PATTERN.test(trimmed);
}

export function sanitizeYearsInput(value: string): string {
  const integerPart = value.match(/\d+/);
  if (!integerPart) return "";
  const parsed = Number.parseInt(integerPart[0].slice(0, 2), 10);
  if (Number.isNaN(parsed)) return "";
  return String(Math.min(parsed, YEARS_EXPERIENCE_MAX));
}

export function isValidYearsExperience(value: string): boolean {
  if (!/^\d{1,2}$/.test(value)) return false;
  const parsed = Number.parseInt(value, 10);
  return parsed >= 0 && parsed <= YEARS_EXPERIENCE_MAX;
}

export function sanitizeBioInput(value: string): string {
  return value.replace(CONTROL_CHARS, "").slice(0, BIO_MAX);
}

export function sanitizeLanguagesInput(value: string): string {
  return value.replace(LANGUAGES_DISALLOWED, "").slice(0, LANGUAGES_MAX);
}

export function isValidLanguages(value: string): boolean {
  return LANGUAGES_PATTERN.test(value) && value.length <= LANGUAGES_MAX;
}

export function sanitizeOtherCertsInput(value: string): string {
  return value.replace(OTHER_CERTS_DISALLOWED, "").slice(0, OTHER_CERTS_MAX);
}

export function isValidOtherCerts(value: string): boolean {
  return OTHER_CERTS_PATTERN.test(value) && value.length <= OTHER_CERTS_MAX;
}

export type ApplyFormFieldErrors = Partial<{
  fullName: string;
  phone: string;
  email: string;
  yearsExp: string;
  bio: string;
  languages: string;
  otherCerts: string;
}>;

export function validateApplyTextFields(input: {
  fullName: string;
  phoneValid: boolean;
  email: string;
  yearsExp: string;
  bio: string;
  languages: string;
  otherCerts: string;
}): ApplyFormFieldErrors {
  const errors: ApplyFormFieldErrors = {};

  if (!isValidFullName(input.fullName)) {
    errors.fullName =
      "Enter your first and last name using letters only.";
  }

  if (!input.phoneValid) {
    errors.phone = "Enter a valid 10-digit US phone number.";
  }

  if (!isValidEmail(input.email)) {
    errors.email = "Enter a valid email address, e.g. john@example.com.";
  }

  if (!isValidYearsExperience(input.yearsExp)) {
    errors.yearsExp = `Enter whole years of experience from 0 to ${YEARS_EXPERIENCE_MAX}.`;
  }

  const bio = input.bio.trim();
  if (!bio) {
    errors.bio = "Tell drivers about your experience and expertise.";
  } else if (bio.length > BIO_MAX) {
    errors.bio = `About Me must be ${BIO_MAX} characters or fewer.`;
  }

  if (input.languages.trim() && !isValidLanguages(input.languages)) {
    errors.languages =
      "Languages can only include letters, spaces, commas, and hyphens.";
  }

  if (input.otherCerts.trim() && !isValidOtherCerts(input.otherCerts)) {
    errors.otherCerts =
      "Certifications can only include letters, numbers, and common punctuation.";
  }

  return errors;
}

const APPLY_FIELD_MESSAGES: Record<string, string> = {
  fullName: "Enter your first and last name using letters only.",
  phone: "Enter a valid 10-digit US phone number.",
  email: "Enter a valid email address, e.g. john@example.com.",
  bio: `About Me must be ${BIO_MAX} characters or fewer.`,
  languages: "Languages can only include letters, spaces, commas, and hyphens.",
  yearsExperience: `Enter whole years of experience from 0 to ${YEARS_EXPERIENCE_MAX}.`,
  otherCertifications:
    "Certifications can only include letters, numbers, and common punctuation.",
  primaryZip: "Select at least one service area ZIP code.",
  shopAddress: "Enter a shop address for drop-off availability.",
};

export function isTechnicalValidationMessage(message: string): boolean {
  const trimmed = message.trim();
  return (
    /^(Too big|Too small|Invalid (input|type|string|number|enum|value)|expected )/i.test(
      trimmed,
    ) ||
    /9007199254740991|MAX_SAFE_INTEGER|→ at\s+\w+/.test(trimmed)
  );
}

export function formatApplyValidationIssues(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): string {
  const messages = issues.map((issue) => {
    const field = String(issue.path[0] ?? "");
    if (issue.message && !isTechnicalValidationMessage(issue.message)) {
      return issue.message;
    }
    return (
      APPLY_FIELD_MESSAGES[field] ??
      "Please check your application details and try again."
    );
  });
  return [...new Set(messages)].join("\n");
}

export function sanitizePublicValidationMessage(message: string): string {
  if (!message.trim()) {
    return "Please check your application details and try again.";
  }
  if (!isTechnicalValidationMessage(message) && !/→ at\s+\w+/.test(message)) {
    return message;
  }

  const mapped = new Set<string>();
  const fieldMatches = message.matchAll(/at\s+(\w+)/gi);
  for (const match of fieldMatches) {
    const field = match[1];
    if (field && APPLY_FIELD_MESSAGES[field]) {
      mapped.add(APPLY_FIELD_MESSAGES[field]);
    }
  }

  if (mapped.size > 0) {
    return [...mapped].join("\n");
  }

  return "Please check your application details and try again.";
}
