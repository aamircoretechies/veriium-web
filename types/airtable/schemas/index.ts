import { z } from "zod";

import {
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_TYPES,
  AVAILABILITY_STATUSES,
  DIAGNOSIS_CATEGORIES,
  DIAGNOSIS_CONFIDENCE_VALUES,
  DRIVEABILITY_VALUES,
  FIX_NOW_VS_WAIT_VALUES,
  JOB_STATUSES,
  MECHANIC_STATUSES,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  RECEIPT_STATUSES,
  SERVICE_TYPES,
} from "../enums";

export const mechanicStatusSchema = z.enum(MECHANIC_STATUSES);
export const availabilityStatusSchema = z.enum(AVAILABILITY_STATUSES);
export const jobStatusSchema = z.enum(JOB_STATUSES);
export const diagnosisCategorySchema = z.enum(DIAGNOSIS_CATEGORIES);
export const driveabilitySchema = z.enum(DRIVEABILITY_VALUES);
export const fixNowVsWaitSchema = z.enum(FIX_NOW_VS_WAIT_VALUES);
export const diagnosisConfidenceSchema = z.enum(DIAGNOSIS_CONFIDENCE_VALUES);
export const serviceTypeSchema = z.enum(SERVICE_TYPES);
export const paymentTypeSchema = z.enum(PAYMENT_TYPES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const actionItemTypeSchema = z.enum(ACTION_ITEM_TYPES);
export const actionItemStatusSchema = z.enum(ACTION_ITEM_STATUSES);
export const receiptStatusSchema = z.enum(RECEIPT_STATUSES);

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
  phone: z.string().min(1),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  stripe_customer_id: z.string().min(1).optional(),
});

export const updateDriverSchema = createDriverSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field is required" },
);

export const createMechanicSchema = z.object({
  status: mechanicStatusSchema.default("application_submitted"),
  full_name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  bio: z.string().max(250).optional(),
  languages: z.string().optional(),
  years_experience: z.number().int().nonnegative().optional(),
  ase_certified: z.boolean().optional(),
  other_certifications: z.string().optional(),
  service_zip_codes: z.array(z.string().min(1)).optional(),
  service_categories: z.array(diagnosisCategorySchema).optional(),
  tools_confirmed: z.boolean().optional(),
  transport_confirmed: z.boolean().optional(),
  mobile_repairs_confirmed: z.boolean().optional(),
  mobile_available: z.boolean().optional(),
  shop_available: z.boolean().optional(),
  shop_address: z.string().optional(),
  service_radius: z.number().nonnegative().optional(),
});

