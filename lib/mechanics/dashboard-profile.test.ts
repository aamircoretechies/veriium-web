import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  toMechanicDashboardProfile,
  toMechanicDashboardServiceSetup,
} from "@/lib/mechanics/dashboard-profile";
import type { AirtableRecord } from "@/types/airtable/common";
import type { MechanicFields } from "@/types/airtable/mechanics";

function makeMechanic(
  overrides: Partial<MechanicFields> = {},
): AirtableRecord<MechanicFields> {
  return {
    id: "recMECH123",
    fields: {
      name: "Alex Rivera",
      approved: true,
      ...overrides,
    },
  } as AirtableRecord<MechanicFields>;
}

describe("toMechanicDashboardProfile", () => {
  it("maps profile fields from the mechanic record", () => {
    const profile = toMechanicDashboardProfile(
      makeMechanic({
        profile_photo_url: "https://example.com/photo.jpg",
        bio: "ASE master tech",
        languages: ["English", "Spanish"],
        certified_status: "certified",
        certifications: "Years experience: 8",
      }),
    );

    assert.equal(profile.photoUrl, "https://example.com/photo.jpg");
    assert.equal(profile.bio, "ASE master tech");
    assert.deepEqual(profile.languages, ["English", "Spanish"]);
    assert.equal(profile.certifiedStatus, "certified");
    assert.equal(profile.certifications, "Years experience: 8");
  });
});

describe("toMechanicDashboardServiceSetup", () => {
  it("maps service setup fields from the mechanic record", () => {
    const setup = toMechanicDashboardServiceSetup(
      makeMechanic({
        service_zip_codes: "30043\n30044",
        service_categories: ["brakes", "engine_diagnostics"],
        tools_confirmed: ["OBD2 scanner", "Basic tool kit"],
        shop_address: "123 Main St",
      }),
    );

    assert.deepEqual(setup.zipCodes, ["30043", "30044"]);
    assert.deepEqual(setup.categoryLabels, ["Brakes", "Engine Diagnostics"]);
    assert.deepEqual(setup.tools, ["OBD2 scanner", "Basic tool kit"]);
    assert.equal(setup.shopAddress, "123 Main St");
    assert.equal(setup.mobileAvailable, true);
    assert.equal(setup.shopAvailable, true);
  });
});
