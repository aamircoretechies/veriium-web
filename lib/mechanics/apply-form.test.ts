import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BIO_MAX,
  EMAIL_MAX,
  formatPhoneInput,
  isValidEmail,
  isValidFullName,
  isValidYearsExperience,
  sanitizeBioInput,
  sanitizeEmailInput,
  sanitizeLanguagesInput,
  sanitizeNameInput,
  sanitizeOtherCertsInput,
  sanitizeYearsInput,
  formatApplyValidationIssues,
  sanitizePublicValidationMessage,
  validateApplyTextFields,
  YEARS_EXPERIENCE_MAX,
} from "@/lib/mechanics/apply-form";
import { mechanicApplicationSchema } from "@/types/api/mechanic-application";

describe("apply form sanitizers", () => {
  it("strips numbers and special characters from names", () => {
    assert.equal(sanitizeNameInput("John123"), "John");
    assert.equal(sanitizeNameInput("Jane@Doe!"), "JaneDoe");
    assert.equal(sanitizeNameInput("O'Brien-Smith Jr."), "O'Brien-Smith Jr.");
  });

  it("accepts first and last name with letters only", () => {
    assert.equal(isValidFullName("John Doe"), true);
    assert.equal(isValidFullName("José García"), true);
    assert.equal(isValidFullName("John"), false);
    assert.equal(isValidFullName("John123"), false);
  });

  it("formats phone input as 10 digits and rejects letters", () => {
    assert.equal(formatPhoneInput("abc5551234567xyz"), "(555) 123-4567");
    assert.equal(formatPhoneInput("15551234567"), "(555) 123-4567");
    assert.equal(formatPhoneInput("555123456789"), "(555) 123-4567");
    assert.equal(formatPhoneInput("555"), "(555");
  });

  it("formats and validates email addresses", () => {
    assert.equal(sanitizeEmailInput(" john doe@@example.com! "), "johndoe@example.com");
    assert.equal(sanitizeEmailInput("a".repeat(EMAIL_MAX + 10)).length, EMAIL_MAX);
    assert.equal(isValidEmail("john@example.com"), true);
    assert.equal(isValidEmail("john+ase@example.com"), true);
    assert.equal(isValidEmail("not-an-email"), false);
    assert.equal(isValidEmail("john@example"), false);
    assert.equal(isValidEmail(""), false);
  });

  it("keeps years of experience as an integer within the limit", () => {
    assert.equal(sanitizeYearsInput("12e"), "12");
    assert.equal(sanitizeYearsInput("99"), String(YEARS_EXPERIENCE_MAX));
    assert.equal(sanitizeYearsInput("5.5"), "5");
    assert.equal(isValidYearsExperience("0"), true);
    assert.equal(isValidYearsExperience("50"), true);
    assert.equal(isValidYearsExperience("51"), false);
    assert.equal(isValidYearsExperience(""), false);
  });

  it("caps bio, languages, and certifications", () => {
    assert.equal(sanitizeBioInput("a".repeat(BIO_MAX + 10)).length, BIO_MAX);
    assert.equal(sanitizeLanguagesInput("English, Spanish!123"), "English, Spanish");
    assert.equal(
      sanitizeOtherCertsInput("ASE A1/A8 & State license #99"),
      "ASE A1/A8 & State license 99",
    );
  });
});

describe("validateApplyTextFields", () => {
  it("requires a full name, phone, email, years, and bio", () => {
    const errors = validateApplyTextFields({
      fullName: "John",
      phoneValid: false,
      email: "not-an-email",
      yearsExp: "",
      bio: "",
      languages: "",
      otherCerts: "",
    });

    assert.ok(errors.fullName);
    assert.ok(errors.phone);
    assert.ok(errors.email);
    assert.ok(errors.yearsExp);
    assert.ok(errors.bio);
  });
});

describe("mechanicApplicationSchema", () => {
  const base = {
    fullName: "John Doe",
    phone: "(555) 123-4567",
    services: { brakes: true },
    primaryZip: "30043",
  };

  it("accepts a valid application payload", () => {
    const parsed = mechanicApplicationSchema.safeParse({
      ...base,
      email: "john@example.com",
      bio: "ASE technician with 8 years of mobile repair experience.",
      languages: "English, Spanish",
      yearsExperience: 8,
      otherCertifications: "ASE A1-A8",
    });
    assert.equal(parsed.success, true);
  });

  it("rejects invalid name, years, and over-limit text fields", () => {
    const parsed = mechanicApplicationSchema.safeParse({
      ...base,
      fullName: "John123",
      email: "not-an-email",
      bio: "a".repeat(BIO_MAX + 1),
      languages: "English!",
      yearsExperience: 99,
      otherCertifications: "Cert #1",
    });
    assert.equal(parsed.success, false);
  });

  it("returns friendly messages for oversized bio and unsafe years values", () => {
    const parsed = mechanicApplicationSchema.safeParse({
      ...base,
      bio: "a".repeat(BIO_MAX + 1),
      yearsExperience: 1e20,
    });
    assert.equal(parsed.success, false);
    if (parsed.success) return;

    const message = formatApplyValidationIssues(parsed.error.issues);
    assert.equal(message.includes("Too big"), false);
    assert.equal(message.includes("9007199254740991"), false);
    assert.match(message, /About Me must be 250 characters or fewer/);
    assert.match(message, /whole years of experience from 0 to 50/);
  });
});

describe("sanitizePublicValidationMessage", () => {
  it("rewrites Zod prettifyError text into field-level copy", () => {
    const raw = [
      "Too big: expected string to have <=250 characters",
      "  → at bio",
      "Too big: expected int to be <=9007199254740991",
      "  → at yearsExperience",
    ].join("\n");

    const message = sanitizePublicValidationMessage(raw);
    assert.equal(message.includes("Too big"), false);
    assert.equal(message.includes("9007199254740991"), false);
    assert.match(message, /About Me must be 250 characters or fewer/);
    assert.match(message, /whole years of experience from 0 to 50/);
  });
});
