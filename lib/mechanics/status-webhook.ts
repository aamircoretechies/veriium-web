import { getAirtableClient } from "@/lib/airtable";
import {
  approved,
  needsMoreInfo,
  rejected,
  sendSms,
  suspended,
} from "@/lib/twilio";
import type { MechanicStatus } from "@/types/airtable/enums";
import type { MechanicFields } from "@/types/airtable/mechanics";
import { getMechanicById } from "./lookup";

export type MechanicStatusChangeInput = {
  recordId: string;
  status: MechanicStatus;
  previousStatus?: MechanicStatus;
  review_notes?: string;
};

const SMS_STATUSES: MechanicStatus[] = [
  "needs_more_info",
  "approved",
  "rejected",
  "suspended",
];

export async function handleMechanicStatusChange(
  input: MechanicStatusChangeInput,
): Promise<void> {
  if (input.previousStatus !== undefined && input.status === input.previousStatus) {
    return;
  }

  const mechanic = await getMechanicById(input.recordId);
  const phone = mechanic.fields.phone_number;
  const now = new Date().toISOString();
  const updates: Partial<MechanicFields> = {};

  switch (input.status) {
    case "under_review":
      updates.background_check_status = "pending";
      break;
    case "approved":
      updates.approved = true;
      if (!mechanic.fields.approved_at) {
        updates.approved_at = now;
      }
      updates.background_check_status = "cleared";
      updates.availability_status = "offline";
      break;
    case "rejected":
      updates.approved = false;
      updates.background_check_status = "failed";
      break;
    case "suspended":
      updates.approved = false;
      updates.availability_status = "offline";
      break;
    case "needs_more_info":
      break;
    default:
      break;
  }

  if (Object.keys(updates).length > 0) {
    const client = getAirtableClient();
    await client.updateRecord<MechanicFields>(
      "mechanics",
      input.recordId,
      updates,
      { typecast: true },
    );
  }

  if (!phone || !SMS_STATUSES.includes(input.status)) {
    return;
  }

  let body: string;
  switch (input.status) {
    case "needs_more_info":
      body = needsMoreInfo(phone, input.review_notes ?? "");
      break;
    case "approved":
      body = approved(phone);
      break;
    case "rejected":
      body = rejected();
      break;
    case "suspended":
      body = suspended();
      break;
    default:
      return;
  }

  try {
    await sendSms(phone, body);
  } catch (error) {
    console.error(
      `Failed to send ${input.status} SMS for mechanic ${input.recordId}:`,
      error,
    );
  }
}
