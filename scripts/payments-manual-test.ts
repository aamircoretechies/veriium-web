/**
 * Phase 5 manual test: exercise payment helpers + idempotency against live
 * lib/payments code with in-memory Airtable (default) and an injected Stripe
 * mock (default) or real Stripe test keys.
 *
 * Usage:
 *   npm run payments:manual-test
 *
 * Modes:
 *   Default — in-memory Airtable + in-memory Stripe (no API keys required).
 *   PAYMENTS_MANUAL_TEST_LIVE_STRIPE=1 — use sk_test_* from .env.local with
 *     in-memory Airtable (still no live Airtable writes).
 *   Unset PAYMENTS_MANUAL_TEST_MOCK and configure AIRTABLE_* to hit a live base.
 *
 * Optional env:
 *   PAYMENTS_MANUAL_TEST_KEEP=1 — skip cleanup of seeded rows (live Airtable only).
 *
 * ── Stripe CLI end-to-end (browser + webhooks) ──────────────────────────────
 *
 * Prerequisites:
 *   1. Copy .env.example → .env.local and fill Phase 0–5 keys (Stripe test mode).
 *   2. Terminal A: npm run dev
 *   3. Terminal B: stripe listen --forward-to localhost:3000/api/webhooks/stripe
 *      Copy the printed whsec_… into STRIPE_WEBHOOK_SECRET in .env.local and restart dev.
 *
 * SetupIntent happy path:
 *   1. Complete diagnosis + booking → /public/match?jobId=…&token=…
 *   2. Continue to payment → click "Secure My Repair"
 *   3. POST /api/bookings/{jobId}/payment returns clientSecret
 *   4. Enter test card 4242 4242 4242 4242 in Stripe Elements
 *   5. Verify Dashboard: setup_intent.succeeded
 *   6. Verify Airtable: job status=matched, cancellation_policy_accepted_at set,
 *      driver stripe_customer_id set, Payments row type=setup status=succeeded
 *
 * Idempotency (CLI):
 *   stripe trigger setup_intent.succeeded   # replay → no duplicate payment rows
 *   Call payment API twice on matched_awaiting_payment job → same SetupIntent
 *
 * Setup failure:
 *   Use decline card 4000 0000 0000 0002
 *   Verify setup_intent.setup_failed → payment row failed + payment_failed action item
 *
 * PaymentIntent helpers (future SMS callers — also covered by this script in mock mode):
 *   createDiagnosticFeeIntent  → $35, key diagnostic-{jobId}
 *   createCancellationFeeIntent → $50, key cancel-{jobId}
 *   createFinalPaymentIntent   → manual capture, key {jobId}
 *   createTipPaymentLink       → Payment Link, key tip-{jobId}
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type Stripe from "stripe";

const RUN_ID = Date.now().toString(36);
const TEST_ZIP = "30043";
const TEST_CATEGORY = "brakes" as const;

type TestResult = {
  name: string;
  passed: boolean;
  detail?: string;
};

const created = {
  drivers: [] as string[],
  mechanics: [] as string[],
  jobs: [] as string[],
  payments: [] as string[],
  actionItems: [] as string[],
};

function loadEnvFile(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq === -1) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    console.warn("[payments-manual-test] No .env.local found; using process.env only.");
  }

  const defaults: Record<string, string> = {
    AIRTABLE_API_KEY: "manual-test-airtable-placeholder",
    AIRTABLE_BASE_ID: "appManualTest",
    AIRTABLE_TABLE_DRIVERS: "tblDrivers",
    AIRTABLE_TABLE_MECHANICS: "tblMechanics",
    AIRTABLE_TABLE_JOBS: "tblJobs",
    AIRTABLE_TABLE_DIAGNOSES: "tblDiagnoses",
    AIRTABLE_TABLE_PAYMENTS: "tblPayments",
    AIRTABLE_TABLE_ACTION_ITEMS: "tblActionItems",
    QSTASH_TOKEN: "manual-test-qstash-placeholder",
    QSTASH_CURRENT_SIGNING_KEY: "manual-test-qstash-current",
    QSTASH_NEXT_SIGNING_KEY: "manual-test-qstash-next",
    APP_URL: "http://localhost:3000",
    TWILIO_ACCOUNT_SID: "ACmanualtest",
    TWILIO_AUTH_TOKEN: "manual-test-twilio-token",
    TWILIO_VERIFY_SERVICE_SID: "VAmanualtest",
    TWILIO_MESSAGING_SERVICE_SID: "MGmanualtest",
    MECHANIC_SESSION_SECRET: "manual-test-mechanic-session-secret-32ch",
    AIRTABLE_WEBHOOK_SECRET: "manual-test-airtable-webhook-secret",
    OPENAI_API_KEY: "manual-test-openai-placeholder",
    SIGNED_URL_SECRET: "manual-test-signed-url-secret-32ch",
    VERIIUM_ADMIN_PHONE: "+15559990001",
    MATCHING_DEV_SECRET: "manual-test-matching-secret",
    STRIPE_SECRET_KEY: "sk_test_manual_test_placeholder",
    STRIPE_WEBHOOK_SECRET: "whsec_manual_test_placeholder",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_manual_test_placeholder",
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function probeAirtable(): Promise<boolean> {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableId = process.env.AIRTABLE_TABLE_DRIVERS;
  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!baseId || !tableId || !apiKey || apiKey.includes("placeholder")) {
    return false;
  }

  try {
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}?maxRecords=1`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    return response.ok;
  } catch {
    return false;
  }
}

function useLiveStripe(): boolean {
  if (process.env.PAYMENTS_MANUAL_TEST_LIVE_STRIPE !== "1") {
    return false;
  }
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return key.startsWith("sk_test_") && !key.includes("placeholder");
}

type MockStripeState = {
  customers: Map<string, Stripe.Customer>;
  setupIntents: Map<string, Stripe.SetupIntent>;
  paymentIntents: Map<string, Stripe.PaymentIntent>;
  paymentMethods: Map<string, Stripe.PaymentMethod>;
  prices: Map<string, Stripe.Price>;
  paymentLinks: Stripe.PaymentLink[];
  idempotency: Map<string, unknown>;
  declineConfirmIntentIds: Set<string>;
  nextId: number;
};

function nextMockId(state: MockStripeState, prefix: string): string {
  state.nextId += 1;
  return `${prefix}_${RUN_ID}_${state.nextId}`;
}

/** Minimal in-memory Stripe for keyless payment helper tests. */
function createInMemoryStripeMock(): {
  client: Stripe;
  state: MockStripeState;
  attachPaymentMethod: (customerId: string) => string;
  succeedSetupIntent: (setupIntentId: string) => Stripe.SetupIntent;
} {
  const state: MockStripeState = {
    customers: new Map(),
    setupIntents: new Map(),
    paymentIntents: new Map(),
    paymentMethods: new Map(),
    prices: new Map(),
    paymentLinks: [],
    idempotency: new Map(),
    declineConfirmIntentIds: new Set(),
    nextId: 0,
  };

  function attachPaymentMethod(customerId: string): string {
    const pmId = nextMockId(state, "pm");
    const pm = {
      id: pmId,
      object: "payment_method",
      type: "card",
      customer: customerId,
    } as unknown as Stripe.PaymentMethod;
    state.paymentMethods.set(pmId, pm);

    const customer = state.customers.get(customerId);
    if (customer) {
      customer.invoice_settings = {
        ...customer.invoice_settings,
        default_payment_method: pmId,
      };
      state.customers.set(customerId, customer);
    }
    return pmId;
  }

  function succeedSetupIntent(setupIntentId: string): Stripe.SetupIntent {
    const existing = state.setupIntents.get(setupIntentId);
    if (!existing) {
      throw new Error(`SetupIntent ${setupIntentId} not found in mock`);
    }
    const customerId =
      typeof existing.customer === "string"
        ? existing.customer
        : existing.customer?.id;
    const pmId = customerId ? attachPaymentMethod(customerId) : undefined;
    const updated = {
      ...existing,
      status: "succeeded",
      payment_method: pmId,
    } as unknown as Stripe.SetupIntent;
    state.setupIntents.set(setupIntentId, updated);
    return updated;
  }

  const mock = {
    customers: {
      create: async (params: Stripe.CustomerCreateParams) => {
        const id = nextMockId(state, "cus");
        const customer = {
          id,
          object: "customer",
          phone: params.phone ?? null,
          name: params.name ?? null,
          metadata: params.metadata ?? {},
          invoice_settings: {},
        } as unknown as Stripe.Customer;
        state.customers.set(id, customer);
        return customer;
      },
      retrieve: async (id: string) => {
        const customer = state.customers.get(id);
        if (!customer) {
          throw new Error(`Customer ${id} not found in mock`);
        }
        return customer;
      },
      update: async (id: string, params: Stripe.CustomerUpdateParams) => {
        const customer = state.customers.get(id);
        if (!customer) {
          throw new Error(`Customer ${id} not found in mock`);
        }
        const updated = {
          ...customer,
          invoice_settings: {
            ...customer.invoice_settings,
            ...params.invoice_settings,
          },
        } as unknown as Stripe.Customer;
        state.customers.set(id, updated);
        return updated;
      },
    },
    setupIntents: {
      create: async (params: Stripe.SetupIntentCreateParams) => {
        const id = nextMockId(state, "seti");
        const customerId =
          typeof params.customer === "string" ? params.customer : undefined;
        const setupIntent = {
          id,
          object: "setup_intent",
          status: "requires_payment_method",
          client_secret: `${id}_secret_mock`,
          customer: customerId,
          usage: params.usage ?? "off_session",
          metadata: params.metadata ?? {},
        } as unknown as Stripe.SetupIntent;
        state.setupIntents.set(id, setupIntent);
        return setupIntent;
      },
      retrieve: async (id: string) => {
        const setupIntent = state.setupIntents.get(id);
        if (!setupIntent) {
          throw new Error(`SetupIntent ${id} not found in mock`);
        }
        return setupIntent;
      },
    },
    paymentIntents: {
      create: async (
        params: Stripe.PaymentIntentCreateParams,
        options?: Stripe.RequestOptions,
      ) => {
        const idempotencyKey = options?.idempotencyKey;
        if (idempotencyKey) {
          const cached = state.idempotency.get(idempotencyKey);
          if (cached) {
            return cached as Stripe.PaymentIntent;
          }
        }

        const id = nextMockId(state, "pi");
        const isManual = params.capture_method === "manual";
        const status = isManual ? "requires_capture" : "succeeded";
        const paymentIntent = {
          id,
          object: "payment_intent",
          amount: params.amount ?? 0,
          currency: params.currency ?? "usd",
          status,
          customer: params.customer,
          payment_method: params.payment_method,
          capture_method: params.capture_method ?? "automatic",
          metadata: params.metadata ?? {},
          latest_charge: status === "succeeded" ? nextMockId(state, "ch") : undefined,
        } as unknown as Stripe.PaymentIntent;

        state.paymentIntents.set(id, paymentIntent);
        if (idempotencyKey) {
          state.idempotency.set(idempotencyKey, paymentIntent);
        }
        return paymentIntent;
      },
      retrieve: async (id: string) => {
        const paymentIntent = state.paymentIntents.get(id);
        if (!paymentIntent) {
          throw new Error(`PaymentIntent ${id} not found in mock`);
        }
        return paymentIntent;
      },
      confirm: async (id: string) => {
        const paymentIntent = state.paymentIntents.get(id);
        if (!paymentIntent) {
          throw new Error(`PaymentIntent ${id} not found in mock`);
        }
        if (state.declineConfirmIntentIds.has(id)) {
          throw new Error("Your card was declined.");
        }
        const confirmed = {
          ...paymentIntent,
          status: "succeeded",
          latest_charge: nextMockId(state, "ch"),
        } as unknown as Stripe.PaymentIntent;
        state.paymentIntents.set(id, confirmed);
        return confirmed;
      },
    },
    paymentMethods: {
      list: async (params: Stripe.PaymentMethodListParams) => {
        const customerId = params.customer;
        const data = [...state.paymentMethods.values()].filter(
          (pm) => pm.customer === customerId,
        );
        return { object: "list", data, has_more: false, url: "" } as unknown as Stripe.ApiList<Stripe.PaymentMethod>;
      },
    },
    prices: {
      create: async (
        params: Stripe.PriceCreateParams,
        options?: Stripe.RequestOptions,
      ) => {
        const idempotencyKey = options?.idempotencyKey;
        if (idempotencyKey) {
          const cached = state.idempotency.get(idempotencyKey);
          if (cached) {
            return cached as Stripe.Price;
          }
        }
        const id = nextMockId(state, "price");
        const price = {
          id,
          object: "price",
          unit_amount: params.unit_amount,
          currency: params.currency ?? "usd",
        } as unknown as Stripe.Price;
        state.prices.set(id, price);
        if (idempotencyKey) {
          state.idempotency.set(idempotencyKey, price);
        }
        return price;
      },
    },
    paymentLinks: {
      create: async (
        params: Stripe.PaymentLinkCreateParams,
        options?: Stripe.RequestOptions,
      ) => {
        const idempotencyKey = options?.idempotencyKey;
        if (idempotencyKey) {
          const cached = state.idempotency.get(idempotencyKey);
          if (cached) {
            return cached as Stripe.PaymentLink;
          }
        }
        const id = nextMockId(state, "plink");
        const link = {
          id,
          object: "payment_link",
          url: `https://pay.stripe.test/${id}`,
          metadata: params.metadata ?? {},
          active: true,
        } as unknown as Stripe.PaymentLink;
        state.paymentLinks.push(link);
        if (idempotencyKey) {
          state.idempotency.set(idempotencyKey, link);
        }
        return link;
      },
      list: async () => ({
        object: "list",
        data: state.paymentLinks,
        has_more: false,
        url: "",
      }) as Stripe.ApiList<Stripe.PaymentLink>,
    },
  };

  return {
    client: mock as unknown as Stripe,
    state,
    attachPaymentMethod,
    succeedSetupIntent,
  };
}

