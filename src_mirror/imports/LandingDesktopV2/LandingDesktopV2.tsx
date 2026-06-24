"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiagnosisResponse } from "@/types/api/diagnosis";
import svgPaths from "./svg-g4c32cbyyy";
import DiagnosticModal from "./DiagnosticModal";
import Footer from "../../../app/components/Footer";
import imgKatoBlackmoreQcF19BvViEUnsplash1 from "./Hero Image.webp";
import imgUsmanMalikKE1VnDxg4Unsplash1 from "./4943cb7fc6a48d7dc22bbbde539341ff388b0172.webp";
import imgResumeGeniusIesb4IFVuzAUnsplash1 from "./7c45761470be1a48f05adfbe10f934dd4126c6ed.webp";
import imgKennyEliason2KPg95QlIUnsplash1 from "./4cc2d92e16daf801cabba33aab231dc1d68777d6.webp";
import imgStenRademakerUzUzvJEvKnIUnsplash1 from "./a8d7074ca76c24bfac9318eb92a18bec089723b5.webp";
import imgClarityUnderstanding1 from "./997cb0ef0c3f5d494fc159580ece23f3167e98f6.webp";
import imgPriceFairness1 from "./255561396717deed31ca00e6a74dd38776e3ec36.webp";
import imgDarrenRichardsonIY0GfyaDmU0Unsplash1 from "./e785097614c980a2411e592ed7aba453832c177a.webp";

function Logo() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center overflow-clip py-[40px] relative shrink-0 cursor-pointer select-none transition-opacity duration-200 hover:opacity-80" data-name="LOGO">
      <div className="[word-break:break-word] flex flex-col font-['Inter:Bold',sans-serif] font-bold justify-center leading-[0] text-shadow-[0px_4px_18.75px_black] not-italic relative shrink-0 text-[36px] text-white tracking-[0.1px] whitespace-nowrap">
        <p className="leading-[20px]">VERIIUM</p>
      </div>
    </div>
  );
}

function Frame14() {
  return (
    <div className=" content-stretch  flex items-center relative shrink-0">
      <Logo />
    </div>
  );
}

function Heading() {
  return (
    <div className="[word-break:break-word]  content-stretch drop-shadow-[0px_4px_20.55px_black] flex flex-col gap-[10px] items-start md:items-start leading-[0] pr-[10px] py-[10px] relative shrink-0 text-shadow-[0px_4px_34.2px_black] text-white tracking-[0.1px] whitespace-normal" data-name="Heading">
      <div className="flex flex-col font-['Fustat:Bold',sans-serif] font-bold justify-center relative shrink-0 text-[32px] md:text-[50px]">
        <p className="leading-[1.2] md:leading-[normal]">Fix Your Car the Smart Way</p>
      </div>
      <div className="flex flex-col font-['Albert_Sans:Medium',sans-serif] font-medium justify-center relative shrink-0 text-[18px] md:text-[26px] text-left md:text-left mt-2">
        <p className="leading-[1.4] md:leading-[normal]">Instant diagnosis. Verified mechanics. Connect in minutes.</p>
      </div>
    </div>
  );
}

function Frame11({
  onStartDiagnosis,
  disabled,
}: {
  onStartDiagnosis?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="content-stretch flex items-center relative shrink-0">
      <div
        className={`bg-[#ffa270] content-stretch flex flex-col items-center justify-center overflow-clip px-[20px] md:px-[28px] py-[12px] md:py-[28px] relative rounded-[8px] md:rounded-[12px] shrink-0 select-none transition-all duration-200 ${
          disabled
            ? "opacity-60 cursor-not-allowed"
            : "cursor-pointer hover:brightness-110 hover:shadow-lg active:scale-95"
        }`}
        data-name="Button"
        onClick={disabled ? undefined : onStartDiagnosis}
      >
        <p className="[word-break:break-word] font-['Albert_Sans:Bold',sans-serif] font-bold leading-none relative shrink-0 text-[14px] md:text-[18px] text-black whitespace-nowrap">Diagnose</p>
      </div>
    </div>
  );
}

