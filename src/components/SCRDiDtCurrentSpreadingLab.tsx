import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  Info,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Gauge
} from 'lucide-react';

interface SCRDiDtCurrentSpreadingLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * SCRDiDtCurrentSpreadingLab.tsx
 * 
 * Recommendation 4: Visualizing di/dt Initial Filament Ignition & Silicon Plasma Spreading
 * 
 * Physics Laws & Standards:
 *  - At t=0, conduction initiates solely in a tiny microscopic filament (r0 ~ 0.1mm) near the gate.
 *  - The plasma front expands radially outward at velocity vs ~ 0.1 mm/µs (IEC 60747-6 standard).
 *  - Active conduction area: A(t) = pi * (r0 + vs * t)^2.
 *  - Current density: J(t) = iA(t) / A(t) [A/cm²].
 *  - Localized Joule heating: q(t) = J(t)² * rho * dt.
 *  - If di/dt = Vs / Ls > (di/dt)crit, local temperature exceeds silicon melting point (1414°C),
 *    causing localized hotspot burnout and irreversible device destruction!
 *  - Compares Center Gate vs Amplifying / Interdigitated Involute Gate geometries.
 */
export const SCRDiDtCurrentSpreadingLab: React.FC<SCRDiDtCurrentSpreadingLabProps> = ({
  className = '',
  onClose,
}) => {
  // Circuit Parameters
  const [supplyVoltageVs, setSupplyVoltageVs] = useState<number>(600); // V
  const [seriesInductanceUh, setSeriesInductanceUh] = useState<number>(3.5); // µH
  const [gateStructure, setGateStructure] = useState<'center_gate' | 'amplifying_gate'>('center_gate');
  const [loadResistance, setLoadResistance] = useState<number>(10); // Ohms

  // Device Ratings
  const criticalDiDtRating = 150; // A/µs device rating
  const waferDiameterMm = 30; // 30mm thyristor wafer

  // Simulation State
  const [isFiring, setIsFiring] = useState<boolean>(false);
  const [simTimeUs, setSimTimeUs] = useState<number>(0); // Time in microseconds (0 to 120 µs)
  const [isBurnout, setIsBurnout] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.1); // Slow-motion (0.01x to 1x)

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sparks for burnout effect
  const sparksRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([]);

  // Physics Calculations:
  // Initial rate of rise of current: (di/dt)max = Vs / Ls (in A/µs)
  const actualDiDt = supplyVoltageVs / Math.max(0.1, seriesInductanceUh); // A/µs
  const isDiDtDangerous = actualDiDt > criticalDiDtRating;

  // Maximum peak current
  const iPeakA = supplyVoltageVs / loadResistance;

  // Plasma spreading velocity (center gate = 0.1 mm/µs; amplifying gate has 4x faster initial coverage)
  const vsVelocity = gateStructure === 'amplifying_gate' ? 0.35 : 0.1; // mm/µs

  // Reset Experiment
  const handleReset = () => {
    setIsFiring(false);
    setSimTimeUs(0);
    setIsBurnout(false);
    sparksRef.current = [];
  };

  // Fire Gate Pulse Trigger
  const handleFireGate = () => {
    handleReset();
    setIsFiring(true);
  };

  // Main Simulation Loop
  useEffect(() => {
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dtMs = (now - lastTime);
      lastTime = now;

      if (isFiring && !isBurnout) {
        // Increment simTime in µs
        const dtUs = (dtMs / 1000) * (playbackSpeed * 80);
        setSimTimeUs((prev) => {
          const nextTime = prev + dtUs;

          // Check for Burnout condition:
          // If di/dt is excessive during the initial 5 µs when active area is tiny!
          if (isDiDtDangerous && nextTime >= 1.2 && nextTime <= 6.0) {
            setIsBurnout(true);
            // Spawn sparks
            const sparks: Array<{ x: number; y: number; vx: number; vy: number; life: number }> = [];
            for (let i = 0; i < 40; i++) {
              sparks.push({
                x: 0,
                y: 0,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 1.0,
              });
            }
            sparksRef.current = sparks;
          }

          if (nextTime >= 100) {
            setIsFiring(false);
            return 100;
          }
          return nextTime;
        });
      }

      drawCanvas();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isFiring, isBurnout, simTimeUs, playbackSpeed, isDiDtDangerous, gateStructure, supplyVoltageVs, seriesInductanceUh, loadResistance]);

  // Current at time t:
  // iA(t) = iPeak * (1 - exp(-t / tau)) where tau = L / R
  const tauUs = (seriesInductanceUh / loadResistance); // in µs
  const currentInstantA = isFiring
    ? iPeakA * (1 - Math.exp(-simTimeUs / Math.max(0.1, tauUs)))
    : 0;

  // Active conduction radius: r(t) = r0 + vs * t
  const initialRadiusMm = gateStructure === 'amplifying_gate' ? 2.5 : 0.8;
  const currentRadiusMm = Math.min(
    waferDiameterMm / 2,
    initialRadiusMm + vsVelocity * simTimeUs
  );

  // Active Area: A(t) in mm²
  const activeAreaMm2 = Math.PI * Math.pow(currentRadiusMm, 2);
  // Current Density J(t) in A/mm²
  const currentDensityAmm2 = activeAreaMm2 > 0 ? currentInstantA / activeAreaMm2 : 0;

  // Local Peak Temperature (°C)
  // Local heating is proportional to J² during initial spreading
  const localTempC = isBurnout
    ? 1580 // Silicon melting point exceeded (>1414°C)!
    : isFiring
    ? Math.min(1380, 25 + Math.pow(currentDensityAmm2, 1.6) * 110)
    : 25;

  // Draw Silicon Wafer Top-Down Animation
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dark Background
    ctx.fillStyle = '#070b12';
    ctx.fillRect(0, 0, w, h);

    const centerX = w * 0.42;
    const centerY = h * 0.5;
    const waferPixelRadius = 120; // 30mm diameter -> 120px radius (4px per mm)
    const pxPerMm = waferPixelRadius / (waferDiameterMm / 2);

    // 1. Silicon Circular Wafer Disk (Dark Gray / Silvery)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(centerX, centerY, waferPixelRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Cathode Metallization Outer Ring
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, waferPixelRadius - 6, 0, 2 * Math.PI);
    ctx.stroke();

    // 2. Active Plasma Spreading Zone
    if (isFiring) {
      const activePxRadius = currentRadiusMm * pxPerMm;

      // Radial Heat & Current Density Gradient
      const heatGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        activePxRadius
      );

      if (isBurnout) {
        // Incandescent White-Hot Crater
        heatGrad.addColorStop(0, '#ffffff');
        heatGrad.addColorStop(0.2, '#fef08a');
        heatGrad.addColorStop(0.6, '#ef4444');
        heatGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else if (localTempC > 600) {
        // High thermal stress
        heatGrad.addColorStop(0, '#fbbf24');
        heatGrad.addColorStop(0.5, '#f97316');
        heatGrad.addColorStop(0.9, 'rgba(249, 115, 22, 0.4)');
        heatGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      } else {
        // Normal Safe Conduction Spreading (Emerald Green Plasma)
        heatGrad.addColorStop(0, '#34d399');
        heatGrad.addColorStop(0.6, '#10b981');
        heatGrad.addColorStop(1, 'rgba(16, 185, 129, 0.15)');
      }

      ctx.fillStyle = heatGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, activePxRadius, 0, 2 * Math.PI);
      ctx.fill();

      // Front Shockwave Ring
      ctx.strokeStyle = isBurnout ? '#ef4444' : '#6ee7b7';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, activePxRadius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Gate Electrode Structure (Center vs Amplifying Involute)
    if (gateStructure === 'center_gate') {
      // Center Gate Contact Pad
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 12, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = '#000000';
      ctx.fillText('GATE', centerX - 11, centerY + 3);
    } else {
      // Amplifying Interdigitated Gate (Involute Fingers extending outward)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 14, 0, 2 * Math.PI);
      ctx.stroke();

      // 4 Involute Gate Fingers
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(ang) * 14, centerY + Math.sin(ang) * 14);
        ctx.lineTo(centerX + Math.cos(ang) * 65, centerY + Math.sin(ang) * 65);
        ctx.stroke();
      }

      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('AMPLIFYING INTERDIGITATED GATE', centerX - 70, centerY - waferPixelRadius - 8);
    }

    // 4. Burnout Sparks and Molten Silicon Crater
    if (isBurnout) {
      // Crater hole
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(centerX + 6, centerY + 6, 14, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Animate flying molten sparks
      ctx.fillStyle = '#fef08a';
      sparksRef.current.forEach((sp) => {
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= 0.02;
        if (sp.life > 0) {
          ctx.beginPath();
          ctx.arc(centerX + sp.x, centerY + sp.y, 2.5 * sp.life, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      // Flashing Alarm Banner over Wafer
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.fillRect(centerX - 130, centerY - 20, 260, 40);
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('💥 LOCALIZED di/dt RUPTURE!', centerX - 100, centerY - 2);
      ctx.font = '10px monospace';
      ctx.fillText(`T_peak = 1580°C (Melted Silicon Crater)`, centerX - 110, centerY + 14);
    }

    // 5. Real-Time Telemetry Dashboard on Right Side of Canvas
    const panelX = w * 0.72;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(panelX, 20, w - panelX - 15, h - 40);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(panelX, 20, w - panelX - 15, h - 40);

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('LIVE PHYSICS METRICS', panelX + 12, 42);

    const metrics = [
      { label: 'di/dt (Vs / Ls):', val: `${actualDiDt.toFixed(0)} A/µs`, alert: isDiDtDangerous },
      { label: 'Rating Limit:', val: `${criticalDiDtRating} A/µs`, alert: false },
      { label: 'Sim Time (t):', val: `${simTimeUs.toFixed(1)} µs`, alert: false },
      { label: 'Anode Current:', val: `${currentInstantA.toFixed(1)} A`, alert: false },
      { label: 'Active Area:', val: `${activeAreaMm2.toFixed(1)} mm²`, alert: false },
      { label: 'Coverage:', val: `${((activeAreaMm2 / (Math.PI * Math.pow(waferDiameterMm / 2, 2))) * 100).toFixed(0)}%`, alert: false },
      { label: 'Current Density:', val: `${currentDensityAmm2.toFixed(1)} A/mm²`, alert: currentDensityAmm2 > 8 },
      { label: 'Hotspot Temp:', val: `${localTempC.toFixed(0)} °C`, alert: localTempC > 600 },
    ];

    metrics.forEach((m, idx) => {
      const y = 72 + idx * 24;
      ctx.font = '10px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(m.label, panelX + 12, y);

      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = m.alert ? '#ef4444' : '#34d399';
      ctx.fillText(m.val, panelX + 115, y);
    });
  };

  return (
    <div className={`flex flex-col gap-3 bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 shadow-2xl ${className}`}>
      {/* 1. Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-md">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>di/dt FILAMENT IGNITION & PLASMA SPREADING LAB</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 border border-rose-500 text-rose-300 font-bold">
                IEC 60747-6 HOTSPOT PHYSICS
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Microscopic silicon die thermal simulation showing initial pinpoint filament ignition, radial plasma expansion velocity (vs ≈ 0.1 mm/µs), and localized di/dt thermal burnout.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleFireGate}
            disabled={isFiring && !isBurnout}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isBurnout ? 'Re-Test (Fire Gate)' : 'Fire Gate Pulse'}</span>
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Parameters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-[#161b22] border border-[#30363d] p-3 rounded-xl">
        {/* Supply Voltage Vs */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Supply Voltage (Vs):</span>
            <span className="text-sky-400 font-bold">{supplyVoltageVs} V</span>
          </div>
          <input
            type="range"
            min="200"
            max="800"
            step="50"
            value={supplyVoltageVs}
            onChange={(e) => setSupplyVoltageVs(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Series Commutation Inductance Ls */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Series Inductor (Ls):</span>
            <span className={`font-bold ${isDiDtDangerous ? 'text-rose-400 font-extrabold' : 'text-emerald-400'}`}>
              {seriesInductanceUh} µH {isDiDtDangerous ? '🚨 (LOW Ls!)' : ''}
            </span>
          </div>
          <input
            type="range"
            min="1.0"
            max="15.0"
            step="0.5"
            value={seriesInductanceUh}
            onChange={(e) => setSeriesInductanceUh(Number(e.target.value))}
            className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <span className="text-[10px] font-mono text-slate-500">
            Actual di/dt = {actualDiDt.toFixed(0)} A/µs (Limit: {criticalDiDtRating} A/µs)
          </span>
        </div>

        {/* Gate Structure Geometry */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Gate Wafer Geometry</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setGateStructure('center_gate')}
              className={`flex-1 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                gateStructure === 'center_gate' ? 'bg-amber-600 text-white font-black' : 'bg-[#0d1117] text-slate-400 hover:text-white'
              }`}
            >
              Center Gate (Std)
            </button>
            <button
              onClick={() => setGateStructure('amplifying_gate')}
              className={`flex-1 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                gateStructure === 'amplifying_gate' ? 'bg-indigo-600 text-white font-black' : 'bg-[#0d1117] text-slate-400 hover:text-white'
              }`}
            >
              Amplifying Involute
            </button>
          </div>
        </div>

        {/* Slow-Motion Speed */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Replay Speed</label>
          <div className="flex items-center gap-1">
            {[
              { val: 0.02, label: '0.02x' },
              { val: 0.1, label: '0.1x' },
              { val: 0.5, label: '0.5x' },
            ].map((sp) => (
              <button
                key={sp.val}
                onClick={() => setPlaybackSpeed(sp.val)}
                className={`flex-1 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  playbackSpeed === sp.val ? 'bg-emerald-600 text-white' : 'bg-[#0d1117] text-slate-400 hover:text-white'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Safety Warning Banner */}
      {isDiDtDangerous && (
        <div className="flex items-center gap-2 bg-rose-950/80 border border-rose-500 p-3 rounded-xl text-xs font-mono text-rose-200 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <b>CRITICAL WARNING:</b> di/dt = {actualDiDt.toFixed(0)} A/µs exceeds device rating ({criticalDiDtRating} A/µs)! Without sufficient series inductance Ls, current rises faster than plasma spreads (vs ≈ 0.1 mm/µs), producing localized silicon melting and permanent puncture!
          </span>
        </div>
      )}

      {/* 4. Canvas Stage */}
      <div className="flex flex-col bg-[#070b12] border border-[#30363d] rounded-xl p-2 relative">
        <canvas
          ref={canvasRef}
          width={840}
          height={340}
          className="w-full h-auto rounded-lg"
        />
      </div>

      {/* 5. Pedagogical Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-xs font-mono">
        <div className="flex items-start gap-2 text-slate-300">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <b className="text-sky-400">Why di/dt Fails Locally:</b>
            <p className="text-[11px] text-slate-400">
              When triggered, conduction starts in a tiny filament near the gate. It takes 50–100 µs for the plasma wave to cover the full 30mm wafer.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-slate-300">
          <Flame className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <b className="text-rose-400">Melting Point (1414°C):</b>
            <p className="text-[11px] text-slate-400">
              Current density J = I / A_eff can exceed 10⁵ A/cm², vaporizing the silicon lattice into a molten crater.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-slate-300">
          <Cpu className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <b className="text-emerald-400">Amplifying Gate Solution:</b>
            <p className="text-[11px] text-slate-400">
              Interdigitated involute fingers distribute gate current across a wide perimeter immediately, increasing initial $di/dt$ tolerance to &gt;1000 A/µs!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
