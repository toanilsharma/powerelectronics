import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Maximize2,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Info,
  Layers,
  Compass,
} from 'lucide-react';
import { SimulationControlHUD } from './shared/SimulationControlHUD';

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
  topology = 'buck',
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

  // Physics-Accurate Simulation Clock & Time Dilation (Down to 0.0001x)
  const [timeDilation, setTimeDilation] = useState<number>(1.0);
  const [isPwmPaused, setIsPwmPaused] = useState<boolean>(false);
  const [simTimeUs, setSimTimeUs] = useState<number>(0);
  const [pwmProgress, setPwmProgress] = useState<number>(0); // 0.0 to 1.0 within period
  const [dashOffset, setDashOffset] = useState<number>(0);
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
  const dcmD2Fraction = mode === 'DCM'
    ? Math.max(0.05, Math.min(1.0 - dFraction, (2 * (inductanceuH * 1e-6) * fsw * Math.max(0.1, Iout)) / (dFraction * Math.max(1, Vin))))
    : (1.0 - dFraction);

  // Switching Period in microseconds
  const periodUs = 1000000 / Math.max(1000, fsw);

  // Continuous Physics-Synchronized Animation Clock
  useEffect(() => {
    if (!isEngineRunning || activeFault === 'S1_OPEN' || isPwmPaused) {
      return;
    }

    let animId: number;
    let lastTime = performance.now();

    // Visual cycle period (base 1200ms scaled by timeDilation)
    const baseVisualPeriodMs = 1200;

    const step = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      // Advance visual PWM progress
      setPwmProgress((prev) => {
        const increment = (dt / (baseVisualPeriodMs / timeDilation));
        const next = prev + increment;
        return next >= 1.0 ? next % 1.0 : next;
      });

      // Advance physics microsecond clock
      setSimTimeUs((prev) => prev + (dt * 1000 * timeDilation));

      // Advance dynamic current flow dashes proportional to real load current
      const flowRate = Math.max(0.2, Math.min(8, Math.abs(Iout) * 1.5)) * timeDilation;
      setDashOffset((prev) => (prev - dt * 0.15 * flowRate) % 100);

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isEngineRunning, activeFault, isPwmPaused, timeDilation, Iout]);

  // Stepping Controls (+10µs, -10µs)
  const handleStepForward = () => {
    const stepDeltaUs = 10;
    setSimTimeUs((prev) => prev + stepDeltaUs);
    setPwmProgress((prev) => (prev + (stepDeltaUs / periodUs)) % 1.0);
    setDashOffset((prev) => (prev - 2) % 100);
  };

  const handleStepBackward = () => {
    const stepDeltaUs = 10;
    setSimTimeUs((prev) => Math.max(0, prev - stepDeltaUs));
    setPwmProgress((prev) => {
      const next = prev - (stepDeltaUs / periodUs);
      return next < 0 ? (1.0 + (next % 1.0)) : next;
    });
    setDashOffset((prev) => (prev + 2) % 100);
  };

  const handleResetTime = () => {
    setSimTimeUs(0);
    setPwmProgress(0);
    setDashOffset(0);
  };

  // Semiconductor Visual Conduction States strictly derived from PWM Physics
  const isS1VisuallyOn = isEngineRunning && activeFault !== 'S1_OPEN' && pwmProgress < dFraction;
  const isDiodeVisuallyOn = isEngineRunning && !isS1VisuallyOn && activeFault !== 'DIODE_OPEN' && (mode !== 'DCM' || pwmProgress < (dFraction + dcmD2Fraction));
  const isDcmIdleState = mode === 'DCM' && pwmProgress >= (dFraction + dcmD2Fraction);

  // Electrical Energization States
  const isInputLive = isEngineRunning && activeFault !== 'S1_SHORT';
  const isQ1Live = isInputLive && q1Closed && activeFault !== 'S1_OPEN';
  const isSWNodeLive = isQ1Live && (isS1VisuallyOn || activeFault === 'DIODE_OPEN');
  const isQ2Live = isQ1Live && q2Closed;
  const isLoadLive = isQ2Live && q3Closed && (isSWNodeLive || isEngineRunning);

  // Standard IEEE / IEC Electrical Color Tokens
  const ENERGIZED_COLOR = '#00e5a0';
  const DEENERGIZED_COLOR = '#475569';
  const FAULT_COLOR = '#f43f5e';
  const WARNING_COLOR = '#f59e0b';
  const HIGHLIGHT_COLOR = '#38bdf8';

  // IEC 60445 Dynamic Nodal Potential Colors (Rec 17)
  const POTENTIAL_POS = '#00e5a0'; // Positive Potential (+Vin)
  const POTENTIAL_GND = '#64748b'; // Reference Ground Return (0V)
  const POTENTIAL_OUT = isQ2Live
    ? topology === 'buckboost'
      ? '#f59e0b' // Negative Inverted Rail (-|Vout| in Buck-Boost)
      : '#00e5a0' // Positive Rail (+Vout in Buck/Boost)
    : DEENERGIZED_COLOR;
  const POTENTIAL_SW = isSWNodeLive ? POTENTIAL_POS : isDiodeVisuallyOn ? POTENTIAL_GND : DEENERGIZED_COLOR;

  // Defensive Numeric Formatting Helper
  const fmt = (val: number | undefined | null, decimals = 1, fallback = '0.0'): string => {
    if (val === undefined || val === null || isNaN(val)) return fallback;
    return val.toFixed(decimals);
  };

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

  // Zoom Controls
  const handleZoomIn = () => setZoomScale((prev) => Math.min(1.8, prev + 0.15));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(0.7, prev - 0.15));
  const handleFitToView = () => setZoomScale(1.0);

  // Instantaneous Inductor State for Magnetic Field Visualizer (Rec 5)
  // Flux builds up during switch ON, collapses during freewheel
  const isInductorCharging = (topology === 'boost' || topology === 'buckboost' || topology === 'buck') ? isS1VisuallyOn : false;
  const isCoreSaturated = activeFault === 'L_SAT' || safeIout > 25.0;

  // Dynamic Current Vector Paths per Topology (Rec 1 & Rec 4)
  let currentFlowPath = '';
  if (isQ1Live && !prefersReducedMotion && !isDcmIdleState) {
    if (topology === 'boost') {
      // BOOST:
      // When S1 ON: Vin (60) -> Q1 (170) -> L (300) -> Node (420) -> S1 (down to 270) -> GND back to Vin (60)
      // When S1 OFF (D1 conducting): Vin (60) -> Q1 (170) -> L (300) -> Node (420) -> D1 (510) -> Cap (600) / Load (830) -> GND back to Vin
      if (isS1VisuallyOn) {
        currentFlowPath = 'M 60 110 L 200 110 L 350 110 L 420 110 L 420 270 L 60 270 Z';
      } else if (isDiodeVisuallyOn) {
        currentFlowPath = isLoadLive
          ? 'M 60 110 L 200 110 L 350 110 L 420 110 L 550 110 L 600 110 L 830 110 L 830 270 L 60 270 Z'
          : 'M 60 110 L 200 110 L 350 110 L 420 110 L 550 110 L 600 110 L 600 270 L 60 270 Z';
      }
    } else if (topology === 'buckboost') {
      // BUCK-BOOST (Inverting):
      // When S1 ON: Vin (60) -> Q1 (170) -> S1 (300) -> Node (420) -> L (down to 270) -> GND back to Vin (60)
      // When S1 OFF (Freewheeling): GND (420, 270) -> L (up to 420, 110) -> D1 (reverse out to 550) -> Load (830) -> GND (270) -> Node (420)
      if (isS1VisuallyOn) {
        currentFlowPath = 'M 60 110 L 200 110 L 350 110 L 420 110 L 420 270 L 60 270 Z';
      } else if (isDiodeVisuallyOn) {
        currentFlowPath = isLoadLive
          ? 'M 420 270 L 420 110 L 550 110 L 830 110 L 830 270 L 420 270 Z'
          : 'M 420 270 L 420 110 L 550 110 L 600 110 L 600 270 L 420 270 Z';
      }
    } else {
      // BUCK:
      // When S1 ON: Vin (60) -> Q1 (170) -> S1 (300) -> Node (420) -> L (510) -> Cap (600) / Load (830) -> GND (270) -> Vin (60)
      // When S1 OFF (D1 freewheeling): D1 (420, 270 up to 110) -> L (510) -> Load (830) -> GND (270) -> D1 (420, 270)
      if (isS1VisuallyOn) {
        currentFlowPath = isLoadLive
          ? 'M 60 110 L 200 110 L 350 110 L 420 110 L 550 110 L 600 110 L 830 110 L 830 270 L 60 270 Z'
          : 'M 60 110 L 200 110 L 350 110 L 420 110 L 550 110 L 600 110 L 600 270 L 60 270 Z';
      } else if (isDiodeVisuallyOn) {
        currentFlowPath = isLoadLive
          ? 'M 420 270 L 420 110 L 550 110 L 600 110 L 830 110 L 830 270 L 420 270 Z'
          : 'M 420 270 L 420 110 L 550 110 L 600 110 L 600 270 L 420 270 Z';
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
      title: topology === 'boost' ? 'Low-Side Shunt MOSFET Switch (S1)' : 'High-Side Series Power MOSFET Switch (S1)',
      subtitle: 'ANSI / IEEE Power MOSFET (N-Channel Silicon/SiC)',
      formula: 'Ton = D · Tsw = (D / fsw) | Vds(max) = Vin',
      explanation: topology === 'boost'
        ? 'Shunts switch node to ground during Ton, drawing current through inductor L to store magnetic flux.'
        : 'High-side chopping element operated by PWM gate drive. Regulates volt-second balance across inductor to set output voltage.',
      stats: `Gate Duty: ${safeDuty}% | Switching Freq: ${fmt(safeFsw / 1000, 0)}kHz | Tj: ${tjMosfetC}°C | Psw: ${fmt(safePloss, 1)}W | Status: ${isS1VisuallyOn ? 'CONDUCTING (ON)' : 'BLOCKING (OFF)'}`,
      actionText: 'ADJUST DUTY CYCLE',
    },
    DIODE: {
      title: topology === 'boost' ? 'Output Blocking Diode (D1)' : 'Freewheeling Power Schottky Diode (D1)',
      subtitle: 'IEC 60617 Ultra-Fast Recovery Power Diode',
      formula: 'Toff = (1 - D) · Tsw | Vdiode_drop ≈ 0.70V',
      explanation: topology === 'boost'
        ? 'Conducts inductor discharge current into output capacitor and load during switch OFF, blocking reverse flow during switch ON.'
        : 'Provides a continuous recirculating path for inductor current when MOSFET turns OFF, clamping switch node voltage to -0.7V.',
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
      stats: `State: ${q2Closed ? 'CLOSED (ONLINE)' : 'OPEN (ISOLATED)'} | Rating: 250A 250VDC`,
      actionText: q2Closed ? 'CLICK TO OPEN 52-Q2' : 'CLICK TO CLOSE 52-Q2',
    },
    Q3: {
      title: 'Substation Load Disconnector Switch (89-Q3)',
      subtitle: 'IEC 60947-3 / IEEE C37.2-89 Manual Visible Break',
      formula: 'Icw = 10kA (1s Short-Time Withstand)',
      explanation: 'Manual visible disconnect switch providing positive physical galvanic isolation before downstream load equipment servicing.',
      stats: `State: ${q3Closed ? 'CLOSED (LOADED)' : 'OPEN (SAFETY LOCKOUT)'} | Rating: 250A Manual Disconnector`,
      actionText: q3Closed ? 'CLICK TO OPEN 89-Q3' : 'CLICK TO CLOSE 89-Q3',
    },
    LOAD: {
      title: 'Substation DC Load Demand (R-L)',
      subtitle: 'IEEE 946 Substation Critical DC Distribution Board',
      formula: 'Iout = Vout / Rload | Pload = Vout² / Rload',
      explanation: 'Simulates critical substation protection trip coils, SCADA automation RTUs, and communication equipment drawing DC power.',
      stats: `Resistance: ${safeLoadR}Ω | Voltage: ${fmt(Vout_abs, 2)}V | Current: ${fmt(safeIout, 2)}A | Power: ${fmt(safePout, 1)}W`,
      actionText: 'CHANGE LOAD RESISTANCE',
    },
  };

  const activeComp = COMP_DATABASE[selectedComp] || COMP_DATABASE['S1'];

  return (
    <div
      ref={containerRef}
      className="flex flex-col w-full h-full min-h-[490px] bg-[#070b14] border-2 border-[#1e293b] rounded-2xl overflow-hidden shadow-2xl font-mono select-none"
    >
      {/* 1. UNIVERSAL SIMULATION CONTROL HUD (Rec 2 & 3: 0.0001x to 1x, Stepping, Live Clock) */}
      <SimulationControlHUD
        isPaused={isPwmPaused}
        onTogglePause={() => setIsPwmPaused(!isPwmPaused)}
        timeDilation={timeDilation}
        onTimeDilationChange={(d) => setTimeDilation(d)}
        simTimeUs={simTimeUs}
        onStepForward={handleStepForward}
        onStepBackward={handleStepBackward}
        onResetTime={handleResetTime}
        switchingFreqHz={fsw}
        periodProgressPct={pwmProgress * 100}
        activeStateText={
          isS1VisuallyOn
            ? 'S1: ON (PWM GATE HIGH)'
            : isDiodeVisuallyOn
            ? 'D1: FREEWHEELING'
            : isDcmIdleState
            ? 'DCM: ZERO CURRENT IDLE'
            : 'S1: OFF / D1: OFF'
        }
      />

      {/* 2. TOP WORKBENCH STATUS STRIP & ZOOM CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#090e1c] border-b border-slate-800 text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-white flex items-center gap-1.5 text-xs">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="uppercase">{topology} TOPOLOGY SCHEMATIC SLD</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">
            {topology} ({mode})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowProbes(!showProbes)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              showProbes
                ? 'bg-cyan-950 text-cyan-300 border-cyan-700 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            📊 {showProbes ? 'PROBES: ON' : 'PROBES: OFF'}
          </button>

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

      {/* 3. SVG WORKBENCH SCHEMATIC CANVAS (ViewBox 920 x 360) */}
      <div className="relative z-10 w-full flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-800 bg-[#040812] flex items-center justify-center p-1">
        <svg
          viewBox="0 0 920 360"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full max-h-full transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
        >
          <defs>
            {/* Magnetic Core Flux Density Filter (Rec 5) */}
            <filter id="flux-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ========================================================================= */}
          {/* CONTINUOUS ZERO-GAP BUSBARS PER TOPOLOGY (Rec 1)                         */}
          {/* ========================================================================= */}
          <g strokeLinecap="round" strokeLinejoin="round">
            {/* Top Positive Busbar (Input Stage X <= 420) */}
            <path
              d="M 60 110 L 135 110 M 195 110 L 260 110 M 340 110 L 420 110"
              fill="none"
              stroke={isQ1Live ? POTENTIAL_POS : DEENERGIZED_COLOR}
              strokeWidth="4"
            />
            {/* Top Output Busbar (Output Stage X >= 420, with Buck-Boost Inverted Potential) */}
            <path
              d="M 420 110 L 460 110 M 550 110 L 600 110 L 670 110 M 730 110 L 755 110 M 805 110 L 840 110 L 840 170"
              fill="none"
              stroke={POTENTIAL_OUT}
              strokeWidth="4"
            />
            {/* DC Infeed Source upper lead */}
            <path
              d="M 60 110 L 60 176"
              fill="none"
              stroke={isInputLive ? POTENTIAL_POS : DEENERGIZED_COLOR}
              strokeWidth="4"
            />
            {/* Bottom Ground Return Busbar (0V Reference Slate) */}
            <path
              d="M 840 230 L 840 270 L 60 270 L 60 224"
              fill="none"
              stroke={isInputLive ? POTENTIAL_GND : DEENERGIZED_COLOR}
              strokeWidth="4"
            />

            {/* Vertical Shunt Branch at Switch Node (X = 420) */}
            <path
              d="M 420 110 L 420 170 M 420 220 L 420 270"
              fill="none"
              stroke={POTENTIAL_SW}
              strokeWidth="3.5"
            />

            {/* Output Capacitor Filter Branch at X = 600 */}
            <path
              d="M 600 110 L 600 190"
              fill="none"
              stroke={POTENTIAL_OUT}
              strokeWidth="3.5"
            />
            <path
              d="M 600 202 L 600 270"
              fill="none"
              stroke={isQ2Live ? POTENTIAL_GND : DEENERGIZED_COLOR}
              strokeWidth="3.5"
            />
          </g>

          {/* Node Junction Solder Dots (Rec 17: IEC 60445 Potential Coded) */}
          <circle cx="60" cy="110" r="5" fill={isInputLive ? POTENTIAL_POS : DEENERGIZED_COLOR} />
          <circle cx="420" cy="110" r="5" fill={POTENTIAL_SW} />
          <circle cx="420" cy="270" r="5" fill={isInputLive ? POTENTIAL_GND : DEENERGIZED_COLOR} />
          <circle cx="600" cy="110" r="5" fill={POTENTIAL_OUT} />
          <circle cx="600" cy="270" r="5" fill={isQ2Live ? POTENTIAL_GND : DEENERGIZED_COLOR} />
          <circle cx="840" cy="110" r="5" fill={isLoadLive ? POTENTIAL_OUT : DEENERGIZED_COLOR} />
          <circle cx="840" cy="270" r="5" fill={isLoadLive ? POTENTIAL_GND : DEENERGIZED_COLOR} />

          {/* ========================================================================= */}
          {/* DYNAMIC ELECTRON FLOW STREAM (Rec 4: Synced to Current & Physics Clock)  */}
          {/* ========================================================================= */}
          {currentFlowPath && !isDcmIdleState && (
            <path
              d={currentFlowPath}
              fill="none"
              stroke="#00ffb7"
              strokeWidth="3.5"
              strokeDasharray="8,6"
              strokeDashoffset={dashOffset}
              filter="url(#glow-cyan)"
            />
          )}

          {/* ========================================================================= */}
          {/* DC INPUT SOURCE & INFEED BREAKER 52-Q1                                     */}
          {/* ========================================================================= */}
          {/* 1. DC Source (+Vin) */}
          <g className="cursor-pointer group" onClick={() => setSelectedComp('VIN')}>
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
            <text x="60" y="240" fill="#00e5a0" fontSize="11" fontWeight="bold" textAnchor="middle">+{safeVin}V</text>
            <text x="60" y="252" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">DC SOURCE</text>
          </g>

          {/* 2. DC Input Breaker (52-Q1) */}
          <g className="cursor-pointer group" onClick={() => { onToggleQ1(); setSelectedComp('Q1'); }}>
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
            <line x1="135" y1="110" x2="152" y2="110" stroke={isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />
            <line
              x1="152"
              y1="110"
              x2={q1Closed ? '178' : '172'}
              y2={q1Closed ? '110' : '96'}
              stroke={q1Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth="4"
            />
            <line x1="178" y1="110" x2="195" y2="110" stroke={q1Closed ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />
            <text x="165" y="84" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">52-Q1</text>
            <text x="165" y="142" fill={q1Closed ? '#00e5a0' : '#f43f5e'} fontSize="9" fontWeight="extrabold" textAnchor="middle">
              [{q1Closed ? 'CLOSED' : 'TRIPPED'}]
            </text>
          </g>

          {/* ========================================================================= */}
          {/* DYNAMIC TOPOLOGY MORPHING COMPONENTS (Rec 1 & Rec 5)                      */}
          {/* ========================================================================= */}

          {/* --- POSITION 1: X = 260..340 on TOP RAIL --- */}
          {topology === 'boost' ? (
            /* BOOST: Inductor L sits on Top Rail (X=260..340) */
            <g className="cursor-pointer group" onClick={() => setSelectedComp('L')}>
              {/* Magnetic Flux Loops (Rec 5) */}
              <ellipse
                cx="300"
                cy="110"
                rx="48"
                ry="22"
                fill="none"
                stroke={isCoreSaturated ? '#ef4444' : isInductorCharging ? '#38bdf8' : '#10b981'}
                strokeWidth={isInductorCharging ? 2 : 1}
                strokeDasharray="4,3"
                opacity={isInductorCharging ? 0.9 : 0.4}
                filter="url(#flux-glow)"
              />
              <rect
                x="260"
                y="85"
                width="80"
                height="50"
                rx="12"
                fill="#07201a"
                stroke={selectedComp === 'L' ? HIGHLIGHT_COLOR : isCoreSaturated ? FAULT_COLOR : ENERGIZED_COLOR}
                strokeWidth={selectedComp === 'L' ? '4' : '2.5'}
              />
              <path
                d="M 268 110 Q 277 93, 287 110 Q 297 93, 307 110 Q 317 93, 327 110 Q 334 93, 342 110"
                fill="none"
                stroke={ENERGIZED_COLOR}
                strokeWidth="3.5"
              />
              {/* Terminal Polarity Badges (Lenz's Law) */}
              <text x="264" y="102" fill="#38bdf8" fontSize="8" fontWeight="bold">
                {isS1VisuallyOn ? '(+)' : '(-)'}
              </text>
              <text x="334" y="102" fill="#38bdf8" fontSize="8" fontWeight="bold">
                {isS1VisuallyOn ? '(-)' : '(+)'}
              </text>
              <text x="300" y="78" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">L = {safeInductanceuH}µH</text>
              <text x="300" y="148" fill="#00e5a0" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                {isCoreSaturated ? '🚨 CORE SAT' : `ΔIL = ${fmt(safeDeltaIL, 2)}A`}
              </text>
            </g>
          ) : (
            /* BUCK & BUCK-BOOST: MOSFET S1 sits on Top Rail (X=260..340) */
            <g className="cursor-pointer group" onClick={() => setSelectedComp('S1')}>
              <rect
                x="260"
                y="80"
                width="80"
                height="60"
                rx="8"
                fill="#0b1220"
                stroke={selectedComp === 'S1' ? HIGHLIGHT_COLOR : activeFault === 'S1_OPEN' ? FAULT_COLOR : isS1VisuallyOn ? ENERGIZED_COLOR : '#3b82f6'}
                strokeWidth={selectedComp === 'S1' ? '4' : '2.5'}
              />
              {/* Drain, Gate, Source */}
              <line x1="260" y1="110" x2="280" y2="110" stroke={isQ1Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3" />
              <line x1="280" y1="95" x2="280" y2="125" stroke="#94a3b8" strokeWidth="2.5" />
              <line x1="286" y1="95" x2="286" y2="125" stroke={isS1VisuallyOn ? ENERGIZED_COLOR : '#94a3b8'} strokeWidth="3.5" strokeDasharray="6 3" />
              <line x1="286" y1="110" x2="340" y2="110" stroke={isS1VisuallyOn ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3" />
              <text x="300" y="74" fill="#38bdf8" fontSize="9.5" fontWeight="bold" textAnchor="middle">S1 (MOSFET)</text>
              <text x="300" y="152" fill={isS1VisuallyOn ? '#00e5a0' : '#64748b'} fontSize="8" fontWeight="black" textAnchor="middle">
                {activeFault === 'S1_OPEN' ? 'OPEN FAULT' : isS1VisuallyOn ? 'CONDUCTING (ON)' : 'BLOCKING (OFF)'}
              </text>
            </g>
          )}

          {/* --- POSITION 2: X = 420 VERTICAL SHUNT TO GROUND --- */}
          {topology === 'boost' ? (
            /* BOOST: MOSFET S1 is Shunt Switch to GND (Drain at Node 110, Source at GND 270) */
            <g className="cursor-pointer group" onClick={() => setSelectedComp('S1')}>
              <rect
                x="385"
                y="170"
                width="70"
                height="55"
                rx="8"
                fill="#0b1220"
                stroke={selectedComp === 'S1' ? HIGHLIGHT_COLOR : isS1VisuallyOn ? ENERGIZED_COLOR : '#3b82f6'}
                strokeWidth={selectedComp === 'S1' ? '4' : '2'}
              />
              <line x1="420" y1="170" x2="420" y2="185" stroke={isSWNodeLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3" />
              <line x1="420" y1="210" x2="420" y2="225" stroke={isS1VisuallyOn ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3" />
              <text x="420" y="162" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">S1 (SHUNT)</text>
              <text x="420" y="238" fill={isS1VisuallyOn ? '#00e5a0' : '#64748b'} fontSize="8" fontWeight="bold" textAnchor="middle">
                {isS1VisuallyOn ? 'DISCHARGE TO GND' : 'OFF'}
              </text>
            </g>
          ) : topology === 'buckboost' ? (
            /* BUCK-BOOST: Inductor L is Vertical Shunt to GND */
            <g className="cursor-pointer group" onClick={() => setSelectedComp('L')}>
              <ellipse
                cx="420"
                cy="195"
                rx="22"
                ry="45"
                fill="none"
                stroke={isCoreSaturated ? '#ef4444' : isInductorCharging ? '#38bdf8' : '#10b981'}
                strokeWidth={isInductorCharging ? 2 : 1}
                strokeDasharray="4,3"
                opacity={isInductorCharging ? 0.9 : 0.4}
                filter="url(#flux-glow)"
              />
              <rect
                x="390"
                y="170"
                width="60"
                height="55"
                rx="10"
                fill="#07201a"
                stroke={selectedComp === 'L' ? HIGHLIGHT_COLOR : isCoreSaturated ? FAULT_COLOR : ENERGIZED_COLOR}
                strokeWidth={selectedComp === 'L' ? '4' : '2.5'}
              />
              <path
                d="M 420 175 Q 405 185, 420 195 Q 405 205, 420 215"
                fill="none"
                stroke={ENERGIZED_COLOR}
                strokeWidth="3"
              />
              <text x="420" y="162" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">L = {safeInductanceuH}µH</text>
              <text x="420" y="238" fill="#00e5a0" fontSize="8" fontWeight="bold" textAnchor="middle">
                {isCoreSaturated ? 'SAT' : `ΔIL: ${fmt(safeDeltaIL, 1)}A`}
              </text>
            </g>
          ) : (
            /* BUCK: Diode D1 is Vertical Shunt to GND (Anode at GND 270, Cathode at Node 110) */
            <g className="cursor-pointer group" onClick={() => setSelectedComp('DIODE')}>
              <rect
                x="390"
                y="170"
                width="60"
                height="55"
                rx="8"
                fill="#0d1526"
                stroke={selectedComp === 'DIODE' ? HIGHLIGHT_COLOR : isDiodeVisuallyOn ? WARNING_COLOR : '#3b82f6'}
                strokeWidth={selectedComp === 'DIODE' ? '3.5' : '2'}
              />
              {/* Diode symbol pointing UP toward cathode at top */}
              <polygon
                points="405,212 435,212 420,182"
                fill={isDiodeVisuallyOn ? WARNING_COLOR : 'none'}
                stroke={isDiodeVisuallyOn ? WARNING_COLOR : '#94a3b8'}
                strokeWidth="2.5"
              />
              <line x1="405" y1="182" x2="435" y2="182" stroke={isDiodeVisuallyOn ? WARNING_COLOR : '#94a3b8'} strokeWidth="3" />
              {/* Space-charge depletion barrier when reverse-biased */}
              {!isDiodeVisuallyOn && (
                <rect x="410" y="195" width="20" height="4" fill="#38bdf8" fillOpacity="0.45" stroke="#38bdf8" strokeWidth="0.8" rx="1" />
              )}
              <text x="420" y="162" fill="#94a3b8" fontSize="8.5" fontWeight="bold" textAnchor="middle">D1 (FREEWHEEL)</text>
              <text x="420" y="238" fill={isDiodeVisuallyOn ? '#f59e0b' : '#38bdf8'} fontSize="8" fontWeight="bold" textAnchor="middle">
                {isDiodeVisuallyOn ? 'FREEWHEELING ON' : 'REVERSE (Qrr: 120nC)'}
              </text>
            </g>
          )}

          {/* --- POSITION 3: X = 460..550 on TOP RAIL --- */}
          {topology === 'boost' ? (
            /* BOOST: Diode D1 sits on Top Rail (Anode at Node 420, Cathode to Output 600) */
            <g className="cursor-pointer group" onClick={() => setSelectedComp('DIODE')}>
              <rect
                x="470"
                y="85"
                width="75"
                height="50"
                rx="8"
                fill="#0d1526"
                stroke={selectedComp === 'DIODE' ? HIGHLIGHT_COLOR : isDiodeVisuallyOn ? WARNING_COLOR : '#3b82f6'}
                strokeWidth={selectedComp === 'DIODE' ? '3.5' : '2'}
              />
              {/* Diode pointing RIGHT */}
              <polygon
                points="495,95 495,125 520,110"
                fill={isDiodeVisuallyOn ? WARNING_COLOR : 'none'}
                stroke={isDiodeVisuallyOn ? WARNING_COLOR : '#94a3b8'}
                strokeWidth="2.5"
              />
              <line x1="520" y1="95" x2="520" y2="125" stroke={isDiodeVisuallyOn ? WARNING_COLOR : '#94a3b8'} strokeWidth="3" />
              {/* Space-charge depletion barrier when reverse-biased */}
              {!isDiodeVisuallyOn && (
                <rect x="506" y="100" width="4" height="20" fill="#38bdf8" fillOpacity="0.45" stroke="#38bdf8" strokeWidth="0.8" rx="1" />
              )}
              <text x="507" y="78" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">D1 (FORWARD)</text>
              <text x="507" y="148" fill={isDiodeVisuallyOn ? '#f59e0b' : '#38bdf8'} fontSize="8" fontWeight="bold" textAnchor="middle">
                {isDiodeVisuallyOn ? 'FORWARD ON' : 'REVERSE (Qrr: 120nC)'}
              </text>
            </g>
          ) : topology === 'buckboost' ? (
            /* BUCK-BOOST: Diode D1 on Top Rail (Cathode at Node 420, Anode to Negative Rail) */
            <g className="cursor-pointer group" onClick={() => setSelectedComp('DIODE')}>
              <rect
                x="470"
                y="85"
                width="75"
                height="50"
                rx="8"
                fill="#0d1526"
                stroke={selectedComp === 'DIODE' ? HIGHLIGHT_COLOR : isDiodeVisuallyOn ? WARNING_COLOR : '#3b82f6'}
                strokeWidth={selectedComp === 'DIODE' ? '3.5' : '2'}
              />
              {/* Diode pointing LEFT toward node (Cathode left) */}
              <polygon
                points="520,95 520,125 495,110"
                fill={isDiodeVisuallyOn ? WARNING_COLOR : 'none'}
                stroke={isDiodeVisuallyOn ? WARNING_COLOR : '#94a3b8'}
                strokeWidth="2.5"
              />
              <line x1="495" y1="95" x2="495" y2="125" stroke={isDiodeVisuallyOn ? WARNING_COLOR : '#94a3b8'} strokeWidth="3" />
              {/* Space-charge depletion barrier when reverse-biased */}
              {!isDiodeVisuallyOn && (
                <rect x="506" y="100" width="4" height="20" fill="#38bdf8" fillOpacity="0.45" stroke="#38bdf8" strokeWidth="0.8" rx="1" />
              )}
              <text x="507" y="78" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">D1 (INVERTING)</text>
              <text x="507" y="148" fill={isDiodeVisuallyOn ? '#f59e0b' : '#38bdf8'} fontSize="8" fontWeight="bold" textAnchor="middle">
                {isDiodeVisuallyOn ? 'CONDUCTION ON' : 'REVERSE (Qrr: 120nC)'}
              </text>
            </g>
          ) : (
            /* BUCK: Inductor L sits on Top Rail (X=460..550) */
            <g className="cursor-pointer group" onClick={() => setSelectedComp('L')}>
              <ellipse
                cx="505"
                cy="110"
                rx="48"
                ry="22"
                fill="none"
                stroke={isCoreSaturated ? '#ef4444' : isInductorCharging ? '#38bdf8' : '#10b981'}
                strokeWidth={isInductorCharging ? 2 : 1}
                strokeDasharray="4,3"
                opacity={isInductorCharging ? 0.9 : 0.4}
                filter="url(#flux-glow)"
              />
              <rect
                x="465"
                y="85"
                width="80"
                height="50"
                rx="12"
                fill="#07201a"
                stroke={selectedComp === 'L' ? HIGHLIGHT_COLOR : isCoreSaturated ? FAULT_COLOR : ENERGIZED_COLOR}
                strokeWidth={selectedComp === 'L' ? '4' : '2.5'}
              />
              <path
                d="M 473 110 Q 482 93, 492 110 Q 502 93, 512 110 Q 522 93, 532 110 Q 539 93, 547 110"
                fill="none"
                stroke={ENERGIZED_COLOR}
                strokeWidth="3.5"
              />
              {/* Terminal Polarity Badges */}
              <text x="469" y="102" fill="#38bdf8" fontSize="8" fontWeight="bold">
                {isS1VisuallyOn ? '(+)' : '(-)'}
              </text>
              <text x="539" y="102" fill="#38bdf8" fontSize="8" fontWeight="bold">
                {isS1VisuallyOn ? '(-)' : '(+)'}
              </text>
              <text x="505" y="78" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">L = {safeInductanceuH}µH</text>
              <text x="505" y="148" fill="#00e5a0" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                {isCoreSaturated ? '🚨 CORE SAT' : `ΔIL = ${fmt(safeDeltaIL, 2)}A`}
              </text>
            </g>
          )}

          {/* ========================================================================= */}
          {/* OUTPUT FILTER CAPACITOR C (X = 600) - ELECTRIC FIELD & CHARGE VISUALIZER */}
          {/* ========================================================================= */}
          <g className="cursor-pointer group" onClick={() => setSelectedComp('C')}>
            <title>DC Output Capacitor (C: {safeCapacitanceuF}µF • Stored Energy: {fmt(0.5 * (safeCapacitanceuF * 1e-6) * Math.pow(Vout_abs, 2) * 1000, 2)}mJ)</title>
            {/* Background inspection halo if selected */}
            {selectedComp === 'C' && (
              <rect x="570" y="168" width="80" height="64" rx="10" fill="#06b6d4" fillOpacity="0.12" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3,3" />
            )}
            {/* Top Plate (y = 190) */}
            <line
              x1="578"
              y1="190"
              x2="622"
              y2="190"
              stroke={selectedComp === 'C' ? HIGHLIGHT_COLOR : isQ2Live ? (topology === 'buckboost' ? '#38bdf8' : ENERGIZED_COLOR) : DEENERGIZED_COLOR}
              strokeWidth={selectedComp === 'C' ? '5.5' : '4.5'}
            />
            {/* Top Plate Surface Charges (+ for Buck/Boost, - for inverting Buck-Boost) */}
            {isQ2Live && (
              <g className="font-mono text-[8px] font-black select-none pointer-events-none" fill={topology === 'buckboost' ? '#38bdf8' : '#00e5a0'}>
                <text x="582" y="186">{topology === 'buckboost' ? '−' : '+'}</text>
                <text x="594" y="186">{topology === 'buckboost' ? '−' : '+'}</text>
                <text x="606" y="186">{topology === 'buckboost' ? '−' : '+'}</text>
                <text x="618" y="186">{topology === 'buckboost' ? '−' : '+'}</text>
              </g>
            )}

            {/* Dielectric Electric Field Vectors (E-Field) between y=190 and y=202 */}
            {isQ2Live && Vout_abs > 1 && (
              <g opacity={Math.min(1, Math.max(0.3, Vout_abs / 50))} stroke={topology === 'buckboost' ? '#38bdf8' : '#00e5a0'} strokeWidth="1.2">
                {/* 3 Electric Field Flux Lines with Arrowhead */}
                <line x1="588" y1="192" x2="588" y2="200" strokeDasharray="2,1" />
                <line x1="600" y1="192" x2="600" y2="200" strokeDasharray="2,1" />
                <line x1="612" y1="192" x2="612" y2="200" strokeDasharray="2,1" />
                {/* Field vectors arrow markers */}
                <polygon points="588,201 586,197 590,197" fill={topology === 'buckboost' ? '#38bdf8' : '#00e5a0'} />
                <polygon points="600,201 598,197 602,197" fill={topology === 'buckboost' ? '#38bdf8' : '#00e5a0'} />
                <polygon points="612,201 610,197 614,197" fill={topology === 'buckboost' ? '#38bdf8' : '#00e5a0'} />
              </g>
            )}

            {/* Bottom Plate (y = 202) */}
            <line
              x1="578"
              y1="202"
              x2="622"
              y2="202"
              stroke={selectedComp === 'C' ? HIGHLIGHT_COLOR : isQ2Live ? (topology === 'buckboost' ? ENERGIZED_COLOR : '#94a3b8') : DEENERGIZED_COLOR}
              strokeWidth={selectedComp === 'C' ? '5.5' : '4.5'}
            />
            {/* Bottom Plate Surface Charges (- for Buck/Boost, + for inverting Buck-Boost) */}
            {isQ2Live && (
              <g className="font-mono text-[8px] font-black select-none pointer-events-none" fill={topology === 'buckboost' ? '#00e5a0' : '#64748b'}>
                <text x="582" y="210">{topology === 'buckboost' ? '+' : '−'}</text>
                <text x="594" y="210">{topology === 'buckboost' ? '+' : '−'}</text>
                <text x="606" y="210">{topology === 'buckboost' ? '+' : '−'}</text>
                <text x="618" y="210">{topology === 'buckboost' ? '+' : '−'}</text>
              </g>
            )}

            {/* Parameter & Ripple Readout Badges */}
            <text x="632" y="183" fill="#34d399" fontSize="9" fontWeight="bold">Capacitance (C): {safeCapacitanceuF}µF</text>
            <text x="632" y="196" fill="#38bdf8" fontSize="8" fontWeight="bold">
              EC: {fmt(0.5 * (safeCapacitanceuF * 1e-6) * Math.pow(Vout_abs, 2) * 1000, 2)}mJ (E-Field)
            </text>
            <text x="632" y="209" fill="#94a3b8" fontSize="8" fontWeight="bold">ΔVout Ripple: {fmt(safeDeltaVout * 1000, 0)}mV</text>
          </g>

          {/* ========================================================================= */}
          {/* 52-Q2 BUS TIE BREAKER & 89-Q3 DISCONNECTOR                                */}
          {/* ========================================================================= */}
          {/* 52-Q2 Breaker */}
          <g className="cursor-pointer group" onClick={() => { onToggleQ2(); setSelectedComp('Q2'); }}>
            <rect
              x="670"
              y="92"
              width="60"
              height="36"
              rx="6"
              fill="#0b1220"
              stroke={selectedComp === 'Q2' ? HIGHLIGHT_COLOR : q2Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth={selectedComp === 'Q2' ? '3.5' : '2.5'}
            />
            <line x1="670" y1="110" x2="688" y2="110" stroke={isQ2Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />
            <line
              x1="688"
              y1="110"
              x2={q2Closed ? '712' : '706'}
              y2={q2Closed ? '110' : '96'}
              stroke={q2Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth="4"
            />
            <line x1="712" y1="110" x2="730" y2="110" stroke={q2Closed ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />
            <text x="700" y="84" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">52-Q2</text>
            <text x="700" y="142" fill={q2Closed ? '#00e5a0' : '#f43f5e'} fontSize="9" fontWeight="extrabold" textAnchor="middle">
              [{q2Closed ? 'CLOSED' : 'OPEN'}]
            </text>
          </g>

          {/* 89-Q3 Disconnector */}
          <g className="cursor-pointer group" onClick={() => { onToggleQ3(); setSelectedComp('Q3'); }}>
            <circle cx="755" cy="110" r="4.5" fill={isQ2Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
            <circle cx="805" cy="110" r="4.5" fill={isLoadLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
            <line
              x1="755"
              y1="110"
              x2={q3Closed ? '805' : '798'}
              y2={q3Closed ? '110' : '90'}
              stroke={q3Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth="3.5"
            />
            <text x="780" y="80" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">89-Q3</text>
          </g>

          {/* ========================================================================= */}
          {/* DC SUBSTATION RESISTIVE LOAD (X = 840)                                    */}
          {/* ========================================================================= */}
          <g className="cursor-pointer group" onClick={() => setSelectedComp('LOAD')}>
            <rect
              x="810"
              y="160"
              width="60"
              height="80"
              rx="8"
              fill="#0d1526"
              stroke={selectedComp === 'LOAD' ? HIGHLIGHT_COLOR : isLoadLive ? '#06b6d4' : DEENERGIZED_COLOR}
              strokeWidth={selectedComp === 'LOAD' ? '4' : '2.5'}
            />
            {/* Resistor zigzag */}
            <path
              d="M 840 170 L 840 180 L 830 185 L 850 195 L 830 205 L 850 215 L 830 225 L 840 230"
              fill="none"
              stroke={isLoadLive ? '#00e5a0' : '#64748b'}
              strokeWidth="3"
            />
            <text x="840" y="152" fill="#06b6d4" fontSize="10" fontWeight="extrabold" textAnchor="middle">
              {topology === 'buckboost' ? `-${fmt(Vout_abs, 1)}V` : `${fmt(Vout_abs, 1)}V`}
            </text>
            <text x="840" y="254" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle">
              {safeLoadR}Ω LOAD
            </text>
          </g>

          {/* ========================================================================= */}
          {/* LIVE MEASUREMENT PROBES (IF PROBES TOGGLED ON)                            */}
          {/* ========================================================================= */}
          {showProbes && (
            <g className="font-mono text-[9px] font-bold select-none pointer-events-none">
              {/* Probe 1: Vin */}
              <g transform="translate(60, 70)">
                <rect x="-48" y="-12" width="96" height="20" rx="4" fill="#0b1329" stroke="#00e5a0" strokeWidth="1.2" />
                <text x="0" y="2" fill="#00e5a0" textAnchor="middle">Input (Vin): {safeVin}V</text>
              </g>

              {/* Probe 2: Switch Node Vsw */}
              <g transform="translate(420, 70)">
                <rect x="-55" y="-12" width="110" height="20" rx="4" fill="#0b1329" stroke="#38bdf8" strokeWidth="1.2" />
                <text x="0" y="2" fill="#38bdf8" textAnchor="middle">
                  Switch (Vsw): {isS1VisuallyOn ? `${safeVin}V` : '-0.7V'}
                </text>
              </g>

              {/* Probe 3: Inductor Current IL */}
              <g transform="translate(505, 175)">
                <rect x="-48" y="-12" width="96" height="20" rx="4" fill="#0b1329" stroke="#f59e0b" strokeWidth="1.2" />
                <text x="0" y="2" fill="#f59e0b" textAnchor="middle">
                  Choke (IL): {fmt(safeIout, 2)}A
                </text>
              </g>

              {/* Probe 4: Vout */}
              <g transform="translate(840, 70)">
                <rect x="-50" y="-12" width="100" height="20" rx="4" fill="#0b1329" stroke="#06b6d4" strokeWidth="1.2" />
                <text x="0" y="2" fill="#06b6d4" textAnchor="middle">
                  Output (Vout): {topology === 'buckboost' ? `-${fmt(Vout_abs, 1)}V` : `${fmt(Vout_abs, 1)}V`}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* 4. BOTTOM COMPONENT INSPECTION CARD */}
      <div className="bg-[#0b1220] border-t border-slate-800 p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-cyan-300 text-xs sm:text-sm">{activeComp.title}</span>
            <span className="text-[10px] text-slate-400 font-normal">[{activeComp.subtitle}]</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-tight">{activeComp.explanation}</p>
          <div className="text-[10px] text-amber-300 font-bold mt-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 inline-block">
            {activeComp.stats}
          </div>
        </div>

        {activeComp.actionText && (
          <button
            type="button"
            onClick={() => {
              if (selectedComp === 'Q1') onToggleQ1();
              else if (selectedComp === 'Q2') onToggleQ2();
              else if (selectedComp === 'Q3') onToggleQ3();
              else if (selectedComp === 'S1' && onDutyChange) onDutyChange((duty + 10) % 90 || 20);
              else if (selectedComp === 'LOAD' && onLoadRChange) onLoadRChange(loadR === 10 ? 20 : loadR === 20 ? 5 : 10);
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] cursor-pointer shrink-0 transition-colors shadow-sm"
          >
            {activeComp.actionText}
          </button>
        )}
      </div>
    </div>
  );
};

export default AnimatedConverterSLD;
