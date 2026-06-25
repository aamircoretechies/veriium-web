import type { JobStatus } from "@/types/airtable/enums";

export class JobNotPayableError extends Error {
  readonly jobId: string;
  readonly status: JobStatus;

  constructor(jobId: string, status: JobStatus) {
    super(`Job ${jobId} is not payable (status=${status})`);
    this.name = "JobNotPayableError";
    this.jobId = jobId;
    this.status = status;
  }
}

export class PaymentAlreadyCompletedError extends Error {
  readonly jobId: string;

  constructor(jobId: string) {
    super(`Payment setup already completed for job ${jobId}`);
    this.name = "PaymentAlreadyCompletedError";
    this.jobId = jobId;
  }
}

export class DriverNotLinkedError extends Error {
  readonly jobId: string;

  constructor(jobId: string) {
    super(`Job ${jobId} has no linked driver`);
    this.name = "DriverNotLinkedError";
    this.jobId = jobId;
  }
}

export class StripeCustomerMissingError extends Error {
  readonly driverId: string;

  constructor(driverId: string) {
    super(`Driver ${driverId} has no Stripe customer — complete card setup first`);
    this.name = "StripeCustomerMissingError";
    this.driverId = driverId;
  }
}

export class PaymentMethodMissingError extends Error {
  readonly customerId: string;

  constructor(customerId: string) {
    super(`No saved payment method for Stripe customer ${customerId}`);
    this.name = "PaymentMethodMissingError";
    this.customerId = customerId;
  }
}

export class FinalPriceMissingError extends Error {
  readonly jobId: string;

  constructor(jobId: string) {
    super(`Job ${jobId} has no final_price for capture`);
    this.name = "FinalPriceMissingError";
    this.jobId = jobId;
  }
}

export class SetupIntentNotFoundError extends Error {
  readonly setupIntentId: string;

  constructor(setupIntentId: string) {
    super(`No payment record for SetupIntent ${setupIntentId}`);
    this.name = "SetupIntentNotFoundError";
    this.setupIntentId = setupIntentId;
  }
}

export class SetupIntentMetadataError extends Error {
  constructor(message = "SetupIntent is missing jobId metadata") {
    super(message);
    this.name = "SetupIntentMetadataError";
  }
}
