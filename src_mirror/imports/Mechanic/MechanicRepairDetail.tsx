"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Upload, X, ArrowLeft } from "lucide-react";
import MechanicTopNav from "./MechanicTopNav";
import Footer from "../../../app/components/Footer";
import imgCarRepair from "../LandingDesktopV2/4943cb7fc6a48d7dc22bbbde539341ff388b0172.webp";

type JobStatus = 
  | "New Request" 
  | "Accepted" 
  | "En Route" 
  | "Arrived" 
  | "Diagnosing" 
  | "Quote Provided" 
  | "Repair Started" 
  | "Completed";

interface RepairDetail {
  id: string;
  status: JobStatus;
  title: string;
  customerName: string;
  customerPhone: string;
  vehicle: { year: string; make: string; model: string };
  zipCode: string;
  serviceType: "On-Site" | "Drop-Off";
  dateLabel: string;
  dateValue: string;
  lastUpdated: string;
  severity: "Low" | "Medium" | "High";
  diagnosisSummary: string;
  estimatedCostRange: string;
  estimatedDuration: string;
  customerNotes?: string;
  costBreakdown: { parts: string; labor: string; diagnosticFee: string; platformFee: string; tax: string; total: string; paidWith: string; paidDate: string };
  images: string[];
}

const mockRepairs: Record<string, RepairDetail> = {
  "1": {
    id: "1",
    status: "New Request",
    title: "Coolant Leak",
    customerName: "Andrea S.",
    customerPhone: "+1 (404) 555-0198",
    vehicle: { year: "2019", make: "Bugatti", model: "Chiron" },
    zipCode: "30401",
    serviceType: "On-Site",
    dateLabel: "Requested",
    dateValue: "Monday, Dec 1 @ 10:30 AM",
    lastUpdated: "Just now",
    severity: "High",
    diagnosisSummary: "AI predicts possible water pump failure or radiator hose leak based on symptom description.",
    estimatedCostRange: "$200 – $350",
    estimatedDuration: "2 - 3 hours",
    customerNotes: "Noticed a green puddle under the front of the car this morning. Temp gauge is running a bit hot.",
    costBreakdown: { parts: "", labor: "", diagnosticFee: "$45", platformFee: "$15", tax: "", total: "", paidWith: "", paidDate: "" },
    images: [imgCarRepair.src],
  },
  "2": {
    id: "2",
    status: "Repair Started",
    title: "Brake Squeal",
    customerName: "Michael R.",
    customerPhone: "+1 (404) 555-0211",
    vehicle: { year: "2021", make: "BMW", model: "M4" },
    zipCode: "30401",
    serviceType: "Drop-Off",
    dateLabel: "Requested",
    dateValue: "Monday, Dec 1 @ 9:15 AM",
    lastUpdated: "1 hour ago",
    severity: "Medium",
    diagnosisSummary: "Brake pads likely worn down to indicators. Rotors may need resurfacing.",
    estimatedCostRange: "$150 – $250",
    estimatedDuration: "1 - 2 hours",
    costBreakdown: { parts: "$90", labor: "$80", diagnosticFee: "$45", platformFee: "$15", tax: "$10", total: "$240", paidWith: "", paidDate: "" },
    images: [imgCarRepair.src, imgCarRepair.src],
  },
  "3": {
    id: "3",
    status: "Completed",
    title: "Check Engine Light",
    customerName: "Sarah K.",
    customerPhone: "+1 (404) 555-0322",
    vehicle: { year: "2022", make: "Audi", model: "RS7" },
    zipCode: "30401",
    serviceType: "On-Site",
    dateLabel: "Completed",
    dateValue: "Friday, Nov 28, 2025",
    lastUpdated: "Nov 28, 2025 4:00 PM",
    severity: "Low",
    diagnosisSummary: "Resolved check engine light issue. Replaced faulty oxygen sensor and cleared error codes.",
    estimatedCostRange: "$150 – $200",
    estimatedDuration: "1 hour",
    costBreakdown: { parts: "$45", labor: "$80", diagnosticFee: "$45", platformFee: "$15", tax: "$10", total: "$195", paidWith: "Visa ****4821", paidDate: "11/28/2025" },
    images: [imgCarRepair.src],
  }
};

const STATUS_ORDER: JobStatus[] = ["New Request", "Accepted", "En Route", "Arrived", "Diagnosing", "Quote Provided", "Repair Started", "Completed"];

