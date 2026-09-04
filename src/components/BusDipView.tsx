import React, { useState, useEffect, useRef } from 'react';
import { SoftStarterState } from '../utils/softStarterEngine';
import { Zap, AlertTriangle, ShieldCheck, RefreshCw, Lightbulb, Activity, Info, Gauge, ShieldAlert } from 'lucide-react';

interface BusDipViewProps {
  engineState?: Partial<SoftStarterState>;
  className?: string;
}

/**
 * BusDipView.tsx - Supply Bus Voltage Sag, ANSI 27/59 Relays & Contactor Dropout Simulator
 * 
 * Physics & Standards:
 *  - Source Impedance Sag: V_dip(%) = (I_line / I_sc) * 100%
 *  - ANSI 27 (Undervoltage Inverse-Time): t_trip = (TDS * A) / |1 - (V/V_pickup)|^p + B
 *  - ANSI 59 (Overvoltage): Trip at >115%
 *  - SEMI F47 & IEEE 1668 Ride-Through Envelope (50% for 200ms, 70% for 500ms, 80% for 1s)
 *  - Contactor Coil Holding Physics: F_mag proportional to V_bus^2; drops out when V_bus < 70%
 */
export const BusDipView: React.FC<BusDipViewProps> = ({
  engineState,
  className = '',
}) => {
  const [isDolComparison, setIsDolComparison] = useState<boolean>(false);
  const [customIscKa, setCustomIscKa] = useState<number>(5.0); // kA grid short-circuit level
  const [customDurationMs, setCustomDurationMs] = useState<number>(350); // ms dip duration
  const [ansi27Pickup, setAnsi27Pickup] = useState<number>(0.85); // 85% pickup (0.85 pu)
  const [ansi27Tds, setAnsi27Tds] = useState<number>(1.0); // Time dial setting

  const protectionCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live Engine Metrics
  const liveDipPct = engineState?.busDipPct ?? 0.0;
  const liveIrmsPu = engineState?.IrmsPu ?? 0.0;

  // Active Sag Calculation
  // 160 kW motor: FLA = 269 A. If DOL: I_line = 6.5 * 269 = 1748.5 A = 1.7485 kA
  // If soft starter: I_line = 3.2 * 269 = 860.8 A = 0.861 kA
  const motorCurrentKa = isDolComparison ? (6.5 * 0.269) : Math.max(0.269, (liveIrmsPu || 3.2) * 0.269);
  const calculatedDipPct = Math.min(60.0, (motorCurrentKa / customIscKa) * 100);
  const displayDipPct = isDolComparison ? Math.max(calculatedDipPct, 19.5) : calculatedDipPct;
  const busVoltagePct = Math.max(0, 100.0 - displayDipPct);
  const busVoltagePu = busVoltagePct / 100.0;

  // Light bulb brightness
  const lightOpacity = Math.max(0.15, busVoltagePct / 100.0);

  // Contactor Dropout Physics: F_mag = (V/V_nom)^2. If V < 0.70 pu, F_mag < F_spring -> Dropout!
  const contactorHoldingForcePct = Math.min(100, Math.pow(busVoltagePu, 2) * 100);
  const isContactorDropped = busVoltagePu < 0.70 || displayDipPct > 30.0;

  // ANSI 27 Undervoltage Trip Calculation: IEEE Standard Inverse
  // t_trip = TDS * (0.0515 / ((1 - (V/V_pk))^0.02 - 1) + 0.114)
  let ansi27TripTimeSec = 999.0;
  let isAnsi27Tripped = false;
  if (busVoltagePu < ansi27Pickup) {
    const vRatio = busVoltagePu / ansi27Pickup;
    const denominator = Math.max(0.001, 1 - Math.pow(vRatio, 1.2));
    ansi27TripTimeSec = Math.max(0.04, (ansi27Tds * 0.14) / denominator);
    if ((customDurationMs / 1000) >= ansi27TripTimeSec) {
      isAnsi27Tripped = true;
    }
  }

  // SEMI F47 Compliance:
  // Must ride through: 50% for 0.2s, 70% for 0.5s, 80% for 1.0s
  const durationSec = customDurationMs / 1000;
  let isSemiF47Compliant = true;
  if (durationSec <= 0.2) {
    isSemiF47Compliant = busVoltagePct >= 50.0;
  } else if (durationSec <= 0.5) {
    isSemiF47Compliant = busVoltagePct >= 70.0;
  } else if (durationSec <= 1.0) {
    isSemiF47Compliant = busVoltagePct >= 80.0;
  } else {
    isSemiF47Compliant = busVoltagePct >= 90.0;
  }

  // Status Color Code (Green <5%, Amber 5-10%, Red >10%)
  const getDipColor = (dip: number) => {
    if (dip < 5.0) return { text: 'text-[#10b981]', bg: 'bg-[#10b981]', border: 'border-[#10b981]', status: 'IEEE 519 COMPLIANT (<5%)' };
    if (dip <= 10.0) return { text: 'text-amber-400', bg: 'bg-amber-400', border: 'border-amber-400', status: 'NOTICEABLE FLICKER (5-10%)' };
    return { text: 'text-[#ef4444]', bg: 'bg-[#ef4444]', border: 'border-[#ef4444]', status: 'SEVERE SAG & DROPOUT (>10%)' };
  };

  const dipStyle = getDipColor(displayDipPct);

  // Render Protection Canvas: SEMI F47 Ride-Through vs ANSI 27 Trip Curve
  useEffect(() => {
    const canvas = protectionCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Grid (Time Log Scale: 0.01s to 10s, Voltage: 0% to 120%)
    const padL = 40;
    const padR = 20;
    const padT = 20;
    const padB = 30;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    // Helper mappings
    const logTToX = (tSec: number) => {
      const minLog = Math.log10(0.01);
      const maxLog = Math.log10(10.0);
      const valLog = Math.log10(Math.max(0.01, Math.min(10.0, tSec)));
      return padL + ((valLog - minLog) / (maxLog - minLog)) * chartW;
    };

    const vToY = (vPct: number) => {
      return padT + (1 - Math.max(0, Math.min(120, vPct)) / 120) * chartH;
    };

    // Draw Grid Lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    [0.01, 0.1, 1.0, 10.0].forEach((t) => {
      const x = logTToX(t);
      ctx.moveTo(x, padT); ctx.lineTo(x, padT + chartH);
    });
    [20, 50, 70, 80, 100].forEach((v) => {
      const y = vToY(v);
      ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y);
    });
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.fillText('10ms', logTToX(0.01) - 8, padT + chartH + 16);
    ctx.fillText('100ms', logTToX(0.1) - 12, padT + chartH + 16);
    ctx.fillText('1s', logTToX(1.0) - 6, padT + chartH + 16);
    ctx.fillText('10s', logTToX(10.0) - 12, padT + chartH + 16);

    ctx.fillText('100%', 10, vToY(100) + 3);
    ctx.fillText('70%', 14, vToY(70) + 3);
    ctx.fillText('50%', 14, vToY(50) + 3);
    ctx.fillText('0%', 20, vToY(0) + 3);

    // Draw SEMI F47 Ride-Through Boundary (Cyan Step Line)
    // 0 to 0.2s: 50%, 0.2 to 0.5s: 70%, 0.5 to 1.0s: 80%, >1.0s: 90%
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(logTToX(0.01), vToY(50));
    ctx.lineTo(logTToX(0.2), vToY(50));
    ctx.lineTo(logTToX(0.2), vToY(70));
    ctx.lineTo(logTToX(0.5), vToY(70));
    ctx.lineTo(logTToX(0.5), vToY(80));
    ctx.lineTo(logTToX(1.0), vToY(80));
    ctx.lineTo(logTToX(1.0), vToY(90));
    ctx.lineTo(logTToX(10.0), vToY(90));
    ctx.stroke();

    // Fill Ride-Through Allowed Region
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.beginPath();
    ctx.moveTo(logTToX(0.01), vToY(120));
    ctx.lineTo(logTToX(10.0), vToY(120));
    ctx.lineTo(logTToX(10.0), vToY(90));
    ctx.lineTo(logTToX(1.0), vToY(90));
    ctx.lineTo(logTToX(1.0), vToY(80));
    ctx.lineTo(logTToX(0.5), vToY(80));
    ctx.lineTo(logTToX(0.5), vToY(70));
    ctx.lineTo(logTToX(0.2), vToY(70));
    ctx.lineTo(logTToX(0.2), vToY(50));
    ctx.lineTo(logTToX(0.01), vToY(50));
    ctx.closePath();
    ctx.fill();

    // Draw Contactor Dropout Threshold Line (Red Dashed at 70%)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, vToY(70));
    ctx.lineTo(padL + chartW, vToY(70));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('Contactor Dropout (70%)', padL + 6, vToY(70) - 4);

    // Draw ANSI 27 Inverse-Time Trip Curve (Amber Solid)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let firstPt = true;
    for (let v = 10; v <= ansi27Pickup * 100 - 2; v += 2) {
      const vPu = v / 100;
      const vRatio = vPu / ansi27Pickup;
      const denom = Math.max(0.001, 1 - Math.pow(vRatio, 1.2));
      const tSec = Math.max(0.02, (ansi27Tds * 0.14) / denom);
      if (tSec <= 10.0) {
        const x = logTToX(tSec);
        const y = vToY(v);
        if (firstPt) {
          ctx.moveTo(x, y);
          firstPt = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // Plot Current Operating Sag Point (Blinking Dot with Halo)
    const dotX = logTToX(durationSec);
    const dotY = vToY(busVoltagePct);

    // Glowing Halo
    const halo = ctx.createRadialGradient(dotX, dotY, 1, dotX, dotY, 12);
    halo.addColorStop(0, isAnsi27Tripped || !isSemiF47Compliant ? 'rgba(239, 68, 68, 0.9)' : 'rgba(52, 211, 153, 0.9)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 12, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = isAnsi27Tripped || !isSemiF47Compliant ? '#ef4444' : '#10b981';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Text Label on dot
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${busVoltagePct.toFixed(0)}% @ ${customDurationMs}ms`, dotX + 8, dotY - 6);

  }, [busVoltagePct, customDurationMs, ansi27Pickup, ansi27Tds, durationSec, isAnsi27Tripped, isSemiF47Compliant]);

  return (
    <div className={`bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 shadow-2xl space-y-5 font-mono ${className}`}>
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#21262d] pb-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="text-amber-400">⚡</span> Utility Busbar Voltage Dip & Protection Relays
          </h2>
          <p className="text-xs text-[#8b949e] font-mono mt-0.5">
            IEEE 519 / SEMI F47 Voltage Sag Tolerance & ANSI 27 Undervoltage Relay Trip Dynamics
          </p>
        </div>

        {/* DOL vs Soft Start Comparison Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDolComparison(!isDolComparison)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              isDolComparison
                ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isDolComparison ? 'REPLAYING AS DOL (6.5 pu)' : 'COMPARE WITH DOL'}</span>
          </button>
        </div>
      </div>

      {/* TOP VIEWPORT: SINGLE-LINE DIAGRAM & CONTACTOR MECHANISM */}
      <div className="relative rounded-xl border border-[#30363d] bg-[#161b22] p-5 space-y-5">
        {/* Top Supply Busbar */}
        <div className="flex flex-col items-center">
          <div className="text-[11px] font-mono text-[#8b949e] mb-1 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#38bdf8]" /> 415V / 50Hz Utility Feeder Transformer (I_sc = {customIscKa.toFixed(1)} kA)
          </div>

          {/* Busbar Line */}
          <div className={`w-full h-3.5 rounded-full transition-all duration-300 relative shadow-lg ${
            displayDipPct > 10.0
              ? 'bg-[#ef4444] shadow-[0_0_15px_#ef4444]'
              : displayDipPct > 5.0
              ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]'
              : 'bg-[#38bdf8] shadow-[0_0_10px_#38bdf8]'
          }`}>
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 font-mono text-xs font-bold text-white bg-[#0d1117] px-3.5 py-0.5 rounded-full border border-[#30363d] shadow-md">
              MAIN BUSBAR: {busVoltagePct.toFixed(1)}% V_nom (Dip: {displayDipPct.toFixed(1)}%)
            </div>
          </div>
        </div>

        {/* PARALLEL BRANCHES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Branch 1: Soft Starter / Heavy Motor */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
              <span className="text-xs font-bold text-white font-mono uppercase">
                BRANCH 1: 160 kW Motor Feeder
              </span>
              <span className="text-xs font-mono text-[#38bdf8] font-bold">
                I = {(motorCurrentKa / 0.269).toFixed(1)} pu ({motorCurrentKa.toFixed(2)} kA)
              </span>
            </div>

            <div className="flex flex-col items-center space-y-2 py-1">
              <div className="w-0.5 h-5 bg-[#38bdf8]" />
              <div className={`px-4 py-1.5 rounded-xl border text-center font-mono text-xs font-bold transition-all ${
                isDolComparison
                  ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]'
                  : 'bg-[#38bdf8]/20 border-[#38bdf8] text-[#38bdf8]'
              }`}>
                {isDolComparison ? 'DOL CONTACTOR (DIRECT ON LINE)' : 'SOLID-STATE SOFT STARTER'}
              </div>
              <div className="w-0.5 h-5 bg-[#38bdf8]" />
              <div className="w-11 h-11 rounded-full border-2 border-[#10b981] bg-[#161b22] flex items-center justify-center font-mono font-bold text-sm text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                M
              </div>
            </div>

            <div className="text-[11px] font-mono text-[#8b949e] text-center">
              160 kW / 415 V / 269 A Industrial Motor
            </div>
          </div>

          {/* Branch 2: Sensitive Load & Contactor Armature Physics */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
              <span className="text-xs font-bold text-white font-mono uppercase">
                BRANCH 2: Sensitive Plant Auxiliaries
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                isContactorDropped ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
              }`}>
                {isContactorDropped ? 'CONTACTOR DROPPED' : 'CONTACTOR HELD'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 py-1">
              {/* Plant Lighting */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col items-center justify-center space-y-1.5">
                <Lightbulb
                  className="w-7 h-7 transition-all duration-300"
                  style={{
                    color: '#f59e0b',
                    opacity: lightOpacity,
                    filter: `drop-shadow(0 0 ${lightOpacity * 12}px #f59e0b)`,
                  }}
                />
                <span className="text-[10px] text-[#8b949e] text-center">
                  Lighting (Lumens: {Math.round(lightOpacity * 100)}%)
                </span>
              </div>

              {/* Electromagnetic Contactor Mechanism */}
              <div className={`bg-[#161b22] border rounded-xl p-3 flex flex-col items-center justify-center space-y-1.5 transition-all ${
                isContactorDropped ? 'border-red-500 bg-red-950/20' : 'border-[#30363d]'
              }`}>
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold ${
                  isContactorDropped
                    ? 'border-red-500 text-red-400 bg-red-500/20 animate-bounce'
                    : 'border-emerald-500 text-emerald-400 bg-emerald-500/20'
                }`}>
                  KM
                </div>
                <div className="text-[10px] text-center">
                  <div className="font-bold text-white">F_mag: {contactorHoldingForcePct.toFixed(0)}%</div>
                  <div className={isContactorDropped ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                    {isContactorDropped ? 'F_mag < F_spring' : 'F_mag > F_spring'}
                  </div>
                </div>
              </div>
            </div>

            {/* Dropout Alert */}
            {isContactorDropped && (
              <div className="bg-red-500/20 border border-red-500 p-2 rounded-lg text-[10px] text-red-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>Bus dip &gt; 30% or V &lt; 70% caused coil magnetic force collapse! Auxiliary tripped!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: 2D PROTECTION RELAY SCOPE & SEMI F47 RIDE-THROUGH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT 7 COLS: PROTECTION RELAYS & SEMI F47 CANVAS */}
        <div className="lg:col-span-7 bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#21262d]">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#38bdf8]" /> SEMI F47 RIDE-THROUGH & ANSI 27 TRIP ENVELOPE
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
              isAnsi27Tripped
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : !isSemiF47Compliant
                ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
            }`}>
              {isAnsi27Tripped ? 'ANSI 27 RELAY TRIPPED' : isSemiF47Compliant ? 'SEMI F47 RIDE-THROUGH PASS' : 'SEMI F47 VIOLATION'}
            </span>
          </div>

          <div className="w-full flex justify-center items-center bg-[#090d16] rounded-lg overflow-hidden border border-[#30363d]">
            <canvas
              ref={protectionCanvasRef}
              width={540}
              height={230}
              className="w-full h-auto max-h-[240px]"
            />
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[#8b949e] px-1 flex-wrap gap-2">
            <span className="text-[#38bdf8] font-bold">― SEMI F47 Ride-Through Boundary</span>
            <span className="text-amber-400 font-bold">― ANSI 27 Inverse-Time Curve</span>
            <span className="text-red-400 font-bold">-- Contactor 70% Dropout Line</span>
          </div>
        </div>

        {/* RIGHT 5 COLS: PROTECTION METRICS & TRIP CLASS STATUS */}
        <div className="lg:col-span-5 bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 flex flex-col justify-between gap-3">
          <div className="text-xs font-bold text-white pb-2 border-b border-[#21262d] flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>PROTECTION RELAY TELEMETRY</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-[#0d1117] border border-[#30363d] p-2 rounded-lg">
              <span className="text-[10px] text-[#8b949e]">BUS VOLTAGE</span>
              <div className="text-sm font-extrabold text-white">{busVoltagePct.toFixed(1)}% ({busVoltagePu.toFixed(2)} pu)</div>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] p-2 rounded-lg">
              <span className="text-[10px] text-[#8b949e]">DIP MAGNITUDE</span>
              <div className={`text-sm font-extrabold ${displayDipPct > 10 ? 'text-red-400' : 'text-emerald-400'}`}>
                {displayDipPct.toFixed(1)}%
              </div>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] p-2 rounded-lg">
              <span className="text-[10px] text-[#8b949e]">ANSI 27 TRIP TIME</span>
              <div className={`text-sm font-extrabold ${isAnsi27Tripped ? 'text-red-400' : 'text-amber-400'}`}>
                {ansi27TripTimeSec >= 900 ? 'NO TRIP' : `${ansi27TripTimeSec.toFixed(2)} s`}
              </div>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] p-2 rounded-lg">
              <span className="text-[10px] text-[#8b949e]">ANSI 59 STATUS</span>
              <div className="text-sm font-extrabold text-emerald-400">NORMAL (&lt;115%)</div>
            </div>
          </div>

          {/* Interactive Sliders for Dip Parameters */}
          <div className="bg-[#0d1117] border border-[#30363d] p-3 rounded-xl space-y-2.5 text-xs font-mono">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[#8b949e]">Feeder Short-Circuit I_sc:</span>
                <span className="font-bold text-[#38bdf8]">{customIscKa.toFixed(1)} kA</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="15.0"
                step="0.5"
                value={customIscKa}
                onChange={(e) => setCustomIscKa(parseFloat(e.target.value))}
                className="w-full accent-[#38bdf8] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[#8b949e]">Fault / Inrush Duration:</span>
                <span className="font-bold text-amber-400">{customDurationMs} ms</span>
              </div>
              <input
                type="range"
                min="50"
                max="2000"
                step="50"
                value={customDurationMs}
                onChange={(e) => setCustomDurationMs(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER TEACHING NOTE */}
      <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xl text-xs space-y-1 text-[#8b949e]">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#38bdf8]" />
          Industrial Plant Engineering Insight
        </div>
        <p className="text-[11px] leading-relaxed">
          When across-the-line Direct-On-Line (DOL) starting draws 6.5 pu current across weak utility transformers (I_sc &lt; 5 kA), voltage drops past 70%.
          Electromagnetic contactors lose magnetic holding torque (F_mag proportional to V²), chattering or violently dropping out within 20–30 ms.
          Using a Soft Starter reduces inrush to 3.0 pu, preserving SEMI F47 compliance and preventing plant line shutdowns!
        </p>
      </div>
    </div>
  );
};

export default BusDipView;
