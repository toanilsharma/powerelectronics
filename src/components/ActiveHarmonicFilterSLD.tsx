import React, { useState, useEffect } from 'react';
import { Zap, ShieldCheck, Activity, Cpu, Sliders, Play, Pause } from 'lucide-react';

export interface ActiveHarmonicFilterSLDProps {
  selectedLoadType: string;
  fundamentalAmp: number;
  apfEnabled: boolean;
  onToggleApf?: () => void;
  apfEfficiency?: number;
  passiveFilterEnabled: boolean;
  onTogglePassiveFilter?: () => void;
  tunedHarmonic?: number;
  inductanceLmH?: number;
  capacitanceuF?: number;
  frequencyHz?: number;
  activeCompliance: {
    thdPercent: number;
    tddPercent: number;
    fundamentalA: number;
    totalRmsA: number;
  };
  isCompliant: boolean;
}

export const ActiveHarmonicFilterSLD: React.FC<ActiveHarmonicFilterSLDProps> = ({
  selectedLoadType,
  fundamentalAmp,
  apfEnabled,
  onToggleApf,
  apfEfficiency = 95,
  passiveFilterEnabled,
  onTogglePassiveFilter,
  tunedHarmonic = 5,
  inductanceLmH = 1.8,
  capacitanceuF = 225,
  frequencyHz = 50,
  activeCompliance,
  isCompliant,
}) => {
  const [animOffset, setAnimOffset] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [selectedNode, setSelectedNode] = useState<string | null>('PCC');

  useEffect(() => {
    if (isPaused) return;
    let animationFrameId: number;
    const animate = () => {
      setAnimOffset((prev) => (prev + 1.2 * speed) % 100);
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused, speed]);

  // Derived current values for realistic physics representation
  const iFund = fundamentalAmp || 100;
  const thdDec = (activeCompliance?.thdPercent || 28) / 100;
  const iHarmTotal = iFund * thdDec;
  const apfInjectedCurrent = apfEnabled ? iHarmTotal * (apfEfficiency / 100) : 0;
  const netGridHarmonic = Math.max(0, iHarmTotal - apfInjectedCurrent * (passiveFilterEnabled ? 0.95 : 0.88));
  const effectiveGridTHD = (netGridHarmonic / iFund) * 100;
  const gridRms = Math.sqrt(iFund * iFund + netGridHarmonic * netGridHarmonic);

  return (
    <div className="w-full h-full flex flex-col bg-[#050b14] rounded-xl border border-slate-700/60 overflow-hidden shadow-2xl relative select-none font-sans">
      {/* TOP STATUS BAR & SIMULATION CONTROLS */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0c1424]/90 border-b border-slate-700/50 text-xs shrink-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-mono font-black text-cyan-300 uppercase tracking-wide flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Active Power Filter (APF) &amp; Grid Single Line Diagram (SLD)
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
            PCC: 415V 3Ø {frequencyHz}Hz
          </span>
        </div>

        {/* Speed Controls & Pause */}
        <div className="flex items-center gap-1.5 font-mono">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
              isPaused
                ? 'bg-amber-500 text-slate-950 shadow-md animate-pulse'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? 'RESUME' : 'FREEZE'}</span>
          </button>

          <div className="flex items-center bg-slate-900 rounded p-0.5 border border-slate-700 text-[10px]">
            {[0.2, 0.5, 1, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                  speed === s ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <div
            className={`px-2 py-0.5 rounded text-[10px] font-black border ${
              effectiveGridTHD <= 5
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/60'
                : 'bg-red-950/80 text-red-400 border-red-500/60 animate-pulse'
            }`}
          >
            GRID THD: {effectiveGridTHD.toFixed(1)}% {effectiveGridTHD <= 5 ? '(PASS IEEE 519)' : '(NON-COMPLIANT)'}
          </div>
        </div>
      </div>

      {/* SVG CANVAS */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-[radial-gradient(ellipse_at_top,#0e1e38_0%,#030712_100%)]">
        <svg
          viewBox="0 0 960 480"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="pccBusGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            <linearGradient id="apfBoxGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#082f49" />
              <stop offset="100%" stopColor="#031525" />
            </linearGradient>

            <linearGradient id="loadBoxGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#450a0a" />
              <stop offset="100%" stopColor="#1f0404" />
            </linearGradient>

            {/* Glow filters */}
            <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* =========================================================
              1. GRID UTILITY SOURCE & TRANSFORMER IMPEDANCE (Left)
              ========================================================= */}
          <g id="utility-grid-source" transform="translate(60, 110)">
            {/* Utility Generator / Transformer Icon */}
            <circle cx="0" cy="0" r="28" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
            <path
              d="M -16 0 Q -8 -14 0 0 Q 8 14 16 0"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />
            <text x="0" y="38" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              UTILITY 11kV
            </text>

            {/* Step Down Transformer Substation */}
            <circle cx="50" cy="0" r="16" fill="none" stroke="#60a5fa" strokeWidth="2" />
            <circle cx="70" cy="0" r="16" fill="none" stroke="#60a5fa" strokeWidth="2" />
            <text x="60" y="-22" fill="#93c5fd" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              XFMR 11kV/415V
            </text>

            {/* Grid Feeder Inductance Zs */}
            <path
              d="M 86 0 L 110 0 Q 115 -10 120 0 Q 125 -10 130 0 Q 135 -10 140 0 L 160 0"
              fill="none"
              stroke="#64748b"
              strokeWidth="2.5"
            />
            <text x="125" y="-12" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              Zs (Grid Impedance)
            </text>
          </g>

          {/* =========================================================
              2. PCC BUSBAR (Point of Common Coupling)
              ========================================================= */}
          <g id="pcc-busbar-section">
            {/* Horizontal 415V PCC Busbar */}
            <rect
              x="220"
              y="104"
              width="680"
              height="12"
              rx="4"
              fill="url(#pccBusGradient)"
              stroke="#7dd3fc"
              strokeWidth="1.5"
              filter="url(#glowCyan)"
              className="cursor-pointer"
              onClick={() => setSelectedNode('PCC')}
            />
            <text x="560" y="96" fill="#e0f2fe" fontSize="11" fontWeight="black" textAnchor="middle" fontFamily="monospace">
              POINT OF COMMON COUPLING (PCC BUSBAR: 415V, 50Hz, 3-PHASE 4-WIRE)
            </text>

            {/* PCC Measurement Probe Badge */}
            <g transform="translate(230, 60)">
              <rect x="0" y="0" width="130" height="34" rx="5" fill="#031525" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="8" y="14" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                PROBE: PCC BUS
              </text>
              <text x="8" y="27" fill="#ffffff" fontSize="10" fontWeight="black" fontFamily="monospace">
                Vpcc: 415.0 V | 50.0 Hz
              </text>
            </g>
          </g>

          {/* =========================================================
              3. CURRENT FLOW ARROWS ON PCC (Animated)
              ========================================================= */}
          {/* Grid incoming current arrow (Clean Sine: Green) */}
          <line
            x1="180"
            y1="110"
            x2="350"
            y2="110"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeDasharray="8 6"
            strokeDashoffset={-animOffset}
            filter="url(#glowGreen)"
          />
          {/* Grid Current Measurement CT */}
          <g transform="translate(270, 110)">
            <ellipse cx="0" cy="0" rx="6" ry="12" fill="none" stroke="#eab308" strokeWidth="2" />
            <text x="0" y="-16" fill="#facc15" fontSize="8" fontWeight="black" textAnchor="middle" fontFamily="monospace">
              CT-1 (Grid)
            </text>
          </g>

          {/* =========================================================
              4. BRANCH 1: HARMONIC GENERATING NON-LINEAR LOAD (Right, x=800)
              ========================================================= */}
          <g id="branch-load" transform="translate(800, 116)">
            {/* Feeder line down to load */}
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="100"
              stroke="#ef4444"
              strokeWidth="4"
              strokeDasharray="8 6"
              strokeDashoffset={animOffset}
              filter="url(#glowRed)"
            />
            {/* Load Current CT */}
            <ellipse cx="0" cy="40" rx="12" ry="6" fill="none" stroke="#eab308" strokeWidth="2" />
            <text x="18" y="44" fill="#facc15" fontSize="8" fontWeight="black" fontFamily="monospace">
              CT-2 (Load)
            </text>

            {/* Non-Linear Load Cubicle Box */}
            <rect
              x="-80"
              y="100"
              width="160"
              height="190"
              rx="8"
              fill="url(#loadBoxGrad)"
              stroke="#ef4444"
              strokeWidth="2"
              className="cursor-pointer"
              onClick={() => setSelectedNode('LOAD')}
            />
            <rect x="-70" y="110" width="140" height="20" rx="3" fill="#7f1d1d" />
            <text x="0" y="124" fill="#fecaca" fontSize="9.5" fontWeight="black" textAnchor="middle" fontFamily="monospace">
              NON-LINEAR LOAD: {selectedLoadType}
            </text>

            {/* Load Schematic Diagram inside box */}
            {selectedLoadType.includes('6-Pulse') || selectedLoadType.includes('SCR') ? (
              <g transform="translate(0, 150)">
                {/* 6-Pulse Graetz Bridge Symbol */}
                <rect x="-50" y="0" width="100" height="60" fill="#0f172a" stroke="#ef4444" strokeWidth="1.5" rx="4" />
                <path d="M -30 40 L -30 20 L -10 20 M -10 10 L 10 30 L -10 50 Z" fill="#ef4444" opacity="0.8" />
                <path d="M 30 20 L 30 40 L 10 40 M 10 50 L -10 30 L 10 10 Z" fill="#ef4444" opacity="0.8" />
                <text x="0" y="75" fill="#fca5a5" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  Harmonics: 5th, 7th, 11th, 13th
                </text>
              </g>
            ) : selectedLoadType.includes('VFD') ? (
              <g transform="translate(0, 150)">
                <rect x="-50" y="0" width="100" height="60" fill="#0f172a" stroke="#ef4444" strokeWidth="1.5" rx="4" />
                <text x="-25" y="24" fill="#38bdf8" fontSize="8" fontWeight="black">AC</text>
                <text x="-5" y="24" fill="#94a3b8" fontSize="8">→</text>
                <text x="8" y="24" fill="#ef4444" fontSize="8" fontWeight="black">DC</text>
                <text x="25" y="24" fill="#94a3b8" fontSize="8">→</text>
                <text x="0" y="44" fill="#10b981" fontSize="9" fontWeight="black" textAnchor="middle">PWM VFD</text>
                <text x="0" y="75" fill="#fca5a5" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  High di/dt Rectifier + Inverter
                </text>
              </g>
            ) : (
              <g transform="translate(0, 150)">
                <rect x="-50" y="0" width="100" height="60" fill="#0f172a" stroke="#ef4444" strokeWidth="1.5" rx="4" />
                <path d="M -35 30 L -10 30 L 10 15 L 35 15" stroke="#ef4444" strokeWidth="2" fill="none" />
                <text x="0" y="44" fill="#f87171" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  Switching SMPS
                </text>
                <text x="0" y="75" fill="#fca5a5" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  Harmonics: 3rd, 5th, 7th Triplens
                </text>
              </g>
            )}

            {/* Load Probe Display */}
            <g transform="translate(0, 240)">
              <rect x="-70" y="0" width="140" height="42" rx="4" fill="#090505" stroke="#ef4444" strokeWidth="1" />
              <text x="0" y="14" fill="#fca5a5" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                I_LOAD: {fundamentalAmp}A (Distorted)
              </text>
              <text x="0" y="27" fill="#ef4444" fontSize="9" fontWeight="black" textAnchor="middle" fontFamily="monospace">
                LOAD THD_i: {activeCompliance?.thdPercent?.toFixed(1) || '28.5'}%
              </text>
              <text x="0" y="38" fill="#94a3b8" fontSize="7.5" textAnchor="middle" fontFamily="monospace">
                Harmonic Current: {iHarmTotal.toFixed(1)} A
              </text>
            </g>
          </g>

          {/* =========================================================
              5. BRANCH 2: SHUNT ACTIVE POWER FILTER (APF) (Center-Left, x=420)
              ========================================================= */}
          <g id="branch-apf" transform="translate(420, 116)">
            {/* Feeder line connecting PCC to APF */}
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="100"
              stroke={apfEnabled ? '#00e5ff' : '#475569'}
              strokeWidth="4"
              strokeDasharray={apfEnabled ? '8 6' : 'none'}
              strokeDashoffset={-animOffset}
              filter={apfEnabled ? 'url(#glowCyan)' : 'none'}
            />

            {/* Coupling Inductor Lc */}
            <g transform="translate(0, 45)">
              <path
                d="M 0 -20 L 0 -12 Q -8 -6 0 0 Q -8 6 0 12 L 0 20"
                fill="none"
                stroke={apfEnabled ? '#00e5ff' : '#64748b'}
                strokeWidth="2.5"
              />
              <text x="12" y="4" fill="#38bdf8" fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                Lc (0.4mH)
              </text>
            </g>

            {/* APF Enclosure Box */}
            <rect
              x="-95"
              y="100"
              width="190"
              height="205"
              rx="8"
              fill="url(#apfBoxGrad)"
              stroke={apfEnabled ? '#00e5ff' : '#475569'}
              strokeWidth={apfEnabled ? 2.5 : 1.5}
              className="cursor-pointer"
              onClick={() => {
                if (onToggleApf) onToggleApf();
                setSelectedNode('APF');
              }}
            />

            {/* APF Header Bar with Toggle Button */}
            <rect x="-85" y="110" width="170" height="22" rx="3" fill={apfEnabled ? '#0369a1' : '#1e293b'} />
            <text x="0" y="125" fill="#ffffff" fontSize="9" fontWeight="black" textAnchor="middle" fontFamily="monospace">
              ⚡ SHUNT APF (INVERTER) {apfEnabled ? '[ACTIVE]' : '[STANDBY]'}
            </text>

            {/* APF Inverter Internal Topology (IGBT Bridge + DC Link Capacitor) */}
            <g transform="translate(0, 155)">
              {/* IGBT Bridge Graphic */}
              <rect x="-70" y="0" width="65" height="50" fill="#0b1322" stroke={apfEnabled ? '#38bdf8' : '#334155'} strokeWidth="1.5" rx="4" />
              <text x="-37" y="16" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">VSI BRIDGE</text>
              <path d="M -55 38 L -45 24 L -35 38 Z" fill={apfEnabled ? '#00e5ff' : '#475569'} />
              <path d="M -30 24 L -20 38 L -10 24 Z" fill={apfEnabled ? '#00e5ff' : '#475569'} />

              {/* DC Link Bulk Capacitor */}
              <rect x="10" y="0" width="60" height="50" fill="#0b1322" stroke={apfEnabled ? '#10b981' : '#334155'} strokeWidth="1.5" rx="4" />
              <text x="40" y="15" fill="#34d399" fontSize="7.5" fontWeight="bold" textAnchor="middle">DC LINK</text>
              <line x1="25" y1="26" x2="55" y2="26" stroke="#10b981" strokeWidth="2.5" />
              <line x1="25" y1="32" x2="55" y2="32" stroke="#10b981" strokeWidth="2.5" />
              <text x="40" y="44" fill="#a7f3d0" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Vdc: 750V
              </text>

              {/* Connecting DC Bus lines */}
              <line x1="-5" y1="18" x2="10" y2="18" stroke="#10b981" strokeWidth="1.5" />
              <line x1="-5" y1="38" x2="10" y2="38" stroke="#38bdf8" strokeWidth="1.5" />
            </g>

            {/* DSP Anti-Harmonic Injection Controller */}
            <g transform="translate(0, 225)">
              <rect x="-80" y="0" width="160" height="35" rx="4" fill="#041224" stroke="#0284c7" strokeWidth="1" />
              <text x="0" y="14" fill="#38bdf8" fontSize="8" fontWeight="black" textAnchor="middle" fontFamily="monospace">
                p-q THEORY / d-q FFT CONTROLLER
              </text>
              <text x="0" y="26" fill={apfEnabled ? '#34d399' : '#94a3b8'} fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {apfEnabled ? `Compensating ${apfEfficiency}% Harmonics` : 'Standby Mode (Zero Injection)'}
              </text>
            </g>

            {/* APF Injection Probe Badge */}
            <g transform="translate(0, 270)">
              <rect x="-80" y="0" width="160" height="26" rx="4" fill="#020c1b" stroke="#38bdf8" strokeWidth="1" />
              <text x="0" y="17" fill="#00e5ff" fontSize="9" fontWeight="black" textAnchor="middle" fontFamily="monospace">
                i_inj = -i_harm: {apfInjectedCurrent.toFixed(1)} A
              </text>
            </g>
          </g>

          {/* =========================================================
              6. BRANCH 3: PASSIVE LC TRAP FILTER (Center-Right, x=620)
              ========================================================= */}
          <g id="branch-passive-lc" transform="translate(620, 116)">
            {/* Feeder line */}
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="100"
              stroke={passiveFilterEnabled ? '#f59e0b' : '#475569'}
              strokeWidth="3.5"
              strokeDasharray={passiveFilterEnabled ? '6 4' : 'none'}
              strokeDashoffset={animOffset}
            />

            {/* LC Enclosure */}
            <rect
              x="-65"
              y="100"
              width="130"
              height="190"
              rx="8"
              fill="#181308"
              stroke={passiveFilterEnabled ? '#f59e0b' : '#475569'}
              strokeWidth={passiveFilterEnabled ? 2 : 1}
              className="cursor-pointer"
              onClick={() => {
                if (onTogglePassiveFilter) onTogglePassiveFilter();
                setSelectedNode('LC');
              }}
            />

            {/* Header */}
            <rect x="-55" y="110" width="110" height="20" rx="3" fill={passiveFilterEnabled ? '#78350f' : '#1e293b'} />
            <text x="0" y="124" fill="#fef08a" fontSize="8.5" fontWeight="black" textAnchor="middle" fontFamily="monospace">
              LC TRAP {passiveFilterEnabled ? '[ON]' : '[OFF]'}
            </text>

            {/* Inductor L_trap */}
            <g transform="translate(0, 145)">
              <rect x="-24" y="0" width="48" height="22" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" rx="3" />
              <text x="0" y="14" fill="#fbbf24" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                L: {inductanceLmH}mH
              </text>
            </g>

            {/* Capacitor C_trap */}
            <g transform="translate(0, 185)">
              <rect x="-24" y="0" width="48" height="22" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" rx="3" />
              <line x1="-15" y1="7" x2="15" y2="7" stroke="#fbbf24" strokeWidth="2" />
              <line x1="-15" y1="13" x2="15" y2="13" stroke="#fbbf24" strokeWidth="2" />
              <text x="0" y="32" fill="#fbbf24" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                C: {capacitanceuF}µF
              </text>
            </g>

            {/* LC Info Badge */}
            <g transform="translate(0, 240)">
              <rect x="-55" y="0" width="110" height="40" rx="4" fill="#0d0902" stroke="#d97706" strokeWidth="1" />
              <text x="0" y="14" fill="#fde68a" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                Tuned: {tunedHarmonic}th Harmonic
              </text>
              <text x="0" y="27" fill="#fbbf24" fontSize="8" fontWeight="black" textAnchor="middle" fontFamily="monospace">
                f0: {(tunedHarmonic * frequencyHz * 0.98).toFixed(0)} Hz
              </text>
              <text x="0" y="37" fill="#94a3b8" fontSize="7" textAnchor="middle" fontFamily="monospace">
                {passiveFilterEnabled ? 'Trapping Harmonic' : 'Disconnected'}
              </text>
            </g>
          </g>

          {/* =========================================================
              7. KCL MATHEMATICAL SUMMATION FORMULA CALLOUT
              ========================================================= */}
          <g id="kcl-summation-badge" transform="translate(480, 20)">
            <rect x="-220" y="0" width="440" height="32" rx="6" fill="#020c1b" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="0" y="14" fill="#38bdf8" fontSize="9" fontWeight="black" textAnchor="middle" fontFamily="monospace">
              KIRCHHOFF'S CURRENT LAW (KCL AT PCC SUMMATION NODE)
            </text>
            <text x="0" y="26" fill="#e2e8f0" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              i_grid(t) = i_load(t) + i_apf(t) + i_lc(t) ≈ <tspan fill="#10b981">I_fund • sin(ωt)</tspan>
            </text>
          </g>

          {/* Clean Grid Resulting Badge */}
          <g transform="translate(230, 140)">
            <rect x="0" y="0" width="130" height="34" rx="4" fill="#022c22" stroke="#10b981" strokeWidth="1.5" />
            <text x="8" y="14" fill="#34d399" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
              GRID CURRENT (KCL)
            </text>
            <text x="8" y="27" fill="#ffffff" fontSize="9.5" fontWeight="black" fontFamily="monospace">
              I_grid: {gridRms.toFixed(1)} A RMS
            </text>
          </g>
        </svg>
      </div>

      {/* BOTTOM EXPLANATORY TEACHING BANNER: SEE AND LEARN */}
      <div className="px-3 py-2 bg-[#080e1a] border-t border-slate-700/60 flex items-center justify-between text-xs shrink-0 font-mono">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/40">
            GREEN: Pure 50Hz Grid
          </span>
          <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 font-bold border border-red-500/40">
            RED: Distorted Load Current
          </span>
          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-bold border border-cyan-500/40">
            CYAN: APF Anti-Phase Injection
          </span>
          {passiveFilterEnabled && (
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 font-bold border border-amber-500/40">
              AMBER: LC Harmonic Sink
            </span>
          )}
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click APF or LC Cubicles to toggle states in real-time</span>
        </div>
      </div>
    </div>
  );
};
