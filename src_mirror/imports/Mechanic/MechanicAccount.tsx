"use client";
import MechanicTopNav from "./MechanicTopNav";
import Footer from "../../../app/components/Footer";
import imgProfileAvatar from "./profile-avatar.png";
import { useMechanicAuth } from "./MechanicAuthContext";

export default function MechanicAccount() {
  const { mechanic } = useMechanicAuth();
  const isAvailable = mechanic?.availabilityOn ?? false;
  return (
    <div
      className="bg-white flex flex-col items-center relative w-full overflow-x-hidden min-h-screen font-['Albert_Sans:Regular',sans-serif]"
      data-name="Mechanic Account"
    >
      <div className="relative z-10 w-full max-w-[1440px] px-[24px] md:px-[100px] flex flex-col gap-[40px] items-start mx-auto pb-[40px]">
        <MechanicTopNav activeTab="account" />

        <div className="w-full pt-[10px] pb-[10px]">
          <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[36px] text-black leading-[1.2] tracking-[-0.5px]">
            Account
          </h1>
        </div>

        <div className="w-full flex flex-col gap-[32px]">
          {/* Profile Picture Card */}
          <div className="bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#D2D2D2] p-[32px] flex flex-col gap-[32px]">
            <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
              Profile Picture
            </h2>

            <div className="flex justify-center w-full">
              <img
                src={imgProfileAvatar.src}
                alt="Profile"
                className="w-[180px] h-[180px] rounded-full object-cover border-4 border-black"
              />
            </div>

            <div className="flex justify-between items-center mt-2 px-2">
              <button className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] text-black hover:text-[#ffa270] transition-colors bg-transparent border-none cursor-pointer outline-none p-0">
                Change
              </button>
              <button className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] text-black hover:text-[#ffa270] transition-colors bg-transparent border-none cursor-pointer outline-none p-0">
                Remove
              </button>
            </div>
          </div>

          {/* Info Cards Grid */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-[32px]">
            {/* Personal Info Card */}
            <div className="bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#D2D2D2] p-[32px] flex flex-col gap-[24px]">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
                  Personal Info
                </h2>
                <button className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-[#3b82f6] hover:text-[#2563eb] transition-colors bg-transparent border-none cursor-pointer outline-none p-0">
                  Edit
                </button>
              </div>

              <div className="flex flex-col gap-4 text-[15px] text-black">
                <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Name:</span> Daniel Martinez</p>
                <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Phone:</span> +1 (555) 123-4567</p>
                <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Email:</span> dmartinez@gmail.com</p>
              </div>
            </div>

            {/* Professional Info Card */}
            <div className="bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#D2D2D2] p-[32px] flex flex-col gap-[24px]">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
                  Professional Info
                </h2>
                <button className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-[#3b82f6] hover:text-[#2563eb] transition-colors bg-transparent border-none cursor-pointer outline-none p-0">
                  Edit
                </button>
              </div>

              <div className="flex flex-col gap-4 text-[15px] text-black">
                <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Experience:</span> 8 years</p>
                <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Bio:</span> ASE-certified master technician specializing in European cars and complex electrical diagnostics.</p>
                <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Languages:</span> English, Spanish</p>
                <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">ASE Certified:</span> Yes</p>
                <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Other Certs:</span> BMW Master Tech</p>
              </div>
            </div>

            {/* Service Information Card */}
            <div className="bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#D2D2D2] p-[32px] flex flex-col gap-[24px]">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
                  Service Information
                </h2>
                <button className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-[#3b82f6] hover:text-[#2563eb] transition-colors bg-transparent border-none cursor-pointer outline-none p-0">
                  Edit
                </button>
              </div>

              <div className="flex flex-col gap-4 text-[15px] text-black">
                <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Categories:</span> Engine, Brakes, Electrical, Diagnostics</p>
                <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Mobile Mechanic Available:</span> Yes</p>
                <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Shop-Based Service Available:</span> No</p>
              </div>
            </div>

            {/* Service Area & Availability Card */}
            <div className="bg-white rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#D2D2D2] p-[32px] flex flex-col gap-[24px]">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">
                  Service Area & Availability
                </h2>
                <button className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-[#3b82f6] hover:text-[#2563eb] transition-colors bg-transparent border-none cursor-pointer outline-none p-0">
                  Edit
                </button>
              </div>

              <div className="flex flex-col gap-4 text-[15px] text-black">
                <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Primary ZIP Code:</span> 30301</p>
                <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Service Radius:</span> 20 miles</p>
                <p><span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Shop Address:</span> N/A</p>
                <div className="h-px bg-gray-200 my-1 w-full" />
                <div className="flex items-center justify-between">
                  <span className="font-['Albert_Sans:Bold',sans-serif] font-bold">Accepting Jobs:</span>
                  <span className={`px-3 py-1 rounded-full font-semibold text-sm ${
                    isAvailable
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {isAvailable ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
