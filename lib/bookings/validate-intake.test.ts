import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { bookingRequestSchema } from "@/types/api/booking";
import { updateDiagnosisSchema } from "@/types/airtable/schemas";
import { GWINNETT_ZIP_CODES } from "@/lib/constants/gwinnett-zips";
import { InvalidAttachmentUrlError } from "@/lib/cloudinary/validate-url";
import { validateBookingIntake } from "./validate-intake";

const ORIGINAL_ENV = { ...process.env };

const baseBooking = {
  diagnosisId: "recDiagnosis123",
  name: "Jane Driver",
  zip: GWINNETT_ZIP_CODES[0],
  phone: "(555) 123-4567",
  serviceType: "onsite" as const,
  smsConsent: true as const,
  phoneConsent: true as const,
  verificationCode: "123456",
};

describe("bookingRequestSchema attachmentUrls", () => {
  it("accepts up to five attachment URLs", () => {
    const urls = Array.from({ length: 5 }, (_, index) =>
      `https://res.cloudinary.com/demo/image/upload/v1/file-${index}.jpg`,
    );

    const parsed = bookingRequestSchema.safeParse({
      ...baseBooking,
      attachmentUrls: urls,
    });

    assert.equal(parsed.success, true);
  });

  it("rejects more than five attachment URLs", () => {
    const urls = Array.from({ length: 6 }, (_, index) =>
      `https://res.cloudinary.com/demo/image/upload/v1/file-${index}.jpg`,
    );

    const parsed = bookingRequestSchema.safeParse({
      ...baseBooking,
      attachmentUrls: urls,
    });

    assert.equal(parsed.success, false);
  });
});

describe("validateBookingIntake attachments", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "demo";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("normalizes valid attachment URLs for Airtable", () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/issue.jpg";
    const intake = validateBookingIntake({
      ...baseBooking,
      attachmentUrls: [url],
    });

    assert.deepEqual(intake.attachments, [{ url }]);
  });

  it("rejects invalid attachment URLs", () => {
    assert.throws(
      () =>
        validateBookingIntake({
          ...baseBooking,
          attachmentUrls: ["https://example.com/not-allowed.jpg"],
        }),
      InvalidAttachmentUrlError,
    );
  });
});

describe("updateDiagnosisSchema attachments", () => {
  it("accepts up to five diagnosis attachments", () => {
    const parsed = updateDiagnosisSchema.safeParse({
      attachments: [
        { url: "https://res.cloudinary.com/demo/image/upload/v1/a.jpg" },
        { url: "https://res.cloudinary.com/demo/image/upload/v1/b.jpg" },
      ],
    });

    assert.equal(parsed.success, true);
  });

  it("rejects more than five diagnosis attachments", () => {
    const parsed = updateDiagnosisSchema.safeParse({
      attachments: Array.from({ length: 6 }, (_, index) => ({
        url: `https://res.cloudinary.com/demo/image/upload/v1/file-${index}.jpg`,
      })),
    });

    assert.equal(parsed.success, false);
  });
});
