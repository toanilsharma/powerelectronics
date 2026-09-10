import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Sliders,
  Info,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Activity,
  Maximize2,
  Clock,
  BarChart3,
  Compass,
  ZoomIn,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  X
} from 'lucide-react';
import {
  calculatePWMPhysics,
  calculateHarmonicSpectrum,
  HarmonicComponent
} from '../engine/PWMPhysicsEngine';

export interface PWMCarrierModulationLabProps {
  className?: string;
  onClose?: () => void;
}

export type CarrierLabTab =
  | 'comparator'
  | 'bipolar_unipolar'
  | 'dead_time'
  | 'overmodulation'
  | 'svpwm_hexagon'
  | 'fft_spectrum';

export const PWMCarrierModulationLab: React.FC<PWMCarrierModulationLabProps> = ({
  className = '',
  onClose
}) => {
  // Tab Navigation
  const [activeTab, setActiveTab] = useState<CarrierLabTab>('comparator');

  // Modulation Parameters
  const [modulationType, setModulationType] = useState<'spwm' | 'bipolar' | 'unipolar' | 'svpwm'>('bipolar');
  const [busVoltage, setBusVoltage] = useState<number>(400); // Vdc (V)
  const [pwmMa, setPwmMa] = useState<number>(0.85);          // Modulation Index Ma (0.05 to 1.50)
  const [pwmFc, setPwmFc] = useState<number>(5000);          // Carrier Frequency fc (Hz)
  const [pwmF1, setPwmF1] = useState<number>(50);            // Fundamental Frequency f1 (Hz)
  const [pwmDeadTime, setPwmDeadTime] = useState<number>(1.5); // Dead-time (us)
  const [loadR, setLoadR] = useState<number>(20);            // Load Resistance (Ohms)
  const [filterL, setFilterL] = useState<number>(2.0);       // Filter Inductance (mH)
  const [filterC, setFilterC] = useState<number>(20.0);      // Filter Capacitance (uF)

  // Time-Dilation Engine State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [simTime, setSimTime] = useState<number>(0);
  const [frozenTime, setFrozenTime] = useState<number>(0);
  const [timeSpeed, setTimeSpeed] = useState<number>(0.2); // 1.0x, 0.5x, 0.2x, 0.05x, 0.005x
  const [scopeZoom, setScopeZoom] = useState<number>(2);   // 1x, 2x, 5x, 10x
  const [hoveredHarmonic, setHoveredHarmonic] = useState<HarmonicComponent | null>(null);

  // Animation Loop
  const animRef = useRef<number | null>(null);
  const lastWallTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const loop = (wallNow: number) => {
      const dtRealSec = (wallNow - lastWallTimeRef.current) / 1000;
      lastWallTimeRef.current = wallNow;

      if (isPlaying && !isFrozen) {
        setSimTime((prev) => prev + dtRealSec * timeSpeed);
      }
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, isFrozen, timeSpeed]);

  const effectiveTime = isFrozen ? frozenTime : simTime;

  // Compute Active Physics
  const physics = calculatePWMPhysics({
    busVoltage,
    ma: pwmMa,
    fc: pwmFc,
    f1: pwmF1,
    deadTimeUs: pwmDeadTime,
    loadR,
    modulationType,
    filterL_mH: filterL,
    filterC_uF: filterC
  });

  const spectrum = calculateHarmonicSpectrum({
    busVoltage,
    ma: pwmMa,
    fc: pwmFc,
    f1: pwmF1,
    deadTimeUs: pwmDeadTime,
    loadR,
    modulationType,
    filterL_mH: filterL,
    filterC_uF: filterC
  });

  // Time-Dilation Controls
  const handleToggleFreeze = () => {
    if (!isFrozen) {
      setFrozenTime(simTime);
      setIsFrozen(true);
    } else {
      setIsFrozen(false);
    }
  };

  const handleMicroStep = (deltaUs: number) => {
    if (!isFrozen) {
      setFrozenTime(simTime + deltaUs * 1e-6);
      setIsFrozen(true);
    } else {
      setFrozenTime((prev) => Math.max(0, prev + deltaUs * 1e-6));
    }
  };

  const handleStepCarrierCycle = () => {
    const cycleSec = 1 / Math.max(10, pwmFc);
    if (!isFrozen) {
      setFrozenTime(simTime + cycleSec);
      setIsFrozen(true);
    } else {
      setFrozenTime((prev) => prev + cycleSec);
    }
  };

  const handlePhaseJump = (targetDeg: number) => {
    const periodSec = 1 / Math.max(1, pwmF1);
    const targetSec = (targetDeg / 360) * periodSec;
    const currentCycles = Math.floor(simTime / periodSec);
    const newT = currentCycles * periodSec + targetSec;
    setFrozenTime(newT);
    setIsFrozen(true);
  };

  // Instantaneous Signals
  const omega1 = 2 * Math.PI * pwmF1;
  const omegaC = 2 * Math.PI * pwmFc;
  const theta1 = (omega1 * effectiveTime) % (2 * Math.PI);
  const thetaDeg = ((theta1 * 180) / Math.PI).toFixed(1);

  // Carrier & Reference
  const vrefA = pwmMa * Math.sin(theta1);
  const vrefB = -vrefA; // Complementary for full-bridge

  const carrierNorm = 2 * Math.abs(2 * ((effectiveTime * pwmFc) % 1) - 1) - 1; // Triangle [-1, +1]

  // Gate States with Dead Time
  const deadTimeSec = pwmDeadTime * 1e-6;
  const isShootThrough = pwmDeadTime <= 0.05;

  let g1Upper = vrefA >= carrierNorm;
  let g2Lower = !g1Upper;

  if (isShootThrough) {
    g1Upper = true;
    g2Lower = true;
  }

  // Pole and Line Voltages
  let vPoleA = g1Upper && !g2Lower ? busVoltage / 2 : !g1Upper && g2Lower ? -busVoltage / 2 : 0;
  let vPoleB = 0;
  let vOutput = 0;

  if (modulationType === 'spwm') {
    vOutput = vPoleA;
  } else if (modulationType === 'bipolar') {
    vPoleB = -vPoleA;
    vOutput = vPoleA - vPoleB;
  } else if (modulationType === 'unipolar') {
    const g3Upper = vrefB >= carrierNorm;
    const g4Lower = !g3Upper;
    vPoleB = g3Upper && !g4Lower ? busVoltage / 2 : !g3Upper && g4Lower ? -busVoltage / 2 : 0;
    vOutput = vPoleA - vPoleB;
  } else {
    // SVPWM
    vOutput = physics.v1RmsNet * Math.SQRT2 * Math.sin(theta1);
  }

  // Industrial Presets
  const applyPreset = (preset: 'solar' | 'traction' | 'vfd' | 'overmod' | 'hazard') => {
    switch (preset) {
      case 'solar':
        setBusVoltage(400);
        setPwmMa(0.85);
        setPwmFc(16000);
        setPwmF1(50);
        setPwmDeadTime(1.2);
        setFilterL(2.5);
        setFilterC(25);
        setModulationType('unipolar');
        setActiveTab('bipolar_unipolar');
        break;
      case 'traction':
        setBusVoltage(800);
        setPwmMa(0.95);
        setPwmFc(8000);
        setPwmF1(60);
        setPwmDeadTime(2.0);
        setFilterL(1.5);
        setFilterC(50);
        setModulationType('svpwm');
        setActiveTab('svpwm_hexagon');
        break;
      case 'vfd':
        setBusVoltage(560);
        setPwmMa(0.30);
        setPwmFc(4000);
        setPwmF1(15);
        setPwmDeadTime(2.5);
        setFilterL(3.0);
        setFilterC(20);
        setModulationType('bipolar');
        setActiveTab('comparator');
        break;
      case 'overmod':
        setBusVoltage(400);
        setPwmMa(1.40);
        setPwmFc(5000);
        setPwmF1(50);
        setPwmDeadTime(1.5);
        setModulationType('bipolar');
        setActiveTab('overmodulation');
        break;
      case 'hazard':
        setBusVoltage(400);
        setPwmMa(0.90);
        setPwmFc(5000);
        setPwmDeadTime(0.0);
        setActiveTab('dead_time');
        break;
    }
  };

  return (
    <div className={`w-full flex flex-col bg-[#0b0f19] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl text-slate-200 font-sans ${className}`}>
      {/* 1. TOP HEADER & METADATA BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-[#0d1322] border-b border-[#1e293b]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white tracking-wide">
                PWM Carrier Modulation Workbench &amp; Multi-Topology Explorer
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-cyan-900/60 border border-cyan-500/40 text-cyan-300">
                Topic 6 Flagship Lab
              </span>
            </div>
            <p className="text-xs text-slate-400">
              IEEE Std 519 / IEC 60617 Microsecond SPWM, SVPWM Hexagon &amp; Shoot-Through Physics
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Presets Dropdown */}
          <div className="flex items-center gap-1 bg-[#161f30] px-2 py-1 rounded-lg border border-slate-700/60 text-xs">
            <span className="text-slate-400 text-[10px] uppercase font-bold mr-1">Presets:</span>
            <button
              onClick={() => applyPreset('solar')}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-900/40 hover:bg-amber-800/60 text-amber-300 transition"
              title="Grid-Tied Solar Inverter"
            >
              ☀️ Solar
            </button>
            <button
              onClick={() => applyPreset('traction')}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 transition"
              title="EV Traction Inverter (SVPWM)"
            >
              🚗 EV
            </button>
            <button
              onClick={() => applyPreset('overmod')}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 transition"
              title="Overmodulation Pulse Dropping"
            >
              💥 Overmod
            </button>
            <button
              onClick={() => applyPreset('hazard')}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-900/40 hover:bg-rose-800/60 text-rose-300 transition"
              title="Shoot-Through Cross-Conduction"
            >
              ⚠️ Trip
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Close Workbench"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. TIME-DILATION & STEPPING HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-[#090d16] border-b border-[#1b2333] text-xs">
        {/* Play / Pause / Freeze */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-all shadow-md ${
              isPlaying
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'RUNNING' : 'PAUSED'}</span>
          </button>

          <button
            onClick={handleToggleFreeze}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-all border ${
              isFrozen
                ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-lg shadow-sky-500/40 animate-pulse'
                : 'bg-[#131b2c] hover:bg-[#1c273e] text-sky-400 border-sky-500/40'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isFrozen ? '❄️ FROZEN (SCRUB)' : '⏸ FREEZE'}</span>
          </button>

          {/* Dilation Multipliers */}
          <div className="flex items-center gap-1 bg-[#111726] p-0.5 rounded-lg border border-slate-700/50">
            {([1.0, 0.5, 0.2, 0.05, 0.005] as const).map((spd) => (
              <button
                key={spd}
                onClick={() => {
                  setTimeSpeed(spd);
                  if (isFrozen) setIsFrozen(false);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition ${
                  timeSpeed === spd && !isFrozen
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Microsecond Precision Stepping */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">µs Stepper:</span>
          <button
            onClick={() => handleMicroStep(-10)}
            className="px-1.5 py-0.5 rounded bg-[#162033] hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-mono text-[11px]"
          >
            -10µs
          </button>
          <button
            onClick={() => handleMicroStep(-1)}
            className="px-1.5 py-0.5 rounded bg-[#162033] hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-mono text-[11px]"
          >
            -1µs
          </button>
          <button
            onClick={() => handleMicroStep(1)}
            className="px-1.5 py-0.5 rounded bg-[#162033] hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-mono text-[11px]"
          >
            +1µs
          </button>
          <button
            onClick={() => handleMicroStep(10)}
            className="px-1.5 py-0.5 rounded bg-[#162033] hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-mono text-[11px]"
          >
            +10µs
          </button>
          <button
            onClick={handleStepCarrierCycle}
            className="px-2 py-0.5 rounded bg-indigo-900/50 hover:bg-indigo-700/60 text-indigo-300 border border-indigo-500/40 font-mono text-[11px] font-bold"
            title="Advance exactly 1 carrier period"
          >
            +1 Cycle ({(1e6 / pwmFc).toFixed(0)}µs)
          </button>
        </div>

        {/* Phase Angle Snaps */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phase Jump:</span>
          <button
            onClick={() => handlePhaseJump(0)}
            className="px-1.5 py-0.5 rounded bg-[#131b2c] text-slate-300 hover:text-white text-[10px] font-mono border border-slate-700"
          >
            0°
          </button>
          <button
            onClick={() => handlePhaseJump(90)}
            className="px-1.5 py-0.5 rounded bg-[#131b2c] text-slate-300 hover:text-white text-[10px] font-mono border border-slate-700"
          >
            90° (Pk)
          </button>
          <button
            onClick={() => handlePhaseJump(180)}
            className="px-1.5 py-0.5 rounded bg-[#131b2c] text-slate-300 hover:text-white text-[10px] font-mono border border-slate-700"
          >
            180°
          </button>
          <button
            onClick={() => handlePhaseJump(270)}
            className="px-1.5 py-0.5 rounded bg-[#131b2c] text-slate-300 hover:text-white text-[10px] font-mono border border-slate-700"
          >
            270°
          </button>
        </div>
      </div>

      {/* 3. SIX SPECIALIZED OPERATING TABS */}
      <div className="flex items-center gap-1 px-4 py-2 bg-[#0c111c] border-b border-[#1b2333] overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('comparator')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'comparator'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'bg-[#131b2c] text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>🔬 DUAL CARRIER SCOPE</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('bipolar_unipolar');
            setModulationType('unipolar');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'bipolar_unipolar'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-[#131b2c] text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>⚡ BIPOLAR VS UNIPOLAR 3-LEVEL</span>
        </button>

        <button
          onClick={() => setActiveTab('dead_time')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'dead_time'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'bg-[#131b2c] text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>🛑 DEAD-TIME &amp; SHOOT-THROUGH</span>
        </button>

        <button
          onClick={() => setActiveTab('overmodulation')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'overmodulation'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'bg-[#131b2c] text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>📈 OVERMODULATION &amp; TRANSFER</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('svpwm_hexagon');
            setModulationType('svpwm');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'svpwm_hexagon'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'bg-[#131b2c] text-slate-400 hover:text-white'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>🔯 SVPWM HEXAGON PLANE</span>
        </button>

        <button
          onClick={() => setActiveTab('fft_spectrum')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'fft_spectrum'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'bg-[#131b2c] text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>📊 FFT HARMONICS &amp; IEEE 519</span>
        </button>
      </div>

      {/* 4. MAIN INTERACTIVE VISUAL DISPLAY AREA */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Visual Stage Container (7 Cols on LG) */}
        <div className="lg:col-span-8 flex flex-col bg-[#080d16] rounded-xl border border-[#1b2333] p-3 shadow-inner min-h-[380px]">
          {/* TAB 1: DUAL CARRIER MODULATION SCOPE */}
          {activeTab === 'comparator' && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" />
                  Dual-Trace Microsecond Oscilloscope (fc = {pwmFc} Hz, period = {(1e6 / pwmFc).toFixed(0)}µs)
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  θ = {thetaDeg}° | vref = {vrefA.toFixed(3)} | vtri = {carrierNorm.toFixed(3)}
                </span>
              </div>

              {/* Dynamic Oscilloscope SVG */}
              <div className="relative flex-1 w-full mt-2 bg-[#050911] rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center min-h-[280px]">
                <svg viewBox="0 0 800 300" className="w-full h-full">
                  <defs>
                    <pattern id="scopeGrid" width="40" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#142033" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="800" height="300" fill="#060b14" />
                  <rect width="800" height="300" fill="url(#scopeGrid)" />

                  {/* Horizontal Center Lines */}
                  <line x1="0" y1="90" x2="800" y2="90" stroke="#1f2d47" strokeDasharray="3 3" />
                  <line x1="0" y1="210" x2="800" y2="210" stroke="#1f2d47" strokeDasharray="3 3" />

                  {/* Top Scope: vref vs vtri */}
                  <text x="15" y="25" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace">
                    CH1: vref(t) [CYAN] vs vtri(t) [AMBER] (Modulation Zone)
                  </text>

                  {/* Draw carrier triangles */}
                  {Array.from({ length: 16 }).map((_, i) => {
                    const xStart = i * 50;
                    const xMid = xStart + 25;
                    const xEnd = xStart + 50;
                    return (
                      <polyline
                        key={i}
                        points={`${xStart},140 ${xMid},40 ${xEnd},140`}
                        fill="none"
                        stroke="#eab308"
                        strokeWidth="1.8"
                        strokeOpacity="0.85"
                      />
                    );
                  })}

                  {/* Draw reference sine wave */}
                  <path
                    d={`M 0,${90 - 50 * pwmMa * Math.sin(theta1)} Q 200,${90 - 50 * pwmMa * Math.sin(theta1 + 0.5)} 400,${90 - 50 * pwmMa * Math.sin(theta1 + 1.0)} T 800,${90 - 50 * pwmMa * Math.sin(theta1 + 2.0)}`}
                    fill="none"
                    stroke="#00f0ff"
                    strokeWidth="3"
                  />

                  {/* Live Intersection / Crossing Needle */}
                  <line
                    x1="400"
                    y1="30"
                    x2="400"
                    y2="150"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                  <circle cx="400" cy={90 - 50 * vrefA} r="5" fill="#f43f5e" />

                  {/* Bottom Scope: Gate Pulses G1, G2 & Pole Voltage */}
                  <text x="15" y="175" fill="#4ade80" fontSize="11" fontWeight="bold" fontFamily="monospace">
                    CH2: Upper Gate G1 (Green) | Lower Gate G2 (Amber) | Dead-Time Gap t_dead = {pwmDeadTime}µs
                  </text>

                  {/* G1 Pulse Train */}
                  {Array.from({ length: 8 }).map((_, i) => {
                    const pulseW = Math.max(10, 40 * ((vrefA + 1) / 2));
                    const x = i * 100 + 10;
                    return (
                      <g key={i}>
                        {/* Upper Gate G1 */}
                        <rect x={x} y="190" width={pulseW} height="25" fill="#22c55e" opacity="0.8" rx="2" />
                        {/* Dead Time Gap (Amber Shading) */}
                        <rect x={x + pulseW} y="190" width="8" height="55" fill="#f59e0b" opacity="0.6" />
                        {/* Lower Gate G2 */}
                        <rect x={x + pulseW + 8} y="225" width={100 - pulseW - 16} height="25" fill="#0ea5e9" opacity="0.8" rx="2" />
                      </g>
                    );
                  })}
                </svg>

                {/* Dead-Time Callout Overlay */}
                <div className="absolute bottom-2 left-3 bg-[#0d1524]/90 px-3 py-1.5 rounded-md border border-amber-500/50 text-[11px] text-amber-300 font-mono flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    Dead-Band: {pwmDeadTime.toFixed(1)} µs blanking prevents shoot-through short circuit
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BIPOLAR VS UNIPOLAR 3-LEVEL BENCHMARK */}
          {activeTab === 'bipolar_unipolar' && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Bipolar (2-Level ±Vdc) vs Unipolar (3-Level +Vdc, 0, -Vdc) Topology Split
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  Active Mode: <strong className="text-white uppercase">{modulationType}</strong>
                </span>
              </div>

              {/* Topology Comparison Canvas */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {/* Bipolar Panel */}
                <div
                  onClick={() => setModulationType('bipolar')}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    modulationType === 'bipolar'
                      ? 'bg-[#0f172a] border-cyan-500 shadow-lg shadow-cyan-500/20'
                      : 'bg-[#080d16] border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-300 text-xs">FULL-BRIDGE BIPOLAR (2-LEVEL)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-300 font-mono">
                      Ripple @ fc ({pwmFc} Hz)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Switches A+ and B- fire simultaneously. Line-to-line output voltage toggles strictly between <strong>+{busVoltage}V</strong> and <strong>-{busVoltage}V</strong>.
                  </p>
                  <div className="h-28 bg-[#040711] rounded border border-slate-800 mt-2 flex items-center justify-center relative">
                    <svg viewBox="0 0 300 80" className="w-full h-full">
                      <path d="M 0,40 L 300,40" stroke="#1f293d" strokeDasharray="2 2" />
                      <polyline
                        points="10,15 50,15 50,65 100,65 100,15 150,15 150,65 200,65 200,15 250,15 250,65 290,65"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2.5"
                      />
                    </svg>
                    <span className="absolute top-1 left-2 text-[10px] font-mono text-cyan-400">+Vdc</span>
                    <span className="absolute bottom-1 left-2 text-[10px] font-mono text-cyan-400">-Vdc</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-300 space-y-0.5">
                    <div>• Harmonic Ripple: High amplitude at carrier frequency fc.</div>
                    <div>• Inductor Size: Requires large choke L to filter {pwmFc} Hz ripple.</div>
                  </div>
                </div>

                {/* Unipolar Panel */}
                <div
                  onClick={() => setModulationType('unipolar')}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    modulationType === 'unipolar'
                      ? 'bg-[#0f172a] border-emerald-500 shadow-lg shadow-emerald-500/20'
                      : 'bg-[#080d16] border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 text-xs">FULL-BRIDGE UNIPOLAR (3-LEVEL)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 font-mono">
                      Ripple @ 2fc ({pwmFc * 2} Hz)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Phase-shifted modulation creates a <strong>0V zero-freewheel state</strong> (+Vdc, 0, -Vdc). Carrier ripple frequency effectively doubles to <strong>2fc</strong>.
                  </p>
                  <div className="h-28 bg-[#040711] rounded border border-slate-800 mt-2 flex items-center justify-center relative">
                    <svg viewBox="0 0 300 80" className="w-full h-full">
                      <path d="M 0,40 L 300,40" stroke="#1f293d" strokeDasharray="2 2" />
                      <polyline
                        points="10,15 40,15 40,40 70,40 70,15 100,15 100,40 130,40 130,65 170,65 170,40 200,40 200,65 240,65 240,40 290,40"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                      />
                    </svg>
                    <span className="absolute top-1 left-2 text-[10px] font-mono text-emerald-400">+Vdc</span>
                    <span className="absolute top-8 left-2 text-[10px] font-mono text-emerald-300">0V</span>
                    <span className="absolute bottom-1 left-2 text-[10px] font-mono text-emerald-400">-Vdc</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-300 space-y-0.5">
                    <div>• Harmonic Cancellation: 1st carrier group at fc canceled to 0V.</div>
                    <div>• Inductor Size: Filter size cut by ~4x due to 2fc doubling.</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DEAD-TIME & SHOOT-THROUGH INTERLOCK */}
          {activeTab === 'dead_time' && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-rose-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Dead-Time Insertion &amp; Shoot-Through Interlock Protection
                </span>
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${isShootThrough ? 'bg-rose-950 border border-rose-500 text-rose-400 animate-pulse' : 'bg-emerald-950 text-emerald-400'}`}>
                  {isShootThrough ? '⚠️ BREAKER TRIPPED (Isc > 2000A)' : '✅ SAFE INTERLOCK ACTIVE'}
                </span>
              </div>

              <div className="mt-3 flex-1 flex flex-col justify-between">
                {isShootThrough ? (
                  <div className="p-4 bg-rose-950/40 border-2 border-rose-500/80 rounded-xl text-center flex flex-col items-center justify-center gap-2">
                    <AlertTriangle className="w-12 h-12 text-rose-500 animate-bounce" />
                    <h3 className="text-base font-black text-rose-400">CATASTROPHIC CROSS-CONDUCTION SHOOT-THROUGH!</h3>
                    <p className="text-xs text-rose-200 max-w-lg">
                      Dead-time was reduced below MOSFET turn-off time (t_dead = {pwmDeadTime}µs &lt; 0.1µs). Both Upper and Lower MOSFETs conducted simultaneously, forming a 0Ω crowbar short across the {busVoltage}V DC bus rail.
                    </p>
                    <div className="font-mono text-xs text-amber-300 mt-2 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-rose-500/40">
                      Calculated Fault Current: I_sc = Vdc / (2·R_on) = {busVoltage}V / 0.08Ω = <strong>{(busVoltage / 0.08).toFixed(0)} A</strong>
                    </div>
                    <button
                      onClick={() => setPwmDeadTime(1.5)}
                      className="mt-3 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-lg"
                    >
                      RESET BREAKER &amp; RESTORE 1.5µs DEAD-TIME
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-bold">Dead-Time Counter-EMF Distortion (ΔVdt):</span>
                      <span className="text-amber-400 font-mono font-extrabold">
                        {(4 * pwmFc * (pwmDeadTime * 1e-6) * busVoltage).toFixed(2)} V Loss
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      During dead-time, both switches are OFF, forcing inductive load current to freewheel through anti-parallel diodes. This causes an output voltage error proportional to carrier frequency:
                    </p>
                    <div className="p-2 bg-[#050912] rounded border border-slate-800 font-mono text-center text-xs text-cyan-300">
                      ΔV_out = sign(i_out) · 4 · f_c · t_dead · V_dc
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
                      <div className="p-2 bg-slate-800/50 rounded">
                        <div className="text-slate-400 text-[10px]">t_dead</div>
                        <div className="font-bold text-white">{pwmDeadTime.toFixed(1)} µs</div>
                      </div>
                      <div className="p-2 bg-slate-800/50 rounded">
                        <div className="text-slate-400 text-[10px]">MOSFET Fall Time (tf)</div>
                        <div className="font-bold text-emerald-400">0.25 µs</div>
                      </div>
                      <div className="p-2 bg-slate-800/50 rounded">
                        <div className="text-slate-400 text-[10px]">Safety Margin</div>
                        <div className="font-bold text-cyan-400">{(pwmDeadTime - 0.25).toFixed(2)} µs</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: OVERMODULATION & TRANSFER CHARACTERISTIC */}
          {activeTab === 'overmodulation' && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-purple-400 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4" />
                  Overmodulation &amp; Square-Wave Transition (Ma = {pwmMa.toFixed(2)})
                </span>
                <span className="font-mono text-xs font-bold text-amber-300">
                  {pwmMa <= 1.0
                    ? '🟢 LINEAR RANGE (Ma ≤ 1.0)'
                    : pwmMa < 3.24
                    ? '🟡 OVERMODULATION ZONE 1 (PULSE-DROPPING)'
                    : '🔴 SIX-STEP SQUARE-WAVE LIMIT'}
                </span>
              </div>

              {/* Transfer Curve Canvas */}
              <div className="flex-1 mt-2 bg-[#050812] rounded-lg border border-slate-800 p-2 flex flex-col justify-between">
                <svg viewBox="0 0 500 200" className="w-full h-44">
                  {/* Grid Lines */}
                  <line x1="50" y1="20" x2="50" y2="170" stroke="#1f293d" />
                  <line x1="50" y1="170" x2="480" y2="170" stroke="#1f293d" />
                  <line x1="220" y1="20" x2="220" y2="170" stroke="#334155" strokeDasharray="3 3" />

                  {/* Zone Labels */}
                  <text x="100" y="30" fill="#06b6d4" fontSize="10" fontFamily="monospace">Linear (Ma ≤ 1)</text>
                  <text x="260" y="30" fill="#eab308" fontSize="10" fontFamily="monospace">Overmodulation</text>
                  <text x="390" y="30" fill="#f43f5e" fontSize="10" fontFamily="monospace">Square-Wave</text>

                  {/* Theoretical Transfer Curve V1 vs Ma */}
                  <path
                    d="M 50,170 L 220,95 Q 350,55 450,50"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="3"
                  />

                  {/* Dynamic Operating Point Dot */}
                  {(() => {
                    const dotX = Math.min(450, 50 + (pwmMa / 1.5) * 255);
                    const dotY = pwmMa <= 1.0 ? 170 - pwmMa * 75 : 95 - (pwmMa - 1.0) * 45;
                    return (
                      <g>
                        <circle cx={dotX} cy={dotY} r="6" fill="#f43f5e" className="animate-ping" opacity="0.4" />
                        <circle cx={dotX} cy={dotY} r="5" fill="#f43f5e" />
                      </g>
                    );
                  })()}
                </svg>

                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1 border-t border-slate-800">
                  <div className="p-1 bg-slate-900/60 rounded">
                    <span className="text-slate-400 text-[10px]">V1(rms) Output:</span>
                    <div className="font-bold text-cyan-300">{physics.v1RmsNet.toFixed(1)} V</div>
                  </div>
                  <div className="p-1 bg-slate-900/60 rounded">
                    <span className="text-slate-400 text-[10px]">Square-Wave Peak:</span>
                    <div className="font-bold text-purple-300">{(0.4502 * busVoltage).toFixed(1)} V</div>
                  </div>
                  <div className="p-1 bg-slate-900/60 rounded">
                    <span className="text-slate-400 text-[10px]">THD Penalty:</span>
                    <div className="font-bold text-amber-300">{physics.thdTotalV.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SPACE VECTOR PWM (SVPWM) HEXAGON PLANE */}
          {activeTab === 'svpwm_hexagon' && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Compass className="w-4 h-4" />
                  Complex α-β Voltage Vector Hexagon (+15.5% DC Voltage Utilization Boost)
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  Sector {Math.floor(theta1 / (Math.PI / 3)) + 1}
                </span>
              </div>

              <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-4 mt-2">
                {/* SVG Hexagon Plane */}
                <div className="w-64 h-64 relative flex items-center justify-center bg-[#050812] rounded-xl border border-slate-800">
                  <svg viewBox="0 0 300 300" className="w-full h-full">
                    {/* Hexagon Outline */}
                    <polygon
                      points="250,150 200,63 100,63 50,150 100,237 200,237"
                      fill="none"
                      stroke="#334155"
                      strokeWidth="2"
                    />
                    {/* Active Vectors V1 to V6 */}
                    <line x1="150" y1="150" x2="250" y2="150" stroke="#0ea5e9" strokeWidth="2" />
                    <line x1="150" y1="150" x2="200" y2="63" stroke="#0ea5e9" strokeWidth="2" />
                    <line x1="150" y1="150" x2="100" y2="63" stroke="#0ea5e9" strokeWidth="2" />
                    <line x1="150" y1="150" x2="50" y2="150" stroke="#0ea5e9" strokeWidth="2" />
                    <line x1="150" y1="150" x2="100" y2="237" stroke="#0ea5e9" strokeWidth="2" />
                    <line x1="150" y1="150" x2="200" y2="237" stroke="#0ea5e9" strokeWidth="2" />

                    {/* Rotating Reference Vector V* */}
                    {(() => {
                      const vMag = Math.min(95, 80 * pwmMa);
                      const vx = 150 + vMag * Math.cos(theta1);
                      const vy = 150 - vMag * Math.sin(theta1);
                      return (
                        <g>
                          <line x1="150" y1="150" x2={vx} y2={vy} stroke="#f59e0b" strokeWidth="3.5" />
                          <circle cx={vx} cy={vy} r="5" fill="#f59e0b" />
                        </g>
                      );
                    })()}

                    {/* Inscribed Maximum Linear SPWM Circle */}
                    <circle cx="150" cy="150" r="75" fill="none" stroke="#38bdf8" strokeDasharray="3 3" opacity="0.6" />
                    {/* Maximum SVPWM Circle (Touches Hexagon Sides at r = 86.6) */}
                    <circle cx="150" cy="150" r="86.6" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.8" />
                  </svg>
                </div>

                {/* Hexagon Math & Dwell Decomposition */}
                <div className="flex-1 space-y-2 text-xs font-mono">
                  <div className="p-2.5 bg-slate-900/70 border border-slate-800 rounded-lg">
                    <span className="text-amber-300 font-bold">Volt-Second Decomposition:</span>
                    <div className="text-[11px] text-slate-300 mt-1">
                      V* · Ts = V_α · Ta + V_β · Tb + V_0 · T0
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-900/70 border border-slate-800 rounded-lg space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">SPWM Max Linear V_pk:</span>
                      <span className="text-cyan-300">Vdc / 2 = {(busVoltage / 2).toFixed(1)} V</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">SVPWM Max Linear V_pk:</span>
                      <span className="text-emerald-300">Vdc / √3 = {(busVoltage / Math.sqrt(3)).toFixed(1)} V</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-1">
                      <span className="text-amber-400 font-bold">DC Bus Boost Ratio:</span>
                      <span className="text-amber-300 font-bold">2 / √3 = 1.155 (+15.5%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DISCRETE FFT HARMONIC SPECTRUM & IEEE 519 */}
          {activeTab === 'fft_spectrum' && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4" />
                  Discrete Harmonic Spectrum (h = 1 to 52) &amp; IEEE 519 Compliance
                </span>
                <span className="font-mono text-xs text-slate-400">
                  THD_v = <strong className={spectrum.thdPct <= 5.0 ? 'text-emerald-400' : 'text-rose-400'}>{spectrum.thdPct.toFixed(2)}%</strong> (Limit: 5.0%)
                </span>
              </div>

              {/* SVG Harmonic Bar Chart */}
              <div className="flex-1 mt-2 bg-[#050812] rounded-lg border border-slate-800 p-2 relative flex flex-col justify-between">
                <svg viewBox="0 0 600 160" className="w-full h-36">
                  {/* IEEE 519 5% Threshold Line */}
                  <line x1="30" y1="120" x2="590" y2="120" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 2" />
                  <text x="500" y="115" fill="#f43f5e" fontSize="9" fontFamily="monospace">IEEE 519 Limit (5%)</text>

                  {/* Harmonic Bars */}
                  {spectrum.harmonics.slice(0, 48).map((h, i) => {
                    const barHeight = Math.min(130, h.vPctOfFund * 1.3);
                    const x = 35 + i * 11.5;
                    const y = 145 - barHeight;
                    const isOverLimit = h.vPctOfFund > 5.0 && h.order > 1;

                    return (
                      <g
                        key={h.order}
                        onMouseEnter={() => setHoveredHarmonic(h)}
                        onMouseLeave={() => setHoveredHarmonic(null)}
                        className="cursor-pointer"
                      >
                        <rect
                          x={x}
                          y={y}
                          width="8"
                          height={barHeight}
                          fill={
                            h.order === 1
                              ? '#06b6d4'
                              : isOverLimit
                              ? '#f43f5e'
                              : h.order < 15
                              ? '#f59e0b'
                              : '#38bdf8'
                          }
                          rx="1"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Hover Details Ribbon */}
                <div className="h-6 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800 px-2">
                  {hoveredHarmonic ? (
                    <span className="text-cyan-300">
                      Harmonic h = {hoveredHarmonic.order} ({hoveredHarmonic.frequencyHz} Hz): {hoveredHarmonic.amplitude_pct.toFixed(2)}% of Fundamental ({hoveredHarmonic.voltageRms.toFixed(1)} Vrms) — {hoveredHarmonic.description}
                    </span>
                  ) : (
                    <span>Hover over any harmonic bar to inspect order, frequency, RMS voltage, and sideband origin.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CONTROLS & PRECISION STEPPERS (5 Cols on LG) */}
        <div className="lg:col-span-4 flex flex-col gap-3 bg-[#0c121e] rounded-xl border border-[#1b2333] p-3 shadow-inner">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-xs font-bold text-white">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              PRECISION PARAMETER CONTROLS
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Real-Time Sync</span>
          </div>

          {/* Modulation Index Ma */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Modulation Index (Ma):</span>
              <span className="font-mono font-bold text-cyan-300">{pwmMa.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPwmMa((v) => Math.max(0.05, +(v - 0.05).toFixed(2)))}
                className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold flex items-center justify-center text-xs"
              >
                -
              </button>
              <input
                type="range"
                min="0.05"
                max="1.50"
                step="0.01"
                value={pwmMa}
                onChange={(e) => setPwmMa(parseFloat(e.target.value))}
                className="flex-1 accent-cyan-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <button
                onClick={() => setPwmMa((v) => Math.min(1.50, +(v + 0.05).toFixed(2)))}
                className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold flex items-center justify-center text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Carrier Frequency fc */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Carrier Freq (fc):</span>
              <span className="font-mono font-bold text-amber-300">{pwmFc} Hz</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPwmFc((v) => Math.max(1000, v - 500))}
                className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold flex items-center justify-center text-xs"
              >
                -
              </button>
              <input
                type="range"
                min="1000"
                max="20000"
                step="500"
                value={pwmFc}
                onChange={(e) => setPwmFc(parseInt(e.target.value))}
                className="flex-1 accent-amber-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <button
                onClick={() => setPwmFc((v) => Math.min(20000, v + 500))}
                className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold flex items-center justify-center text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Dead-Time t_dead */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Dead-Time (t_dead):</span>
              <span className={`font-mono font-bold ${pwmDeadTime <= 0.05 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                {pwmDeadTime.toFixed(1)} µs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPwmDeadTime((v) => Math.max(0.0, +(v - 0.2).toFixed(1)))}
                className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold flex items-center justify-center text-xs"
              >
                -
              </button>
              <input
                type="range"
                min="0.0"
                max="5.0"
                step="0.1"
                value={pwmDeadTime}
                onChange={(e) => setPwmDeadTime(parseFloat(e.target.value))}
                className="flex-1 accent-emerald-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <button
                onClick={() => setPwmDeadTime((v) => Math.min(5.0, +(v + 0.2).toFixed(1)))}
                className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold flex items-center justify-center text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* DC Bus Voltage Vdc */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">DC Bus Rail (Vdc):</span>
              <span className="font-mono font-bold text-sky-300">{busVoltage} V</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBusVoltage((v) => Math.max(48, v - 20))}
                className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold flex items-center justify-center text-xs"
              >
                -
              </button>
              <input
                type="range"
                min="48"
                max="800"
                step="10"
                value={busVoltage}
                onChange={(e) => setBusVoltage(parseInt(e.target.value))}
                className="flex-1 accent-sky-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <button
                onClick={() => setBusVoltage((v) => Math.min(800, v + 20))}
                className="w-6 h-6 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold flex items-center justify-center text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Filter Choke L and Cap C */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block">Inductor Lf:</span>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="10.0"
                value={filterL}
                onChange={(e) => setFilterL(parseFloat(e.target.value) || 1.0)}
                className="w-full bg-[#050811] text-xs font-mono font-bold text-white px-2 py-1 rounded border border-slate-700"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Capacitor Cf:</span>
              <input
                type="number"
                step="5"
                min="5"
                max="100"
                value={filterC}
                onChange={(e) => setFilterC(parseFloat(e.target.value) || 5.0)}
                className="w-full bg-[#050811] text-xs font-mono font-bold text-white px-2 py-1 rounded border border-slate-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. TEN-BADGE HIGH-DENSITY INDUSTRIAL TELEMETRY BAR */}
      <div className="px-4 py-2.5 bg-[#070b14] border-t border-[#1b2333] grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 text-center text-xs">
        <div className="p-1.5 bg-[#0e1524] rounded-lg border border-slate-800/80">
          <div className="text-[9px] text-slate-400 font-mono">STATUS</div>
          <div className={`font-bold text-[11px] truncate ${isShootThrough ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isShootThrough ? 'TRIPPED' : 'NORMAL'}
          </div>
        </div>

        <div className="p-1.5 bg-[#0e1524] rounded-lg border border-slate-800/80">
          <div className="text-[9px] text-slate-400 font-mono">V1(rms)</div>
          <div className="font-bold text-[11px] text-cyan-300 truncate">{physics.v1RmsNet.toFixed(1)} V</div>
        </div>

        <div className="p-1.5 bg-[#0e1524] rounded-lg border border-slate-800/80">
          <div className="text-[9px] text-slate-400 font-mono">I1(rms)</div>
          <div className="font-bold text-[11px] text-white truncate">{(physics.v1RmsNet / loadR).toFixed(1)} A</div>
        </div>

        <div className="p-1.5 bg-[#0e1524] rounded-lg border border-slate-800/80">
          <div className="text-[9px] text-slate-400 font-mono">P_OUT</div>
          <div className="font-bold text-[11px] text-emerald-300 truncate">{physics.pOutWatts.toFixed(0)} W</div>
        </div>

        <div className="p-1.5 bg-[#0e1524] rounded-lg border border-slate-800/80">
          <div className="text-[9px] text-slate-400 font-mono">THD_v</div>
          <div className={`font-bold text-[11px] truncate ${physics.thdTotalV <= 5.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {physics.thdTotalV.toFixed(2)}%
          </div>
        </div>

        <div className="p-1.5 bg-[#0e1524] rounded-lg border border-slate-800/80">
          <div className="text-[9px] text-slate-400 font-mono">f0 CUTOFF</div>
          <div className="font-bold text-[11px] text-indigo-300 truncate">{physics.filterCutoffHz.toFixed(0)} Hz</div>
        </div>

        <div className="p-1.5 bg-[#0e1524] rounded-lg border border-slate-800/80">
          <div className="text-[9px] text-slate-400 font-mono">P_SW LOSS</div>
          <div className="font-bold text-[11px] text-amber-300 truncate">{physics.pSwWatts.toFixed(1)} W</div>
        </div>

        <div className="p-1.5 bg-[#0e1524] rounded-lg border border-slate-800/80">
          <div className="text-[9px] text-slate-400 font-mono">P_COND</div>
          <div className="font-bold text-[11px] text-blue-300 truncate">{physics.pCondWatts.toFixed(1)} W</div>
        </div>

        <div className="p-1.5 bg-[#0e1524] rounded-lg border border-slate-800/80">
          <div className="text-[9px] text-slate-400 font-mono">EFFICIENCY η</div>
          <div className="font-bold text-[11px] text-emerald-400 truncate">{physics.efficiencyPct.toFixed(1)}%</div>
        </div>

        <div className="p-1.5 bg-[#0e1524] rounded-lg border border-slate-800/80">
          <div className="text-[9px] text-slate-400 font-mono">VOLT-SEC BAL</div>
          <div className="font-bold text-[11px] text-sky-400 truncate">±0.00 V·s</div>
        </div>
      </div>
    </div>
  );
};
