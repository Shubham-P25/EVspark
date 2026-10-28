import Link from "next/link";
import { Lightning } from "@phosphor-icons/react/dist/ssr";

export function LandingFooter() {
  return (
    <footer className="bg-white py-16 text-sm text-[#4A5568]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-12 border-b border-[#E6EAF2]">
          {/* Brand Col */}
          <div className="col-span-2 space-y-5">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-bold text-lg text-[#0B1220]"
            >
              <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#1D6BFF] to-[#4F8CFF] text-white shadow-sm">
                <Lightning size={18} weight="fill" />
              </div>
              <span className="font-heading">EVspark</span>
              <span className="rounded-md bg-[#1D6BFF]/8 px-2 py-0.5 text-[10px] font-semibold text-[#1D6BFF]">
                India
              </span>
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-[#4A5568]">
              India&apos;s predictive EV charging network. Real-time OCPP hardware telemetry,
              sub-minute wait time forecasts, and guaranteed slot reservations.
            </p>
            <p className="text-xs text-[#8A94A6]">
              Aligned with Ministry of Power (MoP) &amp; PM e-DRIVE initiatives.
            </p>
          </div>

          {/* Links: Platform */}
          <div className="space-y-4">
            <p className="font-heading font-semibold text-xs text-[#0B1220] uppercase tracking-wider">
              Platform
            </p>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/driver" className="hover:text-[#1D6BFF] transition-colors">
                  Driver Map
                </Link>
              </li>
              <li>
                <Link href="/station" className="hover:text-[#1D6BFF] transition-colors">
                  Operator Console
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-[#1D6BFF] transition-colors">
                  Admin Control Room
                </Link>
              </li>
            </ul>
          </div>

          {/* Links: Solutions */}
          <div className="space-y-4">
            <p className="font-heading font-semibold text-xs text-[#0B1220] uppercase tracking-wider">
              Features
            </p>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#predictions" className="hover:text-[#1D6BFF] transition-colors">
                  AI Wait Forecast
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#1D6BFF] transition-colors">
                  Along-Route Planning
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#1D6BFF] transition-colors">
                  Guaranteed Slots
                </a>
              </li>
              <li>
                <a href="#policies" className="hover:text-[#1D6BFF] transition-colors">
                  Tariff Calculator
                </a>
              </li>
            </ul>
          </div>

          {/* Links: Company & Compliance */}
          <div className="space-y-4">
            <p className="font-heading font-semibold text-xs text-[#0B1220] uppercase tracking-wider">
              Compliance
            </p>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a href="#policies" className="hover:text-[#1D6BFF] transition-colors">
                  PM e-DRIVE Alignment
                </a>
              </li>
              <li>
                <a href="#policies" className="hover:text-[#1D6BFF] transition-colors">
                  FAME II Guidelines
                </a>
              </li>
              <li>
                <span className="text-[#8A94A6]">OCPP 1.6J Certified</span>
              </li>
              <li>
                <span className="text-[#8A94A6]">18% GST Invoicing</span>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-[#1D6BFF] hover:underline font-medium"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8A94A6]">
          <p>&copy; {new Date().getFullYear()} EVspark Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-[#0B1220] underline transition-colors">
              Privacy
            </Link>
            <span>Light-only theme &bull; Google Maps standard</span>
            <span className="rounded-md bg-[#16C784]/10 px-2 py-0.5 text-[10px] font-semibold text-[#16C784]">
              Simulated Twin Engine Active
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
