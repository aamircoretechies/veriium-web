"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Bell } from "lucide-react";
import imgProfileAvatar from "./profile-avatar.png";
import imgCarRepair from "../LandingDesktopV2/4943cb7fc6a48d7dc22bbbde539341ff388b0172.webp";
import Footer from "../../../app/components/Footer";
import MechanicTopNav from "./MechanicTopNav";

interface RepairItem {
  id: string;
  status: "In Progress" | "Completed";
  title: string;
  customerName: string;
  vehicle: string;
  dateLabel: string;
  dateValue: string;
  costLabel: string;
  costValue: string;
  image: string;
}

const activeRepairs: RepairItem[] = [
  {
    id: "1",
    status: "In Progress",
    title: "Coolant Leak",
    customerName: "Andrea S.",
    vehicle: "Bugatti Chiron",
    dateLabel: "Requested",
    dateValue: "Monday, Dec 1 @ 10:30 AM",
    costLabel: "Est. Cost",
    costValue: "$200 – $350",
    image: imgCarRepair.src,
  },
  {
    id: "2",
    status: "In Progress",
    title: "Brake Squeal",
    customerName: "Michael R.",
    vehicle: "BMW M4",
    dateLabel: "Requested",
    dateValue: "Monday, Dec 1 @ 9:15 AM",
    costLabel: "Est. Cost",
    costValue: "$150 – $250",
    image: imgCarRepair.src,
  },
];

const completedRepairs: RepairItem[] = [
  {
    id: "3",
    status: "Completed",
    title: "Check Engine Light",
    customerName: "Sarah K.",
    vehicle: "Audi RS7",
    dateLabel: "Completed",
    dateValue: "Friday, Nov 28, 2025",
    costLabel: "Final Cost",
    costValue: "$180",
    image: imgCarRepair.src,
  },
];

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

function RepairCard({ repair }: { repair: RepairItem }) {
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
              Customer: <span className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold underline cursor-pointer hover:text-[#e8854a] transition-colors duration-200">{repair.customerName}</span>
            </p>

            <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[14px] text-black leading-[1.6]">
              Vehicle: <span className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold">{repair.vehicle}</span>
            </p>

            <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[14px] text-black leading-[1.6]">
              {repair.dateLabel}: {repair.dateValue}
            </p>

            <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[14px] text-black leading-[1.6]">
              {repair.costLabel}: <span className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold">{repair.costValue}</span>
            </p>
          </div>

          {repair.status === "In Progress" && (
            <div className="mt-[16px]">
              <button
                onClick={() => router.push(`/mechanic/repair/${repair.id}`)}
                className="bg-[#ffa270] content-stretch flex flex-col items-center justify-center overflow-clip py-[15px] px-[45px] relative rounded-[12px] shrink-0 cursor-pointer select-none transition-all duration-200 hover:brightness-110 hover:shadow-xl active:scale-95 font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[14px] text-black border-none outline-none"
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

function RepairSection({ title, count, repairs }: { title: string; count: number; repairs: RepairItem[] }) {
  return (
    <div className="w-full flex flex-col gap-[16px]">
      <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">{title} ({count})</h2>
      {repairs.map((r) => (
        <RepairCard key={r.id} repair={r} />
      ))}
    </div>
  );
}

function ProfileAvatar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="relative shrink-0">
      <div className="flex items-center gap-[8px] cursor-pointer transition-opacity duration-200 hover:opacity-80" onClick={() => setIsOpen(!isOpen)}>
        <img src={imgProfileAvatar.src} alt="Profile" className="w-[40px] h-[40px] rounded-full object-cover border-2 border-gray-200" />
        <ChevronDown className="w-[16px] h-[16px] text-black" strokeWidth={2} />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-[56px] z-50 w-[280px] bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-[#D2D2D2] p-6 flex flex-col gap-5 font-['Albert_Sans:Regular',sans-serif]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-black leading-tight">Daniel M.</span>
                <span className="text-[13px] text-gray-500 mt-1">+1 (555) 123-4567</span>
              </div>
              <img src={imgProfileAvatar.src} alt="Profile" className="w-[44px] h-[44px] rounded-full object-cover" />
            </div>
            <div className="flex flex-col gap-4 border-t border-[#D2D2D2] pt-4">
              <button className="text-[15px] text-black hover:text-[#ffa270] transition-colors bg-transparent border-none cursor-pointer text-left p-0">Account</button>
              <button className="text-[15px] text-black hover:text-[#ffa270] transition-colors bg-transparent border-none cursor-pointer text-left p-0">Settings</button>
              <button onClick={() => { setIsOpen(false); router.push('/public'); }} className="text-[15px] text-[#e11d48] hover:text-[#be123c] transition-colors bg-transparent border-none cursor-pointer text-left p-0 font-['Albert_Sans:Bold',sans-serif] font-bold">Log Out</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TopNav({ activeTab }: { activeTab: "dashboard" | "my-repairs" }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between w-full py-[16px]" data-name="Mechanic Top Nav">
      <div onClick={() => router.push('/mechanic')} className="[word-break:break-word] flex flex-col font-['Inter:Bold',sans-serif] font-bold justify-center leading-[0] not-italic relative shrink-0 text-[28px] text-black tracking-[0.1px] whitespace-nowrap cursor-pointer select-none transition-opacity duration-200 hover:opacity-80">
        <p className="leading-[20px]">VERIIUM</p>
      </div>

      <div className="flex items-center gap-[8px]">
        {(["dashboard", "my-repairs"] as const).map((tab) => (
          <button key={tab} className={`px-[20px] py-[10px] rounded-[20px] font-['Albert_Sans:Medium',sans-serif] font-medium text-[16px] cursor-pointer select-none transition-all duration-200 border-none outline-none ${activeTab === tab ? "bg-[#ffa270] text-black" : "bg-transparent text-black hover:bg-gray-100"}`}>{tab === "dashboard" ? "Dashboard" : "My Repairs"}</button>
        ))}
      </div>

      <div className="flex items-center gap-[16px]">
        <button className="bg-transparent border-none cursor-pointer p-0 text-black hover:text-[#ffa270] transition-colors"><Bell className="w-[22px] h-[22px]" strokeWidth={2} /></button>
        <ProfileAvatar />
      </div>
    </div>
  );
}

function WelcomeHeading({ name }: { name: string }) {
  return (
    <div className="w-full pt-[10px] pb-[4px]">
      <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[36px] text-black leading-[1.2] tracking-[-0.5px]">Welcome, {name}</h1>
    </div>
  );
}

export default function MechanicDashboard() {
  return (
    <div className="bg-white flex flex-col items-center relative w-full overflow-x-hidden min-h-screen" data-name="Mechanic Dashboard">
      <div className="relative z-10 w-full max-w-[1440px] px-[24px] md:px-[100px] flex flex-col gap-[40px] items-start mx-auto pb-[40px]">
        <MechanicTopNav activeTab="dashboard" />
        <WelcomeHeading name="Daniel" />

        <RepairSection title="Active Repairs" count={activeRepairs.length} repairs={activeRepairs} />

        <RepairSection title="Completed Repairs" count={completedRepairs.length} repairs={completedRepairs} />
      </div>

      <Footer />
    </div>
  );
}
