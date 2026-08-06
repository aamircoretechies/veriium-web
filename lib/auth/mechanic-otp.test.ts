import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSetupComplete } from "@/lib/auth/mechanic-otp";

describe("isSetupComplete", () => {
  it("returns true when setup_wizard_completed_at is set", () => {
    assert.equal(
      isSetupComplete({
        setup_wizard_completed_at: "2026-01-01T00:00:00.000Z",
      }),
      true,
    );
  });

  it("returns false when setup_wizard_completed_at is missing", () => {
    assert.equal(
      isSetupComplete({
        profile_photo_url: "https://example.com/a.jpg",
        service_zip_codes: "30043",
        tools_confirmed: ["Basic tool kit"],
        service_categories: ["brakes"],
      }),
      false,
    );
  });

  it("returns false when setup_wizard_completed_at is blank", () => {
    assert.equal(
      isSetupComplete({
        setup_wizard_completed_at: "   ",
      }),
      false,
    );
  });
});
