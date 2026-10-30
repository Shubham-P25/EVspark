"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Lightning, ArrowRight, List, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export function LandingNavbar() {
  const { isSignedIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const NAV_LINKS = [
    { label: "How it works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Network", href: "#metrics" },
    { label: "AI Forecast", href: "#predictions" },
    { label: "Solutions", href: "#roles" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-[#E6EAF2] shadow-[0_1px_3px_rgba(16,40,90,0.04)]"
          : "bg-white/60 backdrop-blur-md border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-xl text-[#0B1220] tracking-tight"
        >
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#1D6BFF] to-[#4F8CFF] text-white shadow-sm shadow-[#1D6BFF]/20">
            <Lightning size={20} weight="fill" />
          </div>
          <span className="font-heading">EVspark</span>
          <span className="rounded-md bg-[#1D6BFF]/8 px-2 py-0.5 text-[11px] font-semibold text-[#1D6BFF]">
            India
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-[#4A5568]">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-lg px-3 py-2 transition-colors duration-200 hover:bg-[#F7F9FC] hover:text-[#0B1220]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Auth & CTA */}
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <Link href="/driver">
              <Button className="bg-gradient-to-r from-[#1D6BFF] to-[#4F8CFF] text-white hover:shadow-md hover:shadow-[#1D6BFF]/20 font-medium text-sm transition-all duration-200">
                Go to Dashboard
                <ArrowRight size={16} className="ml-1.5" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button
                  variant="ghost"
                  className="text-[#0B1220] hover:bg-[#F7F9FC] text-sm font-medium"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-[#1D6BFF] to-[#4F8CFF] text-white hover:shadow-md hover:shadow-[#1D6BFF]/20 text-sm font-medium transition-all duration-200">
                  Find Chargers
                </Button>
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            className="lg:hidden grid size-9 place-items-center rounded-lg hover:bg-[#F7F9FC] transition"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? (
              <X size={20} className="text-[#0B1220]" />
            ) : (
              <List size={20} className="text-[#0B1220]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="lg:hidden overflow-hidden border-t border-[#E6EAF2] bg-white/95 backdrop-blur-xl"
          >
            <div className="px-4 py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium text-[#4A5568] hover:bg-[#F7F9FC] hover:text-[#0B1220] transition"
                >
                  {link.label}
                </a>
              ))}
              {!isSignedIn && (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium text-[#1D6BFF] hover:bg-[#1D6BFF]/5 transition"
                >
                  Sign In
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
