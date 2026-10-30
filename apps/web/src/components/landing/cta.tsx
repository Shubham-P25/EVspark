"use client";

import Link from "next/link";
import { ArrowRight, Lightning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#F7F9FC] to-[#1D6BFF]/5 py-24 text-center">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-[#1D6BFF]/20 to-transparent" />
        <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-[#1D6BFF]/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-[#16C784]/5 blur-3xl" />
      </div>

      <motion.div
        className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-[#1D6BFF] to-[#4F8CFF] text-white shadow-lg shadow-[#1D6BFF]/20">
          <Lightning size={32} weight="fill" />
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.02em] text-[#0B1220]">
          Ready to eliminate charging anxiety?
        </h2>

        <p className="mx-auto max-w-2xl text-lg text-[#4A5568]">
          Join thousands of EV drivers across India making intercity trips with guaranteed slots
          and predictive wait times.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link href="/signup">
            <Button className="h-13 rounded-xl bg-gradient-to-r from-[#1D6BFF] to-[#4F8CFF] px-8 text-base font-semibold text-white shadow-lg shadow-[#1D6BFF]/20 hover:shadow-xl hover:shadow-[#1D6BFF]/30 hover:-translate-y-0.5 transition-all duration-200">
              Get Started Free
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </Link>
          <Link href="/driver">
            <Button
              variant="outline"
              className="h-13 rounded-xl border-[#E6EAF2] bg-white px-8 text-base font-semibold text-[#0B1220] hover:bg-[#F7F9FC] hover:border-[#1D6BFF]/30 shadow-sm transition-all duration-200"
            >
              Explore Live Driver Map
            </Button>
          </Link>
        </div>

        <p className="text-xs text-[#8A94A6] pt-2">
          No credit card required &bull; Works with all major Indian EV models &bull; Free forever
          for drivers
        </p>
      </motion.div>
    </section>
  );
}
