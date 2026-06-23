"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type MechanicAccountState =
  | "application_submitted"
  | "under_review"
  | "needs_more_info"
  | "approved"
  | "rejected"
  | "suspended";

export interface MechanicUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  accountState: MechanicAccountState;
  setupComplete: boolean;
  availabilityOn: boolean;
}

interface MechanicAuthContextType {
  mechanic: MechanicUser | null;
  signIn: (user: MechanicUser) => void;
  signOut: () => void;
  setAvailability: (on: boolean) => void;
  completeSetup: () => void;
}

const MechanicAuthContext = createContext<MechanicAuthContextType | null>(null);

export const MOCK_MECHANICS: Record<MechanicAccountState, MechanicUser> = {
  application_submitted: {
    id: "m1",
    name: "Daniel Martinez",
    phone: "+1 (555) 123-4567",
    email: "dmartinez@gmail.com",
    accountState: "application_submitted",
    setupComplete: false,
    availabilityOn: false,
  },
  under_review: {
    id: "m2",
    name: "James Lee",
    phone: "+1 (555) 234-5678",
    email: "jlee@gmail.com",
    accountState: "under_review",
    setupComplete: false,
    availabilityOn: false,
  },
  needs_more_info: {
    id: "m3",
    name: "Carlos Rivera",
    phone: "+1 (555) 345-6789",
    email: "crivera@gmail.com",
    accountState: "needs_more_info",
    setupComplete: false,
    availabilityOn: false,
  },
  approved: {
    id: "m4",
    name: "Daniel C.",
    phone: "+1 (555) 456-7890",
    email: "danielc@gmail.com",
    accountState: "approved",
    setupComplete: false,
    availabilityOn: false,
  },
  rejected: {
    id: "m5",
    name: "Mike Johnson",
    phone: "+1 (555) 567-8901",
    email: "mjohnson@gmail.com",
    accountState: "rejected",
    setupComplete: false,
    availabilityOn: false,
  },
  suspended: {
    id: "m6",
    name: "Tom Williams",
    phone: "+1 (555) 678-9012",
    email: "twilliams@gmail.com",
    accountState: "suspended",
    setupComplete: false,
    availabilityOn: false,
  },
};

export function MechanicAuthProvider({ children }: { children: ReactNode }) {
  const [mechanic, setMechanic] = useState<MechanicUser | null>(null);

  const signIn = (user: MechanicUser) => setMechanic({ ...user });

  const signOut = () => setMechanic(null);

  const setAvailability = (on: boolean) => {
    setMechanic((prev) => (prev ? { ...prev, availabilityOn: on } : prev));
  };

  const completeSetup = () => {
    setMechanic((prev) => (prev ? { ...prev, setupComplete: true, availabilityOn: false } : prev));
  };

  return (
    <MechanicAuthContext.Provider value={{ mechanic, signIn, signOut, setAvailability, completeSetup }}>
      {children}
    </MechanicAuthContext.Provider>
  );
}

export function useMechanicAuth() {
  const ctx = useContext(MechanicAuthContext);
  if (!ctx) throw new Error("useMechanicAuth must be used within MechanicAuthProvider");
  return ctx;
}
