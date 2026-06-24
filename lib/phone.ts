const US_E164_PATTERN = /^\+1\d{10}$/;
const US_DIGITS_PATTERN = /^\d{10}$/;

export class InvalidPhoneError extends Error {
  constructor(message = "Invalid US phone number.") {
    super(message);
    this.name = "InvalidPhoneError";
  }
}

/** Strip formatting characters, keeping digits and a leading `+`. */
export function stripPhoneInput(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }
  return trimmed.replace(/\D/g, "");
}

/**
 * Normalize US phone input to E.164 (`+1` + 10 digits).
 * Accepts `(555) 123-4567`, `5551234567`, `15551234567`, or `+15551234567`.
 */
export function normalizeUsPhone(input: string): string {
  const stripped = stripPhoneInput(input);

  if (US_E164_PATTERN.test(stripped)) {
    return stripped;
  }

  let digits = stripped;
  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  if (!US_DIGITS_PATTERN.test(digits)) {
    throw new InvalidPhoneError();
  }

  return `+1${digits}`;
}

/** Returns true when `input` can be normalized to a US E.164 number. */
export function isValidUsPhone(input: string): boolean {
  try {
    normalizeUsPhone(input);
    return true;
  } catch {
    return false;
  }
}