function Badge({ children, variant = "neutral" }: { children: React.ReactNode, variant?: "neutral" | "success" | "warning" | "danger" | "brand" }) {
  const colors = {
    neutral: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800",
    brand: "bg-[#ffa270]/20 text-[#e8854a]"
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-['Albert_Sans:Bold',sans-serif] font-bold ${colors[variant]}`}>{children}</span>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  let variant: "neutral" | "success" | "warning" | "danger" | "brand" = "neutral";
  if (status === "Completed") variant = "success";
  else if (status === "New Request") variant = "danger";
  else variant = "brand";
  
  return <Badge variant={variant}>{status}</Badge>;
}

export default function MechanicRepairDetail() {
  const params = useParams();
  const repairId = params?.repairId as string | undefined;
  const router = useRouter();
  const [job, setJob] = useState<RepairDetail | null>(null);
  
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [laborCost, setLaborCost] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [repairSummary, setRepairSummary] = useState("");
  const [workNotes, setWorkNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    if (repairId && mockRepairs[repairId]) {
      setJob(mockRepairs[repairId]);
    }
  }, [repairId]);

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-2xl">Loading...</h1>
      </div>
    );
  }

  const handleStatusUpdate = (nextStatus: JobStatus) => {
    setIsLoading(true);
    setTimeout(() => {
      setJob({ ...job, status: nextStatus, lastUpdated: "Just now" });
      setIsLoading(false);
    }, 600);
  };

  const handleReject = () => {
    setIsLoading(true);
    setTimeout(() => {
      router.push('/mechanic');
    }, 800);
  };

  const currentIndex = STATUS_ORDER.indexOf(job.status);
  const nextStatus = currentIndex < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIndex + 1] : null;

  return (
    <div className="bg-white flex flex-col relative w-full min-h-screen overflow-x-hidden font-['Albert_Sans:Regular',sans-serif]">
      <div className="relative z-10 w-full max-w-[1440px] px-[24px] md:px-[60px] lg:px-[100px] flex flex-col gap-[32px] mx-auto pb-[80px]">
        <MechanicTopNav activeTab="my-repairs" />

        <div className="mt-[-16px] mb-[-16px]">
          <button onClick={() => router.push('/mechanic')} className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors font-['Albert_Sans:Medium',sans-serif] cursor-pointer bg-transparent border-none p-0"><ArrowLeft className="w-5 h-5" /> <span>Back to Dashboard</span></button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[48px] items-start">
          <div className="flex flex-col gap-[16px]">
            <div className="flex items-center gap-3">
              <StatusBadge status={job.status} />
              <Badge variant="neutral">{job.serviceType}</Badge>
            </div>

            <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[36px] text-black leading-[1.1] tracking-[-0.5px]">{job.title}</h1>

            <p className="text-[15px] text-gray-600">{job.dateLabel}: <span className="font-medium text-black">{job.dateValue}</span></p>

            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-[12px] p-6 grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-[13px] text-gray-500 mb-1">Est. Cost Range</p>
                <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px]">{job.estimatedCostRange}</p>
              </div>
              <div>
                <p className="text-[13px] text-gray-500 mb-1">Est. Duration</p>
                <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px]">{job.estimatedDuration}</p>
              </div>
              <div>
                <p className="text-[13px] text-gray-500 mb-1">ZIP Code</p>
                <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px]">{job.zipCode}</p>
              </div>
              <div>
                <p className="text-[13px] text-gray-500 mb-1">Service</p>
                <p className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px]">{job.serviceType}</p>
              </div>
            </div>

            {job.status === "New Request" && (
              <div className="flex flex-wrap gap-[12px] mt-2">
                <button onClick={() => handleStatusUpdate("Accepted")} disabled={isLoading} className="bg-[#ffa270] px-[32px] py-[16px] rounded-[12px] font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-black border-none cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-200 disabled:opacity-50">{isLoading ? "Accepting..." : "Accept Job"}</button>
                <button onClick={() => setIsRejectModalOpen(true)} disabled={isLoading} className="bg-white px-[32px] py-[16px] rounded-[12px] font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-red-600 border border-red-200 cursor-pointer hover:bg-red-50 active:scale-95 transition-all duration-200 disabled:opacity-50">Reject Request</button>
              </div>
            )}

            {currentIndex > 0 && job.status !== "Completed" && (
              <div className="mt-6 flex flex-col gap-4 p-6 border border-[#D2D2D2] rounded-[12px]">
                <div className="flex justify-between items-center">
                  <h3 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px]">Repair Progress</h3>
                  <span className="text-[13px] text-gray-500">Last updated: {job.lastUpdated}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2"><div className="bg-[#ffa270] h-2.5 rounded-full transition-all duration-500" style={{ width: `${(currentIndex / (STATUS_ORDER.length - 1)) * 100}%` }}></div></div>
                <div className="flex justify-between text-[13px] font-medium text-gray-600 mt-1"><span>Accepted</span><span className="text-black font-bold">{job.status}</span><span>Completed</span></div>

                {nextStatus && nextStatus !== "Completed" && (
                  <button onClick={() => handleStatusUpdate(nextStatus)} disabled={isLoading} className="mt-4 bg-black px-[24px] py-[14px] rounded-[12px] font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-white border-none cursor-pointer hover:bg-gray-800 active:scale-95 transition-all duration-200 w-full disabled:opacity-50">{isLoading ? "Updating..." : `Mark as ${nextStatus}`}</button>
                )}
                {nextStatus === "Completed" && (
                  <button onClick={() => document.getElementById("completion-form")?.scrollIntoView({ behavior: 'smooth' })} className="mt-4 bg-[#ffa270] px-[24px] py-[14px] rounded-[12px] font-['Albert_Sans:Bold',sans-serif] font-bold text-[15px] text-black border-none cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-200 w-full">Complete Repair</button>
                )}
              </div>
            )}
          </div>

          <div className="w-full h-[300px] md:h-[400px] rounded-[16px] overflow-hidden border border-[#D2D2D2]"><img src={job.images[0] || imgCarRepair.src} alt="Vehicle" className="w-full h-full object-cover" /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[32px] pt-4">
          <div className="border border-[#D2D2D2] rounded-[12px] p-[32px] flex flex-col gap-[20px]"><h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">Customer Information</h2><div className="flex flex-col gap-3"><div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Name</span><span className="font-medium">{job.customerName}</span></div><div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Phone</span><span className="font-medium text-[#e8854a]">{job.customerPhone}</span></div><div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Vehicle</span><span className="font-medium">{job.vehicle.year} {job.vehicle.make} {job.vehicle.model}</span></div><div className="flex justify-between border-b border-gray-100 pb-2"><span className="text-gray-500">Location</span><span className="font-medium">{job.zipCode} ({job.serviceType})</span></div></div></div>

          <div className="border border-[#D2D2D2] rounded-[12px] p-[32px] flex flex-col gap-[20px]"><div className="flex justify-between items-center"><h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-black">Initial Diagnosis</h2><Badge variant={job.severity === "High" ? "danger" : job.severity === "Medium" ? "warning" : "success"}>{job.severity} Severity</Badge></div><p className="text-[15px] leading-relaxed text-gray-700 bg-gray-50 p-4 rounded-lg">{job.diagnosisSummary}</p>{job.customerNotes && (<div className="mt-2"><h3 className="text-[14px] font-bold text-gray-900 mb-1">Customer Notes:</h3><p className="text-[14px] text-gray-600 italic">"{job.customerNotes}"</p></div>)}</div>
        </div>

        {job.status === "Repair Started" && (
          <div id="completion-form" className="w-full border border-gray-200 bg-gray-50 rounded-[12px] p-[32px] md:p-[48px] flex flex-col gap-[32px] mt-4 shadow-sm">
            <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[28px] text-black">Completion Form</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[48px]">
              <div className="flex flex-col gap-6">
                <h3 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px]">Cost Entry</h3>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[14px] font-medium text-gray-700 mb-1">Labor Cost ($)</label>
                    <input
                      type="number"
                      value={laborCost}
                      onChange={(e) => setLaborCost(e.target.value)}
                      className="w-full border border-gray-300 rounded-[8px] px-4 py-3 outline-none focus:border-[#ffa270]"
                      placeholder="e.g. 150"
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] font-medium text-gray-700 mb-1">Parts Cost ($)</label>
                    <input
                      type="number"
                      value={partsCost}
                      onChange={(e) => setPartsCost(e.target.value)}
                      className="w-full border border-gray-300 rounded-[8px] px-4 py-3 outline-none focus:border-[#ffa270]"
                      placeholder="e.g. 85"
                    />
                  </div>
                  <div className="border-t border-gray-200 mt-2 pt-4 flex justify-between items-center text-[18px]">
                    <span className="font-medium text-gray-600">Calculated Total</span>
                    <span className="font-['Albert_Sans:Bold',sans-serif] font-bold text-black">
                      ${(Number(laborCost || 0) + Number(partsCost || 0) + 60).toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[12px] text-gray-400 text-right -mt-3">*Includes $60 standard fees/taxes</span>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <h3 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px]">Repair Summary</h3>
                <div className="flex flex-col gap-4">
                  <textarea
                    value={repairSummary}
                    onChange={(e) => setRepairSummary(e.target.value)}
                    className="w-full border border-gray-300 rounded-[8px] px-4 py-3 outline-none focus:border-[#ffa270] min-h-[100px] resize-y"
                    placeholder="Briefly describe the issue and resolution..."
                  />
                  <textarea
                    value={workNotes}
                    onChange={(e) => setWorkNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded-[8px] px-4 py-3 outline-none focus:border-[#ffa270] min-h-[80px] resize-y"
                    placeholder="Internal work performed notes..."
                  />
                  <div>
                    <label className="block text-[14px] font-medium text-gray-700 mb-2">Upload Receipt</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-[8px] p-6 flex flex-col items-center justify-center bg-white cursor-pointer hover:bg-gray-50 transition-colors">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-[14px] font-medium text-gray-600">Click to upload receipt photo</span>
                      <span className="text-[12px] text-gray-400">JPG, PNG, PDF up to 5MB</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-200 pt-8">
              <button
                onClick={() => setIsCompleteModalOpen(true)}
                className="bg-[#ffa270] px-[40px] py-[16px] rounded-[12px] font-['Albert_Sans:Bold',sans-serif] font-bold text-[16px] text-black border-none cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-200"
              >
                Complete Repair
              </button>
            </div>
          </div>
        )}

        {job.status === "Completed" && (
           <div className="border border-[#22c55e] bg-green-50 rounded-[12px] p-[32px] flex flex-col gap-[20px] w-full mt-4"><h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[20px] text-green-900 flex items-center gap-2"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Repair Completed Successfully</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-2"><div><p className="text-[13px] text-green-800 mb-1">Final Total</p><p className="font-bold text-[18px] text-green-950">{job.costBreakdown.total}</p></div><div><p className="text-[13px] text-green-800 mb-1">Parts</p><p className="font-bold text-[18px] text-green-950">{job.costBreakdown.parts}</p></div><div><p className="text-[13px] text-green-800 mb-1">Labor</p><p className="font-bold text-[18px] text-green-950">{job.costBreakdown.labor}</p></div><div><p className="text-[13px] text-green-800 mb-1">Completed On</p><p className="font-bold text-[18px] text-green-950">{job.dateValue}</p></div></div></div>
        )}
      </div>

      <Footer />

      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white rounded-[16px] p-8 max-w-md w-full shadow-2xl flex flex-col gap-6"><div className="flex justify-between items-center"><h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[22px]">Reject Request?</h2><button onClick={() => setIsRejectModalOpen(false)} className="border-none bg-transparent cursor-pointer p-1 rounded-full hover:bg-gray-100"><X className="w-6 h-6"/></button></div><p className="text-[15px] text-gray-600 leading-relaxed">Are you sure you want to reject this repair request? This action cannot be undone, and the customer will be notified to find another mechanic.</p><div className="flex gap-3 justify-end mt-2"><button onClick={() => setIsRejectModalOpen(false)} className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-bold cursor-pointer hover:bg-gray-50">Cancel</button><button onClick={handleReject} disabled={isLoading} className="px-5 py-2.5 rounded-lg border-none bg-red-600 text-white font-bold cursor-pointer hover:bg-red-700 disabled:opacity-50">{isLoading ? "Rejecting..." : "Yes, Reject"}</button></div></div></div>
      )}

      {isCompleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white rounded-[16px] p-8 max-w-md w-full shadow-2xl flex flex-col gap-6"><div className="flex justify-between items-center"><h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[22px]">Confirm Completion</h2><button onClick={() => setIsCompleteModalOpen(false)} className="border-none bg-transparent cursor-pointer p-1 rounded-full hover:bg-gray-100"><X className="w-6 h-6"/></button></div><p className="text-[15px] text-gray-600 leading-relaxed">You are about to finalize this repair with a total cost of <span className="font-bold text-black ml-1">${(Number(laborCost || 0) + Number(partsCost || 0) + 60).toFixed(2)}</span>. The customer's card will be charged.</p><div className="flex gap-3 justify-end mt-2"><button onClick={() => setIsCompleteModalOpen(false)} className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-bold cursor-pointer hover:bg-gray-50">Review Changes</button><button onClick={() => { setIsCompleteModalOpen(false); handleStatusUpdate("Completed"); }} className="px-5 py-2.5 rounded-lg border-none bg-[#22c55e] text-white font-bold cursor-pointer hover:bg-green-600">Submit Completion</button></div></div></div>
      )}

    </div>
  );
}
