"use client";

import React from "react";
import { Check } from "@phosphor-icons/react";

interface Step {
  id: string;
  title: string;
}

interface StepperProps {
  steps: Step[];
  currentStepIndex: number;
}

export function Stepper({ steps, currentStepIndex }: StepperProps) {
  const currentStep = steps[currentStepIndex] || steps[0];

  return (
    <div className="w-full mb-8">
      {/* Segmented bar */}
      <div className="flex items-center gap-2 mb-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div key={step.id} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`h-2 w-full rounded-full transition-all duration-300 ${
                  isCompleted
                    ? "bg-[#1E8E3E]"
                    : isCurrent
                    ? "bg-[#1A73E8]"
                    : "bg-[#DADCE0]"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Step Indicators and Title */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1A73E8]">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <h2 className="text-xl font-bold text-[#202124] mt-0.5">{currentStep.title}</h2>
        </div>

        <div className="flex items-center gap-1.5">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div
                key={step.id}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  isCompleted
                    ? "bg-[#1E8E3E] text-white"
                    : isCurrent
                    ? "border-2 border-[#1A73E8] bg-blue-50 text-[#1A73E8]"
                    : "bg-slate-100 text-[#5F6368]"
                }`}
              >
                {isCompleted ? <Check size={14} weight="bold" /> : index + 1}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
