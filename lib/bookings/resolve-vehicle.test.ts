import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { NhtsaLookupError } from "@/lib/vehicles/errors";
import { InvalidVehicleError } from "./errors";
import { resolveVehicle } from "./resolve-vehicle";

describe("resolveVehicle", () => {
  it("returns undefined when vehicle is empty", async () => {
    const result = await resolveVehicle(undefined);
    assert.equal(result, undefined);
  });

  it("returns partial vehicle without NHTSA lookup", async () => {
    const result = await resolveVehicle({ year: 2018, make: "Honda" });
    assert.deepEqual(result, { year: 2018, make: "Honda" });
  });

  it("decodes VIN via NHTSA and overrides client fields", async () => {
    const result = await resolveVehicle(
      {
        vin: "1HGCM82633A004352",
        year: 1999,
        make: "Wrong",
        model: "Wrong",
      },
      {
        lookup: async () => ({
          vin: "1HGCM82633A004352",
          year: 2020,
          make: "Honda",
          model: "Accord",
        }),
      },
    );

    assert.deepEqual(result, {
      vin: "1HGCM82633A004352",
      year: 2020,
      make: "Honda",
      model: "Accord",
    });
  });

  it("rejects invalid VIN lookups", async () => {
    await assert.rejects(
      () =>
        resolveVehicle(
          { vin: "INVALIDVIN1234567" },
          {
            lookup: async () => {
              throw new NhtsaLookupError(
                "not_found",
                "No vehicle was found for that VIN.",
              );
            },
          },
        ),
      (error: unknown) => error instanceof InvalidVehicleError,
    );
  });

  it("validates year, make, and model against NHTSA", async () => {
    const result = await resolveVehicle(
      {
        year: 2020,
        make: "Toyota",
        model: "Camry",
      },
      {
        lookup: async () => ({
          models: ["Camry", "Corolla"],
        }),
      },
    );

    assert.deepEqual(result, {
      year: 2020,
      make: "Toyota",
      model: "Camry",
    });
  });

  it("rejects year, make, and model when model is not listed", async () => {
    await assert.rejects(
      () =>
        resolveVehicle(
          {
            year: 2020,
            make: "Toyota",
            model: "Camry",
          },
          {
            lookup: async () => ({
              models: ["Corolla"],
            }),
          },
        ),
      (error: unknown) => error instanceof InvalidVehicleError,
    );
  });
});
