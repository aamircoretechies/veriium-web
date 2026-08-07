"use client";

export default function DiagnosisResult() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Nav */}
      <div className="w-full flex items-center justify-between px-[40px] sm:px-[80px] py-[28px] border-b border-[#f0f0f0]">
        <span className="font-['Inter:Bold',sans-serif] font-bold text-[28px] text-black tracking-[0.1px]">
          VERIIUM
        </span>
        <div className="flex items-center gap-[24px]">
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 w-full max-w-[980px] mx-auto px-[24px] sm:px-[40px] py-[40px] flex flex-col gap-[24px]">
        {/* Title */}
        <h1 className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[22px] sm:text-[28px] text-black leading-tight">
          Based on the entered issue, your diagnosis is:
        </h1>

        {/* Diagnosis Card */}
        <div className="bg-[#f7f7f7] rounded-[14px] p-6 sm:p-8 border border-[#ebebeb]">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] sm:text-[22px] text-black">
              Coolant leak detected.
            </span>
            <span className="bg-[#ffd84d] text-black text-[12px] font-['Albert_Sans:Bold',sans-serif] font-bold px-3 py-1 rounded-full whitespace-nowrap">
              Time-sensitive
            </span>
          </div>

          <p className="text-[15px] text-[#444] font-['Albert_Sans:Regular',sans-serif] leading-[1.75] mb-5">
            Based on your description, this appears to be a <strong className="font-semibold text-black">coolant leak</strong> in your car. A coolant is a liquid that keeps your car's engine from getting too hot. A leak means some of that liquid is escaping, which can cause the engine to overheat if it's not fixed. A verified mechanic will confirm the diagnosis before any work begins.
          </p>

          <div className="mb-5">
            <p className="text-[15px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-2">
              What does this mean for you?
            </p>
            <ul className="list-disc ml-5 text-[15px] text-[#444] font-['Albert_Sans:Regular',sans-serif] leading-[1.9] space-y-0.5">
              <li>
                If <strong className="text-black font-semibold">addressed soon</strong>: helps prevent engine overheating and more expensive repairs
              </li>
              <li>
                If <strong className="text-black font-semibold">ignored</strong>: Can lead to overheating, breaks down, or engine damage
              </li>
            </ul>
          </div>

          <div className="mb-5">
            <p className="text-[15px] font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-black mb-1">
              Can I keep driving?
            </p>
            <p className="text-[15px] text-[#444] font-['Albert_Sans:Regular',sans-serif] leading-[1.75]">
              Short trips may be possible, but continued driving increases the risk of overheating.
            </p>
          </div>

          <p className="text-[14px] text-[#888] font-['Albert_Sans:Regular',sans-serif] leading-[1.6]">
            Include additional details about this issue and add your zip code to be matched with a trusted mechanic near you.
          </p>
        </div>

        {/* Estimated Cost */}
        <div className="bg-[#f7f7f7] rounded-[12px] px-6 sm:px-8 py-4 border border-[#ebebeb]">
          <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold text-[16px] text-black">
            Estimated repair cost: <span className="text-[#222] font-bold">$200 – $350</span>
          </p>
          <p className="text-[12px] text-[#aaa] font-['Albert_Sans:Regular',sans-serif] mt-1">
            Final cost confirmed by verified mechanic.
          </p>
        </div>
      </div>
    </div>
  );
}
