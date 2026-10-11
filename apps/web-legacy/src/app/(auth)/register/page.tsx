"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Car, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore, UserRole } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const INDIAN_VEHICLES = [
  "Tata Nexon EV Max",
  "Tata Tiago EV",
  "Tata Punch.ev",
  "MG ZS EV",
  "Mahindra XUV400",
  "Hyundai Ioniq 5",
  "BYD Atto 3",
  "Kia EV6",
  "Ola S1 Pro",
  "Ather 450X Gen 3",
];

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [role, setRole] = useState<UserRole>("DRIVER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [vehicleModel, setVehicleModel] = useState(INDIAN_VEHICLES[0]);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setAuth(`token_reg_${Date.now()}`, {
        id: `usr_${Date.now()}`,
        email: email || "user@evspark.local",
        name: name || "EV User",
        role,
        vehicleModelName: role === "DRIVER" ? vehicleModel : undefined,
      });

      if (role === "OPERATOR") {
        router.push("/operator");
      } else {
        router.push("/");
      }
    }, 600);
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
            Create an Account
          </h1>
          <p className="mt-1 text-xs text-gray-400">
            Join India's smartest EV charging network
          </p>
        </div>

        {/* Role toggle */}
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-1">
          <button
            type="button"
            onClick={() => setRole("DRIVER")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition",
              role === "DRIVER"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "text-gray-400 hover:text-white"
            )}
          >
            <Car className="h-4 w-4" />
            <span>EV Driver</span>
          </button>
          <button
            type="button"
            onClick={() => setRole("OPERATOR")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition",
              role === "OPERATOR"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "text-gray-400 hover:text-white"
            )}
          >
            <Building2 className="h-4 w-4" />
            <span>Station Operator</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aarav Sharma"
              required
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>

          {role === "DRIVER" ? (
            <div>
              <label className="block text-xs font-medium text-gray-300">Vehicle Model</label>
              <select
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
              >
                {INDIAN_VEHICLES.map((v) => (
                  <option key={v} value={v} className="bg-slate-900 text-white">
                    {v}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-300">Business / CPO Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Tata Power / Jio-bp / Statiq Franchise"
                required
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
            <span>Complete Registration</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-emerald-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}