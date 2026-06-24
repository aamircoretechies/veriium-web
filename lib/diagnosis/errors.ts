export type InputValidationCode = "R1" | "R2" | "R4";

export const DIAGNOSIS_DETAIL_MESSAGE =
  "Can you give us a bit more detail? Describe what you hear, see, or feel when the problem happens.";

export const DIAGNOSIS_NOT_CAR_MESSAGE =
  "That doesn't sound like a car issue. Please describe a problem with your vehicle.";

export const DIAGNOSIS_SAFETY_MESSAGE =
  "⚠ This may be a safety emergency. Pull over safely and call 911 if you're in immediate danger.";

export class InputValidationError extends Error {
  readonly code: InputValidationCode;

  constructor(code: InputValidationCode, message: string) {
    super(message);
    this.name = "InputValidationError";
    this.code = code;
  }
}

export class AiDiagnosisError extends Error {
  constructor(
    message = "Unable to generate a diagnosis right now. Please try again.",
  ) {
    super(message);
    this.name = "AiDiagnosisError";
  }
}
