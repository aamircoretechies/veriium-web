/**
 * Phase 4 manual test: seed Airtable fixtures and run tier escalation +
 * ACCEPT / YES / DECLINE matrix against live lib/matching code.
 *
 * Usage: npm run matching:manual-test
 * Optional: MATCHING_MANUAL_TEST_KEEP=1 to skip cleanup of seeded rows.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const RUN_ID = Date.now().toString(36);
const TEST_ZIP = "30043";
const TEST_CATEGORY = "brakes" as const;
const TIER3_ONLY_CATEGORY = "oil_maintenance" as const;
const ISOLATED_ZIP = "39998";
const TIER4_ZIP = "39999";

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
    console.warn("[matching-manual-test] No .env.local found; using process.env only.");
  }

  const defaults: Record<string, string> = {
    OPENAI_API_KEY: "manual-test-openai-placeholder",
    SIGNED_URL_SECRET: "manual-test-signed-url-secret-32ch",
    VERIIUM_ADMIN_PHONE: "+15559990001",
    MATCHING_DEV_SECRET: "manual-test-matching-secret",
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
  if (!baseId || !tableId || !apiKey) {
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

async function main(): Promise<void> {
  loadEnvFile();
  process.env.MATCHING_MANUAL_TEST = "1";

  const useMock = process.env.MATCHING_MANUAL_TEST_MOCK === "1" || !(await probeAirtable());
  if (useMock) {
    console.log(
      "[matching-manual-test] Using in-memory Airtable mock (set real AIRTABLE_* in .env.local to hit live base).\n",
    );
  } else {
    console.log("[matching-manual-test] Using live Airtable base.\n");
  }

  const { setAirtableClientForTests, createInMemoryAirtableClient } =
    await import("@/lib/airtable");
  if (useMock) {
    setAirtableClientForTests(createInMemoryAirtableClient());
  }
  const { beginMatching } = await import("@/lib/matching/start");
  const { escalateToTier } = await import("@/lib/matching/escalate");
  const { handleMatchResponse } = await import("@/lib/matching/respond");
  const { getJobById } = await import("@/lib/jobs/lookup");
  const { getMechanicById } = await import("@/lib/mechanics/lookup");
  const { updateJobStatus } = await import("@/lib/jobs/update");
  const { parseSmsCommand } = await import("@/lib/sms/parse-command");
  const {
    assertTransition,
    InvalidJobTransitionError,
  } = await import("@/lib/jobs/transitions");
  const { handleInboundSms } = await import("@/lib/sms/inbound");

  const { getAirtableClient } = await import("@/lib/airtable");
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
    const phone = `+1555010${suffix.padStart(4, "0")}`;
    const record = await client.createRecord("drivers", {
      phone,
      name: `Manual Test Driver ${RUN_ID}-${suffix}`,
    });
    created.drivers.push(record.id);
    return record.id;
  }

  async function seedMechanic(
    suffix: string,
    fields: Record<string, unknown>,
  ): Promise<string> {
    const phone = `+1555020${suffix.padStart(4, "0")}`;
    const record = await client.createRecord("mechanics", {
      status: "approved",
      full_name: `Manual Test Mech ${RUN_ID}-${suffix}`,
      phone,
      availability_status: "available",
      setup_wizard_completed_at: new Date().toISOString(),
      service_zip_codes: [TEST_ZIP],
      service_categories: [TEST_CATEGORY],
      mobile_available: true,
      mobile_repairs_confirmed: true,
      tools_confirmed: true,
      transport_confirmed: true,
      ...fields,
    });
    created.mechanics.push(record.id);
    return record.id;
  }

  async function seedJob(
    driverId: string,
    fields: Record<string, unknown> = {},
  ): Promise<string> {
    const record = await client.createRecord("jobs", {
      status: "matched",
      matched_at: new Date().toISOString(),
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

  async function resetJob(jobId: string): Promise<void> {
    await updateJobStatus(jobId, {
      status: "matched",
      mechanic: [],
      matched_at: new Date().toISOString(),
    });
  }

  async function resetMechanicAvailable(mechanicId: string): Promise<void> {
    if (mechanicId === tier1MechId) {
      await client.updateRecord("mechanics", mechanicId, {
        availability_status: "available",
        last_assigned_at: null,
      });
      return;
    }

    if (mechanicId === busyMechId) {
      await client.updateRecord("mechanics", mechanicId, {
        availability_status: "busy",
        service_zip_codes: [ISOLATED_ZIP],
      });
      return;
    }

    await client.updateRecord("mechanics", mechanicId, {
      availability_status: "available",
      last_assigned_at: new Date().toISOString(),
    });
  }

  async function prepareMechanics(): Promise<void> {
    await Promise.all(
      [
        tier1MechId,
        tier2MechA,
        tier2MechB,
        tier3OnlyMechId,
        busyMechId,
      ].map((id) => resetMechanicAvailable(id)),
    );
  }

  console.log(`\n[matching-manual-test] run=${RUN_ID}\n`);

  console.log("Unit checks (no Airtable):");
  await trackResult("parse-command: ACCEPT/decline/yes/no", async () => {
    assert(parseSmsCommand("accept").kind === "match", "accept");
    assert(
      (parseSmsCommand("decline") as { command: string }).command === "DECLINE",
      "decline",
    );
    assert(parseSmsCommand("YES").kind === "match", "yes");
    assert(parseSmsCommand("no").kind === "match", "no");
    assert(parseSmsCommand("QUOTE 150").kind === "quote", "quote");
    assert(parseSmsCommand("bogus").kind === "unknown", "unknown");
  });

  await trackResult("transitions: reject matched → matched_tier3 skip", async () => {
    try {
      assertTransition("matched", "matched_tier3");
      throw new Error("expected InvalidJobTransitionError");
    } catch (error) {
      assert(
        error instanceof InvalidJobTransitionError,
        "expected InvalidJobTransitionError",
      );
    }
  });

  console.log("\nSeeding shared fixtures:");
  const driverId = await seedDriver("01");
  const tier1MechId = await seedMechanic("01", {});
  const tier2MechA = await seedMechanic("02", {
    last_assigned_at: new Date().toISOString(),
  });
  const tier2MechB = await seedMechanic("03", {
    last_assigned_at: new Date().toISOString(),
  });
  const tier3OnlyMechId = await seedMechanic("04", {
    service_categories: [TIER3_ONLY_CATEGORY],
    last_assigned_at: new Date().toISOString(),
  });
  const busyMechId = await seedMechanic("05", {
    availability_status: "busy",
    service_zip_codes: [ISOLATED_ZIP],
  });
  console.log(
    `  driver=${driverId}, tier1=${tier1MechId}, tier2a=${tier2MechA}, tier2b=${tier2MechB}, tier3only=${tier3OnlyMechId}, busy=${busyMechId}`,
  );

  console.log("\nIntegration matrix:");

  await trackResult("Tier 1: beginMatching assigns mechanic", async () => {
    await prepareMechanics();
    const jobId = await seedJob(driverId);
    const result = await beginMatching(jobId);
    const job = await getJobById(jobId);
    assert(result.tier1MechanicId === tier1MechId, "tier1 mechanic id");
    assert(job.fields.status === "matched", "status matched");
    assert(job.fields.mechanic?.[0] === tier1MechId, "mechanic linked");
  });

  await trackResult("Tier 1: ACCEPT → accepted_by_mechanic", async () => {
    await prepareMechanics();
    const jobId = await seedJob(driverId);
    await beginMatching(jobId);
    const result = await handleMatchResponse(jobId, tier1MechId, "ACCEPT");
    const job = await getJobById(jobId);
    const mechanic = await getMechanicById(tier1MechId);
    assert(result.action === "accepted", "action accepted");
    assert(job.fields.status === "accepted_by_mechanic", "status");
    assert(Boolean(job.fields.accepted_at), "accepted_at set");
    assert(mechanic.fields.availability_status === "busy", "mechanic busy");
  });

  await trackResult("Tier 1: DECLINE → matched_tier2", async () => {
    await prepareMechanics();
    const jobId = await seedJob(driverId);
    await beginMatching(jobId);
    const result = await handleMatchResponse(jobId, tier1MechId, "DECLINE");
    const job = await getJobById(jobId);
    assert(result.action === "declined", "action declined");
    assert(job.fields.status === "matched_tier2", "status tier2");
    assert(!job.fields.mechanic?.length, "mechanic cleared");
  });

  await trackResult("Tier 2: first YES wins", async () => {
    await prepareMechanics();
    const jobId = await seedJob(driverId);
    await beginMatching(jobId);
    await handleMatchResponse(jobId, tier1MechId, "DECLINE");
    const first = await handleMatchResponse(jobId, tier2MechA, "YES");
    const job = await getJobById(jobId);
    assert(first.action === "accepted", "first accepted");
    assert(job.fields.status === "accepted_by_mechanic", "status");
    assert(job.fields.mechanic?.[0] === tier2MechA, "winner linked");
  });

  await trackResult("Tier 2: second YES → already_assigned", async () => {
    await prepareMechanics();
    const jobId = await seedJob(driverId);
    await beginMatching(jobId);
    await handleMatchResponse(jobId, tier1MechId, "DECLINE");
    await handleMatchResponse(jobId, tier2MechA, "YES");
    const second = await handleMatchResponse(jobId, tier2MechB, "YES");
    const job = await getJobById(jobId);
    assert(second.action === "already_assigned", "already_assigned");
    assert(job.fields.mechanic?.[0] === tier2MechA, "first winner kept");
  });

  await trackResult("Tier 3: escalate + YES from category-only mechanic", async () => {
    await prepareMechanics();
    const jobId = await seedJob(driverId);
    await beginMatching(jobId);
    await handleMatchResponse(jobId, tier1MechId, "DECLINE");
    await escalateToTier(jobId, 2);
    await escalateToTier(jobId, 3);
    const jobBefore = await getJobById(jobId);
    assert(jobBefore.fields.status === "matched_tier3", "tier3 status");
    const result = await handleMatchResponse(jobId, tier3OnlyMechId, "YES");
    const job = await getJobById(jobId);
    assert(result.action === "accepted", "accepted");
    assert(job.fields.mechanic?.[0] === tier3OnlyMechId, "tier3 mechanic");
  });

  await trackResult("Tier 4: no mechanics → awaiting_admin_match", async () => {
    const jobId = await seedJob(driverId, { zip_code: TIER4_ZIP });
    await beginMatching(jobId);
    await escalateToTier(jobId, 2);
    await escalateToTier(jobId, 3);
    await escalateToTier(jobId, 4);
    const job = await getJobById(jobId);
    assert(job.fields.status === "awaiting_admin_match", "admin match status");

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

  await trackResult("Escalate idempotency: duplicate tier 2 no-op", async () => {
    await prepareMechanics();
    const jobId = await seedJob(driverId);
    await beginMatching(jobId);
    await handleMatchResponse(jobId, tier1MechId, "DECLINE");
    await escalateToTier(jobId, 2);
    const before = await getJobById(jobId);
    await escalateToTier(jobId, 2);
    const after = await getJobById(jobId);
    assert(before.fields.status === "matched_tier2", "before tier2");
    assert(after.fields.status === "matched_tier2", "after tier2");
  });

  await trackResult("No Tier 1 pool → immediate Tier 2", async () => {
    const isolatedDriver = await seedDriver("02");
    const jobId = await seedJob(isolatedDriver, { zip_code: ISOLATED_ZIP });
    await beginMatching(jobId);
    const job = await getJobById(jobId);
    assert(
      job.fields.status === "matched_tier2",
      `expected matched_tier2, got ${job.fields.status}`,
    );
  });

  await trackResult("Inbound SMS: ACCEPT via handleInboundSms", async () => {
    await prepareMechanics();
    const jobId = await seedJob(driverId);
    await beginMatching(jobId);
    const mechanic = await getMechanicById(tier1MechId);
    const inbound = await handleInboundSms({
      From: mechanic.fields.phone!,
      Body: "ACCEPT",
      MessageSid: `SM${RUN_ID}accept`,
    });
    assert(inbound.action === "match_handled", "match_handled");
    assert(inbound.matchAction === "accepted", "accepted");
    const job = await getJobById(jobId);
    assert(job.fields.status === "accepted_by_mechanic", "status");
  });

  await trackResult("Terminal job: escalate tier 4 no-op after accept", async () => {
    await prepareMechanics();
    const jobId = await seedJob(driverId);
    await beginMatching(jobId);
    await handleMatchResponse(jobId, tier1MechId, "ACCEPT");
    await escalateToTier(jobId, 4);
    const job = await getJobById(jobId);
    assert(job.fields.status === "accepted_by_mechanic", "unchanged");
  });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);

  console.log(`\n[matching-manual-test] ${passed}/${results.length} passed`);

  if (process.env.MATCHING_MANUAL_TEST_KEEP !== "1" && !useMock) {
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
    for (const id of created.actionItems) {
      await deleteRow(process.env.AIRTABLE_TABLE_ACTION_ITEMS!, id);
    }
    console.log("  Seeded rows cancelled/deleted.");
  } else if (useMock) {
    console.log("\nIn-memory mock — no persistent rows to clean up.");
  } else {
    console.log(
      `\nMATCHING_MANUAL_TEST_KEEP=1 — retained rows: jobs=[${created.jobs.join(", ")}]`,
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
  console.error("[matching-manual-test] Fatal:", error);
  process.exit(1);
});
