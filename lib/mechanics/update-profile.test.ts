import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  InvalidAttachmentUrlError,
  mapProfilePatchToAirtableFields,
} from "@/lib/mechanics/update-profile";

describe("mapProfilePatchToAirtableFields", () => {
  it("maps bio and languages to Airtable field names", () => {
    const fields = mapProfilePatchToAirtableFields({
      bio: "Updated bio",
      languages: ["English", "Spanish"],
    });

    assert.equal(fields.bio, "Updated bio");
    assert.deepEqual(fields.languages, ["English", "Spanish"]);
    assert.equal(fields.profile_photo_url, undefined);
  });

  it("maps photoUrl to profile_photo_url when URL is valid Cloudinary", () => {
    const originalCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";

    try {
      const fields = mapProfilePatchToAirtableFields({
        photoUrl:
          "https://res.cloudinary.com/test-cloud/image/upload/v1/photo.jpg",
      });

      assert.equal(
        fields.profile_photo_url,
        "https://res.cloudinary.com/test-cloud/image/upload/v1/photo.jpg",
      );
    } finally {
      if (originalCloudName === undefined) {
        delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      } else {
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = originalCloudName;
      }
    }
  });

  it("rejects non-Cloudinary photoUrl", () => {
    assert.throws(
      () =>
        mapProfilePatchToAirtableFields({
          photoUrl: "https://example.com/photo.jpg",
        }),
      InvalidAttachmentUrlError,
    );
  });

  it("rejects bio longer than 250 characters", () => {
    assert.throws(() =>
      mapProfilePatchToAirtableFields({
        bio: "x".repeat(251),
      }),
    );
  });

  it("rejects invalid language values", () => {
    assert.throws(() =>
      mapProfilePatchToAirtableFields({
        languages: ["French" as "English"],
      }),
    );
  });
});
