/**
 * M2 manual test: parts receipt capture + 24-hour deadline.
 *
 * Usage:
 *   npm run receipt:manual-test
 *
 * Modes:
 *   Default — in-memory Airtable (no API keys required).
 *
 * Optional env:
 *   RECEIPT_MANUAL_TEST_KEEP=1 — skip cleanup of seeded rows (live Airtable only).
 *   RECEIPT_DEADLINE_SECONDS=1 — shorten deadline worker delay for local runs.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ACTION_ITEM_TYPE,
  actionItemJobFormula,
  actionItemLinkedToJob,
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

const created = {
  drivers: [] as string[],
  mechanics: [] as string[],
  jobs: [] as string[],
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
    console.warn("[receipt-manual-test] No .env.local found; using process.env only.");
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
    CLOUDINARY_CLOUD_NAME: "manual-test-cloud",
    CLOUDINARY_API_KEY: "manual-test-cloud-key",
    CLOUDINARY_API_SECRET: "manual-test-cloud-secret",
    RECEIPT_MANUAL_TEST: "1",
    RECEIPT_DEADLINE_SECONDS: "1",
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

async function main(): Promise<void> {
  loadEnvFile();

  const useLiveAirtable =
    process.env.RECEIPT_MANUAL_TEST_MOCK !== "1" && (await probeAirtable());

  if (!useLiveAirtable) {
    const { createInMemoryAirtableClient, setAirtableClientForTests } =
      await import("@/lib/airtable");
    setAirtableClientForTests(createInMemoryAirtableClient());
    console.log("[receipt-manual-test] Using in-memory Airtable mock.");
  } else {
    console.log("[receipt-manual-test] Using live Airtable base.");
  }

  const { getAirtableClient } = await import("@/lib/airtable");
  const client = getAirtableClient();

  const { parseSmsCommand } = await import("@/lib/sms/parse-command");
  const { handleServiceCommand } = await import("@/lib/service/handle-command");
  const { getJobById } = await import("@/lib/jobs/lookup");
  const { submitReceipt } = await import("@/lib/receipts/submit");
  const { runReceiptDeadlineCheck } = await import("@/lib/receipts/check");
  const { handleInboundSms } = await import("@/lib/sms/inbound");

  async function seedDriver(suffix: string): Promise<string> {
    const record = await client.createRecord("drivers", {
      ...driverSeedFields(RUN_ID, suffix, {
        phone_number: `+1555070${suffix.padStart(4, "0")}`,
        name: `Receipt Test Driver ${RUN_ID}-${suffix}`,
      }),
    });
    created.drivers.push(record.id);
    return record.id;
  }

  async function seedMechanic(suffix: string): Promise<{ id: string; phone: string }> {
    const phone = `+1555080${suffix.padStart(4, "0")}`;
    const record = await client.createRecord("mechanics", {
      ...mechanicSeedFields(RUN_ID, suffix, {
        phone_number: phone,
        name: `Receipt Test Mech ${RUN_ID}-${suffix}`,
      }),
    });
    created.mechanics.push(record.id);
    return { id: record.id, phone };
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

  async function quoteJob(jobId: string, mechanicId: string): Promise<void> {
    await handleServiceCommand(
      jobId,
      mechanicId,
      parseSmsCommand("QUOTE $245 PARTS $80"),
    );
  }

  console.log(`\n[receipt-manual-test] run=${RUN_ID}\n`);

  console.log("1. QUOTE schedules receipt deadline:");
  await trackResult("quote sets receipt_status pending", async () => {
    const driverId = await seedDriver("01");
    const { id: mechanicId } = await seedMechanic("01");
    const jobId = await prepareDiagnosingJob(driverId, mechanicId);

    await quoteJob(jobId, mechanicId);

    const job = await getJobById(jobId);
    assert(jobDetails(job.fields).receipt_status === "pending", "receipt_status pending");
    assertQuoteSubmitted(job);
  });

  console.log("\n2. Web receipt submit:");
  await trackResult("submitReceipt sets submitted + URL", async () => {
    const driverId = await seedDriver("02");
    const { id: mechanicId } = await seedMechanic("02");
    const jobId = await prepareDiagnosingJob(driverId, mechanicId);
    await quoteJob(jobId, mechanicId);

    const result = await submitReceipt({
      jobId,
      mechanicId,
      receiptUrl: "https://res.cloudinary.com/demo/image/upload/receipt.jpg",
      source: "web",
    });

    assert(result.receiptStatus === "submitted", "submitted");
    const job = await getJobById(jobId);
    assert(job.fields.attachments?.[0]?.url?.includes("cloudinary"), "attachment set");
    assert(jobDetails(job.fields).receipt_status === "submitted", "receipt_status submitted");
  });

  console.log("\n3. Deadline worker skips when submitted:");
  await trackResult("runReceiptDeadlineCheck no-op if submitted", async () => {
    const driverId = await seedDriver("03");
    const { id: mechanicId } = await seedMechanic("03");
    const jobId = await prepareDiagnosingJob(driverId, mechanicId);
    await quoteJob(jobId, mechanicId);
    await submitReceipt({
      jobId,
      mechanicId,
      receiptUrl: "https://res.cloudinary.com/demo/image/upload/receipt2.jpg",
      source: "web",
    });

    const check = await runReceiptDeadlineCheck(jobId);
    assert(check.skipped === true, "skipped");
    assert(check.reason === "receipt_already_submitted", "reason");
  });

  console.log("\n4. Deadline worker forfeiture:");
  await trackResult("overdue sets forfeiture + action item", async () => {
    const driverId = await seedDriver("04");
    const { id: mechanicId } = await seedMechanic("04");
    const jobId = await prepareDiagnosingJob(driverId, mechanicId);
    await quoteJob(jobId, mechanicId);

    const check = await runReceiptDeadlineCheck(jobId);
    assert(check.action === "receipt_overdue_flagged", "flagged");

    const job = await getJobById(jobId);
    assert(jobDetails(job.fields).receipt_status === "overdue", "overdue");
    assert(jobDetails(job.fields).parts_reimbursement_forfeited === true, "forfeited");

    const actionCount = await countActionItemsForJob(jobId, ACTION_ITEM_TYPE.RECEIPT_NOT_SUBMITTED);
    assert(actionCount >= 1, "receipt_overdue action item");
  });

  console.log("\n5. MMS inbound (mocked media fetch):");
  await trackResult("handleInboundSms MMS saves receipt", async () => {
    const driverId = await seedDriver("05");
    const { id: mechanicId, phone } = await seedMechanic("05");
    const jobId = await prepareDiagnosingJob(driverId, mechanicId);
    await quoteJob(jobId, mechanicId);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("api.twilio.com") || url.includes("MediaUrl")) {
        return new Response(new Uint8Array([0xff, 0xd8, 0xff]), {
          status: 200,
          headers: { "Content-Type": "image/jpeg" },
        });
      }
      if (url.includes("api.cloudinary.com")) {
        return new Response(
          JSON.stringify({
            secure_url: `https://res.cloudinary.com/demo/image/upload/receipt-mms-${RUN_ID}.jpg`,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return originalFetch(input, init);
    };

    try {
      const inbound = await handleInboundSms({
        From: phone,
        Body: "",
        MessageSid: `SM${RUN_ID}`,
        NumMedia: 1,
        MediaUrl0: "https://api.twilio.com/2010-04-01/Accounts/AC/Media/ME123",
        MediaContentType0: "image/jpeg",
      });

      assert(inbound.action === "receipt_mms_handled", "receipt_mms_handled");
      assert(inbound.receiptJobId === jobId, "job id");

      const job = await getJobById(jobId);
      assert(jobDetails(job.fields).receipt_status === "submitted", "submitted via MMS");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  console.log("\n6. MMS inbound — no active job:");
  await trackResult("unknown mechanic phone returns no_mechanic", async () => {
    const inbound = await handleInboundSms({
      From: "+15559998888",
      Body: "",
      MessageSid: `SM${RUN_ID}nom`,
      NumMedia: 1,
      MediaUrl0: "https://api.twilio.com/Media/ME999",
      MediaContentType0: "image/jpeg",
    });
    assert(inbound.action === "receipt_mms_no_mechanic", "no_mechanic");
  });

  if (useLiveAirtable && process.env.RECEIPT_MANUAL_TEST_KEEP !== "1") {
    const baseId = process.env.AIRTABLE_BASE_ID!;
    const apiKey = process.env.AIRTABLE_API_KEY!;
    const tableIds = {
      mechanics: process.env.AIRTABLE_TABLE_MECHANICS!,
      drivers: process.env.AIRTABLE_TABLE_DRIVERS!,
      jobs: process.env.AIRTABLE_TABLE_JOBS!,
      actionItems: process.env.AIRTABLE_TABLE_ACTION_ITEMS!,
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

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n[receipt-manual-test] ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[receipt-manual-test] Fatal:", error);
  process.exit(1);
});
