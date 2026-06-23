"use client";
import MechanicTopNav from "./MechanicTopNav";
import Footer from "../../../app/components/Footer";

export default function MechanicSettings() {
  return (
    <div
      className="bg-white flex flex-col items-center relative w-full overflow-x-hidden min-h-screen font-['Albert_Sans:Regular',sans-serif]"
      data-name="Mechanic Settings"
    >
      <div className="relative z-10 w-full max-w-[1440px] px-[24px] md:px-[100px] flex flex-col gap-[40px] items-start mx-auto pb-[40px]">
        <MechanicTopNav activeTab="settings" />

        <div className="w-full pt-[10px] pb-[10px]">
          <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[36px] text-black leading-[1.2] tracking-[-0.5px]">
            Settings
          </h1>
        </div>

        <div className="w-full max-w-[600px] flex flex-col gap-[32px]">
          <div className="bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#D2D2D2] p-[32px] flex flex-col gap-[24px]">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">Personal Info</h2>
              <button className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-[#3b82f6] hover:text-[#2563eb] transition-colors bg-transparent border-none cursor-pointer outline-none p-0">Edit</button>
            </div>

            <div className="flex flex-col gap-4 text-[15px] text-black">
              <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Name:</span> Daniel Martinez</p>
              <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Phone:</span> +1 (555) 123-4567</p>
              <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Email:</span> dmartinez@gmail.com</p>
              <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Zip Code:</span> 30301</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
