import React, { useState } from 'react';
import { SoftStarterState } from '../utils/softStarterEngine';
import { Zap, AlertTriangle, ShieldCheck, RefreshCw, Lightbulb, Activity, Info } from 'lucide-react';

interface BusDipViewProps {
  engineState?: Partial<SoftStarterState>;
  className?: string;
}

/**
 * BusDipView.tsx - Supply Bus Voltage Sag Single-Line Diagram Component
 * 
 * Physics:
 *  - Bus Voltage Dip: V_dip(%) = (I_line / I_sc) * 100%
 *  - Grid Short-Circuit Level: I_sc ≈ 5.0 kA (20 pu of 269A FLA)
 *  - Demonstrates why soft starters are required to prevent bus sag & contactor dropout
 */
export const BusDipView: React.FC<BusDipViewProps> = ({
  engineState,
  className = '',
}) => {
  const [isDolComparison, setIsDolComparison] = useState<boolean>(false);

  // Live Engine Metrics
  const liveDipPct = engineState?.busDipPct ?? 0.0;
  const liveIrmsPu = engineState?.IrmsPu ?? 0.0;
  const liveVrmsPct = engineState?.VrmsPct ?? 100.0;

  // In DOL comparison mode, simulate 6.5 pu inrush sag (~19.5% dip)
  const displayDipPct = isDolComparison ? 19.5 : liveDipPct;
  const displayIrmsPu = isDolComparison ? 6.5 : liveIrmsPu;
  const busVoltagePct = Math.max(0, 100.0 - displayDipPct);

  // Light bulb brightness opacity (proportional to bus voltage)
  const lightOpacity = Math.max(0.2, busVoltagePct / 100.0);

  // Contactor Dropout Alert (>10% dip threshold)
  const isContactorDropped = displayDipPct > 10.0;

  // Status Color Code (Green <5%, Amber 5-10%, Red >10%)
  const getDipColor = (dip: number) => {
    if (dip < 5.0) return { text: 'text-[#10b981]', bg: 'bg-[#10b981]', border: 'border-[#10b981]', status: 'GOOD (<5%)' };
    if (dip <= 10.0) return { text: 'text-amber-400', bg: 'bg-amber-400', border: 'border-amber-400', status: 'NOTICEABLE FLICKER (5-10%)' };
    return { text: 'text-[#ef4444]', bg: 'bg-[#ef4444]', border: 'border-[#ef4444]', status: 'SEVERE SAG / DROPOUT (>10%)' };
  };

  const dipStyle = getDipColor(displayDipPct);

  return (
    <div className={`bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-4 ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span>⚡</span> Utility Busbar Voltage Dip & Neighboring Load Sag
          </h2>
          <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
            Source Impedance Sag: V_dip = (I_line / I_sc) • 100%
          </p>
        </div>

        {/* DOL vs Soft Start Comparison Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDolComparison(!isDolComparison)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              isDolComparison
                ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                : 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isDolComparison ? 'REPLAYING AS DOL (6.5 pu)' : 'COMPARE WITH DOL'}</span>
          </button>
        </div>
      </div>

      {/* Main Single-Line Diagram Viewport */}
      <div className="relative rounded-xl border border-[#334155] bg-[#0f172a] p-6 space-y-6">
        
        {/* Top Supply Busbar */}
        <div className="flex flex-col items-center">
          <div className="text-[11px] font-mono text-[#94a3b8] mb-1 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#06b6d4]" /> 415V / 50Hz Utility Feeder Transformer (I_sc = 5.0 kA)
          </div>

          {/* Busbar Line */}
          <div className={`w-full h-3 rounded-full transition-all duration-300 relative shadow-lg ${
            displayDipPct > 10.0
              ? 'bg-[#ef4444] shadow-[0_0_15px_#ef4444]'
              : displayDipPct > 5.0
              ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]'
              : 'bg-[#06b6d4] shadow-[0_0_10px_#06b6d4]'
          }`}>
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-xs font-bold text-white bg-[#1e293b] px-3 py-0.5 rounded-full border border-[#334155]">
              MAIN BUSBAR: {busVoltagePct.toFixed(1)}% V_nom (Dip: {displayDipPct.toFixed(1)}%)
            </div>
          </div>
        </div>

        {/* Parallel Branches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          
          {/* Branch 1: Soft Starter + Heavy Motor Load */}
          <div className="bg-[#1e293b]/80 border border-[#334155] rounded-xl p-4 space-y-3 relative">
            <div className="flex items-center justify-between border-b border-[#334155] pb-2">
              <span className="text-xs font-bold text-white font-mono uppercase">
                BRANCH 1: 160 kW Motor Feeder
              </span>
              <span className="text-xs font-mono text-[#06b6d4] font-bold">
                I = {displayIrmsPu.toFixed(2)} pu
              </span>
            </div>

            {/* Branch Wiring Animation */}
            <div className="flex flex-col items-center space-y-2 py-2">
              {/* Feeder Line */}
              <div className="w-0.5 h-6 bg-[#06b6d4]" />

              {/* Starter Box */}
              <div className={`px-4 py-2 rounded-xl border text-center font-mono text-xs font-bold transition-all ${
                isDolComparison
                  ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]'
                  : 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#06b6d4]'
              }`}>
                {isDolComparison ? 'DOL CONTACTOR (DIRECT)' : 'SOFT STARTER (SCR RAMP)'}
              </div>

              <div className="w-0.5 h-6 bg-[#06b6d4]" />

              {/* Induction Motor Icon */}
              <div className="w-12 h-12 rounded-full border-2 border-[#10b981] bg-[#0f172a] flex items-center justify-center font-mono font-bold text-sm text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                M
              </div>
            </div>

            <div className="text-[11px] font-mono text-[#94a3b8] text-center">
              160 kW / 415 V / 269 A Industrial Drive
            </div>
          </div>

          {/* Branch 2: Neighboring Sensitive Load (Lighting + Contactor Motor) */}
          <div className="bg-[#1e293b]/80 border border-[#334155] rounded-xl p-4 space-y-3 relative">
            <div className="flex items-center justify-between border-b border-[#334155] pb-2">
              <span className="text-xs font-bold text-white font-mono uppercase">
                BRANCH 2: Plant Lighting & Auxiliaries
              </span>
              <span className="text-xs font-mono text-slate-400">
                Sensitive Plant Bus
              </span>
            </div>

            {/* Animated Load Components */}
            <div className="grid grid-cols-2 gap-3 py-2">
              
              {/* Component A: Lighting Bank */}
              <div className="bg-[#0f172a] border border-[#334155] rounded-xl p-3 flex flex-col items-center justify-center space-y-2">
                <Lightbulb
                  className="w-8 h-8 transition-all duration-300"
                  style={{
                    color: '#f59e0b',
                    opacity: lightOpacity,
                    filter: `drop-shadow(0 0 ${lightOpacity * 12}px #f59e0b)`,
                  }}
                />
                <span className="text-[10px] font-mono text-[#94a3b8] text-center">
                  Plant Lighting (Opacity: {Math.round(lightOpacity * 100)}%)
                </span>
              </div>

              {/* Component B: Contactor-Fed Small Motor */}
              <div className={`bg-[#0f172a] border rounded-xl p-3 flex flex-col items-center justify-center space-y-2 transition-all ${
                isContactorDropped ? 'border-[#ef4444] bg-[#ef4444]/10' : 'border-[#334155]'
              }`}>
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold font-mono ${
                  isContactorDropped
                    ? 'border-[#ef4444] text-[#ef4444] bg-[#ef4444]/20 animate-bounce'
                    : 'border-[#10b981] text-[#10b981] bg-[#10b981]/20'
                }`}>
                  KM
                </div>
                <span className="text-[10px] font-mono text-center font-bold" style={{ color: isContactorDropped ? '#ef4444' : '#10b981' }}>
                  {isContactorDropped ? 'KM DROPPED OUT!' : 'KM CLOSED'}
                </span>
              </div>

            </div>

            {/* Warning Alert Badge */}
            {isContactorDropped && (
              <div className="bg-[#ef4444]/20 border border-[#ef4444] p-2.5 rounded-xl text-[11px] font-mono text-[#ef4444] flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>WARNING: Bus voltage dip &gt; 10% caused auxiliary contactor coil to chatter/drop out!</span>
              </div>
            )}

          </div>

        </div>

        {/* Voltage Dip Color Gauge & Readout Bar */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${dipStyle.bg} shadow-[0_0_10px_currentColor]`} />
            <div>
              <div className="text-xs font-bold text-white">
                VOLTAGE DIP: <span className={dipStyle.text}>{displayDipPct.toFixed(1)}%</span>
              </div>
              <div className="text-[10px] text-[#64748b]">
                STATUS: {dipStyle.status}
              </div>
            </div>
          </div>

          {/* Color Scale Bar */}
          <div className="w-full sm:w-64 h-3 bg-[#0f172a] rounded-full overflow-hidden border border-[#334155] relative">
            <div
              className={`h-full transition-all duration-300 ${dipStyle.bg}`}
              style={{ width: `${Math.min(100, (displayDipPct / 25.0) * 100)}%` }}
            />
          </div>

        </div>

      </div>

      {/* Physics Teaching Note */}
      <div className="p-3.5 bg-[#0f172a] border border-[#334155] rounded-xl text-xs space-y-1 text-[#94a3b8]">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#06b6d4]" />
          Power Quality & Source Impedance Physics
        </div>
        <p className="text-[11px] leading-relaxed">
          High DOL inrush current (6.5 pu) flowing through supply transformer source impedance causes severe bus voltage sags (&gt; 10%), leading to light flickering and auxiliary contactor dropouts.
          Soft starters restrict inrush to 3.5 pu, maintaining bus voltage stability within IEEE 519 compliance limits (&lt; 5%).
        </p>
      </div>

    </div>
  );
};
