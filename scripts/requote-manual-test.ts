/**
 * M4 manual test: REQUOTE flow + parts tolerance at DONE.
 *
 * Usage:
 *   npm run requote:manual-test
 *
 * Optional env:
 *   REQUOTE_MANUAL_TEST_KEEP=1 — skip cleanup of seeded rows (live Airtable only).
 *   REQUOTE_TIMEOUT_SECONDS=1 — shorten timeout worker delay for local runs.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type Stripe from "stripe";

import {
  assertRequoteSubmitted,
  driverSeedFields,
  JOB_STATUS,
  jobDetails,
  mechanicSeedFields,
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

type SendSmsResult = {
  sid: string;
  status: string;
  to: string;
  body: string;
};

const created = {
  drivers: [] as string[],
  mechanics: [] as string[],
  jobs: [] as string[],
  payments: [] as string[],
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
    console.warn("[requote-manual-test] No .env.local found; using process.env only.");
  }

  const defaults: Record<string, string> = {
    AIRTABLE_API_KEY: "manual-test-airtable-placeholder",
    AIRTABLE_BASE_ID: "appManualTest",
    AIRTABLE_TABLE_DRIVERS: "tblDrivers",
    AIRTABLE_TABLE_MECHANICS: "tblMechanics",
    AIRTABLE_TABLE_JOBS: "tblJobs",
    AIRTABLE_TABLE_PAYMENTS: "tblPayments",
    QSTASH_TOKEN: "manual-test-qstash-placeholder",
    QSTASH_CURRENT_SIGNING_KEY: "manual-test-qstash-current",
    QSTASH_NEXT_SIGNING_KEY: "manual-test-qstash-next",
    APP_URL: "http://localhost:3000",
    TWILIO_ACCOUNT_SID: "ACmanualtest",
    TWILIO_AUTH_TOKEN: "manual-test-twilio-token",
    TWILIO_MESSAGING_SERVICE_SID: "MGmanualtest",
    TWILIO_VERIFY_SERVICE_SID: "VAmanualtest",
    AIRTABLE_WEBHOOK_SECRET: "manual-test-airtable-webhook-secret",
    OPENAI_API_KEY: "manual-test-openai-placeholder",
    SIGNED_URL_SECRET: "manual-test-signed-url-secret-32ch",
    VERIIUM_ADMIN_PHONE: "+15559990001",
    MATCHING_DEV_SECRET: "manual-test-matching-secret",
    STRIPE_SECRET_KEY: "sk_test_manual_test_placeholder",
    STRIPE_WEBHOOK_SECRET: "whsec_manual_test_placeholder",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_manual_test_placeholder",
    REQUOTE_MANUAL_TEST: "1",
    REQUOTE_TIMEOUT_SECONDS: "1",
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

function createMinimalStripeMock(): Stripe {
  const paymentMethods = new Map<string, Stripe.PaymentMethod>();
  const customers = new Map<string, Stripe.Customer>();
  let nextId = 0;

  function next(prefix: string): string {
    nextId += 1;
    return `${prefix}_${RUN_ID}_${nextId}`;
  }

  function ensureCustomer(customerId: string): Stripe.Customer {
    let customer = customers.get(customerId);
    if (!customer) {
      const pmId = next("pm");
      paymentMethods.set(pmId, {
        id: pmId,
        object: "payment_method",
        type: "card",
        customer: customerId,
      } as Stripe.PaymentMethod);
      customer = {
        id: customerId,
        object: "customer",
        invoice_settings: { default_payment_method: pmId },
      } as Stripe.Customer;
      customers.set(customerId, customer);
    }
    return customer;
  }

  return {
    customers: {
      retrieve: async (id: string) => ensureCustomer(id),
    },
    paymentIntents: {
      create: async (params: Stripe.PaymentIntentCreateParams) => ({
        id: next("pi"),
        object: "payment_intent",
        amount: params.amount ?? 0,
        currency: params.currency ?? "usd",
        status: "succeeded",
        customer: params.customer,
        payment_method: params.payment_method,
        metadata: params.metadata ?? {},
        latest_charge: next("ch"),
      }),
      retrieve: async (id: string) => ({
        id,
        object: "payment_intent",
        status: "requires_capture",
        amount: 32500,
      }),
      capture: async (id: string) => ({
        id,
        object: "payment_intent",
        status: "succeeded",
      }),
    },
    paymentMethods: {
      list: async (params: Stripe.PaymentMethodListParams) => ({
        object: "list",
        data: [...paymentMethods.values()].filter(
          (pm) => pm.customer === params.customer,
        ),
        has_more: false,
        url: "",
      }),
    },
  } as unknown as Stripe;
}

function stripeCustomerId(suffix: string): string {
  return `cus_${RUN_ID}_${suffix}`;
}

const results: TestResult[] = [];

async function trackResult(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, detail });
    console.log(`  ✗ ${name}: ${detail}`);
  }
}

function clearSmsLog(): void {
  (globalThis as { __manualTestSmsLog?: SendSmsResult[] }).__manualTestSmsLog =
    [];
}

function getSmsLog(): SendSmsResult[] {
  return (
    (globalThis as { __manualTestSmsLog?: SendSmsResult[] }).__manualTestSmsLog ??
    []
  );
}

async function main(): Promise<void> {
  loadEnvFile();
  clearSmsLog();

  const useLiveAirtable =
    process.env.REQUOTE_MANUAL_TEST_MOCK !== "1" && (await probeAirtable());

  if (!useLiveAirtable) {
    const { createInMemoryAirtableClient, setAirtableClientForTests } =
      await import("@/lib/airtable");
    setAirtableClientForTests(createInMemoryAirtableClient());
    console.log("[requote-manual-test] Using in-memory Airtable mock.");
  } else {
    console.log("[requote-manual-test] Using live Airtable base.");
  }

  const { setStripeClientForTests } = await import("@/lib/stripe/client");
  setStripeClientForTests(createMinimalStripeMock());

  const { getAirtableClient } = await import("@/lib/airtable");
  const client = getAirtableClient();

  const { parseSmsCommand } = await import("@/lib/sms/parse-command");
  const { handleServiceCommand } = await import("@/lib/service/handle-command");
  const { getJobById } = await import("@/lib/jobs/lookup");
  const { approveRequote } = await import("@/lib/service/requote-response");
  const { runRequoteTimeoutCheck } = await import("@/lib/requotes/timeout-check");
  const { findPaymentByJobAndType } = await import("@/lib/payments/record");
  const { DIAGNOSTIC_FEE_CENTS } = await import("@/lib/stripe/constants");
  const { InvalidServiceCommandError } = await import("@/lib/service/errors");

  async function seedDriver(suffix: string): Promise<string> {
    const record = await client.createRecord("drivers", {
      ...driverSeedFields(RUN_ID, suffix, {
        phone_number: `+1555080${suffix.padStart(4, "0")}`,
        name: `Requote Test Driver ${RUN_ID}-${suffix}`,
        stripe_customer_id: stripeCustomerId(suffix),
      }),
    });
    created.drivers.push(record.id);
    return record.id;
  }

  async function seedMechanic(suffix: string): Promise<string> {
    const record = await client.createRecord("mechanics", {
      ...mechanicSeedFields(RUN_ID, suffix, {
        phone_number: `+1555081${suffix.padStart(4, "0")}`,
        name: `Requote Test Mech ${RUN_ID}-${suffix}`,
      }),
    });
    created.mechanics.push(record.id);
    return record.id;
  }

  async function seedInProgressJob(
    driverId: string,
    mechanicId: string,
    fields: Record<string, unknown> = {},
  ): Promise<string> {
    const { quote_details: quoteDetailsOverride, ...rest } = fields;
    const record = await client.createRecord("jobs", {
      status: JOB_STATUS.in_progress,
      zip_code: TEST_ZIP,
      diagnosis_category: TEST_CATEGORY,
      service_type: "mobile_repair",
      vehicle_year: 2020,
      vehicle_make: "Toyota",
      vehicle_model: "Camry",
      driver_id: [driverId],
      mechanic_id: [mechanicId],
      quote_total: 245,
      parts_cost: 80,
      final_price: 325,
      mechanic_payout: 288.25,
      platform_fee: 36.75,
      quote_details: stringifyQuoteDetails({
        original_parts_cost: 80,
        in_progress_at: new Date().toISOString(),
        ...(typeof quoteDetailsOverride === "object" && quoteDetailsOverride !== null
          ? (quoteDetailsOverride as Record<string, unknown>)
          : {}),
      }),
      ...rest,
    });
    created.jobs.push(record.id);
    return record.id;
  }

  console.log(`\n[requote-manual-test] run=${RUN_ID}\n`);

  console.log("1. REQUOTE happy path:");
  await trackResult("in_progress → requote_submitted → APPROVE", async () => {
    clearSmsLog();
    const driverId = await seedDriver("01");
    const mechanicId = await seedMechanic("01");
    const jobId = await seedInProgressJob(driverId, mechanicId);

    const result = await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("REQUOTE PARTS $120 wrong part number"),
    );

    assert(result.action === "requote_submitted", "requote_submitted");

    const pending = await getJobById(jobId);
    assertRequoteSubmitted(pending);
    assert(pending.fields.parts_cost === 120, "pending parts_cost");
    assert(Boolean(jobDetails(pending.fields).requote_timeout_qstash_id), "timeout set");
    assert(getSmsLog().length === 1, "driver SMS");
    assert(getSmsLog()[0]?.body.includes("revised"), "requote SMS");

    const approved = await approveRequote(jobId);
    assert(approved.action === "in_progress", "back to in_progress");

    const job = await getJobById(jobId);
    assert(job.fields.parts_cost === 120, "approved parts_cost");
    assert(job.fields.status === JOB_STATUS.in_progress, "back in progress");
  });

  console.log("\n2. REQUOTE auto-decline:");
  await trackResult("timeout → cancelled + diagnostic + installed parts", async () => {
    clearSmsLog();
    const driverId = await seedDriver("02");
    const mechanicId = await seedMechanic("02");
    const jobId = await seedInProgressJob(driverId, mechanicId, {
      quote_details: {
        receipt_status: "submitted",
        receipt_total: 60,
      },
    });

    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("REQUOTE PARTS $120 price increase"),
    );

    const check = await runRequoteTimeoutCheck(jobId);
    assert(check.action === "cancelled", "cancelled");

    const job = await getJobById(jobId);
    assert(job.fields.status === JOB_STATUS.cancelled, "status cancelled");

    const diagnostic = await findPaymentByJobAndType(jobId, "diagnostic_fee");
    assert(diagnostic !== null, "diagnostic payment");
    assert(diagnostic.fields.amount === DIAGNOSTIC_FEE_CENTS / 100, "$35");

    const installed = await findPaymentByJobAndType(jobId, "final_pi");
    assert(installed !== null, "installed parts payment");
    assert(installed.fields.amount === 60, "installed parts amount");
  });

  console.log("\n3. DONE blocked over tolerance:");
  await trackResult("receipt exceeds band without requote", async () => {
    const driverId = await seedDriver("03");
    const mechanicId = await seedMechanic("03");
    const jobId = await seedInProgressJob(driverId, mechanicId, {
      quote_details: {
        receipt_status: "submitted",
        receipt_total: 120,
      },
    });

    let blocked = false;
    try {
      await handleServiceCommand(
        jobId,
        mechanicId,
        parseSmsCommand("DONE $245 PARTS $80"),
      );
    } catch (error) {
      blocked =
        error instanceof InvalidServiceCommandError &&
        error.command.includes("requote required");
    }
    assert(blocked, "DONE blocked");
  });

  console.log("\n4. DONE within tolerance variance SMS:");
  await trackResult("receipt $95 vs quote $80 discloses variance", async () => {
    clearSmsLog();
    const driverId = await seedDriver("04");
    const mechanicId = await seedMechanic("04");
    const jobId = await seedInProgressJob(driverId, mechanicId, {
      quote_details: {
        receipt_status: "submitted",
        receipt_total: 95,
      },
    });

    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("DONE $245 PARTS $80"),
    );

    const doneSms = getSmsLog().find((m) => m.body.includes("within allowed tolerance"));
    assert(Boolean(doneSms), "variance disclosed in DONE SMS");

    const job = await getJobById(jobId);
    assert(job.fields.parts_cost === 95, "parts_cost reconciled to receipt");
    assert(jobDetails(job.fields).parts_variance === 15, "variance stored");
  });

  console.log("\n5. DONE Case A — receipt below quote:");
  await trackResult("receipt $70 → final_price uses receipt parts", async () => {
    const driverId = await seedDriver("05");
    const mechanicId = await seedMechanic("05");
    const jobId = await seedInProgressJob(driverId, mechanicId, {
      quote_details: {
        receipt_status: "submitted",
        receipt_total: 70,
      },
    });

    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("DONE $245 PARTS $80"),
    );

    const job = await getJobById(jobId);
    assert(job.fields.parts_cost === 70, "parts_cost from receipt");
    assert(job.fields.final_price === 315, "final_price = labor + receipt parts");

    const payment = await findPaymentByJobAndType(jobId, "final_pi");
    assert(payment !== null, "final PI row");
    assert(payment.fields.amount === 315, "PI amount matches reconciled total");
  });

  if (useLiveAirtable && process.env.REQUOTE_MANUAL_TEST_KEEP !== "1") {
    const baseId = process.env.AIRTABLE_BASE_ID!;
    const apiKey = process.env.AIRTABLE_API_KEY!;
    const tableIds = {
      mechanics: process.env.AIRTABLE_TABLE_MECHANICS!,
      drivers: process.env.AIRTABLE_TABLE_DRIVERS!,
      jobs: process.env.AIRTABLE_TABLE_JOBS!,
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

    for (const id of created.payments) {
      await deleteRow(tableIds.payments, id);
    }
    for (const id of created.jobs) {
      await deleteRow(tableIds.jobs, id);
    }
    for (const id of created.mechanics) {
      await deleteRow(tableIds.mechanics, id);
    }
    for (const id of created.drivers) {
      await deleteRow(tableIds.drivers, id);
    }
    console.log("  Seeded rows deleted.");
  } else if (!useLiveAirtable) {
    console.log("\nIn-memory mock — no persistent rows to clean up.");
  }

  const { setStripeClientForTests: resetStripe } = await import("@/lib/stripe/client");
  resetStripe(undefined);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n[requote-manual-test] ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[requote-manual-test] Fatal:", error);
  process.exit(1);
});
