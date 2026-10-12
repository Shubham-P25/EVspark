"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn, useClerk, useAuth } from "@clerk/nextjs";
import { Eye, EyeSlash, CircleNotch, ArrowRight, SignOut } from "@phosphor-icons/react";
import { siGoogle, siGithub } from "simple-icons";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useSignIn();
  const { setActive, loaded: isLoaded, signOut } = useClerk();
  const { isSignedIn } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [suggestGoogle, setSuggestGoogle] = useState(false);

  const handleSignOutAndReset = async () => {
    document.cookie = "evspark_onboarded=; path=/; max-age=0";
    document.cookie = "evspark_onboarding_complete=; path=/; max-age=0";
    document.cookie = "evspark_role=; path=/; max-age=0";
    await signOut();
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setIdentifierError(null);
    setPasswordError(null);
    setSuggestGoogle(false);

    const cleanIdentifier = identifier.trim();
    let hasError = false;
    if (!cleanIdentifier) {
      setIdentifierError("Please enter your username or email.");
      hasError = true;
    }
    if (!password) {
      setPasswordError("Please enter your password.");
      hasError = true;
    }
    if (hasError || !isLoaded || !signIn) return;

    setIsSubmitting(true);
    try {
      // If user was already signed in, clear previous session first
      if (isSignedIn) {
        document.cookie = "evspark_onboarded=; path=/; max-age=0";
        document.cookie = "evspark_onboarding_complete=; path=/; max-age=0";
        document.cookie = "evspark_role=; path=/; max-age=0";
        await signOut();
      }

      // Fast email path vs username lookup
      let emailToUse = cleanIdentifier;
      if (!cleanIdentifier.includes("@")) {
        try {
          const resolveRes = await fetch("/api/auth/resolve-identifier", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: cleanIdentifier }),
          });
          const resolved = await resolveRes.json();
          if (resolved.found) {
            if (!resolved.passwordEnabled && resolved.isGoogle) {
              setSuggestGoogle(true);
              setGeneralError(
                `The account "${resolved.username || cleanIdentifier}" was registered with Google Sign-In. Please click the Google button below to continue.`
              );
              setIsSubmitting(false);
              return;
            }
            if (resolved.email) {
              emailToUse = resolved.email;
            }
          } else {
            setIdentifierError("No account found with this username. Please check your spelling or use your email address.");
            setIsSubmitting(false);
            return;
          }
        } catch (resErr) {
          console.warn("Identifier resolution warning:", resErr);
        }
      }

      const result = await signIn.create({
        identifier: emailToUse,
        password,
      });

      if (result.error) {
        const errorMsg = result.error.message || "Invalid username or password.";
        if (result.error.code === "form_identifier_not_found") {
          setIdentifierError("No account found with this username or email.");
        } else if (result.error.code === "form_password_incorrect") {
          setPasswordError("Incorrect password. Please try again.");
        } else if (result.error.code === "form_password_not_set") {
          setSuggestGoogle(true);
          setGeneralError("This account uses Google Sign-In. Please click the Google button below to sign in.");
        } else {
          setGeneralError(errorMsg);
        }
        return;
      }

      if (signIn.status === "complete" && signIn.createdSessionId) {
        await setActive({ session: signIn.createdSessionId });
        document.cookie = "evspark_onboarded=true; path=/; max-age=31536000; SameSite=Lax";
        window.location.href = "/driver";
      } else {
        setGeneralError("Additional verification required. Please try again.");
      }
    } catch (err: any) {
      setGeneralError(err?.message || "Invalid username or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const handleOAuth = async (strategy: "oauth_google" | "oauth_github") => {
    if (!isLoaded || !signIn) return;
    setGeneralError(null);
    setOauthLoading(strategy);

    try {
      const res = await signIn.sso({
        strategy,
        redirectUrl: "/driver",
        redirectCallbackUrl: "/sso-callback",
      });

      if (res?.error) {
        console.error("OAuth sign-in error:", res.error);
        const message =
          res.error.longMessage ||
          res.error.message ||
          `Failed to sign in with ${strategy === "oauth_google" ? "Google" : "GitHub"}.`;
        setGeneralError(message);
        setOauthLoading(null);
      }
    } catch (err: any) {
      console.error("OAuth sign-in exception:", err);
      const message =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        `Failed to sign in with ${strategy === "oauth_google" ? "Google" : "GitHub"}.`;
      setGeneralError(message);
      setOauthLoading(null);
    }
  };

  return (
    <div className="w-full bg-white border border-[#DADCE0] rounded-2xl p-6 sm:p-8 shadow-sm">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-[#202124]">Log in to EVspark</h1>
        <p className="text-sm text-[#5F6368] mt-1.5">
          Enter your username or email to continue.
        </p>
      </div>

      {/* Already signed in notification */}
      {isSignedIn && (
        <div className="mb-5 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#1A73E8] flex items-center justify-between gap-2">
          <span>You have an active session.</span>
          <div className="flex items-center gap-2">
            <Link
              href="/driver"
              className="font-semibold underline hover:text-[#174ea6] flex items-center gap-0.5"
            >
              Dashboard <ArrowRight size={12} />
            </Link>
            <button
              type="button"
              onClick={handleSignOutAndReset}
              className="font-semibold text-[#D93025] hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
            >
              <SignOut size={12} /> Sign out
            </button>
          </div>
        </div>
      )}

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
        <div>
          <label
            htmlFor="identifier"
            className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5"
          >
            Username or Email
          </label>
          <input
            id="identifier"
            type="text"
            autoCapitalize="none"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={isSubmitting}
            className={`w-full h-11 px-3.5 rounded-xl border text-sm text-[#202124] placeholder-[#80868B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8] ${
              identifierError ? "border-[#D93025] bg-red-50/20" : "border-[#DADCE0] bg-white"
            }`}
            placeholder="e.g. aarav_ev or driver@example.com"
          />
          {identifierError && (
            <p className="mt-1 text-xs text-[#D93025]" role="alert">
              {identifierError}
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              className={`w-full h-11 px-3.5 pr-10 rounded-xl border text-sm text-[#202124] placeholder-[#80868B] transition-colors focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8] ${
                passwordError ? "border-[#D93025] bg-red-50/20" : "border-[#DADCE0] bg-white"
              }`}
              placeholder="••••••••"
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
          {passwordError && (
            <p className="mt-1 text-xs text-[#D93025]" role="alert">
              {passwordError}
            </p>
          )}
        </div>

        {/* Turnstile / CAPTCHA anchor element for Clerk custom flows */}
        <div id="clerk-captcha" />

        <button
          type="submit"
          disabled={isSubmitting || !isLoaded}
          className="w-full h-11 rounded-xl bg-[#1A73E8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 cursor-pointer"
        >
          {isSubmitting && <CircleNotch size={18} className="animate-spin" />}
          <span>{isSubmitting ? "Logging in..." : "Log in"}</span>
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
          disabled={!isLoaded || isSubmitting || !!oauthLoading}
          className={`h-10 px-4 rounded-xl border text-xs font-medium flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 cursor-pointer ${
            suggestGoogle
              ? "border-[#1A73E8] bg-blue-50/70 text-[#1A73E8] ring-2 ring-[#1A73E8]/30 font-semibold shadow-sm"
              : "border-[#DADCE0] bg-white hover:bg-slate-50 text-[#202124]"
          }`}
        >
          {oauthLoading === "oauth_google" ? (
            <CircleNotch size={16} className="animate-spin text-[#1A73E8]" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d={siGoogle.path} />
            </svg>
          )}
          <span>{oauthLoading === "oauth_google" ? "Connecting..." : suggestGoogle ? "Sign in with Google" : "Google"}</span>
        </button>

        <button
          type="button"
          onClick={() => handleOAuth("oauth_github")}
          disabled={!isLoaded || isSubmitting || !!oauthLoading}
          className="h-10 px-4 rounded-xl border border-[#DADCE0] bg-white hover:bg-slate-50 text-[#202124] text-xs font-medium flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {oauthLoading === "oauth_github" ? (
            <CircleNotch size={16} className="animate-spin text-[#202124]" />
          ) : (
            <svg className="w-4 h-4 fill-[#202124]" viewBox="0 0 24 24">
              <path d={siGithub.path} />
            </svg>
          )}
          <span>{oauthLoading === "oauth_github" ? "Connecting..." : "GitHub"}</span>
        </button>
      </div>

      <p className="text-center text-xs text-[#5F6368] mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-[#1A73E8] font-semibold hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
