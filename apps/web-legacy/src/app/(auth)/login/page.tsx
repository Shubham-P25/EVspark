"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Mail, KeyRound, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
    }, 600);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Log in as driver by default
      setAuth("token_driver_" + Date.now(), {
        id: "usr_driver_live",
        email: email || "driver@evspark.local",
        name: email.split("@")[0] || "EV Driver",
        role: "DRIVER",
        vehicleModelName: "Tata Nexon EV Max",
      });
      router.push("/");
    }, 600);
  };

  const enterQuickDemo = (role: "DRIVER" | "OPERATOR" | "ADMIN") => {
    const rolesMap = {
      DRIVER: { name: "Aarav Sharma", email: "aarav@evspark.local", vehicleModelName: "Tata Nexon EV Max" },
      OPERATOR: { name: "Aditi Rao", email: "operator@tatapower.local", vehicleModelName: undefined },
      ADMIN: { name: "System Admin", email: "admin@evspark.local", vehicleModelName: undefined },
    };
    const info = rolesMap[role];
    setAuth(`mock_token_${role.toLowerCase()}`, {
      id: `usr_${role.toLowerCase()}_1`,
      email: info.email,
      name: info.name,
      role,
      vehicleModelName: info.vehicleModelName,
    });

    if (role === "OPERATOR") router.push("/operator");
    else if (role === "ADMIN") router.push("/admin");
    else router.push("/");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F17] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121826]/80 p-8 shadow-2xl backdrop-blur-xl">
        {/* Brand */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30">
            <Zap className="h-6 w-6 fill-slate-950" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-white">
            Welcome to EV<span className="text-emerald-400">spark</span>
          </h1>
          <p className="mt-1 text-xs text-gray-400">
            AI-powered smart charging & digital twin platform
          </p>
        </div>

        {/* Auth form */}
        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300">Email Address</label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              <span>Send OTP Code</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300">
                Enter 6-digit OTP sent to {email}
              </label>
              <div className="relative mt-1.5">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  required
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-2.5 pl-10 pr-4 font-mono text-center text-lg tracking-widest text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              <span>Verify & Sign In</span>
              <ShieldCheck className="h-4 w-4" />
            </Button>

            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-center text-xs text-gray-400 hover:text-white"
            >
              Use a different email
            </button>
          </form>
        )}

        {/* Quick Demo Switcher */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-center font-mono text-[10px] uppercase tracking-wider text-gray-400">
            One-Click Instant Access
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => enterQuickDemo("DRIVER")}
            >
              Driver
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => enterQuickDemo("OPERATOR")}
            >
              Operator
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => enterQuickDemo("ADMIN")}
            >
              Admin
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          New to EVspark?{" "}
          <Link href="/register" className="font-semibold text-emerald-400 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}