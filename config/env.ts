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
 * Required for Phase 1 mechanic onboarding (Twilio OTP, SMS, webhooks, sessions).
 */
export const phase1EnvSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_VERIFY_SERVICE_SID: z.string().min(1),
  TWILIO_MESSAGING_SERVICE_SID: z.string().min(1),
  MECHANIC_SESSION_SECRET: z.string().min(32),
  AIRTABLE_WEBHOOK_SECRET: z.string().min(1),
});

/**
 * Required for Phase 2 AI diagnosis (OpenAI via native fetch).
 */
export const phase2EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  DIAGNOSIS_AI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
});

/**
 * Documented for later phases. Optional — not required for Phase 0–2 validation.
 */
export const futureEnvSchema = z.object({
  // Phase 1, 4 — Twilio fallback
  TWILIO_PHONE_NUMBER: z.string().optional(),
  // Phase 1 — Cloudinary (server)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  // Phase 1 — Cloudinary (client unsigned upload)
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: z.string().optional(),
  // Phase 1 — SMS templates
  VERIIUM_SUPPORT_PHONE: z.string().optional(),
  // Phase 3 — signed driver URLs
  SIGNED_URL_SECRET: z.string().optional(),
  // Phase 5 — Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

export const envSchema = phase0EnvSchema
  .merge(phase1EnvSchema)
  .merge(phase2EnvSchema)
  .merge(futureEnvSchema);

export type Phase0Env = z.infer<typeof phase0EnvSchema>;
export type Phase1Env = z.infer<typeof phase1EnvSchema>;
export type Phase2Env = z.infer<typeof phase2EnvSchema>;
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
 * Lazily parse and cache environment variables. Phase 0–2 keys are required;
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
