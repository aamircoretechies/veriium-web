import { z } from "zod";

import { mechanicStatusSchema } from "@/types/airtable/schemas";

export const airtableWebhookSchema = z.object({
  recordId: z.string().min(1),
  status: mechanicStatusSchema,
  previousStatus: mechanicStatusSchema.optional(),
  review_notes: z.string().optional(),
});

export type AirtableWebhookRequest = z.infer<typeof airtableWebhookSchema>;
