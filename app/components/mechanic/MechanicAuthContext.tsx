"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { MechanicMeResponse } from "@/types/api/mechanic-dashboard";
import type { SetMechanicAvailabilityResponse } from "@/types/api/mechanic-auth";

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

export type SetAvailabilityResult =
  | { ok: true }
  | { ok: false; message: string };

interface MechanicAuthContextType {
  mechanic: MechanicUser | null;
  hydrated: boolean;
  signIn: (user: MechanicUser, token?: string) => void;
  signOut: () => void;
  setAvailability: (on: boolean) => Promise<SetAvailabilityResult>;
  refreshMechanic: () => Promise<void>;
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

function readCachedUser(): MechanicUser | null {
  try {
    const userJson = localStorage.getItem(USER_KEY);
    if (!userJson) return null;
    return JSON.parse(userJson) as MechanicUser;
  } catch {
    return null;
  }
}

async function parseApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error?.message ?? "Something went wrong. Please try again.";
  } catch {
    return "Something went wrong. Please try again.";
  }
}

async function fetchMechanicFromServer(
  token: string,
): Promise<
  | { ok: true; mechanic: MechanicUser }
  | { ok: false; status: number }
  | { ok: false; networkError: true }
> {
  try {
    const res = await fetch("/api/mechanics/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: res.status };
    }

    if (!res.ok) {
      console.warn(`[MechanicAuth] /api/mechanics/me returned ${res.status}`);
      return { ok: false, networkError: true };
    }

    const data = (await res.json()) as MechanicMeResponse;
    return { ok: true, mechanic: data.mechanic };
  } catch (error) {
    console.warn("[MechanicAuth] Failed to hydrate session from server:", error);
    return { ok: false, networkError: true };
  }
}

export function MechanicAuthProvider({ children }: { children: ReactNode }) {
  const [mechanic, setMechanic] = useState<MechanicUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

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

  const refreshMechanic = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const result = await fetchMechanicFromServer(token);
    if (result.ok) {
      signIn(result.mechanic, token);
      return;
    }

    if ("status" in result) {
      signOut();
    }
  }, [signIn, signOut]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        if (!cancelled) setHydrated(true);
        return;
      }

      const cachedUser = readCachedUser();
      if (cachedUser && !cancelled) {
        setMechanic(cachedUser);
      }

      const result = await fetchMechanicFromServer(token);
      if (cancelled) return;

      if (result.ok) {
        signIn(result.mechanic, token);
      } else if ("status" in result) {
        clearSession();
        setMechanic(null);
      }

      setHydrated(true);
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [signIn]);

  const setAvailability = useCallback(
    async (on: boolean): Promise<SetAvailabilityResult> => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token || !mechanic) {
        return { ok: false, message: "You are not signed in." };
      }

      if (mechanic.availabilityOn === on) {
        return { ok: true };
      }

      const previousOn = mechanic.availabilityOn;
      signIn({ ...mechanic, availabilityOn: on }, token);

      try {
        const res = await fetch("/api/mechanics/availability", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ available: on }),
        });

        if (res.status === 401 || res.status === 403) {
          signIn({ ...mechanic, availabilityOn: previousOn }, token);
          signOut();
          return {
            ok: false,
            message: "Your session has expired. Please sign in again.",
          };
        }

        if (!res.ok) {
          signIn({ ...mechanic, availabilityOn: previousOn }, token);
          return { ok: false, message: await parseApiError(res) };
        }

        const data = (await res.json()) as SetMechanicAvailabilityResponse;
        signIn({ ...mechanic, availabilityOn: data.availabilityOn }, token);
        await refreshMechanic();
        return { ok: true };
      } catch {
        signIn({ ...mechanic, availabilityOn: previousOn }, token);
        return {
          ok: false,
          message: "Network error. Please check your connection and try again.",
        };
      }
    },
    [mechanic, signIn, signOut, refreshMechanic],
  );

  return (
    <MechanicAuthContext.Provider
      value={{
        mechanic,
        hydrated,
        signIn,
        signOut,
        setAvailability,
        refreshMechanic,
      }}
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
