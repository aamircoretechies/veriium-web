import { z } from "zod";

import {
  ACTION_ITEMS_STATUS,
  ACTION_ITEMS_TYPE,
  JOBS_STATUS,
  MECHANICS_AVAILABILITY_STATUS,
  MECHANICS_BACKGROUND_CHECK_STATUS,
  MECHANICS_CERTIFIED_STATUS,
  MECHANICS_LANGUAGES,
  PAYMENTS_STATUS,
  PAYMENTS_TYPE,
  SERVICE_CATEGORIES_CANONICAL,
} from "../generated/enums";
import {
  DIAGNOSIS_CATEGORIES,
  DIAGNOSIS_CONFIDENCE_VALUES,
  DRIVEABILITY_VALUES,
  FIX_NOW_VS_WAIT_VALUES,
  MECHANIC_STATUSES,
  RECEIPT_STATUSES,
  SERVICE_TYPES,
} from "../enums";

export const availabilityStatusSchema = z.enum(MECHANICS_AVAILABILITY_STATUS);
export const backgroundCheckStatusSchema = z.enum(
  MECHANICS_BACKGROUND_CHECK_STATUS,
);
export const certifiedStatusSchema = z.enum(MECHANICS_CERTIFIED_STATUS);
export const mechanicLanguageSchema = z.enum(MECHANICS_LANGUAGES);
export const jobStatusSchema = z.enum(JOBS_STATUS);
export const diagnosisCategorySchema = z.enum(DIAGNOSIS_CATEGORIES);
export const driveabilitySchema = z.enum(DRIVEABILITY_VALUES);
export const fixNowVsWaitSchema = z.enum(FIX_NOW_VS_WAIT_VALUES);
export const diagnosisConfidenceSchema = z.enum(DIAGNOSIS_CONFIDENCE_VALUES);
export const serviceTypeSchema = z.enum(SERVICE_TYPES);
export const paymentTypeSchema = z.enum(PAYMENTS_TYPE);
export const paymentStatusSchema = z.enum(PAYMENTS_STATUS);
export const actionItemTypeSchema = z.enum(ACTION_ITEMS_TYPE);
export const actionItemStatusSchema = z.enum(ACTION_ITEMS_STATUS);
export const receiptStatusSchema = z.enum(RECEIPT_STATUSES);
export const serviceCategoryCanonicalSchema = z.enum(
  SERVICE_CATEGORIES_CANONICAL,
);

/** @deprecated Kept for backwards-compatible webhook validation. */
export const mechanicStatusSchema = z.enum(MECHANIC_STATUSES);

export const airtableLinkedRecordsSchema = z.array(z.string().min(1));

export const parsedDiagnosisSchema = z.object({
  summary: z.string().min(1),
  category: diagnosisCategorySchema,
  driveability: driveabilitySchema,
  fix_now_vs_wait: fixNowVsWaitSchema,
  cost_estimate_low: z.number().int().nonnegative(),
  cost_estimate_high: z.number().int().nonnegative(),
  confidence: diagnosisConfidenceSchema,
});

export const createDriverSchema = z.object({
  phone_number: z.string().min(1),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  stripe_customer_id: z.string().min(1).optional(),
});

export const updateDriverSchema = createDriverSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required" },
);

export const createMechanicSchema = z.object({
  name: z.string().min(1),
  phone_number: z.string().min(1),
  email: z.string().email().optional(),
  bio: z.string().max(250).optional(),
  languages: z.array(mechanicLanguageSchema).optional(),
  certifications: z.string().optional(),
  certified_status: certifiedStatusSchema.optional(),
  service_zip_codes: z.string().optional(),
  service_categories: z.array(serviceCategoryCanonicalSchema).optional(),
  tools_confirmed: z.array(z.string().min(1)).optional(),
  shop_address: z.string().optional(),
  profile_photo_url: z.string().url().optional(),
  approved: z.boolean().optional(),
  background_check_status: backgroundCheckStatusSchema.optional(),
});

