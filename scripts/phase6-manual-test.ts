/**
 * Phase 6 manual test: service SMS workflow, cancellation fees, no-show,
 * dispute reminders, driver confirm/dispute, admin refund, stale availability.
 *
 * Usage:
 *   npm run phase6:manual-test
 *
 * Modes:
 *   Default — in-memory Airtable + in-memory Stripe (no API keys required).
 *   Unset PHASE6_MANUAL_TEST_MOCK and configure AIRTABLE_* to hit a live base.
 *
 * Optional env:
 *   PHASE6_MANUAL_TEST_KEEP=1 — skip cleanup of seeded rows (live Airtable only).
 *
 * Shortened delays (set automatically when unset):
 *   NO_SHOW_DELAY_SECONDS=15
 *   DISPUTE_REMINDER_DELAYS_SECONDS=1,2,3
 *   STALE_AVAILABILITY_SECONDS=1
 *
 * ── Manual smoke (real keys) ────────────────────────────────────────────────
 *
 * 1. stripe listen --forward-to localhost:3000/api/webhooks/stripe
 * 2. ngrok → set APP_URL for QStash callbacks
 * 3. Complete booking through Phase 5 → mechanic ACCEPT → service SMS via Twilio
 * 4. Verify QStash dashboard for no-show / dispute / stale schedules
 * 5. Verify Airtable Jobs timestamps and Payments rows
 *
 * Airtable automations (ops):
 *   no_show_pending_review → POST /api/webhooks/airtable/jobs
 *     { recordId, action: "no_show_approved" }
 *   disputed → refund → { recordId, action: "dispute_refund" }
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type Stripe from "stripe";

import type { MechanicFields } from "@/types/airtable/mechanics";
import {
  ACTION_ITEM_TYPE,
  actionItemJobFormula,
  actionItemLinkedToJob,
  assertQuoteSubmitted,
  countPaymentsByJobAndType,
  driverSeedFields,
  JOB_STATUS,
  jobDetails,
  mechanicSeedFields,
  parseQuoteDetails,
  stringifyQuoteDetails,
  TEST_CATEGORY,
  TEST_ZIP,
} from "./schema-test-helpers";

const RUN_ID = Date.now().toString(36);

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
    console.warn("[phase6-manual-test] No .env.local found; using process.env only.");
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
    NO_SHOW_DELAY_SECONDS: "15",
    DISPUTE_REMINDER_DELAYS_SECONDS: "1,2,3",
    STALE_AVAILABILITY_SECONDS: "1",
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

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
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

type MockStripeState = {
  customers: Map<string, Stripe.Customer>;
  setupIntents: Map<string, Stripe.SetupIntent>;
  paymentIntents: Map<string, Stripe.PaymentIntent>;
  paymentMethods: Map<string, Stripe.PaymentMethod>;
  idempotency: Map<string, unknown>;
  nextId: number;
};

function nextMockId(state: MockStripeState, prefix: string): string {
  state.nextId += 1;
  return `${prefix}_${RUN_ID}_${state.nextId}`;
}

function resolveStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | undefined {
  return typeof customer === "string" ? customer : customer?.id;
}

function createInMemoryStripeMock(): {
  client: Stripe;
  state: MockStripeState;
  succeedSetupIntent: (setupIntentId: string) => Stripe.SetupIntent;
} {
  const state: MockStripeState = {
    customers: new Map(),
    setupIntents: new Map(),
    paymentIntents: new Map(),
    paymentMethods: new Map(),
    idempotency: new Map(),
    nextId: 0,
  };

  function attachPaymentMethod(customerId: string): string {
    const pmId = nextMockId(state, "pm");
    const pm = {
      id: pmId,
      object: "payment_method",
      type: "card",
      customer: customerId,
    } as Stripe.PaymentMethod;
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
    const customerId = resolveStripeCustomerId(existing.customer);
    const pmId = customerId ? attachPaymentMethod(customerId) : undefined;
    const updated = {
      ...existing,
      status: "succeeded",
      payment_method: pmId,
    } as Stripe.SetupIntent;
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
        } as Stripe.Customer;
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
        } as Stripe.Customer;
        state.customers.set(id, updated);
        return updated;
      },
    },
    setupIntents: {
      create: async (params: Stripe.SetupIntentCreateParams) => {
        const id = nextMockId(state, "seti");
        const customerId = resolveStripeCustomerId(params.customer);
        const setupIntent = {
          id,
          object: "setup_intent",
          status: "requires_payment_method",
          client_secret: `${id}_secret_mock`,
          customer: customerId,
          usage: params.usage ?? "off_session",
          metadata: params.metadata ?? {},
        } as Stripe.SetupIntent;
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
          latest_charge:
            status === "succeeded" ? nextMockId(state, "ch") : undefined,
        } as Stripe.PaymentIntent;

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
      capture: async (id: string) => {
        const paymentIntent = state.paymentIntents.get(id);
        if (!paymentIntent) {
          throw new Error(`PaymentIntent ${id} not found in mock`);
        }
        const updated = {
          ...paymentIntent,
          status: "succeeded",
          latest_charge: nextMockId(state, "ch"),
        } as Stripe.PaymentIntent;
        state.paymentIntents.set(id, updated);
        return updated;
      },
      cancel: async (id: string) => {
        const paymentIntent = state.paymentIntents.get(id);
        if (!paymentIntent) {
          throw new Error(`PaymentIntent ${id} not found in mock`);
        }
        const updated = {
          ...paymentIntent,
          status: "canceled",
        } as Stripe.PaymentIntent;
        state.paymentIntents.set(id, updated);
        return updated;
      },
    },
    paymentMethods: {
      list: async (params: Stripe.PaymentMethodListParams) => {
        const customerId = params.customer;
        const data = [...state.paymentMethods.values()].filter(
          (pm) => pm.customer === customerId,
        );
        return {
          object: "list",
          data,
          has_more: false,
          url: "",
        } as Stripe.ApiList<Stripe.PaymentMethod>;
      },
    },
    refunds: {
      create: async () =>
        ({
          id: nextMockId(state, "re"),
          object: "refund",
          status: "succeeded",
        }) as Stripe.Refund,
    },
  };

  return {
    client: mock as unknown as Stripe,
    state,
    succeedSetupIntent,
  };
}

async function main(): Promise<void> {
  loadEnvFile();
  process.env.PHASE6_MANUAL_TEST = "1";
  process.env.MATCHING_MANUAL_TEST = "1";

  const useMock =
    process.env.PHASE6_MANUAL_TEST_MOCK === "1" || !(await probeAirtable());

  if (useMock) {
    console.log(
      "[phase6-manual-test] Using in-memory Airtable mock (set real AIRTABLE_* in .env.local to hit live base).\n",
    );
  } else {
    console.log("[phase6-manual-test] Using live Airtable base.\n");
  }

  console.log("[phase6-manual-test] Using in-memory Stripe mock.\n");

  const { setAirtableClientForTests, createInMemoryAirtableClient, getAirtableClient } =
    await import("@/lib/airtable");
  if (useMock) {
    setAirtableClientForTests(createInMemoryAirtableClient());
  }

  const { setStripeClientForTests } = await import("@/lib/stripe/client");
  const stripeMock = createInMemoryStripeMock();
  setStripeClientForTests(stripeMock.client);

  const { createSetupIntentForJob } = await import("@/lib/payments/setup-intent");
  const { completeSetup } = await import("@/lib/payments/complete-setup");
  const { findPaymentByJobAndType } = await import("@/lib/payments/record");
  const { CANCELLATION_FEE_CENTS } = await import("@/lib/stripe/constants");
  const { getJobById } = await import("@/lib/jobs/lookup");
  const { handleServiceCommand } = await import("@/lib/service/handle-command");
  const { handleDriverInbound } = await import("@/lib/sms/driver-inbound");
  const { parseSmsCommand } = await import("@/lib/sms/parse-command");
  const { cancelJob } = await import("@/lib/cancellation/cancel-job");
  const { isLateCancellation } = await import("@/lib/cancellation/fee-window");
  const { runNoShowCheck } = await import("@/lib/no-show/check");
  const { reportNoShow } = await import("@/lib/no-show/report");
  const { approveNoShow } = await import("@/lib/no-show/approve");
  const { runDisputeRemind } = await import("@/lib/disputes/remind");
  const { disputeJob } = await import("@/lib/disputes/dispute");
  const { refundJob } = await import("@/lib/disputes/refund");
  const { setMechanicAvailability } = await import(
    "@/lib/mechanics/availability"
  );
  const { runStaleAvailabilityCheck } = await import(
    "@/lib/mechanics/stale-check"
  );
  const { markMechanicBusy } = await import("@/lib/matching/mechanic-update");
  const { declineQuote } = await import("@/lib/service/quote-response");

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
    const record = await client.createRecord("drivers", {
      ...driverSeedFields(RUN_ID, suffix, {
        phone_number: `+1555050${suffix.padStart(4, "0")}`,
        name: `Phase6 Test Driver ${RUN_ID}-${suffix}`,
      }),
    });
    created.drivers.push(record.id);
    return record.id;
  }

  async function seedMechanic(suffix: string): Promise<string> {
    const record = await client.createRecord("mechanics", {
      ...mechanicSeedFields(RUN_ID, suffix, {
        phone_number: `+1555060${suffix.padStart(4, "0")}`,
        name: `Phase6 Test Mech ${RUN_ID}-${suffix}`,
      }),
    });
    created.mechanics.push(record.id);
    return record.id;
  }

  async function seedJob(
    driverId: string,
    fields: Record<string, unknown> = {},
  ): Promise<string> {
    const record = await client.createRecord("jobs", {
      status: JOB_STATUS.draft,
      zip_code: TEST_ZIP,
      diagnosis_category: TEST_CATEGORY,
      service_type: "mobile_repair",
      vehicle_year: 2020,
      vehicle_make: "Toyota",
      vehicle_model: "Camry",
      driver_id: [driverId],
      ...fields,
    });
    created.jobs.push(record.id);
    return record.id;
  }

  async function countActionItemsForJob(
    jobId: string,
    type?: string,
  ): Promise<number> {
    const formula = actionItemJobFormula(jobId, type);
    const response = await client.listRecords("action-items", {
      filterByFormula: formula,
      maxRecords: 100,
    });
    const matched = response.records.filter((row) =>
      actionItemLinkedToJob(row, jobId),
    );
    for (const row of matched) {
      if (!created.actionItems.includes(row.id)) {
        created.actionItems.push(row.id);
      }
    }
    return matched.length;
  }

  async function prepareAcceptedJob(
    driverId: string,
    mechanicId: string,
  ): Promise<string> {
    const jobId = await seedJob(driverId, { mechanic_id: [mechanicId] });
    const { setupIntentId } = await createSetupIntentForJob(jobId);
    const setupIntent = stripeMock.succeedSetupIntent(setupIntentId);
    await completeSetup(setupIntent);
    await markMechanicBusy(mechanicId);
    await client.updateRecord("jobs", jobId, {
      status: JOB_STATUS.accepted_by_mechanic,
      mechanic_id: [mechanicId],
    });
    return jobId;
  }

  async function attachReceiptTotal(
    jobId: string,
    mechanicId: string,
    receiptTotal: number,
  ): Promise<void> {
    const { submitReceipt } = await import("@/lib/receipts/submit");
    await submitReceipt({
      jobId,
      mechanicId,
      receiptUrl: "https://res.cloudinary.com/veriium-test/receipt.jpg",
      source: "web",
    });
    const job = await getJobById(jobId);
    await client.updateRecord("jobs", jobId, {
      quote_details: stringifyQuoteDetails({
        ...parseQuoteDetails(job.fields.quote_details),
        receipt_total: receiptTotal,
      }),
    });
  }

  async function resetMechanicAvailable(mechanicId: string): Promise<void> {
    await client.updateRecord("mechanics", mechanicId, {
      availability_status: "available",
      last_assigned_at: null,
    });
  }

  console.log(`\n[phase6-manual-test] run=${RUN_ID}\n`);

  console.log("Unit checks:");
  await trackResult("fee-window: +48h early, +2h late", async () => {
    assert(!isLateCancellation(hoursFromNow(48)), "48h is not late");
    assert(isLateCancellation(hoursFromNow(2)), "2h is late");
  });

  await trackResult("parse-command: NOSHOW, APPROVE, 1/2", async () => {
    assert(parseSmsCommand("NOSHOW").kind === "noshow", "noshow");
    assert(
      parseSmsCommand("approve").kind === "driver_quote" &&
        (parseSmsCommand("approve") as { command: string }).command ===
          "APPROVE",
      "approve",
    );
    assert(
      (parseSmsCommand("1") as { command: string }).command === "DISPUTE",
      "1 dispute",
    );
    assert(
      (parseSmsCommand("2") as { command: string }).command === "CONFIRM",
      "2 confirm",
    );
  });

  const sharedDriverId = await seedDriver("01");
  const sharedMechanicId = await seedMechanic("01");

  console.log("\n1. Service transitions (ENROUTE → DONE):");
  await trackResult(
    "walk service SMS path with status + timestamps",
    async () => {
      await resetMechanicAvailable(sharedMechanicId);
      const jobId = await prepareAcceptedJob(sharedDriverId, sharedMechanicId);

      const steps: Array<{
        label: string;
        parsed: ReturnType<typeof parseSmsCommand>;
        expectedStatus: string;
      }> = [
        {
          label: "ENROUTE",
          parsed: parseSmsCommand("ENROUTE"),
          expectedStatus: JOB_STATUS.en_route,
        },
        {
          label: "ARRIVED",
          parsed: parseSmsCommand("ARRIVED"),
          expectedStatus: JOB_STATUS.arrived,
        },
        {
          label: "DIAGNOSING",
          parsed: parseSmsCommand("DIAGNOSING"),
          expectedStatus: JOB_STATUS.diagnosing,
        },
        {
          label: "QUOTE",
          parsed: parseSmsCommand("QUOTE $245 PARTS $80"),
          expectedStatus: JOB_STATUS.quote_provided,
        },
      ];

      for (const step of steps) {
        await handleServiceCommand(jobId, sharedMechanicId, step.parsed);
        const job = await getJobById(jobId);
        assert(
          job.fields.status === step.expectedStatus,
          `${step.label} status`,
        );
      }

      const jobBeforeApprove = await getJobById(jobId);
      assertQuoteSubmitted(jobBeforeApprove);
      await handleDriverInbound(
        jobBeforeApprove,
        parseSmsCommand("APPROVE"),
      );
      await attachReceiptTotal(jobId, sharedMechanicId, 80);
      let job = await getJobById(jobId);
      assert(job.fields.status === JOB_STATUS.awaiting_customer_approval, "awaiting_customer_approval");

      await handleServiceCommand(
        jobId,
        sharedMechanicId,
        parseSmsCommand("STARTED"),
      );
      job = await getJobById(jobId);
      assert(job.fields.status === JOB_STATUS.in_progress, "in_progress");

      await handleServiceCommand(
        jobId,
        sharedMechanicId,
        parseSmsCommand("DONE $245 PARTS $80"),
      );
      job = await getJobById(jobId);
      assert(
        job.fields.status === JOB_STATUS.completed_pending_confirmation,
        "completed_pending_confirmation",
      );
      assert(job.fields.final_price === 325, "final_price");
      assert((await countPaymentsByJobAndType(client, jobId, "final_pi")) === 1, "final PI");
    },
  );

  console.log("\n2. Quote decline:");
  await trackResult("DECLINE → cancelled + diagnostic fee PI", async () => {
    await resetMechanicAvailable(sharedMechanicId);
    const mechanicId = await seedMechanic("02");
    const driverId = await seedDriver("02");
    const jobId = await prepareAcceptedJob(driverId, mechanicId);

    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ENROUTE"));
    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ARRIVED"));
    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("DIAGNOSING"));
    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("QUOTE $150 PARTS $50"),
    );

    const result = await declineQuote(jobId);
    assert(result.status === JOB_STATUS.cancelled, "cancelled");
    assert((await countPaymentsByJobAndType(client, jobId, "diagnostic_fee")) === 1, "diagnostic PI");
  });

  console.log("\n2b. M6 USED parts consent:");
  await trackResult(
    "QUOTE USED → APPROVE → YES → STARTED → in_progress",
    async () => {
      await resetMechanicAvailable(sharedMechanicId);
      const mechanicId = await seedMechanic("02b");
      const driverId = await seedDriver("02b");
      const jobId = await prepareAcceptedJob(driverId, mechanicId);

      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ENROUTE"));
      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ARRIVED"));
      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("DIAGNOSING"));
      await handleServiceCommand(
        jobId,
        mechanicId,
        parseSmsCommand("QUOTE $245 PARTS $80 USED alt brake pads"),
      );

      let job = await getJobById(jobId);
      assertQuoteSubmitted(job);
      assert(jobDetails(job.fields).non_oem_or_used_parts === true, "non_oem_or_used_parts");
      assert(
        jobDetails(job.fields).non_oem_parts_description === "alt brake pads",
        "non_oem_parts_description",
      );

      await handleDriverInbound(job, parseSmsCommand("APPROVE"));
      job = await getJobById(jobId);
      assert(job.fields.status === JOB_STATUS.awaiting_customer_approval, "awaiting_customer_approval");

      await handleDriverInbound(job, parseSmsCommand("YES"));
      job = await getJobById(jobId);
      assert(Boolean(jobDetails(job.fields).non_oem_consent_at), "non_oem_consent_at");
      assert(job.fields.status === JOB_STATUS.awaiting_customer_approval, "awaiting_customer_approval after YES");

      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("STARTED"));
      job = await getJobById(jobId);
      assert(job.fields.status === JOB_STATUS.in_progress, "in_progress");
    },
  );

  await trackResult(
    "QUOTE USED ON_HAND → APPROVE → YES → in_progress",
    async () => {
      await resetMechanicAvailable(sharedMechanicId);
      const mechanicId = await seedMechanic("02c");
      const driverId = await seedDriver("02c");
      const jobId = await prepareAcceptedJob(driverId, mechanicId);

      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ENROUTE"));
      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ARRIVED"));
      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("DIAGNOSING"));
      await handleServiceCommand(
        jobId,
        mechanicId,
        parseSmsCommand("QUOTE $245 PARTS $80 USED ON_HAND"),
      );

      let job = await getJobById(jobId);
      assert(job.fields.quote_parts_on_hand === true, "on_hand");
      assert(jobDetails(job.fields).non_oem_or_used_parts === true, "non_oem_or_used_parts");

      await handleDriverInbound(job, parseSmsCommand("APPROVE"));
      job = await getJobById(jobId);
      assert(job.fields.status === JOB_STATUS.awaiting_customer_approval, "awaiting_customer_approval");

      await handleDriverInbound(job, parseSmsCommand("YES"));
      job = await getJobById(jobId);
      assert(job.fields.status === JOB_STATUS.in_progress, "in_progress after YES");
      assert(Boolean(jobDetails(job.fields).non_oem_consent_at), "non_oem_consent_at");
    },
  );

  console.log("\n3. Early cancel:");
  await trackResult("+48h appointment → cancel, no fee", async () => {
    await resetMechanicAvailable(sharedMechanicId);
    const driverId = await seedDriver("03");
    const mechanicId = await seedMechanic("03");
    const jobId = await seedJob(driverId, {
      status: JOB_STATUS.matched_awaiting_response,
      mechanic_id: [mechanicId],
      scheduled_time: hoursFromNow(48),
    });

    const result = await cancelJob(jobId);
    assert(result.feeCharged === false, "no fee");
    assert(result.status === JOB_STATUS.cancelled, "cancelled");
    assert((await countPaymentsByJobAndType(client, jobId, "cancellation_fee")) === 0, "no cancel PI");
  });

  console.log("\n4. Late cancel:");
  await trackResult("+2h appointment → cancel + $50 fee PI", async () => {
    await resetMechanicAvailable(sharedMechanicId);
    const driverId = await seedDriver("04");
    const mechanicId = await seedMechanic("04");
    const jobId = await prepareAcceptedJob(driverId, mechanicId);
    await client.updateRecord("jobs", jobId, {
      scheduled_time: hoursFromNow(2),
    });

    const result = await cancelJob(jobId);
    assert(result.feeCharged === true, "fee charged");
    assert(result.status === JOB_STATUS.cancelled, "cancelled");

    const payment = await findPaymentByJobAndType(jobId, "cancellation_fee");
    assert(payment?.fields.type === "cancellation_fee", "cancellation_fee");
    assert(
      payment?.fields.amount === CANCELLATION_FEE_CENTS / 100,
      "amount $50",
    );
  });

  console.log("\n4b. Late cancel after parts purchase:");
  await trackResult(
    "approve + receipt → cancel within 24h → $50 fee + parts PI",
    async () => {
      await resetMechanicAvailable(sharedMechanicId);
      const driverId = await seedDriver("04b");
      const mechanicId = await seedMechanic("04b");
      const jobId = await prepareAcceptedJob(driverId, mechanicId);
      const receiptTotal = 82.5;

      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ENROUTE"));
      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ARRIVED"));
      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("DIAGNOSING"));
      await handleServiceCommand(
        jobId,
        mechanicId,
        parseSmsCommand("QUOTE $245 PARTS $80"),
      );

      const jobBeforeApprove = await getJobById(jobId);
      await handleDriverInbound(
        jobBeforeApprove,
        parseSmsCommand("APPROVE"),
      );
      await attachReceiptTotal(jobId, mechanicId, receiptTotal);
      await client.updateRecord("jobs", jobId, {
        scheduled_time: hoursFromNow(2),
      });

      const result = await cancelJob(jobId);
      assert(result.feeCharged === true, "fee charged");
      assert(result.partsCharged === true, "parts charged");
      assert(result.partsChargeAmount === receiptTotal, "parts amount");
      assert(result.status === JOB_STATUS.cancelled, "cancelled");

      const feePayment = await findPaymentByJobAndType(jobId, "cancellation_fee");
      assert(feePayment?.fields.type === "cancellation_fee", "cancellation_fee");
      assert(
        feePayment?.fields.amount === CANCELLATION_FEE_CENTS / 100,
        "fee amount $50",
      );
    },
  );

  await trackResult(
    "+48h appointment + receipt → cancel, parts only (no fee)",
    async () => {
      await resetMechanicAvailable(sharedMechanicId);
      const driverId = await seedDriver("04c");
      const mechanicId = await seedMechanic("04c");
      const jobId = await prepareAcceptedJob(driverId, mechanicId);
      const receiptTotal = 65;

      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ENROUTE"));
      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ARRIVED"));
      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("DIAGNOSING"));
      await handleServiceCommand(
        jobId,
        mechanicId,
        parseSmsCommand("QUOTE $200 PARTS $60"),
      );

      const jobBeforeApprove = await getJobById(jobId);
      await handleDriverInbound(
        jobBeforeApprove,
        parseSmsCommand("APPROVE"),
      );
      await attachReceiptTotal(jobId, mechanicId, receiptTotal);
      await client.updateRecord("jobs", jobId, {
        scheduled_time: hoursFromNow(48),
      });

      const result = await cancelJob(jobId);
      assert(result.feeCharged === false, "no fee");
      assert(result.partsCharged === true, "parts charged");
      assert(result.partsChargeAmount === receiptTotal, "parts amount");
      assert((await countPaymentsByJobAndType(client, jobId, "cancellation_fee")) === 1, "parts PI");
    },
  );

  console.log("\n5. No-show:");
  await trackResult(
    "ARRIVED → check worker → NOSHOW → admin approve → cancelled",
    async () => {
      await resetMechanicAvailable(sharedMechanicId);
      const driverId = await seedDriver("05");
      const mechanicId = await seedMechanic("05");
      const jobId = await prepareAcceptedJob(driverId, mechanicId);

      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ENROUTE"));
      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ARRIVED"));

      const checkResult = await runNoShowCheck(jobId);
      assert(
        checkResult.action === "no_show_eligible_notified",
        "no-show check notified",
      );

      const backdatedArrived = new Date(
        Date.now() - 20_000,
      ).toISOString();
      await client.updateRecord("jobs", jobId, {
        quote_details: stringifyQuoteDetails({ arrived_at: backdatedArrived }),
      });

      const reportResult = await reportNoShow(jobId, mechanicId);
      assert(
        reportResult.status === JOB_STATUS.no_show_pending_review,
        "no_show_pending_review",
      );
      assert(
        (await countActionItemsForJob(jobId, ACTION_ITEM_TYPE.NO_SHOW_REPORT)) >= 1,
        "no_show action item",
      );

      const approveResult = await approveNoShow(jobId);
      assert(approveResult.status === JOB_STATUS.cancelled, "cancelled after approve");
      assert((await countPaymentsByJobAndType(client, jobId, "cancellation_fee")) === 1, "fee PI");
    },
  );

  console.log("\n6. Dispute reminders:");
  await trackResult(
    "DONE → three reminder workers → action items",
    async () => {
      await resetMechanicAvailable(sharedMechanicId);
      const driverId = await seedDriver("06");
      const mechanicId = await seedMechanic("06");
      const jobId = await prepareAcceptedJob(driverId, mechanicId);

      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ENROUTE"));
      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ARRIVED"));
      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("DIAGNOSING"));
      await handleServiceCommand(
        jobId,
        mechanicId,
        parseSmsCommand("QUOTE $200 PARTS $40"),
      );
      const quoted = await getJobById(jobId);
      await handleDriverInbound(quoted, parseSmsCommand("APPROVE"));
      await attachReceiptTotal(jobId, mechanicId, 40);
      await handleServiceCommand(jobId, mechanicId, parseSmsCommand("STARTED"));
      await handleServiceCommand(
        jobId,
        mechanicId,
        parseSmsCommand("DONE $200 PARTS $40"),
      );

      for (const reminder of [24, 48, 72] as const) {
        const result = await runDisputeRemind(jobId, reminder);
        assert(
          result.action === "dispute_reminder_sent",
          `reminder ${reminder}h sent`,
        );
      }

      assert(
        (await countActionItemsForJob(jobId, ACTION_ITEM_TYPE.OPEN_DISPUTE)) >= 1,
        "24h action item",
      );
      assert(
        (await countActionItemsForJob(jobId, ACTION_ITEM_TYPE.OPEN_DISPUTE)) >= 1,
        "48h action item",
      );
      assert(
        (await countActionItemsForJob(jobId, ACTION_ITEM_TYPE.DRIVER_NON_RESPONSE_72H)) >= 1,
        "72h action item",
      );
    },
  );

  console.log("\n7. Driver confirm:");
  await trackResult("reply 2 → capture + confirmed", async () => {
    await resetMechanicAvailable(sharedMechanicId);
    const driverId = await seedDriver("07");
    const mechanicId = await seedMechanic("07");
    const jobId = await prepareAcceptedJob(driverId, mechanicId);

    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ENROUTE"));
    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ARRIVED"));
    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("DIAGNOSING"));
    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("QUOTE $180 PARTS $30"),
    );
    const quoted = await getJobById(jobId);
    await handleDriverInbound(quoted, parseSmsCommand("APPROVE"));
    await attachReceiptTotal(jobId, mechanicId, 30);
    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("STARTED"));
    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("DONE $180 PARTS $30"),
    );

    const pending = await getJobById(jobId);
    const result = await handleDriverInbound(
      pending,
      parseSmsCommand("2"),
    );
    assert(result.status === JOB_STATUS.confirmed, "confirmed");
    assert((await getJobById(jobId)).fields.status === JOB_STATUS.confirmed, "confirmed status");

    const payment = await findPaymentByJobAndType(jobId, "final_pi");
    assert(payment?.fields.status === "succeeded", "final PI captured");
  });

  console.log("\n8. Driver dispute:");
  await trackResult("reply 1 → disputed + action item", async () => {
    await resetMechanicAvailable(sharedMechanicId);
    const driverId = await seedDriver("08");
    const mechanicId = await seedMechanic("08");
    const jobId = await prepareAcceptedJob(driverId, mechanicId);

    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ENROUTE"));
    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ARRIVED"));
    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("DIAGNOSING"));
    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("QUOTE $190 PARTS $35"),
    );
    const quoted = await getJobById(jobId);
    await handleDriverInbound(quoted, parseSmsCommand("APPROVE"));
    await attachReceiptTotal(jobId, mechanicId, 35);
    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("STARTED"));
    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("DONE $190 PARTS $35"),
    );

    const result = await disputeJob(jobId);
    assert(result.status === JOB_STATUS.disputed, "disputed");
    assert((await getJobById(jobId)).fields.status === JOB_STATUS.disputed, "disputed status");
    assert((await countActionItemsForJob(jobId, ACTION_ITEM_TYPE.OPEN_DISPUTE)) >= 1, "dispute action item");
  });

  console.log("\n9. Admin refund:");
  await trackResult("disputed → refund → refunded", async () => {
    await resetMechanicAvailable(sharedMechanicId);
    const driverId = await seedDriver("09");
    const mechanicId = await seedMechanic("09");
    const jobId = await prepareAcceptedJob(driverId, mechanicId);

    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ENROUTE"));
    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("ARRIVED"));
    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("DIAGNOSING"));
    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("QUOTE $175 PARTS $25"),
    );
    const quoted = await getJobById(jobId);
    await handleDriverInbound(quoted, parseSmsCommand("APPROVE"));
    await attachReceiptTotal(jobId, mechanicId, 25);
    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("STARTED"));
    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("DONE $175 PARTS $25"),
    );
    await disputeJob(jobId);

    const result = await refundJob(jobId);
    assert(result.status === JOB_STATUS.refunded, "refunded");

    const payment = await findPaymentByJobAndType(jobId, "final_pi");
    assert(payment?.fields.status === "canceled", "final PI released");
  });

  console.log("\n10. Stale availability:");
  await trackResult(
    "toggle ON → backdated timestamp → stale worker",
    async () => {
      const mechanicId = await seedMechanic("10");
      await resetMechanicAvailable(mechanicId);

      const toggle = await setMechanicAvailability(mechanicId, true);
      assert(toggle.availabilityStatus === "available", "available");

      const staleTimestamp = new Date(
        Date.now() - 8 * 24 * 60 * 60 * 1000,
      ).toISOString();
      await client.updateRecord("mechanics", mechanicId, {
        availability_updated_at: staleTimestamp,
      });

      const result = await runStaleAvailabilityCheck(mechanicId);
      assert(result.action === "marked_stale", "marked_stale");

      const mechanic = await client.getRecord<MechanicFields>("mechanics", mechanicId);
      assert(
        mechanic.fields.availability_status === "offline",
        "availability_status offline",
      );
    },
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);

  console.log(`\n[phase6-manual-test] ${passed}/${results.length} passed`);

  setStripeClientForTests(undefined);

  if (process.env.PHASE6_MANUAL_TEST_KEEP !== "1" && !useMock) {
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
      `\nPHASE6_MANUAL_TEST_KEEP=1 — retained jobs=[${created.jobs.join(", ")}]`,
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
  console.error("[phase6-manual-test] Fatal:", error);
  process.exit(1);
});
