import type { AirtableDateTime } from "./fields";

/**
 * Drivers table — customers keyed by phone (§11.1).
 */
export type DriverFields = {
  /** E.164 or normalized phone; primary lookup key. */
  phone: string;
  name?: string;
  email?: string;
  stripe_customer_id?: string;
  created_at?: AirtableDateTime;
  updated_at?: AirtableDateTime;
};
