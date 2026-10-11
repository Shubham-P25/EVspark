"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignUp, useClerk } from "@clerk/nextjs";
import { Eye, EyeSlash, CircleNotch, Car, ChargingStation } from "@phosphor-icons/react";
import { siGoogle, siGithub } from "simple-icons";
import { z } from "zod";

const registerFormSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(24, "Username must be at most 24 characters")
    .regex(/^[a-z0-9_]+$/, "Username must be lowercase letters, numbers, and underscores only"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(60, "Full name must be at most 60 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
  role: z.enum(["DRIVER", "OPERATOR"]),
});

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useSignUp();
  const { setActive, loaded: isLoaded } = useClerk();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"DRIVER" | "OPERATOR">("DRIVER");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const strengthScore = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    if (password.length >= 12) score += 1;
    return score;
  }, [password]);

  const strengthLabel = useMemo(() => {
    switch (strengthScore) {
      case 0:
      case 1:
        return { text: "Weak", color: "bg-red-500", textCol: "text-red-600" };
      case 2:
        return { text: "Fair", color: "bg-amber-500", textCol: "text-amber-600" };
      case 3:
        return { text: "Good", color: "bg-blue-500", textCol: "text-blue-600" };
      case 4:
        return { text: "Strong", color: "bg-green-600", textCol: "text-green-600" };
      default:
        return { text: "", color: "bg-slate-200", textCol: "text-slate-500" };
    }
  }, [strengthScore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const validation = registerFormSchema.safeParse({
      username: username.toLowerCase().trim(),
      email: email.trim(),
      fullName: fullName.trim(),
      password,
      role,
    });

    if (!validation.success) {
      const errMap: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        errMap[issue.path[0] as string] = issue.message;
      }
      setFieldErrors(errMap);
      return;
    }

    if (!isLoaded || !signUp) return;
    setIsSubmitting(true);

    try {
      const parts = fullName.trim().split(" ");
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ") || "";

      const signUpPayload: any = {
        username: username.toLowerCase().trim(),
        password,
        firstName,
        lastName,
        unsafeMetadata: {
          role,
          username: username.toLowerCase().trim(),
        },
      };

      if (email.trim()) {
        signUpPayload.emailAddress = email.trim().toLowerCase();
      }

      const result = await signUp.create(signUpPayload);

      if (result.error) {
        const errorMsg = result.error.message || "Failed to create account.";
        if (result.error.code === "form_identifier_exists") {
          setFieldErrors({ username: "That username or email is already taken. Please choose another." });
        } else {
          setGeneralError(errorMsg);
        }
        return;
      }

      // Reset any previous session cookies
      document.cookie = "evspark_onboarded=; path=/; max-age=0";
      document.cookie = "evspark_onboarding_complete=; path=/; max-age=0";
      document.cookie = `evspark_role=${role}; path=/; max-age=31536000; SameSite=Lax`;

      if (signUp.status === "complete" && signUp.createdSessionId) {
        await setActive({ session: signUp.createdSessionId });
      }

      router.push("/onboarding");
    } catch (err: any) {
      setGeneralError(err?.message || "Failed to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuth = (strategy: "oauth_google" | "oauth_github") => {
    if (!isLoaded || !signUp) return;
    signUp.sso({
      strategy,
      redirectUrl: "/sso-callback",
      redirectCallbackUrl: "/onboarding",
    });
  };

  return (
    <div className="w-full bg-white border border-[#DADCE0] rounded-2xl p-6 sm:p-8 shadow-sm">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-[#202124]">Create an account</h1>
        <p className="text-sm text-[#5F6368] mt-1.5">
          Join the EVspark intelligent charging network.
        </p>
      </div>

      {generalError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-[#D93025] text-center"
        >
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Role Segmented Control */}
        <div>
          <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5">
            I am a
          </label>
          <div className="grid grid-cols-2 p-1 bg-[#F8F9FA] border border-[#DADCE0] rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setRole("DRIVER")}
              className={`h-9 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                role === "DRIVER"
                  ? "bg-white text-[#1A73E8] shadow-sm font-semibold"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
            >
              <Car size={16} weight={role === "DRIVER" ? "bold" : "regular"} />
              <span>EV Driver</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("OPERATOR")}
              className={`h-9 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                role === "OPERATOR"
                  ? "bg-white text-[#1A73E8] shadow-sm font-semibold"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
            >
              <ChargingStation size={16} weight={role === "OPERATOR" ? "bold" : "regular"} />
              <span>Station Operator</span>
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="username"
            className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            autoCapitalize="none"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isSubmitting}
            className={`w-full h-11 px-3.5 rounded-xl border text-sm text-[#202124] placeholder-[#80868B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8] ${
              fieldErrors.username ? "border-[#D93025] bg-red-50/20" : "border-[#DADCE0] bg-white"
            }`}
            placeholder="e.g. rohit_mumbai"
          />
          {fieldErrors.username && (
            <p className="mt-1 text-xs text-[#D93025]" role="alert">
              {fieldErrors.username}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5"
          >
            Email Address <span className="text-[10px] font-normal text-[#5F6368] normal-case">(optional, for invoices & password recovery)</span>
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            className={`w-full h-11 px-3.5 rounded-xl border text-sm text-[#202124] placeholder-[#80868B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8] ${
              fieldErrors.email ? "border-[#D93025] bg-red-50/20" : "border-[#DADCE0] bg-white"
            }`}
            placeholder="e.g. rohit@gmail.com"
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-[#D93025]" role="alert">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="fullName"
            className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5"
          >
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isSubmitting}
            className={`w-full h-11 px-3.5 rounded-xl border text-sm text-[#202124] placeholder-[#80868B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8] ${
              fieldErrors.fullName ? "border-[#D93025] bg-red-50/20" : "border-[#DADCE0] bg-white"
            }`}
            placeholder="Rohit Deshmukh"
          />
          {fieldErrors.fullName && (
            <p className="mt-1 text-xs text-[#D93025]" role="alert">
              {fieldErrors.fullName}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className={`w-full h-11 px-3.5 pr-10 rounded-xl border text-sm text-[#202124] placeholder-[#80868B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8] ${
                fieldErrors.password ? "border-[#D93025] bg-red-50/20" : "border-[#DADCE0] bg-white"
              }`}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F6368] hover:text-[#202124] transition-colors cursor-pointer"
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Strength Meter */}
          {password && (
            <div className="mt-2 space-y-1.5">
              <div className="flex gap-1 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    strengthScore >= 1 ? strengthLabel.color : "bg-transparent"
                  }`}
                  style={{ width: "25%" }}
                />
                <div
                  className={`h-full transition-all duration-300 ${
                    strengthScore >= 2 ? strengthLabel.color : "bg-transparent"
                  }`}
                  style={{ width: "25%" }}
                />
                <div
                  className={`h-full transition-all duration-300 ${
                    strengthScore >= 3 ? strengthLabel.color : "bg-transparent"
                  }`}
                  style={{ width: "25%" }}
                />
                <div
                  className={`h-full transition-all duration-300 ${
                    strengthScore >= 4 ? strengthLabel.color : "bg-transparent"
                  }`}
                  style={{ width: "25%" }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#5F6368]">Password strength</span>
                <span className={`font-semibold ${strengthLabel.textCol}`}>
                  {strengthLabel.text}
                </span>
              </div>
            </div>
          )}

          {fieldErrors.password && (
            <p className="mt-1 text-xs text-[#D93025]" role="alert">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Turnstile / CAPTCHA anchor element for Clerk custom flows */}
        <div id="clerk-captcha" />

        <button
          type="submit"
          disabled={isSubmitting || !isLoaded}
          className="w-full h-11 rounded-xl bg-[#1A73E8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-3 cursor-pointer"
        >
          {isSubmitting && <CircleNotch size={18} className="animate-spin" />}
          <span>{isSubmitting ? "Creating account..." : "Sign up"}</span>
        </button>
      </form>

      <div className="relative my-6 text-center text-xs">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#DADCE0]" />
        </div>
        <span className="relative bg-white px-3 text-[#5F6368]">or continue with</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleOAuth("oauth_google")}
          disabled={!isLoaded}
          className="h-10 px-4 rounded-xl border border-[#DADCE0] bg-white hover:bg-slate-50 text-[#202124] text-xs font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d={siGoogle.path} />
          </svg>
          <span>Google</span>
        </button>

        <button
          type="button"
          onClick={() => handleOAuth("oauth_github")}
          disabled={!isLoaded}
          className="h-10 px-4 rounded-xl border border-[#DADCE0] bg-white hover:bg-slate-50 text-[#202124] text-xs font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4 h-4 fill-[#202124]" viewBox="0 0 24 24">
            <path d={siGithub.path} />
          </svg>
          <span>GitHub</span>
        </button>
      </div>

      <p className="text-center text-xs text-[#5F6368] mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-[#1A73E8] font-semibold hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
