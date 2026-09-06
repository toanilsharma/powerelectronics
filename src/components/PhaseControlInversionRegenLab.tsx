import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  RotateCcw,
  Zap,
  Sliders,
  Play,
  Pause,
  Info,
  Activity,
  AlertTriangle,
  Flame,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Layers,
  Sparkles,
  Gauge,
  CheckCircle2,
  XCircle,
  PowerOff
} from 'lucide-react';

interface PhaseControlInversionRegenLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * PhaseControlInversionRegenLab.tsx
 * 
 * Recommendation 6: Inversion, Regenerative Braking & Commutation Failure Breakdown Simulator
 * 
 * Features:
 *  - Continuous transition from Rectification (alpha < 90 deg) to Inversion (alpha > 90 deg).
 *  - Power flow reversal: AC -> DC (Rectifier/Motoring) vs DC -> AC (Inverter/Regeneration).
 *  - Overhauling DC motor Back-EMF (Eb) driving energy back into the AC grid.
 *  - Extinction angle gamma = 180 - (alpha + mu).
 *  - Live calculation of safety margin against thyristor turn-off time (tq).
 *  - Catastrophic Commutation Failure breakdown simulator:
 *      Triggered when alpha + mu + gamma_min >= 180 deg or via manual fault injection button.
 *      AC line + DC source short-circuit, huge current spike, breaker trip animation and audio cue.
 */
