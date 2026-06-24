"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

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
  hydrated: boolean;
  signIn: (user: MechanicUser, token?: string) => void;
  signOut: () => void;
  setAvailability: (on: boolean) => void;
  completeSetup: () => void;
}

const TOKEN_KEY = "veriium_mechanic_token";
const USER_KEY = "veriium_mechanic_user";

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

function persistSession(user: MechanicUser, token?: string) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function MechanicAuthProvider({ children }: { children: ReactNode }) {
  const [mechanic, setMechanic] = useState<MechanicUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const userJson = localStorage.getItem(USER_KEY);
      if (token && userJson) {
        setMechanic(JSON.parse(userJson) as MechanicUser);
      }
    } catch {
      clearSession();
    }
    setHydrated(true);
  }, []);

  const signIn = useCallback((user: MechanicUser, token?: string) => {
    setMechanic({ ...user });
    if (token) {
      persistSession(user, token);
    }
  }, []);

  const signOut = useCallback(() => {
    setMechanic(null);
    clearSession();
  }, []);

  const setAvailability = useCallback((on: boolean) => {
    setMechanic((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, availabilityOn: on };
      persistSession(updated);
      return updated;
    });
  }, []);

  const completeSetup = useCallback(() => {
    setMechanic((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, setupComplete: true, availabilityOn: false };
      persistSession(updated);
      return updated;
    });
  }, []);

  return (
    <MechanicAuthContext.Provider
      value={{ mechanic, hydrated, signIn, signOut, setAvailability, completeSetup }}
    >
      {children}
    </MechanicAuthContext.Provider>
  );
}

export function useMechanicAuth() {
  const ctx = useContext(MechanicAuthContext);
  if (!ctx) throw new Error("useMechanicAuth must be used within MechanicAuthProvider");
  return ctx;
}