async function main(): Promise<void> {
  loadEnvFile();
  process.env.MATCHING_MANUAL_TEST = "1";
  process.env.PAYMENTS_MANUAL_TEST = "1";

  const useMock =
    process.env.PAYMENTS_MANUAL_TEST_MOCK === "1" || !(await probeAirtable());
  const liveStripe = useLiveStripe();

  if (useMock) {
    console.log(
      "[payments-manual-test] Using in-memory Airtable mock (set real AIRTABLE_* in .env.local to hit live base).\n",
    );
  } else {
    console.log("[payments-manual-test] Using live Airtable base.\n");
  }

  if (liveStripe) {
    console.log("[payments-manual-test] Using live Stripe test API.\n");
  } else {
    console.log("[payments-manual-test] Using in-memory Stripe mock.\n");
  }

  const { setAirtableClientForTests, createInMemoryAirtableClient, getAirtableClient } =
    await import("@/lib/airtable");
  if (useMock) {
    setAirtableClientForTests(createInMemoryAirtableClient());
  }

  const { setStripeClientForTests } = await import("@/lib/stripe/client");
  const stripeMock = liveStripe ? null : createInMemoryStripeMock();
  if (stripeMock) {
    setStripeClientForTests(stripeMock.client);
  }

  const {
    setupKey,
    finalKey,
    diagnosticKey,
    cancelKey,
    tipKey,
    recoveryKey,
    paymentRetryKey,
  } = await import("@/lib/stripe/idempotency");
  const {
    DIAGNOSTIC_FEE_CENTS,
    CANCELLATION_FEE_CENTS,
  } = await import("@/lib/stripe/constants");
  const { createSetupIntentForJob } = await import("@/lib/payments/setup-intent");
  const { completeSetup } = await import("@/lib/payments/complete-setup");
  const { createDiagnosticFeeIntent } = await import("@/lib/payments/diagnostic-fee");
  const { createCancellationFeeIntent } = await import("@/lib/payments/cancellation-fee");
  const { createFinalPaymentIntent } = await import("@/lib/payments/final-intent");
  const { createTipPaymentLink } = await import("@/lib/payments/tip-link");
  const { createRecoveryPaymentLink } = await import("@/lib/payments/recovery-link");
  const { schedulePaymentRetry } = await import("@/lib/payments/schedule-retry");
  const { runPaymentRetry } = await import("@/lib/payments/retry-off-session");
  const { handlePaymentIntentEvent } = await import(
    "@/lib/payments/webhooks/payment-intent"
  );
  const { findPaymentByIdempotencyKey } = await import("@/lib/payments/record");
  const { dispatchStripeWebhook } = await import("@/lib/payments/webhooks/dispatch");
  const { getJobById } = await import("@/lib/jobs/lookup");
  const { getDriverById } = await import("@/lib/drivers/lookup");
  const {
    JobNotPayableError,
  } = await import("@/lib/payments/errors");

  const client = getAirtableClient();
  const results: TestResult[] = [];

  async function trackResult(
    name: string,
    fn: () => Promise<void>,
  ): Promise<void> {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`  ✓ ${name}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      results.push({ name, passed: false, detail });
      console.error(`  ✗ ${name}: ${detail}`);
    }
  }

  async function seedDriver(suffix: string): Promise<string> {
    const phone = `+1555030${suffix.padStart(4, "0")}`;
    const record = await client.createRecord("drivers", {
      phone,
      name: `Payments Test Driver ${RUN_ID}-${suffix}`,
    });
    created.drivers.push(record.id);
    return record.id;
  }

  async function seedMechanic(): Promise<string> {
    const phone = `+1555040${RUN_ID.slice(-4).padStart(4, "0")}`;
    const record = await client.createRecord("mechanics", {
      status: "approved",
      full_name: `Payments Test Mech ${RUN_ID}`,
      phone,
      availability_status: "available",
      setup_wizard_completed_at: new Date().toISOString(),
      service_zip_codes: [TEST_ZIP],
      service_categories: [TEST_CATEGORY],
      mobile_available: true,
      mobile_repairs_confirmed: true,
      tools_confirmed: true,
      transport_confirmed: true,
    });
    created.mechanics.push(record.id);
    return record.id;
  }

  async function seedJob(
    driverId: string,
    fields: Record<string, unknown> = {},
  ): Promise<string> {
    const record = await client.createRecord("jobs", {
      status: "draft",
      zip_code: TEST_ZIP,
      diagnosis_category: TEST_CATEGORY,
      service_type: "mobile_repair",
      vehicle_year: 2020,
      vehicle_make: "Toyota",
      vehicle_model: "Camry",
      driver: [driverId],
      ...fields,
    });
    created.jobs.push(record.id);
    return record.id;
  }

  async function countPaymentsByKey(key: string): Promise<number> {
    const formula = `{idempotency_key} = '${key.replace(/'/g, "\\'")}'`;
    const response = await client.listRecords("payments", {
      filterByFormula: formula,
      maxRecords: 10,
    });
    for (const row of response.records) {
      if (!created.payments.includes(row.id)) {
        created.payments.push(row.id);
      }
    }
    return response.records.length;
  }

  console.log(`\n[payments-manual-test] run=${RUN_ID}\n`);

  console.log("Unit checks (no external APIs):");
  await trackResult("idempotency keys: setup/final/diagnostic/cancel/tip/recovery", async () => {
    const jobId = "recJobTest";
    assert(setupKey(jobId) === `setup-${jobId}`, "setupKey");
    assert(finalKey(jobId) === jobId, "finalKey");
    assert(diagnosticKey(jobId) === `diagnostic-${jobId}`, "diagnosticKey");
    assert(cancelKey(jobId) === `cancel-${jobId}`, "cancelKey");
    assert(tipKey(jobId) === `tip-${jobId}`, "tipKey");
    assert(recoveryKey(jobId) === `recovery-${jobId}`, "recoveryKey");
    assert(
      paymentRetryKey(diagnosticKey(jobId)) === `diagnostic-${jobId}-retry`,
      "paymentRetryKey",
    );
  });

  await trackResult("errors: JobNotPayableError for non-draft job", async () => {
    const driverId = await seedDriver("01");
    const jobId = await seedJob(driverId, { status: "matched" });
    try {
      await createSetupIntentForJob(jobId);
      throw new Error("expected JobNotPayableError");
    } catch (error) {
      assert(error instanceof JobNotPayableError, "JobNotPayableError");
    }
  });

  async function resetMechanicAvailable(mechanicId: string): Promise<void> {
    await client.updateRecord("mechanics", mechanicId, {
      availability_status: "available",
      last_assigned_at: null,
    });
  }

  console.log("\nSetupIntent flow:");
  const setupDriverId = await seedDriver("02");
  const mechanicId = await seedMechanic();

  await trackResult("createSetupIntentForJob: draft → matched_awaiting_payment", async () => {
    const jobId = await seedJob(setupDriverId);
    const result = await createSetupIntentForJob(jobId);
    const job = await getJobById(jobId);

    assert(Boolean(result.clientSecret), "clientSecret");
    assert(Boolean(result.setupIntentId), "setupIntentId");
    assert(job.fields.status === "matched_awaiting_payment", "status");
    assert(Boolean(job.fields.cancellation_policy_accepted_at), "policy timestamp");
    assert(Boolean(job.fields.payment_setup_at), "payment_setup_at");

    const payment = await findPaymentByIdempotencyKey(setupKey(jobId));
    assert(payment !== null, "payment row");
    assert(payment.fields.type === "setup", "type setup");
    assert(payment.fields.status === "pending", "status pending");
    assert(
      payment.fields.stripe_setup_intent_id === result.setupIntentId,
      "setup intent id",
    );
  });

  let reusableJobId = "";
  let reusableSetupIntentId = "";

  await trackResult("createSetupIntentForJob: idempotent retry returns same intent", async () => {
    reusableJobId = await seedJob(setupDriverId);
    const first = await createSetupIntentForJob(reusableJobId);
    const second = await createSetupIntentForJob(reusableJobId);

    assert(first.setupIntentId === second.setupIntentId, "same setupIntentId");
    assert(first.clientSecret === second.clientSecret, "same clientSecret");
    assert((await countPaymentsByKey(setupKey(reusableJobId))) === 1, "one payment row");
    reusableSetupIntentId = first.setupIntentId;
  });

  await trackResult("completeSetup: setup_intent.succeeded → matched + driver customer", async () => {
    await resetMechanicAvailable(mechanicId);
    const setupIntent = stripeMock
      ? stripeMock.succeedSetupIntent(reusableSetupIntentId)
      : ({
          id: reusableSetupIntentId,
          metadata: { jobId: reusableJobId },
          customer: (await getDriverById(setupDriverId)).fields.stripe_customer_id,
          payment_method: "pm_live_placeholder",
          status: "succeeded",
        } as unknown as Stripe.SetupIntent);

    if (!stripeMock) {
      throw new Error(
        "completeSetup integration requires mock Stripe or PAYMENTS_MANUAL_TEST_LIVE_STRIPE with a confirmed SetupIntent",
      );
    }

    const result = await completeSetup(setupIntent);
    const job = await getJobById(reusableJobId);
    const driver = await getDriverById(setupDriverId);
    const payment = await findPaymentByIdempotencyKey(setupKey(reusableJobId));

    assert(result.jobId === reusableJobId, "jobId");
    assert(job.fields.status === "matched", "matched status");
    assert(Boolean(driver.fields.stripe_customer_id), "driver stripe_customer_id");
    assert(payment?.fields.status === "succeeded", "payment succeeded");
  });

  await trackResult("completeSetup: replay is idempotent", async () => {
    if (!stripeMock) {
      return;
    }
    const setupIntent = stripeMock.state.setupIntents.get(reusableSetupIntentId)!;
    const first = await completeSetup(setupIntent);
    const second = await completeSetup(setupIntent);
    assert(first.alreadyCompleted === false || second.alreadyCompleted === true, "replay");
    assert((await countPaymentsByKey(setupKey(reusableJobId))) === 1, "still one payment row");
  });

  await trackResult("webhook: setup_intent.succeeded dispatch", async () => {
    await resetMechanicAvailable(mechanicId);
    if (!stripeMock) {
      return;
    }
    const driverId = await seedDriver("03");
    const jobId = await seedJob(driverId);
    const { setupIntentId } = await createSetupIntentForJob(jobId);
    const setupIntent = stripeMock.succeedSetupIntent(setupIntentId);

    await dispatchStripeWebhook({
      id: `evt_${RUN_ID}_setup_ok`,
      object: "event",
      type: "setup_intent.succeeded",
      data: { object: setupIntent },
    } as unknown as Stripe.Event);

    const job = await getJobById(jobId);
    assert(job.fields.status === "matched", "matched via webhook");
  });

  await trackResult("webhook: setup_intent.setup_failed → failed + action item", async () => {
    const driverId = await seedDriver("04");
    const jobId = await seedJob(driverId);
    const { setupIntentId } = await createSetupIntentForJob(jobId);

    const failedIntent = {
      id: setupIntentId,
      metadata: { jobId },
      status: "requires_payment_method",
      last_setup_error: { message: "Your card was declined." },
    } as unknown as Stripe.SetupIntent;

    await dispatchStripeWebhook({
      id: `evt_${RUN_ID}_setup_fail`,
      object: "event",
      type: "setup_intent.setup_failed",
      data: { object: failedIntent },
    } as unknown as Stripe.Event);

    const payment = await findPaymentByIdempotencyKey(setupKey(jobId));
    assert(payment?.fields.status === "failed", "payment failed");

    const actionItems = await client.listRecords("action-items", {
      filterByFormula: `FIND('${jobId}', ARRAYJOIN({job}, ','))`,
      maxRecords: 5,
    });
    assert(actionItems.records.length >= 1, "action item created");
    for (const row of actionItems.records) {
      if (!created.actionItems.includes(row.id)) {
        created.actionItems.push(row.id);
      }
    }
  });

  console.log("\nPaymentIntent helpers (post card-save):");

  let piJobId = "";
  let piDriverId = "";

  await trackResult("prepare: job with saved card for PI helpers", async () => {
    await resetMechanicAvailable(mechanicId);
    piDriverId = await seedDriver("05");
    piJobId = await seedJob(piDriverId);
    const { setupIntentId } = await createSetupIntentForJob(piJobId);
    if (!stripeMock) {
      throw new Error("PI helper tests require in-memory Stripe mock");
    }
    const setupIntent = stripeMock.succeedSetupIntent(setupIntentId);
    await completeSetup(setupIntent);
    await client.updateRecord("jobs", piJobId, {
      final_price: 199.99,
      status: "accepted_by_mechanic",
    });
  });

  await trackResult("createDiagnosticFeeIntent: $35 + idempotent replay", async () => {
    const first = await createDiagnosticFeeIntent(piJobId);
    const second = await createDiagnosticFeeIntent(piJobId);

    assert(first.paymentIntentId === second.paymentIntentId, "same PI");
    assert(first.status === "succeeded", "succeeded");
    assert((await countPaymentsByKey(diagnosticKey(piJobId))) === 1, "one row");

    const payment = await findPaymentByIdempotencyKey(diagnosticKey(piJobId));
    assert(payment?.fields.type === "diagnostic_fee", "type");
    assert(payment?.fields.amount === DIAGNOSTIC_FEE_CENTS / 100, "amount $35");
  });

  await trackResult("createCancellationFeeIntent: $50 + idempotent replay", async () => {
    const first = await createCancellationFeeIntent(piJobId);
    const second = await createCancellationFeeIntent(piJobId);

    assert(first.paymentIntentId === second.paymentIntentId, "same PI");
    assert(first.status === "succeeded", "succeeded");
    assert((await countPaymentsByKey(cancelKey(piJobId))) === 1, "one row");

    const payment = await findPaymentByIdempotencyKey(cancelKey(piJobId));
    assert(payment?.fields.type === "cancellation_fee", "type");
    assert(payment?.fields.amount === CANCELLATION_FEE_CENTS / 100, "amount $50");
  });

  await trackResult("createFinalPaymentIntent: manual capture + idempotent replay", async () => {
    const first = await createFinalPaymentIntent(piJobId);
    const second = await createFinalPaymentIntent(piJobId);

    assert(first.paymentIntentId === second.paymentIntentId, "same PI");
    assert(first.status === "requires_capture", "requires_capture");
    assert(first.amountCents === 19999, "amount cents");
    assert((await countPaymentsByKey(finalKey(piJobId))) === 1, "one row");

    const payment = await findPaymentByIdempotencyKey(finalKey(piJobId));
    assert(payment?.fields.type === "final", "type");
  });

  await trackResult("createTipPaymentLink: URL + idempotent replay", async () => {
    const first = await createTipPaymentLink(piJobId, 15);
    const second = await createTipPaymentLink(piJobId, 15);

    assert(first.url === second.url, "same URL");
    assert(Boolean(first.url), "url present");
    assert((await countPaymentsByKey(tipKey(piJobId))) === 1, "one row");

    const payment = await findPaymentByIdempotencyKey(tipKey(piJobId));
    assert(payment?.fields.type === "tip", "type tip");
    assert(payment?.fields.amount === 15, "amount");
  });

  await trackResult("webhook: payment_intent.succeeded updates diagnostic payout", async () => {
    await resetMechanicAvailable(mechanicId);
    const driverId = await seedDriver("06");
    const jobId = await seedJob(driverId);
    const { setupIntentId } = await createSetupIntentForJob(jobId);
    if (!stripeMock) {
      return;
    }
    stripeMock.succeedSetupIntent(setupIntentId);
    await completeSetup(stripeMock.state.setupIntents.get(setupIntentId)!);

    const { paymentIntentId } = await createDiagnosticFeeIntent(jobId);
    const paymentIntent = stripeMock.state.paymentIntents.get(paymentIntentId)!;

    await dispatchStripeWebhook({
      id: `evt_${RUN_ID}_pi_ok`,
      object: "event",
      type: "payment_intent.succeeded",
      data: { object: paymentIntent },
    } as unknown as Stripe.Event);

    const job = await getJobById(jobId);
    assert(job.fields.mechanic_payout === 25, "mechanic_payout");
    assert(job.fields.platform_fee === 10, "platform_fee");
  });

  await trackResult("errors: JobNotPayableError after setup completed", async () => {
    try {
      await createSetupIntentForJob(reusableJobId);
      throw new Error("expected JobNotPayableError");
    } catch (error) {
      assert(error instanceof JobNotPayableError, "JobNotPayableError");
    }
  });

  console.log("\nM7 payment failure recovery:");

  await trackResult("M7: final PI fail → payout_held + recovery link action item", async () => {
    if (!stripeMock) {
      throw new Error("M7 tests require in-memory Stripe mock");
    }

    const driverId = await seedDriver("07");
    const jobId = await seedJob(driverId, {
      status: "completed_pending_confirmation",
      final_price: 249.5,
      payout_held: true,
    });

    const piId = nextMockId(stripeMock.state, "pi");
    const failedIntent = {
      id: piId,
      object: "payment_intent",
      amount: 24950,
      currency: "usd",
      status: "requires_payment_method",
      metadata: { jobId, paymentType: "final" },
      last_payment_error: { message: "Your card was declined." },
    } as unknown as Stripe.PaymentIntent;
    stripeMock.state.paymentIntents.set(piId, failedIntent);

    await client.createRecord("payments", {
      type: "final",
      amount: 249.5,
      status: "pending",
      idempotency_key: finalKey(jobId),
      stripe_payment_intent_id: piId,
      job: [jobId],
      driver: [driverId],
    });

    await handlePaymentIntentEvent({
      id: `evt_${RUN_ID}_final_fail`,
      object: "event",
      type: "payment_intent.payment_failed",
      data: { object: failedIntent },
    } as unknown as Stripe.Event);

    const job = await getJobById(jobId);
    assert(job.fields.payout_held === true, "payout_held");

    const actionItems = await client.listRecords("action-items", {
      filterByFormula: `AND({type} = 'payment_failed', FIND('${jobId}', ARRAYJOIN({job}, ',')))`,
      maxRecords: 5,
    });
    assert(actionItems.records.length >= 1, "payment_failed action item");
    const notes = String(actionItems.records[0]?.fields.notes ?? "");
    assert(notes.includes("Recovery link:"), "recovery URL in notes");
    for (const row of actionItems.records) {
      if (!created.actionItems.includes(row.id)) {
        created.actionItems.push(row.id);
      }
    }

    const recovery = await createRecoveryPaymentLink(jobId);
    const recovery2 = await createRecoveryPaymentLink(jobId);
    assert(recovery.url === recovery2.url, "recovery link idempotent");
    assert((await countPaymentsByKey(recoveryKey(jobId))) === 1, "one recovery row");
  });

  await trackResult("M7: diagnostic fail → schedule retry + worker runs once", async () => {
    if (!stripeMock) {
      throw new Error("M7 tests require in-memory Stripe mock");
    }

    const driverId = await seedDriver("08");
    let jobId = await seedJob(driverId, { status: "draft" });
    const { setupIntentId } = await createSetupIntentForJob(jobId);
    const setupIntent = stripeMock.succeedSetupIntent(setupIntentId);
    await completeSetup(setupIntent);
    await client.updateRecord("jobs", jobId, { status: "cancelled" });

    const piId = nextMockId(stripeMock.state, "pi");
    const failedIntent = {
      id: piId,
      object: "payment_intent",
      amount: DIAGNOSTIC_FEE_CENTS,
      currency: "usd",
      status: "requires_payment_method",
      customer: setupIntent.customer,
      metadata: { jobId, paymentType: "diagnostic_fee" },
      last_payment_error: { message: "Your card was declined." },
    } as unknown as Stripe.PaymentIntent;
    stripeMock.state.paymentIntents.set(piId, failedIntent);
    stripeMock.state.declineConfirmIntentIds.add(piId);

    const paymentRecord = await client.createRecord("payments", {
      type: "diagnostic_fee",
      amount: DIAGNOSTIC_FEE_CENTS / 100,
      status: "failed",
      idempotency_key: diagnosticKey(jobId),
      stripe_payment_intent_id: piId,
      job: [jobId],
      driver: [driverId],
    });
    created.payments.push(paymentRecord.id);

    await handlePaymentIntentEvent({
      id: `evt_${RUN_ID}_diag_fail_1`,
      object: "event",
      type: "payment_intent.payment_failed",
      data: { object: failedIntent },
    } as unknown as Stripe.Event);

    let job = await getJobById(jobId);
    assert(
      Boolean(job.fields.payment_retry_qstash_id?.trim()),
      "payment_retry_qstash_id scheduled",
    );

    const beforeRetry = job.fields.payment_retry_qstash_id;
    await schedulePaymentRetry(jobId, "diagnostic_fee");
    job = await getJobById(jobId);
    assert(
      job.fields.payment_retry_qstash_id === beforeRetry,
      "retry schedule idempotent",
    );

    const retryResult = await runPaymentRetry(jobId, "diagnostic_fee");
    assert(retryResult.action === "escalated", "retry escalated on decline");

    const escalations = await client.listRecords("action-items", {
      filterByFormula: `AND({type} = 'payment_failed', FIND('${jobId}', ARRAYJOIN({job}, ',')))`,
      maxRecords: 5,
    });
    assert(escalations.records.length >= 1, "diagnostic retry failed action item");
    for (const row of escalations.records) {
      if (!created.actionItems.includes(row.id)) {
        created.actionItems.push(row.id);
      }
    }
  });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);

  console.log(`\n[payments-manual-test] ${passed}/${results.length} passed`);

  if (stripeMock) {
    setStripeClientForTests(undefined);
  }

  if (process.env.PAYMENTS_MANUAL_TEST_KEEP !== "1" && !useMock) {
    console.log("\nCleaning up seeded rows...");
    for (const id of created.jobs) {
      try {
        await client.updateRecord("jobs", id, { status: "cancelled" });
      } catch {
        // best-effort
      }
    }
    const baseId = process.env.AIRTABLE_BASE_ID!;
    const apiKey = process.env.AIRTABLE_API_KEY!;
    const tableIds = {
      mechanics: process.env.AIRTABLE_TABLE_MECHANICS!,
      drivers: process.env.AIRTABLE_TABLE_DRIVERS!,
      payments: process.env.AIRTABLE_TABLE_PAYMENTS!,
    };

    async function deleteRow(tableId: string, recordId: string): Promise<void> {
      const response = await fetch(
        `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      );
      if (!response.ok && response.status !== 404) {
        console.warn(`  delete ${recordId}: HTTP ${response.status}`);
      }
    }

    for (const id of created.mechanics) {
      await deleteRow(tableIds.mechanics, id);
    }
    for (const id of created.drivers) {
      await deleteRow(tableIds.drivers, id);
    }
    for (const id of created.payments) {
      await deleteRow(tableIds.payments, id);
    }
    for (const id of created.actionItems) {
      await deleteRow(process.env.AIRTABLE_TABLE_ACTION_ITEMS!, id);
    }
    console.log("  Seeded rows cancelled/deleted.");
  } else if (useMock) {
    console.log("\nIn-memory mock — no persistent rows to clean up.");
  } else {
    console.log(
      `\nPAYMENTS_MANUAL_TEST_KEEP=1 — retained jobs=[${created.jobs.join(", ")}]`,
    );
  }

  if (failed.length > 0) {
    console.error("\nFailed tests:");
    for (const f of failed) {
      console.error(`  - ${f.name}: ${f.detail}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[payments-manual-test] Fatal:", error);
  process.exit(1);
});
