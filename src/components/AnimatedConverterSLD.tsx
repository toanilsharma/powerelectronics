import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Maximize2,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface AnimatedConverterSLDProps {
  topology: string;
  Vin: number;
  duty: number;
  fsw: number;
  inductanceuH: number;
  capacitanceuF: number;
  loadR: number;
  q1Closed: boolean;
  q2Closed: boolean;
  q3Closed: boolean;
  isEngineRunning: boolean;
  mode: string;
  activeFault: string | null;
  Vout: number;
  Iout: number;
  deltaIL: number;
  deltaVout: number;
  Pout: number;
  Ploss: number;
  etaPct: number;
  onToggleQ1: () => void;
  onToggleQ2: () => void;
  onToggleQ3: () => void;
  onDutyChange?: (duty: number) => void;
  onLoadRChange?: (loadR: number) => void;
}

export const AnimatedConverterSLD: React.FC<AnimatedConverterSLDProps> = ({
  topology,
  Vin = 48,
  duty = 40,
  fsw = 50000,
  inductanceuH = 180,
  capacitanceuF = 470,
  loadR = 10,
  q1Closed = true,
  q2Closed = true,
  q3Closed = true,
  isEngineRunning = true,
  mode = 'CCM',
  activeFault = null,
  Vout = 19.2,
  Iout = 1.92,
  deltaIL = 1.28,
  deltaVout = 0.019,
  Pout = 36.8,
  Ploss = 2.1,
  etaPct = 94.6,
  onToggleQ1,
  onToggleQ2,
  onToggleQ3,
  onDutyChange,
  onLoadRChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [selectedComp, setSelectedComp] = useState<string>('S1');
  const [showProbes, setShowProbes] = useState<boolean>(true);

  // Physics-Accurate Visual PWM Oscillator State
  const [pwmProgress, setPwmProgress] = useState<number>(0); // 0.0 to 1.0 within visual period
  const [timeDilation, setTimeDilation] = useState<number>(1.0); // 1.0 = normal, 0.25 = slow, 0.05 = ultra-slow
  const [isPwmPaused, setIsPwmPaused] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  // Reduced Motion Accessibility
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Exact Duty Cycle Fraction: D in [0.05, 0.95]
  const dFraction = Math.max(0.05, Math.min(0.95, (duty ?? 40) / 100));

  // DCM Boundary Physics: Calculate D2 (Diode conduction ratio in DCM)
  // In DCM Buck: D2 = 2 * L * fsw * Iout / (D * Vin)
  const dcmD2Fraction = mode === 'DCM'
    ? Math.max(0.05, Math.min(1.0 - dFraction, (2 * (inductanceuH * 1e-6) * fsw * Math.max(0.1, Iout)) / (dFraction * Math.max(1, Vin))))
    : (1.0 - dFraction);

  // Continuous Physics-Synchronized Animation Clock
  useEffect(() => {
    if (!isEngineRunning || activeFault === 'S1_OPEN' || isPwmPaused) {
      return;
    }

    let animId: number;
    let lastTime = performance.now();

    // Visual cycle period (base 1200ms dilated by timeDilation)
    const basePeriodMs = 1200;

    const step = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      setPwmProgress((prev) => {
        const increment = (dt / (basePeriodMs / timeDilation));
        const next = prev + increment;
        return next >= 1.0 ? next % 1.0 : next;
      });

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isEngineRunning, activeFault, isPwmPaused, timeDilation]);

  // Semiconductor Visual Conduction States strictly derived from PWM Physics
  const isS1VisuallyOn = isEngineRunning && activeFault !== 'S1_OPEN' && pwmProgress < dFraction;
  const isDiodeVisuallyOn = isEngineRunning && !isS1VisuallyOn && activeFault !== 'DIODE_OPEN' && (mode !== 'DCM' || pwmProgress < (dFraction + dcmD2Fraction));
  const isDcmIdleState = mode === 'DCM' && pwmProgress >= (dFraction + dcmD2Fraction);

  // Defensive Numeric Formatting Helper
  const fmt = (val: number | undefined | null, decimals = 1, fallback = '0.0'): string => {
    if (val === undefined || val === null || isNaN(val)) return fallback;
    return val.toFixed(decimals);
  };

  // Electrical Energization States
  const isInputLive = isEngineRunning && activeFault !== 'S1_SHORT';
  const isQ1Live = isInputLive && q1Closed && activeFault !== 'S1_OPEN';
  const isSWNodeLive = isQ1Live && (isS1VisuallyOn || activeFault === 'DIODE_OPEN');
  const isQ2Live = isQ1Live && q2Closed;
  const isLoadLive = isQ2Live && q3Closed && (isSWNodeLive || isEngineRunning);

  // Standard IEEE / IEC Electrical Color Tokens
  const ENERGIZED_COLOR = '#00e5a0'; // Energized Green-Cyan
  const DEENERGIZED_COLOR = '#475569'; // De-energized Grey
  const FAULT_COLOR = '#f43f5e'; // Red Fault
  const WARNING_COLOR = '#f59e0b'; // Amber Warning
  const HIGHLIGHT_COLOR = '#38bdf8'; // Sky Blue Selection

  // Zoom Controls
  const handleZoomIn = () => setZoomScale((prev) => Math.min(1.8, prev + 0.15));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(0.7, prev - 0.15));
  const handleFitToView = () => setZoomScale(1.0);

  // Live Safe Readouts
  const safeVout = Vout ?? 19.2;
  const safeIout = Iout ?? 1.92;
  const safePout = Pout ?? 36.8;
  const safePloss = Ploss ?? 2.1;
  const safeDeltaIL = deltaIL ?? 1.28;
  const safeDeltaVout = deltaVout ?? 0.019;
  const safeEtaPct = etaPct ?? 94.6;
  const safeVin = Vin ?? 48;
  const safeDuty = duty ?? 40;
  const safeFsw = fsw ?? 50000;
  const safeInductanceuH = inductanceuH ?? 180;
  const safeCapacitanceuF = capacitanceuF ?? 470;
  const safeLoadR = loadR ?? 10;

  const Vout_abs = Math.abs(safeVout);
  const tjMosfetC = Math.round(25 + safePloss * 1.8);
  const energyL_mJ = 0.5 * (safeInductanceuH * 1e-6) * Math.pow(safeIout, 2) * 1000;
  const Vsw_instant = isS1VisuallyOn ? safeVin : -0.7;

  // Real Physics Current Flow Generator for 4 Topologies
  let currentFlowPath = '';
  if (isQ1Live && !prefersReducedMotion) {
    if (topology === 'boost') {
      if (isS1VisuallyOn) {
        currentFlowPath = 'M 60 110 L 130 110 L 200 110 L 260 110 L 360 110 L 420 110 L 420 270 L 60 270 Z';
      } else {
        currentFlowPath = isLoadLive
          ? 'M 60 110 L 130 110 L 200 110 L 260 110 L 360 110 L 420 110 L 520 110 L 600 110 L 680 110 L 760 110 L 830 110 L 830 270 L 60 270 Z'
          : 'M 60 110 L 130 110 L 200 110 L 260 110 L 360 110 L 420 110 L 520 110 L 600 110 L 600 270 L 60 270 Z';
      }
    } else if (topology === 'buckboost') {
      if (isS1VisuallyOn) {
        currentFlowPath = 'M 60 110 L 130 110 L 200 110 L 260 110 L 360 110 L 420 110 L 420 270 L 60 270 Z';
      } else {
        currentFlowPath = isLoadLive
          ? 'M 420 270 L 830 270 L 830 110 L 520 110 L 420 110 L 420 270 Z'
          : 'M 420 270 L 600 270 L 600 110 L 520 110 L 420 110 L 420 270 Z';
      }
    } else {
      // Buck Topology
      if (isS1VisuallyOn) {
        currentFlowPath = isLoadLive
          ? 'M 60 110 L 130 110 L 200 110 L 260 110 L 360 110 L 420 110 L 520 110 L 600 110 L 680 110 L 760 110 L 830 110 L 830 270 L 60 270 Z'
          : 'M 60 110 L 130 110 L 200 110 L 260 110 L 360 110 L 420 110 L 520 110 L 600 110 L 600 270 L 60 270 Z';
      } else {
        currentFlowPath = isLoadLive
          ? 'M 420 270 L 420 110 L 520 110 L 600 110 L 680 110 L 760 110 L 830 110 L 830 270 L 420 270 Z'
          : 'M 420 270 L 420 110 L 520 110 L 600 110 L 600 270 L 420 270 Z';
      }
    }
  }

  // Comprehensive Teaching & Inspection Database
  const COMP_DATABASE: Record<
    string,
    { title: string; subtitle: string; formula: string; explanation: string; stats: string; actionText?: string }
  > = {
    VIN: {
      title: 'DC Voltage Infeed Supply (+Vin)',
      subtitle: 'ANSI / IEEE DC Voltage Source (Upstream Battery or Rectifier)',
      formula: 'Pin = Vin · Iin = (Vout · Iout) / η',
      explanation: 'Provides primary input electrical potential. During S1 conduction, energy flows from Vin into the converter filter stage.',
      stats: `Infeed Voltage: ${safeVin}V DC | Power In: ${fmt(safePout + safePloss, 1)}W | Status: ${isInputLive ? 'ENERGIZED (LIVE)' : 'ISOLATED'}`,
    },
    Q1: {
      title: 'DC Input Air Circuit Breaker (52-Q1)',
      subtitle: 'IEC 60947-2 / IEEE C37.2-52 Air Circuit Breaker',
      formula: 'Icu = 25kA @ 500VDC (Thermal-Magnetic Trip)',
      explanation: 'Primary protection disconnect. Isolates infeed under downstream short circuits or maintenance safety lockout.',
      stats: `State: ${q1Closed ? 'CLOSED (LIVE)' : 'OPEN (TRIPPED / ISOLATED)'} | Rating: 400A 500VDC 25kA`,
      actionText: q1Closed ? 'CLICK TO TRIP 52-Q1' : 'CLICK TO CLOSE 52-Q1',
    },
    S1: {
      title: 'High-Side Power MOSFET Switch (S1)',
      subtitle: 'ANSI / IEEE Power MOSFET (N-Channel Silicon/SiC)',
      formula: 'Ton = D · Tsw = (D / fsw) | Vds(max) = Vin',
      explanation: 'Chopping element operated by PWM gate drive at 50kHz. Regulates volt-second balance across inductor to set output voltage.',
      stats: `Gate Duty: ${safeDuty}% | Switching Freq: ${fmt(safeFsw / 1000, 0)}kHz | Tj: ${tjMosfetC}°C | Psw: ${fmt(safePloss, 1)}W | Status: ${isS1VisuallyOn ? 'CONDUCTING (ON)' : 'BLOCKING (OFF)'}`,
      actionText: 'ADJUST DUTY CYCLE',
    },
    DIODE: {
      title: 'Freewheeling Power Schottky Diode (D1)',
      subtitle: 'IEC 60617 Ultra-Fast Recovery Power Diode',
      formula: 'Toff = (1 - D) · Tsw | Vdiode_drop ≈ 0.70V',
      explanation: 'Provides a continuous recirculating path for inductor current when MOSFET turns OFF, clamping switch node voltage to -0.7V.',
      stats: `Forward Current: ${isDiodeVisuallyOn ? fmt(safeIout, 1) : '0.0'}A | Peak Reverse Voltage: ${safeVin}V | Status: ${isDiodeVisuallyOn ? 'FORWARD CONDUCTION' : 'REVERSE BIASED'}`,
    },
    L: {
      title: 'Power Filter Choke Inductor (L)',
      subtitle: 'IEEE 315 Gapped Ferrite Core Energy Choke',
      formula: 'ΔIL = (Vin - Vout) · D / (L · fsw) | E = 0.5 · L · IL²',
      explanation: 'Stores magnetic energy during switch ON and releases it during switch OFF to convert chopped PWM into smooth DC current.',
      stats: `Inductance: ${safeInductanceuH}µH | DC Current: ${fmt(safeIout, 1)}A | Ripple ΔIL: ${fmt(safeDeltaIL, 2)}A | Stored Energy: ${fmt(energyL_mJ, 2)}mJ`,
    },
    C: {
      title: 'DC Bus Output Filter Capacitor Bank (C)',
      subtitle: 'IEEE 315 Low-ESR Electrolytic Capacitor Array',
      formula: 'ΔVout = ΔIL / (8 · C · fsw) + ΔIL · ESR',
      explanation: 'Attenuates switching ripple ΔVout to standard IEEE 946 telecom/substation limits (<1%) and absorbs step-load transient surges.',
      stats: `Capacitance: ${safeCapacitanceuF}µF | Bus Voltage: ${fmt(Vout_abs, 2)}V | Ripple ΔVout: ${fmt(safeDeltaVout * 1000, 1)}mV`,
    },
    Q2: {
      title: 'Output Bus Tie Circuit Breaker (52-Q2)',
      subtitle: 'IEC 60947-2 / IEEE C37.2-52 Bus Tie Disconnect',
      formula: 'In = 250A DC (Motor-Operated Molded Case)',
      explanation: 'Connects the DC-DC converter output filter to the main substation 110V/220V auxiliary distribution busbar.',
      stats: `State: ${q2Closed ? 'CLOSED (CONNECTED)' : 'OPEN (BUS ISOLATED)'} | Bus Voltage: ${fmt(Vout_abs, 1)}V`,
      actionText: q2Closed ? 'CLICK TO OPEN 52-Q2' : 'CLICK TO CLOSE 52-Q2',
    },
    Q3: {
      title: 'Substation Load Disconnector Switch (89-Q3)',
      subtitle: 'ANSI 89-Q3 Safety Lockout Switch',
      formula: 'Visible Break Air-Gap Lockout / Tagout (LOTO)',
      explanation: 'Manual safety isolation switch feeding critical substation loads (protection relays, circuit breaker trip coils, SCADA).',
      stats: `State: ${q3Closed ? 'CLOSED (ENERGIZED)' : 'OPEN (DE-ENERGIZED)'} | Connected Load: ${safeLoadR}Ω`,
      actionText: q3Closed ? 'CLICK TO OPEN 89-Q3' : 'CLICK TO CLOSE 89-Q3',
    },
    LOAD: {
      title: 'Critical Substation Auxiliary DC Load (R)',
      subtitle: 'IEEE 946 Class 1E Critical Auxiliary Load Bank',
      formula: 'Pout = Vout² / R = Vout · Iout',
      explanation: 'Consumes active DC electrical power. Step changes in load resistance test converter dynamic voltage regulation.',
      stats: `Resistance: ${safeLoadR}Ω | Voltage: ${fmt(Vout_abs, 2)}V | Current: ${fmt(safeIout, 2)}A | Power: ${fmt(safePout, 0)}W | η: ${fmt(safeEtaPct, 1)}%`,
      actionText: `TOGGLE STEP LOAD (${safeLoadR === 10 ? '5Ω HEAVY' : '10Ω NORMAL'})`,
    },
  };

  const activeComp = COMP_DATABASE[selectedComp] || COMP_DATABASE.S1;

  const handleComponentAction = () => {
    if (selectedComp === 'Q1') onToggleQ1();
    else if (selectedComp === 'Q2') onToggleQ2();
    else if (selectedComp === 'Q3') onToggleQ3();
    else if (selectedComp === 'S1' && onDutyChange) {
      onDutyChange(safeDuty >= 80 ? 20 : safeDuty + 20);
    } else if (selectedComp === 'LOAD' && onLoadRChange) {
      onLoadRChange(safeLoadR === 10 ? 5 : 10);
    }
  };

  return (
    <div
      ref={containerRef}
      id="dc-animated-sld"
      className="w-full h-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-2.5 shadow-2xl relative flex flex-col gap-2 font-mono overflow-hidden select-none min-h-0"
    >
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:18px_18px] opacity-35 pointer-events-none" />

      {/* TOP HEADER CONTROLS & TELEMETRY */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span className="font-black text-xs text-white tracking-wider">
            IEC / IEEE SINGLE-LINE DIAGRAM ({(topology || 'buck').toUpperCase()})
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950/90 text-cyan-300 border border-blue-800">
            fsw = {fmt(safeFsw / 1000, 0)} kHz
          </span>
          {activeFault && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 animate-pulse flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              FAULT: {activeFault}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Time Dilation Speed Controls */}
          <div className="flex items-center gap-1 bg-[#0b1220] border border-[#1e293b] px-1.5 py-0.5 rounded-xl text-[10px]">
            <span className="text-slate-400 font-bold mr-0.5">SPEED:</span>
            {[
              { label: '1x', val: 1.0 },
              { label: '0.25x', val: 0.25 },
              { label: '0.05x', val: 0.05 },
            ].map((spd) => (
              <button
                key={spd.label}
                type="button"
                onClick={() => {
                  setTimeDilation(spd.val);
                  setIsPwmPaused(false);
                }}
                className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  timeDilation === spd.val && !isPwmPaused
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {spd.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsPwmPaused(!isPwmPaused)}
              className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                isPwmPaused
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isPwmPaused ? 'PAUSED' : 'PAUSE'}
            </button>
          </div>

          {/* Mini PWM Cycle Strobe Bar */}
          <div className="hidden sm:flex flex-col gap-0.5 bg-[#0b1220] border border-[#1e293b] px-2 py-1 rounded-xl">
            <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono">
              <span className="text-emerald-400 font-bold">Ton: {safeDuty}%</span>
              <span className="text-sky-400 font-bold">Toff: {100 - safeDuty}%</span>
            </div>
            <div className="relative w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-75"
                style={{ width: `${dFraction * 100}%` }}
              />
              <div
                className="h-full bg-sky-600 transition-all duration-75"
                style={{ width: `${(1 - dFraction) * 100}%` }}
              />
              {/* Live strobe cursor dot */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-sm"
                style={{ left: `${pwmProgress * 100}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowProbes(!showProbes)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              showProbes
                ? 'bg-cyan-950 text-cyan-300 border-cyan-700 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle Live Electrical Measurement Probe Flags"
          >
            📊 {showProbes ? 'PROBES: ON' : 'PROBES: OFF'}
          </button>

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase ${
              mode === 'CCM'
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : mode === 'DCM'
                ? 'bg-amber-950 text-amber-400 border-amber-800'
                : 'bg-rose-950 text-rose-400 border-rose-800'
            }`}
          >
            MODE: {mode || 'CCM'}
          </span>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-[#0b1220] border border-[#1e293b] p-0.5 rounded-xl">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFitToView}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold cursor-pointer flex items-center gap-0.5 ml-0.5"
              title="Fit to View (100%)"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:inline">FIT</span>
            </button>
          </div>
        </div>
      </div>

      {/* SVG WORKBENCH SCHEMATIC CANVAS (ViewBox 900 x 360 - 100% STABLE ZERO SHAKE) */}
      <div className="relative z-10 w-full flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-800 bg-[#040812] flex items-center justify-center p-1">
        <svg
          viewBox="0 0 900 360"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full max-h-full transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
        >
          {/* ========================================================================= */}
          {/* 1. SEAMLESS ZERO-GAP CONTINUOUS POWER BUSBARS (IEEE/IEC STANDARD) */}
          {/* ========================================================================= */}
          <g strokeLinecap="round" strokeLinejoin="round">
            {/* Top Positive Power Busbar */}
            <path
              d="M 60 110 L 130 110 M 200 110 L 260 110 M 360 110 L 420 110 L 470 110 M 550 110 L 600 110 L 680 110 M 755 110 L 760 110 M 820 110 L 830 110 L 830 170"
              fill="none"
              stroke={isQ1Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth="4"
            />
            {/* Vin DC Source Upper Positive Wire */}
            <path
              d="M 60 110 L 60 176"
              fill="none"
              stroke={isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth="4"
            />
            {/* Bottom Ground Return Busbar */}
            <path
              d="M 830 234 L 830 270 L 60 270 L 60 224"
              fill="none"
              stroke={isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth="4"
            />
            {/* D1 Freewheeling Diode Branch Wires */}
            <path
              d="M 420 110 L 420 180 M 420 212 L 420 270"
              fill="none"
              stroke={isSWNodeLive || isDiodeVisuallyOn ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth="3.5"
            />
            {/* C Output Capacitor Filter Branch Wires */}
            <path
              d="M 600 110 L 600 190 M 600 202 L 600 270"
              fill="none"
              stroke={isQ2Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth="3.5"
            />
          </g>

          {/* Node Junction Solder Dots */}
          <circle cx="60" cy="110" r="5" fill={isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="420" cy="110" r="5" fill={isSWNodeLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="420" cy="270" r="5" fill={isSWNodeLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="600" cy="110" r="5" fill={isQ2Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="600" cy="270" r="5" fill={isQ2Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="830" cy="110" r="5" fill={isLoadLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="830" cy="270" r="5" fill={isLoadLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />

          {/* REAL PHYSICS ANIMATED CURRENT FLOW STREAM */}
          {currentFlowPath && (
            <path
              d={currentFlowPath}
              fill="none"
              stroke="#00ffb7"
              strokeWidth="3.5"
              strokeDasharray="8,6"
              className="animate-[dash_1s_linear_infinite]"
              style={{ animationDirection: 'reverse' }}
            />
          )}


          {/* ========================================================================= */}
          {/* 2. IEC/IEEE STANDARD ELECTRICAL SYMBOLS */}
          {/* ========================================================================= */}

          {/* 1. DC INPUT VOLTAGE SOURCE */}
          <g
            className="cursor-pointer group"
            onClick={() => setSelectedComp('VIN')}
          >
            <title>DC Infeed Source (+Vin: {safeVin}V DC) - Click to inspect</title>
            <circle
              cx="60"
              cy="200"
              r="24"
              fill="#0d1526"
              stroke={selectedComp === 'VIN' ? HIGHLIGHT_COLOR : isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth={selectedComp === 'VIN' ? '3.5' : '2.5'}
            />
            <line x1="46" y1="194" x2="74" y2="194" stroke={ENERGIZED_COLOR} strokeWidth="3" />
            <line x1="60" y1="187" x2="60" y2="201" stroke={ENERGIZED_COLOR} strokeWidth="2.5" />
            <line x1="50" y1="207" x2="70" y2="207" stroke="#94a3b8" strokeWidth="2.5" />
            <text x="60" y="240" fill="#00e5a0" fontSize="12" fontWeight="bold" textAnchor="middle">+{safeVin}V</text>
            <text x="60" y="253" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">DC SOURCE</text>
          </g>

          {/* 2. BREAKER 52-Q1 */}
          <g
            className="cursor-pointer group"
            onClick={() => {
              onToggleQ1();
              setSelectedComp('Q1');
            }}
          >
            <title>DC Input Infeed Breaker (52-Q1) - Click to toggle OPEN/CLOSE</title>
            <rect
              x="135"
              y="92"
              width="60"
              height="36"
              rx="6"
              fill="#0b1220"
              stroke={selectedComp === 'Q1' ? HIGHLIGHT_COLOR : q1Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth={selectedComp === 'Q1' ? '3.5' : '2.5'}
            />
            <line x1="130" y1="110" x2="152" y2="110" stroke={isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />
            <line
              x1="152"
              y1="110"
              x2={q1Closed ? '178' : '172'}
              y2={q1Closed ? '110' : '96'}
              stroke={q1Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth="4"
            />
            <line x1="178" y1="110" x2="200" y2="110" stroke={q1Closed ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />
            <text x="165" y="84" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">52-Q1 (INFEEED)</text>
            <text x="165" y="142" fill={q1Closed ? '#00e5a0' : '#f43f5e'} fontSize="9" fontWeight="extrabold" textAnchor="middle">
              [{q1Closed ? 'CLOSED' : 'TRIPPED'}]
            </text>
          </g>

          {/* 3. HIGH-SIDE POWER MOSFET S1 */}
          <g
            className="cursor-pointer group"
            onClick={() => setSelectedComp('S1')}
          >
            <title>Power MOSFET Switch (S1: 50kHz PWM Gate • D={safeDuty}%) - Click to inspect</title>
            <rect
              x="275"
              y="80"
              width="70"
              height="60"
              rx="10"
              fill={activeFault === 'S1_OPEN' || activeFault === 'S1_SHORT' ? '#311218' : isS1VisuallyOn ? '#07271e' : '#0d1526'}
              stroke={selectedComp === 'S1' ? HIGHLIGHT_COLOR : activeFault === 'S1_OPEN' || activeFault === 'S1_SHORT' ? FAULT_COLOR : isS1VisuallyOn ? ENERGIZED_COLOR : '#3b82f6'}
              strokeWidth={selectedComp === 'S1' ? '4' : '2.5'}
            />
            <path d="M 260 110 L 285 110 M 335 110 L 360 110" stroke={isQ1Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />
            <path d="M 292 95 L 292 125 M 300 93 L 300 103 M 300 105 L 300 115 M 300 117 L 300 127" stroke="#ffffff" strokeWidth="3" />
            <path d="M 285 120 L 292 120" stroke="#38bdf8" strokeWidth="2.5" />
            <text x="310" y="73" fill="#38bdf8" fontSize="10" fontWeight="extrabold" textAnchor="middle">GATE {safeDuty}%</text>
            <text x="310" y="114" fill="#ffffff" fontSize="10" fontWeight="black" textAnchor="middle">S1 MOSFET</text>
            <text x="310" y="153" fill={isS1VisuallyOn ? '#00e5a0' : '#94a3b8'} fontSize="8" fontWeight="bold" textAnchor="middle">
              {isS1VisuallyOn ? '● CONDUCTING' : '○ OFF'}
            </text>
          </g>

          {/* 4. FREEWHEELING POWER DIODE D1 */}
          <g
            className="cursor-pointer group"
            onClick={() => setSelectedComp('DIODE')}
          >
            <title>Freewheeling Power Diode (D1) - Click to inspect</title>
            <rect
              x="390"
              y="165"
              width="60"
              height="65"
              rx="8"
              fill="#0d1526"
              stroke={selectedComp === 'DIODE' ? HIGHLIGHT_COLOR : activeFault === 'DIODE_OPEN' ? FAULT_COLOR : isDiodeVisuallyOn ? WARNING_COLOR : '#3b82f6'}
              strokeWidth={selectedComp === 'DIODE' ? '3.5' : '2'}
            />
            <polygon
              points="405,212 435,212 420,180"
              fill={isDiodeVisuallyOn ? WARNING_COLOR : 'none'}
              stroke={isDiodeVisuallyOn ? WARNING_COLOR : '#94a3b8'}
              strokeWidth="3"
            />
            <line x1="405" y1="180" x2="435" y2="180" stroke={isDiodeVisuallyOn ? WARNING_COLOR : '#94a3b8'} strokeWidth="3.5" />
            <text x="420" y="242" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">D1 DIODE</text>
            <text x="420" y="253" fill={isDiodeVisuallyOn ? '#f59e0b' : '#64748b'} fontSize="8" fontWeight="bold" textAnchor="middle">
              {isDiodeVisuallyOn ? 'FREEWHEELING' : 'REVERSE'}
            </text>
          </g>

          {/* 5. POWER FILTER INDUCTOR L */}
          <g
            className="cursor-pointer group"
            onClick={() => setSelectedComp('L')}
          >
            <title>Power Filter Choke Inductor (L: {safeInductanceuH}µH • ΔIL: {fmt(safeDeltaIL, 2)}A) - Click to inspect</title>
            <rect
              x="470"
              y="85"
              width="80"
              height="50"
              rx="14"
              fill="#07201a"
              stroke={selectedComp === 'L' ? HIGHLIGHT_COLOR : activeFault === 'L_SAT' ? FAULT_COLOR : ENERGIZED_COLOR}
              strokeWidth={selectedComp === 'L' ? '4' : '2.5'}
            />
            <path
              d="M 478 110 Q 487 93, 497 110 Q 507 93, 517 110 Q 527 93, 537 110 Q 545 93, 552 110"
              fill="none"
              stroke={ENERGIZED_COLOR}
              strokeWidth="3.5"
            />
            <text x="510" y="78" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">L = {safeInductanceuH}µH</text>
            <text x="510" y="148" fill="#00e5a0" fontSize="9" fontWeight="bold" textAnchor="middle">ΔIL = {fmt(safeDeltaIL, 2)}A</text>
          </g>

          {/* 6. FILTER CAPACITOR BANK C */}
          <g
            className="cursor-pointer group"
            onClick={() => setSelectedComp('C')}
          >
            <title>Output Filter Capacitor Bank (C: {safeCapacitanceuF}µF) - Click to inspect</title>
            <line x1="582" y1="190" x2="618" y2="190" stroke={selectedComp === 'C' ? HIGHLIGHT_COLOR : isQ2Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth={selectedComp === 'C' ? '5' : '4'} />
            <line x1="582" y1="202" x2="618" y2="202" stroke="#94a3b8" strokeWidth="4" />
            <text x="632" y="185" fill="#34d399" fontSize="9" fontWeight="bold">C = {safeCapacitanceuF}µF</text>
            <text x="632" y="208" fill="#94a3b8" fontSize="9" fontWeight="bold">ΔV = {fmt(safeDeltaVout * 1000, 0)}mV</text>
          </g>

          {/* 7. BUS TIE BREAKER 52-Q2 */}
          <g
            className="cursor-pointer group"
            onClick={() => {
              onToggleQ2();
              setSelectedComp('Q2');
            }}
          >
            <title>DC Bus Tie Breaker (52-Q2) - Click to toggle OPEN/CLOSE</title>
            <rect
              x="690"
              y="92"
              width="60"
              height="36"
              rx="6"
              fill="#0b1220"
              stroke={selectedComp === 'Q2' ? HIGHLIGHT_COLOR : q2Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth={selectedComp === 'Q2' ? '3.5' : '2.5'}
            />
            <line x1="680" y1="110" x2="702" y2="110" stroke={isQ2Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />
            <line
              x1="702"
              y1="110"
              x2={q2Closed ? '728' : '722'}
              y2={q2Closed ? '110' : '96'}
              stroke={q2Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth="4"
            />
            <line x1="728" y1="110" x2="760" y2="110" stroke={q2Closed ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />
            <text x="720" y="84" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">52-Q2</text>
            <text x="720" y="142" fill={q2Closed ? '#00e5a0' : '#f43f5e'} fontSize="9" fontWeight="extrabold" textAnchor="middle">
              [{q2Closed ? 'CLOSED' : 'OPEN'}]
            </text>
          </g>

          {/* 8. LOAD DISCONNECTOR 89-Q3 */}
          <g
            className="cursor-pointer group"
            onClick={() => {
              onToggleQ3();
              setSelectedComp('Q3');
            }}
          >
            <title>Load Disconnector (89-Q3) - Click to toggle OPEN/CLOSE</title>
            <circle cx="760" cy="110" r="4.5" fill={isQ2Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
            <circle cx="820" cy="110" r="4.5" fill={isLoadLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
            <line
              x1="760"
              y1="110"
              x2={q3Closed ? '820' : '812'}
              y2={q3Closed ? '110' : '90'}
              stroke={q3Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth="3.5"
            />
            <rect
              x="765"
              y="88"
              width="50"
              height="44"
              rx="4"
              fill="none"
              stroke={selectedComp === 'Q3' ? HIGHLIGHT_COLOR : q3Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth={selectedComp === 'Q3' ? '2.5' : '1.5'}
              strokeDasharray="3,3"
            />
            <text x="790" y="80" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">89-Q3</text>
          </g>

          {/* 9. SUBSTATION RESISTIVE LOAD R */}
          <g
            className="cursor-pointer group"
            onClick={() => {
              setSelectedComp('LOAD');
            }}
          >
            <title>Substation DC Load Demand (R: {safeLoadR}Ω • {fmt(safePout, 0)}W) - Click to inspect/toggle step</title>
            <rect
              x="800"
              y="160"
              width="60"
              height="80"
              rx="8"
              fill="#0d1526"
              stroke={selectedComp === 'LOAD' ? HIGHLIGHT_COLOR : isLoadLive ? '#06b6d4' : DEENERGIZED_COLOR}
              strokeWidth={selectedComp === 'LOAD' ? '4' : '2.5'}
            />
            <path
              d="M 830 170 L 818 178 L 842 190 L 818 202 L 842 214 L 818 226 L 830 234"
              fill="none"
              stroke={isLoadLive ? '#06b6d4' : '#64748b'}
              strokeWidth="3"
            />
            <text x="830" y="152" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">{fmt(Vout_abs, 1)}V</text>
            <text x="830" y="254" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">R = {safeLoadR}Ω</text>
            <text x="830" y="268" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">{fmt(safePout, 0)}W ({fmt(safeIout, 1)}A)</text>
          </g>

          {/* ========================================================================= */}
          {/* 3. LIVE MEASUREMENT PROBE FLAGS OVERLAY */}
          {/* ========================================================================= */}
          {showProbes && (
            <g className="font-mono text-[9px] font-extrabold select-none pointer-events-none">
              <g transform="translate(40, 75)">
                <rect width="46" height="18" rx="4" fill="#0b1426" stroke="#00e5a0" strokeWidth="1" />
                <text x="23" y="13" fill="#00e5a0" textAnchor="middle">{safeVin}V</text>
              </g>

              <g transform="translate(390, 75)">
                <rect width="60" height="18" rx="4" fill="#0b1426" stroke="#38bdf8" strokeWidth="1" />
                <text x="30" y="13" fill="#38bdf8" textAnchor="middle">Vsw: {fmt(Vsw_instant, 1)}V</text>
              </g>

              <g transform="translate(640, 75)">
                <rect width="60" height="18" rx="4" fill="#0b1426" stroke="#34d399" strokeWidth="1" />
                <text x="30" y="13" fill="#34d399" textAnchor="middle">Vout: {fmt(Vout_abs, 1)}V</text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* 4. PERMANENT COMPONENT INSPECTOR & DIRECT ON-SLD CONTROLLER DRAWER */}
      {/* ========================================================================= */}
      <div className="relative z-20 w-full p-2.5 bg-[#0b1220] border-2 border-cyan-500/70 rounded-xl shadow-xl flex flex-col gap-1.5 text-xs shrink-0 font-mono">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-1">
          <div className="flex items-center gap-2">
            <span className="font-black text-cyan-300 text-xs flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              {activeComp.title}
            </span>
            <span className="text-[10px] text-slate-400 font-bold hidden md:inline">
              ({activeComp.subtitle})
            </span>
          </div>

          {activeComp.actionText && (
            <button
              type="button"
              onClick={handleComponentAction}
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-lg text-[10px] cursor-pointer shadow-md transition-all flex items-center gap-1"
            >
              <Zap className="w-3 h-3 fill-white" />
              <span>{activeComp.actionText}</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px]">
          <div className="text-emerald-300 font-bold flex-1 truncate">
            {activeComp.stats}
          </div>
          <div className="text-amber-300 font-bold text-[10px] bg-[#070b14] px-2 py-0.5 rounded border border-slate-800 shrink-0">
            Formula: {activeComp.formula}
          </div>
        </div>

        <p className="text-[10px] text-slate-300 font-sans leading-tight">
          💡 <strong className="text-cyan-200">Engineering Concept:</strong> {activeComp.explanation}
        </p>
      </div>
    </div>
  );
};

export default AnimatedConverterSLD;
