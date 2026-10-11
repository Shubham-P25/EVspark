import Link from "next/link";
import { ArrowRight, Lightning } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="border-b border-[#DADCE0] bg-gradient-to-b from-[#FFFFFF] to-[#E8F0FE]/40 py-20 text-center">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="inline-grid size-14 place-items-center rounded-2xl bg-[#1A73E8] text-white shadow-md">
          <Lightning size={32} weight="fill" />
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#202124]">
          Ready to eliminate charging anxiety?
        </h2>

        <p className="mx-auto max-w-2xl text-lg text-[#5F6368]">
          Join thousands of EV drivers across India making intercity trips with guaranteed slots and predictive wait times.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link href="/register">
            <Button className="h-12 rounded-xl bg-[#1A73E8] px-8 text-base font-semibold text-white shadow-sm hover:bg-[#185ABC]">
              Get Started Free
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </Link>
          <Link href="/driver">
            <Button
              variant="outline"
              className="h-12 rounded-xl border-[#DADCE0] bg-white px-8 text-base font-semibold text-[#202124] hover:bg-[#F8F9FA]"
            >
              Explore Live Driver Map
            </Button>
          </Link>
        </div>

        <p className="text-xs text-[#80868B] pt-2">
          No credit card required &bull; Works with all major Indian EV models &bull; Free forever for drivers
        </p>
      </div>
    </section>
  );
}
