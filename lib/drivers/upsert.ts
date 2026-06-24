import { getAirtableClient } from "@/lib/airtable";
import { normalizeUsPhone } from "@/lib/phone";
import type { DriverFields } from "@/types/airtable/drivers";
import {
  createDriverSchema,
  updateDriverSchema,
} from "@/types/airtable/schemas";
import { findDriverByPhone } from "./lookup";

export type UpsertDriverInput = {
  phone: string;
  name: string;
  email?: string;
};

export type UpsertDriverResult = {
  driverId: string;
  created: boolean;
};

/** Find driver by phone; create or update name / email. */
export async function upsertDriver(
  input: UpsertDriverInput,
): Promise<UpsertDriverResult> {
  const phoneE164 = normalizeUsPhone(input.phone);
  const existing = await findDriverByPhone(phoneE164);
  const client = getAirtableClient();

  if (existing) {
    const updateFields = updateDriverSchema.parse({
      name: input.name,
      ...(input.email !== undefined ? { email: input.email } : {}),
    });

    const updated = await client.updateRecord<DriverFields>(
      "drivers",
      existing.id,
      updateFields,
      { typecast: true },
    );

    return {
      driverId: updated.id,
      created: false,
    };
  }

  const createFields = createDriverSchema.parse({
    phone: phoneE164,
    name: input.name,
    email: input.email,
  });

  const created = await client.createRecord<DriverFields>(
    "drivers",
    createFields,
    { typecast: true },
  );

  return {
    driverId: created.id,
    created: true,
  };
}
