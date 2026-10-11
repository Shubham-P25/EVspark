"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { setTokenGetter } from "@/lib/api";
import { setSocketToken } from "@/lib/socket";

export function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();

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
    } else {
      setTokenGetter(null);
      setSocketToken(null);
    }
  }, [isSignedIn, getToken]);

  return <>{children}</>;
}
