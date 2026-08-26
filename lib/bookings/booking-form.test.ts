import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GWINNETT_ZIP_CODES } from "@/lib/constants/gwinnett-zips";
import { bookingRequestSchema } from "@/types/api/booking";
import {
  DETAILS_MAX,
  MAKE_MAX,
  VIN_OR_PLATE_MAX,
  formatBookingValidationIssues,
  formatPhoneInput,
  getVehicleYearMax,
  isValidMake,
  isValidModel,
  isValidScheduleDate,
  isValidVehicleYear,
  isValidVinOrPlate,
  isValidZipFormat,
  sanitizeDetailsInput,
  sanitizeMakeInput,
  sanitizeModelInput,
  sanitizeVehicleYearInput,
  sanitizeVinOrPlateInput,
  sanitizeZipInput,
  validateBookingFormFields,
  VEHICLE_YEAR_MIN,
} from "./booking-form";

const gwinnettZip = GWINNETT_ZIP_CODES[0];

describe("booking form sanitizers", () => {
  it("keeps ZIP codes to 5 digits only", () => {
    assert.equal(sanitizeZipInput("30a043b"), "30043");
    assert.equal(sanitizeZipInput("3004399"), "30043");
    assert.equal(isValidZipFormat("30043"), true);
    assert.equal(isValidZipFormat("3004"), false);
  });

  it("keeps vehicle year to 4 digits in a realistic range", () => {
    assert.equal(sanitizeVehicleYearInput("20a18b"), "2018");
    assert.equal(sanitizeVehicleYearInput("20189"), "2018");
    assert.equal(isValidVehicleYear("2018"), true);
    assert.equal(isValidVehicleYear(String(getVehicleYearMax())), true);
    assert.equal(isValidVehicleYear(String(VEHICLE_YEAR_MIN - 1)), false);
    assert.equal(isValidVehicleYear(String(getVehicleYearMax() + 1)), false);
    assert.equal(isValidVehicleYear("18"), false);
  });

  it("strips invalid characters from make, model, and VIN/plate", () => {
    assert.equal(sanitizeMakeInput("Toyota!!!"), "Toyota");
    assert.equal(sanitizeMakeInput("Mercedes-Benz"), "Mercedes-Benz");
    assert.equal(sanitizeModelInput("F-150@#$"), "F-150");
    assert.equal(sanitizeVinOrPlateInput("abc1234!"), "ABC1234");
    assert.equal(
      sanitizeVinOrPlateInput("1HGCM82633A004352 extra"),
      "1HGCM82633A004352",
    );
    assert.equal(isValidMake("Toyota"), true);
    assert.equal(isValidModel("Camry"), true);
    assert.equal(isValidModel("F-150"), true);
    assert.equal(isValidVinOrPlate("ABC1234"), true);
    assert.equal(isValidVinOrPlate("A"), false);
  });

  it("caps additional details", () => {
    assert.equal(sanitizeDetailsInput("a".repeat(DETAILS_MAX + 10)).length, DETAILS_MAX);
  });

  it("accepts Feb 29 and rejects Feb 31", () => {
    assert.equal(isValidScheduleDate("2", "29"), true);
    assert.equal(isValidScheduleDate("2", "31"), false);
    assert.equal(isValidScheduleDate("4", "31"), false);
    assert.equal(isValidScheduleDate("1", "31"), true);
  });
});

describe("validateBookingFormFields", () => {
  const valid = {
    name: "Jane Driver",
    zip: gwinnettZip,
    phone: formatPhoneInput("5551234567"),
    email: "",
    year: "2018",
    make: "Toyota",
    model: "Camry",
    vin: "ABC1234",
    details: "Grinding noise when braking",
    smsConsent: true,
    phoneConsent: true,
  };

  it("accepts a complete valid booking form", () => {
    const errors = validateBookingFormFields(valid, {
      requireContact: true,
      requireConsents: true,
    });
    assert.deepEqual(errors, {});
  });

  it("requires first and last name, 5-digit service-area ZIP, and US phone", () => {
    const errors = validateBookingFormFields(
      {
        ...valid,
        name: "Jane",
        zip: "99999",
        phone: "123",
        email: "not-an-email",
        year: "1800",
      },
      { requireContact: true, requireConsents: true },
    );

    assert.ok(errors.name);
    assert.ok(errors.zip);
    assert.ok(errors.phone);
    assert.ok(errors.email);
    assert.ok(errors.year);
  });

  it("skips empty optional fields and incomplete contact when not required", () => {
    const errors = validateBookingFormFields(
      {
        name: "",
        zip: "",
        phone: "",
        email: "",
        year: "",
        make: "",
        model: "",
        vin: "",
        details: "",
      },
      { requireContact: false, requireConsents: false },
    );
    assert.deepEqual(errors, {});
  });

  it("requires a valid future date and time for schedule later", () => {
    const missing = validateBookingFormFields(
      { ...valid, month: "", day: "", time: "" },
      { requireContact: true, requireConsents: true, requireScheduleSlot: true },
    );
    assert.equal(missing.day, "Please choose a date.");
    assert.equal(missing.time, "Please choose a time.");

    const validSlot = validateBookingFormFields(
      { ...valid, month: "12", day: "31", time: "evening" },
      { requireContact: true, requireConsents: true, requireScheduleSlot: true },
    );
    assert.equal(validSlot.day, undefined);
    assert.equal(validSlot.time, undefined);
  });
});

describe("bookingRequestSchema field limits", () => {
  const base = {
    diagnosisId: "recDiagnosis123",
    name: "Jane Driver",
    zip: gwinnettZip,
    phone: "(555) 123-4567",
    serviceType: "onsite" as const,
    smsConsent: true as const,
    phoneConsent: true as const,
    verificationCode: "123456",
  };

  it("accepts a valid payload with vehicle details", () => {
    const parsed = bookingRequestSchema.safeParse({
      ...base,
      email: "jane@example.com",
      vehicle: {
        year: 2018,
        make: "Toyota",
        model: "Camry",
        vin: "ABC1234",
      },
      additionalDetails: "Squeaking brakes",
    });
    assert.equal(parsed.success, true);
  });

  it("rejects invalid name, year, and oversized text fields", () => {
    const parsed = bookingRequestSchema.safeParse({
      ...base,
      name: "Jane123",
      zip: "3004",
      phone: "123",
      vehicle: {
        year: 1800,
        make: "Toyota!",
        model: "Camry@",
        vin: "A",
      },
      additionalDetails: "a".repeat(DETAILS_MAX + 1),
    });
    assert.equal(parsed.success, false);
    if (parsed.success) return;

    const message = formatBookingValidationIssues(parsed.error.issues);
    assert.equal(message.includes("Too big"), false);
    assert.match(message, /first and last name|letters only/i);
  });

  it("rejects make and VIN over the character limits", () => {
    const parsed = bookingRequestSchema.safeParse({
      ...base,
      vehicle: {
        make: "T".repeat(MAKE_MAX + 1),
        vin: "A".repeat(VIN_OR_PLATE_MAX + 1),
      },
    });
    assert.equal(parsed.success, false);
  });
});
