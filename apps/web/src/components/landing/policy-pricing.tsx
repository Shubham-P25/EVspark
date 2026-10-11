import { CurrencyInr, ShieldCheck, FileText, CheckCircle } from "@phosphor-icons/react/dist/ssr";

export function PolicyPricingSection() {
  return (
    <section id="policies" className="border-b border-[#DADCE0] bg-[#F8F9FA] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <span className="rounded-full bg-[#E8F0FE] px-3.5 py-1 text-xs font-semibold text-[#1A73E8]">
            Transparency & Governance
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#202124]">
            Fair Indian pricing & policy alignment
          </h2>
          <p className="text-base sm:text-lg text-[#5F6368]">
            Clear per-kWh billing compliant with Ministry of Power (MoP) guidelines and the national PM e-DRIVE scheme.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pricing Model */}
          <div className="rounded-2xl border border-[#DADCE0] bg-white p-8 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[#E6F4EA] text-[#1E8E3E]">
                <CurrencyInr size={24} weight="bold" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[#202124]">
                  Transparent Per-kWh Tariffs
                </h3>
                <p className="text-xs text-[#5F6368]">No surge multipliers, no opaque booking fees</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-[#F8F9FA] p-4 border border-[#DADCE0]">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-sm text-[#202124]">Standard AC Charging (7.4–22 kW)</span>
                  <span className="font-mono text-xl font-bold text-[#202124]">&#8377;12 &ndash; &#8377;14 <span className="text-xs font-normal text-[#5F6368]">/ kWh</span></span>
                </div>
                <p className="mt-1 text-xs text-[#5F6368]">Ideal for workplace and overnight destination charging.</p>
              </div>

              <div className="rounded-xl bg-[#F8F9FA] p-4 border border-[#DADCE0]">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-sm text-[#202124]">Highway Fast DC (50–120 kW)</span>
                  <span className="font-mono text-xl font-bold text-[#1A73E8]">&#8377;16 &ndash; &#8377;18 <span className="text-xs font-normal text-[#5F6368]">/ kWh</span></span>
                </div>
                <p className="mt-1 text-xs text-[#5F6368]">High-speed expressway corridor charging with 15-min hold slots.</p>
              </div>

              <div className="pt-2 text-xs text-[#5F6368] space-y-1">
                <p>&check; Prices include 18% GST with downloadable tax invoices.</p>
                <p>&check; 15-minute slot reservations hold the bay without penalties for reasonable highway delays.</p>
              </div>
            </div>
          </div>

          {/* Policy Context */}
          <div className="rounded-2xl border border-[#DADCE0] bg-white p-8 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-[#E8F0FE] text-[#1A73E8]">
                <ShieldCheck size={24} weight="bold" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[#202124]">
                  National EV Framework Alignment
                </h3>
                <p className="text-xs text-[#5F6368]">Built for public compliance across Indian States</p>
              </div>
            </div>

            <div className="mt-6 space-y-4 text-sm text-[#5F6368]">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} weight="fill" className="text-[#1E8E3E] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#202124]">PM e-DRIVE Scheme Readiness:</strong>
                  <p className="text-xs mt-0.5">
                    Supporting interoperable public charging stations under the flagship PM Electric Drive Revolution in Innovative Vehicle Enhancement initiative.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle size={18} weight="fill" className="text-[#1E8E3E] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#202124]">Open Access & DISCOM Tariff Compliance:</strong>
                  <p className="text-xs mt-0.5">
                    Aligns with Ministry of Power revised guidelines allowing de-licensed EV charging infrastructure and green energy open access tariff structures.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle size={18} weight="fill" className="text-[#1E8E3E] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#202124]">State EV Policy Incentives:</strong>
                  <p className="text-xs mt-0.5">
                    Designed for Maharashtra, Delhi, Karnataka, and Tamil Nadu station operator capital subsidies and electricity duty exemptions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
