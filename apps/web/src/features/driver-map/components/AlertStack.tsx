'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightning,
  MapPin,
  Clock,
  WarningCircle,
  Heart,
  X,
} from '@phosphor-icons/react';
import { useDriverMap } from '../store';
import type { AlertItem } from '../types';

type Props = {
  alerts: AlertItem[];
};

export function AlertStack({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const selectStation = useDriverMap((s) => s.select);

  const activeAlerts = alerts
    .filter((a) => !dismissed.has(a.id))
    .slice(0, 3);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const getAlertConfig = (type: AlertItem['type']) => {
    switch (type) {
      case 'charger_freed':
        return { icon: Lightning, bg: 'bg-ev-freeSoft text-ev-free' };
      case 'geofence':
        return { icon: MapPin, bg: 'bg-ev-skySoft text-ev-sky' };
      case 'wait_increased':
        return { icon: Clock, bg: 'bg-ev-busySoft text-[#a86a00]' };
      case 'favourite_free':
        return { icon: Heart, bg: 'bg-ev-accentSoft text-ev-accent' };
      default:
        return { icon: WarningCircle, bg: 'bg-ev-cardSoft text-ev-ink3' };
    }
  };

  return (
    <aside
      aria-label="Live charging notifications"
      aria-live="polite"
      className="fixed bottom-4 right-3 z-50 flex w-[320px] flex-col gap-2 pointer-events-none select-none"
    >
      <AnimatePresence>
        {activeAlerts.map((alert) => {
          const { icon: Icon, bg } = getAlertConfig(alert.type);
          return (
            <motion.div
              key={alert.id}
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
              className="pointer-events-auto flex items-start gap-3 rounded-card border border-ev-line bg-ev-card p-3 shadow-ev"
            >
              {/* 36px Icon circle */}
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}
              >
                <Icon size={18} weight="fill" />
              </div>

              {/* Text zone */}
              <div className="flex flex-1 flex-col justify-center min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ev-ink truncate">
                    {alert.title}
                  </span>
                  <button
                    type="button"
                    aria-label="Dismiss alert"
                    onClick={() => handleDismiss(alert.id)}
                    className="p-1 text-ev-ink3 hover:text-ev-ink"
                  >
                    <X size={12} />
                  </button>
                </div>
                <p className="text-[11px] text-ev-ink2 leading-tight mt-0.5 line-clamp-2">
                  {alert.body}
                </p>

                {/* Action button */}
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-ev-ink3">
                    {new Date(alert.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => selectStation(alert.stationId)}
                    className="text-xs font-semibold text-ev-accent hover:underline"
                  >
                    View
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </aside>
  );
}

