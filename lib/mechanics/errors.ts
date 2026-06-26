/** Thrown when a ZIP is rejected by product rules (e.g. non-pilot allowlist). */
export class InvalidZipError extends Error {
  constructor(message = "Invalid ZIP code.") {
    super(message);
    this.name = "InvalidZipError";
  }
}
