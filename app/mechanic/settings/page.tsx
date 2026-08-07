"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMechanicAuth } from "../../components/mechanic/MechanicAuthContext";

export default function MechanicSettingsPage() {
  const router = useRouter();
  const { mechanic, setAvailability } = useMechanicAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!mechanic) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div>
          <p>You are not signed in.</p>
          <button
            onClick={() => router.push("/m/signin")}
            className="py-2 px-4 bg-[#ffa270] rounded mt-4"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  const handleToggle = async () => {
    if (pending) return;

    setPending(true);
    setError("");

    const result = await setAvailability(!mechanic.availabilityOn);
    if (result.ok === false) {
      setError(result.message);
    }

    setPending(false);
  };

  return (
    <main className="min-h-screen bg-white flex items-start justify-center py-12">
      <div className="max-w-[700px] w-full px-6">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <p className="mb-4">
          Availability is <strong>{mechanic.availabilityOn ? "ON" : "OFF"}</strong>
        </p>
        <button
          onClick={() => void handleToggle()}
          disabled={pending}
          className="py-2 px-4 bg-[#ffa270] rounded disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Toggle Availability
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );
}
