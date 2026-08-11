"use client";
import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../../app/components/Footer";
import MechanicTopNav from "./MechanicTopNav";
import { RepairSection, toRepairItem, type RepairItem } from "./MechanicRepairList";
import { useMechanicAuth } from "./MechanicAuthContext";
import type {
  MechanicJobListItem,
  MechanicJobsEarnings,
} from "@/types/api/mechanic-jobs";
import type {
  MechanicDashboardProfile,
  MechanicDashboardServiceSetup,
} from "@/types/api/mechanic-dashboard";

const TOKEN_KEY = "veriium_mechanic_token";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function formatCertifiedStatus(
  status: MechanicDashboardProfile["certifiedStatus"],
): string {
  switch (status) {
    case "certified":
      return "ASE Certified";
    case "pending_review":
      return "Certification pending review";
    default:
      return "Not certified";
  }
}

function DashboardCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#D2D2D2] p-[32px] flex flex-col gap-[20px] w-full">
      <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
        {title}
      </h2>
      {children}
    </div>
  );
}

function ProfileSection({
  name,
  phone,
  email,
  profile,
  onViewAccount,
}: {
  name: string;
  phone: string;
  email: string;
  profile: MechanicDashboardProfile;
  onViewAccount: () => void;
}) {
  const languages =
    profile.languages.length > 0 ? profile.languages.join(", ") : "—";

  return (
    <DashboardCard title="Profile">
      <div className="flex flex-col md:flex-row gap-[24px] items-start">
        {profile.photoUrl ? (
          <img
            src={profile.photoUrl}
            alt={name}
            className="w-[100px] h-[100px] rounded-full object-cover border-4 border-black shrink-0"
          />
        ) : (
          <div className="w-[100px] h-[100px] rounded-full border-4 border-black bg-[#ffa270] flex items-center justify-center shrink-0">
            <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[28px] text-black">
              {initialsFromName(name)}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-[8px] text-[15px] text-black flex-1">
          <p>
            <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
              Name:
            </span>{" "}
            {name}
          </p>
          <p>
            <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
              Phone:
            </span>{" "}
            {phone}
          </p>
          <p>
            <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
              Email:
            </span>{" "}
            {email || "—"}
          </p>
          <p>
            <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
              Languages:
            </span>{" "}
            {languages}
          </p>
          <p>
            <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
              Certification:
            </span>{" "}
            {formatCertifiedStatus(profile.certifiedStatus)}
          </p>
          {profile.certifications ? (
            <p>
              <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                Credentials:
              </span>{" "}
              <span className="whitespace-pre-line">{profile.certifications}</span>
            </p>
          ) : null}
          {profile.bio ? (
            <p>
              <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
                Bio:
              </span>{" "}
              {profile.bio}
            </p>
          ) : null}
        </div>
      </div>

      <button
        onClick={onViewAccount}
        className="self-start font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[14px] text-[#3b82f6] hover:text-[#2563eb] transition-colors bg-transparent border-none cursor-pointer outline-none p-0"
      >
        View full account →
      </button>
    </DashboardCard>
  );
}

function ServiceSetupSection({
  serviceSetup,
  availabilityOn,
}: {
  serviceSetup: MechanicDashboardServiceSetup;
  availabilityOn: boolean;
}) {
  const categories =
    serviceSetup.categoryLabels.length > 0
      ? serviceSetup.categoryLabels.join(", ")
      : "—";
  const zipCodes =
    serviceSetup.zipCodes.length > 0
      ? serviceSetup.zipCodes.join(", ")
      : "—";
  const tools =
    serviceSetup.tools.length > 0 ? serviceSetup.tools.join(", ") : "—";

  return (
    <DashboardCard title="Service Setup">
      <div className="flex flex-col gap-[10px] text-[15px] text-black">
        <p>
          <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
            Categories:
          </span>{" "}
          {categories}
        </p>
        <p>
          <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
            Service ZIPs:
          </span>{" "}
          {zipCodes}
        </p>
        <p>
          <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
            Tools:
          </span>{" "}
          {tools}
        </p>
        <p>
          <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
            Shop address:
          </span>{" "}
          {serviceSetup.shopAddress ?? "Mobile only"}
        </p>
        <p>
          <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
            Mobile service:
          </span>{" "}
          {serviceSetup.mobileAvailable ? "Yes" : "No"}
        </p>
        <p>
          <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
            Shop service:
          </span>{" "}
          {serviceSetup.shopAvailable ? "Yes" : "No"}
        </p>
        <div className="flex items-center justify-between pt-[8px] border-t border-gray-200">
          <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">
            Accepting jobs:
          </span>
          <span
            className={`px-3 py-1 rounded-full font-semibold text-sm ${
              availabilityOn
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {availabilityOn ? "Online" : "Offline"}
          </span>
        </div>
      </div>
    </DashboardCard>
  );
}

function EarningsSection({
  earnings,
  recentPayouts,
}: {
  earnings: MechanicJobsEarnings;
  recentPayouts: MechanicJobListItem[];
}) {
  return (
    <DashboardCard title="Earnings">
      <div className="flex flex-col gap-[8px]">
        <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[32px] text-black leading-[1.2]">
          {earnings.formattedTotal}
        </p>
        <p className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#666]">
          {earnings.completedJobCount === 1
            ? "1 completed job with payout"
            : `${earnings.completedJobCount} completed jobs with payout`}
        </p>
        <p className="font-['Albert_Sans:Regular',sans-serif] text-[13px] text-[#888]">
          Paid manually by Veriium via ACH
        </p>
      </div>

      {earnings.totalPayout === 0 ? (
        <p className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#666]">
          No earnings yet — complete your first repair to see payouts here.
        </p>
      ) : recentPayouts.length > 0 ? (
        <div className="flex flex-col gap-[8px]">
          <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[14px] text-black">
            Recent payouts
          </p>
          <ul className="flex flex-col gap-[6px]">
            {recentPayouts.map((job) => (
              <li
                key={job.jobId}
                className="flex justify-between items-center text-[14px] text-black border-b border-gray-100 pb-[6px]"
              >
                <span className="font-['Albert_Sans:Regular',sans-serif] truncate pr-4">
                  {job.title}
                </span>
                <span className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold shrink-0">
                  {job.mechanicPayoutLabel ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </DashboardCard>
  );
}

function WelcomeHeading({ name }: { name: string }) {
  return (
    <div className="w-full pt-[10px] pb-[4px]">
      <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[36px] text-black leading-[1.2] tracking-[-0.5px]">
        Welcome, {name}
      </h1>
    </div>
  );
}

export default function MechanicDashboard() {
  const router = useRouter();
  const { mechanic, hydrated, signOut } = useMechanicAuth();
  const [activeRepairs, setActiveRepairs] = useState<RepairItem[]>([]);
  const [completedRepairs, setCompletedRepairs] = useState<RepairItem[]>([]);
  const [completedJobs, setCompletedJobs] = useState<MechanicJobListItem[]>([]);
  const [profile, setProfile] = useState<MechanicDashboardProfile | null>(null);
  const [serviceSetup, setServiceSetup] =
    useState<MechanicDashboardServiceSetup | null>(null);
  const [earnings, setEarnings] = useState<MechanicJobsEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated || !mechanic) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      const authHeaders = { Authorization: `Bearer ${token}` };

      try {
        const [meRes, jobsRes] = await Promise.all([
          fetch("/api/mechanics/me", { headers: authHeaders }),
          fetch("/api/mechanics/jobs", { headers: authHeaders }),
        ]);

        if (
          meRes.status === 401 ||
          meRes.status === 403 ||
          jobsRes.status === 401 ||
          jobsRes.status === 403
        ) {
          signOut();
          return;
        }

        if (!meRes.ok) {
          console.warn(
            `[MechanicDashboard] /api/mechanics/me returned ${meRes.status}`,
          );
        } else {
          const meData = (await meRes.json()) as {
            profile: MechanicDashboardProfile;
            serviceSetup: MechanicDashboardServiceSetup;
          };
          if (!cancelled) {
            setProfile(meData.profile);
            setServiceSetup(meData.serviceSetup);
          }
        }

        if (!jobsRes.ok) {
          console.warn(
            `[MechanicDashboard] /api/mechanics/jobs returned ${jobsRes.status}`,
          );
        } else {
          const jobsData = (await jobsRes.json()) as {
            active: MechanicJobListItem[];
            completed: MechanicJobListItem[];
            earnings: MechanicJobsEarnings;
          };
          if (!cancelled) {
            setActiveRepairs(jobsData.active.map(toRepairItem));
            setCompletedRepairs(jobsData.completed.map(toRepairItem));
            setCompletedJobs(jobsData.completed);
            setEarnings(jobsData.earnings);
          }
        }
      } catch (error) {
        console.warn("[MechanicDashboard] Failed to load dashboard:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [hydrated, mechanic, signOut]);

  const displayName = mechanic?.name ?? "";
  const recentPayouts = completedJobs
    .filter((job) => job.mechanicPayout !== undefined)
    .slice(0, 5);

  return (
    <div className="bg-white flex flex-col items-center relative w-full overflow-x-hidden min-h-screen" data-name="Mechanic Dashboard">
      <div className="relative z-10 w-full max-w-[1440px] px-[24px] md:px-[100px] flex flex-col gap-[40px] items-start mx-auto pb-[40px]">
        <MechanicTopNav activeTab="dashboard" />
        <WelcomeHeading name={displayName} />

        {loading && (
          <p className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#666]">
            Loading dashboard…
          </p>
        )}

        {!loading && profile && mechanic ? (
          <ProfileSection
            name={mechanic.name}
            phone={mechanic.phone}
            email={mechanic.email}
            profile={profile}
            onViewAccount={() => router.push("/mechanic/account")}
          />
        ) : null}

        {!loading && serviceSetup ? (
          <ServiceSetupSection
            serviceSetup={serviceSetup}
            availabilityOn={mechanic?.availabilityOn ?? false}
          />
        ) : null}

        {!loading && earnings ? (
          <EarningsSection earnings={earnings} recentPayouts={recentPayouts} />
        ) : null}

        <RepairSection title="Active Repairs" count={activeRepairs.length} repairs={activeRepairs} />

        <RepairSection title="Completed Repairs" count={completedRepairs.length} repairs={completedRepairs} />
      </div>

      <Footer />
    </div>
  );
}