function TextField({
  value,
  onChange,
  onStartDiagnosis,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onStartDiagnosis?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="bg-white relative rounded-[12px] shrink-0 w-full transition-shadow duration-200 hover:shadow-md" data-name="Text Field">
      <div className="flex flex-col overflow-clip rounded-[inherit] w-full">
        <div className="content-stretch flex items-center justify-between pl-[20px] pr-[6px] py-[6px] relative w-full">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !disabled) {
                onStartDiagnosis?.();
              }
            }}
            disabled={disabled}
            placeholder="What's the issue?"
            className="flex-1 bg-transparent border-none outline-none font-['Albert_Sans:Light',sans-serif] font-light text-[16px] text-black placeholder:text-[rgba(0,0,0,0.5)] py-[14px] pr-[10px] cursor-text disabled:opacity-60"
          />
          <Frame11 onStartDiagnosis={onStartDiagnosis} disabled={disabled} />
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[#d2d2d2] border-solid inset-0 pointer-events-none rounded-[12px] transition-colors duration-200" />
    </div>
  );
}

function Info() {
  return (
    <div className="content-stretch flex gap-[5px] items-center relative shrink-0 cursor-pointer group transition-opacity duration-200 hover:opacity-100 opacity-70" data-name="Info">
      <div className="overflow-clip relative shrink-0 size-[14px]" data-name="Info">
        <div className="absolute inset-[8.33%]" data-name="Icon">
          <div className="absolute inset-[-4.13%_-4.12%_-4.12%_-4.13%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.6292 12.6292">
              <path d={svgPaths.p24dc300} id="Icon" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" strokeWidth="0.9625" />
            </svg>
          </div>
        </div>
      </div>
      <div className="[word-break:break-word] flex flex-col font-['Albert_Sans:Light',sans-serif] font-light justify-center leading-[0] relative shrink-0 text-[12px] text-[rgba(0,0,0,0.5)] tracking-[0.1px] whitespace-nowrap">
        <p className="leading-[20px]">What do I write?</p>
      </div>
    </div>
  );
}

