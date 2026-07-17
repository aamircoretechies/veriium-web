import type { AirtableClient } from "@/lib/airtable/client";
import { parseQuoteDetails, stringifyQuoteDetails } from "@/lib/jobs/quote-details";
import {
  isQuotePendingAdmin,
  isQuoteSubmitted,
  isRequoteSubmitted,
  JOB_STATUS,
} from "@/lib/jobs/status";
import { ACTION_ITEM_TYPE } from "@/types/airtable/enums";
import type { JobFields } from "@/types/airtable/jobs";
import type { PaymentType } from "@/types/airtable/enums";
import type { AirtableRecord } from "@/types/airtable/common";

export {
  parseQuoteDetails,
  stringifyQuoteDetails,
  JOB_STATUS,
  ACTION_ITEM_TYPE,
};

export const TEST_ZIP = "30043";
export const TEST_CATEGORY = "brakes" as const;

export function jobDetails(fields: JobFields) {
  return parseQuoteDetails(fields.quote_details);
}

export function mechanicSeedFields(
  runId: string,
  suffix: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    approved: true,
    background_check_status: "cleared",
    name: `Test Mech ${runId}-${suffix}`,
    phone_number: `+1555020${suffix.padStart(4, "0")}`,
    profile_photo_url: "https://res.cloudinary.com/veriium-test/mechanic.jpg",
    availability_status: "available",
    service_zip_codes: TEST_ZIP,
    service_categories: [TEST_CATEGORY],
    tools_confirmed: ["Basic tool kit"],
    ...overrides,
  };
}

export function driverSeedFields(
  runId: string,
  suffix: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    phone_number: `+1555010${suffix.padStart(4, "0")}`,
    name: `Test Driver ${runId}-${suffix}`,
    ...overrides,
  };
}

/** Scalar filters only — match linked_job_id in code after listing. */
export function actionItemJobFormula(_jobId: string, type?: string): string {
  const typeFilter = type ? `, {type} = '${type.replace(/'/g, "\\'")}'` : "";
  return `AND({status} = 'open'${typeFilter})`;
}

export function actionItemLinkedToJob(
  record: { fields: { linked_job_id?: string[] } },
  jobId: string,
): boolean {
  return record.fields.linked_job_id?.includes(jobId) ?? false;
}

export async function countPaymentsByJobAndType(
  client: AirtableClient,
  jobId: string,
  type: PaymentType,
): Promise<number> {
  const response = await client.listRecords<{ job_id?: string[] }>("payments", {
    filterByFormula: `{type} = '${type}'`,
    maxRecords: 100,
  });
  return response.records.filter((row) =>
    row.fields.job_id?.includes(jobId),
  ).length;
}

export function assertQuoteSubmitted(
  job: AirtableRecord<JobFields> | JobFields,
): void {
  const fields = "fields" in job ? job.fields : job;
  if (!isQuoteSubmitted(fields)) {
    throw new Error(`Expected quote_provided (submitted), got ${fields.status}`);
  }
}

export function assertQuotePendingAdmin(
  job: AirtableRecord<JobFields> | JobFields,
): void {
  const fields = "fields" in job ? job.fields : job;
  if (!isQuotePendingAdmin(fields)) {
    throw new Error(`Expected quote_provided (pending admin), got ${fields.status}`);
  }
}

export function assertRequoteSubmitted(
  job: AirtableRecord<JobFields> | JobFields,
): void {
  const fields = "fields" in job ? job.fields : job;
  if (!isRequoteSubmitted(fields)) {
    throw new Error(
      `Expected awaiting_customer_approval (requote), got ${fields.status}`,
    );
  }
}
