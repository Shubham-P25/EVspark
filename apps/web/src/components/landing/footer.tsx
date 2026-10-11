import Link from "next/link";
import { Lightning } from "@phosphor-icons/react/dist/ssr";

export function LandingFooter() {
  return (
    <footer className="bg-white py-12 text-sm text-[#5F6368]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-[#DADCE0]">
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-[#202124]">
              <div className="grid size-8 place-items-center rounded-lg bg-[#1A73E8] text-white">
                <Lightning size={18} weight="fill" />
              </div>
              <span className="font-heading">EVspark</span>
              <span className="rounded-full bg-[#E8F0FE] px-2 py-0.5 text-[10px] font-semibold text-[#1A73E8]">
                India
              </span>
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-[#5F6368]">
              India&apos;s predictive EV charging network. Real-time OCPP hardware telemetry, sub-minute wait time forecasts, and guaranteed slot reservations.
            </p>
            <p className="text-xs text-[#80868B]">
              Aligned with Ministry of Power (MoP) &amp; PM e-DRIVE initiatives.
            </p>
          </div>

          {/* Links: Platform */}
          <div className="space-y-3">
            <p className="font-semibold text-xs text-[#202124] uppercase tracking-wider">Platform</p>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/driver" className="hover:text-[#202124]">Driver Map</Link>
              </li>
              <li>
                <Link href="/station" className="hover:text-[#202124]">Operator Console</Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-[#202124]">Admin Control Room</Link>
              </li>
              <li>
                <Link href="/classic" className="hover:text-[#202124]">Classic Landing</Link>
              </li>
            </ul>
          </div>

          {/* Links: Solutions */}
          <div className="space-y-3">
            <p className="font-semibold text-xs text-[#202124] uppercase tracking-wider">Features</p>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#predictions" className="hover:text-[#202124]">AI Wait Forecast</a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#202124]">Along-Route Planning</a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#202124]">Guaranteed Slots</a>
              </li>
              <li>
                <a href="#policies" className="hover:text-[#202124]">Tariff Calculator</a>
              </li>
            </ul>
          </div>

          {/* Links: Company & Compliance */}
          <div className="space-y-3">
            <p className="font-semibold text-xs text-[#202124] uppercase tracking-wider">Compliance</p>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#policies" className="hover:text-[#202124]">PM e-DRIVE Alignment</a>
              </li>
              <li>
                <a href="#policies" className="hover:text-[#202124]">FAME II Guidelines</a>
              </li>
              <li>
                <span className="text-[#80868B]">OCPP 1.6J Certified</span>
              </li>
              <li>
                <span className="text-[#80868B]">18% GST Invoicing</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#80868B]">
          <p>&copy; {new Date().getFullYear()} EVspark Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex gap-6">
            <span>Light-only theme &bull; Google Maps standard</span>
            <span className="rounded bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-semibold text-[#1E8E3E]">
              Simulated Twin Engine Active
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