function InputField({
  value,
  onChange,
  onStartDiagnosis,
  error,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onStartDiagnosis?: () => void;
  error?: string | null;
  disabled?: boolean;
}) {
  return (
    <div className="content-stretch flex flex-col gap-[5px] items-start relative shrink-0 w-full md:w-[683px]" data-name="Input Field">
      <TextField
        value={value}
        onChange={onChange}
        onStartDiagnosis={onStartDiagnosis}
        disabled={disabled}
      />
      {error && (
        <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[14px] text-[#ff6b35] leading-[1.4] px-[4px]">
          {error}
        </p>
      )}
      <Info />
    </div>
  );
}

function Review1() {
  return (
    <div className="content-stretch flex flex-col items-start relative shrink-0 w-full md:w-[671px]" data-name="Review">
      <p className="[word-break:break-word] font-['Albert_Sans:Bold',sans-serif] font-bold h-auto md:h-[30px] leading-[1.3] md:leading-none relative shrink-0 text-[18px] md:text-[26px] text-center text-white tracking-[0.1px] w-full">Trusted by over 20 million people nationwide!</p>
    </div>
  );
}

function Review() {
  return (
    <div className="content-stretch flex items-center justify-center py-[40px] relative shrink-0 w-full" data-name="Review">
      <Review1 />
    </div>
  );
}

function Frame({
  symptomInput,
  onSymptomChange,
  onStartDiagnosis,
  diagnosisError,
  isDiagnosing,
}: {
  symptomInput: string;
  onSymptomChange: (value: string) => void;
  onStartDiagnosis?: () => void;
  diagnosisError?: string | null;
  isDiagnosing?: boolean;
}) {
  return (
    <div className="content-stretch flex flex-col gap-[60px] items-start py-[60px] relative shrink-0 w-full">
      <Heading />
      <InputField
        value={symptomInput}
        onChange={onSymptomChange}
        onStartDiagnosis={onStartDiagnosis}
        error={diagnosisError}
        disabled={isDiagnosing}
      />
      <Review />
    </div>
  );
}

function Frame15() {
  return (
    <div className="bg-white relative shrink-0 w-full">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-start p-[30px] relative size-full text-black tracking-[0.1px]">
        <div className="flex flex-col font-['Albert_Sans:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[30px] w-full">
          <p className="leading-[normal]">Diagnose</p>
        </div>
        <p className="font-['Albert_Sans:Regular',sans-serif] font-normal leading-[26px] relative shrink-0 text-[20px] w-full">Describe the issue and get a fast, clear diagnosis - no mechanic jargon, no confusion.</p>
      </div>
    </div>
  );
}

function Diagnose() {
  return (
    <div className="bg-white md:bg-[#ececec] h-auto md:h-[401px] relative rounded-[14px] shrink-0 w-full md:w-[375px] cursor-pointer transition-all duration-300 hover:-translate-y-1 md:hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] pb-4 md:pb-0" data-name="Diagnose">
      <div className="content-stretch flex flex-col gap-[12px] items-start justify-start md:justify-end overflow-clip relative rounded-[inherit] size-full">
        <div className="relative md:absolute h-[180px] md:h-[250px] left-0 top-0 w-full md:w-[374px] rounded-[12px] md:rounded-none overflow-hidden shrink-0" data-name="usman-malik-kE__1vnDxg4-unsplash 1">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full transition-transform duration-500 hover:scale-105" src={imgUsmanMalikKE1VnDxg4Unsplash1.src} />
        </div>
        <Frame15 />
      </div>
      <div aria-hidden="true" className="hidden md:block absolute border border-[#d2d2d2] border-solid inset-0 pointer-events-none rounded-[14px]" />
    </div>
  );
}

function Frame17() {
  return (
    <div className="bg-white relative shrink-0 w-full">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-start p-[30px] relative size-full text-black tracking-[0.1px]">
        <div className="flex flex-col font-['Albert_Sans:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[30px] w-full">
          <p className="leading-[normal]">Match</p>
        </div>
        <p className="font-['Albert_Sans:Regular',sans-serif] font-normal leading-[26px] relative shrink-0 text-[20px] w-full">Get matched with a trusted mechanic in minutes. See cost, repair details, and timing upfront.</p>
      </div>
    </div>
  );
}

function Match() {
  return (
    <div className="bg-white md:bg-[#ececec] h-auto md:h-[401px] relative rounded-[14px] shrink-0 w-full md:w-[375px] cursor-pointer transition-all duration-300 hover:-translate-y-1 md:hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] pb-4 md:pb-0 border-t border-[#eee] pt-6 md:border-none md:pt-0" data-name="Match">
      <div className="content-stretch flex flex-col gap-[12px] items-start justify-start md:justify-end overflow-clip relative rounded-[inherit] size-full">
        <div className="relative md:absolute h-[180px] md:h-[259px] left-0 md:left-[-14.5px] top-0 md:top-[-21px] w-full md:w-[388px] rounded-[12px] md:rounded-none overflow-hidden shrink-0" data-name="resume-genius-IESB4iFVuzA-unsplash 1">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full transition-transform duration-500 hover:scale-105" src={imgResumeGeniusIesb4IFVuzAUnsplash1.src} />
        </div>
        <Frame17 />
      </div>
      <div aria-hidden="true" className="hidden md:block absolute border border-[#d2d2d2] border-solid inset-0 pointer-events-none rounded-[14px]" />
    </div>
  );
}

function Frame16() {
  return (
    <div className="bg-white relative shrink-0 w-full">
      <div className="[word-break:break-word] content-stretch flex flex-col gap-[12px] items-start p-[30px] relative size-full text-black tracking-[0.1px]">
        <div className="flex flex-col font-['Albert_Sans:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[30px] w-full">
          <p className="leading-[normal]">Fix</p>
        </div>
        <p className="font-['Albert_Sans:Regular',sans-serif] font-normal leading-[26px] relative shrink-0 text-[20px] w-full">Stay connected throughout the repair and fix your car without frustration, upsells, or surprises.</p>
      </div>
    </div>
  );
}

function Fix() {
  return (
    <div className="bg-white md:bg-[#ececec] h-auto md:h-[401px] relative rounded-[14px] shrink-0 w-full md:w-[375px] cursor-pointer transition-all duration-300 hover:-translate-y-1 md:hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] pb-4 md:pb-0 border-t border-[#eee] pt-6 md:border-none md:pt-0" data-name="Fix">
      <div className="content-stretch flex flex-col gap-[12px] items-start justify-start md:justify-end overflow-clip relative rounded-[inherit] size-full">
        <div className="relative md:absolute h-[180px] md:h-[330px] left-0 md:left-[-120px] top-0 md:top-[-14px] w-full md:w-[495px] rounded-[12px] md:rounded-none overflow-hidden shrink-0" data-name="kenny-eliason-2K_-PG95qlI-unsplash 1">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full transition-transform duration-500 hover:scale-105" src={imgKennyEliason2KPg95QlIUnsplash1.src} />
        </div>
        <Frame16 />
      </div>
      <div aria-hidden="true" className="hidden md:block absolute border border-[#d2d2d2] border-solid inset-0 pointer-events-none rounded-[14px]" />
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex flex-col md:flex-row items-center justify-between relative shrink-0 w-full gap-8 md:gap-0">
      <Diagnose />
      <Match />
      <Fix />
    </div>
  );
}

function ThreeSteps() {
  return (
    <div className="bg-white relative rounded-[12px] md:rounded-[24px] shadow-[1px_4px_32px_0px_rgba(0,0,0,0.1)] shrink-0 w-full mt-10 md:mt-0" data-name="Three Steps">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[20px] md:gap-[60px] items-start px-[20px] md:px-[40px] py-[30px] md:py-[62px] relative size-full">
          <div className="[word-break:break-word] flex flex-col font-['Fustat:ExtraBold',sans-serif] font-extrabold justify-center leading-[0] relative shrink-0 text-[24px] md:text-[42px] text-black tracking-[0.1px] w-full mb-4 md:mb-0">
            <p className="leading-[1.2] md:leading-[20px]">We make car repair clear, honest, and simple</p>
          </div>
          <Frame1 />
        </div>
      </div>
    </div>
  );
}

function Frame9() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center pt-[60px] relative shrink-0 w-full">
      <div className="[word-break:break-word] flex flex-col font-['Fustat:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[42px] text-black text-center tracking-[0.1px] w-full">
        <p className="leading-[normal]">Why choose Veriium?</p>
      </div>
    </div>
  );
}

