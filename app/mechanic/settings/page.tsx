"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useMechanicAuth } from "../../components/mechanic/MechanicAuthContext";

export default function MechanicSettingsPage(){
  const router = useRouter();
  const { mechanic, setAvailability } = useMechanicAuth();

  if (!mechanic) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div>
          <p>You are not signed in.</p>
          <button onClick={() => router.push('/m/signin')} className="py-2 px-4 bg-[#ffa270] rounded mt-4">Sign in</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white flex items-start justify-center py-12">
      <div className="max-w-[700px] w-full px-6">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <p className="mb-4">Availability is <strong>{mechanic.availabilityOn ? 'ON' : 'OFF'}</strong></p>
        <button onClick={() => setAvailability(!mechanic.availabilityOn)} className="py-2 px-4 bg-[#ffa270] rounded">Toggle Availability</button>
      </div>
    </main>
  );
}
