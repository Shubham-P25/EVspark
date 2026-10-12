"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { setTokenGetter, setUserEmailGetter, apiFetch } from "@/lib/api";
import { setSocketToken } from "@/lib/socket";

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (isSignedIn) {
      setTokenGetter(async () => {
        try {
          return await getToken();
        } catch {
          return null;
        }
      });
      getToken().then((token) => {
        setSocketToken(token);
      });

      const userEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
      if (userEmail) {
        setUserEmailGetter(() => userEmail);
      }

      // Check DB onboarding status to ensure cookies are synchronized
      apiFetch<any>("/api/me/profile")
        .then((res) => {
          if (res?.onboarded) {
            const role = res.user?.role || "DRIVER";
            document.cookie = `evspark_onboarded=true; path=/; max-age=31536000; SameSite=Lax`;
            document.cookie = `evspark_role=${role}; path=/; max-age=31536000; SameSite=Lax`;
          }
        })
        .catch(() => {});
    } else {
      setTokenGetter(null);
      setUserEmailGetter(null);
      setSocketToken(null);
    }
  }, [isSignedIn, getToken, user]);

  return <>{children}</>;
}
