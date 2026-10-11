"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { motion, useDragControls } from "motion/react";
import { ArrowCounterClockwise, DotsSixVertical, X } from "@phosphor-icons/react";

/** Desktop: draggable inside boundsRef. Mobile (<768px): handled via Drawer in station-card.tsx */
export function DraggableCard({
  boundsRef,
  onClose,
  children,
}: {
  boundsRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const controls = useDragControls();
  const [key, setKey] = useState(0); // remount = reset position
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      key={key}
      ref={ref}
      drag
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={boundsRef}
      className="absolute right-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
    >
      <div
        className="flex cursor-grab touch-none items-center justify-between border-b border-[#DADCE0] px-3 py-1.5 active:cursor-grabbing bg-white select-none"
        onPointerDown={(e) => controls.start(e)}
      >
        <DotsSixVertical size={20} className="text-[#5F6368]" aria-hidden />
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Reset position"
            aria-label="Reset card position"
            className="rounded-full p-1.5 hover:bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124] transition cursor-pointer"
            onClick={() => setKey((k) => k + 1)}
          >
            <ArrowCounterClockwise size={18} />
          </button>
          <button
            type="button"
            title="Close"
            aria-label="Close"
            className="rounded-full p-1.5 hover:bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124] transition cursor-pointer"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto">{children}</div>
    </motion.div>
  );
}
