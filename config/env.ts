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
 * Required for Phase 3 booking (HMAC-signed driver job URLs).
 */
export const phase3EnvSchema = z.object({
  SIGNED_URL_SECRET: z.string().min(32),
});

/**
 * Required for Phase 4 matching (Tier 4 admin SMS, dev start-matching endpoint).
 */
export const phase4EnvSchema = z.object({
  VERIIUM_ADMIN_PHONE: z.string().min(1),
  MATCHING_DEV_SECRET: z.string().min(16),
});

/**
 * Required for Phase 5 Stripe payments (SetupIntent, PaymentIntent, webhooks).
 */
export const phase5EnvSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
});

/**
 * Documented for later phases. Optional — not required for Phase 0–5 validation.
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
});

export const envSchema = phase0EnvSchema
  .merge(phase1EnvSchema)
  .merge(phase2EnvSchema)
  .merge(phase3EnvSchema)
  .merge(phase4EnvSchema)
  .merge(phase5EnvSchema)
  .merge(futureEnvSchema);

export type Phase0Env = z.infer<typeof phase0EnvSchema>;
export type Phase1Env = z.infer<typeof phase1EnvSchema>;
export type Phase2Env = z.infer<typeof phase2EnvSchema>;
export type Phase3Env = z.infer<typeof phase3EnvSchema>;
export type Phase4Env = z.infer<typeof phase4EnvSchema>;
export type Phase5Env = z.infer<typeof phase5EnvSchema>;
export type FutureEnv = z.infer<typeof futureEnvSchema>;
export type Env = z.infer<typeof envSchema>;

// Per-phase caches — each is validated independently on first use.
let cachedEnv: Env | undefined;
let cachedPhase0: Phase0Env | undefined;
let cachedPhase1: Phase1Env | undefined;
let cachedPhase2: Phase2Env | undefined;
let cachedPhase3: Phase3Env | undefined;
let cachedPhase4: Phase4Env | undefined;
let cachedPhase5: Phase5Env | undefined;

function formatEnvErrors(error: z.ZodError): string {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  return Object.entries(fieldErrors)
    .map(([key, messages]) => `${key}: ${(messages ?? []).join(", ")}`)
    .join("\n");
}

function parsePhase<T>(schema: z.ZodType<T>, label: string): T {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid environment variables (${label}):\n${formatEnvErrors(result.error)}`);
  }
  return result.data;
}

/** Phase 0 — Airtable + QStash + APP_URL */
export function getPhase0Env(): Phase0Env {
  return (cachedPhase0 ??= parsePhase(phase0EnvSchema, "Phase 0"));
}

/** Phase 1 — Twilio OTP/SMS + mechanic session */
export function getPhase1Env(): Phase1Env {
  return (cachedPhase1 ??= parsePhase(phase1EnvSchema, "Phase 1"));
}

/** Phase 2 — OpenAI / AI diagnosis */
export function getPhase2Env(): Phase2Env {
  return (cachedPhase2 ??= parsePhase(phase2EnvSchema, "Phase 2"));
}

/** Phase 3 — HMAC-signed booking URLs */
export function getPhase3Env(): Phase3Env {
  return (cachedPhase3 ??= parsePhase(phase3EnvSchema, "Phase 3"));
}

/** Phase 4 — Matching funnel + admin phone */
export function getPhase4Env(): Phase4Env {
  return (cachedPhase4 ??= parsePhase(phase4EnvSchema, "Phase 4"));
}

/** Phase 5 — Stripe payments */
export function getPhase5Env(): Phase5Env {
  return (cachedPhase5 ??= parsePhase(phase5EnvSchema, "Phase 5"));
}

/**
 * Full env — validates ALL phases at once. Only use where all services are needed.
 * Prefer the per-phase getters (getPhase0Env, getPhase2Env, etc.) in individual features.
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
