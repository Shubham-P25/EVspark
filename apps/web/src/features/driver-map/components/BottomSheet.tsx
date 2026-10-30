'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useDriverMap } from '../store';

type Props = {
  children: React.ReactNode;
};

const SNAP_HEIGHTS = {
  peek: 140,
  half: '50dvh',
  full: '90dvh',
};

export function BottomSheet({ children }: Props) {
  const { sheetSnap, setSheetSnap } = useDriverMap();
  const y = useMotionValue(0);

  const handleDragEnd = (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
    const { offset, velocity } = info;
    if (offset.y > 80 || velocity.y > 500) {
      if (sheetSnap === 'full') setSheetSnap('half');
      else if (sheetSnap === 'half') setSheetSnap('peek');
    } else if (offset.y < -80 || velocity.y < -500) {
      if (sheetSnap === 'peek') setSheetSnap('half');
      else if (sheetSnap === 'half') setSheetSnap('full');
    }
  };

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{
        height: SNAP_HEIGHTS[sheetSnap],
        y,
      }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="lg:hidden fixed bottom-14 left-0 right-0 z-30 flex flex-col rounded-t-[24px] border-t border-ev-line bg-ev-card shadow-ev overflow-hidden"
    >
      {/* Drag handle */}
      <div className="flex h-6 w-full shrink-0 items-center justify-center cursor-grab active:cursor-grabbing">
        <div className="h-1 w-10 rounded-full bg-ev-ink3/40" />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto pb-4">
        {children}
      </div>
    </motion.div>
  );
}

