import type { Metadata } from "next";
import Link from "next/link";
import {
  Map,
  Activity,
  Zap,
  Bell,
  BarChart3,
  Shield,
  Car,
  Plug,
  LayoutDashboard,
  MapPin,
  Check,
  ArrowRight,
  Gauge,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "EVspark — Classic Overview",
  description: "Classic architecture and ecosystem overview of the EVspark charging network.",
};

const FEATURES = [
  {
    icon: Map,
    title: "Real-Time Station Map",
    copy: "Live availability across Indian cities. Filter by charger type, speed, and distance. Always know where to charge next.",
  },
  {
    icon: Activity,
    title: "AI Demand Forecasting",
    copy: "Gradient-boosted machine learning predictions per station. Anticipate peak hours before they happen and balance your network proactively.",
    highlight: true,
  },
  {
    icon: Zap,
    title: "Live Session Monitoring",
    copy: "Track power output, state-of-charge, and session duration in real time. Get instant alerts when sessions deviate.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    copy: "Booking confirmations, congestion warnings, availability alerts — delivered at the right moment to drivers and operators.",
  },
  {
    icon: BarChart3,
    title: "Operator Analytics",
    copy: "Revenue trends, usage patterns, and peak-hour insights. Make data-driven decisions about your charging network.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    copy: "Separate dashboards for EV Drivers, Station Operators, and Platform Admins. The right view for every stakeholder.",
  },
];

const ROLES = [
  {
    title: "EV Driver",
    badge: "Driver Portal",
    icon: Car,
    tagline: "Find, Book, Charge",
    copy: "Real-time station finder with smart routing, live wait times, and slot booking — built for Indian roads.",
    bullets: [
      "Live map with availability filters",
      "Estimated wait time per station",
      "Route-aware station recommendations",
      "OCPP-compatible with all major EVs",
    ],
    link: "/driver",
  },
  {
    title: "Station Operator",
    badge: "Operator Portal",
    icon: Plug,
    tagline: "Manage & Monetize",
    copy: "Full control over your charging stations — monitor performance, track revenue, and respond to congestion alerts in real time.",
    bullets: [
      "Real-time station status dashboard",
      "Revenue and usage analytics",
      "Congestion and fault alerts",
      "Multi-station fleet management",
    ],
    link: "/station",
  },
  {
    title: "Platform Admin",
    badge: "Admin Portal",
    icon: LayoutDashboard,
    tagline: "Control the Network",
    copy: "Platform-wide oversight, user management, system health monitoring, and compliance reporting — all in one place.",
    bullets: [
      "User and operator management",
      "Network-wide health monitoring",
      "AI model performance tracking",
      "Audit logs and access control",
    ],
    link: "/admin",
  },
];

const STATIONS = [
  { name: "Andheri East", city: "Mumbai", status: "Available", color: "#1E8E3E", kw: 60, price: "₹16.5" },
  { name: "Hinjewadi Phase 2", city: "Pune", status: "Available", color: "#1E8E3E", kw: 120, price: "₹17.0" },
  { name: "Koramangala", city: "Bangalore", status: "Charging", color: "#1A73E8", kw: 50, price: "₹15.8" },
  { name: "Connaught Place", city: "Delhi", status: "Occupied", color: "#D93025", kw: 60, price: "₹18.0" },
];