export const updateMechanicSchema = z
  .object({
    status: mechanicStatusSchema.optional(),
    availability_status: availabilityStatusSchema.optional(),
    availability_updated_at: z.string().datetime().optional(),
    setup_wizard_completed_at: z.string().datetime().optional(),
    approved_at: z.string().datetime().optional(),
    under_review_at: z.string().datetime().optional(),
    rejected_at: z.string().datetime().optional(),
    suspended_at: z.string().datetime().optional(),
    review_notes: z.string().optional(),
    last_assigned_at: z.string().datetime().optional(),
    full_name: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    email: z.string().email().optional(),
    bio: z.string().max(250).optional(),
    languages: z.string().optional(),
    years_experience: z.number().int().nonnegative().optional(),
    ase_certified: z.boolean().optional(),
    other_certifications: z.string().optional(),
    service_zip_codes: z.array(z.string().min(1)).optional(),
    service_categories: z.array(diagnosisCategorySchema).optional(),
    tools_confirmed: z.boolean().optional(),
    transport_confirmed: z.boolean().optional(),
    mobile_repairs_confirmed: z.boolean().optional(),
    mobile_available: z.boolean().optional(),
    shop_available: z.boolean().optional(),
    shop_address: z.string().optional(),
    service_radius: z.number().nonnegative().optional(),
    jobs: airtableLinkedRecordsSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const createJobSchema = z.object({
  status: jobStatusSchema.default("draft"),
  driver: airtableLinkedRecordsSchema.optional(),
  diagnosis: airtableLinkedRecordsSchema.optional(),
  zip_code: z.string().min(1).optional(),
  diagnosis_category: diagnosisCategorySchema.optional(),
  service_type: serviceTypeSchema.optional(),
  appointment_window_start: z.string().datetime().optional(),
  safety_flag: z.boolean().optional(),
  vehicle_year: z.number().int().positive().optional(),
  vehicle_make: z.string().min(1).optional(),
  vehicle_model: z.string().min(1).optional(),
  vin: z.string().min(1).optional(),
  additional_details: z.string().optional(),
});

export const updateJobSchema = z
  .object({
    status: jobStatusSchema.optional(),
    mechanic: airtableLinkedRecordsSchema.optional(),
    diagnosis: airtableLinkedRecordsSchema.optional(),
    zip_code: z.string().min(1).optional(),
    diagnosis_category: diagnosisCategorySchema.optional(),
    service_type: serviceTypeSchema.optional(),
    appointment_window_start: z.string().datetime().optional(),
    safety_flag: z.boolean().optional(),
    vehicle_year: z.number().int().positive().optional(),
    vehicle_make: z.string().min(1).optional(),
    vehicle_model: z.string().min(1).optional(),
    vin: z.string().min(1).optional(),
    additional_details: z.string().optional(),
    quote_amount: z.number().nonnegative().optional(),
    parts_cost: z.number().nonnegative().optional(),
    final_price: z.number().nonnegative().optional(),
    mechanic_payout: z.number().nonnegative().optional(),
    platform_fee: z.number().nonnegative().optional(),
    on_hand: z.boolean().optional(),
    receipt_url: z.string().url().optional(),
    receipt_status: receiptStatusSchema.optional(),
    receipt_submitted_at: z.string().datetime().optional(),
    parts_reimbursement_forfeited: z.boolean().optional(),
    cancellation_policy_accepted_at: z.string().datetime().optional(),
    payment_setup_at: z.string().datetime().optional(),
    matched_at: z.string().datetime().optional(),
    accepted_at: z.string().datetime().optional(),
    en_route_at: z.string().datetime().optional(),
    arrived_at: z.string().datetime().optional(),
    vehicle_received_at: z.string().datetime().optional(),
    diagnosing_at: z.string().datetime().optional(),
    quote_submitted_at: z.string().datetime().optional(),
    quote_approved_at: z.string().datetime().optional(),
    quote_declined_at: z.string().datetime().optional(),
    in_progress_at: z.string().datetime().optional(),
    completed_at: z.string().datetime().optional(),
    confirmed_at: z.string().datetime().optional(),
    disputed_at: z.string().datetime().optional(),
    cancelled_at: z.string().datetime().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const createDiagnosisSchema = z.object({
  driver_input: z.string().min(1),
  raw_response: z.string().optional(),
  summary: z.string().optional(),
  category: diagnosisCategorySchema.optional(),
  driveability: driveabilitySchema.optional(),
  fix_now_vs_wait: fixNowVsWaitSchema.optional(),
  cost_estimate_low: z.number().int().nonnegative().optional(),
  cost_estimate_high: z.number().int().nonnegative().optional(),
  confidence: diagnosisConfidenceSchema.optional(),
  safety_flag: z.boolean().optional(),
  driver: airtableLinkedRecordsSchema.optional(),
  job: airtableLinkedRecordsSchema.optional(),
});

export const updateDiagnosisSchema = createDiagnosisSchema
  .omit({ driver_input: true })
  .partial()
  .extend({ driver_input: z.string().min(1).optional() })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const createPaymentSchema = z.object({
  type: paymentTypeSchema,
  amount: z.number().nonnegative(),
  status: paymentStatusSchema.default("pending"),
  idempotency_key: z.string().min(1),
  stripe_customer_id: z.string().min(1).optional(),
  stripe_setup_intent_id: z.string().min(1).optional(),
  stripe_payment_intent_id: z.string().min(1).optional(),
  stripe_charge_id: z.string().min(1).optional(),
  job: airtableLinkedRecordsSchema.optional(),
  driver: airtableLinkedRecordsSchema.optional(),
});

export const updatePaymentSchema = z
  .object({
    status: paymentStatusSchema.optional(),
    amount: z.number().nonnegative().optional(),
    stripe_customer_id: z.string().min(1).optional(),
    stripe_setup_intent_id: z.string().min(1).optional(),
    stripe_payment_intent_id: z.string().min(1).optional(),
    stripe_charge_id: z.string().min(1).optional(),
    captured_at: z.string().datetime().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const createActionItemSchema = z.object({
  type: actionItemTypeSchema,
  status: actionItemStatusSchema.default("open"),
  title: z.string().min(1).optional(),
  notes: z.string().optional(),
  job: airtableLinkedRecordsSchema.optional(),
  mechanic: airtableLinkedRecordsSchema.optional(),
  driver: airtableLinkedRecordsSchema.optional(),
});

export const updateActionItemSchema = z
  .object({
    status: actionItemStatusSchema.optional(),
    title: z.string().min(1).optional(),
    notes: z.string().optional(),
    resolved_at: z.string().datetime().optional(),
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
