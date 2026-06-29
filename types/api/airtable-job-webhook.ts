import { z } from "zod";

const airtableJobWebhookBaseSchema = z.object({
  recordId: z.string().min(1),
});

/** POST /api/webhooks/airtable/jobs body */
export const airtableJobWebhookSchema = z.discriminatedUnion("action", [
  airtableJobWebhookBaseSchema.extend({
    action: z.literal("no_show_approved"),
  }),
  airtableJobWebhookBaseSchema.extend({
    action: z.literal("dispute_refund"),
  }),
  airtableJobWebhookBaseSchema.extend({
    action: z.literal("dispute_confirm"),
  }),
  airtableJobWebhookBaseSchema.extend({
    action: z.literal("quote_parts_approved"),
  }),
]);

export type AirtableJobWebhookRequest = z.infer<typeof airtableJobWebhookSchema>;
