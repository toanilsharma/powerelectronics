import React, { useState, useEffect, useRef } from 'react';
import { Thermometer, Activity, Zap, Layers, AlertTriangle, ShieldCheck, Wind, Flame, Info } from 'lucide-react';

interface ThermalFosterCauerLabProps {
  onClose?: () => void;
}

type NetworkType = 'cauer' | 'foster';
type PulseProfileType = 'pwm_train' | 'continuous' | 'single_pulse';

interface RCStage {
  name: string;
  layer: string;
  r: number; // K/W
  c: number; // J/K
  tau: number; // seconds
}

export const ThermalFosterCauerLab: React.FC<ThermalFosterCauerLabProps> = ({ onClose }) => {
  const [networkType, setNetworkType] = useState<NetworkType>('cauer');
  const [profile, setProfile] = useState<PulseProfileType>('pwm_train');
  const [ambientTemp, setAmbientTemp] = useState<number>(35); // °C
  const [peakPower, setPeakPower] = useState<number>(600); // Watts
  const [dutyCycle, setDutyCycle] = useState<number>(50); // %
  const [fanSpeed, setFanSpeed] = useState<'natural' | 'low' | 'forced'>('forced');
  const [tjMaxLimit, setTjMaxLimit] = useState<number>(150); // 150°C standard, 175°C SiC

  // 4-Stage Thermal Ladder Parameters
  // Heatsink R drops with forced air
  const rHeatsink = fanSpeed === 'forced' ? 0.12 : fanSpeed === 'low' ? 0.22 : 0.45;
  const stages: RCStage[] = [
    { name: 'R1 / C1', layer: 'Si Junction to Substrate', r: 0.045, c: 0.08, tau: 0.0036 },
    { name: 'R2 / C2', layer: 'DCB Ceramic to Baseplate', r: 0.085, c: 0.65, tau: 0.055 },
    { name: 'R3 / C3', layer: 'TIM Grease to Heatsink', r: 0.095, c: 18.0, tau: 1.71 },
    { name: 'R4 / C4', layer: 'Heatsink to Ambient Air', r: rHeatsink, c: 450.0, tau: rHeatsink * 450.0 },
  ];

  const totalRth = stages.reduce((acc, s) => acc + s.r, 0);

  // Real-time thermal nodes state (°C)
  const [temps, setTemps] = useState({
    tj: 35,
    tsub: 35,
    tcase: 35,
    tsink: 35,
    tamb: 35
  });

  const zthCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const simTimeRef = useRef<number>(0);
  const historyRef = useRef<{ t: number; tj: number; tc: number; ts: number; p: number }[]>([]);

  // Simulation step
  useEffect(() => {
    let lastTime = performance.now();
    let currentTj = ambientTemp;
    let currentTsub = ambientTemp;
    let currentTcase = ambientTemp;
    let currentTsink = ambientTemp;

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      simTimeRef.current += dt * 2.0;
      const t = simTimeRef.current;

      // Calculate instantaneous power injection P_loss(t)
      let pInstant = 0;
      if (profile === 'continuous') {
        pInstant = peakPower * (dutyCycle / 100);
      } else if (profile === 'pwm_train') {
        const period = 0.1; // 10 Hz visual pulse for clear scope view
        const phase = (t % period) / period;
        pInstant = phase < (dutyCycle / 100) ? peakPower : 15; // 15W standby
      } else if (profile === 'single_pulse') {
        // High surge pulse between t=1s and t=2.5s
        const cycle = t % 6.0;
        pInstant = cycle >= 1.0 && cycle <= 2.5 ? peakPower * 2.2 : 20;
      }

      // Discrete Integration of Cauer RC Ladder Nodes:
      // C1 * d(Tj)/dt = P - (Tj - Tsub)/R1
      // C2 * d(Tsub)/dt = (Tj - Tsub)/R1 - (Tsub - Tcase)/R2
      // C3 * d(Tcase)/dt = (Tsub - Tcase)/R2 - (Tcase - Tsink)/R3
      // C4 * d(Tsink)/dt = (Tcase - Tsink)/R3 - (Tsink - Tamb)/R4
      const subSteps = 10;
      const subDt = dt / subSteps;
      for (let step = 0; step < subSteps; step++) {
        const heatFlow1 = (currentTj - currentTsub) / stages[0].r;
        const heatFlow2 = (currentTsub - currentTcase) / stages[1].r;
        const heatFlow3 = (currentTcase - currentTsink) / stages[2].r;
        const heatFlow4 = (currentTsink - ambientTemp) / stages[3].r;

        currentTj += ((pInstant - heatFlow1) / stages[0].c) * subDt;
        currentTsub += ((heatFlow1 - heatFlow2) / stages[1].c) * subDt;
        currentTcase += ((heatFlow2 - heatFlow3) / stages[2].c) * subDt;
        currentTsink += ((heatFlow3 - heatFlow4) / stages[3].c) * subDt;
      }

      setTemps({
        tj: currentTj,
        tsub: currentTsub,
        tcase: currentTcase,
        tsink: currentTsink,
        tamb: ambientTemp
      });

      // Record history
      historyRef.current.push({
        t,
        tj: currentTj,
        tc: currentTcase,
        ts: currentTsink,
        p: pInstant
      });
      if (historyRef.current.length > 320) {
        historyRef.current.shift();
      }

      // 1. RENDER ZTH LOG-LOG TRANSIENT IMPEDANCE CANVAS
      const zthCanvas = zthCanvasRef.current;
      if (zthCanvas) {
        const ctx = zthCanvas.getContext('2d');
        if (ctx) {
          const w = zthCanvas.width;
          const h = zthCanvas.height;

          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, w, h);

          // Grid
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = 30; x < w; x += 45) {
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
          }
          for (let y = 20; y < h; y += 35) {
            ctx.moveTo(0, y); ctx.lineTo(w, y);
          }
          ctx.stroke();

          // Log-log axes labels: 10us to 1000s
          ctx.fillStyle = '#64748b';
          ctx.font = '9px monospace';
          ctx.fillText('10μs', 30, h - 6);
          ctx.fillText('1ms', 105, h - 6);
          ctx.fillText('100ms', 180, h - 6);
          ctx.fillText('10s', 255, h - 6);
          ctx.fillText('1000s', w - 35, h - 6);
          ctx.fillText('Zth (K/W)', 6, 14);

          // Plot theoretical Zth(t) curve: sum(Ri * (1 - exp(-t/tau_i)))
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          const pts = w - 40;
          for (let i = 0; i < pts; i++) {
            // log time scale from -5 (10us) to 3 (1000s)
            const logT = -5 + (i / pts) * 8;
            const timeSec = Math.pow(10, logT);
            let zVal = 0;
            for (let s = 0; s < 4; s++) {
              zVal += stages[s].r * (1 - Math.exp(-timeSec / stages[s].tau));
            }
            const px = 30 + i;
            const py = (h - 22) - (zVal / totalRth) * (h - 40);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();

          // Mark total steady-state Rth line
          ctx.strokeStyle = '#ef4444';
          ctx.setLineDash([4, 4]);
          const steadyY = (h - 22) - (h - 40);
          ctx.beginPath();
          ctx.moveTo(30, steadyY); ctx.lineTo(w, steadyY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#ef4444';
          ctx.fillText(`Rth(j-a) = ${totalRth.toFixed(3)} K/W`, w - 140, steadyY - 4);
        }
      }

      // 2. RENDER REAL-TIME THERMAL SCOPE CANVAS
      const scopeCanvas = scopeCanvasRef.current;
      if (scopeCanvas) {
        const ctx = scopeCanvas.getContext('2d');
        if (ctx) {
          const w = scopeCanvas.width;
          const h = scopeCanvas.height;

          ctx.fillStyle = '#060a12';
          ctx.fillRect(0, 0, w, h);

          // Grid
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          for (let x = 0; x < w; x += 35) {
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
          }
          for (let y = 0; y < h; y += 35) {
            ctx.moveTo(0, y); ctx.lineTo(w, y);
          }
          ctx.stroke();

          // Tj Max Limit Line (Red Dashed)
          const maxTempScale = 180;
          const limitY = h - (tjMaxLimit / maxTempScale) * (h - 30) - 15;
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(0, limitY); ctx.lineTo(w, limitY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`Tj,max Limit = ${tjMaxLimit}°C`, w - 130, limitY - 4);

          // Draw Traces from history
          const hist = historyRef.current;
          if (hist.length > 2) {
            // Draw Heatsink Ts (Emerald)
            ctx.strokeStyle = '#34d399';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            hist.forEach((pt, idx) => {
              const x = (idx / (hist.length - 1)) * w;
              const y = h - (pt.ts / maxTempScale) * (h - 30) - 15;
              if (idx === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Draw Case Tc (Amber)
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            hist.forEach((pt, idx) => {
              const x = (idx / (hist.length - 1)) * w;
              const y = h - (pt.tc / maxTempScale) * (h - 30) - 15;
              if (idx === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Draw Junction Tj (Red / Magenta)
            ctx.strokeStyle = currentTj > tjMaxLimit ? '#f43f5e' : '#ec4899';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            hist.forEach((pt, idx) => {
              const x = (idx / (hist.length - 1)) * w;
              const y = h - (pt.tj / maxTempScale) * (h - 30) - 15;
              if (idx === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            });
            ctx.stroke();
          }

          // Header Legend
          ctx.font = 'bold 10px monospace';
          ctx.fillStyle = currentTj > tjMaxLimit ? '#f43f5e' : '#ec4899';
          ctx.fillText(`― Junction Tj (${currentTj.toFixed(1)}°C)`, 12, 18);
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(`― Case Tc (${currentTcase.toFixed(1)}°C)`, 180, 18);
          ctx.fillStyle = '#34d399';
          ctx.fillText(`― Heatsink Ts (${currentTsink.toFixed(1)}°C)`, 310, 18);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [profile, ambientTemp, peakPower, dutyCycle, rHeatsink, tjMaxLimit, totalRth, stages]);

  const isOverheated = temps.tj >= tjMaxLimit;

  return (
    <div className="w-full bg-[#0a0f1d] border border-[#1e293b] rounded-2xl p-5 shadow-2xl flex flex-col gap-5 text-white">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
            <Thermometer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold tracking-wide uppercase text-white">
                Semiconductor Dynamic RC Thermal Ladder Network (Z_th(j-a))
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 border border-rose-500/40 text-rose-400">
                IEC 60747-9 / JEDEC JESD51
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
              4-Stage Foster vs Cauer RC thermal diffusion ladder, thermal mass lag, and pulsed junction ripple.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* NETWORK TOPOLOGY SWITCHER */}
          <div className="flex items-center bg-[#0f172a] p-1 rounded-xl border border-[#334155]">
            <button
              onClick={() => setNetworkType('cauer')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                networkType === 'cauer'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              CAUER (Physical Ladder)
            </button>
            <button
              onClick={() => setNetworkType('foster')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                networkType === 'foster'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              FOSTER (Datasheet Series)
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-[#94a3b8] text-xs font-mono transition-all cursor-pointer"
            >
              CLOSE
            </button>
          )}
        </div>
      </div>

      {/* PHYSICAL PACKAGE CROSS-SECTION & RC LADDER SCHEMATIC */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#1e293b]">
          <span className="font-bold text-[#c9d1d9] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-rose-400" />
            {networkType === 'cauer' ? 'PHYSICAL CAUER T-LADDER (True Node Temperatures)' : 'FOSTER UNCOUPLED SERIES RC'}
          </span>
          <span className="text-[11px] text-[#38bdf8] font-bold">
            Total Rth(j-a) = {totalRth.toFixed(3)} K/W
          </span>
        </div>

        {/* 4 STAGES DISPLAY */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {stages.map((stg, idx) => {
            const nodeTemp = idx === 0 ? temps.tj : idx === 1 ? temps.tsub : idx === 2 ? temps.tcase : temps.tsink;
            const nodeColor = idx === 0 ? 'text-rose-400' : idx === 1 ? 'text-orange-400' : idx === 2 ? 'text-amber-400' : 'text-emerald-400';
            return (
              <div key={idx} className="bg-[#1e293b]/50 border border-[#334155] rounded-xl p-3 flex flex-col justify-between font-mono">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-[#94a3b8]">STAGE {idx + 1}</span>
                    <h4 className="text-xs font-bold text-white">{stg.name}</h4>
                  </div>
                  <div className={`text-sm font-extrabold ${nodeColor}`}>
                    {nodeTemp.toFixed(1)}°C
                  </div>
                </div>

                <div className="text-[10px] text-[#64748b] mt-1">{stg.layer}</div>

                <div className="mt-2 pt-2 border-t border-[#334155] grid grid-cols-2 gap-1 text-[10px] text-[#94a3b8]">
                  <span>R: <b className="text-white">{stg.r.toFixed(3)} K/W</b></span>
                  <span>C: <b className="text-white">{stg.c.toFixed(2)} J/K</b></span>
                  <span className="col-span-2">τ = R·C: <b className="text-[#38bdf8]">{stg.tau < 1 ? `${(stg.tau * 1000).toFixed(1)} ms` : `${stg.tau.toFixed(1)} s`}</b></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DUAL CANVASES: Zth(t) LOG-LOG AND REAL-TIME THERMAL SCOPE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT 5 COLS: ZTH TRANSIENT LOG-LOG */}
        <div className="lg:col-span-5 bg-[#0f172a] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#1e293b]">
            <span className="font-bold text-[#c9d1d9] flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#38bdf8]" /> TRANSIENT Z_th(t) STEP RESPONSE
            </span>
            <span className="text-[11px] text-[#34d399] font-bold">10μs → 1000s Log</span>
          </div>

          <div className="w-full flex justify-center items-center bg-[#090d16] rounded-lg overflow-hidden border border-[#1e293b]">
            <canvas
              ref={zthCanvasRef}
              width={340}
              height={240}
              className="w-full h-auto max-h-[250px]"
            />
          </div>

          <div className="text-[11px] font-mono text-[#94a3b8] leading-tight">
            Shows effective thermal impedance as heat diffuses outwards across die, case, and bulk sink.
          </div>
        </div>

        {/* RIGHT 7 COLS: REAL-TIME TEMPERATURE SCOPE */}
        <div className="lg:col-span-7 bg-[#0f172a] border border-[#1e293b] rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#1e293b]">
            <span className="font-bold text-[#c9d1d9] flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-400" /> DYNAMIC TEMPERATURE PROPAGATION
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
              isOverheated
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
            }`}>
              {isOverheated ? 'OVERHEAT TRIP (Tj > 150°C)' : 'THERMAL STABLE'}
            </span>
          </div>

          <div className="w-full flex justify-center items-center bg-[#060a12] rounded-lg overflow-hidden border border-[#1e293b]">
            <canvas
              ref={scopeCanvasRef}
              width={540}
              height={240}
              className="w-full h-auto max-h-[250px]"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2">
              <div className="text-[10px] text-[#94a3b8]">JUNCTION TEMP Tj</div>
              <div className={`text-sm font-extrabold ${temps.tj > tjMaxLimit ? 'text-rose-400' : 'text-white'}`}>
                {temps.tj.toFixed(1)} °C
              </div>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2">
              <div className="text-[10px] text-[#94a3b8]">CASE TEMP Tc</div>
              <div className="text-sm font-extrabold text-amber-400">
                {temps.tcase.toFixed(1)} °C
              </div>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2">
              <div className="text-[10px] text-[#94a3b8]">HEATSINK Ts</div>
              <div className="text-sm font-extrabold text-[#34d399]">
                {temps.tsink.toFixed(1)} °C
              </div>
            </div>

            <div className="bg-[#1e293b]/60 border border-[#334155] rounded-lg p-2">
              <div className="text-[10px] text-[#94a3b8]">JUNCTION RIPPLE ΔTj</div>
              <div className="text-sm font-extrabold text-rose-300">
                {(temps.tj - temps.tcase).toFixed(1)} °C
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
        {/* CONTROLS (8 COLS) */}
        <div className="md:col-span-8 flex flex-col gap-4 font-mono text-xs">
          <div className="text-xs font-extrabold text-rose-400 uppercase tracking-wider">
            Thermal Loss &amp; Operating Environment
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* POWER PROFILE BUTTONS */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[#94a3b8]">Loss Profile:</span>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setProfile('pwm_train')}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold text-left transition-all ${
                    profile === 'pwm_train'
                      ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                      : 'bg-[#1e293b] border-[#334155] text-[#94a3b8]'
                  }`}
                >
                  ⚡ PWM Repetitive Pulses
                </button>
                <button
                  onClick={() => setProfile('continuous')}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold text-left transition-all ${
                    profile === 'continuous'
                      ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                      : 'bg-[#1e293b] border-[#334155] text-[#94a3b8]'
                  }`}
                >
                  🔥 Continuous Conduction
                </button>
                <button
                  onClick={() => setProfile('single_pulse')}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold text-left transition-all ${
                    profile === 'single_pulse'
                      ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                      : 'bg-[#1e293b] border-[#334155] text-[#94a3b8]'
                  }`}
                >
                  💥 Overcurrent Surge Pulse
                </button>
              </div>
            </div>

            {/* PEAK POWER & DUTY SLIDERS */}
            <div className="flex flex-col gap-3 bg-[#1e293b]/40 p-2.5 rounded-lg border border-[#334155]">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[#94a3b8]">Peak Power P_pk:</span>
                  <span className="font-bold text-rose-400">{peakPower} W</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1500"
                  step="50"
                  value={peakPower}
                  onChange={(e) => setPeakPower(parseFloat(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[#94a3b8]">PWM Duty Cycle:</span>
                  <span className="font-bold text-amber-400">{dutyCycle}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={dutyCycle}
                  onChange={(e) => setDutyCycle(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* AMBIENT TEMP & FAN SPEED */}
            <div className="flex flex-col gap-3 bg-[#1e293b]/40 p-2.5 rounded-lg border border-[#334155]">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[#94a3b8]">Ambient Temp T_a:</span>
                  <span className="font-bold text-emerald-400">{ambientTemp}°C</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="60"
                  step="5"
                  value={ambientTemp}
                  onChange={(e) => setAmbientTemp(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-[#94a3b8] block mb-1">Cooling Method:</span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setFanSpeed('natural')}
                    className={`px-1 py-1 rounded text-[10px] font-bold border transition-all ${
                      fanSpeed === 'natural' ? 'bg-emerald-600 text-white' : 'bg-[#1e293b] border-[#334155] text-[#94a3b8]'
                    }`}
                  >
                    Natural
                  </button>
                  <button
                    onClick={() => setFanSpeed('low')}
                    className={`px-1 py-1 rounded text-[10px] font-bold border transition-all ${
                      fanSpeed === 'low' ? 'bg-emerald-600 text-white' : 'bg-[#1e293b] border-[#334155] text-[#94a3b8]'
                    }`}
                  >
                    Low CFM
                  </button>
                  <button
                    onClick={() => setFanSpeed('forced')}
                    className={`px-1 py-1 rounded text-[10px] font-bold border transition-all ${
                      fanSpeed === 'forced' ? 'bg-emerald-600 text-white' : 'bg-[#1e293b] border-[#334155] text-[#94a3b8]'
                    }`}
                  >
                    Forced
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INSIGHT & DESIGN RULES (4 COLS) */}
        <div className="md:col-span-4 bg-[#1e293b]/60 border border-[#334155] rounded-xl p-3.5 flex flex-col justify-between text-xs font-mono space-y-2.5">
          <div className="flex items-center gap-2 text-white font-bold pb-2 border-b border-[#334155]">
            <Info className="w-4 h-4 text-rose-400" />
            <span>THERMAL DIFFUSION LAWS</span>
          </div>

          <div className="text-[11px] text-[#c9d1d9] space-y-1.5 leading-relaxed">
            <p>
              • <b>Thermal Inertia Discrepancy:</b> Silicon die has tiny thermal capacitance (C₁ ≈ 0.08 J/K, &tau;₁ ≈ 3.6 ms). Junction temperature reacts almost immediately to switching power pulses!
            </p>
            <p>
              • Heatsink has immense thermal mass (C₄ ≈ 450 J/K, &tau;₄ ≈ 100 s). It cannot absorb quick pulse spikes—protecting against short-term surge requires die/baseplate heat spreading, not just a bigger heatsink!
            </p>
            <p>
              • <b>Foster vs Cauer:</b> Foster values are mathematical curve fits with uncoupled RC branches; Cauer values correspond strictly to the physical thermal boundaries.
            </p>
          </div>

          <div className="pt-2 border-t border-[#334155] flex items-center justify-between text-[11px]">
            <span className="text-[#94a3b8]">Junction Margin (150°C)</span>
            <span className={`font-bold ${tjMaxLimit - temps.tj < 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {(tjMaxLimit - temps.tj).toFixed(1)} °C Remaining
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