function ThreeSteps1() {
  return (
    <div className="bg-[#ececec] h-[300px] md:h-[554px] overflow-clip relative rounded-[14px] shrink-0 w-full md:w-[597px]" data-name="Three Steps">
      <div className="absolute h-[100%] md:h-[896px] left-0 md:left-0 top-0 md:top-[-136.33px] w-full md:w-[597px]" data-name="sten-rademaker-UZUzvJEvKnI-unsplash 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgStenRademakerUzUzvJEvKnIUnsplash1.src} />
      </div>
    </div>
  );
}

function Frame2() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[20px] md:gap-[50px] items-start leading-[0] relative shrink-0 text-black tracking-[0.1px] w-full md:w-[600px]">
      <div className="flex flex-col font-['Fustat:ExtraBold',sans-serif] font-extrabold justify-center relative shrink-0 text-[24px] md:text-[36px] w-full">
        <p className="leading-[1.2] md:leading-[38px]">TRUST PROBLEM</p>
      </div>
      <div className="font-['Aladin:Regular',sans-serif] not-italic relative shrink-0 text-[16px] md:text-[20px] w-full">
        <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">Drivers Don&apos;t Fully Trust Mechanics</p>
        <p className="leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">​</p>
        <p className="font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">78% of drivers say they don&apos;t trust mechanics. Repairs often feel rushed, unclear, or poorly communicated — leaving people unsure if they&apos;re getting the truth.</p>
        <p className="leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">​</p>
        <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">How Veriium Solves It</p>
        <p className="leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">​</p>
        <p className="font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">We verify every mechanic for:</p>
        <ul className="list-disc mb-0 pl-[20px] md:ms-[30px]">
          <li className="mb-0">
            <span className="[word-break:break-word] font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px]">Professional experience</span>
          </li>
          <li className="mb-0">
            <span className="[word-break:break-word] font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px]">Proven communication</span>
          </li>
          <li className="mb-0">
            <span className="[word-break:break-word] font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px]">Repair accuracy</span>
          </li>
          <li>
            <span className="[word-break:break-word] font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px]">{`Reliability & customer care`}</span>
          </li>
        </ul>
        <p className="leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">​</p>
        <p className="font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px] whitespace-pre-wrap">{`You know exactly who you're working with — and why they're recommended.`}</p>
      </div>
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex flex-col md:flex-row gap-[20px] md:gap-[55px] items-center py-[20px] md:py-[40px] relative shrink-0 w-full">
      <ThreeSteps1 />
      <Frame2 />
    </div>
  );
}

