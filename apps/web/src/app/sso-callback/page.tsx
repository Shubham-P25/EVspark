"use client";

import React, { useEffect, useState } from "react";
import { HandleSSOCallback, useClerk } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  const { session } = useClerk();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleNavigate = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/me/profile`, {
        headers: session ? { Authorization: `Bearer ${await session.getToken()}` } : {},
      }).then((r) => (r.ok ? r.json() : null));

      if (res?.onboarded) {
        const role = res.user?.role || "DRIVER";
        document.cookie = `evspark_onboarded=true; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `evspark_role=${role}; path=/; max-age=31536000; SameSite=Lax`;
        window.location.href = role === "OPERATOR" ? "/station" : "/driver";
        return;
      }
    } catch {
      // Fallback below
    }

    // If cookie already says onboarded
    if (typeof document !== "undefined" && document.cookie.includes("evspark_onboarded=true")) {
      const isOp = document.cookie.includes("evspark_role=OPERATOR");
      window.location.href = isOp ? "/station" : "/driver";
      return;
    }

    window.location.href = "/onboarding";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FA] px-4 text-center">
      <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl border border-[#DADCE0] shadow-sm max-w-sm w-full">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1A73E8] flex items-center justify-center">
          <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#202124]">Authenticating...</h2>
          <p className="text-xs text-[#5F6368] mt-1.5 leading-relaxed">
            Completing sign-in with your provider. You will be redirected momentarily.
          </p>
        </div>

        <HandleSSOCallback
          navigateToApp={handleNavigate}
          navigateToSignIn={() => {
            window.location.href = "/login";
          }}
          navigateToSignUp={handleNavigate}
        />

        {timedOut && (
          <div className="mt-2 pt-3 border-t border-[#DADCE0] w-full">
            <p className="text-xs text-[#5F6368] mb-2">Taking longer than expected?</p>
            <button
              type="button"
              onClick={() => {
                window.location.href = session ? "/driver" : "/login";
              }}
              className="text-xs font-semibold text-[#1A73E8] hover:underline cursor-pointer"
            >
              Continue to {session ? "Dashboard" : "Login"} &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
