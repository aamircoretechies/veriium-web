import { z } from "zod";

import { jobStatusSchema, serviceTypeSchema } from "@/types/airtable/schemas";

export const mechanicJobListStatusSchema = z.enum(["active", "completed"]);

export const mechanicJobViewDriverSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  zip: z.string().optional(),
});

export const mechanicJobViewVehicleSchema = z.object({
  year: z.number().int().positive().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
});

export const mechanicJobViewSchema = z.object({
  jobId: z.string().min(1),
  status: jobStatusSchema,
  statusLabel: z.string(),
  vehicle: mechanicJobViewVehicleSchema,
  zipCode: z.string().nullable(),
  serviceType: serviceTypeSchema.optional(),
  serviceTypeLabel: z.string().optional(),
  scheduledTime: z.string().datetime().optional(),
  scheduledTimeLabel: z.string().optional(),
  issueText: z.string().optional(),
  diagnosisSummary: z.string().optional(),
  driver: mechanicJobViewDriverSchema,
  quoteTotal: z.number().nullable(),
  quoteTotalLabel: z.string().nullable(),
  partsCost: z.number().nullable(),
  partsCostLabel: z.string().nullable(),
  platformFee: z.number().nullable(),
  platformFeeLabel: z.string().nullable(),
  mechanicPayout: z.number().nullable(),
  mechanicPayoutLabel: z.string().nullable(),
  finalPrice: z.number().nullable(),
  finalPriceLabel: z.string().nullable(),
  requotePending: z.boolean(),
  requoteReason: z.string().nullable(),
  originalPartsCost: z.number().nullable(),
  originalPartsCostLabel: z.string().nullable(),
  onHand: z.boolean(),
  receiptUrl: z.string().url().nullable(),
  receiptStatus: z.string().nullable(),
  partsReimbursementForfeited: z.boolean(),
});

export type MechanicJobListStatus = z.infer<typeof mechanicJobListStatusSchema>;
export type MechanicJobView = z.infer<typeof mechanicJobViewSchema>;

export const mechanicJobDetailSchema = mechanicJobViewSchema.extend({
  title: z.string(),
  customerName: z.string(),
  estimatedCostRange: z.string().optional(),
  dateLabel: z.string(),
  dateValue: z.string(),
  costLabel: z.string(),
  costValue: z.string(),
  listStatus: mechanicJobListStatusSchema,
});

export const mechanicJobDetailResponseSchema = z.object({
  job: mechanicJobDetailSchema,
});

export type MechanicJobDetail = z.infer<typeof mechanicJobDetailSchema>;
export type MechanicJobDetailResponse = z.infer<
  typeof mechanicJobDetailResponseSchema
>;
