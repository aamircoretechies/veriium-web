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
  const { findPaymentByIdempotencyKey } = await import("@/lib/payments/record");
  const { cancelKey, diagnosticKey, finalKey } = await import(
    "@/lib/stripe/idempotency"
  );
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
    const phone = `+1555050${suffix.padStart(4, "0")}`;
    const record = await client.createRecord("drivers", {
      phone,
      name: `Phase6 Test Driver ${RUN_ID}-${suffix}`,
    });
    created.drivers.push(record.id);
    return record.id;
  }

  async function seedMechanic(suffix: string): Promise<string> {
    const phone = `+1555060${suffix.padStart(4, "0")}`;
    const record = await client.createRecord("mechanics", {
      status: "approved",
      full_name: `Phase6 Test Mech ${RUN_ID}-${suffix}`,
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

  async function countActionItemsForJob(
    jobId: string,
    type?: string,
  ): Promise<number> {
    const typeFilter = type ? `, {type} = '${type}'` : "";
    const formula = `AND(FIND('${jobId}', ARRAYJOIN({job}, ',')), {status} = 'open'${typeFilter})`;
    const response = await client.listRecords("action-items", {
      filterByFormula: formula,
      maxRecords: 20,
    });
    for (const row of response.records) {
      if (!created.actionItems.includes(row.id)) {
        created.actionItems.push(row.id);
      }
    }
    return response.records.length;
  }

  async function prepareAcceptedJob(
    driverId: string,
    mechanicId: string,
  ): Promise<string> {
    const jobId = await seedJob(driverId, { mechanic: [mechanicId] });
    const { setupIntentId } = await createSetupIntentForJob(jobId);
    const setupIntent = stripeMock.succeedSetupIntent(setupIntentId);
    await completeSetup(setupIntent);
    await markMechanicBusy(mechanicId);
    await client.updateRecord("jobs", jobId, {
      status: "accepted_by_mechanic",
      mechanic: [mechanicId],
      accepted_at: new Date().toISOString(),
    });
    return jobId;
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
        timestampField?: string;
      }> = [
        {
          label: "ENROUTE",
          parsed: parseSmsCommand("ENROUTE"),
          expectedStatus: "en_route",
          timestampField: "en_route_at",
        },
        {
          label: "ARRIVED",
          parsed: parseSmsCommand("ARRIVED"),
          expectedStatus: "arrived",
          timestampField: "arrived_at",
        },
        {
          label: "DIAGNOSING",
          parsed: parseSmsCommand("DIAGNOSING"),
          expectedStatus: "diagnosing",
          timestampField: "diagnosing_at",
        },
        {
          label: "QUOTE",
          parsed: parseSmsCommand("QUOTE $245 PARTS $80"),
          expectedStatus: "quote_submitted",
          timestampField: "quote_submitted_at",
        },
      ];

      for (const step of steps) {
        await handleServiceCommand(jobId, sharedMechanicId, step.parsed);
        const job = await getJobById(jobId);
        assert(
          job.fields.status === step.expectedStatus,
          `${step.label} status`,
        );
        if (step.timestampField) {
          assert(
            Boolean(
              job.fields[step.timestampField as keyof typeof job.fields],
            ),
            `${step.label} timestamp`,
          );
        }
      }

      const jobBeforeApprove = await getJobById(jobId);
      await handleDriverInbound(
        jobBeforeApprove,
        parseSmsCommand("APPROVE"),
      );
      let job = await getJobById(jobId);
      assert(job.fields.status === "quote_approved", "quote_approved");
      assert(Boolean(job.fields.quote_approved_at), "quote_approved_at");

      await handleServiceCommand(
        jobId,
        sharedMechanicId,
        parseSmsCommand("STARTED"),
      );
      job = await getJobById(jobId);
      assert(job.fields.status === "in_progress", "in_progress");
      assert(Boolean(job.fields.in_progress_at), "in_progress_at");

      await handleServiceCommand(
        jobId,
        sharedMechanicId,
        parseSmsCommand("DONE $245 PARTS $80"),
      );
      job = await getJobById(jobId);
      assert(
        job.fields.status === "completed_pending_confirmation",
        "completed_pending_confirmation",
      );
      assert(Boolean(job.fields.completed_at), "completed_at");
      assert(job.fields.final_price === 325, "final_price");
      assert((await countPaymentsByKey(finalKey(jobId))) === 1, "final PI");
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
    assert(result.status === "cancelled", "cancelled");
    assert((await countPaymentsByKey(diagnosticKey(jobId))) === 1, "diagnostic PI");
  });

  console.log("\n3. Early cancel:");
  await trackResult("+48h appointment → cancel, no fee", async () => {
    await resetMechanicAvailable(sharedMechanicId);
    const driverId = await seedDriver("03");
    const mechanicId = await seedMechanic("03");
    const jobId = await seedJob(driverId, {
      status: "matched",
      mechanic: [mechanicId],
      appointment_window_start: hoursFromNow(48),
    });

    const result = await cancelJob(jobId);
    assert(result.feeCharged === false, "no fee");
    assert(result.status === "cancelled", "cancelled");
    assert((await countPaymentsByKey(cancelKey(jobId))) === 0, "no cancel PI");
  });

  console.log("\n4. Late cancel:");
  await trackResult("+2h appointment → cancel + $50 fee PI", async () => {
    await resetMechanicAvailable(sharedMechanicId);
    const driverId = await seedDriver("04");
    const mechanicId = await seedMechanic("04");
    const jobId = await prepareAcceptedJob(driverId, mechanicId);
    await client.updateRecord("jobs", jobId, {
      appointment_window_start: hoursFromNow(2),
    });

    const result = await cancelJob(jobId);
    assert(result.feeCharged === true, "fee charged");
    assert(result.status === "cancelled", "cancelled");

    const payment = await findPaymentByIdempotencyKey(cancelKey(jobId));
    assert(payment?.fields.type === "cancellation_fee", "cancellation_fee");
    assert(
      payment?.fields.amount === CANCELLATION_FEE_CENTS / 100,
      "amount $50",
    );
  });

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
        arrived_at: backdatedArrived,
      });

      const reportResult = await reportNoShow(jobId, mechanicId);
      assert(
        reportResult.status === "no_show_pending_review",
        "no_show_pending_review",
      );
      assert(
        (await countActionItemsForJob(jobId, "no_show_pending_review")) >= 1,
        "no_show action item",
      );

      const approveResult = await approveNoShow(jobId);
      assert(approveResult.status === "cancelled", "cancelled after approve");
      assert((await countPaymentsByKey(cancelKey(jobId))) === 1, "fee PI");
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
        (await countActionItemsForJob(jobId, "dispute_reminder_24h")) >= 1,
        "24h action item",
      );
      assert(
        (await countActionItemsForJob(jobId, "dispute_reminder_48h")) >= 1,
        "48h action item",
      );
      assert(
        (await countActionItemsForJob(jobId, "dispute_reminder_72h")) >= 1,
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
    assert(result.status === "confirmed", "confirmed");
    assert(Boolean((await getJobById(jobId)).fields.confirmed_at), "confirmed_at");

    const payment = await findPaymentByIdempotencyKey(finalKey(jobId));
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
    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("STARTED"));
    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("DONE $190 PARTS $35"),
    );

    const result = await disputeJob(jobId);
    assert(result.status === "disputed", "disputed");
    assert(Boolean((await getJobById(jobId)).fields.disputed_at), "disputed_at");
    assert((await countActionItemsForJob(jobId, "dispute")) >= 1, "dispute action item");
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
    await handleServiceCommand(jobId, mechanicId, parseSmsCommand("STARTED"));
    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("DONE $175 PARTS $25"),
    );
    await disputeJob(jobId);

    const result = await refundJob(jobId);
    assert(result.status === "refunded", "refunded");

    const payment = await findPaymentByIdempotencyKey(finalKey(jobId));
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
        mechanic.fields.availability_status === "stale",
        "availability_status stale",
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
