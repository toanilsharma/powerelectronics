import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePowerQuality } from '../context/PowerQualityContext';
import { Sparkles, ArrowRight, ArrowLeft, X, CheckCircle2 } from 'lucide-react';

interface TargetBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface CardPosition {
  top: number;
  left: number;
  placement: 'above' | 'below';
}

/**
 * Task: Glassmorphism Tutorial Card & Dynamic Positioning with Connecting SVG Pointer Line
 */
export const GuidedTourOverlay: React.FC = () => {
  const {
    isTourActive,
    currentTourStep,
    currentTourStepIndex,
    nextTourStep,
    prevTourStep,
    endTour,
  } = usePowerQuality();

  const [targetBounds, setTargetBounds] = useState<TargetBounds | null>(null);
  const [cardPosition, setCardPosition] = useState<CardPosition>({
    top: 100,
    left: 100,
    placement: 'below',
  });

  // Compute Target Element Bounding Box & Dynamic Card Placement
  useEffect(() => {
    if (!isTourActive || !currentTourStep) return;

    const updateBoundsAndPosition = () => {
      const el = document.getElementById(currentTourStep.targetElementId);
      if (el) {
        const rect = el.getBoundingClientRect();
        const absoluteTop = rect.top + window.scrollY;
        const absoluteLeft = rect.left + window.scrollX;

        setTargetBounds({
          top: absoluteTop,
          left: absoluteLeft,
          width: rect.width,
          height: rect.height,
        });

        // Calculate Dynamic Positioning relative to Viewport
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const cardWidth = 420;
        const cardHeight = 240;

        const targetCenterY = rect.top + rect.height / 2;
        const targetCenterX = rect.left + rect.width / 2;

        let placement: 'above' | 'below' = 'below';
        let top = rect.top + rect.height + 20;

        // If target is in lower half of screen, place card ABOVE target element
        if (targetCenterY > viewportHeight * 0.52) {
          placement = 'above';
          top = Math.max(16, rect.top - cardHeight - 20);
        } else {
          top = Math.min(viewportHeight - cardHeight - 16, rect.top + rect.height + 20);
        }

        // Horizontal centering with screen edge bounds protection
        let left = targetCenterX - cardWidth / 2;
        left = Math.max(16, Math.min(viewportWidth - cardWidth - 16, left));

        setCardPosition({ top, left, placement });

        // Smooth scroll target element into viewport center
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setTargetBounds(null);
      }
    };

    updateBoundsAndPosition();
    window.addEventListener('resize', updateBoundsAndPosition);
    window.addEventListener('scroll', updateBoundsAndPosition);

    return () => {
      window.removeEventListener('resize', updateBoundsAndPosition);
      window.removeEventListener('scroll', updateBoundsAndPosition);
    };
  }, [isTourActive, currentTourStep]);

  if (!isTourActive || !currentTourStep) return null;

  const totalSteps = 5;
  const isFirstStep = currentTourStepIndex === 0;
  const isLastStep = currentTourStepIndex === totalSteps - 1;

  // Connecting SVG Line Coordinate Math
  const cardCenterX = cardPosition.left + 210;
  const cardCenterY = cardPosition.placement === 'above' ? cardPosition.top + 230 : cardPosition.top + 10;
  const targetCenterX = targetBounds ? targetBounds.left - window.scrollX + targetBounds.width / 2 : cardCenterX;
  const targetCenterY = targetBounds ? targetBounds.top - window.scrollY + targetBounds.height / 2 : cardCenterY;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
        
        {/* Semi-transparent Backdrop for entire viewport (60% opacity & light blur) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto transition-opacity duration-300"
          onClick={endTour}
        />

        {/* 
          Target Element Spotlight Frame:
          Uses pulse-glow keyframe animation + massive spread box shadow
          to dim everything else while keeping target element 100% bright with gentle pulsing cyan glow.
        */}
        {targetBounds && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 26 }}
            style={{
              top: `${targetBounds.top - 8}px`,
              left: `${targetBounds.left - 8}px`,
              width: `${targetBounds.width + 16}px`,
              height: `${targetBounds.height + 16}px`,
            }}
            className="absolute rounded-2xl border-2 border-cyan-400 pointer-events-none z-40 bg-transparent transition-all duration-300 ease-out ring-2 ring-cyan-400/30 animate-pulse-glow"
          >
            {/* Pinging Beacon Dot on Spotlight Target */}
            <div className="absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-400 border-2 border-slate-950 shadow-[0_0_10px_#06b6d4]" />
            </div>
          </motion.div>
        )}

        {/* SVG Connecting Line with Pointer Arrow */}
        {targetBounds && (
          <svg className="fixed inset-0 w-full h-full pointer-events-none z-40">
            <defs>
              <marker
                id="tour-arrow"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
              </marker>
            </defs>
            <motion.line
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              x1={cardCenterX}
              y1={cardCenterY}
              x2={targetCenterX}
              y2={targetCenterY}
              stroke="#06b6d4"
              strokeWidth="2"
              strokeDasharray="5,5"
              markerEnd="url(#tour-arrow)"
              className="animate-pulse"
            />
          </svg>
        )}

        {/* Glassmorphism Dynamically Positioned Tutorial Card Modal */}
        <div
          style={{
            top: `${cardPosition.top}px`,
            left: `${cardPosition.left}px`,
          }}
          className="fixed z-50 max-w-[420px] w-full p-2 pointer-events-auto transition-all duration-300 ease-out"
        >
          <motion.div
            key={currentTourStep.id}
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="bg-[#0f172a]/95 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.25)] space-y-4 font-sans text-left"
          >
            {/* Header Bar */}
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                </span>
                <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  LEARNING MODE • {currentTourStep.badge}
                </span>
              </div>
              
              <button
                onClick={endTour}
                className="text-[#64748b] hover:text-white transition-colors p-1"
                title="Exit Tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white tracking-wide leading-tight">
                {currentTourStep.title}
              </h3>
              <div className="text-xs font-mono text-amber-400">
                {currentTourStep.subtitle}
              </div>
              <p className="text-sm text-slate-300 leading-relaxed pt-1 font-normal">
                {currentTourStep.content}
              </p>
            </div>

            {/* Footer Navigation Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-[#334155]">
              <div className="flex gap-1.5">
                {!isFirstStep && (
                  <button
                    onClick={prevTourStep}
                    className="px-3.5 py-2 rounded-xl border border-[#334155] bg-[#1e293b] hover:border-cyan-400 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1 font-mono"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={endTour}
                  className="px-3 py-2 text-xs font-mono text-slate-400 hover:text-white transition-colors"
                >
                  Skip
                </button>

                <button
                  onClick={nextTourStep}
                  className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all flex items-center gap-1.5 font-mono"
                >
                  {isLastStep ? (
                    <>
                      <span>Complete</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Next Step</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </motion.div>
        </div>

      </div>
    </AnimatePresence>
  );
};
