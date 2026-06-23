/**
 * Shared Airtable REST API response shapes.
 * @see https://airtable.com/developers/web/api/introduction
 */

export type AirtableRecord<TFields> = {
  id: string;
  createdTime: string;
  fields: TFields;
};

export type AirtableListResponse<TFields> = {
  records: AirtableRecord<TFields>[];
  offset?: string;
};

export type AirtableErrorBody = {
  error: {
    type: string;
    message: string;
  };
};

export type AirtableCreateResponse<TFields> = AirtableRecord<TFields>;

export type AirtableUpdateResponse<TFields> = AirtableRecord<TFields>;
