import type { PaymentStatus, PaymentType } from "./enums";
import type { AirtableDateTime, AirtableLinkedRecords } from "./fields";

/**
 * Payments table — Stripe events (§11.1, §10).
 */
export type PaymentFields = {
  type: PaymentType;
  amount: number;
  status: PaymentStatus;
  idempotency_key: string;

  stripe_customer_id?: string;
  stripe_setup_intent_id?: string;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;

  job?: AirtableLinkedRecords;
  driver?: AirtableLinkedRecords;

  created_at?: AirtableDateTime;
  captured_at?: AirtableDateTime;
};
