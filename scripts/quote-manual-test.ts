/**
 * M3 manual test: $500 parts pre-approval + 2-hour quote auto-decline.
 *
 * Usage:
 *   npm run quote:manual-test
 *
 * Modes:
 *   Default — in-memory Airtable + in-memory Stripe (no API keys required).
 *
 * Optional env:
 *   QUOTE_MANUAL_TEST_KEEP=1 — skip cleanup of seeded rows (live Airtable only).
 *   QUOTE_TIMEOUT_SECONDS=1 — shorten timeout worker delay for local runs.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type Stripe from "stripe";

import {
  ACTION_ITEM_TYPE,
  actionItemJobFormula,
  assertQuotePendingAdmin,
  assertQuoteSubmitted,
  driverSeedFields,
  JOB_STATUS,
  jobDetails,
  mechanicSeedFields,
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
    console.warn("[quote-manual-test] No .env.local found; using process.env only.");
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
    AIRTABLE_WEBHOOK_SECRET: "manual-test-airtable-webhook-secret",
    OPENAI_API_KEY: "manual-test-openai-placeholder",
    SIGNED_URL_SECRET: "manual-test-signed-url-secret-32ch",
    VERIIUM_ADMIN_PHONE: "+15559990001",
    MATCHING_DEV_SECRET: "manual-test-matching-secret",
    STRIPE_SECRET_KEY: "sk_test_manual_test_placeholder",
    STRIPE_WEBHOOK_SECRET: "whsec_manual_test_placeholder",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_manual_test_placeholder",
    QUOTE_MANUAL_TEST: "1",
    MATCHING_MANUAL_TEST: "1",
    QUOTE_TIMEOUT_SECONDS: "1",
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
    process.env.QUOTE_MANUAL_TEST_MOCK !== "1" && (await probeAirtable());

  if (!useLiveAirtable) {
    const { createInMemoryAirtableClient, setAirtableClientForTests } =
      await import("@/lib/airtable");
    setAirtableClientForTests(createInMemoryAirtableClient());
    console.log("[quote-manual-test] Using in-memory Airtable mock.");
  } else {
    console.log("[quote-manual-test] Using live Airtable base.");
  }

  const { setStripeClientForTests } = await import("@/lib/stripe/client");
  setStripeClientForTests(createMinimalStripeMock());

  const { getAirtableClient } = await import("@/lib/airtable");
  const client = getAirtableClient();

  const { parseSmsCommand } = await import("@/lib/sms/parse-command");
  const { handleServiceCommand } = await import("@/lib/service/handle-command");
  const { getJobById } = await import("@/lib/jobs/lookup");
  const { approveQuote } = await import("@/lib/service/quote-response");
  const { approveQuoteParts } = await import("@/lib/quotes/approve-parts");
  const { runQuoteTimeoutCheck } = await import("@/lib/quotes/timeout-check");
  const { findPaymentByJobAndType } = await import("@/lib/payments/record");
  const { DIAGNOSTIC_FEE_CENTS } = await import("@/lib/stripe/constants");
  const { POST: airtableJobsWebhook } = await import(
    "@/app/api/webhooks/airtable/jobs/route"
  );

  async function seedDriver(suffix: string): Promise<string> {
    const record = await client.createRecord("drivers", {
      ...driverSeedFields(RUN_ID, suffix, {
        phone_number: `+1555090${suffix.padStart(4, "0")}`,
        name: `Quote Test Driver ${RUN_ID}-${suffix}`,
        stripe_customer_id: stripeCustomerId(suffix),
      }),
    });
    created.drivers.push(record.id);
    return record.id;
  }

  async function seedMechanic(suffix: string): Promise<string> {
    const record = await client.createRecord("mechanics", {
      ...mechanicSeedFields(RUN_ID, suffix, {
        phone_number: `+1555091${suffix.padStart(4, "0")}`,
        name: `Quote Test Mech ${RUN_ID}-${suffix}`,
      }),
    });
    created.mechanics.push(record.id);
    return record.id;
  }

  async function prepareDiagnosingJob(
    driverId: string,
    mechanicId: string,
  ): Promise<string> {
    const record = await client.createRecord("jobs", {
      status: JOB_STATUS.diagnosing,
      zip_code: TEST_ZIP,
      diagnosis_category: TEST_CATEGORY,
      service_type: "mobile_repair",
      vehicle_year: 2020,
      vehicle_make: "Toyota",
      vehicle_model: "Camry",
      driver_id: [driverId],
      mechanic_id: [mechanicId],
    });
    created.jobs.push(record.id);
    return record.id;
  }

  async function countActionItemsForJob(
    jobId: string,
    type: string,
  ): Promise<number> {
    const formula = actionItemJobFormula(jobId, type);
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

  console.log(`\n[quote-manual-test] run=${RUN_ID}\n`);

  console.log("1. High-parts gate ($600 parts):");
  await trackResult("QUOTE → quote_pending_admin, no driver SMS", async () => {
    clearSmsLog();
    const driverId = await seedDriver("01");
    const mechanicId = await seedMechanic("01");
    const jobId = await prepareDiagnosingJob(driverId, mechanicId);

    const result = await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("QUOTE $245 PARTS $600"),
    );

    assert(result.action === "quote_pending_admin", "action pending admin");
    const job = await getJobById(jobId);
    assertQuotePendingAdmin(job);
    assert(job.fields.parts_cost === 600, "parts_cost");
    assert(!jobDetails(job.fields).quote_timeout_qstash_id, "no timeout scheduled");
    assert(getSmsLog().length === 0, "no driver SMS");

    const actionCount = await countActionItemsForJob(jobId, ACTION_ITEM_TYPE.PARTS_FLAGGED);
    assert(actionCount >= 1, "parts_flagged action item");
  });

  console.log("\n2. Admin release:");
  await trackResult("approveQuoteParts → quote_submitted + driver SMS", async () => {
    clearSmsLog();
    const driverId = await seedDriver("02");
    const mechanicId = await seedMechanic("02");
    const jobId = await prepareDiagnosingJob(driverId, mechanicId);

    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("QUOTE $245 PARTS $600"),
    );

    const release = await approveQuoteParts(jobId);
    assert(release.action === "quote_submitted", "released");

    const job = await getJobById(jobId);
    assertQuoteSubmitted(job);
    assert(Boolean(jobDetails(job.fields).quote_timeout_qstash_id), "timeout scheduled");
    assert(getSmsLog().length === 1, "driver quote SMS sent");
    assert(getSmsLog()[0]?.body.includes("APPROVE"), "quote SMS body");
  });

  console.log("\n3. Normal quote (≤ $500 parts):");
  await trackResult("QUOTE $80 parts → quote_submitted immediately", async () => {
    clearSmsLog();
    const driverId = await seedDriver("03");
    const mechanicId = await seedMechanic("03");
    const jobId = await prepareDiagnosingJob(driverId, mechanicId);

    const result = await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("QUOTE $245 PARTS $80"),
    );

    assert(result.action === "quote_submitted", "quote_submitted");
    const job = await getJobById(jobId);
    assertQuoteSubmitted(job);
    assert(Boolean(jobDetails(job.fields).quote_timeout_qstash_id), "timeout scheduled");
    assert(getSmsLog().length === 1, "driver SMS");
  });

  console.log("\n4. Timeout auto-decline:");
  await trackResult("runQuoteTimeoutCheck → cancelled + $35 PI + SMS", async () => {
    clearSmsLog();
    const driverId = await seedDriver("04");
    const mechanicId = await seedMechanic("04");
    const jobId = await prepareDiagnosingJob(driverId, mechanicId);

    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("QUOTE $245 PARTS $80"),
    );

    const check = await runQuoteTimeoutCheck(jobId);
    assert(check.action === "cancelled", "cancelled");

    const job = await getJobById(jobId);
    assert(job.fields.status === "cancelled", "status cancelled");

    const payment = await findPaymentByJobAndType(jobId, "diagnostic_fee");
    assert(payment !== null, "diagnostic payment row");
    assert(payment.fields.amount === DIAGNOSTIC_FEE_CENTS / 100, "$35 amount");

    const declineSms = getSmsLog().find((m) => m.body.includes("$35"));
    assert(Boolean(declineSms), "decline SMS mentions $35");
  });

  console.log("\n5. Cancel timeout on APPROVE:");
  await trackResult("approveQuote clears timeout; worker skips", async () => {
    const driverId = await seedDriver("05");
    const mechanicId = await seedMechanic("05");
    const jobId = await prepareDiagnosingJob(driverId, mechanicId);

    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("QUOTE $245 PARTS $80"),
    );

    const before = await getJobById(jobId);
    assert(Boolean(jobDetails(before.fields).quote_timeout_qstash_id), "timeout set");

    await approveQuote(jobId);

    const after = await getJobById(jobId);
    assert(after.fields.status === JOB_STATUS.awaiting_customer_approval, "approved");

    const check = await runQuoteTimeoutCheck(jobId);
    assert(check.skipped === true, "worker skipped");
  });

  console.log("\n6. Webhook quote_parts_approved:");
  await trackResult("webhook releases pending job; 409 on wrong status", async () => {
    clearSmsLog();
    const driverId = await seedDriver("06");
    const mechanicId = await seedMechanic("06");
    const jobId = await prepareDiagnosingJob(driverId, mechanicId);

    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("QUOTE $245 PARTS $600"),
    );

    const secret = process.env.AIRTABLE_WEBHOOK_SECRET!;
    const okResponse = await airtableJobsWebhook(
      new Request("http://localhost/api/webhooks/airtable/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-airtable-webhook-secret": secret,
        },
        body: JSON.stringify({ recordId: jobId, action: "quote_parts_approved" }),
      }),
    );
    assert(okResponse.status === 200, "webhook 200");

    const job = await getJobById(jobId);
    assertQuoteSubmitted(job);

    const badResponse = await airtableJobsWebhook(
      new Request("http://localhost/api/webhooks/airtable/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-airtable-webhook-secret": secret,
        },
        body: JSON.stringify({ recordId: jobId, action: "quote_parts_approved" }),
      }),
    );
    assert(badResponse.status === 409, "409 on re-release");
  });

  if (useLiveAirtable && process.env.QUOTE_MANUAL_TEST_KEEP !== "1") {
    const baseId = process.env.AIRTABLE_BASE_ID!;
    const apiKey = process.env.AIRTABLE_API_KEY!;
    const tableIds = {
      mechanics: process.env.AIRTABLE_TABLE_MECHANICS!,
      drivers: process.env.AIRTABLE_TABLE_DRIVERS!,
      jobs: process.env.AIRTABLE_TABLE_JOBS!,
      actionItems: process.env.AIRTABLE_TABLE_ACTION_ITEMS!,
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
    for (const id of created.actionItems) {
      await deleteRow(tableIds.actionItems, id);
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
  console.log(`\n[quote-manual-test] ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[quote-manual-test] Fatal:", error);
  process.exit(1);
});