function Frame3() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[20px] md:gap-[50px] items-start leading-[0] relative shrink-0 text-black tracking-[0.1px] w-full md:w-[600px]">
      <div className="flex flex-col font-['Fustat:ExtraBold',sans-serif] font-extrabold justify-center relative shrink-0 text-[24px] md:text-[36px] w-full">
        <p className="leading-[1.2] md:leading-[46px]">PRICING FAIRNESS</p>
      </div>
      <div className="font-['Aladin:Regular',sans-serif] not-italic relative shrink-0 text-[16px] md:text-[20px] w-full">
        <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">You're Worried About Being Overcharged</p>
        <p className="leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">​</p>
        <p className="font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">83% of drivers doubt pricing fairness. Surprise fees, vague quotes are the #1 reason people avoid the shop.</p>
        <p className="leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">​</p>
        <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">How Veriium Solves It</p>
        <p className="leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">​</p>
        <p className="font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">With Veriium, you get:</p>
        <ul className="list-disc mb-0 pl-[20px] md:ms-[30px]">
          <li className="mb-0">
            <span className="[word-break:break-word] font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px]">An upfront estimated range before the mechanic arrives</span>
          </li>
          <li className="mb-0">
            <span className="[word-break:break-word] font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px]">A final quote from the mechanic before any work begins</span>
          </li>
          <li className="mb-0">
            <span className="[word-break:break-word] font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px]">A fully itemized repair breakdown (parts, labor, and fees)</span>
          </li>
          <li>
            <span className="[word-break:break-word] font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px]">Receipts for every part purchased</span>
          </li>
        </ul>
        <p className="leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">​</p>
        <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">No hidden costs. No confusion. Just clarity.</p>
        <p className="leading-[1.6] md:leading-[28px] whitespace-pre-wrap">​</p>
      </div>
    </div>
  );
}

function ThreeSteps2() {
  return (
    <div className="bg-[#ececec] h-[300px] md:h-[554px] overflow-clip relative rounded-[14px] shrink-0 w-full md:w-[597px]" data-name="Three Steps">
      <div className="absolute h-full md:h-[568px] left-0 md:left-[-161px] top-0 w-full md:w-[851px]" data-name="Clarity understanding 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgClarityUnderstanding1.src} />
      </div>
      <div className="absolute h-full md:h-[558px] left-0 md:left-[-145px] top-0 md:top-[-4px] w-full md:w-[837px]" data-name="Price Fairness 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgPriceFairness1.src} />
      </div>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex flex-col-reverse md:flex-row gap-[20px] md:gap-[55px] items-center py-[20px] md:py-[40px] relative shrink-0 w-full">
      <Frame3 />
      <ThreeSteps2 />
    </div>
  );
}

function ThreeSteps3() {
  return (
    <div className="bg-[#ececec] h-[300px] md:h-[554px] overflow-clip relative rounded-[14px] shrink-0 w-full md:w-[597px]" data-name="Three Steps">
      <div className="absolute h-full md:h-[568px] left-0 md:left-[-161px] top-0 w-full md:w-[851px]" data-name="Clarity understanding 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgClarityUnderstanding1.src} />
      </div>
    </div>
  );
}

