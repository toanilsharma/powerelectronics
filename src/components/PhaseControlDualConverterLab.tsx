import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  RotateCcw,
  Zap,
  Sliders,
  Play,
  Pause,
  Info,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Gauge,
  Compass,
  Repeat,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';

interface PhaseControlDualConverterLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * PhaseControlDualConverterLab.tsx
 * 
 * Recommendation 7: Dual Converter 4-Quadrant Reversible Drive
 * with Circulating Current Control (alpha1 + alpha2 = 180 deg).
 * 
 * Features:
 *  - Full 4-Quadrant V0-I0 Plane:
 *      Q1: Forward Motoring (Conv 1 Rectifies)
 *      Q2: Reverse Regeneration (Conv 1 Inverts)
 *      Q3: Reverse Motoring (Conv 2 Rectifies)
 *      Q4: Forward Regeneration (Conv 2 Inverts)
 *  - Control Modes:
 *      1. Non-Circulating Current (Deadband / Zero-Current Detection)
 *      2. Circulating Current Mode (alpha1 + alpha2 = 180 deg with Reactor Lc)
 *  - Circulating Current Reactor (Lc) sizing & ripple current visualizer.
 *  - Speed Reversal Trajectory: +1500 RPM to -1500 RPM showing zero-crossing dynamics.
 */
