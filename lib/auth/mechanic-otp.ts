import {
  checkVerification,
  startVerification,
  TwilioError,
} from "@/lib/twilio";
import { normalizeUsPhone } from "@/lib/phone";
import type { MechanicStatus } from "@/types/airtable/enums";
import type { MechanicFields } from "@/types/airtable/mechanics";
import type { AirtableRecord } from "@/types/airtable/common";
import { findMechanicByPhone } from "@/lib/mechanics/lookup";
import { signMechanicSession } from "./mechanic-session";

export class MechanicNotFoundError extends Error {
  constructor() {
    super("No mechanic account found for this phone number.");
    this.name = "MechanicNotFoundError";
  }
}

export class MechanicLockoutError extends Error {
  readonly status: Extract<MechanicStatus, "rejected" | "suspended">;

  constructor(status: Extract<MechanicStatus, "rejected" | "suspended">) {
    const message =
      status === "rejected"
        ? "Your application was not approved. Sign-in is not available for this account."
        : "Your account has been suspended. Sign-in is disabled.";
    super(message);
    this.name = "MechanicLockoutError";
    this.status = status;
  }
}

export class InvalidOtpError extends Error {
  constructor(message = "Invalid or expired verification code.") {
    super(message);
    this.name = "InvalidOtpError";
  }
}

export type MechanicAuthSummary = {
  id: string;
  name: string;
  phone: string;
  email: string;
  accountState: MechanicStatus;
  setupComplete: boolean;
  availabilityOn: boolean;
};

export type VerifyMechanicOtpResult = {
  token: string;
  mechanic: MechanicAuthSummary;
};

function toAuthSummary(
  record: AirtableRecord<MechanicFields>,
): MechanicAuthSummary {
  const { fields } = record;
  return {
    id: record.id,
    name: fields.full_name ?? "",
    phone: fields.phone ?? "",
    email: fields.email ?? "",
    accountState: fields.status,
    setupComplete: Boolean(fields.setup_wizard_completed_at),
    availabilityOn: fields.availability_status === "available",
  };
}

function assertCanSignIn(status: MechanicStatus): void {
  if (status === "rejected" || status === "suspended") {
    throw new MechanicLockoutError(status);
  }
}

async function requireMechanicByPhone(
  phoneE164: string,
): Promise<AirtableRecord<MechanicFields>> {
  const mechanic = await findMechanicByPhone(phoneE164);
  if (!mechanic) {
    throw new MechanicNotFoundError();
  }
  return mechanic;
}

/** Send an SMS OTP to a mechanic's phone. */
export async function sendMechanicOtp(phone: string): Promise<void> {
  const phoneE164 = normalizeUsPhone(phone);
  const mechanic = await requireMechanicByPhone(phoneE164);
  assertCanSignIn(mechanic.fields.status);

  try {
    await startVerification(phoneE164);
  } catch (error) {
    if (error instanceof TwilioError) {
      throw error;
    }
    throw error;
  }
}

/** Verify an OTP and issue a mechanic session JWT. */
export async function verifyMechanicOtp(
  phone: string,
  code: string,
): Promise<VerifyMechanicOtpResult> {
  const phoneE164 = normalizeUsPhone(phone);
  await requireMechanicByPhone(phoneE164);

  let check;
  try {
    check = await checkVerification(phoneE164, code);
  } catch (error) {
    if (error instanceof TwilioError) {
      throw new InvalidOtpError();
    }
    throw error;
  }

  if (!check.valid || check.status !== "approved") {
    throw new InvalidOtpError();
  }

  const mechanic = await requireMechanicByPhone(phoneE164);
  assertCanSignIn(mechanic.fields.status);

  const token = await signMechanicSession({
    mechanicId: mechanic.id,
    phone: phoneE164,
    status: mechanic.fields.status,
  });

  return {
    token,
    mechanic: toAuthSummary(mechanic),
  };
}
