import { z } from "zod";

import { mechanicJobViewDriverSchema } from "@/types/api/mechanic-job-view";
import { jobStatusSchema } from "@/types/airtable/schemas";

export const mechanicJobListStatusSchema = z.enum(["active", "completed"]);

export const mechanicJobListItemSchema = z.object({
  jobId: z.string().min(1),
  listStatus: mechanicJobListStatusSchema,
  status: jobStatusSchema,
  statusLabel: z.string(),
  title: z.string(),
  customerName: z.string(),
  vehicleLabel: z.string(),
  dateLabel: z.string(),
  dateValue: z.string(),
  costLabel: z.string(),
  costValue: z.string(),
  driver: mechanicJobViewDriverSchema,
  zipCode: z.string().nullable(),
  serviceTypeLabel: z.string().optional(),
  scheduledTimeLabel: z.string().optional(),
  mechanicPayout: z.number().nonnegative().optional(),
  mechanicPayoutLabel: z.string().optional(),
});

export const mechanicJobsEarningsSchema = z.object({
  totalPayout: z.number(),
  formattedTotal: z.string(),
  completedJobCount: z.number().int().nonnegative(),
});

export const mechanicJobsResponseSchema = z.object({
  active: z.array(mechanicJobListItemSchema),
  completed: z.array(mechanicJobListItemSchema),
  earnings: mechanicJobsEarningsSchema,
});

export type MechanicJobListStatus = z.infer<typeof mechanicJobListStatusSchema>;
export type MechanicJobListItem = z.infer<typeof mechanicJobListItemSchema>;
export type MechanicJobsEarnings = z.infer<typeof mechanicJobsEarningsSchema>;
export type MechanicJobsResponse = z.infer<typeof mechanicJobsResponseSchema>;
