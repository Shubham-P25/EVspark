"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  valueDisplay?: string | number;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}

export function Slider({
  label,
  valueDisplay,
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  className,
  ...props
}: SliderProps) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className={cn("w-full space-y-2", className)}>
      {(label || valueDisplay !== undefined) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-gray-300">{label}</span>}
          {valueDisplay !== undefined && (
            <span className="font-mono font-semibold text-emerald-400">{valueDisplay}</span>
          )}
        </div>
      )}
      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-emerald-500 focus:outline-none"
          style={{
            background: `linear-gradient(to right, #10B981 ${percentage}%, #1E293B ${percentage}%)`,
          }}
          {...props}
        />
      </div>
    </div>
  );
}
