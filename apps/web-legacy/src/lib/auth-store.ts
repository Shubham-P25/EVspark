"use client";

import { create } from "zustand";

export type UserRole = "DRIVER" | "OPERATOR" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  vehicleModelId?: string;
  vehicleModelName?: string;
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  setRole: (role: UserRole) => void;
  logout: () => void;
}

const STORAGE_KEY = "evspark_auth";

function getInitialState(): { token: string | null; user: AuthUser | null } {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // fallback
  }

  // Dev default mock driver user if in dev mode
  return {
    token: "mock-dev-token",
    user: {
      id: "usr_mock_driver_1",
      email: "driver@evspark.local",
      name: "Aarav Sharma",
      role: "DRIVER",
      vehicleModelName: "Tata Nexon EV Max",
    },
  };
}

export const useAuthStore = create<AuthState>((set, get) => {
  const initial = getInitialState();

  return {
    token: initial.token,
    user: initial.user,
    setAuth: (token, user) => {
      set({ token, user });
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
        } catch {}
      }
    },
    setRole: (role) => {
      const current = get().user;
      if (!current) return;
      const updatedUser = { ...current, role };
      set({ user: updatedUser });
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: get().token, user: updatedUser }));
        } catch {}
      }
    },
    logout: () => {
      set({ token: null, user: null });
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      }
    },
  };
});
