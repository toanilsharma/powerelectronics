import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Flame,
  Activity,
  Sliders,
  Sun,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Info,
  RotateCcw,
  Sparkles,
  Play,
  Pause
} from 'lucide-react';

interface SCRFiveTurnOnModesLabProps {
  className?: string;
  onClose?: () => void;
}

type TurnOnMode = 'gate' | 'breakover' | 'thermal' | 'dvdt' | 'light';

/**
 * SCRFiveTurnOnModesLab.tsx
 * 
 * Recommendation 3: Interactive "All 5 Turn-ON Mechanisms" Lab
 * 
 * Demonstrates the 5 classic textbook and industrial turn-on mechanisms:
 *  1. Gate Triggering (Standard Controlled Pulse: IG > IGT)
 *  2. Forward Breakover Voltage Triggering (VAK > VBO0, Avalanche Multiplication at J2)
 *  3. Thermal Triggering (Junction Temperature Tj > 140°C, Thermally Generated Leakage Ico)
 *  4. Critical dv/dt Triggering (Capacitive Displacement Current: idisp = Cj2 * dv/dt >= IGT)
 *  5. Light / Optical Triggering (LASCR: Photons inject electron-hole pairs directly into J2)
 */
export const SCRFiveTurnOnModesLab: React.FC<SCRFiveTurnOnModesLabProps> = ({
  className = '',
  onClose,
}) => {
  // Active Turn-On Mode
  const [activeMode, setActiveMode] = useState<TurnOnMode>('gate');

  // Common Circuit Parameters
  const [supplyVoltageVs, setSupplyVoltageVs] = useState<number>(300); // Volts DC
  const [loadResistance, setLoadResistance] = useState<number>(30); // Ohms
  const [isLatched, setIsLatched] = useState<boolean>(false);
  const [turnOnCause, setTurnOnCause] = useState<string | null>(null);

  // 1. Gate Trigger Mode Parameters
  const [gateCurrentMa, setGateCurrentMa] = useState<number>(45); // mA
  const [gatePulseDurationUs, setGatePulseDurationUs] = useState<number>(20); // µs
  const [isGatePulsing, setIsGatePulsing] = useState<boolean>(false);
  const igThresholdMa = 30; // Minimum required I_GT

  // 2. Breakover Voltage Mode Parameters
  const [vBreakoverVs, setVBreakoverVs] = useState<number>(450); // Adjustable up to 750V
  const vbo0Rating = 600; // Device rating VBO0 = 600V

  // 3. Thermal Mode Parameters
  const [junctionTempC, setJunctionTempC] = useState<number>(25); // 25°C to 160°C
  const tjMaxSafeC = 125;
  const tjThermalTriggerC = 145; // Spontaneous thermal turn-on threshold

  // 4. dv/dt Mode Parameters
  const [dvdtStepVoltage, setDvdtStepVoltage] = useState<number>(400); // V
  const [dvdtRiseTimeNs, setDvdtRiseTimeNs] = useState<number>(200); // ns
  const cj2CapacitancePf = 50; // pF
  const criticalDvDtRating = 450; // V/µs

  // 5. Light Trigger Mode (LASCR) Parameters
  const [laserIntensityMw, setLaserIntensityMw] = useState<number>(15); // mW
  const [isLaserFiring, setIsLaserFiring] = useState<boolean>(false);
  const opticalThresholdMw = 10; // mW to generate sufficient carrier density

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [animTimer, setAnimTimer] = useState<number>(0);

  // Calculated Engineering Metrics
  // dv/dt in V/µs = (StepVoltage) / (RiseTime in µs)
  const actualDvDt = (dvdtStepVoltage / (dvdtRiseTimeNs * 1e-3)); // V/µs
  const idispMa = (cj2CapacitancePf * 1e-12 * (actualDvDt * 1e6)) * 1000; // mA

  // Thermal Leakage current: Ico(T) = Ico0 * 2^((T - 25)/10)
  const thermalLeakageMa = 0.05 * Math.pow(2, (junctionTempC - 25) / 10);

  // Reset Device to OFF State
  const handleReset = () => {
    setIsLatched(false);
    setTurnOnCause(null);
    setIsGatePulsing(false);
    setIsLaserFiring(false);
  };

  // Trigger Action for Active Mode
  const handleTriggerAction = () => {
    if (activeMode === 'gate') {
      setIsGatePulsing(true);
      setTimeout(() => {
        setIsGatePulsing(false);
        if (gateCurrentMa >= igThresholdMa && supplyVoltageVs > 2) {
          setIsLatched(true);
          setTurnOnCause('GATE TRIGGERED: I_G >= I_GT (Normal Controlled Turn-On)');
        }
      }, 300);
    } else if (activeMode === 'breakover') {
      if (vBreakoverVs >= vbo0Rating) {
        setIsLatched(true);
        setTurnOnCause(`FORWARD BREAKOVER: V_AK (${vBreakoverVs}V) >= V_BO0 (${vbo0Rating}V) Avalanche Breakdown at J2`);
      }
    } else if (activeMode === 'thermal') {
      if (junctionTempC >= tjThermalTriggerC) {
        setIsLatched(true);
        setTurnOnCause(`THERMAL TRIGGER: Tj (${junctionTempC}°C) caused excessive leakage Ico (${thermalLeakageMa.toFixed(1)}mA) -> α1+α2 >= 1`);
      }
    } else if (activeMode === 'dvdt') {
      if (actualDvDt >= criticalDvDtRating || idispMa >= igThresholdMa) {
        setIsLatched(true);
        setTurnOnCause(`CRITICAL dv/dt FALSE TRIGGER: dv/dt (${actualDvDt.toFixed(0)} V/µs) injected i_disp (${idispMa.toFixed(1)}mA) into J2`);
      }
    } else if (activeMode === 'light') {
      setIsLaserFiring(true);
      setTimeout(() => {
        setIsLaserFiring(false);
        if (laserIntensityMw >= opticalThresholdMw && supplyVoltageVs > 2) {
          setIsLatched(true);
          setTurnOnCause(`OPTICAL / LASCR TRIGGER: Laser intensity (${laserIntensityMw}mW) generated photon electron-hole plasma in J2`);
        }
      }, 400);
    }
  };

  // Auto-evaluation of Continuous Conditions (e.g. temperature or voltage ramp)
  useEffect(() => {
    if (isLatched) return;

    if (activeMode === 'breakover' && vBreakoverVs >= vbo0Rating) {
      setIsLatched(true);
      setTurnOnCause(`FORWARD BREAKOVER: V_AK (${vBreakoverVs}V) >= V_BO0 (${vbo0Rating}V) Avalanche Breakdown at J2`);
    } else if (activeMode === 'thermal' && junctionTempC >= tjThermalTriggerC) {
      setIsLatched(true);
      setTurnOnCause(`THERMAL TRIGGER: Tj (${junctionTempC}°C) caused excessive leakage Ico (${thermalLeakageMa.toFixed(1)}mA) -> α1+α2 >= 1`);
    }
  }, [vBreakoverVs, junctionTempC, activeMode, isLatched, thermalLeakageMa]);

  // Animation Loop for Canvas
  useEffect(() => {
    let animId: number;
    const render = () => {
      setAnimTimer((prev) => prev + 0.05);
      drawCanvas();
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeMode, isLatched, isGatePulsing, isLaserFiring, junctionTempC, vBreakoverVs, actualDvDt, supplyVoltageVs]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dark Background
    ctx.fillStyle = '#070b13';
    ctx.fillRect(0, 0, w, h);

    // Grid Reticle
    ctx.strokeStyle = '#151e2d';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Central Device Silicon Wafer Cross-Section
    const devX = w * 0.32;
    const devY = 40;
    const devW = w * 0.36;
    const devH = 220;
    const layerH = devH / 4;

    // Layer 1: P1 (Anode)
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(devX, devY, devW, layerH);
    ctx.strokeStyle = '#3b82f6';
    ctx.strokeRect(devX, devY, devW, layerH);

    // Layer 2: N1 (Drift Base)
    // In thermal mode, tint N1 layer amber to red based on temperature
    if (activeMode === 'thermal') {
      const heatFactor = Math.min(1.0, Math.max(0, (junctionTempC - 25) / 130));
      const redVal = Math.round(31 + heatFactor * 190);
      const greenVal = Math.round(41 - heatFactor * 25);
      ctx.fillStyle = `rgb(${redVal}, ${greenVal}, 55)`;
    } else {
      ctx.fillStyle = '#1f2937';
    }
    ctx.fillRect(devX, devY + layerH, devW, layerH);
    ctx.strokeStyle = '#4b5563';
    ctx.strokeRect(devX, devY + layerH, devW, layerH);

    // Layer 3: P2 (Gate Base)
    ctx.fillStyle = '#312e81';
    ctx.fillRect(devX, devY + layerH * 2, devW, layerH);
    ctx.strokeStyle = '#6366f1';
    ctx.strokeRect(devX, devY + layerH * 2, devW, layerH);

    // Layer 4: N2 (Cathode)
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(devX, devY + layerH * 3, devW, layerH);
    ctx.strokeStyle = '#10b981';
    ctx.strokeRect(devX, devY + layerH * 3, devW, layerH);

    // Critical Junction J2 (between N1 and P2)
    const j2Y = devY + layerH * 2;
    const isJ2Collapsed = isLatched;

    // Draw J2 Barrier Glow
    if (!isJ2Collapsed) {
      // High Electric Field Barrier
      const glowGrad = ctx.createLinearGradient(devX, j2Y - 14, devX, j2Y + 14);
      glowGrad.addColorStop(0, 'rgba(239, 68, 68, 0)');
      glowGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.7)');
      glowGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(devX, j2Y - 14, devW, 28);
    } else {
      // Conductive plasma flood!
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.fillRect(devX, devY, devW, devH);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(devX, devY, devW, devH);
    }

    // MODE-SPECIFIC VISUAL STIMULUS:
    if (activeMode === 'gate' && isGatePulsing) {
      // Gate Current Pulse Injection Arrow
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(devX - 70, devY + layerH * 2.5);
      ctx.lineTo(devX, devY + layerH * 2.5);
      ctx.stroke();

      // Pulsing Sparkles
      ctx.fillStyle = '#f472b6';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`⚡ I_G PULSE (${gateCurrentMa}mA)`, devX - 160, devY + layerH * 2.5 + 4);
    } else if (activeMode === 'light') {
      // LASCR Optical Window & Laser Beam
      const opticalWindowY = j2Y - 10;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(devX - 15, opticalWindowY, 15, 20);
      ctx.fillStyle = '#0891b2';
      ctx.fillText('Optical Window', devX - 120, opticalWindowY + 14);

      if (isLaserFiring) {
        // Glowing Laser Beam
        const laserGrad = ctx.createLinearGradient(20, opticalWindowY + 10, devX, opticalWindowY + 10);
        laserGrad.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
        laserGrad.addColorStop(1, 'rgba(6, 182, 212, 0.95)');
        ctx.fillStyle = laserGrad;
        ctx.fillRect(20, opticalWindowY + 5, devX - 20, 10);

        // Scattered Photons in J2
        ctx.fillStyle = '#67e8f9';
        for (let i = 0; i < 15; i++) {
          ctx.beginPath();
          ctx.arc(devX + Math.random() * (devW * 0.4), j2Y + (Math.random() - 0.5) * 15, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    } else if (activeMode === 'dvdt') {
      // Displacement Current Capacitor Model at J2
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(devX + devW * 0.2, j2Y - 12, devW * 0.6, 24);
      ctx.setLineDash([]);
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`C_j2 (${cj2CapacitancePf}pF) • i_disp = C·(dv/dt) = ${idispMa.toFixed(1)}mA`, devX + 15, j2Y + 4);
    } else if (activeMode === 'breakover') {
      // High Voltage Electric Field Lines across J2
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      const numLines = Math.min(12, Math.round((vBreakoverVs / 600) * 10));
      for (let i = 0; i < numLines; i++) {
        const lx = devX + (i + 1) * (devW / (numLines + 1));
        ctx.beginPath();
        ctx.moveTo(lx, j2Y - 18);
        ctx.lineTo(lx, j2Y + 18);
        ctx.stroke();
      }
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`Avalanche Field E > Ecrit (${vBreakoverVs}V / ${vbo0Rating}V)`, devX + 25, j2Y - 22);
    } else if (activeMode === 'thermal') {
      // Thermal Infrared Emission Rings
      const heatCenterY = j2Y;
      const heatRadius = 25 + ((junctionTempC - 25) / 135) * 35;
      ctx.strokeStyle = junctionTempC > tjMaxSafeC ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(devX + devW / 2, heatCenterY, heatRadius, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = junctionTempC > tjMaxSafeC ? '#f87171' : '#fcd34d';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`Tj = ${junctionTempC}°C | I_co = ${thermalLeakageMa.toFixed(2)}mA`, devX + 20, j2Y + 4);
    }

    // External Circuit Connections
    // Anode (+) at Top
    ctx.strokeStyle = isLatched ? '#10b981' : '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(devX + devW / 2, devY);
    ctx.lineTo(devX + devW / 2, 15);
    ctx.lineTo(w - 60, 15);
    ctx.stroke();

    // Cathode (-) at Bottom
    ctx.beginPath();
    ctx.moveTo(devX + devW / 2, devY + devH);
    ctx.lineTo(devX + devW / 2, h - 20);
    ctx.lineTo(w - 60, h - 20);
    ctx.stroke();

    // DC Voltage Source & Load on Right
    ctx.strokeRect(w - 60, 15, 0.1, h - 35);
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`+Vs (${supplyVoltageVs}V)`, w - 110, 25);
    ctx.fillText(`Load RL (${loadResistance}Ω)`, w - 120, h / 2);
    ctx.fillText('0V / GND', w - 100, h - 15);

    // Conduction / Latching Banner
    if (isLatched) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.fillRect(devX + 15, devY + devH / 2 - 16, devW - 30, 32);
      ctx.fillStyle = '#064e3b';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('✓ SCR FULLY LATCHED (ON)', devX + 35, devY + devH / 2 + 5);
    }
  };

  return (
    <div className={`flex flex-col gap-3 bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 shadow-2xl ${className}`}>
      {/* 1. Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-500 text-white shadow-md">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>ALL 5 TURN-ON MECHANISMS BENCH</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500 text-amber-300 font-bold">
                IEC 60747 / IEEE 446
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Interactive physics simulation comparing Gate, Forward Breakover ($V_{'{'}BO{'}'}$), Thermal ($T_j$), Critical $dv/dt$, and Optical (LASCR) turn-on mechanisms.
            </p>
          </div>
        </div>

        {/* Reset / Commutate Button */}
        <button
          onClick={handleReset}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Reset SCR (Turn OFF)</span>
        </button>
      </div>

      {/* 2. 5-Way Mode Selector Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 bg-[#161b22] border border-[#30363d] p-1.5 rounded-xl">
        {[
          { id: 'gate' as TurnOnMode, label: '1. GATE TRIGGER', icon: <Zap className="w-3.5 h-3.5 text-emerald-400" />, desc: 'Standard I_G > I_GT' },
          { id: 'breakover' as TurnOnMode, label: '2. BREAKOVER V_BO', icon: <Activity className="w-3.5 h-3.5 text-rose-400" />, desc: 'V_AK > V_BO0 Avalanche' },
          { id: 'thermal' as TurnOnMode, label: '3. THERMAL T_j', icon: <Flame className="w-3.5 h-3.5 text-amber-400" />, desc: 'Excessive Leakage I_co' },
          { id: 'dvdt' as TurnOnMode, label: '4. CRITICAL dv/dt', icon: <Sliders className="w-3.5 h-3.5 text-sky-400" />, desc: 'Displacement Current i_disp' },
          { id: 'light' as TurnOnMode, label: '5. OPTICAL LASCR', icon: <Sun className="w-3.5 h-3.5 text-cyan-400" />, desc: 'Photon Electron-Hole Pairs' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setActiveMode(m.id);
              handleReset();
            }}
            className={`px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
              activeMode === m.id
                ? 'bg-gradient-to-r from-slate-800 to-slate-750 border border-amber-500/70 shadow-md ring-1 ring-amber-500/30'
                : 'bg-[#0d1117] border border-[#21262d] hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
              {m.icon}
              <span className={activeMode === m.id ? 'text-amber-300 font-black' : 'text-slate-300'}>{m.label}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono truncate">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* 3. Mode-Specific Interactive Controls Banner */}
      <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
          <span className="text-xs font-mono font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚙️ ACTIVE MODE TUNING:</span>
            <span className="text-white">{activeMode.toUpperCase()} MECHANISM CONTROLS</span>
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Supply Vs = <b className="text-white">{supplyVoltageVs}V</b> | Load RL = <b className="text-white">{loadResistance}Ω</b>
          </span>
        </div>

        {/* Dynamic Controls based on selected Mode */}
        {activeMode === 'gate' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Gate Drive Current (I_G):</span>
                <span className="text-emerald-400 font-bold">{gateCurrentMa} mA</span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="5"
                value={gateCurrentMa}
                onChange={(e) => setGateCurrentMa(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] font-mono text-slate-500">Threshold I_GT = {igThresholdMa} mA</span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Pulse Width:</span>
                <span className="text-sky-400 font-bold">{gatePulseDurationUs} µs</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={gatePulseDurationUs}
                onChange={(e) => setGatePulseDurationUs(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <button
              onClick={handleTriggerAction}
              disabled={isLatched}
              className={`py-2 rounded-xl text-xs font-mono font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isLatched
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Fire Gate Pulse (G)</span>
            </button>
          </div>
        )}

        {activeMode === 'breakover' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="sm:col-span-2">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Anode Supply Voltage (V_AK):</span>
                <span className={`font-bold ${vBreakoverVs >= vbo0Rating ? 'text-rose-400 font-extrabold' : 'text-sky-400'}`}>
                  {vBreakoverVs} V {vBreakoverVs >= vbo0Rating ? '🚨 (EXCEEDS V_BO0!)' : ''}
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="750"
                step="10"
                value={vBreakoverVs}
                onChange={(e) => setVBreakoverVs(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] font-mono text-slate-500">
                Rated Zero-Gate Breakover Voltage V_BO0 = {vbo0Rating} V
              </span>
            </div>

            <button
              onClick={handleTriggerAction}
              disabled={isLatched}
              className={`py-2 rounded-xl text-xs font-mono font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                vBreakoverVs >= vbo0Rating && !isLatched
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>{vBreakoverVs >= vbo0Rating ? 'Trigger Avalanche Breakdown' : 'Increase V_AK to V_BO0'}</span>
            </button>
          </div>
        )}

        {activeMode === 'thermal' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="sm:col-span-2">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Junction Temperature (T_j):</span>
                <span className={`font-bold ${junctionTempC >= tjThermalTriggerC ? 'text-rose-400 font-extrabold' : junctionTempC > tjMaxSafeC ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {junctionTempC}°C {junctionTempC >= tjThermalTriggerC ? '🚨 (SPONTANEOUS TRIGGER!)' : ''}
                </span>
              </div>
              <input
                type="range"
                min="25"
                max="165"
                step="5"
                value={junctionTempC}
                onChange={(e) => setJunctionTempC(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>Safe Max: {tjMaxSafeC}°C</span>
                <span>Thermally Generated Leakage I_co: {thermalLeakageMa.toFixed(2)} mA</span>
                <span>Trigger Threshold: {tjThermalTriggerC}°C</span>
              </div>
            </div>

            <button
              onClick={handleTriggerAction}
              disabled={isLatched || junctionTempC < tjThermalTriggerC}
              className={`py-2 rounded-xl text-xs font-mono font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                junctionTempC >= tjThermalTriggerC && !isLatched
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg animate-pulse'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>{junctionTempC >= tjThermalTriggerC ? 'Thermal Latch Active' : 'Heat Die to >=145°C'}</span>
            </button>
          </div>
        )}

        {activeMode === 'dvdt' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Step Transient (ΔV):</span>
                <span className="text-sky-400 font-bold">{dvdtStepVoltage} V</span>
              </div>
              <input
                type="range"
                min="100"
                max="600"
                step="50"
                value={dvdtStepVoltage}
                onChange={(e) => setDvdtStepVoltage(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Rise Time (t_r):</span>
                <span className="text-amber-400 font-bold">{dvdtRiseTimeNs} ns</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={dvdtRiseTimeNs}
                onChange={(e) => setDvdtRiseTimeNs(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] font-mono text-slate-400">
                dv/dt = {actualDvDt.toFixed(0)} V/µs | i_disp = {idispMa.toFixed(1)} mA
              </span>
            </div>

            <button
              onClick={handleTriggerAction}
              disabled={isLatched}
              className={`py-2 rounded-xl text-xs font-mono font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                actualDvDt >= criticalDvDtRating && !isLatched
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Apply dv/dt Pulse</span>
            </button>
          </div>
        )}

        {activeMode === 'light' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="sm:col-span-2">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Optical Laser Intensity:</span>
                <span className="text-cyan-400 font-bold">{laserIntensityMw} mW</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={laserIntensityMw}
                onChange={(e) => setLaserIntensityMw(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[10px] font-mono text-slate-500">
                LASCR Optical Threshold P_opt = {opticalThresholdMw} mW (HVDC Valve Isolation Benchmark)
              </span>
            </div>

            <button
              onClick={handleTriggerAction}
              disabled={isLatched}
              className={`py-2 rounded-xl text-xs font-mono font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isLatched
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Fire Optical Laser</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Real-Time Status Notification Alert */}
      {turnOnCause && (
        <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/80 p-3 rounded-xl text-xs font-mono text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{turnOnCause}</span>
        </div>
      )}

      {/* 5. Central Visual Canvas */}
      <div className="flex flex-col bg-[#070b13] border border-[#30363d] rounded-xl p-2 relative">
        <canvas
          ref={canvasRef}
          width={840}
          height={320}
          className="w-full h-auto rounded-lg"
        />
      </div>

      {/* 6. Educational Comparative Summary Table */}
      <div className="overflow-x-auto bg-[#161b22] border border-[#30363d] rounded-xl p-3">
        <table className="w-full text-left font-mono text-[11px] text-slate-300">
          <thead>
            <tr className="border-b border-[#30363d] text-slate-400 uppercase text-[10px]">
              <th className="pb-2">Turn-On Mechanism</th>
              <th className="pb-2">Trigger Threshold</th>
              <th className="pb-2">Internal Physical Phenomenon</th>
              <th className="pb-2">Industrial Application / Danger</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262d]">
            <tr className={activeMode === 'gate' ? 'bg-emerald-950/30' : ''}>
              <td className="py-2 text-emerald-400 font-bold">1. Gate Triggering</td>
              <td>I_G &gt;= {igThresholdMa} mA</td>
              <td>Injected gate holes trigger NPN transistor Q2 base.</td>
              <td>Standard controlled operation for rectifiers, motor drives, HVDC.</td>
            </tr>
            <tr className={activeMode === 'breakover' ? 'bg-rose-950/30' : ''}>
              <td className="py-2 text-rose-400 font-bold">2. Breakover Voltage (V_BO)</td>
              <td>V_AK &gt;= {vbo0Rating} V</td>
              <td>Avalanche multiplication in reverse-biased junction J2.</td>
              <td>Avoid in normal SCRs (causes hot-spot destruction); used in DIACs &amp; BODs.</td>
            </tr>
            <tr className={activeMode === 'thermal' ? 'bg-amber-950/30' : ''}>
              <td className="py-2 text-amber-400 font-bold">3. Thermal Triggering</td>
              <td>T_j &gt;= {tjThermalTriggerC}°C</td>
              <td>Thermally excited electron-hole pairs spike leakage current I_co.</td>
              <td>Uncontrolled thermal runaway; requires robust heatsinks and thermal trip.</td>
            </tr>
            <tr className={activeMode === 'dvdt' ? 'bg-sky-950/30' : ''}>
              <td className="py-2 text-sky-400 font-bold">4. Critical dv/dt</td>
              <td>dv/dt &gt;= {criticalDvDtRating} V/µs</td>
              <td>Displacement current i_disp = C_j2·(dv/dt) enters gate.</td>
              <td>False triggering due to line transients; prevented by RC snubbers.</td>
            </tr>
            <tr className={activeMode === 'light' ? 'bg-cyan-950/30' : ''}>
              <td className="py-2 text-cyan-400 font-bold">5. Light / Optical (LASCR)</td>
              <td>P_opt &gt;= {opticalThresholdMw} mW</td>
              <td>Photon absorption directly creates charge carriers in J2 depletion layer.</td>
              <td>High-voltage HVDC converters with fiber-optic galvanic isolation.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
