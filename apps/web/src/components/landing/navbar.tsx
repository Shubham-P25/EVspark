"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Lightning, ArrowRight, Compass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function LandingNavbar() {
  const { isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#DADCE0] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-[#202124] tracking-tight">
          <div className="grid size-9 place-items-center rounded-xl bg-[#1A73E8] text-white shadow-sm">
            <Lightning size={20} weight="fill" />
          </div>
          <span className="font-heading">EVspark</span>
          <span className="rounded-full bg-[#E8F0FE] px-2 py-0.5 text-[11px] font-semibold text-[#1A73E8]">
            India
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5F6368]">
          <a href="#how-it-works" className="transition hover:text-[#202124]">
            How it works
          </a>
          <a href="#features" className="transition hover:text-[#202124]">
            Features
          </a>
          <a href="#metrics" className="transition hover:text-[#202124]">
            Network
          </a>
          <a href="#predictions" className="transition hover:text-[#202124]">
            AI Forecast
          </a>
          <a href="#roles" className="transition hover:text-[#202124]">
            Solutions
          </a>
          <a href="#faq" className="transition hover:text-[#202124]">
            FAQ
          </a>
          <Link href="/classic" className="text-xs text-[#80868B] hover:text-[#202124]">
            Classic view
          </Link>
        </nav>

        {/* Auth & CTA */}
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <Link href="/driver">
              <Button className="bg-[#1A73E8] text-white hover:bg-[#185ABC] font-medium text-sm">
                Go to Dashboard
                <ArrowRight size={16} className="ml-1.5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className="text-[#202124] hover:bg-[#F8F9FA] text-sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-[#1A73E8] text-white hover:bg-[#185ABC] text-sm font-medium">
                  Find Chargers
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
