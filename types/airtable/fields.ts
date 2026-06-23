/**
 * Shared Airtable field value shapes (REST API).
 * @see https://airtable.com/developers/web/api/field-model
 */

/** Linked-record fields return an array of record IDs (`rec…`). */
export type AirtableLinkedRecords = string[];

/** Date / dateTime fields return ISO 8601 strings. */
export type AirtableDateTime = string;

export type AirtableAttachment = {
  id: string;
  url: string;
  filename?: string;
  size?: number;
  type?: string;
  thumbnails?: {
    small?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
    full?: { url: string; width: number; height: number };
  };
};
