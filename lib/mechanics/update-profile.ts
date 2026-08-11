import { getAirtableClient } from "@/lib/airtable";
import {
  InvalidAttachmentUrlError,
  validateIntakeAttachmentUrl,
} from "@/lib/cloudinary/validate-url";
import type { MechanicDashboardProfile } from "@/types/api/mechanic-dashboard";
import type { MechanicProfilePatchRequest } from "@/types/api/mechanic-profile";
import type { MechanicFields } from "@/types/airtable/mechanics";
import { updateMechanicSchema } from "@/types/airtable/schemas";

import { toMechanicDashboardProfile } from "./dashboard-profile";
import { getMechanicById } from "./lookup";

export class MechanicNotEligibleForProfileUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MechanicNotEligibleForProfileUpdateError";
  }
}

function assertEligibleForProfileUpdate(fields: MechanicFields): void {
  if (!fields.approved) {
    throw new MechanicNotEligibleForProfileUpdateError(
      "Only approved mechanics can update their profile.",
    );
  }
}

export function mapProfilePatchToAirtableFields(
  input: MechanicProfilePatchRequest,
): Partial<MechanicFields> {
  const airtableFields: Partial<MechanicFields> = {};

  if (input.photoUrl !== undefined) {
    validateIntakeAttachmentUrl(input.photoUrl);
    airtableFields.profile_photo_url = input.photoUrl;
  }
  if (input.bio !== undefined) {
    airtableFields.bio = input.bio;
  }
  if (input.languages !== undefined) {
    airtableFields.languages = input.languages;
  }

  return updateMechanicSchema.parse(airtableFields) as Partial<MechanicFields>;
}

export async function updateMechanicProfile(
  mechanicId: string,
  input: MechanicProfilePatchRequest,
): Promise<MechanicDashboardProfile> {
  const mechanic = await getMechanicById(mechanicId);
  assertEligibleForProfileUpdate(mechanic.fields);

  const updateFields = mapProfilePatchToAirtableFields(input);

  const client = getAirtableClient();
  const record = await client.updateRecord<MechanicFields>(
    "mechanics",
    mechanicId,
    updateFields,
    { typecast: true },
  );

  return toMechanicDashboardProfile(record);
}

export { InvalidAttachmentUrlError };