export const PhaseControlDualConverterLab: React.FC<PhaseControlDualConverterLabProps> = ({
  className = '',
  onClose,
}) => {
  // Converter Control
  const [controlMode, setControlMode] = useState<'circulating' | 'non_circulating'>('circulating');
  const [targetSpeedRpm, setTargetSpeedRpm] = useState<number>(1200); // -1500 to +1500 RPM
  const [currentSpeedRpm, setCurrentSpeedRpm] = useState<number>(1200);
  const [motorTorqueNm, setMotorTorqueNm] = useState<number>(45); // -100 to +100 Nm
  const [reactorLc_mH, setReactorLc_mH] = useState<number>(15); // Circulating reactor (mH)
  const [deadTimeMs, setDeadTimeMs] = useState<number>(8); // Dead-band time in ms (non-circulating)
  const [vAcRms, setVAcRms] = useState<number>(415); // AC Line-to-line RMS (V)
  const [gridFreq, setGridFreq] = useState<number>(50); // Grid frequency (Hz)

  // Simulation & Animation
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [time, setTime] = useState<number>(0);
  const [isReversing, setIsReversing] = useState<boolean>(false);

  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Dynamic motor speed trajectory tracking
  useEffect(() => {
    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isPlaying) {
        setTime((t) => (t + dt * 60) % 360);

        // Smooth speed dynamic response:
        // In circulating mode: fast and smooth
        // In non-circulating mode: pauses near zero for deadTime
        setCurrentSpeedRpm((prev) => {
          const diff = targetSpeedRpm - prev;
          if (Math.abs(diff) < 2) {
            setIsReversing(false);
            return targetSpeedRpm;
          }
          const slewRate = controlMode === 'circulating' ? 600 : 350; // RPM/sec
          const step = Math.sign(diff) * Math.min(Math.abs(diff), slewRate * dt);
          return prev + step;
        });
      }
      animRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, targetSpeedRpm, controlMode]);

  // Electrical computations
  const physics = useMemo(() => {
    const vmLL = vAcRms * Math.SQRT2;
    const vd0 = (3 * vmLL) / Math.PI; // approx 1.35 * V_LL

    // Required DC voltage to sustain currentSpeedRpm:
    // Back-EMF Eb = Ke * omega_m = (Vd0 * 0.85) * (currentSpeedRpm / 1500)
    const eb = (vd0 * 0.8) * (currentSpeedRpm / 1500);

    // Motor armature resistance
    const ra = 0.8;
    const motorCurrent = (motorTorqueNm / 45) * 40; // Approx 40A nominal
    const requiredVo = eb + motorCurrent * ra;

    // Firing angle alpha1 for Converter 1:
    // Vo = Vd0 * cos(alpha1) => cos(alpha1) = Vo / Vd0
    const ratio1 = Math.max(-0.95, Math.min(0.95, requiredVo / vd0));
    const alpha1Deg = (Math.acos(ratio1) * 180) / Math.PI;

    // Firing angle alpha2 for Converter 2:
    // In circulating mode: alpha1 + alpha2 = 180 deg
    const alpha2Deg = 180 - alpha1Deg;

    // Determine Active Quadrant
    let quadrant: 1 | 2 | 3 | 4 = 1;
    if (requiredVo >= 0 && motorCurrent >= 0) quadrant = 1; // Forward Motoring
    else if (requiredVo < 0 && motorCurrent >= 0) quadrant = 2; // Reverse Regen
    else if (requiredVo < 0 && motorCurrent < 0) quadrant = 3; // Reverse Motoring
    else quadrant = 4; // Forward Regen

    // Circulating current calculation:
    // In circulating mode: instantaneous difference vo1(t) + vo2(t) produces ripple across 2*Lc
    // Peak circulating current approx: ic_peak = (Vd0 / (2 * omega * Lc)) * (1 - sin(alpha1))
    const omega = 2 * Math.PI * gridFreq;
    const lc_H = Math.max(1e-3, reactorLc_mH * 1e-3);
    const icPeak = controlMode === 'circulating'
      ? (vd0 / (2 * omega * lc_H)) * (1 - Math.sin((alpha1Deg * Math.PI) / 180)) * 0.15
      : 0;

    return {
      vmLL,
      vd0,
      eb,
      requiredVo,
      motorCurrent,
      alpha1Deg,
      alpha2Deg,
      quadrant,
      icPeak,
    };
  }, [currentSpeedRpm, motorTorqueNm, reactorLc_mH, vAcRms, gridFreq, controlMode]);

  // Waveform generation
  const waveformData = useMemo(() => {
    const pts = 360;
    const vo1Trace: { x: number; y: number }[] = [];
    const vo2Trace: { x: number; y: number }[] = [];
    const icTrace: { x: number; y: number }[] = [];

    const vmLL = physics.vmLL;
    const a1 = physics.alpha1Deg;
    const a2 = physics.alpha2Deg;

    for (let deg = 0; deg <= pts; deg++) {
      // 6-pulse rectified wave for Conv 1
      const theta1 = ((deg - a1 + 360) % 60) - 30;
      const v1 = vmLL * Math.cos((theta1 * Math.PI) / 180);

      // 6-pulse rectified wave for Conv 2
      const theta2 = ((deg - a2 + 360) % 60) - 30;
      const v2 = vmLL * Math.cos((theta2 * Math.PI) / 180);

      // Instantaneous circulating current ripple
      const rad = (deg * Math.PI) / 180;
      const icInst = controlMode === 'circulating'
        ? physics.icPeak * (1 + 0.6 * Math.sin(rad * 6))
        : 0;

      vo1Trace.push({ x: deg, y: v1 });
      vo2Trace.push({ x: deg, y: -v2 });
      icTrace.push({ x: deg, y: icInst });
    }

    return { vo1Trace, vo2Trace, icTrace };
  }, [physics, controlMode]);

  // SVG coordinate transform
  const svgWidth = 840;
  const svgHeight = 220;
  const midY = svgHeight / 2;
  const vScale = svgHeight / (2.8 * physics.vmLL);

  const toPath = (points: { x: number; y: number }[], baseY: number = midY, customScale: number = vScale) => {
    return points
      .map((pt, idx) => {
        const x = (pt.x / 360) * svgWidth;
        const y = baseY - pt.y * customScale;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const handleTriggerReversal = () => {
    setIsReversing(true);
    setTargetSpeedRpm((prev) => (prev > 0 ? -1200 : 1200));
    setMotorTorqueNm((prev) => -prev);
  };

  return (
    <div className={`flex flex-col bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-2xl overflow-hidden ${className}`}>
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/40 rounded-lg text-teal-400 shadow-lg shadow-teal-950/30">
            <Repeat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black tracking-wide text-white uppercase">
                Dual Converter 4-Quadrant Reversible Drive Lab
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-teal-500/20 border border-teal-500/40 text-teal-300 rounded-full">
                &alpha;1 + &alpha;2 = 180&deg;
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Back-to-Back Fully-Controlled Bridges &bull; Seamless 4-Quadrant Speed/Torque Reversal &bull; Circulating Current Reactor (<span className="text-teal-300 font-mono font-bold">Lc</span>)
            </p>
          </div>
        </div>

        {/* Mode Selector and Reversal Button */}
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setControlMode('circulating')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                controlMode === 'circulating'
                  ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Circulating Current Mode
            </button>
            <button
              onClick={() => setControlMode('non_circulating')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                controlMode === 'non_circulating'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Non-Circulating (Dead-Band)
            </button>
          </div>

          <button
            onClick={handleTriggerReversal}
            className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Repeat className={`w-4 h-4 ${isReversing ? 'animate-spin' : ''}`} />
            <span>QUICK REVERSAL (&plusmn;1200 RPM)</span>
          </button>

          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-lg">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 text-slate-300 hover:text-white transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-teal-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={() => {
                setTargetSpeedRpm(1200);
                setCurrentSpeedRpm(1200);
                setMotorTorqueNm(45);
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-6">
        {/* Left Column: 4-Quadrant Plane & Oscilloscope */}
        <div className="lg:col-span-8 flex flex-col space-y-5">
          {/* Dual Converter Waveforms Scope */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-inner">
            <div className="flex flex-wrap items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  Dual-Converter Instantaneous Terminal Voltages &amp; Circulating Current
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs font-mono">
                <span className="text-slate-400">
                  &alpha;1: <span className="text-teal-400 font-bold">{physics.alpha1Deg.toFixed(1)}&deg;</span>
                </span>
                <span className="text-slate-400">
                  &alpha;2: <span className="text-purple-400 font-bold">{physics.alpha2Deg.toFixed(1)}&deg;</span>
                </span>
                <span className="text-slate-400">
                  Sum: <span className="text-white font-bold">{(physics.alpha1Deg + physics.alpha2Deg).toFixed(0)}&deg;</span>
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden relative shadow-2xl">
              <svg className="w-full h-56 block select-none" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                <defs>
                  <pattern id="grid-dual" width="35" height="35" patternUnits="userSpaceOnUse">
                    <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2,3" />
                  </pattern>
                </defs>

                <rect width={svgWidth} height={svgHeight} fill="#020617" />
                <rect width={svgWidth} height={svgHeight} fill="url(#grid-dual)" />

                <line x1="0" y1={midY} x2={svgWidth} y2={midY} stroke="#334155" strokeWidth="1.5" strokeDasharray="5,5" />

                {/* Converter 1 Instantaneous Voltage (Teal) */}
                <path
                  d={toPath(waveformData.vo1Trace)}
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="2.2"
                  className="filter drop-shadow-[0_0_6px_rgba(20,184,166,0.6)]"
                />

                {/* Converter 2 Instantaneous Voltage (Purple) */}
                <path
                  d={toPath(waveformData.vo2Trace)}
                  fill="none"
                  stroke="#c084fc"
                  strokeWidth="2.2"
                  strokeDasharray="4,2"
                  className="filter drop-shadow-[0_0_6px_rgba(192,132,252,0.5)]"
                />

                {/* Circulating Current Ripple (Orange Trace at bottom) */}
                {controlMode === 'circulating' && (
                  <path
                    d={toPath(waveformData.icTrace, svgHeight - 25, 4.0)}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="2.0"
                  />
                )}

                {/* Scanning line */}
                <line
                  x1={(time / 360) * svgWidth}
                  y1="0"
                  x2={(time / 360) * svgWidth}
                  y2={svgHeight}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className="opacity-75"
                />
              </svg>

              {/* Scope Legend */}
              <div className="absolute bottom-2 left-3 flex flex-wrap items-center gap-4 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded border border-slate-800 text-xs">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-1 bg-teal-400 rounded-full" />
                  <span className="text-teal-300 font-mono">Conv 1: V_o1(t)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-1 bg-purple-400 rounded-full border border-dashed" />
                  <span className="text-purple-300 font-mono">Conv 2: -V_o2(t)</span>
                </div>
                {controlMode === 'circulating' && (
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-1 bg-orange-400 rounded-full" />
                    <span className="text-orange-300 font-mono font-bold">
                      Circulating Ripple i_c(t) [Peak {physics.icPeak.toFixed(2)}A]
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive 4-Quadrant V0-I0 Plane Visualizer */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  Interactive 4-Quadrant Operating Plane (V_o vs. I_o)
                </span>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300">
                ACTIVE: QUADRANT {physics.quadrant}
              </span>
            </div>

            {/* 4-Quadrant Visual Canvas */}
            <div className="w-full bg-slate-950 rounded-lg border border-slate-800 p-4 relative flex items-center justify-center">
              <svg className="w-full max-w-md h-64 select-none" viewBox="0 0 320 260">
                {/* 4 Quadrants Background Fills */}
                <rect x="160" y="20" width="140" height="110" fill={physics.quadrant === 1 ? '#042f2e' : '#0f172a'} stroke="#1e293b" />
                <rect x="20" y="20" width="140" height="110" fill={physics.quadrant === 4 ? '#1e1b4b' : '#0f172a'} stroke="#1e293b" />
                <rect x="20" y="130" width="140" height="110" fill={physics.quadrant === 3 ? '#042f2e' : '#0f172a'} stroke="#1e293b" />
                <rect x="160" y="130" width="140" height="110" fill={physics.quadrant === 2 ? '#1e1b4b' : '#0f172a'} stroke="#1e293b" />

                {/* Axes */}
                <line x1="20" y1="130" x2="300" y2="130" stroke="#64748b" strokeWidth="1.5" />
                <line x1="160" y1="20" x2="160" y2="240" stroke="#64748b" strokeWidth="1.5" />

                {/* Axis Labels */}
                <text x="295" y="125" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="end" className="font-mono">
                  +I_o
                </text>
                <text x="25" y="125" fill="#94a3b8" fontSize="10" fontWeight="bold" className="font-mono">
                  -I_o
                </text>
                <text x="165" y="32" fill="#94a3b8" fontSize="10" fontWeight="bold" className="font-mono">
                  +V_o (Forward)
                </text>
                <text x="165" y="235" fill="#94a3b8" fontSize="10" fontWeight="bold" className="font-mono">
                  -V_o (Reverse)
                </text>

                {/* Quadrant Labels */}
                <text x="230" y="45" fill={physics.quadrant === 1 ? '#2dd4bf' : '#64748b'} fontSize="11" fontWeight="bold" textAnchor="middle" className="font-mono">
                  Q1: FWD MOTOR
                </text>
                <text x="230" y="60" fill="#94a3b8" fontSize="9" textAnchor="middle" className="font-mono">
                  Conv 1 Rect (&alpha;1&lt;90)
                </text>

                <text x="230" y="200" fill={physics.quadrant === 2 ? '#c084fc' : '#64748b'} fontSize="11" fontWeight="bold" textAnchor="middle" className="font-mono">
                  Q2: REV REGEN
                </text>
                <text x="230" y="215" fill="#94a3b8" fontSize="9" textAnchor="middle" className="font-mono">
                  Conv 1 Inv (&alpha;1&gt;90)
                </text>

                <text x="90" y="200" fill={physics.quadrant === 3 ? '#2dd4bf' : '#64748b'} fontSize="11" fontWeight="bold" textAnchor="middle" className="font-mono">
                  Q3: REV MOTOR
                </text>
                <text x="90" y="215" fill="#94a3b8" fontSize="9" textAnchor="middle" className="font-mono">
                  Conv 2 Rect (&alpha;2&lt;90)
                </text>

                <text x="90" y="45" fill={physics.quadrant === 4 ? '#c084fc' : '#64748b'} fontSize="11" fontWeight="bold" textAnchor="middle" className="font-mono">
                  Q4: FWD REGEN
                </text>
                <text x="90" y="60" fill="#94a3b8" fontSize="9" textAnchor="middle" className="font-mono">
                  Conv 2 Inv (&alpha;2&gt;90)
                </text>

                {/* Dynamic Operating Cursor */}
                {(() => {
                  const cx = 160 + (physics.motorCurrent / 60) * 110;
                  const cy = 130 - (physics.requiredVo / physics.vd0) * 100;
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r="10" fill="#2dd4bf" className="animate-ping opacity-75" />
                      <circle cx={cx} cy={cy} r="6" fill="#2dd4bf" stroke="#ffffff" strokeWidth="2" />
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column: Motor Telemetry & Reactor Sizing */}
        <div className="lg:col-span-4 flex flex-col space-y-5">
          {/* DC Motor Status Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              <span>DC Drive Dynamic Telemetry</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Motor Speed</div>
                <div className="text-xl font-mono font-black text-teal-400">
                  {currentSpeedRpm.toFixed(0)} RPM
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Target: {targetSpeedRpm} RPM</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Shaft Torque</div>
                <div className="text-xl font-mono font-black text-purple-400">
                  {motorTorqueNm.toFixed(0)} Nm
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Current: {physics.motorCurrent.toFixed(1)}A</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Terminal Vo</div>
                <div className="text-xl font-mono font-black text-emerald-400">
                  {physics.requiredVo.toFixed(1)} V
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Eb: {physics.eb.toFixed(1)} V</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono uppercase">Circulating Peak i_c</div>
                <div
                  className={`text-xl font-mono font-black ${
                    controlMode === 'circulating' ? 'text-orange-400' : 'text-slate-500'
                  }`}
                >
                  {controlMode === 'circulating' ? `${physics.icPeak.toFixed(2)} A` : '0 A (Blocked)'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {controlMode === 'circulating' ? 'Reactor Limited' : `${deadTimeMs}ms Dead-Time`}
                </div>
              </div>
            </div>
          </div>

          {/* Circulating Current Reactor (Lc) Sizing Card */}
          {controlMode === 'circulating' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Circulating Current Reactor (L_c)
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Inductor placed between Converter 1 and 2 to absorb instantaneous voltage difference without DC loss:
              </p>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Reactor Inductance (L_c):</span>
                  <span className="text-orange-400 font-bold">{reactorLc_mH} mH</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="1"
                  value={reactorLc_mH}
                  onChange={(e) => setReactorLc_mH(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <div className="p-2.5 bg-orange-950/20 border border-orange-500/30 rounded-lg text-[11px] font-mono text-orange-300">
                Formula: i_c(peak) &prop; V_d0 / (2&omega;L_c). Increasing L_c minimizes ripple losses!
              </div>
            </div>
          )}

          {/* Interactive Sliders */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Speed &amp; Torque Setpoints</span>
            </h3>

            {/* Target Speed Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Command Speed (RPM):</span>
                <span className="text-teal-400 font-bold">{targetSpeedRpm} RPM</span>
              </div>
              <input
                type="range"
                min="-1500"
                max="1500"
                step="50"
                value={targetSpeedRpm}
                onChange={(e) => setTargetSpeedRpm(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
            </div>

            {/* Motor Torque Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-300">Load Torque (Nm):</span>
                <span className="text-purple-400 font-bold">{motorTorqueNm} Nm</span>
              </div>
              <input
                type="range"
                min="-80"
                max="80"
                step="5"
                value={motorTorqueNm}
                onChange={(e) => setMotorTorqueNm(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
