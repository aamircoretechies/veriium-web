import type { MechanicJobListItem } from "@/types/api/mechanic-jobs";
import imgCarRepair from "../LandingDesktopV2/4943cb7fc6a48d7dc22bbbde539341ff388b0172.webp";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface RepairItem {
  id: string;
  status: "In Progress" | "Completed";
  title: string;
  customerName: string;
  driverPhone?: string;
  zipCode: string | null;
  serviceTypeLabel?: string;
  scheduledTimeLabel?: string;
  vehicle: string;
  dateLabel: string;
  dateValue: string;
  costLabel: string;
  costValue: string;
  image: string;
}

export function toRepairItem(item: MechanicJobListItem): RepairItem {
  return {
    id: item.jobId,
    status: item.listStatus === "active" ? "In Progress" : "Completed",
    title: item.title,
    customerName: item.customerName,
    driverPhone: item.driver.phone,
    zipCode: item.zipCode,
    serviceTypeLabel: item.serviceTypeLabel,
    scheduledTimeLabel: item.scheduledTimeLabel,
    vehicle: item.vehicleLabel,
    dateLabel: item.dateLabel,
    dateValue: item.dateValue,
    costLabel: item.costLabel,
    costValue: item.costValue,
    image: imgCarRepair.src,
  };
}

function StatusBadge({ status }: { status: "In Progress" | "Completed" }) {
  return (
    <span
      className={`text-[13px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold ${
        status === "In Progress" ? "text-[#e8854a]" : "text-[#22c55e]"
      }`}
    >
      {status}
    </span>
  );
}

export function RepairCard({ repair }: { repair: RepairItem }) {
  const [hovered, setHovered] = useState(false);
  const router = useRouter();

  return (
    <div
      className="border border-[#D2D2D2] rounded-[12px] overflow-hidden transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-name={`repair-card-${repair.id}`}
    >
      <div className="flex flex-col md:flex-row">
        <div className="flex-1 p-[28px] flex flex-col justify-between min-h-[200px]">
          <div className="flex flex-col gap-[6px]">
            <StatusBadge status={repair.status} />

            <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[22px] text-black leading-[1.2] mt-[2px]">
              {repair.title}
            </h2>

            <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[14px] text-black leading-[1.6]">
              Customer:{" "}
              <span className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold underline cursor-pointer hover:text-[#e8854a] transition-colors duration-200">
                {repair.customerName}
              </span>
            </p>

            <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[14px] text-black leading-[1.6]">
              Phone:{" "}
              {repair.driverPhone ? (
                <a
                  href={`tel:${repair.driverPhone}`}
                  className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[#e8854a] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {repair.driverPhone}
                </a>
              ) : (
                <span className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold">
                  —
                </span>
              )}
            </p>

            <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[14px] text-black leading-[1.6]">
              ZIP:{" "}
              <span className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold">
                {repair.zipCode ?? "—"}
              </span>
            </p>

            <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[14px] text-black leading-[1.6]">
              Service:{" "}
              <span className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold">
                {repair.serviceTypeLabel ?? "—"}
              </span>
            </p>

            <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[14px] text-black leading-[1.6]">
              Scheduled:{" "}
              <span className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold">
                {repair.scheduledTimeLabel ?? "As soon as possible"}
              </span>
            </p>

            <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[14px] text-black leading-[1.6]">
              Vehicle:{" "}
              <span className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold">
                {repair.vehicle}
              </span>
            </p>

            <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[14px] text-black leading-[1.6]">
              {repair.dateLabel}: {repair.dateValue}
            </p>

            <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[14px] text-black leading-[1.6]">
              {repair.costLabel}:{" "}
              <span className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold">
                {repair.costValue}
              </span>
            </p>
          </div>

          {repair.status === "In Progress" ? (
            <div className="mt-[16px]">
              <button
                onClick={() => router.push(`/mechanic/repair/${repair.id}`)}
                className="bg-[#ffa270] content-stretch flex flex-col items-center justify-center overflow-clip py-[15px] px-[45px] relative rounded-[12px] shrink-0 cursor-pointer select-none transition-all duration-200 hover:brightness-110 hover:shadow-xl active:scale-95 font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[14px] text-black border-none outline-none"
              >
                View Details
              </button>
            </div>
          ) : (
            <div className="mt-[16px]">
              <button
                onClick={() => router.push(`/mechanic/repair/${repair.id}`)}
                className="bg-white content-stretch flex flex-col items-center justify-center overflow-clip py-[15px] px-[45px] relative rounded-[12px] shrink-0 cursor-pointer select-none transition-all duration-200 hover:bg-gray-50 active:scale-95 font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[14px] text-black border border-[#D2D2D2] outline-none"
              >
                View Details
              </button>
            </div>
          )}
        </div>

        <div className="w-full md:w-[380px] h-[220px] md:h-auto overflow-hidden">
          <img
            src={repair.image}
            alt={repair.title}
            className={`w-full h-full object-cover transition-transform duration-500 ${hovered ? "scale-[1.03]" : "scale-100"}`}
          />
        </div>
      </div>
    </div>
  );
}

export function RepairSection({
  title,
  count,
  repairs,
}: {
  title: string;
  count: number;
  repairs: RepairItem[];
}) {
  return (
    <div className="w-full flex flex-col gap-[16px]">
      <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
        {title} ({count})
      </h2>
      {repairs.length === 0 ? (
        <p className="font-['Albert_Sans:Regular',sans-serif] text-[14px] text-[#666]">
          No repairs in this section.
        </p>
      ) : (
        repairs.map((repair) => (
          <RepairCard key={repair.id} repair={repair} />
        ))
      )}
    </div>
  );
}
