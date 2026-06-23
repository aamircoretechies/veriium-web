"use client";
"use client";
import { useState } from "react";
import { CircleUser, FileText, Settings, LogOut, Bell, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import imgProfileAvatar from "./profile-avatar.png";
import { useMechanicAuth } from "./MechanicAuthContext";

export function Logo() {
  const router = useRouter();
  return (
    <div
      onClick={() => router.push('/mechanic')}
      className="flex flex-col items-center justify-center py-[10px] relative shrink-0 cursor-pointer select-none transition-opacity duration-200 hover:opacity-80"
      data-name="LOGO"
    >
      <div className="[word-break:break-word] flex flex-col font-['Inter:Bold',sans-serif] font-bold justify-center leading-[0] not-italic relative shrink-0 text-[28px] text-black tracking-[0.1px] whitespace-nowrap">
        <p className="leading-[20px]">VERIIUM</p>
      </div>
    </div>
  );
}

export function NavPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-[20px] py-[10px] rounded-[20px] font-['Albert_Sans:Medium',sans-serif] font-medium text-[16px]
        cursor-pointer select-none transition-all duration-200 border-none outline-none
        ${active
          ? "bg-[#ffa270] text-black"
          : "bg-transparent text-black hover:bg-gray-100"
        }
      `}
    >
      {label}
    </button>
  );
}

export function AvailabilityToggle() {
  const { mechanic, setAvailability } = useMechanicAuth();
  const isOn = mechanic?.availabilityOn ?? false;

  return (
    <button
      onClick={() => setAvailability(!isOn)}
      className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all duration-200 cursor-pointer select-none font-['Albert_Sans:Bold',sans-serif] font-bold text-[13px] ${
        isOn
          ? "bg-green-50 border-green-400 text-green-700 hover:bg-green-100"
          : "bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100"
      }`}
      title={isOn ? "You are accepting jobs. Click to go offline." : "You are offline. Click to accept jobs."}
    >
      <span
        className={`w-[8px] h-[8px] rounded-full transition-colors duration-200 shrink-0 ${
          isOn ? "bg-green-500" : "bg-gray-400"
        }`}
      />
      {isOn ? "Online" : "Offline"}
    </button>
  );
}