function Frame4() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[20px] md:gap-[50px] items-start leading-[0] relative shrink-0 text-black tracking-[0.1px] w-full md:w-[600px]">
      <div className="flex flex-col font-['Fustat:ExtraBold',sans-serif] font-extrabold justify-center relative shrink-0 text-[24px] md:text-[36px] w-full">
        <p className="leading-[1.2] md:leading-[46px]">{`CLARITY, UNDERSTANDING & PRIORITY`}</p>
      </div>
      <div className="font-['Aladin:Regular',sans-serif] not-italic relative shrink-0 text-[16px] md:text-[20px] w-full">
        <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">You Want Clear, Honest Explanations — Not Confusion</p>
        <p className="leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">​</p>
        <p className="font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">Most drivers say they leave the shop with more questions than answers — unsure what's wrong, why it matters, or whether it needs to be fixed now or later.</p>
        <p className="leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">​</p>
        <p className="font-['Albert_Sans:SemiBold',sans-serif] font-semibold leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">How Veriium Solves It</p>
        <p className="leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">​</p>
        <p className="font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">Veriium makes every diagnosis clear, prioritized, and easy to understand:</p>
        <ul className="list-disc mb-0 pl-[20px] md:ms-[30px]">
          <li className="mb-0">
            <span className="[word-break:break-word] font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px]">Plain-language explanations — no mechanic jargon</span>
          </li>
          <li className="mb-0">
            <span className="[word-break:break-word] font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px]">Priority levels so you know what to fix now vs later</span>
          </li>
          <li className="mb-0">
            <span className="[word-break:break-word] font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px]">Recommendations that help you save time and money</span>
          </li>
          <li>
            <span className="[word-break:break-word] font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px]">Step-by-step clarity on what's happening and why it matters</span>
          </li>
        </ul>
        <p className="leading-[1.6] md:leading-[28px] mb-0 whitespace-pre-wrap">​</p>
        <p className="font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.6] md:leading-[28px] whitespace-pre-wrap">You're never left guessing — you always know what matters most and why.</p>
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex flex-col md:flex-row gap-[20px] md:gap-[55px] items-center py-[20px] md:py-[40px] relative shrink-0 w-full">
      <ThreeSteps3 />
      <Frame4 />
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex flex-col items-center justify-between relative shrink-0 w-full gap-8 md:gap-0">
      <Frame9 />
      <Frame7 />
      <Frame6 />
      <Frame5 />
    </div>
  );
}

function Frame13() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[10px] items-start justify-center relative shrink-0 text-black w-full">
      <div className="flex flex-col font-['Albert_Sans:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[24px] md:text-[30px] tracking-[0.1px] w-full">
        <p className="leading-[1.2] md:leading-[46px]">Are you a mechanic?</p>
      </div>
      <p className="font-['Albert_Sans:Regular',sans-serif] font-normal leading-[1.4] md:leading-[26px] min-w-full relative shrink-0 text-[14px] md:text-[20px]">Want to be part of our team of verified mechanics ready to help our drivers feel confident in their repairs? Learn more about how to be a trusted mechanic with Veriium.</p>
    </div>
  );
}

function Frame10({ onClick }: { onClick?: () => void }) {
  return (
    <div className="content-stretch flex flex-col items-start md:items-end relative shrink-0 w-full md:w-auto mt-4 md:mt-0">
      <div onClick={onClick} className="bg-[#ffa270] content-stretch flex flex-col items-center justify-center overflow-clip px-[20px] md:px-[28px] py-[12px] md:py-[28px] relative rounded-[8px] md:rounded-[12px] shrink-0 cursor-pointer select-none transition-all duration-200 hover:brightness-110 hover:shadow-xl active:scale-95" data-name="Button">
        <p className="[word-break:break-word] font-['Albert_Sans:Bold',sans-serif] font-bold leading-none relative shrink-0 text-[16px] md:text-[26px] text-black whitespace-nowrap">Apply as a Mechanic</p>
      </div>
    </div>
  );
}

function Text({ onApplyMechanic }: { onApplyMechanic?: () => void }) {
  return (
    <div className="content-stretch flex flex-col gap-[20px] md:gap-[40px] items-start relative shrink-0 w-full md:w-[583px]" data-name="Text">
      <Frame13 />
      <Frame10 onClick={onApplyMechanic} />
    </div>
  );
}

