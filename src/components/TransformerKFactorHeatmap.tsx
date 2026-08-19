import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PowerQualityEngine } from '../utils/PowerQualityEngine';
import { Flame, ShieldAlert, Zap, Info, Thermometer } from 'lucide-react';

interface TransformerKFactorHeatmapProps {
  kFactor: number;
  transformerRatingKva?: number;
  className?: string;
}

/**
 * Task 3: Transformer K-Factor Heatmap (Interactive SVG)
 * 
 * Renders Transformer Coils & Core with dynamic heatmap color:
 *  - K < 4: Cool Blue (#38bdf8)
 *  - K 4-13: Warm Yellow/Orange (#f59e0b)
 *  - K > 13: Pulsing Red (Danger - #ef4444)
 * 
 * Features tooltip explaining Eddy Current Heating under non-linear loads.
 */
export const TransformerKFactorHeatmap: React.FC<TransformerKFactorHeatmapProps> = ({
  kFactor,
  transformerRatingKva = 500,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  // Derive Heatmap Color Palette based on K-Factor
  const heatmapState = React.useMemo(() => {
    if (kFactor < 4.0) {
      return {
        zone: 'COOL',
        color: '#38bdf8',       // Cool Blue
        strokeColor: '#0284c7',
        glowColor: 'rgba(56, 189, 248, 0.4)',
        label: 'Cool Operating Zone (Standard Load)',
        dangerLevel: 'LOW',
        kRating: PowerQualityEngine.getRecommendedKRating(kFactor),
        animatePulse: false,
      };
    } else if (kFactor <= 13.0) {
      return {
        zone: 'WARM',
        color: '#f59e0b',       // Warm Yellow/Orange
        strokeColor: '#d97706',
        glowColor: 'rgba(245, 158, 11, 0.5)',
        label: 'Elevated Heating (K-4 to K-13 Required)',
        dangerLevel: 'MODERATE',
        kRating: PowerQualityEngine.getRecommendedKRating(kFactor),
        animatePulse: false,
      };
    } else {
      return {
        zone: 'HOT_DANGER',
        color: '#ef4444',       // Pulsing Red Danger
        strokeColor: '#b91c1c',
        glowColor: 'rgba(239, 68, 68, 0.8)',
        label: 'CRITICAL OVERHEATING DANGER (K-13+ Required)',
        dangerLevel: 'HIGH DANGER',
        kRating: PowerQualityEngine.getRecommendedKRating(kFactor),
        animatePulse: true,
      };
    }
  }, [kFactor]);

  // Calculate Derated Transformer Capability (% of nameplate kVA)
  // Max derated load = 1 / sqrt(1 + (K - 1) * 0.15) approx
  const deratedCapacityPct = Math.max(30, Math.min(100, (1 / Math.sqrt(1 + (kFactor - 1) * 0.12)) * 100));

  return (
    <div className={`bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-4 ${className}`}>
      
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[#334155] pb-3">
        <div className="flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-amber-400" />
          <h2 className="font-bold text-base text-white tracking-wide uppercase">
            Transformer K-Factor Heatmap
          </h2>
        </div>
        <span
          className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-md border ${
            heatmapState.zone === 'COOL'
              ? 'bg-sky-950 border-sky-500 text-sky-400'
              : heatmapState.zone === 'WARM'
              ? 'bg-amber-950 border-amber-500 text-amber-400'
              : 'bg-red-950 border-red-500 text-red-400 animate-pulse'
          }`}
        >
          {heatmapState.kRating} REQUIRED
        </span>
      </div>

      {/* SVG Transformer Coil Display */}
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="relative bg-[#0f172a] rounded-xl border border-[#334155] p-4 flex flex-col md:flex-row items-center justify-around gap-6 cursor-pointer overflow-hidden group"
      >
        {/* SVG Coils Graphic */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            
            {/* Laminated Steel Core Frame */}
            <rect
              x="25"
              y="25"
              width="150"
              height="150"
              rx="12"
              fill="none"
              stroke="#475569"
              strokeWidth="14"
            />
            {/* Core Center Window */}
            <rect
              x="60"
              y="60"
              width="80"
              height="80"
              rx="6"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="4"
            />

            {/* Primary Winding Coil (Left Leg) */}
            <g>
              {[45, 65, 85, 105, 125, 145].map((y) => (
                <rect
                  key={`pri-${y}`}
                  x="15"
                  y={y - 6}
                  width="30"
                  height="12"
                  rx="6"
                  fill="#06b6d4"
                  stroke="#0891b2"
                  strokeWidth="2"
                />
              ))}
            </g>

            {/* Secondary Winding Coil (Right Leg - Subject to Eddy Current Heating) */}
            <g>
              {[45, 65, 85, 105, 125, 145].map((y) => (
                <motion.rect
                  key={`sec-${y}`}
                  x="155"
                  y={y - 6}
                  width="30"
                  height="12"
                  rx="6"
                  fill={heatmapState.color}
                  stroke={heatmapState.strokeColor}
                  strokeWidth="2"
                  animate={
                    heatmapState.animatePulse
                      ? {
                          fill: [heatmapState.color, '#b91c1c', heatmapState.color],
                          scale: [1, 1.05, 1],
                        }
                      : {}
                  }
                  transition={
                    heatmapState.animatePulse
                      ? { repeat: Infinity, duration: 1.2 }
                      : {}
                  }
                  style={{
                    filter: `drop-shadow(0px 0px 8px ${heatmapState.glowColor})`,
                  }}
                />
              ))}
            </g>

            {/* Magnetic Flux Path Arrows */}
            <path
              d="M 100 35 L 140 35 L 140 165 L 60 165 L 60 35 Z"
              fill="none"
              stroke="rgba(6, 182, 212, 0.3)"
              strokeWidth="2"
              strokeDasharray="4,4"
            />
          </svg>
        </div>

        {/* Heatmap Metrics Column */}
        <div className="space-y-3 font-mono text-xs w-full md:w-auto">
          <div className="bg-[#1e293b] p-3 rounded-xl border border-[#334155]">
            <div className="text-[10px] text-[#94a3b8] uppercase">Calculated K-Factor</div>
            <div
              className="text-2xl font-bold mt-0.5"
              style={{ color: heatmapState.color }}
            >
              K = {kFactor.toFixed(2)}
            </div>
            <div className="text-[10px] text-[#64748b] mt-1">
              ANSI C57.110 Rating: <strong className="text-white">{heatmapState.kRating}</strong>
            </div>
          </div>

          <div className="bg-[#1e293b] p-3 rounded-xl border border-[#334155]">
            <div className="text-[10px] text-[#94a3b8] uppercase">Derated Capacity</div>
            <div className="text-lg font-bold text-amber-400 mt-0.5">
              {deratedCapacityPct.toFixed(0)}% Nameplate
            </div>
            <div className="text-[10px] text-[#64748b]">
              Max Load: {((transformerRatingKva * deratedCapacityPct) / 100).toFixed(0)} kVA (from {transformerRatingKva} kVA)
            </div>
          </div>
        </div>

        {/* Interactive Hover Tooltip Popup */}
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 bg-[#0f172a]/95 backdrop-blur-md border border-[#334155] p-5 rounded-xl z-30 flex flex-col justify-between text-xs text-[#94a3b8]"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-white text-sm border-b border-[#334155] pb-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Eddy Current Heating Physics (ANSI C57.110)</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                Non-linear load harmonic currents (Ih) induce high-frequency magnetic fields in transformer copper windings.
                Eddy current losses increase proportionally to the square of harmonic order (P_ec ∝ h² · Ih²).
              </p>
              <div className="p-2 bg-[#1e293b] rounded font-mono text-[10px] text-amber-300">
                Formula: K = ∑ (Ih / Irms)² × h²
              </div>
            </div>
            <div className="text-[10px] text-[#64748b] pt-2 border-t border-[#334155] flex justify-between">
              <span>Standard Transformer Derating: {deratedCapacityPct.toFixed(0)}%</span>
              <span className="text-[#06b6d4]">Click for Details</span>
            </div>
          </motion.div>
        )}

      </div>

      {/* Explanation Banner */}
      <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-xl text-xs space-y-1 text-[#94a3b8]">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#06b6d4]" />
          Transformer Heatmap Physics Note
        </div>
        <p className="text-[11px] leading-relaxed">
          Standard transformers (K-1) overheat rapidly under VFD/SMPS harmonic loads due to skin effect &amp; stray losses.
          K-rated transformers use electrostatic shielding, double-neutral copper conductors, and reduced flux density.
        </p>
      </div>

    </div>
  );
};
