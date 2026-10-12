"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Lightning, MapPin, Clock, CheckCircle, Pulse } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";

/* ─── Animated Gradient Text for "without the wait." ─── */
function ShimmerText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="bg-gradient-to-r from-[#1D6BFF] via-[#4F8CFF] to-[#1D6BFF] bg-[length:200%_100%] bg-clip-text text-transparent animate-[shimmer_3s_ease-in-out_infinite]">
        {children}
      </span>
    </span>
  );
}

/* ─── Floating Glass Card with parallax depth ─── */
function FloatingCard({
  children,
  className = "",
  depth = 1,
  mouseX,
  mouseY,
  reducedMotion,
}: {
  children: React.ReactNode;
  className?: string;
  depth?: number;
  mouseX: number;
  mouseY: number;
  reducedMotion: boolean;
}) {
  const x = reducedMotion ? 0 : mouseX * depth * 12;
  const y = reducedMotion ? 0 : mouseY * depth * 12;

  return (
    <motion.div
      className={`absolute rounded-2xl border border-[#E6EAF2] bg-white/90 backdrop-blur-sm shadow-[0_8px_30px_rgba(16,40,90,0.08)] ${className}`}
      animate={{ x, y }}
      transition={{ type: "spring", stiffness: 150, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Animated Route SVG ─── */
function AnimatedRoute({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg
      viewBox="0 0 300 200"
      className="absolute inset-0 w-full h-full opacity-20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1D6BFF" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#16C784" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#1D6BFF" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {/* Stylized route path */}
      <motion.path
        d="M 20 180 Q 60 140, 90 120 T 150 100 T 210 70 T 280 30"
        fill="none"
        stroke="url(#routeGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: reducedMotion ? 1 : 1 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 2.5, ease: "easeInOut" }}
      />
      {/* Station pins along route */}
      {[
        { cx: 90, cy: 120, delay: 0.8 },
        { cx: 150, cy: 100, delay: 1.4 },
        { cx: 210, cy: 70, delay: 2.0 },
      ].map((pin, i) => (
        <motion.circle
          key={i}
          cx={pin.cx}
          cy={pin.cy}
          r="5"
          fill="#1D6BFF"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { delay: pin.delay, duration: 0.4, type: "spring" }
          }
        />
      ))}
    </svg>
  );
}

/* ─── Pulsing Live Dot ─── */
function LiveDot() {
  return (
    <span className="relative flex size-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16C784] opacity-75" />
      <span className="relative inline-flex size-2.5 rounded-full bg-[#16C784]" />
    </span>
  );
}

/* ─── Main Hero ─── */
export function LandingHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const reducedMotion = useReducedMotion() ?? false;

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (reducedMotion) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      setMousePos({ x, y });
    },
    [reducedMotion]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouseMove);
    return () => el.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  /* Staggered word animation */
  const headlineWords = ["Find", "a", "charger"];
  const containerVariants: any = {
    hidden: {},
    show: {
      transition: { staggerChildren: reducedMotion ? 0 : 0.08 },
    },
  };
  const wordVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden bg-white py-20 sm:py-28 lg:py-32"
    >
      {/* Background: soft gradient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-[#1D6BFF]/6 to-[#4F8CFF]/4 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[#16C784]/5 to-transparent blur-3xl" />
        {/* Dotted grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, #1D6BFF 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-12">
          {/* ── Left Column: Copy & CTAs ── */}
          <div className="lg:col-span-6 space-y-8 text-left">
            {/* Live badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 rounded-full border border-[#E6EAF2] bg-white px-4 py-2 text-xs font-medium text-[#4A5568] shadow-[0_2px_8px_rgba(16,40,90,0.04)]"
            >
              <LiveDot />
              <span>Live Telemetry Across Maharashtra & NCR</span>
              <span className="rounded-md bg-gradient-to-r from-[#1D6BFF]/10 to-[#4F8CFF]/10 px-2 py-0.5 font-semibold text-[#1D6BFF]">
                OCPP 1.6J
              </span>
            </motion.div>

            {/* Headline with staggered reveal + shimmer */}
            <motion.h1
              className="font-heading text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-extrabold tracking-[-0.02em] text-[#0B1220] leading-[1.08]"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {headlineWords.map((word, i) => (
                <motion.span key={i} variants={wordVariants} className="inline-block mr-[0.3em]">
                  {word}
                </motion.span>
              ))}
              <br />
              <motion.span variants={wordVariants} className="inline-block">
                <ShimmerText>without the wait</ShimmerText>
                <span className="text-[#1D6BFF]">.</span>
              </motion.span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="max-w-xl text-lg sm:text-xl text-[#4A5568] leading-relaxed"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              No more phantom availability or highway queue surprises. EVspark blends live
              hardware telemetry, queue depth, and machine learning to predict wait times
              before you start driving.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
            >
              <Link href="/register">
                <Button className="h-12 rounded-xl bg-gradient-to-r from-[#1D6BFF] to-[#4F8CFF] px-7 text-base font-semibold text-white shadow-md shadow-[#1D6BFF]/20 hover:shadow-lg hover:shadow-[#1D6BFF]/30 hover:-translate-y-0.5 transition-all duration-200">
                  Find chargers
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  variant="outline"
                  className="h-12 rounded-xl border-[#E6EAF2] bg-white px-7 text-base font-semibold text-[#0B1220] hover:bg-[#F7F9FC] hover:border-[#1D6BFF]/30 transition-all duration-200"
                >
                  See how it works
                </Button>
              </a>
            </motion.div>

            {/* Proof points / Stats with count-up feel */}
            <motion.div
              className="grid grid-cols-3 gap-6 pt-8 border-t border-[#E6EAF2]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <div>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-[#0B1220]">0 min</p>
                <p className="text-xs text-[#8A94A6] mt-1">Guaranteed hold slots</p>
              </div>
              <div>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-[#16C784]">
                  &plusmn;1.4 min
                </p>
                <p className="text-xs text-[#8A94A6] mt-1">ML forecast precision</p>
              </div>
              <div>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-[#0B1220]">100%</p>
                <p className="text-xs text-[#8A94A6] mt-1">Indian EV interoperability</p>
              </div>
            </motion.div>
          </div>

          {/* ── Right Column: 3D Parallax Interactive Showcase ── */}
          <div className="lg:col-span-6 relative">
            <motion.div
              className="relative mx-auto w-full max-w-lg"
              style={{ perspective: "1200px" }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            >
              {/* Central dashboard card with 3D tilt */}
              <motion.div
                className="relative rounded-3xl border border-[#E6EAF2] bg-white p-6 shadow-[0_20px_60px_rgba(16,40,90,0.08)] ring-1 ring-black/[0.03]"
                animate={
                  reducedMotion
                    ? {}
                    : {
                        rotateY: mousePos.x * 4,
                        rotateX: -mousePos.y * 4,
                      }
                }
                transition={{ type: "spring", stiffness: 100, damping: 25 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Route SVG background */}
                <AnimatedRoute reducedMotion={reducedMotion} />

                {/* Header */}
                <div className="relative flex items-center justify-between border-b border-[#E6EAF2] pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#1D6BFF] to-[#4F8CFF] text-white shadow-sm">
                      <MapPin size={16} weight="fill" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#0B1220]">
                        Pune &ndash; Mumbai Expressway
                      </p>
                      <p className="text-[11px] text-[#8A94A6]">Live corridor status</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-[#16C784]/10 px-2.5 py-1 text-[10px] font-semibold text-[#16C784]">
                    <Pulse size={12} weight="bold" />
                    Live
                  </span>
                </div>

                {/* Station list */}
                <div className="relative mt-5 space-y-3">
                  {/* Station 1: Available */}
                  <motion.div
                    className="rounded-xl border border-[#E6EAF2] bg-[#F7F9FC] p-4 transition-colors hover:border-[#1D6BFF]/30"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-[#0B1220]">
                          Hinjewadi Fast Charging Hub
                        </h4>
                        <p className="text-xs text-[#8A94A6]">Phase 2, Pune &bull; 60 kW CCS-2</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#16C784]/10 px-2.5 py-1 text-xs font-medium text-[#16C784]">
                        <CheckCircle size={12} weight="fill" />
                        Free now
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="font-mono text-[#16C784] font-medium">0 min wait</span>
                      <span className="text-[#8A94A6]">2 of 4 bays free</span>
                      <span className="font-mono text-[#0B1220] font-medium">&#8377;16.50/kWh</span>
                    </div>
                  </motion.div>

                  {/* Station 2: AI Recommended */}
                  <motion.div
                    className="rounded-xl border-2 border-[#1D6BFF]/40 bg-white p-4 shadow-[0_4px_20px_rgba(29,107,255,0.08)]"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.75, duration: 0.5 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-lg bg-gradient-to-br from-[#1D6BFF] to-[#4F8CFF] text-white text-[10px] font-bold shadow-sm">
                          AI
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-[#0B1220]">
                            Expressway Khalapur Oasis
                          </h4>
                          <p className="text-xs text-[#8A94A6]">
                            KM 38, Khalapur &bull; 120 kW Dual Gun
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F5A524]/10 px-2.5 py-1 text-xs font-medium text-[#B06000]">
                        <Clock size={12} weight="bold" />
                        3 min wait
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="font-medium text-[#1D6BFF]">
                        Best Arrival Match (ETA 28 min)
                      </span>
                      <span className="font-mono text-[#0B1220] font-medium">&#8377;17.00/kWh</span>
                    </div>
                    {/* Bay availability bars with fill animation */}
                    <div className="mt-3 flex gap-1.5">
                      <motion.div
                        className="h-1.5 flex-1 rounded-full bg-[#16C784]"
                        title="Bay 1 Free"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 1.0, duration: 0.4 }}
                        style={{ transformOrigin: "left" }}
                      />
                      <motion.div
                        className="h-1.5 flex-1 rounded-full bg-[#F5A524]"
                        title="Bay 2 Busy (82% SoC)"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 1.1, duration: 0.4 }}
                        style={{ transformOrigin: "left" }}
                      />
                      <motion.div
                        className="h-1.5 flex-1 rounded-full bg-[#16C784]"
                        title="Bay 3 Free"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 1.2, duration: 0.4 }}
                        style={{ transformOrigin: "left" }}
                      />
                    </div>
                  </motion.div>

                  {/* Station 3: Busy */}
                  <motion.div
                    className="rounded-xl border border-[#E6EAF2] bg-[#F7F9FC] p-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-[#0B1220]">
                          Bandra Kurla Complex (BKC)
                        </h4>
                        <p className="text-xs text-[#8A94A6]">G Block, Mumbai &bull; 50 kW CCS-2</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EF4444]/10 px-2.5 py-1 text-xs font-medium text-[#EF4444]">
                        14 min wait
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-[#8A94A6]">Queue: 2 cars waiting</span>
                      <span className="font-mono text-[#0B1220] font-medium">&#8377;18.00/kWh</span>
                    </div>
                  </motion.div>
                </div>

                {/* Bottom live indicator */}
                <div className="mt-5 flex items-center justify-between rounded-xl bg-[#F7F9FC] px-4 py-2.5 text-[11px] text-[#8A94A6]">
                  <span className="flex items-center gap-2">
                    <Lightning size={14} weight="fill" className="text-[#1D6BFF]" />
                    Telemetry updating every 5s
                  </span>
                  <Link
                    href="/driver"
                    className="font-medium text-[#1D6BFF] hover:underline transition"
                  >
                    Open driver map &rarr;
                  </Link>
                </div>
              </motion.div>

              {/* ── Floating Glass Cards (different depth layers) ── */}
              <FloatingCard
                className="top-4 -left-16 px-4 py-3 z-10 hidden lg:block"
                depth={1.5}
                mouseX={mousePos.x}
                mouseY={mousePos.y}
                reducedMotion={reducedMotion}
              >
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-gradient-to-br from-[#16C784]/20 to-[#16C784]/5 grid place-items-center">
                    <CheckCircle size={16} weight="fill" className="text-[#16C784]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0B1220]">Hinjewadi Hub</p>
                    <p className="text-[10px] text-[#16C784] font-medium">0 min wait</p>
                  </div>
                </div>
              </FloatingCard>

              <FloatingCard
                className="top-20 -right-12 px-4 py-3 z-10 hidden lg:block"
                depth={0.8}
                mouseX={mousePos.x}
                mouseY={mousePos.y}
                reducedMotion={reducedMotion}
              >
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-gradient-to-br from-[#1D6BFF]/15 to-[#4F8CFF]/5 grid place-items-center">
                    <Lightning size={16} weight="fill" className="text-[#1D6BFF]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0B1220]">AI Match</p>
                    <p className="text-[10px] text-[#1D6BFF] font-medium">ETA 28 min</p>
                  </div>
                </div>
              </FloatingCard>

              <FloatingCard
                className="bottom-16 -left-10 px-4 py-3 z-10 hidden lg:block"
                depth={1.2}
                mouseX={mousePos.x}
                mouseY={mousePos.y}
                reducedMotion={reducedMotion}
              >
                <div className="flex items-center gap-2">
                  <LiveDot />
                  <p className="text-xs font-medium text-[#0B1220]">Telemetry live</p>
                </div>
              </FloatingCard>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Shimmer keyframe */}
      <style jsx global>{`
        @keyframes shimmer {
          0%,
          100% {
            background-position: -200% center;
          }
          50% {
            background-position: 200% center;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[shimmer_3s_ease-in-out_infinite\\] {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