function MechanicImage() {
  return (
    <div className="content-stretch flex flex-col h-[200px] md:h-[350px] items-center justify-center overflow-clip relative rounded-[14px] shrink-0 w-full md:w-[471px]" data-name="Mechanic Image">
      <div className="h-full md:h-[720.145px] relative shrink-0 w-full md:w-[480.155px]" data-name="darren-richardson-iY0GFYADmU0-unsplash 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgDarrenRichardsonIY0GfyaDmU0Unsplash1.src} />
      </div>
    </div>
  );
}

function CtaMechanic({ onApplyMechanic }: { onApplyMechanic?: () => void }) {
  return (
    <div className="bg-[#f8f8f8] relative rounded-[12px] md:rounded-[20px] shrink-0 w-full" data-name="CTA - Mechanic">
      <div className="flex flex-col md:flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col md:flex-row items-center justify-between p-[20px] md:p-[60px] relative size-full gap-[20px] md:gap-0">
          <Text onApplyMechanic={onApplyMechanic} />
          <MechanicImage />
        </div>
      </div>
    </div>
  );
}

function Frame12({ onClick }: { onClick?: () => void }) {
  return (
    <div className="content-stretch flex flex-col items-start md:items-end relative shrink-0 w-full md:w-auto" onClick={onClick}>
      <div className="bg-[#ffa270] content-stretch flex flex-col items-center justify-center overflow-clip px-[20px] md:px-[28px] py-[12px] md:py-[28px] relative rounded-[8px] md:rounded-[12px] shrink-0 cursor-pointer select-none transition-all duration-200 hover:brightness-110 hover:shadow-xl active:scale-95 w-full md:w-auto" data-name="Button">
        <p className="[word-break:break-word] font-['Albert_Sans:Bold',sans-serif] font-bold leading-none relative shrink-0 text-[16px] md:text-[26px] text-black whitespace-nowrap">Diagnose Your Issue</p>
      </div>
    </div>
  );
}

function Cta({ onStartDiagnosis }: { onStartDiagnosis?: () => void }) {
  return (
    <div className="bg-[#f8f8f8] relative rounded-[12px] md:rounded-[20px] shrink-0 w-full" data-name="CTA">
      <div className="flex flex-col md:flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col md:flex-row items-start md:items-center justify-between p-[20px] md:p-[60px] relative size-full gap-[20px] md:gap-0">
          <div className="[word-break:break-word] flex flex-col font-['Albert_Sans:Bold',sans-serif] font-bold justify-center leading-[0] relative shrink-0 text-[20px] md:text-[30px] text-black tracking-[0.1px] w-full md:w-[679px] whitespace-pre-wrap">
            <p className="leading-[1.2] md:leading-[46px] mb-0">{`Ready to fix your car? `}</p>
            <p className="leading-[1.2] md:leading-[46px]">{`Get matched with a trusted mechanic today. `}</p>
          </div>
          <Frame12 onClick={onStartDiagnosis} />
        </div>
      </div>
    </div>
  );
}

async function parseDiagnosisError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error?.message ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