export function ProfileAvatar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { mechanic, signOut } = useMechanicAuth();

  const handleSignOut = () => {
    setIsOpen(false);
    signOut();
    router.push("/m/signin");
  };

  return (
    <div className="relative shrink-0">
      <div
        className="flex items-center gap-[8px] cursor-pointer transition-opacity duration-200 hover:opacity-80"
        onClick={() => setIsOpen(!isOpen)}
      >
        <img
          src={imgProfileAvatar.src}
          alt="Profile"
          className="w-[40px] h-[40px] rounded-full object-cover border-2 border-gray-200"
        />
        <ChevronDown className="w-[16px] h-[16px] text-black" strokeWidth={2} />
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-[56px] z-50 w-[300px] bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-[#D2D2D2] p-6 flex flex-col gap-6 font-['Albert_Sans:Regular',sans-serif]">

            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-black leading-tight">{mechanic?.name ?? "Mechanic"}</span>
                <span className="text-[14px] text-gray-500 mt-1">{mechanic?.phone ?? ""}</span>
              </div>
              <img
                src={imgProfileAvatar.src}
                alt="Profile"
                className="w-[48px] h-[48px] rounded-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-5 mt-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/mechanic/account');
                }}
                className="flex items-center gap-4 text-black hover:text-[#ffa270] transition-colors bg-transparent border-none cursor-pointer outline-none w-full text-left p-0"
              >
                <CircleUser className="w-[22px] h-[22px]" strokeWidth={2} />
                <span className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[16px]">Account</span>
              </button>

              <button className="flex items-center gap-4 text-black hover:text-[#ffa270] transition-colors bg-transparent border-none cursor-pointer outline-none w-full text-left p-0">
                <FileText className="w-[22px] h-[22px]" strokeWidth={2} />
                <span className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[16px]">Documents</span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/mechanic/settings');
                }}
                className="flex items-center gap-4 text-black hover:text-[#ffa270] transition-colors bg-transparent border-none cursor-pointer outline-none w-full text-left p-0"
              >
                <Settings className="w-[22px] h-[22px]" strokeWidth={2} />
                <span className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[16px]">Settings</span>
              </button>
            </div>

            <div className="mt-1">
              <button
                onClick={() => { setIsOpen(false); signOut(); router.push('/m/signin'); }}
                className="flex items-center gap-4 text-[#e11d48] hover:text-[#be123c] transition-colors bg-transparent border-none cursor-pointer outline-none w-full text-left p-0"
              >
                <LogOut className="w-[22px] h-[22px]" strokeWidth={2} />
                <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px]">Sign Out</span>
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  const notifications = [
    { id: 1, title: "New Repair Request", desc: "You have a new request for a Coolant Leak.", time: "10 min ago", unread: true },
    { id: 2, title: "Payment Received", desc: "Your payment of $195 has been processed.", time: "2 hours ago", unread: false },
    { id: 3, title: "System Update", desc: "Veriium will undergo maintenance tonight.", time: "1 day ago", unread: false },
  ];

  return (
    <div className="relative shrink-0">
      <button 
        className="bg-transparent border-none cursor-pointer p-0 text-black hover:text-[#ffa270] transition-colors relative flex items-center justify-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-[22px] h-[22px]" strokeWidth={2} />
        <span className="absolute top-[1px] right-[2px] w-[8px] h-[8px] bg-red-500 rounded-full border border-white"></span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="fixed md:absolute left-[16px] right-[16px] md:left-auto md:right-0 top-[70px] md:top-[40px] z-50 md:w-[320px] bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-[#D2D2D2] p-0 flex flex-col font-['Albert_Sans:Regular',sans-serif] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] text-black">Notifications</span>
              <span className="text-[12px] text-[#ffa270] font-bold cursor-pointer hover:underline">Mark all as read</span>
            </div>
            
            <div className="flex flex-col max-h-[300px] overflow-y-auto">
              {notifications.map(n => (
                <div key={n.id} className={`p-4 border-b border-gray-100 hover:bg-gray-50 flex flex-col gap-1 cursor-pointer ${n.unread ? 'bg-[#ffa270]/10' : ''}`}>
                  <div className="flex justify-between items-start gap-2">
                    <span className={`text-[14px] ${n.unread ? "font-['Albert_Sans:Bold',sans-serif] font-bold text-black" : "font-['Albert_Sans:Medium',sans-serif] font-medium text-gray-800"}`}>
                      {n.title}
                    </span>
                    <span className="text-[12px] text-gray-400 whitespace-nowrap">{n.time}</span>
                  </div>
                  <p className="text-[13px] text-gray-500 leading-snug m-0">{n.desc}</p>
                </div>
              ))}
            </div>
            
            <div className="p-3 text-center border-t border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setIsOpen(false)}>
              <span className="text-[13px] text-gray-600 font-['Albert_Sans:Medium',sans-serif]">View all notifications</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function MechanicTopNav({ activeTab }: { activeTab?: "dashboard" | "my-repairs" | "account" | "settings" }) {
  const router = useRouter();

  return (
    <div className="flex flex-col w-full py-[16px] gap-4 md:gap-0" data-name="Mechanic Top Nav">
      <div className="flex items-center justify-between w-full">
        <Logo />

        <div className="hidden md:flex items-center gap-[8px]">
          <NavPill
            label="Dashboard"
            active={activeTab === "dashboard"}
            onClick={() => router.push('/mechanic')}
          />
          <NavPill
            label="My Repairs"
            active={activeTab === "my-repairs"}
          />
        </div>

        <div className="flex items-center gap-[16px]">
          <AvailabilityToggle />
          <NotificationDropdown />
          <ProfileAvatar />
        </div>
      </div>

      <div className="flex md:hidden items-center justify-center gap-[8px] w-full border-t border-gray-100 pt-3">
        <NavPill
          label="Dashboard"
          active={activeTab === "dashboard"}
          onClick={() => router.push('/mechanic')}
        />
        <NavPill
          label="My Repairs"
          active={activeTab === "my-repairs"}
        />
      </div>
    </div>
  );
}