export default function ClassicLandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#202124]">
      {/* Light Header */}
      <header className="sticky top-0 z-50 border-b border-[#DADCE0] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-heading font-bold text-xl text-[#202124]">
              EVspark
            </Link>
            <span className="rounded-full bg-[#F8F9FA] px-2.5 py-0.5 text-xs font-semibold text-[#5F6368] border border-[#DADCE0]">
              Classic Edition
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-[#1A73E8] font-medium hover:underline">
              Switch to New Landing &rarr;
            </Link>
            <Link href="/driver">
              <Button size="sm" className="bg-[#1A73E8] text-white hover:bg-[#185ABC]">
                Open Driver Map
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-[#DADCE0] bg-[#F8F9FA] py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#DADCE0] bg-white px-3 py-1 text-xs font-semibold text-[#1A73E8]">
                <Sparkles size={14} />
                <span>Next-Gen EV Charging Network for India</span>
              </div>

              <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-[#202124] leading-tight">
                Intelligent EV Charging Infrastructure
              </h1>

              <p className="text-lg text-[#5F6368] leading-relaxed max-w-2xl">
                Real-time station telemetry, predictive demand modeling, and unified management across EV drivers, commercial operators, and network administrators.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link href="/driver">
                  <Button className="h-11 bg-[#1A73E8] text-white hover:bg-[#185ABC] font-semibold px-6">
                    Find Chargers
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
                <Link href="/station">
                  <Button variant="outline" className="h-11 border-[#DADCE0] bg-white text-[#202124] hover:bg-[#F8F9FA] px-6">
                    Operator Dashboard
                  </Button>
                </Link>
              </div>
            </div>

            {/* Road & Charger Visual */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-[#DADCE0] bg-white p-6 shadow-md">
                <div className="flex items-center justify-between border-b border-[#DADCE0] pb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#202124]">
                    <span className="size-2 rounded-full bg-[#1E8E3E]" />
                    <span>Live EV Route Network</span>
                  </div>
                  <span className="text-[11px] text-[#5F6368]">Active Stations: 71</span>
                </div>

                <div className="mt-4 rounded-xl bg-[#F8F9FA] p-5 border border-[#DADCE0] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-[#202124]">Smart corridor selected</span>
                    <span className="font-mono text-xs font-semibold text-[#1A73E8]">0.8 km &bull; 3 chargers free</span>
                  </div>

                  <div className="space-y-2">
                    {STATIONS.map((st) => (
                      <div key={st.name} className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-[#DADCE0] text-xs">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-[#5F6368]" />
                          <div>
                            <p className="font-medium text-[#202124]">{st.name}</p>
                            <p className="text-[10px] text-[#5F6368]">{st.city} &bull; {st.kw} kW</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              backgroundColor: st.status === "Available" ? "#E6F4EA" : st.status === "Charging" ? "#E8F0FE" : "#FCE8E6",
                              color: st.status === "Available" ? "#1E8E3E" : st.status === "Charging" ? "#1A73E8" : "#D93025",
                            }}
                          >
                            {st.status}
                          </span>
                          <p className="font-mono text-[11px] text-[#202124] mt-0.5">{st.price}/kWh</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 border-b border-[#DADCE0] bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="font-heading text-3xl font-bold text-[#202124]">
              Comprehensive Charging Ecosystem
            </h2>
            <p className="text-[#5F6368]">
              Designed for reliability, scale, and interoperability under Indian operating conditions.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`rounded-2xl border p-6 transition ${
                    f.highlight
                      ? "border-[#1A73E8] bg-[#F8F9FA] shadow-xs"
                      : "border-[#DADCE0] bg-white hover:border-[#1A73E8]/50"
                  }`}
                >
                  <div
                    className={`grid size-11 place-items-center rounded-xl ${
                      f.highlight ? "bg-[#1A73E8] text-white" : "bg-[#E8F0FE] text-[#1A73E8]"
                    }`}
                  >
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-5 font-semibold text-lg text-[#202124]">{f.title}</h3>
                  <p className="mt-2 text-sm text-[#5F6368] leading-relaxed">{f.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Operator Command Center Preview */}
      <section className="py-20 border-b border-[#DADCE0] bg-[#F8F9FA]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-semibold text-[#1A73E8] uppercase tracking-wider">
              Operator Dashboard
            </span>
            <h2 className="font-heading text-3xl font-bold text-[#202124]">
              Your Command Center
            </h2>
            <p className="text-[#5F6368]">
              A real-time glimpse into the EVspark charge point operator dashboard.
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-[#DADCE0] bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#DADCE0] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[#5F6368] tracking-wider">Overview / Today</p>
                <p className="font-heading font-bold text-lg text-[#202124]">Good morning, Alex</p>
              </div>
              <span className="grid size-9 place-items-center rounded-full bg-[#1A73E8] text-white font-bold text-xs">
                AK
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-4">
                <p className="text-xs text-[#5F6368]">Total Revenue</p>
                <p className="font-mono text-2xl font-bold text-[#1E8E3E] mt-1">&#8377;2.4L</p>
              </div>
              <div className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-4">
                <p className="text-xs text-[#5F6368]">Active Sessions</p>
                <p className="font-mono text-2xl font-bold text-[#202124] mt-1">142</p>
              </div>
              <div className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-4">
                <p className="text-xs text-[#5F6368]">Network Uptime</p>
                <p className="font-mono text-2xl font-bold text-[#1A73E8] mt-1">99.2%</p>
              </div>
              <div className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-4">
                <p className="text-xs text-[#5F6368]">Active Alerts</p>
                <p className="font-mono text-2xl font-bold text-[#F9AB00] mt-1">3</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-[#F8F9FA] p-4 border border-[#DADCE0] flex items-center justify-between text-xs text-[#5F6368]">
              <span>AI predicts tomorrow&apos;s peak congestion at 6:00 PM</span>
              <Link href="/station" className="font-semibold text-[#1A73E8] hover:underline">
                Explore Full Operator Console &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Role Cards */}
      <section className="py-20 border-b border-[#DADCE0] bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="font-heading text-3xl font-bold text-[#202124]">
              Dedicated Portals by Role
            </h2>
            <p className="text-[#5F6368]">
              Purpose-built experiences with strict role-based access control.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            {ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.title}
                  className="flex flex-col justify-between rounded-2xl border border-[#DADCE0] bg-[#F8F9FA] p-7 transition hover:border-[#1A73E8]/50 hover:shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="grid size-11 place-items-center rounded-xl bg-white text-[#1A73E8] border border-[#DADCE0]">
                        <Icon size={22} />
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-[#5F6368] border border-[#DADCE0]">
                        {role.badge}
                      </span>
                    </div>

                    <h3 className="mt-6 font-semibold text-xl text-[#202124]">{role.tagline}</h3>
                    <p className="mt-2 text-sm text-[#5F6368] leading-relaxed">{role.copy}</p>

                    <ul className="mt-6 space-y-2.5 border-t border-[#DADCE0] pt-6">
                      {role.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-xs text-[#202124]">
                          <Check size={14} className="text-[#1E8E3E] shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-4">
                    <Link href={role.link}>
                      <Button className="w-full bg-[#1A73E8] text-white hover:bg-[#185ABC] text-xs font-semibold">
                        Launch {role.title}
                        <ArrowRight size={14} className="ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Classic Footer */}
      <footer className="py-10 bg-[#F8F9FA] text-xs text-[#5F6368] text-center border-t border-[#DADCE0]">
        <div className="mx-auto max-w-7xl px-4 space-y-2">
          <p>&copy; {new Date().getFullYear()} EVspark Technologies &bull; Classic View</p>
          <div className="flex justify-center gap-4 text-[#1A73E8]">
            <Link href="/" className="hover:underline">New Landing</Link>
            <span>&bull;</span>
            <Link href="/driver" className="hover:underline">Driver Map</Link>
            <span>&bull;</span>
            <Link href="/station" className="hover:underline">Operator Portal</Link>
            <span>&bull;</span>
            <Link href="/admin" className="hover:underline">Admin Room</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