export default function LandingDesktopV2() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [symptomInput, setSymptomInput] = useState("");
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResponse | null>(null);
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const handleSymptomChange = (value: string) => {
    setSymptomInput(value);
    if (diagnosisError) {
      setDiagnosisError(null);
    }
  };

  const handleStartDiagnosis = async () => {
    if (isDiagnosing) return;

    setDiagnosisError(null);
    setIsDiagnosing(true);

    try {
      const res = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: symptomInput }),
      });

      if (!res.ok) {
        setDiagnosisError(await parseDiagnosisError(res));
        return;
      }

      const data = (await res.json()) as DiagnosisResponse;
      setDiagnosisResult(data);
      setDiagnosisOpen(true);
      setTimeout(() => {
        const formElement = document.getElementById("diagnostic-form");
        if (formElement) {
          formElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } catch {
      setDiagnosisError("Unable to reach the server. Please try again.");
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleApplyMechanic = () => router.push('/mechanics/apply');

  return (
    <div className="bg-white flex flex-col items-center relative w-full overflow-x-hidden" data-name="Landing - Desktop v2">
      {/* Mobile side menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col md:hidden">
          <div className="bg-black flex items-center justify-between px-[24px] py-[20px] shrink-0">
            <span className="font-['Inter:Bold',sans-serif] font-bold text-[28px] text-white tracking-[0.1px] text-shadow-[0px_4px_18.75px_black]">
              VERIIUM
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-white text-[28px] leading-none cursor-pointer hover:opacity-70 transition-opacity duration-200 select-none"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
            <div className="w-[78%] bg-white flex flex-col justify-between py-[36px] px-[28px] overflow-y-auto">
              <div className="flex flex-col gap-[36px]">
                <nav className="flex flex-col gap-[28px]">
                  {["About Us", "Certifications", "Mechanic", "Contact Us"].map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        setMenuOpen(false);
                        if (item === "Mechanic") router.push('/mechanics/apply');
                        else if (item === "Contact Us") router.push('/public/contact');
                      }}
                      className="text-left font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] text-black cursor-pointer hover:text-[#ffa270] transition-colors duration-200 select-none"
                    >
                      {item}
                    </button>
                  ))}
                </nav>
              </div>
              <p className="font-['Albert_Sans:Regular',sans-serif] font-normal text-[14px] text-black cursor-pointer hover:text-[#ffa270] transition-colors duration-200 mt-[40px]">
                Terms &amp; Privacy Policy
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="absolute h-[1101px] left-0 top-[-46px] w-full overflow-hidden z-0 pointer-events-none" data-name="kato-blackmore-qcF-19BvViE-unsplash 1">
        <img alt="" className="w-full h-full object-cover pointer-events-none" src={imgKatoBlackmoreQcF19BvViEUnsplash1.src} />
      </div>
      <div className="absolute bg-[rgba(0,0,0,0.3)] h-[1224px] left-0 top-[-1px] w-full z-0 pointer-events-none" />
      <div className="absolute h-[1224px] left-0 top-[-1px] w-full z-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(179.67deg, rgba(217, 217, 217, 0) 73.331%, rgb(255, 255, 255) 85.584%)" }} />

      <div className="relative z-10 w-full max-w-[1440px] px-[24px] md:px-[100px] flex flex-col gap-[68px] items-center pt-[40px] pb-[100px] mx-auto">
        <div className="flex h-[100px] items-center justify-between w-full" data-name="Top Nav">
          <Frame14 />
          <div className="hidden md:flex" />
          <button
            className="flex md:hidden flex-col gap-[5px] cursor-pointer p-[8px] select-none"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <span className="block w-[26px] h-[2.5px] bg-white rounded-full transition-all duration-200" />
            <span className="block w-[26px] h-[2.5px] bg-white rounded-full transition-all duration-200" />
            <span className="block w-[26px] h-[2.5px] bg-white rounded-full transition-all duration-200" />
          </button>
        </div>

        <Frame
          symptomInput={symptomInput}
          onSymptomChange={handleSymptomChange}
          onStartDiagnosis={handleStartDiagnosis}
          diagnosisError={diagnosisError}
          isDiagnosing={isDiagnosing}
        />

        {isDiagnosing && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-[80px] h-[80px] border-8 border-white/20 border-t-[#ffa270] rounded-full animate-spin mb-8"></div>
            <p className="text-white text-[32px] sm:text-[40px] font-['Albert_Sans:Bold',sans-serif] font-bold tracking-wide">
              Diagnosing your issue...
            </p>
          </div>
        )}
        {diagnosisOpen && diagnosisResult && (
          <DiagnosticModal
            diagnosis={diagnosisResult}
            onClose={() => setDiagnosisOpen(false)}
            onFindMechanic={() => setDiagnosisOpen(false)}
          />
        )}
        <ThreeSteps />
        <Frame8 />
        <CtaMechanic onApplyMechanic={handleApplyMechanic} />
        <Cta onStartDiagnosis={handleStartDiagnosis} />
      </div>
      <Footer />
    </div>
  );
}
