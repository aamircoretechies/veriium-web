/**
 * Find Mechanic search manual test: assert filter/sort behavior against
 * in-memory fixtures without starting Next.js.
 *
 * Usage: npm run mechanic-search:manual-test
 *
 * Forces FIND_MECHANIC_MOCK=1 (fixture data). Unset AIRTABLE_* in .env.local
 * or rely on the forced mock flag so no live base is required.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { MechanicSearchQuery } from "@/types/api/mechanic-search";

type TestResult = {
  name: string;
  passed: boolean;
  detail?: string;
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
    console.warn(
      "[mechanic-search-manual-test] No .env.local found; using process.env only.",
    );
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function names(mechanics: { name: string }[]): string[] {
  return mechanics.map((m) => m.name).sort();
}

async function runTest(
  name: string,
  fn: () => Promise<void>,
): Promise<TestResult> {
  try {
    await fn();
    return { name, passed: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { name, passed: false, detail };
  }
}

function query(overrides: Partial<MechanicSearchQuery> = {}): MechanicSearchQuery {
  return {
    minRating: 0,
    aseCertifiedOnly: false,
    services: [],
    availableTodayOnly: false,
    maxDistance: 50,
    serviceType: "all",
    sort: "distance",
    ...overrides,
  };
}

async function main(): Promise<void> {
  loadEnvFile();
  process.env.FIND_MECHANIC_MOCK = "1";

  const { searchMechanics } = await import("@/lib/mechanics/search");

  const results: TestResult[] = [];

  results.push(
    await runTest("baseline_returns_approved_only", async () => {
      const { mechanics, total } = await searchMechanics(query());
      assert(total === 7, `expected 7 approved mechanics, got ${total}`);
      assert(
        !mechanics.some((m) => m.name === "Pending Applicant"),
        "under_review mechanic should be excluded",
      );
    }),
  );

  results.push(
    await runTest("zip_prefix_30043", async () => {
      const { mechanics } = await searchMechanics(query({ zip: "30043" }));
      assert(
        names(mechanics).join(",") === "Elena Rodriguez,Marcus Thompson",
        `unexpected names: ${names(mechanics).join(", ")}`,
      );
    }),
  );

  results.push(
    await runTest("ase_certified_only", async () => {
      const { mechanics } = await searchMechanics(
        query({ aseCertifiedOnly: true }),
      );
      assert(mechanics.length === 5, `expected 5 ASE mechanics, got ${mechanics.length}`);
      assert(
        mechanics.every((m) => m.aseCertified),
        "all results should be ASE certified",
      );
    }),
  );

  results.push(
    await runTest("available_today_only", async () => {
      const { mechanics } = await searchMechanics(
        query({ availableTodayOnly: true }),
      );
      assert(mechanics.length === 5, `expected 5 available today, got ${mechanics.length}`);
      assert(
        mechanics.every((m) => m.availableToday),
        "all results should be available today",
      );
    }),
  );

  results.push(
    await runTest("service_type_mobile", async () => {
      const { mechanics } = await searchMechanics(query({ serviceType: "mobile" }));
      assert(mechanics.length === 5, `expected 5 mobile mechanics, got ${mechanics.length}`);
      assert(
        mechanics.every((m) => m.mobileAvailable),
        "all results should offer mobile service",
      );
    }),
  );

  results.push(
    await runTest("service_type_shop", async () => {
      const { mechanics } = await searchMechanics(query({ serviceType: "shop" }));
      assert(mechanics.length === 4, `expected 4 shop mechanics, got ${mechanics.length}`);
      assert(
        mechanics.every((m) => m.shopAvailable),
        "all results should offer shop service",
      );
    }),
  );

  results.push(
    await runTest("services_brakes", async () => {
      const { mechanics } = await searchMechanics(query({ services: ["brakes"] }));
      assert(
        names(mechanics).join(",") ===
          "Elena Rodriguez,Jasmine Williams,Marcus Thompson",
        `unexpected brake mechanics: ${names(mechanics).join(", ")}`,
      );
    }),
  );

  results.push(
    await runTest("services_brakes_and_electrical", async () => {
      const { mechanics } = await searchMechanics(
        query({ services: ["brakes", "electrical"] }),
      );
      assert(mechanics.length === 1, `expected 1 AND-match mechanic, got ${mechanics.length}`);
      assert(mechanics[0]?.name === "Jasmine Williams", "Jasmine offers brakes and electrical");
    }),
  );

  results.push(
    await runTest("sort_experience_without_zip", async () => {
      const { mechanics } = await searchMechanics(query({ sort: "distance" }));
      assert(
        mechanics[0]?.name === "William Jackson",
        `expected William Jackson (20yr) first, got ${mechanics[0]?.name}`,
      );
      assert(
        mechanics.every((m) => m.distance === 0),
        "distance should be 0 when zip is omitted",
      );
    }),
  );

  results.push(
    await runTest("sort_distance_with_zip", async () => {
      const { mechanics } = await searchMechanics(
        query({ zip: "30043", sort: "distance" }),
      );
      assert(mechanics.length >= 2, "expected at least 2 mechanics near 30043");
      for (let i = 1; i < mechanics.length; i++) {
        assert(
          mechanics[i]!.distance >= mechanics[i - 1]!.distance,
          "results should be sorted by ascending distance",
        );
      }
    }),
  );

  results.push(
    await runTest("max_distance_respects_limit", async () => {
      const { mechanics } = await searchMechanics(
        query({ zip: "30043", maxDistance: 5 }),
      );
      assert(
        mechanics.every((m) => m.distance <= 5),
        "all results should be within maxDistance",
      );
    }),
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);

  console.log("\n[mechanic-search-manual-test] Results\n");
  for (const result of results) {
    const mark = result.passed ? "PASS" : "FAIL";
    console.log(`  ${mark}  ${result.name}`);
    if (result.detail) {
      console.log(`        ${result.detail}`);
    }
  }

  console.log(`\n${passed}/${results.length} passed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[mechanic-search-manual-test] Fatal:", error);
  process.exit(1);
});