export const updateMechanicSchema = z
  .object({
    availability_status: availabilityStatusSchema.optional(),
    availability_updated_at: z.string().datetime().optional(),
    background_check_completed_at: z.string().datetime().optional(),
    background_check_status: backgroundCheckStatusSchema.optional(),
    approved: z.boolean().optional(),
    approved_at: z.string().datetime().optional(),
    last_assigned_at: z.string().datetime().optional(),
    name: z.string().min(1).optional(),
    phone_number: z.string().min(1).optional(),
    email: z.string().email().optional(),
    bio: z.string().max(250).optional(),
    languages: z.array(mechanicLanguageSchema).optional(),
    certifications: z.string().optional(),
    certified_status: certifiedStatusSchema.optional(),
    service_zip_codes: z.string().optional(),
    service_categories: z.array(serviceCategoryCanonicalSchema).optional(),
    tools_confirmed: z.array(z.string().min(1)).optional(),
    shop_address: z.string().optional(),
    profile_photo_url: z.string().url().optional(),
    Jobs: airtableLinkedRecordsSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const createJobSchema = z.object({
  status: jobStatusSchema.default("draft"),
  driver_id: airtableLinkedRecordsSchema.optional(),
  diagnosis_id: airtableLinkedRecordsSchema.optional(),
  zip_code: z.string().min(1).optional(),
  diagnosis_category: diagnosisCategorySchema.optional(),
  service_type: serviceTypeSchema.optional(),
  scheduled_time: z.string().datetime().optional(),
  safety_flag: z.boolean().optional(),
  vehicle_year: z.number().int().positive().optional(),
  vehicle_make: z.string().min(1).optional(),
  vehicle_model: z.string().min(1).optional(),
  vin: z.string().min(1).optional(),
  issue_text: z.string().optional(),
});

export const updateJobSchema = z
  .object({
    status: jobStatusSchema.optional(),
    mechanic_id: airtableLinkedRecordsSchema.optional(),
    diagnosis_id: airtableLinkedRecordsSchema.optional(),
    zip_code: z.string().min(1).optional(),
    diagnosis_category: diagnosisCategorySchema.optional(),
    service_type: serviceTypeSchema.optional(),
    scheduled_time: z.string().datetime().optional(),
    safety_flag: z.boolean().optional(),
    vehicle_year: z.number().int().positive().optional(),
    vehicle_make: z.string().min(1).optional(),
    vehicle_model: z.string().min(1).optional(),
    vin: z.string().min(1).optional(),
    issue_text: z.string().optional(),
    match_tier: z.number().int().positive().optional(),
    match_tier_started_at: z.string().datetime().optional(),
    quote_total: z.number().nonnegative().optional(),
    quote_parts: z.number().nonnegative().optional(),
    quote_parts_on_hand: z.boolean().optional(),
    quote_details: z.string().optional(),
    parts_cost_flagged: z.boolean().optional(),
    parts_cost: z.number().nonnegative().optional(),
    final_price: z.number().nonnegative().optional(),
    mechanic_payout: z.number().nonnegative().optional(),
    platform_fee: z.number().nonnegative().optional(),
    policy_disclosed_at: z.string().datetime().optional(),
    attachments: z
      .array(
        z.object({
          id: z.string().optional(),
          url: z.string().url(),
        }),
      )
      .optional(),
    completed_at: z.string().datetime().optional(),
    cancelled_at: z.string().datetime().optional(),
    escalated_at: z.string().datetime().optional(),
    no_show_marked_at: z.string().datetime().optional(),
    admin_resolved_at: z.string().datetime().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

const validationRuleTriggeredSchema = z.enum(["none", "R1", "R2", "R3", "R4"]);

export const createDiagnosisSchema = z.object({
  input_text: z.string().min(1),
  input_length: z.number().int().nonnegative().optional(),
  validation_rule_triggered: validationRuleTriggeredSchema.optional(),
  ai_called: z.boolean().optional(),
  ai_latency_ms: z.number().int().nonnegative().optional(),
  ai_response_raw: z.string().optional(),
  ai_response_summary: z.string().optional(),
  ai_response_category: diagnosisCategorySchema.optional(),
  ai_response_driveability: driveabilitySchema.optional(),
  ai_response_cost_estimate: z.string().optional(),
  ai_response_confidence: diagnosisConfidenceSchema.optional(),
  driver_id: airtableLinkedRecordsSchema.optional(),
  job_id: airtableLinkedRecordsSchema.optional(),
});

export const updateDiagnosisSchema = createDiagnosisSchema
  .omit({ input_text: true })
  .partial()
  .extend({ input_text: z.string().min(1).optional() })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const createPaymentSchema = z.object({
  type: paymentTypeSchema,
  amount: z.number().nonnegative(),
  status: paymentStatusSchema.default("requires_payment_method"),
  stripe_setup_intent_id: z.string().min(1).optional(),
  stripe_payment_intent_id: z.string().min(1).optional(),
  job_id: airtableLinkedRecordsSchema.optional(),
  webhook_event_id: z.string().min(1).optional(),
});

export const updatePaymentSchema = z
  .object({
    status: paymentStatusSchema.optional(),
    amount: z.number().nonnegative().optional(),
    stripe_setup_intent_id: z.string().min(1).optional(),
    stripe_payment_intent_id: z.string().min(1).optional(),
    captured_at: z.string().datetime().optional(),
    failed_at: z.string().datetime().optional(),
    failure_reason: z.string().optional(),
    webhook_event_id: z.string().min(1).optional(),
    raw_event: z.string().optional(),
    amount_captured: z.number().nonnegative().optional(),
    amount_refunded: z.number().nonnegative().optional(),
    refunded_at: z.string().datetime().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const createActionItemSchema = z.object({
  type: actionItemTypeSchema,
  status: actionItemStatusSchema.default("open"),
  description: z.string().min(1).optional(),
  linked_job_id: airtableLinkedRecordsSchema.optional(),
  linked_mechanic_id: airtableLinkedRecordsSchema.optional(),
  linked_driver_id: airtableLinkedRecordsSchema.optional(),
});

export const updateActionItemSchema = z
  .object({
    status: actionItemStatusSchema.optional(),
    description: z.string().min(1).optional(),
    resolved_at: z.string().datetime().optional(),
    resolution_notes: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type CreateMechanicInput = z.infer<typeof createMechanicSchema>;
export type UpdateMechanicInput = z.infer<typeof updateMechanicSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type CreateDiagnosisInput = z.infer<typeof createDiagnosisSchema>;
export type UpdateDiagnosisInput = z.infer<typeof updateDiagnosisSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type CreateActionItemInput = z.infer<typeof createActionItemSchema>;
export type UpdateActionItemInput = z.infer<typeof updateActionItemSchema>;
