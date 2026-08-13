import { formatCurrency } from "@/lib/bookings/driver-job-status";
import { formatScheduledTimeForDisplay } from "@/lib/bookings/scheduled-time";
import { getDriverById } from "@/lib/drivers/lookup";
import { getJobById } from "@/lib/jobs/lookup";
import {
  formatActiveCost,
  formatActiveDateValue,
  formatCompletedCost,
  formatCompletedDate,
  formatCustomerDisplayName,
  formatEstimatedCostRange,
  formatJobTitle,
  formatMechanicJobStatusLabel,
} from "@/lib/jobs/mechanic-job-format";
import { classifyMechanicJobListStatus } from "@/lib/jobs/mechanic-dashboard-status";
import { parseQuoteDetails } from "@/lib/jobs/quote-details";
import { isRequoteSubmitted, jobStatusOr } from "@/lib/jobs/status";
import { buildJobSmsContext } from "@/lib/matching/job-context";
import { assertMechanicAssigned } from "@/lib/service/guards";
import type { MechanicJobDetail, MechanicJobView } from "@/types/api/mechanic-job-view";
import type { AirtableRecord } from "@/types/airtable/common";
import type { JobFields } from "@/types/airtable/jobs";

type JobFieldsLike = JobFields | AirtableRecord<JobFields>;

function resolveJobFields(job: JobFieldsLike): JobFields {
  return "fields" in job ? job.fields : job;
}

function amountOrNull(value: number | undefined): number | null {
  return typeof value === "number" ? value : null;
}

function amountLabel(value: number | null): string | null {
  return value === null ? null : (formatCurrency(value) ?? null);
}

export function mapMechanicJobPayoutFields(job: JobFieldsLike): Pick<
  MechanicJobView,
  | "quoteTotal"
  | "quoteTotalLabel"
  | "partsCost"
  | "partsCostLabel"
  | "platformFee"
  | "platformFeeLabel"
  | "mechanicPayout"
  | "mechanicPayoutLabel"
  | "finalPrice"
  | "finalPriceLabel"
  | "requotePending"
  | "requoteReason"
  | "originalPartsCost"
  | "originalPartsCostLabel"
> {
  const fields = resolveJobFields(job);
  const details = parseQuoteDetails(fields.quote_details);
  const quoteTotal = amountOrNull(fields.quote_total);
  const partsCost = amountOrNull(fields.parts_cost);
  const platformFee = amountOrNull(fields.platform_fee);
  const mechanicPayout = amountOrNull(fields.mechanic_payout);
  const finalPrice = amountOrNull(fields.final_price);
  const originalPartsCost = amountOrNull(details.original_parts_cost);

  return {
    quoteTotal,
    quoteTotalLabel: amountLabel(quoteTotal),
    partsCost,
    partsCostLabel: amountLabel(partsCost),
    platformFee,
    platformFeeLabel: amountLabel(platformFee),
    mechanicPayout,
    mechanicPayoutLabel: amountLabel(mechanicPayout),
    finalPrice,
    finalPriceLabel: amountLabel(finalPrice),
    requotePending: isRequoteSubmitted(fields),
    requoteReason: details.requote_reason?.trim() || null,
    originalPartsCost,
    originalPartsCostLabel: amountLabel(originalPartsCost),
  };
}

function buildMechanicJobViewFromRecord(
  job: AirtableRecord<JobFields>,
  driver: MechanicJobView["driver"],
): MechanicJobView {
  const details = parseQuoteDetails(job.fields.quote_details);
  const receiptUrl = job.fields.attachments?.[0]?.url ?? null;
  const scheduledTime = job.fields.scheduled_time;
  const status = jobStatusOr(job.fields.status);
  const scheduling = buildJobSchedulingFields(job);
  const payout = mapMechanicJobPayoutFields(job);

  return {
    jobId: job.id,
    status,
    statusLabel: formatMechanicJobStatusLabel(status, {
      requotePending: payout.requotePending,
    }),
    vehicle: {
      year: job.fields.vehicle_year ?? null,
      make: job.fields.vehicle_make ?? null,
      model: job.fields.vehicle_model ?? null,
    },
    zipCode: scheduling.zipCode,
    serviceType: job.fields.service_type,
    serviceTypeLabel: scheduling.serviceTypeLabel,
    scheduledTime,
    scheduledTimeLabel: scheduling.scheduledTimeLabel,
    issueText: job.fields.issue_text,
    diagnosisSummary: job.fields.diagnosis_summary,
    driver,
    ...payout,
    onHand: job.fields.quote_parts_on_hand ?? false,
    receiptUrl,
    receiptStatus: details.receipt_status ?? null,
    partsReimbursementForfeited:
      details.parts_reimbursement_forfeited ?? false,
  };
}

export function buildJobSchedulingFields(job: AirtableRecord<JobFields>): {
  zipCode: string | null;
  serviceTypeLabel: string | undefined;
  scheduledTimeLabel: string | undefined;
} {
  const smsContext = buildJobSmsContext(job);
  const scheduledTime = job.fields.scheduled_time;
  return {
    zipCode: job.fields.zip_code ?? null,
    serviceTypeLabel: smsContext.serviceTypeLabel,
    scheduledTimeLabel: scheduledTime
      ? formatScheduledTimeForDisplay(scheduledTime)
      : undefined,
  };
}

export async function resolveDriverForJob(
  job: AirtableRecord<JobFields>,
): Promise<MechanicJobView["driver"]> {
  const driverId = job.fields.driver_id?.[0];
  let driver: MechanicJobView["driver"] = {
    zip: job.fields.zip_code ?? undefined,
  };

  if (driverId) {
    const driverRecord = await getDriverById(driverId);
    driver = {
      name: driverRecord.fields.name,
      phone: driverRecord.fields.phone_number,
      zip: job.fields.zip_code ?? driverRecord.fields.zip_code,
    };
  }

  return driver;
}

export class MechanicJobNotOnDashboardError extends Error {
  constructor(readonly jobId: string) {
    super(`Job ${jobId} is not visible on the mechanic dashboard.`);
    this.name = "MechanicJobNotOnDashboardError";
  }
}

export async function getMechanicJobView(
  jobId: string,
  mechanicId: string,
): Promise<MechanicJobView> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);
  const driver = await resolveDriverForJob(job);
  return buildMechanicJobViewFromRecord(job, driver);
}

export async function getMechanicJobDetail(
  jobId: string,
  mechanicId: string,
): Promise<MechanicJobDetail> {
  const job = await getJobById(jobId);
  assertMechanicAssigned(job, mechanicId);

  const status = jobStatusOr(job.fields.status);
  const listStatus = classifyMechanicJobListStatus(status);

  if (!listStatus) {
    throw new MechanicJobNotOnDashboardError(jobId);
  }

  const driver = await resolveDriverForJob(job);
  const view = buildMechanicJobViewFromRecord(job, driver);

  const cost =
    listStatus === "active" ? formatActiveCost(job) : formatCompletedCost(job);

  const dateLabel = listStatus === "active" ? "Requested" : "Completed";
  const dateValue =
    listStatus === "active"
      ? formatActiveDateValue(job)
      : formatCompletedDate(
          job.fields.completed_at ?? job.fields.scheduled_time,
        );

  const customerName = formatCustomerDisplayName(
    driver.name ?? view.driver.name,
  );

  return {
    ...view,
    title: formatJobTitle(job),
    customerName,
    estimatedCostRange: formatEstimatedCostRange(job),
    dateLabel,
    dateValue,
    costLabel: cost.costLabel,
    costValue: cost.costValue,
    listStatus,
  };
}
