"use client";

import React, { type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, CircleNotch } from "@phosphor-icons/react";

interface StepShellProps {
  children: ReactNode;
  canBack: boolean;
  canNext: boolean;
  isLastStep?: boolean;
  isSubmitting?: boolean;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
}

export function StepShell({
  children,
  canBack,
  canNext,
  isLastStep = false,
  isSubmitting = false,
  onBack,
  onNext,
  nextLabel,
}: StepShellProps) {
  return (
    <div className="bg-white border border-[#DADCE0] rounded-2xl p-6 sm:p-8 shadow-sm">
      <div className="min-h-[340px]">{children}</div>

      <div className="mt-8 pt-6 border-t border-[#DADCE0] flex items-center justify-between">
        <div>
          {canBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl border border-[#DADCE0] bg-white hover:bg-slate-50 text-[#202124] text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext || isSubmitting}
            className={`h-10 px-6 rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isLastStep
                ? "bg-[#1E8E3E] hover:bg-[#187532] text-white"
                : "bg-[#1A73E8] hover:bg-[#1557b0] text-white"
            }`}
          >
            {isSubmitting && <CircleNotch size={16} className="animate-spin" />}
            {!isSubmitting && isLastStep && <CheckCircle size={18} weight="fill" />}
            <span>
              {isSubmitting
                ? "Saving..."
                : nextLabel || (isLastStep ? "Finish & Go to Dashboard" : "Next")}
            </span>
            {!isSubmitting && !isLastStep && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
