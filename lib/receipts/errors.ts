export class ReceiptAlreadySubmittedError extends Error {
  readonly jobId: string;

  constructor(jobId: string) {
    super(`Receipt already submitted for job ${jobId}.`);
    this.name = "ReceiptAlreadySubmittedError";
    this.jobId = jobId;
  }
}

export class ReceiptNotEligibleError extends Error {
  readonly jobId: string;
  readonly reason: string;

  constructor(jobId: string, reason: string) {
    super(`Receipt not eligible for job ${jobId}: ${reason}`);
    this.name = "ReceiptNotEligibleError";
    this.jobId = jobId;
    this.reason = reason;
  }
}
