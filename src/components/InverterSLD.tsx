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
import { GridTiedInverterPllLab } from './GridTiedInverterPllLab';

interface InverterSLDProps {
  Vdc: number;
  ma: number;
  f1: number;
  fc: number;
  inductanceMh: number;
  capacitanceUf: number;
  loadR: number;
  loadLMh: number;
  deadTimeUs: number;
  q1Closed: boolean;
  q2Closed: boolean;
  q3Closed: boolean;
  isEngineRunning: boolean;
  activeFault: string | null;
  Vout_rms: number;
  Iout_rms: number;
  Pout: number;
  Ploss: number;
  etaPct: number;
  thdPercent: number;
  onToggleQ1: () => void;
  onToggleQ2: () => void;
  onToggleQ3: () => void;
}

export const InverterSLD: React.FC<InverterSLDProps> = ({
  Vdc = 400,
  ma = 0.8,
  f1 = 50,
  fc = 5000,
  inductanceMh = 2.0,
  capacitanceUf = 20,
  loadR = 10,
  loadLMh = 5,
  deadTimeUs = 2.0,
  q1Closed = true,
  q2Closed = true,
  q3Closed = true,
  isEngineRunning = true,
  activeFault = null,
  Vout_rms = 230,
  Iout_rms = 23,
  Pout = 5290,
  Ploss = 120,
  etaPct = 97.8,
  thdPercent = 1.8,
  onToggleQ1,
  onToggleQ2,
  onToggleQ3,
}) => {
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [selectedComp, setSelectedComp] = useState<string>('S1');
  const [showProbes, setShowProbes] = useState<boolean>(true);
  const [showPllModal, setShowPllModal] = useState<boolean>(false);

  // Physics-Accurate SPWM Continuous Switching Clock
  const [spwmAngleRad, setSpwmAngleRad] = useState<number>(0); // 0 to 2*PI electrical angle
  const [timeDilation, setTimeDilation] = useState<number>(1.0); // 1.0 = normal, 0.25 = slow, 0.05 = ultra-slow
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [loadPfSlider, setLoadPfSlider] = useState<number>(0.8); // Lagging PF 0.2 to 1.0

  // Effective load phase lag angle phi (Inductive load)
  const phiRad = Math.acos(Math.max(0.2, Math.min(1.0, loadPfSlider)));
  // Instantaneous fundamental load current
  const iLoadInstant = Math.sin(spwmAngleRad - phiRad);
  const isLoadCurrentPositive = iLoadInstant >= 0;

  // Instantaneous SPWM reference and carrier modulation
  const visualMf = 15; // 15 carrier cycles per fundamental sine wave
  const carrierTriangle = Math.asin(Math.sin(spwmAngleRad * visualMf)) / (Math.PI / 2); // -1 to +1 triangle
  const refSine = (ma ?? 0.8) * Math.sin(spwmAngleRad); // -ma to +ma sine

  // Instantaneous H-Bridge Switching Gate Signals:
  const isS1Gate = isEngineRunning && activeFault !== 'S1_OPEN' && refSine > carrierTriangle;
  const isS2Gate = isEngineRunning && !isS1Gate;
  const isS3Gate = isEngineRunning && -refSine > carrierTriangle;
  const isS4Gate = isEngineRunning && !isS3Gate;

  // Effective positive half cycle for bridge output voltage polarity
  const isPositivePhase = Math.sin(spwmAngleRad) >= 0;

  // 4-Quadrant Reactive Power Flow & Body-Diode Freewheeling:
  // When voltage polarity and load current have opposite signs, current cannot pass through forward MOSFET channels;
  // it is forced through the antiparallel body diodes, pumping reactive energy BACK into the DC bus capacitor bank (P < 0)!
  const isFreewheeling = isEngineRunning && (
    (isPositivePhase && !isLoadCurrentPositive) ||
    (!isPositivePhase && isLoadCurrentPositive)
  );

  // Active Body Diodes vs Active Transistors:
  const isD1Conducting = isEngineRunning && !isPositivePhase && isLoadCurrentPositive;
  const isD4Conducting = isEngineRunning && !isPositivePhase && isLoadCurrentPositive;
  const isD2Conducting = isEngineRunning && isPositivePhase && !isLoadCurrentPositive;
  const isD3Conducting = isEngineRunning && isPositivePhase && !isLoadCurrentPositive;

  const isS1On = isS1Gate && !isFreewheeling;
  const isS2On = isS2Gate && !isFreewheeling;
  const isS3On = isS3Gate && !isFreewheeling;
  const isS4On = isS4Gate && !isFreewheeling;

  // Continuous Clock Loop
  useEffect(() => {
    if (!isEngineRunning || activeFault === 'S1_OPEN' || isPaused) {
      return;
    }

    let animId: number;
    let lastTime = performance.now();

    // Fundamental visual cycle period (base 2000ms dilated by timeDilation)
    const baseCycleMs = 2000;

    const step = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      setSpwmAngleRad((prev) => {
        const increment = (dt / (baseCycleMs / timeDilation)) * (2 * Math.PI);
        const next = prev + increment;
        return next >= (2 * Math.PI) ? next % (2 * Math.PI) : next;
      });

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isEngineRunning, activeFault, isPaused, timeDilation]);

  const fmt = (val: number | undefined | null, decimals = 1, fallback = '0.0'): string => {
    if (val === undefined || val === null || isNaN(val)) return fallback;
    return val.toFixed(decimals);
  };

  // Electrical Energization States
  const isInputLive = isEngineRunning && activeFault !== 'DC_UNDERVOLTAGE_TRIP';
  const isQ1Live = isInputLive && q1Closed;
  const isHBridgeLive = isQ1Live && activeFault !== 'S1_OPEN';
  const isACBusLive = isHBridgeLive && q2Closed;
  const isLoadLive = isACBusLive && q3Closed;

  // Standard Colors
  const ENERGIZED_COLOR = '#00e5a0'; // Cyan/Green Live
  const DEENERGIZED_COLOR = '#475569'; // Grey Dead
  const FAULT_COLOR = '#f43f5e'; // Red Fault
  const WARNING_COLOR = '#f59e0b'; // Amber Warning
  const HIGHLIGHT_COLOR = '#38bdf8'; // Sky Selection

  // Zoom Controls
  const handleZoomIn = () => setZoomScale((prev) => Math.min(1.8, prev + 0.15));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(0.7, prev - 0.15));
  const handleFitToView = () => setZoomScale(1.0);

  // Dynamic Current Flow Stream Path
  let currentFlowPath = '';
  if (isQ1Live) {
    if (isPositivePhase) {
      // S1 (Top Left) -> S4 (Bottom Right) Positive Half-Cycle Path
      currentFlowPath = isLoadLive
        ? 'M 60 110 L 130 110 L 200 110 L 260 110 L 290 110 L 290 180 L 370 180 L 460 180 L 520 180 L 590 180 L 670 180 L 730 180 L 800 180 L 800 280 L 370 280 L 290 280 L 200 280 L 60 280 L 60 224 Z'
        : 'M 60 110 L 130 110 L 200 110 L 260 110 L 290 110 L 290 180 L 370 180 L 520 180 L 520 280 L 370 280 L 200 280 L 60 280 L 60 224 Z';
    } else {
      // S3 (Top Right) -> S2 (Bottom Left) Negative Half-Cycle Path
      currentFlowPath = isLoadLive
        ? 'M 60 110 L 130 110 L 200 110 L 370 110 L 370 180 L 290 180 L 290 280 L 200 280 L 60 280 L 60 224 Z'
        : 'M 60 110 L 130 110 L 200 110 L 370 110 L 370 180 L 290 180 L 290 280 L 60 280 L 60 224 Z';
    }
  }

  // Component Database Inspector Data
  const COMP_DATABASE: Record<
    string,
    { title: string; subtitle: string; formula: string; explanation: string; stats: string; actionText?: string }
  > = {
    VIN: {
      title: 'DC Link Voltage Supply (+Vdc)',
      subtitle: 'ANSI / IEEE DC Infeed Potential',
      formula: 'Pdc = Vdc · Idc = Pout / η',
      explanation: 'Provides the high-voltage DC bus potential for the H-bridge inverter switches.',
      stats: `Infeed Voltage: ${Vdc}V DC | Status: ${isInputLive ? 'ENERGIZED (LIVE)' : 'ISOLATED'}`,
    },
    Q1: {
      title: 'DC Input Circuit Breaker (52-Q1)',
      subtitle: 'IEC 60947-2 DC Main Isolation Switch',
      formula: 'Icu = 30kA @ 1000VDC',
      explanation: 'Primary protection disconnect isolating the DC bus during upstream faults or safety lockouts.',
      stats: `State: ${q1Closed ? 'CLOSED (LIVE)' : 'TRIPPED / OPEN'} | Rating: 400A 1000VDC`,
      actionText: q1Closed ? 'CLICK TO TRIP 52-Q1' : 'CLICK TO CLOSE 52-Q1',
    },
    S1: {
      title: 'Leg A Upper MOSFET / IGBT Switch (S1)',
      subtitle: 'High-Side Semiconductor Pulse Switch',
      formula: 'Vab,1 = (4·Vdc/π) · ma | PWM f_c = ' + (fc / 1000) + 'kHz',
      explanation: 'Pulsed by SPWM gate drive against Leg B to synthesize sinusoidal AC output voltage.',
      stats: `State: ${isPositivePhase ? 'CONDUCTING (ON)' : 'BLOCKING (OFF)'} | Gate fc: ${fc / 1000}kHz | ma: ${ma}`,
    },
    S2: {
      title: 'Leg A Lower MOSFET / IGBT Switch (S2)',
      subtitle: 'Low-Side Semiconductor Pulse Switch',
      formula: 'Dead Time t_d = ' + deadTimeUs + 'µs',
      explanation: 'Complements S1 with mandatory dead-time delay to prevent DC link shoot-through short circuits.',
      stats: `State: ${!isPositivePhase ? 'CONDUCTING (ON)' : 'BLOCKING (OFF)'} | Dead-Time: ${deadTimeUs}µs`,
    },
    S3: {
      title: 'Leg B Upper MOSFET / IGBT Switch (S3)',
      subtitle: 'High-Side Semiconductor Pulse Switch',
      formula: 'Phase Shift Δθ = 180° vs Leg A',
      explanation: 'Operates in anti-phase with Leg A to provide full 4-quadrant bipolar AC output voltage switching.',
      stats: `State: ${!isPositivePhase ? 'CONDUCTING (ON)' : 'BLOCKING (OFF)'}`,
    },
    S4: {
      title: 'Leg B Lower MOSFET / IGBT Switch (S4)',
      subtitle: 'Low-Side Semiconductor Pulse Switch',
      formula: 'PWM Duty D(t) = 0.5 + 0.5·ma·sin(ωt)',
      explanation: 'Pairs with S1 during positive fundamental half-cycles to complete the AC current return loop.',
      stats: `State: ${isPositivePhase ? 'CONDUCTING (ON)' : 'BLOCKING (OFF)'}`,
    },
    CDC: {
      title: 'DC Link Storage Capacitor Bank (Cdc)',
      subtitle: 'High-Ripple Current Energy Buffer',
      formula: 'Cdc = Idc / (2·ω1·ΔVdc)',
      explanation: 'Buffers double-frequency (100Hz/120Hz) power pulsation inherent in single-phase inverters.',
      stats: `Rating: 2200µF 500VDC | DC Ripple: Low`,
    },
    LF: {
      title: 'Output LC Filter Choke Inductor (Lf)',
      subtitle: 'High-Frequency PWM Harmonic Filter Choke',
      formula: 'f_0 = 1 / (2π√(Lf·Cf)) | L = ' + inductanceMh + 'mH',
      explanation: 'Attenuates high-frequency 5kHz switching carrier harmonics, leaving clean 50Hz AC voltage.',
      stats: `Inductance: ${inductanceMh}mH | Cutoff f0: ${fmt(1000 / (2 * Math.PI * Math.sqrt(inductanceMh * 1e-3 * capacitanceUf * 1e-6)), 0)}Hz`,
    },
    CF: {
      title: 'Output LC Filter Capacitor (Cf)',
      subtitle: 'Shunt Harmonic Carrier Filter Capacitor',
      formula: 'Zc = 1 / (j 2π f_c Cf)',
      explanation: 'Shunts high-frequency carrier ripple currents to ground while presenting high impedance at 50Hz.',
      stats: `Capacitance: ${capacitanceUf}µF | THD Attenuation: > 95%`,
    },
    Q2: {
      title: 'AC Output Isolation Breaker (52-Q2)',
      subtitle: 'IEC 60947-2 AC Feeder Circuit Breaker',
      formula: 'Icu = 25kA @ 415VAC',
      explanation: 'Isolates the inverter output terminal from the AC distribution busbar.',
      stats: `State: ${q2Closed ? 'CLOSED (LIVE)' : 'OPEN'} | Rating: 100A 415VAC`,
      actionText: q2Closed ? 'CLICK TO OPEN 52-Q2' : 'CLICK TO CLOSE 52-Q2',
    },
    Q3: {
      title: 'Substation Load Disconnector (89-Q3)',
      subtitle: 'Load Isolator Switch',
      formula: 'Sout = Vout · Iout = ' + fmt(Pout / 1000, 2) + 'kVA',
      explanation: 'Connects or disconnects downstream substation load equipment.',
      stats: `State: ${q3Closed ? 'CLOSED (LOADED)' : 'ISOLATED'}`,
      actionText: q3Closed ? 'CLICK TO OPEN 89-Q3' : 'CLICK TO CLOSE 89-Q3',
    },
    LOAD: {
      title: 'Substation AC Load Demand (R-L)',
      subtitle: 'Substation AC Load (R = ' + loadR + 'Ω, L = ' + loadLMh + 'mH)',
      formula: 'Pout = Vout² / Zload = ' + fmt(Pout, 0) + 'W',
      explanation: 'Consumes fundamental 50Hz AC sinusoidal current at specified power factor.',
      stats: `Vout: ${fmt(Vout_rms, 1)}V RMS | Iout: ${fmt(Iout_rms, 1)}A RMS | Power: ${fmt(Pout, 0)}W | THD: ${fmt(thdPercent, 2)}%`,
    },
  };

  const activeComp = COMP_DATABASE[selectedComp] || COMP_DATABASE['S1'];

  const handleComponentAction = () => {
    if (selectedComp === 'Q1') onToggleQ1();
    else if (selectedComp === 'Q2') onToggleQ2();
    else if (selectedComp === 'Q3') onToggleQ3();
  };

  return (
    <div className="flex flex-col gap-2 w-full h-full min-h-[460px] font-mono select-none">
      {/* TOP CANVAS CONTROLS & HEADER STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#070b14] border-2 border-[#1e293b] rounded-xl text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-white flex items-center gap-1.5 text-xs">
            <Zap className="w-4 h-4 text-emerald-400" />
            SINGLE-PHASE FULL-BRIDGE INVERTER SCHEMATIC (SPWM)
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
            IEEE 519 / IEC 61800-9
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowProbes(!showProbes)}
            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer border transition-all ${
              showProbes
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            📊 {showProbes ? 'PROBES: ON' : 'PROBES: OFF'}
          </button>

          <button
            type="button"
            onClick={() => setShowPllModal(true)}
            className="px-2.5 py-1 rounded-lg font-bold text-[10px] cursor-pointer border bg-blue-600 hover:bg-blue-500 text-white border-blue-400 flex items-center gap-1 shadow-md transition-all"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>🌐 DQ PLL &amp; Anti-Islanding</span>
          </button>

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
                  setIsPaused(false);
                }}
                className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  timeDilation === spd.val && !isPaused
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {spd.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                isPaused
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isPaused ? 'PAUSED' : 'PAUSE'}
            </button>
          </div>

          {/* SPWM Angle Mini Gauge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#0b1220] border border-[#1e293b] px-2 py-1 rounded-xl text-[10px] font-mono">
            <span className="text-slate-400">θ:</span>
            <span className="text-cyan-300 font-bold">{((spwmAngleRad * 180) / Math.PI).toFixed(0)}°</span>
            <span className={`px-1 py-0.2 rounded text-[8px] font-bold ${isPositivePhase ? 'bg-emerald-950 text-emerald-400' : 'bg-blue-950 text-sky-400'}`}>
              {isPositivePhase ? '+ HALF' : '- HALF'}
            </span>
          </div>

          {/* Power Factor (Lagging PF) Dial */}
          <div className="flex items-center gap-1.5 bg-[#0b1220] border border-[#1e293b] px-2 py-0.5 rounded-xl text-[10px]">
            <span className="text-slate-400 font-bold">LOAD PF:</span>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={loadPfSlider}
              onChange={(e) => setLoadPfSlider(parseFloat(e.target.value))}
              className="w-16 accent-emerald-400 cursor-pointer"
              title={`Load Power Factor cosφ = ${loadPfSlider.toFixed(2)} (Lag angle ${(phiRad * 180 / Math.PI).toFixed(0)}°)`}
            />
            <span className="text-emerald-300 font-extrabold">{loadPfSlider.toFixed(2)}</span>
          </div>

          {/* 4-Quadrant Reactive Power Flow Badge */}
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase flex items-center gap-1 ${
              isFreewheeling
                ? 'bg-amber-950 text-amber-300 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)] animate-pulse'
                : 'bg-emerald-950 text-emerald-300 border-emerald-700'
            }`}
          >
            {isFreewheeling
              ? '⚡ REGEN: BODY-DIODES FREEWHEELING (P < 0)'
              : '⚡ INVERTING: MOSFETS CONDUCTION (P > 0)'}
          </span>

          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase ${
              activeFault
                ? 'bg-rose-950 text-rose-400 border-rose-800'
                : 'bg-emerald-950 text-emerald-400 border-emerald-800'
            }`}
          >
            {activeFault ? `FAULT: ${activeFault}` : 'STATUS: NORMAL SPWM'}
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

      {/* SVG WORKBENCH SCHEMATIC CANVAS (ViewBox 960 x 380) */}
      <div className="relative z-10 w-full flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-800 bg-[#040812] flex items-center justify-center p-1">
        <svg
          viewBox="0 0 960 380"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full max-h-full transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
        >
          <defs>
            {/* Soft Ambient Glow Filters */}
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ========================================================================= */}
          {/* 1. SEAMLESS ZERO-GAP CONTINUOUS POWER BUSBARS */}
          {/* ========================================================================= */}
          <g strokeLinecap="round" strokeLinejoin="round">
            {/* Top Positive DC Busbar (+Vdc Rail: Y = 60) */}
            <path
              d="M 50 60 L 105 60 M 165 60 L 280 60 L 380 60"
              fill="none"
              stroke={isQ1Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth="4"
            />

            {/* DC Link Source Leads (+Vdc top, -Vdc bottom) */}
            <path d="M 50 60 L 50 156" fill="none" stroke={isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="4" />
            <path d="M 50 204 L 50 300" fill="none" stroke={isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="4" />

            {/* Bottom Negative DC Busbar (-Vdc / Ground Rail: Y = 300) */}
            <path
              d="M 50 300 L 200 300 L 280 300 L 380 300"
              fill="none"
              stroke={isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth="4"
            />

            {/* DC Link Capacitor Bank (Cdc) Vertical Branch (X = 200) */}
            <path
              d="M 200 60 L 200 165 M 200 177 L 200 300"
              fill="none"
              stroke={isQ1Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth="3.5"
            />

            {/* Leg A H-Bridge Vertical Branch (X = 280) */}
            <path
              d="M 280 60 L 280 95 M 280 145 L 280 215 M 280 265 L 280 300"
              fill="none"
              stroke={isHBridgeLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth="3.5"
            />

            {/* Leg B H-Bridge Vertical Branch (X = 380) */}
            <path
              d="M 380 60 L 380 95 M 380 145 L 380 215 M 380 265 L 380 300"
              fill="none"
              stroke={isHBridgeLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth="3.5"
            />

            {/* AC Line A Feeder (Out from Leg A Midpoint Va: Y = 150) */}
            <path
              d="M 280 180 L 280 150 L 470 150 M 530 150 L 590 150 M 590 150 L 655 150 M 715 150 L 745 150 M 795 150 L 850 150"
              fill="none"
              stroke={isACBusLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth="3.5"
            />

            {/* AC Line B Feeder / Neutral Return (Out from Leg B Midpoint Vb: Y = 240) */}
            <path
              d="M 380 180 L 380 240 L 590 240 L 655 240 M 715 240 L 745 240 M 795 240 L 850 240"
              fill="none"
              stroke={isACBusLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth="3.5"
            />

            {/* LC Filter Capacitor Cf Vertical Shunt Branch (X = 590, between Line A Y=150 & Line B Y=240) */}
            <path
              d="M 590 150 L 590 185 M 590 197 L 590 240"
              fill="none"
              stroke={isACBusLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth="3"
            />
          </g>

          {/* Node Junction Solder Dots */}
          <circle cx="50" cy="60" r="5" fill={isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="50" cy="300" r="5" fill={isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="200" cy="60" r="5" fill={isQ1Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="200" cy="300" r="5" fill={isQ1Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="280" cy="60" r="5" fill={isQ1Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="280" cy="300" r="5" fill={isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="380" cy="60" r="5" fill={isQ1Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="380" cy="300" r="5" fill={isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          
          <circle cx="280" cy="180" r="5.5" fill={isHBridgeLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="380" cy="180" r="5.5" fill={isHBridgeLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="590" cy="150" r="5" fill={isACBusLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="590" cy="240" r="5" fill={isACBusLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="850" cy="150" r="5" fill={isLoadLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
          <circle cx="850" cy="240" r="5" fill={isLoadLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />

          {/* REAL PHYSICS ANIMATED CURRENT FLOW STREAM (4-QUADRANT INVERTING VS REGENERATIVE FREEWHEELING) */}
          {isQ1Live && (
            <path
              d={
                isFreewheeling
                  ? isPositivePhase
                    ? 'M 850 240 L 745 240 L 655 240 L 590 240 L 380 240 L 380 60 L 200 60 L 200 300 L 280 300 L 280 150 L 470 150 L 590 150 L 655 150 L 745 150 L 850 150 Z'
                    : 'M 850 150 L 745 150 L 655 150 L 590 150 L 470 150 L 280 150 L 280 60 L 200 60 L 200 300 L 380 300 L 380 240 L 590 240 L 655 240 L 745 240 L 850 240 Z'
                  : isPositivePhase
                  ? isLoadLive
                    ? 'M 50 60 L 280 60 L 280 150 L 470 150 L 530 150 L 590 150 L 655 150 L 745 150 L 850 150 L 850 240 L 745 240 L 655 240 L 590 240 L 380 240 L 380 300 L 50 300 Z'
                    : 'M 50 60 L 280 60 L 280 150 L 470 150 L 530 150 L 590 150 L 590 240 L 380 240 L 380 300 L 50 300 Z'
                  : isLoadLive
                    ? 'M 50 60 L 380 60 L 380 240 L 590 240 L 655 240 L 745 240 L 850 240 L 850 150 L 745 150 L 655 150 L 590 150 L 470 150 L 280 150 L 280 300 L 50 300 Z'
                    : 'M 50 60 L 380 60 L 380 240 L 590 240 L 590 150 L 470 150 L 280 150 L 280 300 L 50 300 Z'
              }
              fill="none"
              stroke={isFreewheeling ? '#f59e0b' : '#00ffb7'}
              strokeWidth={isFreewheeling ? '4' : '3.5'}
              strokeDasharray="8,6"
              className="animate-[dash_1s_linear_infinite]"
              style={{ animationDirection: isFreewheeling ? 'normal' : 'reverse' }}
            />
          )}

          {/* ========================================================================= */}
          {/* 2. IEC/IEEE STANDARD ELECTRICAL SYMBOLS */}
          {/* ========================================================================= */}

          {/* 1. DC INPUT VOLTAGE SOURCE */}
          <g className="cursor-pointer group" onClick={() => setSelectedComp('VIN')}>
            <title>DC Link Infeed (+Vdc: {Vdc}V DC) - Click to inspect</title>
            <circle
              cx="50"
              cy="180"
              r="24"
              fill="#0d1526"
              stroke={selectedComp === 'VIN' ? HIGHLIGHT_COLOR : isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth={selectedComp === 'VIN' ? '3.5' : '2.5'}
            />
            <line x1="36" y1="174" x2="64" y2="174" stroke={ENERGIZED_COLOR} strokeWidth="3" />
            <line x1="50" y1="167" x2="50" y2="181" stroke={ENERGIZED_COLOR} strokeWidth="2.5" />
            <line x1="40" y1="187" x2="60" y2="187" stroke="#94a3b8" strokeWidth="2.5" />
            <text x="50" y="220" fill="#00e5a0" fontSize="11" fontWeight="bold" textAnchor="middle">+{Vdc}V DC</text>
            <text x="50" y="233" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">DC SOURCE</text>
          </g>

          {/* 2. BREAKER 52-Q1 (DC INPUT) */}
          <g className="cursor-pointer group" onClick={() => { onToggleQ1(); setSelectedComp('Q1'); }}>
            <title>DC Input Main Circuit Breaker (52-Q1) - Click to toggle</title>
            <rect
              x="105"
              y="42"
              width="60"
              height="36"
              rx="6"
              fill="#0b1220"
              stroke={selectedComp === 'Q1' ? HIGHLIGHT_COLOR : q1Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth={selectedComp === 'Q1' ? '3.5' : '2.5'}
            />
            <line x1="100" y1="60" x2="122" y2="60" stroke={isInputLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />
            <line
              x1="122"
              y1="60"
              x2={q1Closed ? '148' : '142'}
              y2={q1Closed ? '60' : '46'}
              stroke={q1Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth="4"
            />
            <line x1="148" y1="60" x2="165" y2="60" stroke={q1Closed ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />
            <text x="135" y="34" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">52-Q1 (DC)</text>
          </g>

          {/* 3. DC LINK CAPACITOR Cdc */}
          <g className="cursor-pointer group" onClick={() => setSelectedComp('CDC')}>
            <title>DC Link Storage Capacitor Bank (Cdc: 2200µF) - Click to inspect</title>
            <line x1="182" y1="165" x2="218" y2="165" stroke={selectedComp === 'CDC' ? HIGHLIGHT_COLOR : isQ1Live ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="4" />
            <line x1="182" y1="177" x2="218" y2="177" stroke="#94a3b8" strokeWidth="4" />
            <text x="200" y="196" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle">Cdc 2200µF</text>
          </g>

          {/* 4. H-BRIDGE LEG A UPPER MOSFET S1 & DIODE D1 */}
          <g className="cursor-pointer group" onClick={() => setSelectedComp('S1')}>
            <title>Leg A Upper MOSFET (S1) + Anti-Parallel Diode D1 - Click to inspect</title>
            <rect
              x="255"
              y="95"
              width="50"
              height="50"
              rx="8"
              fill={isS1On ? '#07271e' : '#0d1526'}
              stroke={selectedComp === 'S1' ? HIGHLIGHT_COLOR : activeFault === 'S1_OPEN' ? FAULT_COLOR : isS1On ? ENERGIZED_COLOR : '#334155'}
              strokeWidth={selectedComp === 'S1' ? '3.5' : isS1On ? '2.5' : '1.5'}
              filter={isS1On ? 'url(#glow-emerald)' : undefined}
            />
            <text x="280" y="120" fill="#ffffff" fontSize="11" fontWeight="extrabold" textAnchor="middle">S1</text>
            <text x="280" y="133" fill={isS1On ? '#00e5a0' : '#64748b'} fontSize="8" fontWeight="bold" textAnchor="middle">
              {isS1On ? 'ON' : 'OFF'}
            </text>
            <text x="280" y="86" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">LEG A (TOP)</text>

            {/* Antiparallel Body Diode D1 */}
            <g opacity={isD1Conducting ? 1.0 : 0.7}>
              <line x1="240" y1="145" x2="240" y2="95" stroke={isD1Conducting ? '#f59e0b' : '#64748b'} strokeWidth="1.8" />
              <polygon
                points="234,128 246,128 240,112"
                fill={isD1Conducting ? '#f59e0b' : '#1e293b'}
                stroke={isD1Conducting ? '#fbbf24' : '#64748b'}
                strokeWidth="1.5"
              />
              <line x1="233" y1="112" x2="247" y2="112" stroke={isD1Conducting ? '#fbbf24' : '#64748b'} strokeWidth="2" />
              <text x="238" y="104" fill={isD1Conducting ? '#fbbf24' : '#64748b'} fontSize="8" fontWeight="bold" textAnchor="middle">
                {isD1Conducting ? 'D1 ⚡' : 'D1'}
              </text>
            </g>
          </g>

          {/* 5. H-BRIDGE LEG A LOWER MOSFET S2 & DIODE D2 */}
          <g className="cursor-pointer group" onClick={() => setSelectedComp('S2')}>
            <title>Leg A Lower MOSFET (S2) + Anti-Parallel Diode D2 - Click to inspect</title>
            <rect
              x="255"
              y="215"
              width="50"
              height="50"
              rx="8"
              fill={isS2On ? '#07271e' : '#0d1526'}
              stroke={selectedComp === 'S2' ? HIGHLIGHT_COLOR : isS2On ? ENERGIZED_COLOR : '#334155'}
              strokeWidth={selectedComp === 'S2' ? '3.5' : isS2On ? '2.5' : '1.5'}
              filter={isS2On ? 'url(#glow-emerald)' : undefined}
            />
            <text x="280" y="240" fill="#ffffff" fontSize="11" fontWeight="extrabold" textAnchor="middle">S2</text>
            <text x="280" y="253" fill={isS2On ? '#00e5a0' : '#64748b'} fontSize="8" fontWeight="bold" textAnchor="middle">
              {isS2On ? 'ON' : 'OFF'}
            </text>
            <text x="280" y="280" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">LEG A (BTM)</text>

            {/* Antiparallel Body Diode D2 */}
            <g opacity={isD2Conducting ? 1.0 : 0.7}>
              <line x1="240" y1="265" x2="240" y2="215" stroke={isD2Conducting ? '#f59e0b' : '#64748b'} strokeWidth="1.8" />
              <polygon
                points="234,248 246,248 240,232"
                fill={isD2Conducting ? '#f59e0b' : '#1e293b'}
                stroke={isD2Conducting ? '#fbbf24' : '#64748b'}
                strokeWidth="1.5"
              />
              <line x1="233" y1="232" x2="247" y2="232" stroke={isD2Conducting ? '#fbbf24' : '#64748b'} strokeWidth="2" />
              <text x="238" y="224" fill={isD2Conducting ? '#fbbf24' : '#64748b'} fontSize="8" fontWeight="bold" textAnchor="middle">
                {isD2Conducting ? 'D2 ⚡' : 'D2'}
              </text>
            </g>
          </g>

          {/* 6. H-BRIDGE LEG B UPPER MOSFET S3 & DIODE D3 */}
          <g className="cursor-pointer group" onClick={() => setSelectedComp('S3')}>
            <title>Leg B Upper MOSFET (S3) + Anti-Parallel Diode D3 - Click to inspect</title>
            <rect
              x="355"
              y="95"
              width="50"
              height="50"
              rx="8"
              fill={isS3On ? '#07271e' : '#0d1526'}
              stroke={selectedComp === 'S3' ? HIGHLIGHT_COLOR : isS3On ? ENERGIZED_COLOR : '#334155'}
              strokeWidth={selectedComp === 'S3' ? '3.5' : isS3On ? '2.5' : '1.5'}
              filter={isS3On ? 'url(#glow-emerald)' : undefined}
            />
            <text x="380" y="120" fill="#ffffff" fontSize="11" fontWeight="extrabold" textAnchor="middle">S3</text>
            <text x="380" y="133" fill={isS3On ? '#00e5a0' : '#64748b'} fontSize="8" fontWeight="bold" textAnchor="middle">
              {isS3On ? 'ON' : 'OFF'}
            </text>
            <text x="380" y="86" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">LEG B (TOP)</text>

            {/* Antiparallel Body Diode D3 */}
            <g opacity={isD3Conducting ? 1.0 : 0.7}>
              <line x1="420" y1="145" x2="420" y2="95" stroke={isD3Conducting ? '#f59e0b' : '#64748b'} strokeWidth="1.8" />
              <polygon
                points="414,128 426,128 420,112"
                fill={isD3Conducting ? '#f59e0b' : '#1e293b'}
                stroke={isD3Conducting ? '#fbbf24' : '#64748b'}
                strokeWidth="1.5"
              />
              <line x1="413" y1="112" x2="427" y2="112" stroke={isD3Conducting ? '#fbbf24' : '#64748b'} strokeWidth="2" />
              <text x="420" y="104" fill={isD3Conducting ? '#fbbf24' : '#64748b'} fontSize="8" fontWeight="bold" textAnchor="middle">
                {isD3Conducting ? 'D3 ⚡' : 'D3'}
              </text>
            </g>
          </g>

          {/* 7. H-BRIDGE LEG B LOWER MOSFET S4 & DIODE D4 */}
          <g className="cursor-pointer group" onClick={() => setSelectedComp('S4')}>
            <title>Leg B Lower MOSFET (S4) + Anti-Parallel Diode D4 - Click to inspect</title>
            <rect
              x="355"
              y="215"
              width="50"
              height="50"
              rx="8"
              fill={isS4On ? '#07271e' : '#0d1526'}
              stroke={selectedComp === 'S4' ? HIGHLIGHT_COLOR : isS4On ? ENERGIZED_COLOR : '#334155'}
              strokeWidth={selectedComp === 'S4' ? '3.5' : isS4On ? '2.5' : '1.5'}
              filter={isS4On ? 'url(#glow-emerald)' : undefined}
            />
            <text x="380" y="240" fill="#ffffff" fontSize="11" fontWeight="extrabold" textAnchor="middle">S4</text>
            <text x="380" y="253" fill={isS4On ? '#00e5a0' : '#64748b'} fontSize="8" fontWeight="bold" textAnchor="middle">
              {isS4On ? 'ON' : 'OFF'}
            </text>
            <text x="380" y="280" fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">LEG B (BTM)</text>

            {/* Antiparallel Body Diode D4 */}
            <g opacity={isD4Conducting ? 1.0 : 0.7}>
              <line x1="420" y1="265" x2="420" y2="215" stroke={isD4Conducting ? '#f59e0b' : '#64748b'} strokeWidth="1.8" />
              <polygon
                points="414,248 426,248 420,232"
                fill={isD4Conducting ? '#f59e0b' : '#1e293b'}
                stroke={isD4Conducting ? '#fbbf24' : '#64748b'}
                strokeWidth="1.5"
              />
              <line x1="413" y1="232" x2="427" y2="232" stroke={isD4Conducting ? '#fbbf24' : '#64748b'} strokeWidth="2" />
              <text x="420" y="224" fill={isD4Conducting ? '#fbbf24' : '#64748b'} fontSize="8" fontWeight="bold" textAnchor="middle">
                {isD4Conducting ? 'D4 ⚡' : 'D4'}
              </text>
            </g>
          </g>

          {/* 8. OUTPUT LC FILTER CHOKE INDUCTOR Lf (in series on Line A Y=150) */}
          <g className="cursor-pointer group" onClick={() => setSelectedComp('LF')}>
            <title>LC Low-Pass Filter Choke Inductor (Lf: {inductanceMh}mH) - Click to inspect</title>
            <rect
              x="470"
              y="130"
              width="60"
              height="40"
              rx="10"
              fill="#07201a"
              stroke={selectedComp === 'LF' ? HIGHLIGHT_COLOR : isACBusLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR}
              strokeWidth={selectedComp === 'LF' ? '4' : '2.5'}
            />
            <path d="M 476 150 Q 484 135, 492 150 Q 500 135, 508 150 Q 516 135, 524 150" fill="none" stroke={ENERGIZED_COLOR} strokeWidth="3" />
            <text x="500" y="123" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">Lf = {inductanceMh}mH</text>
            <text x="500" y="184" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">LINE A CHOKE</text>
          </g>

          {/* 9. OUTPUT LC FILTER CAPACITOR Cf (vertical shunt between Line A Y=150 & Line B Y=240) */}
          <g className="cursor-pointer group" onClick={() => setSelectedComp('CF')}>
            <title>LC Low-Pass Filter Capacitor (Cf: {capacitanceUf}µF) - Click to inspect</title>
            <line x1="572" y1="185" x2="608" y2="185" stroke={selectedComp === 'CF' ? HIGHLIGHT_COLOR : isACBusLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="4" />
            <line x1="572" y1="197" x2="608" y2="197" stroke="#94a3b8" strokeWidth="4" />
            <text x="590" y="215" fill="#34d399" fontSize="9" fontWeight="bold" textAnchor="middle">Cf {capacitanceUf}µF</text>
          </g>

          {/* 10. DUAL-POLE AC OUTPUT BREAKER 52-Q2 */}
          <g className="cursor-pointer group" onClick={() => { onToggleQ2(); setSelectedComp('Q2'); }}>
            <title>AC Output Feeder Breaker (52-Q2) - Click to toggle</title>
            <rect
              x="655"
              y="130"
              width="60"
              height="130"
              rx="8"
              fill="#0b1220"
              stroke={selectedComp === 'Q2' ? HIGHLIGHT_COLOR : q2Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth={selectedComp === 'Q2' ? '3.5' : '2.5'}
            />
            {/* Line A Pole */}
            <line x1="645" y1="150" x2="667" y2="150" stroke={isACBusLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />
            <line
              x1="667"
              y1="150"
              x2={q2Closed ? '693' : '687'}
              y2={q2Closed ? '150' : '136'}
              stroke={q2Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth="3.5"
            />
            <line x1="693" y1="150" x2="715" y2="150" stroke={q2Closed ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />

            {/* Line B Pole */}
            <line x1="645" y1="240" x2="667" y2="240" stroke={isACBusLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />
            <line
              x1="667"
              y1="240"
              x2={q2Closed ? '693' : '687'}
              y2={q2Closed ? '240' : '226'}
              stroke={q2Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth="3.5"
            />
            <line x1="693" y1="240" x2="715" y2="240" stroke={q2Closed ? ENERGIZED_COLOR : DEENERGIZED_COLOR} strokeWidth="3.5" />

            {/* Mechanical Ganged Link */}
            <line x1="680" y1="145" x2="680" y2="235" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,3" />

            <text x="685" y="122" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">52-Q2 (2-POLE AC)</text>
          </g>

          {/* 11. SUBSTATION LOAD DISCONNECTOR 89-Q3 */}
          <g className="cursor-pointer group" onClick={() => { onToggleQ3(); setSelectedComp('Q3'); }}>
            <title>Load Disconnector (89-Q3) - Click to toggle</title>
            <circle cx="745" cy="150" r="4" fill={isACBusLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
            <circle cx="795" cy="150" r="4" fill={isLoadLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
            <line
              x1="745"
              y1="150"
              x2={q3Closed ? '795' : '787'}
              y2={q3Closed ? '150' : '135'}
              stroke={q3Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth="3"
            />

            <circle cx="745" cy="240" r="4" fill={isACBusLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
            <circle cx="795" cy="240" r="4" fill={isLoadLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
            <line
              x1="745"
              y1="240"
              x2={q3Closed ? '795' : '787'}
              y2={q3Closed ? '240' : '225'}
              stroke={q3Closed ? ENERGIZED_COLOR : FAULT_COLOR}
              strokeWidth="3"
            />

            <line x1="770" y1="145" x2="770" y2="235" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,3" />

            <text x="770" y="122" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">89-Q3</text>
          </g>

          {/* 12. SUBSTATION AC LOAD DEMAND R-L */}
          <g className="cursor-pointer group" onClick={() => setSelectedComp('LOAD')}>
            <title>Substation AC Load (R: {loadR}Ω, L: {loadLMh}mH) - Click to inspect</title>
            <rect
              x="840"
              y="130"
              width="70"
              height="130"
              rx="8"
              fill="#0d1526"
              stroke={selectedComp === 'LOAD' ? HIGHLIGHT_COLOR : isLoadLive ? '#06b6d4' : DEENERGIZED_COLOR}
              strokeWidth={selectedComp === 'LOAD' ? '4' : '2.5'}
            />
            {/* Load Terminals */}
            <circle cx="850" cy="150" r="4" fill={isLoadLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
            <circle cx="850" cy="240" r="4" fill={isLoadLive ? ENERGIZED_COLOR : DEENERGIZED_COLOR} />
            <path d="M 875 145 L 865 155 L 885 170 L 865 185 L 875 195 M 875 195 Q 885 205, 875 215 Q 865 225, 875 235" fill="none" stroke={isLoadLive ? '#06b6d4' : '#64748b'} strokeWidth="2.5" />
            <text x="875" y="118" fill="#ffffff" fontSize="9" fontWeight="extrabold" textAnchor="middle">AC LOAD (R-L)</text>
            <text x="875" y="274" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">{fmt(Vout_rms, 1)}V AC</text>
            <text x="875" y="287" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">{fmt(Pout, 0)}W ({fmt(Iout_rms, 1)}A)</text>
          </g>

          {/* LIVE PROBES & AC OUTPUT WAVEFORM MINI MONITOR */}
          {showProbes && (
            <g className="font-mono text-[9px] font-extrabold select-none pointer-events-none">
              <g transform="translate(30, 20)">
                <rect width="60" height="18" rx="4" fill="#0b1426" stroke="#00e5a0" strokeWidth="1" />
                <text x="30" y="13" fill="#00e5a0" textAnchor="middle">+{Vdc}V DC</text>
              </g>
              <g transform="translate(420, 20)">
                <rect width="76" height="18" rx="4" fill="#0b1426" stroke="#38bdf8" strokeWidth="1" />
                <text x="38" y="13" fill="#38bdf8" textAnchor="middle">Vab: ±{Vdc}V PWM</text>
              </g>

              {/* LIVE AC OUTPUT SINUSOIDAL WAVEFORM MINIATURE OSCILLOSCOPE */}
              <g transform="translate(0, 0)">
                <rect x="750" y="10" width="160" height="75" rx="8" fill="#030712" stroke="#00e5a0" strokeWidth="1.5" />
                <text x="830" y="22" fill="#34d399" fontSize="8" fontWeight="bold" textAnchor="middle">CH3: AC Vout(t) Waveform</text>
                <line x1="755" y1="48" x2="905" y2="48" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,2" />
                <path
                  d={Array.from({ length: 31 }, (_, i) => {
                    const x = 755 + (i / 30) * 150;
                    const t = (i / 30) * 2 * Math.PI * 2;
                    let v = Vout_rms * Math.SQRT2 * Math.sin(t);
                    if (activeFault === 'S1_OPEN') v = Math.max(0, v);
                    const y = 48 - (v / Math.max(100, Vdc)) * 24;
                    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#00e5a0"
                  strokeWidth="2"
                />
                <text x="830" y="76" fill="#f59e0b" fontSize="8" fontWeight="bold" textAnchor="middle">
                  {fmt(Vout_rms, 1)}V RMS ({f1}Hz) | THD: {fmt(thdPercent, 2)}%
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>


      {/* COMPONENT INSPECTOR DRAWER */}
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

      {showPllModal && (
        <div className="fixed inset-0 z-50 bg-[#060911]/95 backdrop-blur-md flex flex-col p-4 gap-3 select-none overflow-y-auto">
          <GridTiedInverterPllLab onClose={() => setShowPllModal(false)} />
        </div>
      )}
    </div>
  );
};

export default InverterSLD;
