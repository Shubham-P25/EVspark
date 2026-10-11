import { Brain, Cpu, Compass, ChartBar } from "@phosphor-icons/react/dist/ssr";

export function ForecastingSection() {
  return (
    <section id="predictions" className="border-b border-[#DADCE0] bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <span className="rounded-full bg-[#E8F0FE] px-3.5 py-1 text-xs font-semibold text-[#1A73E8]">
            Machine Learning Engine
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#202124]">
            How EVspark predicts queue wait times before you arrive
          </h2>
          <p className="text-base sm:text-lg text-[#5F6368]">
            Simple availability indicators fail on highway journeys. Our blended algorithm estimates exactly what bay will be free when your wheels arrive.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Formula & Explanation */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-[#DADCE0] bg-[#F8F9FA] p-6 sm:p-8 space-y-6">
              <h3 className="font-semibold text-lg text-[#202124]">
                The Blended Wait Formula
              </h3>
              <div className="rounded-xl border border-[#DADCE0] bg-white p-4 font-mono text-sm text-[#202124] shadow-xs">
                <span className="text-[#1A73E8] font-bold">Wait(arrival)</span> ={" "}
                <span className="text-[#1E8E3E]">0.40 &times; HardwareQueue(t)</span> +{" "}
                <span className="text-[#B06000]">0.60 &times; ML_Forecast(hour, weekday, dist)</span>
              </div>

              <div className="space-y-4 text-sm text-[#5F6368]">
                <div className="flex items-start gap-3">
                  <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#E6F4EA] text-[#1E8E3E]">
                    <Cpu size={18} weight="bold" />
                  </div>
                  <div>
                    <strong className="text-[#202124]">1. Hardware Telemetry & Geofence (40%):</strong>
                    <p className="mt-0.5">
                      Monitors active MeterValues, remaining battery kW taper, plus 200m GPS geofence pings for cars entering the station parking lot.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#FEF7E0] text-[#B06000]">
                    <Brain size={18} weight="bold" />
                  </div>
                  <div>
                    <strong className="text-[#202124]">2. HistGradientBoostingRegressor (60%):</strong>
                    <p className="mt-0.5">
                      Trained on historical demand patterns, weekend highway migration surges (e.g. Friday evening Lonavala rush), and vehicle battery curves.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#E8F0FE] text-[#1A73E8]">
                    <Compass size={18} weight="bold" />
                  </div>
                  <div>
                    <strong className="text-[#202124]">3. Dynamic Clamping:</strong>
                    <p className="mt-0.5">
                      If 2 or more chargers are currently FREE, hardware wait immediately clamps to 0 minutes, avoiding false queue alerts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Model Metrics Benchmarks */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-[#DADCE0] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#DADCE0] pb-3">
                <span className="text-xs font-semibold uppercase text-[#5F6368] tracking-wider">
                  Model Evaluation Metrics
                </span>
                <span className="rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-semibold text-[#1E8E3E]">
                  Verified
                </span>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5F6368]">Mean Absolute Error (MAE)</span>
                    <span className="font-mono font-bold text-[#1E8E3E]">0.22 minutes</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-[#E8EAED]">
                    <div className="h-full rounded-full bg-[#1E8E3E] w-[95%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5F6368]">R&sup2; Correlation Score</span>
                    <span className="font-mono font-bold text-[#1A73E8]">0.989</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-[#E8EAED]">
                    <div className="h-full rounded-full bg-[#1A73E8] w-[98%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5F6368]">Mean Absolute % Error (MAPE)</span>
                    <span className="font-mono font-bold text-[#202124]">9.47%</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-[#E8EAED]">
                    <div className="h-full rounded-full bg-[#1A73E8] w-[91%]" />
                  </div>
                </div>

                <div className="rounded-lg bg-[#F8F9FA] p-3 text-xs text-[#5F6368]">
                  <p className="font-medium text-[#202124]">Heuristic Fallback Safety:</p>
                  <p className="mt-0.5">
                    If the ML inference container goes offline or times out (&gt;200ms), system seamlessly defaults to deterministic queue math without erroring.
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
