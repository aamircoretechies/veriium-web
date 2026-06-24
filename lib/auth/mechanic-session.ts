import { SignJWT, jwtVerify } from "jose";

import { getEnv } from "@/config/env";
import type { MechanicStatus } from "@/types/airtable/enums";

const SESSION_EXPIRY_DAYS = 30;

export type MechanicSessionPayload = {
  mechanicId: string;
  phone: string;
  status: MechanicStatus;
};

export class InvalidMechanicSessionError extends Error {
  constructor(message = "Invalid or expired session.") {
    super(message);
    this.name = "InvalidMechanicSessionError";
  }
}

function getSessionSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv().MECHANIC_SESSION_SECRET);
}

/** Sign a 30-day mechanic session JWT. */
export async function signMechanicSession(
  payload: MechanicSessionPayload,
): Promise<string> {
  return new SignJWT({
    mechanicId: payload.mechanicId,
    phone: payload.phone,
    status: payload.status,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRY_DAYS}d`)
    .sign(getSessionSecret());
}

/** Verify a mechanic session JWT. Throws `InvalidMechanicSessionError` on failure. */
export async function verifyMechanicSession(
  token: string,
): Promise<MechanicSessionPayload> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());

    const mechanicId = payload.mechanicId;
    const phone = payload.phone;
    const status = payload.status;

    if (
      typeof mechanicId !== "string" ||
      typeof phone !== "string" ||
      typeof status !== "string"
    ) {
      throw new InvalidMechanicSessionError();
    }

    return {
      mechanicId,
      phone,
      status: status as MechanicStatus,
    };
  } catch (error) {
    if (error instanceof InvalidMechanicSessionError) {
      throw error;
    }
    throw new InvalidMechanicSessionError();
  }
}
