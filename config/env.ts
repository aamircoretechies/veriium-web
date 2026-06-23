import { z } from "zod";

/**
 * Validated when `getEnv()` is first called. Required for Phase 0 infrastructure.
 */
export const phase0EnvSchema = z.object({
  AIRTABLE_API_KEY: z.string().min(1),
  AIRTABLE_BASE_ID: z.string().min(1),
  AIRTABLE_TABLE_DRIVERS: z.string().min(1),
  AIRTABLE_TABLE_MECHANICS: z.string().min(1),
  AIRTABLE_TABLE_JOBS: z.string().min(1),
  AIRTABLE_TABLE_DIAGNOSES: z.string().min(1),
  AIRTABLE_TABLE_PAYMENTS: z.string().min(1),
  AIRTABLE_TABLE_ACTION_ITEMS: z.string().min(1),
  QSTASH_TOKEN: z.string().min(1),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1),
  APP_URL: z.string().url(),
  QSTASH_URL: z
    .string()
    .url()
    .default("https://qstash.upstash.io"),
});

/**
 * Documented for later phases. Optional — not required for Phase 0 validation.
 */
export const futureEnvSchema = z.object({
  // Phase 1, 4 — Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),
  TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  // Phase 1 — Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  // Phase 1 — SMS templates
  VERIIUM_SUPPORT_PHONE: z.string().optional(),
  // Phase 2 — AI diagnosis
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  // Phase 3 — signed driver URLs
  SIGNED_URL_SECRET: z.string().optional(),
  // Phase 5 — Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

export const envSchema = phase0EnvSchema.merge(futureEnvSchema);

export type Phase0Env = z.infer<typeof phase0EnvSchema>;
export type FutureEnv = z.infer<typeof futureEnvSchema>;
export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | undefined;

function formatEnvErrors(error: z.ZodError): string {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  return Object.entries(fieldErrors)
    .map(([key, messages]) => `${key}: ${(messages ?? []).join(", ")}`)
    .join("\n");
}

/**
 * Lazily parse and cache environment variables. Phase 0 keys are required;
 * future-phase keys are optional until those features ship.
 */
export function getEnv(): Env {
  if (!cachedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      throw new Error(`Invalid environment variables:\n${formatEnvErrors(result.error)}`);
    }
    cachedEnv = result.data;
  }
  return cachedEnv;
}
