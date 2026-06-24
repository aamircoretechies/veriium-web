import type { JobStatus } from "@/types/airtable/enums";

export class NoMechanicAvailableError extends Error {
  readonly tier: 1 | 2 | 3;

  constructor(tier: 1 | 2 | 3) {
    super(`No eligible mechanics available for matching tier ${tier}`);
    this.name = "NoMechanicAvailableError";
    this.tier = tier;
  }
}

export class JobNotMatchableError extends Error {
  readonly jobId: string;
  readonly status: JobStatus;
  readonly reason?: string;

  constructor(jobId: string, status: JobStatus, reason?: string) {
    const detail = reason ? `: ${reason}` : "";
    super(`Job ${jobId} is not matchable (status=${status})${detail}`);
    this.name = "JobNotMatchableError";
    this.jobId = jobId;
    this.status = status;
    this.reason = reason;
  }
}

export class AlreadyAssignedError extends Error {
  readonly jobId: string;

  constructor(jobId: string) {
    super(`Job ${jobId} is already assigned to a mechanic`);
    this.name = "AlreadyAssignedError";
    this.jobId = jobId;
  }
}

export class MechanicNotAssignedError extends Error {
  readonly jobId: string;
  readonly mechanicId: string;

  constructor(jobId: string, mechanicId: string) {
    super(
      `Mechanic ${mechanicId} is not the assigned mechanic for job ${jobId}`,
    );
    this.name = "MechanicNotAssignedError";
    this.jobId = jobId;
    this.mechanicId = mechanicId;
  }
}

export class InvalidMatchResponseError extends Error {
  readonly command: string;
  readonly jobStatus: JobStatus;

  constructor(command: string, jobStatus: JobStatus) {
    super(`Command ${command} is not valid for job status ${jobStatus}`);
    this.name = "InvalidMatchResponseError";
    this.command = command;
    this.jobStatus = jobStatus;
  }
}
