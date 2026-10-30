'use client';

import React, { useState } from 'react';
import { Scales, X, Check } from '@phosphor-icons/react';
import { useDriverMap } from '../store';
import type { Station } from '../types';

type Props = {
  stations: Station[];
};

export function CompareTray({ stations }: Props) {
  const { compare, toggleCompare } = useDriverMap();
  const [modalOpen, setModalOpen] = useState(false);

  if (compare.length === 0) return null;

  const compareStations = stations.filter((s) => compare.includes(s.id));

  return (
    <>
      {/* Floating Pill Tray */}
      <div
        role="region"
        aria-label="Station comparison tray"
        className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-ev-line bg-ev-card px-3 py-1.5 shadow-ev animate-in fade-in slide-in-from-bottom-2 select-none"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ev-accentSoft text-ev-accent">
          <Scales size={16} weight="bold" />
        </span>

        {/* Selected mini chips */}
        <div className="flex items-center gap-1.5">
          {compareStations.map((station) => (
            <div
              key={station.id}
              className="flex items-center gap-1.5 rounded-full bg-ev-cardSoft border border-ev-line px-2.5 py-1 text-xs font-medium text-ev-ink"
            >
              <span className="truncate max-w-[90px]">{station.name}</span>
              <button
                type="button"
                aria-label={`Remove ${station.name} from comparison`}
                onClick={() => toggleCompare(station.id)}
                className="p-0.5 text-ev-ink3 hover:text-ev-ink"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Compare action button */}
        <button
          type="button"
          disabled={compare.length < 2}
          onClick={() => setModalOpen(true)}
          className={`ml-1 inline-flex h-8 items-center rounded-full px-3.5 text-xs font-semibold shadow-pin transition-all ${
            compare.length >= 2
              ? 'bg-ev-accent text-white hover:bg-ev-accentDeep active:scale-95'
              : 'bg-ev-cardSoft text-ev-ink3 cursor-not-allowed border border-ev-line'
          }`}
        >
          Compare ({compare.length}/3)
        </button>
      </div>

      {/* Comparison Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ev-ink/40 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div className="relative w-full max-w-[720px] rounded-[20px] border border-ev-line bg-ev-card p-6 shadow-ev">
            <div className="flex items-center justify-between pb-4 border-b border-ev-line">
              <h3 className="text-base font-semibold text-ev-ink">
                Compare charging hubs
              </h3>
              <button
                type="button"
                aria-label="Close comparison modal"
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ev-ink2 hover:bg-ev-cardSoft hover:text-ev-ink"
              >
                <X size={16} />
              </button>
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs text-ev-ink">
                <thead>
                  <tr className="border-b border-ev-line">
                    <th className="py-2.5 font-semibold text-ev-ink3 w-32">Metric</th>
                    {compareStations.map((s) => (
                      <th key={s.id} className="py-2.5 font-semibold text-ev-ink px-2">
                        {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ev-line/60">
                  <tr>
                    <td className="py-2 text-ev-ink2">Distance</td>
                    {compareStations.map((s) => (
                      <td key={s.id} className="py-2 font-mono px-2">
                        {s.distanceKm?.toFixed(1) ?? '-'} km
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-ev-ink2">Wait time</td>
                    {compareStations.map((s) => (
                      <td key={s.id} className="py-2 font-mono px-2">
                        {s.freeChargers > 0 ? (
                          <span className="text-ev-free font-semibold flex items-center gap-1">
                            <Check size={13} weight="bold" /> No wait
                          </span>
                        ) : (
                          `~${s.waitMin ?? 5} min`
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-ev-ink2">Price / kWh</td>
                    {compareStations.map((s) => (
                      <td key={s.id} className="py-2 font-mono px-2">
                        ₹{s.minPrice}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-ev-ink2">Max power</td>
                    {compareStations.map((s) => (
                      <td key={s.id} className="py-2 font-mono px-2">
                        {s.maxPowerKw} kW
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-ev-ink2">Connectors</td>
                    {compareStations.map((s) => (
                      <td key={s.id} className="py-2 px-2 text-ev-ink2">
                        {(s.connectors ?? []).join(', ') || 'CCS2'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

