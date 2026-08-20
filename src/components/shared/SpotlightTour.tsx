/**
 * src/components/shared/SpotlightTour.tsx
 * 
 * Shared Industrial Guided Tour Spotlight Overlay Component
 * Provides 60% dim backdrop, cutout ring highlight around target elements, SVG pointer arrow,
 * glass card modal, auto-scrolling, and Next/Back/Skip controls.
 */

import React, { useState, useEffect, useRef } from 'react';
import { TourStepSpec } from '../../engine/types';
import { Sparkles, ArrowRight, ArrowLeft, X, CheckCircle2 } from 'lucide-react';

export interface SpotlightTourProps {
  steps: TourStepSpec[];
  isOpen: boolean;
  onClose: () => void;
  onStepChange?: (stepIndex: number, step: TourStepSpec) => void;
}

export const SpotlightTour: React.FC<SpotlightTourProps> = ({
  steps,
  isOpen,
  onClose,
  onStepChange,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const lastExecutedIndexRef = useRef<number | null>(null);

  // Reset step index when tour opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      lastExecutedIndexRef.current = null;
    } else {
      setTargetRect(null);
      lastExecutedIndexRef.current = null;
    }
  }, [isOpen]);

  const currentStep = steps && steps.length > 0 ? steps[currentStepIndex] : null;

  // Execute preset action ONLY ONCE per step index transition
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    if (lastExecutedIndexRef.current !== currentStepIndex) {
      lastExecutedIndexRef.current = currentStepIndex;

      if (currentStep.presetAction) {
        currentStep.presetAction();
      }

      if (onStepChange) {
        onStepChange(currentStepIndex, currentStep);
      }
    }
  }, [isOpen, currentStepIndex, currentStep?.id]);

  // Update target element highlight box on scroll/resize
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    const updateRect = () => {
      const rawId = currentStep.targetId || '';
      const cleanId = rawId.replace(/^#/, '');
      const el = document.getElementById(cleanId) || document.querySelector(rawId.startsWith('#') ? rawId : `#${rawId}`);

      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    // Scroll target into view
    const rawId = currentStep.targetId || '';
    const cleanId = rawId.replace(/^#/, '');
    const targetEl = document.getElementById(cleanId) || document.querySelector(rawId.startsWith('#') ? rawId : `#${rawId}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    updateRect();
    const timeout = setTimeout(updateRect, 300);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [isOpen, currentStepIndex, currentStep?.targetId]);

  if (!isOpen || !currentStep) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto select-none overflow-hidden">
      {/* 60% DIM BACKDROP WITH SPOTLIGHT CUTOUT */}
      <div className="absolute inset-0 bg-slate-950/60 transition-all duration-300 backdrop-blur-[2px]" />

      {/* TARGET SPOTLIGHT CUTOUT RING */}
      {targetRect && (
        <div
          className="absolute border-2 border-cyan-400 rounded-2xl ring-4 ring-cyan-400/40 animate-pulse transition-all duration-300 pointer-events-none shadow-[0_0_30px_rgba(6,182,212,0.6)]"
          style={{
            top: Math.max(10, targetRect.top - 8),
            left: Math.max(10, targetRect.left - 8),
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* TUTORIAL MODAL GLASS CARD */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-xl bg-[#0d131f]/95 border border-cyan-400/60 rounded-2xl p-5 shadow-[0_0_40px_rgba(6,182,212,0.3)] backdrop-blur-md flex flex-col gap-3 font-sans">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            </span>
            <span className="font-mono text-xs text-cyan-300 font-bold">
              STEP {currentStepIndex + 1} OF {steps.length}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP TITLE & DESCRIPTION */}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-base font-extrabold text-white">{currentStep.title}</h3>
          <p className="text-xs text-slate-300 leading-relaxed">{currentStep.description}</p>
        </div>

        {/* TEACHING POINT BADGE */}
        <div className="bg-[#070a10] p-2.5 rounded-xl border border-cyan-500/30 flex items-start gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span className="text-cyan-200 font-mono text-[11px] leading-snug">
            <strong>Key Concept:</strong> {currentStep.teachingPoint}
          </span>
        </div>

        {/* FOOTER NAVIGATION BUTTONS */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={onClose}
            className="text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Skip Tutorial
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => setCurrentStepIndex((prev) => prev - 1)}
                className="px-3 py-1.5 rounded-xl border border-[#30363d] bg-[#0d1117] text-slate-300 hover:text-white hover:border-[#58a6ff] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}

            <button
              onClick={() => {
                if (isLast) {
                  onClose();
                } else {
                  setCurrentStepIndex((prev) => prev + 1);
                }
              }}
              className="px-4 py-1.5 rounded-xl bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-[0_0_12px_rgba(6,182,212,0.5)] hover:bg-cyan-300 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>{isLast ? 'Finish Tour 🎉' : 'Next Step'}</span>
              {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
