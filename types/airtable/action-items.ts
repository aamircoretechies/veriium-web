import type { ActionItemStatus, ActionItemType } from "./enums";
import type { AirtableDateTime, AirtableLinkedRecords } from "./fields";

/**
 * Action Items table — admin alerts, 11 types (§11.1).
 */
export type ActionItemFields = {
  type: ActionItemType;
  status?: ActionItemStatus;
  title?: string;
  notes?: string;

  job?: AirtableLinkedRecords;
  mechanic?: AirtableLinkedRecords;
  driver?: AirtableLinkedRecords;

  resolved_at?: AirtableDateTime;
};