export const PhaseControlInversionRegenLab: React.FC<PhaseControlInversionRegenLabProps> = ({
  className = '',
  onClose,
}) => {
  // Operating parameters
  const [alpha, setAlpha] = useState<number>(140); // Firing angle (0 - 170 deg)
  const [backEmfEb, setBackEmfEb] = useState<number>(350); // DC Back-EMF in Volts (reversing polarity)
  const [loopRes, setLoopRes] = useState<number>(1.2); // Loop resistance in Ohms
  const [vAcRms, setVAcRms] = useState<number>(415); // AC supply voltage (V RMS)
  const [gridFreq, setGridFreq] = useState<number>(50); // Grid frequency (Hz)
  const [tqMicroSec, setTqMicroSec] = useState<number>(40); // Thyristor turn-off time (us)

  // Simulation & Fault states
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [time, setTime] = useState<number>(0);
  const [faultTripped, setFaultTripped] = useState<boolean>(false);
  const [faultType, setFaultType] = useState<'none' | 'commutation_failure'>('none');
  const [breakerOpen, setBreakerOpen] = useState<boolean>(false);

  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      if (isPlaying && !breakerOpen) {
        setTime((t) => (t + dt * 60) % 360);
      }
      animRef.current = requestAnimationFrame(loop);
    };
    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, breakerOpen]);

  // Mathematical & Physical Calculations
  const physics = useMemo(() => {
    const omega = 2 * Math.PI * gridFreq;
    const vmLL = vAcRms * Math.SQRT2;
    const alphaRad = (alpha * Math.PI) / 180;

    // Ideal 3-phase 6-pulse average converter voltage:
    // Vd0 = (3 * sqrt(2) / pi) * V_LL = (3 * VmLL) / pi approx 1.35 * V_LL
    const vd0 = (3 * vmLL) / Math.PI;
    const vdAvg = vd0 * Math.cos(alphaRad);

    // Overlap angle mu estimation (Ls = 150 uH):
    const ls_H = 150e-6;
    const is3Ph = true;

    // Mode determination
    const isInverting = alpha > 90;

    // Calculate DC Current Id:
    // In Rectifier mode (alpha < 90): Vd drives current into passive or opposing EMF: Id = max(0, (vdAvg - Eb) / R)
    // In Inverter mode (alpha > 90): Back-EMF Eb is aiding, Vd is opposing:
    // Net driving voltage = Eb - |VdAvg|
    let netVoltage = 0;
    let idCalc = 0;

    if (!isInverting) {
      // Rectifying: Eb is opposing back-EMF
      netVoltage = vdAvg - backEmfEb;
      idCalc = Math.max(0, netVoltage / Math.max(0.2, loopRes));
    } else {
      // Inverting: Eb must be greater than |VdAvg| to drive current forward into negative Vd terminal!
      const absVd = Math.abs(vdAvg);
      netVoltage = backEmfEb - absVd;
      idCalc = Math.max(0, netVoltage / Math.max(0.2, loopRes));
    }

    // Commutation Overlap mu:
    const deltaCos = (2 * omega * ls_H * idCalc) / vmLL;
    const cosAlpha = Math.cos(alphaRad);
    let cosAlphaPlusMu = cosAlpha - deltaCos;
    let muDeg = 3.0;

    if (cosAlphaPlusMu >= -1 && cosAlphaPlusMu <= 1) {
      muDeg = (Math.acos(cosAlphaPlusMu) * 180) / Math.PI - alpha;
      if (muDeg < 0.5) muDeg = 0.5;
    }

    // Extinction Angle gamma = 180 - (alpha + mu)
    const gamma = 180 - (alpha + muDeg);

    // Minimum required extinction angle based on thyristor turn-off time t_q:
    // gamma_min = omega * tq in degrees
    const gammaMinDeg = ((omega * (tqMicroSec * 1e-6)) * 180) / Math.PI;

    // Failure criteria:
    // If inverting and gamma <= gammaMinDeg, commutation failure occurs!
    const isFailureBoundaryBreached = isInverting && (gamma <= gammaMinDeg || alpha + muDeg >= 176);

    // Active Power:
    // P = VdAvg * Id. If inverting, VdAvg < 0 => P < 0 (Regeneration into grid!)
    const activePower_kW = (vdAvg * idCalc) / 1000;

    // Fault current during commutation failure:
    // Both thyristors conduct, shorting AC line peak Vm + DC source Eb through R_loop
    const iFaultPeak = (vmLL + backEmfEb) / Math.max(0.5, loopRes);

    return {
      vd0,
      vdAvg,
      idCalc,
      muDeg,
      gamma,
      gammaMinDeg,
      isInverting,
      activePower_kW,
      isFailureBoundaryBreached,
      iFaultPeak,
      vmLL,
    };
  }, [alpha, backEmfEb, loopRes, vAcRms, gridFreq, tqMicroSec]);

  // Handle automated trigger when boundary breached
  useEffect(() => {
    if (physics.isFailureBoundaryBreached && !faultTripped) {
      setFaultTripped(true);
      setFaultType('commutation_failure');
      // Trip circuit breaker after 100ms
      const t = setTimeout(() => {
        setBreakerOpen(true);
      }, 150);
      return () => clearTimeout(t);
    }
  }, [physics.isFailureBoundaryBreached, faultTripped]);

  // Generate Scope Waveforms
  const waveformData = useMemo(() => {
    const pts = 360;
    const vDcTrace: { x: number; y: number }[] = [];
    const iDcTrace: { x: number; y: number }[] = [];
    const pTrace: { x: number; y: number }[] = [];

    const vmLL = physics.vmLL;
    const isFault = faultTripped && !breakerOpen;

    for (let deg = 0; deg <= pts; deg++) {
      const rad = (deg * Math.PI) / 180;

      let vInst = 0;
      let iInst = physics.idCalc;

      if (isFault) {
        // Commutation failure: AC voltage shorts directly to Eb with massive half-sine surge
        vInst = -backEmfEb + vmLL * Math.sin(rad * 2);
        iInst = physics.iFaultPeak * (0.8 + 0.2 * Math.sin(rad));
      } else if (breakerOpen) {
        vInst = 0;
        iInst = 0;
      } else {
        // Standard 6-pulse line voltage segment
        const theta = ((deg - alpha + 360) % 60) - 30;
        vInst = vmLL * Math.cos((theta * Math.PI) / 180);
      }

      vDcTrace.push({ x: deg, y: vInst });
      iDcTrace.push({ x: deg, y: iInst });
      pTrace.push({ x: deg, y: (vInst * iInst) / 1000 });
    }

    return { vDcTrace, iDcTrace, pTrace };
  }, [alpha, physics, faultTripped, breakerOpen, backEmfEb]);

  // Coordinate transformations
  const svgWidth = 840;
  const svgHeight = 240;
  const midY = svgHeight / 2;
  const vScale = svgHeight / (2.6 * physics.vmLL);

  const toPath = (points: { x: number; y: number }[], baseY: number = midY, customScale: number = vScale) => {
    return points
      .map((pt, idx) => {
        const x = (pt.x / 360) * svgWidth;
        const y = baseY - pt.y * customScale;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const handleResetBreaker = () => {
    setFaultTripped(false);
    setFaultType('none');
    setBreakerOpen(false);
    setAlpha(135);
  };

  const handleInjectFault = () => {
    setFaultTripped(true);
    setFaultType('commutation_failure');
    setTimeout(() => {
      setBreakerOpen(true);
    }, 200);
  };

  return (
    <div className={`flex flex-col bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-2xl overflow-hidden ${className}`}>
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-rose-500/20 border border-purple-500/40 rounded-lg text-purple-400 shadow-lg shadow-purple-950/30">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black tracking-wide text-white uppercase">
                Inversion, Regeneration &amp; Commutation Failure Lab
              </h2>
              <span
                className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-full border ${
                  physics.isInverting
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                }`}
              >
                {physics.isInverting ? 'INVERTER MODE (Q4: REGENERATION)' : 'RECTIFIER MODE (Q1: MOTORING)'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Line-Commutated Inverter &bull; Extinction Angle (<span className="text-purple-300 font-mono font-bold">&gamma; = 180&deg; - (&alpha; + &mu;)</span>) &bull; Active Power Reversal
            </p>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex items-center space-x-3">
          {breakerOpen ? (
            <button
              onClick={handleResetBreaker}
              className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg transition-all animate-pulse"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESET DC BREAKER</span>
            </button>
          ) : (
            <button
              onClick={handleInjectFault}
              className="flex items-center space-x-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-lg transition-all"
            >
              <Flame className="w-4 h-4" />
              <span>TEST COMMUTATION FAILURE</span>
            </button>
          )}

          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 text-slate-300 hover:text-white transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-purple-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={() => {
                setAlpha(135);
                setBackEmfEb(350);
                setFaultTripped(false);
                setBreakerOpen(false);
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Reset Parameters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-6">
        {/* Left Column: Scope & Power Flow Animation */}
        <div className="lg:col-span-8 flex flex-col space-y-5">
          {/* Dual-Trace Inversion Scope */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-inner relative">
            <div className="flex flex-wrap items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  Instantaneous DC Voltage Vd(t), Current Id(t), and Power Flow
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs font-mono">
                <span className="text-slate-400">
                  Average Vd:{' '}
                  <span className={`font-bold ${physics.vdAvg < 0 ? 'text-purple-400' : 'text-emerald-400'}`}>
                    {physics.vdAvg.toFixed(1)} V
                  </span>
                </span>
                <span className="text-slate-400">
                  Active Power:{' '}
                  <span className={`font-bold ${physics.activePower_kW < 0 ? 'text-purple-400' : 'text-emerald-400'}`}>
                    {physics.activePower_kW.toFixed(2)} kW
                  </span>
                </span>
              </div>
            </div>

            {/* SVG Oscilloscope */}
            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative shadow-2xl">
              <svg className="w-full h-64 block select-none" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                <defs>
                  <pattern id="grid-inversion" width="35" height="35" patternUnits="userSpaceOnUse">
                    <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2,3" />
                  </pattern>
                </defs>

                <rect width={svgWidth} height={svgHeight} fill="#020617" />
                <rect width={svgWidth} height={svgHeight} fill="url(#grid-inversion)" />

                {/* Midline Zero-Volt Axis */}
                <line x1="0" y1={midY} x2={svgWidth} y2={midY} stroke="#334155" strokeWidth="1.5" strokeDasharray="5,5" />

                {/* Turn-Off Margin Zone Highlight (when inverting) */}
                {physics.isInverting && !faultTripped && (
                  <rect
                    x={((alpha + physics.muDeg) / 360) * svgWidth}
                    y="0"
                    width={(physics.gamma / 360) * svgWidth}
                    height={svgHeight}
                    fill="#a855f7"
                    fillOpacity="0.15"
                  />
                )}

                {/* Waveforms */}
                {/* 1. DC Voltage Trace Vd(t) */}
                <path
                  d={toPath(waveformData.vDcTrace)}
                  fill="none"
                  stroke={faultTripped ? '#ef4444' : physics.isInverting ? '#c084fc' : '#10b981'}
                  strokeWidth="2.4"
                  className={faultTripped ? 'animate-pulse' : ''}
                />

                {/* 2. DC Load Current Trace Id(t) */}
                <path
                  d={toPath(waveformData.iDcTrace, svgHeight - 40, 0.8)}
                  fill="none"
                  stroke={faultTripped ? '#f97316' : '#38bdf8'}
                  strokeWidth="2.2"
                  strokeDasharray={breakerOpen ? '4,2' : 'none'}
                />

                {/* Scanning line */}
                {!breakerOpen && (
                  <line
                    x1={(time / 360) * svgWidth}
                    y1="0"
                    x2={(time / 360) * svgWidth}
                    y2={svgHeight}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="opacity-75"
                  />
                )}
              </svg>

              {/* Breaker Tripped Overlay Alert */}
              {breakerOpen && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-10 animate-fade-in">
                  <div className="p-3 bg-rose-500/20 border border-rose-500 rounded-full text-rose-400 animate-bounce">
                    <PowerOff className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-black text-rose-400 font-mono tracking-wider">
                      HIGH-SPEED DC BREAKER TRIPPED!
                    </div>
                    <div className="text-xs text-slate-300 font-mono mt-1">
                      Catastrophic Commutation Failure &bull; Peak Surge: {physics.iFaultPeak.toFixed(0)} A
                    </div>
                  </div>
                  <button
                    onClick={handleResetBreaker}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs font-mono shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    RESET CIRCUIT BREAKER
                  </button>
                </div>
              )}

              {/* Legend */}
              <div className="absolute bottom-2 left-3 flex flex-wrap items-center gap-4 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded border border-slate-800 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className={`w-3 h-1 rounded-full ${physics.isInverting ? 'bg-purple-400' : 'bg-emerald-400'}`} />
                  <span className="text-slate-200 font-mono">
                    Vd(t) [{physics.isInverting ? 'Reversed Polarity (Negative)' : 'Positive Forward'}]
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-1 bg-cyan-400 rounded-full" />
                  <span className="text-cyan-300 font-mono">Id(t) = {physics.idCalc.toFixed(1)} A</span>
                </div>
              </div>
            </div>
          </div>

          {/* Animated Power Flow Diagram: AC Grid <-> Converter <-> DC Machine */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  Bidirectional Active Power Flow: Grid &harr; Converter &harr; Overhauling DC Load
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {physics.isInverting ? 'Regenerative Braking Flow' : 'Motoring Drive Flow'}
              </span>
            </div>

            {/* Visual Flow Schematic */}
            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 p-4 relative overflow-hidden">
              <div className="flex items-center justify-between max-w-2xl mx-auto py-3">
                {/* 1. AC Utility Grid */}
                <div className="flex flex-col items-center space-y-2 p-3 bg-slate-900 border border-slate-700 rounded-xl w-36 text-center">
                  <div className="text-xs font-bold text-slate-300 uppercase font-mono">AC Grid</div>
                  <div className="text-lg font-black text-cyan-400 font-mono">{vAcRms} V</div>
                  <div className="text-[10px] text-slate-400 font-mono">Infinite Bus</div>
                </div>

                {/* Middle Animated Power Arrow */}
                <div className="flex-1 flex flex-col items-center px-4 relative">
                  <div className="text-xs font-mono font-bold mb-1 text-slate-300">
                    {physics.isInverting ? 'REGENERATION (DC &rarr; AC)' : 'RECTIFICATION (AC &rarr; DC)'}
                  </div>
                  <div className="w-full flex items-center justify-center relative">
                    <div
                      className={`h-2 w-full rounded-full transition-all ${
                        physics.isInverting
                          ? 'bg-gradient-to-l from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/30'
                          : 'bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-lg shadow-emerald-500/30'
                      }`}
                    />
                  </div>
                  <div className="text-sm font-black font-mono mt-1 text-white">
                    P = {Math.abs(physics.activePower_kW).toFixed(2)} kW
                  </div>
                </div>

                {/* 2. Overhauling DC Machine */}
                <div className="flex flex-col items-center space-y-2 p-3 bg-slate-900 border border-slate-700 rounded-xl w-40 text-center">
                  <div className="text-xs font-bold text-slate-300 uppercase font-mono">DC Motor / Eb</div>
                  <div className="text-lg font-black text-purple-400 font-mono">Eb = {backEmfEb} V</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {physics.isInverting ? 'Overhauling Generator' : 'Motoring Load'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Extinction Margin & Commutation Safety Dashboard */}
        <div className="lg:col-span-4 flex flex-col space-y-5">
          {/* Extinction Angle Margin Card */}
          <div
            className={`border rounded-xl p-5 shadow-xl transition-all ${
              physics.gamma < physics.gammaMinDeg
                ? 'bg-slate-900/90 border-rose-500/60 shadow-rose-950/20'
                : physics.gamma < 20
                ? 'bg-slate-900/90 border-amber-500/50 shadow-amber-950/20'
                : 'bg-slate-900/90 border-purple-500/40 shadow-purple-950/20'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Gauge className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-black uppercase tracking-wide text-white">
                  Turn-Off Margin (&gamma;)
                </span>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                  physics.gamma < physics.gammaMinDeg
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                    : physics.gamma < 20
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {physics.gamma < physics.gammaMinDeg ? 'FAILURE HAZARD' : physics.gamma < 20 ? 'WARNING' : 'SAFE MARGIN'}
              </span>
            </div>

            {/* Big Readout */}
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-3xl font-black font-mono text-purple-300">
                &gamma; = {physics.gamma.toFixed(1)}&deg;
              </div>
              <div className="text-xs font-mono text-slate-400">
                Min Required: {physics.gammaMinDeg.toFixed(1)}&deg; ({tqMicroSec}&mu;s)
              </div>
            </div>

            {/* Gauge bar */}
            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800 mb-3">
              <div
                className={`h-full transition-all duration-200 ${
                  physics.gamma < physics.gammaMinDeg ? 'bg-rose-500' : physics.gamma < 20 ? 'bg-amber-500' : 'bg-purple-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, (physics.gamma / 60) * 100))}%` }}
              />
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              &gamma; = 180&deg; - (&alpha; + &mu;) &bull; Overlap &mu; = {physics.muDeg.toFixed(1)}&deg;
            </div>
          </div>

          {/* Telemetry Grid */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Inversion Telemetry</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Net DC Current Id</div>
                <div className="text-xl font-mono font-black text-cyan-400">
                  {physics.idCalc.toFixed(1)} A
                </div>
                <div className="text-[10px] text-slate-500 font-mono">(Eb - |Vd|) / R</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Average Vd</div>
                <div className="text-xl font-mono font-black text-purple-400">
                  {physics.vdAvg.toFixed(1)} V
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Vd0 &middot; cos(&alpha;)</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Energy Flow Direction</div>
                <div className="text-sm font-mono font-bold text-emerald-400">
                  {physics.isInverting ? 'DC &rarr; AC (Regen)' : 'AC &rarr; DC (Drive)'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Active Power Sign</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Turn-Off Time (t_q)</div>
                <div className="text-xl font-mono font-black text-amber-400">
                  {tqMicroSec} &mu;s
                </div>
                <div className="text-[10px] text-slate-500 font-mono">SCR De-ionization</div>
              </div>
            </div>
          </div>

          {/* Interactive Sliders */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Interactive Inversion Controls</span>
            </h3>

            {/* Firing Angle Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Firing Angle (&alpha;):</span>
                <span className={`font-bold ${alpha > 90 ? 'text-purple-400' : 'text-emerald-400'}`}>
                  {alpha}&deg; ({alpha > 90 ? 'Inversion' : 'Rectification'})
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="175"
                step="1"
                value={alpha}
                onChange={(e) => setAlpha(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* DC Back-EMF Eb Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">DC Machine Back-EMF (Eb):</span>
                <span className="text-purple-400 font-bold">{backEmfEb} V</span>
              </div>
              <input
                type="range"
                min="50"
                max="600"
                step="10"
                value={backEmfEb}
                onChange={(e) => setBackEmfEb(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Thyristor Turn-Off Time tq */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Thyristor Turn-Off Time (t_q):</span>
                <span className="text-amber-400 font-bold">{tqMicroSec} &mu;s</span>
              </div>
              <input
                type="range"
                min="15"
                max="100"
                step="5"
                value={tqMicroSec}
                onChange={(e) => setTqMicroSec(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
