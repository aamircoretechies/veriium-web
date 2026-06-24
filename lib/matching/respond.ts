import { getDriverById } from "@/lib/drivers/lookup";
import { InvalidJobTransitionError } from "@/lib/jobs/transitions";
import { getJobById } from "@/lib/jobs/lookup";
import { updateJobStatus } from "@/lib/jobs/update";
import { getMechanicById } from "@/lib/mechanics/lookup";
import { sendSms } from "@/lib/twilio/sms";
import {
  matchAcceptedDriver,
  matchAlreadyAssigned,
} from "@/lib/twilio/templates";
import type { AirtableRecord } from "@/types/airtable/common";
import type { JobFields } from "@/types/airtable/jobs";
import { escalateToTier } from "./escalate";
import {
  AlreadyAssignedError,
  InvalidMatchResponseError,
  MechanicNotAssignedError,
} from "./errors";
import { markMechanicBusy } from "./mechanic-update";

export type MatchResponseCommand = "ACCEPT" | "DECLINE" | "YES" | "NO";

export type MatchResponseResult = {
  jobId: string;
  status: string;
  action: "accepted" | "declined" | "ignored" | "already_assigned";
};

async function notifyDriverAccepted(
  job: AirtableRecord<JobFields>,
): Promise<void> {
  const driverId = job.fields.driver?.[0];
  if (!driverId) {
    return;
  }

  try {
    const driver = await getDriverById(driverId);
    await sendSms(driver.fields.phone, matchAcceptedDriver());
  } catch (error) {
    console.error(
      `[matching/respond] Failed to notify driver for job ${job.id}:`,
      error,
    );
  }
}

function mechanicLinkedToJob(
  job: AirtableRecord<JobFields>,
  mechanicId: string,
): boolean {
  return job.fields.mechanic?.includes(mechanicId) ?? false;
}

async function acceptTier1Assignment(
  job: AirtableRecord<JobFields>,
  mechanicId: string,
): Promise<MatchResponseResult> {
  if (job.fields.status === "accepted_by_mechanic") {
    throw new AlreadyAssignedError(job.id);
  }

  if (job.fields.status !== "matched") {
    throw new InvalidMatchResponseError("ACCEPT", job.fields.status);
  }

  if (!mechanicLinkedToJob(job, mechanicId)) {
    throw new MechanicNotAssignedError(job.id, mechanicId);
  }

  const updated = await updateJobStatus(job.id, {
    status: "accepted_by_mechanic",
  });
  await markMechanicBusy(mechanicId);
  await notifyDriverAccepted(updated);

  return {
    jobId: job.id,
    status: updated.fields.status,
    action: "accepted",
  };
}

async function declineTier1Assignment(
  job: AirtableRecord<JobFields>,
  mechanicId: string,
): Promise<MatchResponseResult> {
  if (job.fields.status !== "matched") {
    throw new InvalidMatchResponseError("DECLINE", job.fields.status);
  }

  if (!mechanicLinkedToJob(job, mechanicId)) {
    throw new MechanicNotAssignedError(job.id, mechanicId);
  }

  await updateJobStatus(job.id, { mechanic: [] });
  await escalateToTier(job.id, 2);

  const refreshed = await getJobById(job.id);
  return {
    jobId: job.id,
    status: refreshed.fields.status,
    action: "declined",
  };
}

async function acceptBroadcast(
  job: AirtableRecord<JobFields>,
  mechanicId: string,
): Promise<MatchResponseResult> {
  if (job.fields.status === "accepted_by_mechanic") {
    throw new AlreadyAssignedError(job.id);
  }

  if (
    job.fields.status !== "matched_tier2" &&
    job.fields.status !== "matched_tier3"
  ) {
    throw new InvalidMatchResponseError("YES", job.fields.status);
  }

  try {
    const updated = await updateJobStatus(job.id, {
      status: "accepted_by_mechanic",
      mechanic: [mechanicId],
    });
    await markMechanicBusy(mechanicId);
    await notifyDriverAccepted(updated);

    return {
      jobId: job.id,
      status: updated.fields.status,
      action: "accepted",
    };
  } catch (error) {
    if (error instanceof InvalidJobTransitionError) {
      throw new AlreadyAssignedError(job.id);
    }
    throw error;
  }
}

async function notifyAlreadyAssigned(mechanicId: string): Promise<void> {
  try {
    const mechanic = await getMechanicById(mechanicId);
    if (!mechanic.fields.phone) {
      return;
    }
    await sendSms(mechanic.fields.phone, matchAlreadyAssigned());
  } catch (error) {
    console.error(
      `[matching/respond] Failed to send already-assigned SMS to ${mechanicId}:`,
      error,
    );
  }
}

/**
 * Handle mechanic SMS responses during the matching phase (ACCEPT / DECLINE / YES / NO).
 */
export async function handleMatchResponse(
  jobId: string,
  mechanicId: string,
  command: MatchResponseCommand,
): Promise<MatchResponseResult> {
  const job = await getJobById(jobId);

  if (command === "NO") {
    return {
      jobId,
      status: job.fields.status,
      action: "ignored",
    };
  }

  try {
    switch (command) {
      case "ACCEPT":
        return await acceptTier1Assignment(job, mechanicId);
      case "DECLINE":
        return await declineTier1Assignment(job, mechanicId);
      case "YES":
        return await acceptBroadcast(job, mechanicId);
    }
  } catch (error) {
    if (error instanceof AlreadyAssignedError) {
      await notifyAlreadyAssigned(mechanicId);
      return {
        jobId,
        status: job.fields.status,
        action: "already_assigned",
      };
    }
    throw error;
  }
}
