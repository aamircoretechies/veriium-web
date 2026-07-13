export class OutOfServiceAreaError extends Error {
  constructor(
    message = "This ZIP code is outside our current service area.",
  ) {
    super(message);
    this.name = "OutOfServiceAreaError";
  }
}

export class DiagnosisNotFoundError extends Error {
  constructor(message = "Diagnosis not found.") {
    super(message);
    this.name = "DiagnosisNotFoundError";
  }
}

export class InvalidVehicleError extends Error {
  constructor(message = "Invalid vehicle information.") {
    super(message);
    this.name = "InvalidVehicleError";
  }
}
