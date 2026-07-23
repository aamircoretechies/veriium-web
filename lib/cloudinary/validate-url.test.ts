import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  InvalidAttachmentUrlError,
  toAirtableAttachments,
  validateIntakeAttachmentUrl,
} from "./validate-url";

const ORIGINAL_ENV = { ...process.env };

describe("validateIntakeAttachmentUrl", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";
    delete process.env.RECEIPT_UPLOAD_MOCK;
    delete process.env.NEXT_PUBLIC_RECEIPT_UPLOAD_MOCK;
    delete process.env.ALLOW_DEV_OTP;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("accepts HTTPS Cloudinary URLs for the configured cloud", () => {
    assert.doesNotThrow(() =>
      validateIntakeAttachmentUrl(
        "https://res.cloudinary.com/test-cloud/image/upload/v1/sample.jpg",
      ),
    );
  });

  it("rejects non-HTTPS URLs", () => {
    assert.throws(
      () =>
        validateIntakeAttachmentUrl(
          "http://res.cloudinary.com/test-cloud/image/upload/v1/sample.jpg",
        ),
      InvalidAttachmentUrlError,
    );
  });

  it("rejects URLs from a different Cloudinary cloud", () => {
    assert.throws(
      () =>
        validateIntakeAttachmentUrl(
          "https://res.cloudinary.com/other-cloud/image/upload/v1/sample.jpg",
        ),
      InvalidAttachmentUrlError,
    );
  });

  it("rejects arbitrary HTTPS hosts", () => {
    assert.throws(
      () => validateIntakeAttachmentUrl("https://example.com/photo.jpg"),
      InvalidAttachmentUrlError,
    );
  });

  it("allows mock placeholder URLs when receipt upload mock is enabled", () => {
    process.env.RECEIPT_UPLOAD_MOCK = "1";
    assert.doesNotThrow(() =>
      validateIntakeAttachmentUrl(
        "https://placehold.co/800x600.png?text=Veriium+Receipt+Demo",
      ),
    );
  });
});

describe("toAirtableAttachments", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("maps validated URLs to Airtable attachment objects", () => {
    const url =
      "https://res.cloudinary.com/test-cloud/image/upload/v1/sample.jpg";
    assert.deepEqual(toAirtableAttachments([url]), [{ url }]);
  });
});
