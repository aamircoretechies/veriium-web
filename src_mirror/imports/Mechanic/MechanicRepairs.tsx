"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "../../../app/components/Footer";
import MechanicTopNav from "./MechanicTopNav";
import {
  RepairSection,
  toRepairItem,
  type RepairItem,
} from "./MechanicRepairList";
import { useMechanicAuth } from "./MechanicAuthContext";
import type { MechanicJobListItem } from "@/types/api/mechanic-jobs";

const TOKEN_KEY = "veriium_mechanic_token";

export default function MechanicRepairs() {
  const router = useRouter();
  const { mechanic, hydrated, signOut } = useMechanicAuth();
  const [activeRepairs, setActiveRepairs] = useState<RepairItem[]>([]);
  const [completedRepairs, setCompletedRepairs] = useState<RepairItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated || !mechanic) {
      return;
    }

    let cancelled = false;

    async function loadRepairs() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/mechanics/jobs", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          signOut();
          router.push("/m/signin");
          return;
        }

        if (!res.ok) {
          console.warn(
            `[MechanicRepairs] /api/mechanics/jobs returned ${res.status}`,
          );
        } else {
          const data = (await res.json()) as {
            active: MechanicJobListItem[];
            completed: MechanicJobListItem[];
          };
          if (!cancelled) {
            setActiveRepairs(data.active.map(toRepairItem));
            setCompletedRepairs(data.completed.map(toRepairItem));
          }
        }
      } catch (error) {
        console.warn("[MechanicRepairs] Failed to load repairs:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRepairs();

    return () => {
      cancelled = true;
    };
  }, [hydrated, mechanic, router, signOut]);

  return (
    <div
      className="bg-white flex flex-col items-center relative w-full overflow-x-hidden min-h-screen"
      data-name="Mechanic Repairs"
    >
      <div className="relative z-10 w-full max-w-[1440px] px-[24px] md:px-[100px] flex flex-col gap-[40px] items-start mx-auto pb-[40px]">
        <MechanicTopNav activeTab="my-repairs" />

        <div className="w-full pt-[10px] pb-[4px]">
          <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[36px] text-black leading-[1.2] tracking-[-0.5px]">
            My Repairs
          </h1>
        </div>

        {loading ? (
          <p className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#666]">
            Loading repairs…
          </p>
        ) : (
          <>
            <RepairSection
              title="Active Repairs"
              count={activeRepairs.length}
              repairs={activeRepairs}
            />
            <RepairSection
              title="Completed Repairs"
              count={completedRepairs.length}
              repairs={completedRepairs}
            />
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
