"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import Footer from '../../../app/components/Footer';

interface PaymentGatewayProps {
  onBack?: () => void;
}

export default function PaymentGateway({}: PaymentGatewayProps = {}) {
  const router = useRouter();

  const handleSecureRepair = () => {
    router.push('/public/confirmation');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-['Albert_Sans:Regular',sans-serif]">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-[24px] md:px-[100px] py-[28px] border-b border-[#f0f0f0]">
        <span 
          className="font-['Inter:Bold',sans-serif] font-bold text-[28px] text-black tracking-[0.1px] cursor-pointer"
          onClick={() => router.push('/public')}
        >
          VERIIUM
        </span>
        <div className="flex items-center gap-[24px]">
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-[800px] mx-auto px-[24px] py-[60px] flex flex-col items-center">
        <div className="w-full text-left mb-[60px]">
          <h1 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[32px] text-black mb-4">
            Secure Your Payment
          </h1>
          <p className="text-[15px] text-black leading-relaxed">
            To reserve Daniel C. and confirm your appointment, please add a payment method, we'll place a temporary authorization or small deposit of $20.00. You'll always approve the final amount before anything is charged. You won't be charged until your mechanic finishes and confirms the final cost.
          </p>
          <p className="text-[15px] font-['Albert_Sans:Bold',sans-serif] font-bold text-black mt-4">
            Your card will be securely held and only charged once your repair is complete.
          </p>
        </div>

        {/* Placeholder for Stripe Modal */}
        <div className="w-full h-[250px] border-2 border-dashed border-gray-300 rounded-[12px] flex items-center justify-center bg-gray-50 mb-[60px]">
          <h2 className="font-['Albert_Sans:Bold',sans-serif] font-bold text-[24px] text-black">
            [STRIPE PAYMENT MODAL]
          </h2>
        </div>

        <Button 
          onClick={handleSecureRepair}
          className="w-full max-w-[500px] bg-[#ffa270] hover:bg-[#ff8f52] text-black font-['Albert_Sans:Bold',sans-serif] font-bold text-[18px] h-14 rounded-[8px]"
        >
          Secure My Repair
        </Button>
      </div>

      <Footer />
    </div>
  );
}
