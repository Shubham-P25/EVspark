"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, UserRole } from "@/lib/auth-store";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface ProtectedRouteProps {
  roles?: UserRole[];
  children: React.ReactNode;
}

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 text-rose-400 backdrop-blur-xl">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-white">Sign In Required</h2>
        <p className="mt-1 max-w-sm text-sm text-gray-400">
          You need to be signed in to access this protected area.
        </p>
        <Button onClick={() => router.push("/login")} className="mt-6">
          Go to Sign In
        </Button>
      </div>
    );
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-950/30 text-rose-400 backdrop-blur-xl">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-white">Access Restricted</h2>
        <p className="mt-1 max-w-sm text-sm text-gray-400">
          This page requires <span className="font-mono text-emerald-400">{roles.join(" or ")}</span> privileges. Your current role is <span className="font-mono text-gray-300">{user.role}</span>.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Use the role switcher in the top navbar to test with different permissions.
        </p>
        <Button onClick={() => router.push("/")} variant="secondary" className="mt-6">
          Return to Map
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
