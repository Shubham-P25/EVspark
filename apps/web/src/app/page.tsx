import type { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingHero } from "@/components/landing/hero";
import { MarqueeStrip } from "@/components/landing/marquee-strip";
import { ProblemSection } from "@/components/landing/problem";
import { HowItWorksSection } from "@/components/landing/how-it-works";
import { BentoSection } from "@/components/landing/bento";
import { NetworkMetricsSection } from "@/components/landing/metrics";
import { ForecastingSection } from "@/components/landing/forecasting";
import { ChargerPreviewSection } from "@/components/landing/charger-preview";
import { RoleTabsSection } from "@/components/landing/role-tabs";
import { PolicyPricingSection } from "@/components/landing/policy-pricing";
import { FaqSection } from "@/components/landing/faq";
import { CtaSection } from "@/components/landing/cta";
import { LandingFooter } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "EVspark — Find an EV Charger Without the Wait",
  description:
    "India's predictive EV charging network. Sub-minute wait time forecasts, along-route corridor planning, and guaranteed 15-minute slot reservations.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#202124]">
      <LandingNavbar />
      <main>
        <LandingHero />
        <MarqueeStrip />
        <ProblemSection />
        <HowItWorksSection />
        <BentoSection />
        <NetworkMetricsSection />
        <ForecastingSection />
        <ChargerPreviewSection />
        <RoleTabsSection />
        <PolicyPricingSection />
        <FaqSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
