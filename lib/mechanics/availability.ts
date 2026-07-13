import { getAirtableClient } from "@/lib/airtable";
import { scheduleStaleAvailabilityCheck } from "@/lib/mechanics/stale-schedule";
import type { AvailabilityStatus } from "@/types/airtable/enums";
import type { AirtableRecord } from "@/types/airtable/common";
import type { MechanicFields } from "@/types/airtable/mechanics";
import { updateMechanicSchema } from "@/types/airtable/schemas";
import { getMechanicById } from "./lookup";

export class MechanicNotEligibleForAvailabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MechanicNotEligibleForAvailabilityError";
  }
}

export type SetMechanicAvailabilityResult = {
  mechanicId: string;
  availabilityOn: boolean;
  availabilityStatus: AvailabilityStatus;
  availabilityUpdatedAt?: string;
};

function toResult(
  record: AirtableRecord<MechanicFields>,
): SetMechanicAvailabilityResult {
  const status = record.fields.availability_status ?? "offline";

  return {
    mechanicId: record.id,
    availabilityOn: status === "available",
    availabilityStatus: status,
    availabilityUpdatedAt: record.fields.availability_updated_at,
  };
}

function assertCanChangeAvailability(fields: MechanicFields): void {
  if (fields.background_check_status === "failed") {
    throw new MechanicNotEligibleForAvailabilityError(
      "This account cannot change availability.",
    );
  }
}

export async function setMechanicAvailability(
  mechanicId: string,
  available: boolean,
): Promise<SetMechanicAvailabilityResult> {
  const mechanic = await getMechanicById(mechanicId);
  const { fields } = mechanic;

  assertCanChangeAvailability(fields);

  if (available) {
    if (!fields.approved) {
      throw new MechanicNotEligibleForAvailabilityError(
        "Only approved mechanics can go available.",
      );
    }

    if (fields.background_check_status !== "cleared") {
      throw new MechanicNotEligibleForAvailabilityError(
        "Background check must be cleared before turning availability on.",
      );
    }

    if (fields.availability_status === "busy") {
      throw new MechanicNotEligibleForAvailabilityError(
        "Cannot go available while on an active job.",
      );
    }

    if (fields.availability_status === "available") {
      return toResult(mechanic);
    }

    const now = new Date().toISOString();
    const updateFields = updateMechanicSchema.parse({
      availability_status: "available",
      availability_updated_at: now,
    });
    const client = getAirtableClient();

    const record = await client.updateRecord<MechanicFields>(
      "mechanics",
      mechanicId,
      updateFields as Partial<MechanicFields>,
      { typecast: true },
    );

    await scheduleStaleAvailabilityCheck(mechanicId);

    return toResult(record);
  }

  if (fields.availability_status === "busy") {
    throw new MechanicNotEligibleForAvailabilityError(
      "Cannot go offline while on an active job.",
    );
  }

  if (fields.availability_status === "offline") {
    return toResult(mechanic);
  }

  const updateFields = updateMechanicSchema.parse({
    availability_status: "offline",
  });
  const client = getAirtableClient();

  const record = await client.updateRecord<MechanicFields>(
    "mechanics",
    mechanicId,
    updateFields as Partial<MechanicFields>,
    { typecast: true },
  );

  return toResult(record);
}
