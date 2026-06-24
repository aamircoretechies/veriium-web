export type NhtsaLookupErrorCode = "not_found" | "upstream_error";

export class NhtsaLookupError extends Error {
  readonly code: NhtsaLookupErrorCode;

  constructor(code: NhtsaLookupErrorCode, message: string) {
    super(message);
    this.name = "NhtsaLookupError";
    this.code = code;
  }
}
