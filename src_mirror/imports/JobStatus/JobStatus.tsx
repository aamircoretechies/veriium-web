"use client";
import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import Footer from '../../../app/components/Footer';
import imgProfileAvatar from '../Mechanic/profile-avatar.png'; // Re-use the existing avatar for the mechanic photo

export default function JobStatus() {
  const { jobId } = useParams();
  const router = useRouter();

  // Mock data for the job
  const [job] = useState({
    id: jobId || "V-849201",
    status: "quote_provided",
    vehicle: "2018 Honda Civic",
    serviceType: "Engine Diagnostics & Repair",
    date: "Oct 24, 2023 - 2:00 PM",
    mechanic: {
      name: "Daniel Martinez",
      certification: "ASE Master Technician",
      rating: "4.9 (124 reviews)",
      languages: "English, Spanish",
      badges: ["Background Checked", "Top Rated", "On-Time Guarantee"]
    },
    diagnosis: {
      result: "Spark Plug Misfire (Cylinder 3)",
      severity: "High",
      estimatedCostRange: "$150 - $300",
      estimatedDuration: "1.5 hours"
    },
    quote: {
      amount: "$210.00",
      parts: [
        { name: "Spark Plugs (Set of 4)", price: "$60.00" },
        { name: "Ignition Coil", price: "$40.00" }
      ],
      labor: "$90.00",
      fees: "$20.00"
    },
    payment: {
      cardOnFile: "Visa ending in 4242",
      finalStatus: "Pending Approval",
      diagnosticFee: "$50.00 (Waived if repaired)",
      cancellationFee: "$25.00 (If cancelled within 2 hours)"
    }
  });

  const [quoteStatus, setQuoteStatus] = useState<"pending" | "approved" | "declined">("pending");

  const timelineSteps = [
    { id: "confirmed", label: "Booking Confirmed" },
    { id: "assigned", label: "Mechanic Assigned" },
    { id: "en_route", label: "En Route" },
    { id: "arrived", label: "Arrived" },
    { id: "diagnosing", label: "Diagnosing" },
    { id: "quote_provided", label: "Quote Provided" },
    { id: "repair_started", label: "Repair Started" },
    { id: "completed", label: "Repair Completed" }
  ];

  const currentStepIndex = timelineSteps.findIndex(s => s.id === job.status);

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col items-center font-['Albert_Sans:Regular',sans-serif]">
      {/* Header */}
      <div className="bg-black w-full flex items-center justify-between px-[24px] md:px-[100px] py-[20px] shrink-0 sticky top-0 z-50">
        <div className="cursor-pointer" onClick={() => router.push('/public')}>
          <span className="font-['Inter:Bold',sans-serif] font-bold text-[28px] text-white tracking-[0.1px]">
            VERIIUM
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/80 font-medium hidden md:inline">Booking: {job.id}</span>
          <Button variant="outline" className="text-black bg-white hover:bg-gray-100 border-none font-bold">
            Support
          </Button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl py-[40px] px-[20px] flex flex-col gap-[32px]">
        
        {/* Title */}
        <div>
          <h1 className="text-3xl font-['Albert_Sans:Bold',sans-serif] font-bold text-black mb-2">Job Status</h1>
          <p className="text-gray-600">Track your repair progress in real-time.</p>
        </div>

        {/* Repair Status Timeline Section */}
        <Card className="border-none shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
          <CardHeader className="bg-gray-50 border-b pb-4">
            <CardTitle className="text-lg font-['Albert_Sans:Bold',sans-serif]">Live Timeline</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-[15px] md:left-[19px] top-4 bottom-4 w-1 bg-gray-200 rounded-full" />
              
              <div className="flex flex-col gap-6">
                {timelineSteps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  
                  return (
                    <div key={step.id} className={`flex items-start gap-4 relative z-10 ${!isCompleted && !isCurrent ? 'opacity-40' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
                        isCompleted ? 'bg-[#ffa270] border-[#ffa270] text-black' : 
                        isCurrent ? 'bg-white border-[#ffa270] text-[#ffa270]' : 'bg-white border-gray-300 text-gray-300'
                      }`}>
                        {isCompleted && !isCurrent ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <div className={`w-2.5 h-2.5 rounded-full ${isCurrent ? 'bg-[#ffa270]' : 'bg-transparent'}`} />
                        )}
                      </div>
                      <div className="flex flex-col mt-1">
                        <span className={`font-['Albert_Sans:Bold',sans-serif] font-bold ${isCurrent ? 'text-black text-lg' : 'text-gray-700'}`}>
                          {step.label}
                        </span>
                        {isCurrent && <span className="text-sm text-[#ffa270] font-medium mt-0.5">Currently active</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Summary & Mechanic Info Grid */}
        <div className="grid md:grid-cols-2 gap-[32px]">
          
          {/* Booking Summary */}
          <Card className="border-none shadow-[0_4px_24px_rgba(0,0,0,0.04)] h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-['Albert_Sans:Bold',sans-serif]">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-gray-500">Vehicle</span>
                <span className="font-['Albert_Sans:Bold',sans-serif] text-right">{job.vehicle}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-start">
                <span className="text-gray-500">Service</span>
                <span className="font-medium text-right">{job.serviceType}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-start">
                <span className="text-gray-500">Time</span>
                <span className="font-medium text-right">{job.date}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-start">
                <span className="text-gray-500">Status</span>
                <Badge className="bg-[#ffa270] hover:bg-[#ffa270] text-black border-none uppercase text-xs px-2 py-0.5">
                  {timelineSteps[currentStepIndex].label}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Mechanic Information */}
          <Card className="border-none shadow-[0_4px_24px_rgba(0,0,0,0.04)] h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-['Albert_Sans:Bold',sans-serif]">Your Mechanic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <img src={imgProfileAvatar.src} alt={job.mechanic.name} className="w-16 h-16 rounded-full border-2 border-gray-200 object-cover" />
                <div>
                  <h3 className="font-['Albert_Sans:Bold',sans-serif] text-lg text-black">{job.mechanic.name}</h3>
                  <p className="text-sm text-gray-600">{job.mechanic.certification}</p>
                  <p className="text-sm font-medium text-amber-600">★ {job.mechanic.rating}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-gray-500 mb-1">Languages</p>
                <p className="font-medium">{job.mechanic.languages}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Verified Trust Badges</p>
                <div className="flex flex-wrap gap-2">
                  {job.mechanic.badges.map(badge => (
                    <Badge key={badge} variant="secondary" className="bg-green-50 text-green-700 border border-green-200">
                      ✓ {badge}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Diagnosis & Quote (Shown when diagnosing is complete) */}
        {currentStepIndex >= 5 && (
          <div className="grid md:grid-cols-2 gap-[32px]">
            {/* Diagnosis Summary */}
            <Card className="border-none shadow-[0_4px_24px_rgba(0,0,0,0.04)] bg-amber-50/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-['Albert_Sans:Bold',sans-serif] flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Diagnosis Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Identified Issue</p>
                  <p className="font-['Albert_Sans:Bold',sans-serif] text-lg text-black">{job.diagnosis.result}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Severity</p>
                    <p className="font-medium text-red-600">{job.diagnosis.severity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Est. Duration</p>
                    <p className="font-medium">{job.diagnosis.estimatedDuration}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Original Estimate Range</p>
                  <p className="font-medium text-gray-700">{job.diagnosis.estimatedCostRange}</p>
                </div>
              </CardContent>
            </Card>

            {/* Quote Section */}
            <Card className="border-none shadow-[0_4px_24px_rgba(0,0,0,0.04)] border-2 border-[#ffa270]">
              <CardHeader className="bg-[#ffa270]/10 pb-4">
                <CardTitle className="text-lg font-['Albert_Sans:Bold',sans-serif]">Official Quote</CardTitle>
                <CardDescription className="text-black font-medium text-2xl mt-1">{job.quote.amount}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="font-['Albert_Sans:Bold',sans-serif] text-sm mb-2 text-black">Parts Breakdown</p>
                  {job.quote.parts.map(part => (
                    <div key={part.name} className="flex justify-between items-center text-sm mb-1">
                      <span className="text-gray-600">{part.name}</span>
                      <span className="font-medium">{part.price}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between items-center text-sm">
                  <span className="font-['Albert_Sans:Bold',sans-serif] text-black">Labor</span>
                  <span className="font-medium">{job.quote.labor}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Fees & Taxes</span>
                  <span>{job.quote.fees}</span>
                </div>
                
                {quoteStatus === "pending" && (
                  <div className="flex gap-3 mt-6 pt-2">
                    <Button 
                      className="flex-1 bg-[#ffa270] hover:bg-[#ff8f52] text-black font-bold h-12"
                      onClick={() => setQuoteStatus("approved")}
                    >
                      Approve Work
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 h-12 font-bold"
                      onClick={() => setQuoteStatus("declined")}
                    >
                      Decline
                    </Button>
                  </div>
                )}
                
                {quoteStatus === "approved" && (
                  <div className="bg-green-50 text-green-700 p-3 rounded-lg text-center font-bold mt-4 border border-green-200">
                    Quote Approved! Repair will now begin.
                  </div>
                )}

                {quoteStatus === "declined" && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-lg text-center font-bold mt-4 border border-red-200">
                    Quote Declined. You will only be charged the diagnostic fee.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment & Completion Details */}
        <Card className="border-none shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-['Albert_Sans:Bold',sans-serif]">Payment & Completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Card on File</p>
                  <p className="font-medium">{job.payment.cardOnFile}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Final Payment Status</p>
                  <p className={`font-medium ${quoteStatus === "approved" ? "text-amber-600" : quoteStatus === "declined" ? "text-red-600" : "text-gray-700"}`}>
                    {quoteStatus === "approved" ? "Awaiting Repair Completion" : quoteStatus === "declined" ? "Charging Diagnostic Fee" : job.payment.finalStatus}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Diagnostic Fee Policy</p>
                  <p className="text-sm font-medium">{job.payment.diagnosticFee}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-xl flex flex-col justify-center items-center text-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <h4 className="font-['Albert_Sans:Bold',sans-serif] text-black">Repair Summary & Receipt</h4>
                  <p className="text-sm text-gray-500 mt-1">Available once the repair is completed.</p>
                </div>
                <Button variant="outline" className="w-full mt-2 font-bold" disabled={currentStepIndex < 7}>
                  Download Full Receipt
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
      <Footer />
    </div>
  );
}
