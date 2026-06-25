import type { JobStatus } from "@/types/airtable/enums";

export class InvalidServiceCommandError extends Error {
  readonly command: string;
  readonly jobStatus: JobStatus;

  constructor(command: string, jobStatus: JobStatus) {
    super(`Command ${command} is not valid for job status ${jobStatus}`);
    this.name = "InvalidServiceCommandError";
    this.command = command;
    this.jobStatus = jobStatus;
  }
}

export class WrongServiceTypeError extends Error {
  readonly jobId: string;
  readonly expected: "mobile_repair" | "dropoff";
  readonly command: string;

  constructor(
    jobId: string,
    expected: "mobile_repair" | "dropoff",
    command: string,
  ) {
    super(
      `Command ${command} requires service_type=${expected} for job ${jobId}`,
    );
    this.name = "WrongServiceTypeError";
    this.jobId = jobId;
    this.expected = expected;
    this.command = command;
  }
}

export class QuoteParseError extends Error {
  readonly input: string;

  constructor(input: string) {
    super(
      `Could not parse quote line. Expected: $X PARTS $Y [ON_HAND]. Got: ${input}`,
    );
    this.name = "QuoteParseError";
    this.input = input;
  }
}

export class NoShowNotEligibleError extends Error {
  readonly jobId: string;

  constructor(jobId: string) {
    super(`Job ${jobId} is not eligible for NOSHOW reporting yet`);
    this.name = "NoShowNotEligibleError";
    this.jobId = jobId;
  }
}
