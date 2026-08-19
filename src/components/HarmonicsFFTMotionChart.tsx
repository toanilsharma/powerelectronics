import React, { useState } from 'react';
import { motion } from 'motion/react';
import { HarmonicComplianceDetail, IEEE519ComplianceResult } from '../utils/PowerQualityEngine';
import { Info, AlertTriangle, ShieldCheck } from 'lucide-react';

interface HarmonicsFFTMotionChartProps {
  complianceResult: IEEE519ComplianceResult;
  maxDisplayOrder?: number; // Default 50
  className?: string;
}

/**
 * Task 2: FFT Spectrum Analyzer (Framer Motion Spring Animated)
 * 
 * Features:
 *  - Displays orders H2 to H50
 *  - Animate heights with framer-motion spring transitions
 *  - Color coding: Grey/Slate if below limit, Neon Red if above IEEE 519 limit
 *  - Dashed horizontal line indicating IEEE 519 limit per harmonic order
 *  - Hover tooltips detailing magnitude, % of IL, limit, and status
 */
export const HarmonicsFFTMotionChart: React.FC<HarmonicsFFTMotionChartProps> = ({
  complianceResult,
  maxDisplayOrder = 50,
  className = '',
}) => {
  const [hoveredDetail, setHoveredDetail] = useState<HarmonicComplianceDetail | null>(null);

  // Filter orders H2 to H50
  const details = complianceResult.details.filter(
    (d) => d.order >= 2 && d.order <= maxDisplayOrder
  );

  // Calculate scaling factor for bar heights
  const maxPercent = Math.max(
    20,
    ...details.map((d) => Math.max(d.percentOfIL, d.limit * 1.2))
  );

  return (
    <div className={`bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-4 ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span>📊</span> FFT Harmonic Spectrum (H2 – H{maxDisplayOrder})
          </h2>
          <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
            IEEE 519-2022 Limit Overlay • Spring Motion Physics
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-[#94a3b8]">
            <span className="w-3 h-3 rounded bg-slate-500" /> Below Limit (Pass)
          </span>
          <span className="flex items-center gap-1.5 text-[#ef4444] font-semibold">
            <span className="w-3 h-3 rounded bg-[#ef4444] animate-pulse" /> Exceeds Limit (Fail)
          </span>
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="w-3 h-0.5 bg-red-400 border-b border-dashed border-red-400" /> Limit Line
          </span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative pt-6 pb-2 px-2 bg-[#0f172a] rounded-xl border border-[#334155] overflow-x-auto">
        
        {/* Y-Axis Reference Guidelines */}
        <div className="absolute inset-y-0 left-0 right-0 pointer-events-none flex flex-col justify-between p-4 text-[9px] font-mono text-[#64748b]">
          <div className="border-b border-[#334155]/40 text-right pr-2">
            {maxPercent.toFixed(0)}% IL
          </div>
          <div className="border-b border-[#334155]/40 text-right pr-2">
            {(maxPercent * 0.66).toFixed(0)}% IL
          </div>
          <div className="border-b border-[#334155]/40 text-right pr-2">
            {(maxPercent * 0.33).toFixed(0)}% IL
          </div>
          <div className="border-b border-[#334155]/40 text-right pr-2">0%</div>
        </div>

        {/* Spring Animated Bar Grid */}
        <div className="flex items-end gap-1.5 md:gap-2 h-[220px] min-w-[700px] px-8 pt-4 pb-6 relative z-10">
          {details.map((item) => {
            const heightPct = Math.min(100, (item.percentOfIL / maxPercent) * 100);
            const limitPct = Math.min(100, (item.limit / maxPercent) * 100);

            return (
              <div
                key={item.order}
                onMouseEnter={() => setHoveredDetail(item)}
                onMouseLeave={() => setHoveredDetail(null)}
                className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
              >
                {/* Horizontal Dashed IEEE 519 Limit Line */}
                <div
                  style={{ bottom: `${limitPct}%` }}
                  className="absolute left-0 right-0 h-[2px] border-b-2 border-dashed border-red-500/80 z-20 pointer-events-none"
                  title={`Order H${item.order} Limit: ${item.limit}% IL`}
                />

                {/* Motion Animated Bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(4, heightPct)}%` }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 24,
                    mass: 0.8,
                  }}
                  className={`w-full rounded-t-sm transition-colors duration-200 ${
                    item.isCompliant
                      ? 'bg-slate-500 hover:bg-slate-400 shadow-[0_0_10px_rgba(100,116,139,0.2)]'
                      : 'bg-[#ef4444] hover:bg-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse'
                  }`}
                />

                {/* X-Axis Label */}
                <span
                  className={`text-[9px] font-mono mt-1.5 font-semibold ${
                    item.order === hoveredDetail?.order
                      ? 'text-[#06b6d4] font-bold scale-110'
                      : item.isCompliant
                      ? 'text-[#94a3b8]'
                      : 'text-[#ef4444]'
                  }`}
                >
                  H{item.order}
                </span>

                {/* Hover Tooltip Popup */}
                {hoveredDetail?.order === item.order && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute bottom-full mb-3 z-50 bg-[#1e293b] border border-[#334155] rounded-xl p-3 shadow-2xl text-xs font-mono min-w-[170px] pointer-events-none text-left"
                  >
                    <div className="font-bold text-white flex items-center justify-between border-b border-[#334155] pb-1.5 mb-1.5">
                      <span>Order H{item.order}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          item.isCompliant
                            ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                            : 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40'
                        }`}
                      >
                        {item.isCompliant ? 'PASS' : 'FAIL'}
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between text-[#94a3b8]">
                        <span>Current:</span>
                        <span className="text-white font-bold">{item.magnitude.toFixed(2)} A</span>
                      </div>
                      <div className="flex justify-between text-[#94a3b8]">
                        <span>% of IL:</span>
                        <span className={item.isCompliant ? 'text-slate-200' : 'text-[#ef4444] font-bold'}>
                          {item.percentOfIL.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[#94a3b8]">
                        <span>IEEE Limit:</span>
                        <span className="text-[#06b6d4] font-bold">{item.limit.toFixed(2)}%</span>
                      </div>
                      <div className="text-[9px] text-[#64748b] pt-1 border-t border-[#334155]">
                        {item.isEven ? 'Even Harmonic (25% Limit Rule)' : 'Odd Harmonic Order'}
                      </div>
                    </div>
                  </motion.div>
                )}

              </div>
            );
          })}
        </div>

      </div>

      {/* Footer Audit Summary */}
      <div className="flex items-center justify-between text-xs font-mono bg-[#0f172a] border border-[#334155] p-3 rounded-xl">
        <div className="flex items-center gap-2 text-[#94a3b8]">
          <Info className="w-4 h-4 text-[#06b6d4]" />
          <span>Hover over any bar to view exact % of IL and IEEE limits.</span>
        </div>
        <div className="text-right">
          <span className="text-[#64748b]">Total Demand Distortion (TDD): </span>
          <span className={`font-bold ${complianceResult.isCompliant ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {complianceResult.tddPercent.toFixed(2)}%
          </span>
        </div>
      </div>

    </div>
  );
};
