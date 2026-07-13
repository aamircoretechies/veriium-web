export type {
  AirtableCreateResponse,
  AirtableErrorBody,
  AirtableListResponse,
  AirtableRecord,
  AirtableUpdateResponse,
} from "./common";

export type {
  AirtableAttachment,
  AirtableDateTime,
  AirtableLinkedRecords,
} from "./fields";

export {
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_TYPE,
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
  SERVICE_CATEGORIES_CANONICAL,
  SERVICE_CATEGORIES_LEGACY,
  SERVICE_TYPES,
  type ActionItemStatus,
  type ActionItemType,
  type AvailabilityStatus,
  type DiagnosisCategory,
  type DiagnosisConfidence,
  type Driveability,
  type FixNowVsWait,
  type JobStatus,
  type MechanicStatus,
  type PaymentStatus,
  type PaymentType,
  type ReceiptStatus,
  type ServiceType,
} from "./enums";

export {
  AIRTABLE_TABLE_ENV_KEYS,
  AIRTABLE_TABLES,
  type AirtableTable,
  type AirtableTableEnvKey,
  type AirtableTableIdMap,
} from "./tables";

export {
  FIELDS,
  SCHEMA_TABLE_IDS,
  type FieldsFor,
  type SchemaTableKey,
} from "./generated";

export type { ActionItemFields } from "./action-items";
export type { DiagnosisFields, ParsedDiagnosis } from "./diagnoses";
export type { DriverFields } from "./drivers";
export type { JobFields } from "./jobs";
export type { MechanicFields } from "./mechanics";
export type { PaymentFields } from "./payments";

export {
  actionItemStatusSchema,
  actionItemTypeSchema,
  availabilityStatusSchema,
  createActionItemSchema,
  createDiagnosisSchema,
  createDriverSchema,
  createJobSchema,
  createMechanicSchema,
  createPaymentSchema,
  diagnosisCategorySchema,
  diagnosisConfidenceSchema,
  driveabilitySchema,
  fixNowVsWaitSchema,
  jobStatusSchema,
  parsedDiagnosisSchema,
  paymentStatusSchema,
  paymentTypeSchema,
  receiptStatusSchema,
  serviceTypeSchema,
  updateActionItemSchema,
  updateDiagnosisSchema,
  updateDriverSchema,
  updateJobSchema,
  updateMechanicSchema,
  updatePaymentSchema,
  type CreateActionItemInput,
  type CreateDiagnosisInput,
  type CreateDriverInput,
  type CreateJobInput,
  type CreateMechanicInput,
  type CreatePaymentInput,
  type UpdateActionItemInput,
  type UpdateDiagnosisInput,
  type UpdateDriverInput,
  type UpdateJobInput,
  type UpdateMechanicInput,
  type UpdatePaymentInput,
} from "./schemas";
