import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Flame, ShieldAlert, CheckCircle2, Sliders, Info, Zap } from 'lucide-react';

interface TransistorThermalRunawayLabProps {
  onClose?: () => void;
}

export const TransistorThermalRunawayLab: React.FC<TransistorThermalRunawayLabProps> = ({ onClose }) => {
  // Device & Topology Selection
  const [deviceType, setDeviceType] = useState<'mosfet' | 'bjt'>('mosfet');
  const [totalCurrent, setTotalCurrent] = useState<number>(40); // Total Load Current (10A to 80A)
  const [ambientTemp, setAmbientTemp] = useState<number>(30); // Ambient Temp (°C)
  const [heatsinkRth, setHeatsinkRth] = useState<number>(1.5); // Rth(j-a) °C/W (0.5 to 3.5)

  // Simulation Running State
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simTime, setSimTime] = useState<number>(0);

  // Dynamic Electro-Thermal State Variables
  const [tempA, setTempA] = useState<number>(35); // Junction Temp QA (°C)
  const [tempB, setTempB] = useState<number>(35); // Junction Temp QB (°C)
  const [currentA, setCurrentA] = useState<number>(20); // Amps through QA
  const [currentB, setCurrentB] = useState<number>(20); // Amps through QB
  const [isBlownA, setIsBlownA] = useState<boolean>(false);

  // Canvas Refs for Real-Time Electro-Thermal Oscilloscopes
  const canvasCurrentRef = useRef<HTMLCanvasElement | null>(null);
  const canvasTempRef = useRef<HTMLCanvasElement | null>(null);

  // History Buffers for Live Scrolling Waveforms
  const historyRef = useRef<{ time: number; iA: number; iB: number; tA: number; tB: number }[]>([]);

  // Reset Simulation
  const handleReset = () => {
    setTempA(ambientTemp + 5);
    setTempB(ambientTemp + 5);
    setCurrentA(totalCurrent / 2);
    setCurrentB(totalCurrent / 2);
    setIsBlownA(false);
    setSimTime(0);
    historyRef.current = [];
  };

  // Inject Heat Disturbance to Device A (+35°C)
  const handleInjectHeatA = () => {
    setTempA((prev) => Math.min(240, prev + 35));
  };

  // Numerical Coupled Electro-Thermal ODE Solver Step
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSimTime((t) => t + 0.05);

      if (isBlownA) return;

      if (deviceType === 'mosfet') {
        // --- MOSFET POSITIVE TEMPCO (STABLE AUTOMATIC CURRENT SHARING) ---
        // RDS(on) = R0 * (1 + alpha * (T - 25)), alpha = +0.0075 / °C
        const alphaMos = 0.0075;
        const r0 = 0.030; // 30 mOhm baseline at 25°C
        const rA = r0 * (1 + alphaMos * Math.max(0, tempA - 25));
        const rB = r0 * (1 + alphaMos * Math.max(0, tempB - 25));

        // Current divides inversely proportional to on-state resistances
        const iA = totalCurrent * (rB / (rA + rB));
        const iB = totalCurrent * (rA / (rA + rB));

        // Power Dissipation (Conduction loss P = I^2 * R)
        const pA = iA * iA * rA;
        const pB = iB * iB * rB;

        // Thermal differential equation: Cth * dT/dt = P - (T - Tamb) / Rth
        const cTh = 4.0; // Thermal Capacitance (Joules / °C)
        const dt = 0.08;
        const dTA = ((pA - (tempA - ambientTemp) / heatsinkRth) / cTh) * dt;
        const dTB = ((pB - (tempB - ambientTemp) / heatsinkRth) / cTh) * dt;

        setTempA((prev) => Math.max(ambientTemp, prev + dTA));
        setTempB((prev) => Math.max(ambientTemp, prev + dTB));
        setCurrentA(iA);
        setCurrentB(iB);

        // Store waveform history
        historyRef.current.push({ time: simTime, iA, iB, tA: tempA, tB: tempB });
        if (historyRef.current.length > 250) historyRef.current.shift();

      } else {
        // --- BJT NEGATIVE TEMPCO (UNSTABLE THERMAL RUNAWAY) ---
        // Vbe drops by -2.1 mV / °C. Base is driven in parallel.
        // Collector current increases exponentially: Ic ~ exp(Delta_Vbe / Vt)
        const deltaVbeA = -0.0021 * (tempA - 25);
        const deltaVbeB = -0.0021 * (tempB - 25);
        const vt = 0.026; // 26mV thermal voltage

        // Weighting factors
        const weightA = Math.exp(-deltaVbeA / (vt * 4.5));
        const weightB = Math.exp(-deltaVbeB / (vt * 4.5));
        const iA = totalCurrent * (weightA / (weightA + weightB));
        const iB = totalCurrent * (weightB / (weightA + weightB));

        // Conduction loss P = Ic * Vce(sat) (approx 0.6V + 0.025*I)
        const vceA = 0.5 + 0.025 * iA;
        const vceB = 0.5 + 0.025 * iB;
        const pA = iA * vceA;
        const pB = iB * vceB;

        const cTh = 3.5;
        const dt = 0.08;
        const dTA = ((pA - (tempA - ambientTemp) / heatsinkRth) / cTh) * dt;
        const dTB = ((pB - (tempB - ambientTemp) / heatsinkRth) / cTh) * dt;

        const nextTA = tempA + dTA;
        const nextTB = tempB + dTB;

        if (nextTA > 185) {
          setIsBlownA(true);
        } else {
          setTempA(nextTA);
          setTempB(nextTB);
          setCurrentA(iA);
          setCurrentB(iB);
          historyRef.current.push({ time: simTime, iA, iB, tA: nextTA, tB: nextTB });
          if (historyRef.current.length > 250) historyRef.current.shift();
        }
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isRunning, simTime, deviceType, tempA, tempB, totalCurrent, ambientTemp, heatsinkRth, isBlownA]);

  // Render Dual Oscilloscopes
  useEffect(() => {
    // 1. Current Sharing Canvas
    const cI = canvasCurrentRef.current;
    if (cI) {
      const ctx = cI.getContext('2d');
      if (ctx) {
        const w = cI.width;
        const h = cI.height;
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = '#21262d';
        ctx.lineWidth = 1;
        for (let y = 20; y < h; y += 30) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Draw traces
        const data = historyRef.current;
        if (data.length > 1) {
          const maxI = Math.max(50, totalCurrent * 1.1);

          // Trace A: Cyan (Device A)
          ctx.strokeStyle = isBlownA ? '#f85149' : '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          data.forEach((pt, idx) => {
            const x = (idx / 250) * w;
            const y = h - 15 - (pt.iA / maxI) * (h - 30);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

          // Trace B: Yellow (Device B)
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          data.forEach((pt, idx) => {
            const x = (idx / 250) * w;
            const y = h - 15 - (pt.iB / maxI) * (h - 30);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }

        // Labels
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`CURRENT SHARING: IA=${currentA.toFixed(1)}A (Cyan) | IB=${currentB.toFixed(1)}A (Yellow)`, 10, 14);
      }
    }

    // 2. Junction Temperature Canvas
    const cT = canvasTempRef.current;
    if (cT) {
      const ctx = cT.getContext('2d');
      if (ctx) {
        const w = cT.width;
        const h = cT.height;
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, w, h);

        // Danger Threshold Line (150°C)
        const dangerY = h - 15 - (150 / 220) * (h - 30);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, dangerY);
        ctx.lineTo(w, dangerY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ef4444';
        ctx.font = '7.5px monospace';
        ctx.fillText('150°C Tj(max) RATED LIMIT', w - 130, dangerY - 3);

        // Draw traces
        const data = historyRef.current;
        if (data.length > 1) {
          const maxT = 220;

          // Temp A: Red
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          data.forEach((pt, idx) => {
            const x = (idx / 250) * w;
            const y = h - 15 - (pt.tA / maxT) * (h - 30);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

          // Temp B: Orange
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.beginPath();
          data.forEach((pt, idx) => {
            const x = (idx / 250) * w;
            const y = h - 15 - (pt.tB / maxT) * (h - 30);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`JUNCTION TEMP: Tj_A=${tempA.toFixed(1)}°C (Red) | Tj_B=${tempB.toFixed(1)}°C (Orange)`, 10, 14);
      }
    }
  }, [currentA, currentB, tempA, tempB, totalCurrent, isBlownA]);

  return (
    <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex flex-col gap-4 text-white shadow-2xl font-mono">
      {/* HEADER BANNER */}
      <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/40 rounded-xl text-amber-400">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-400">
              THERMAL RUNAWAY &amp; TRANSISTOR PARALLELING BENCHMARK
            </h3>
            <p className="text-[11px] text-gray-400">
              Comparing Positive Tempco (α_T &gt; 0 Self-Balancing MOSFETs) vs Negative Tempco (α_T &lt; 0 Runaway BJTs)
            </p>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-lg text-xs font-bold transition-all">
            ✕ Close
          </button>
        )}
      </div>

      {/* TOPOLOGY & CONTROLS TOOLBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 bg-[#161b22] border border-[#30363d] p-3 rounded-xl text-xs">
        {/* Technology Selector */}
        <div>
          <label className="text-gray-400 block mb-1 font-bold">1. PARALLEL SWITCH TECH:</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => { setDeviceType('mosfet'); handleReset(); }}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                deviceType === 'mosfet'
                  ? 'bg-emerald-600 text-white shadow-md border border-emerald-400'
                  : 'bg-[#0d1117] text-gray-300 border border-[#30363d] hover:text-white'
              }`}
            >
              ✔ 2× MOSFETs (Self-Balancing)
            </button>
            <button
              onClick={() => { setDeviceType('bjt'); handleReset(); }}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                deviceType === 'bjt'
                  ? 'bg-red-600 text-white shadow-md border border-red-400'
                  : 'bg-[#0d1117] text-gray-300 border border-[#30363d] hover:text-white'
              }`}
            >
              ⚠️ 2× BJTs (Thermal Runaway)
            </button>
          </div>
        </div>

        {/* Total Load Current Slider */}
        <div>
          <div className="flex justify-between text-gray-300 font-bold mb-1">
            <span>TOTAL LOAD CURRENT:</span>
            <span className="text-amber-400">{totalCurrent} A</span>
          </div>
          <input
            type="range"
            min="10"
            max="80"
            step="5"
            value={totalCurrent}
            onChange={(e) => setTotalCurrent(parseInt(e.target.value))}
            className="w-full accent-amber-500 h-2 cursor-pointer"
          />
          <div className="text-[10px] text-gray-500 mt-1">Shared between Device A &amp; B</div>
        </div>

        {/* Heat Sink Rth Slider */}
        <div>
          <div className="flex justify-between text-gray-300 font-bold mb-1">
            <span>HEATSINK Rth(j-a):</span>
            <span className="text-sky-400">{heatsinkRth.toFixed(1)} °C/W</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3.5"
            step="0.2"
            value={heatsinkRth}
            onChange={(e) => setHeatsinkRth(parseFloat(e.target.value))}
            className="w-full accent-sky-500 h-2 cursor-pointer"
          />
          <div className="text-[10px] text-gray-500 mt-1">Higher Rth = poorer heat dissipation</div>
        </div>

        {/* Experiment Actions */}
        <div className="flex flex-col justify-end gap-1.5">
          <button
            onClick={handleInjectHeatA}
            disabled={isBlownA}
            className="py-2 px-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold rounded-lg transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Flame className="w-4 h-4" />
            <span>🔥 Inject +35°C Heat Pulse to A</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex-1 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-lg font-bold text-[11px] flex items-center justify-center gap-1"
            >
              {isRunning ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isRunning ? 'Pause' : 'Resume'}</span>
            </button>
            <button
              onClick={handleReset}
              className="flex-1 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-lg font-bold text-[11px] flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* STATUS BANNER */}
      {isBlownA ? (
        <div className="p-3 rounded-xl bg-red-950/80 border border-red-500 text-red-200 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span className="font-bold text-xs sm:text-sm">
              🚨 CATASTROPHIC THERMAL RUNAWAY MELTDOWN! Transistor A has suffered second breakdown (Tj &gt; 185°C, Ic = {currentA.toFixed(1)}A)!
            </span>
          </div>
          <button onClick={handleReset} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-extrabold">
            Reset Bench
          </button>
        </div>
      ) : deviceType === 'mosfet' ? (
        <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            STABLE EQUILIBRIUM: Positive Tempco (α_T &gt; 0) forces hotter transistor to shed current to cooler neighbor!
          </span>
          <span className="text-[11px] text-emerald-400 font-mono">Current Imbalance: {Math.abs(currentA - currentB).toFixed(1)} A</span>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            WARNING: Negative Tempco (ΔVbe = -2.1mV/°C) causes hot transistor to hog current exponentially!
          </span>
          <span className="text-[11px] text-amber-400 font-mono">Current Hogging: {((currentA / totalCurrent) * 100).toFixed(0)}% in QA</span>
        </div>
      )}

      {/* DUAL DISPLAY: ANIMATED CIRCUIT SLD (LEFT) & LIVE DUAL SCOPES (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* PARALLEL CIRCUIT SCHEMATIC WITH LIVE HEAT GLOW */}
        <div className="lg:col-span-6 bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col items-center justify-center relative min-h-[310px]">
          <svg viewBox="0 0 440 260" className="w-full h-auto max-h-[300px]">
            {/* Top Common DC Rail */}
            <path d="M 40 40 L 400 40" stroke="#58a6ff" strokeWidth="3" fill="none" />
            <circle cx="40" cy="40" r="4" fill="#58a6ff" />
            <text x="40" y="28" fill="#58a6ff" fontSize="10" fontWeight="bold">+400V DC Bus</text>

            {/* Load Resistor RL in Series with Bus */}
            <g transform="translate(190, 30)">
              <rect x="-25" y="-12" width="50" height="24" fill="#161b22" stroke="#e3b341" strokeWidth="2" rx="3" />
              <text x="0" y="4" textAnchor="middle" fill="#e3b341" fontSize="9" fontWeight="bold">LOAD (I={totalCurrent}A)</text>
            </g>

            {/* Branch 1: Device QA (Left) */}
            <path d="M 120 40 L 120 90" stroke="#38bdf8" strokeWidth={Math.max(1.5, currentA * 0.12)} fill="none" />
            <g transform="translate(120, 130)">
              {/* Heat Glow Aura */}
              <circle
                cx="0"
                cy="0"
                r={isBlownA ? 45 : Math.min(42, 18 + (tempA - 30) * 0.25)}
                fill={isBlownA ? '#dc2626' : tempA > 110 ? '#ef4444' : tempA > 70 ? '#f59e0b' : '#10b981'}
                opacity={isBlownA ? 0.7 : 0.25}
                className={isBlownA ? 'animate-ping' : ''}
              />

              {/* Transistor Package Frame */}
              <rect x="-35" y="-30" width="70" height="60" fill="#0d1117" stroke={isBlownA ? '#ef4444' : '#38bdf8'} strokeWidth="2" rx="6" />
              <text x="0" y="-14" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">Q_A ({deviceType.toUpperCase()})</text>
              <text x="0" y="0" textAnchor="middle" fill={isBlownA ? '#ef4444' : '#38bdf8'} fontSize="11" fontWeight="bold">
                {isBlownA ? '💥 BLOWN' : `${currentA.toFixed(1)} A`}
              </text>
              <text x="0" y="16" textAnchor="middle" fill={tempA > 130 ? '#ef4444' : '#fbbf24'} fontSize="10" fontWeight="bold">
                Tj = {tempA.toFixed(1)}°C
              </text>
            </g>
            <path d="M 120 160 L 120 220" stroke="#38bdf8" strokeWidth={Math.max(1.5, currentA * 0.12)} fill="none" />

            {/* Branch 2: Device QB (Right) */}
            <path d="M 320 40 L 320 90" stroke="#fbbf24" strokeWidth={Math.max(1.5, currentB * 0.12)} fill="none" />
            <g transform="translate(320, 130)">
              {/* Heat Glow Aura */}
              <circle
                cx="0"
                cy="0"
                r={Math.min(42, 18 + (tempB - 30) * 0.25)}
                fill={tempB > 110 ? '#ef4444' : tempB > 70 ? '#f59e0b' : '#10b981'}
                opacity="0.25"
              />

              <rect x="-35" y="-30" width="70" height="60" fill="#0d1117" stroke="#fbbf24" strokeWidth="2" rx="6" />
              <text x="0" y="-14" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">Q_B ({deviceType.toUpperCase()})</text>
              <text x="0" y="0" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">{currentB.toFixed(1)} A</text>
              <text x="0" y="16" textAnchor="middle" fill={tempB > 130 ? '#ef4444' : '#fbbf24'} fontSize="10" fontWeight="bold">
                Tj = {tempB.toFixed(1)}°C
              </text>
            </g>
            <path d="M 320 160 L 320 220" stroke="#fbbf24" strokeWidth={Math.max(1.5, currentB * 0.12)} fill="none" />

            {/* Bottom Return Ground Rail */}
            <path d="M 40 220 L 400 220" stroke="#3fb950" strokeWidth="3" fill="none" />
            <circle cx="220" cy="220" r="4" fill="#3fb950" />
            <text x="220" y="240" textAnchor="middle" fill="#3fb950" fontSize="9" fontWeight="bold">COMMON RETURN / GROUND (GND)</text>
          </svg>
        </div>

        {/* DUAL REAL-TIME OSCILLOSCOPES */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          {/* Scope 1: Current Balance IA vs IB */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-2.5 flex flex-col gap-1 shadow">
            <div className="text-[11px] font-bold text-gray-300 flex justify-between">
              <span>CH1: Current Partitioning IA(t) &amp; IB(t)</span>
              <span className="text-gray-500 font-mono">Time Window: 10s</span>
            </div>
            <canvas ref={canvasCurrentRef} width={420} height={115} className="w-full h-[115px] rounded bg-[#0d1117] border border-[#21262d]" />
          </div>

          {/* Scope 2: Thermal Trajectory Tj_A vs Tj_B */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-2.5 flex flex-col gap-1 shadow">
            <div className="text-[11px] font-bold text-gray-300 flex justify-between">
              <span>CH2: Junction Temperatures Tj_A(t) &amp; Tj_B(t)</span>
              <span className="text-red-400 font-mono">Tj(max) = 150°C</span>
            </div>
            <canvas ref={canvasTempRef} width={420} height={115} className="w-full h-[115px] rounded bg-[#0d1117] border border-[#21262d]" />
          </div>
        </div>
      </div>

      {/* PHYSICS CALLOUT NOTE */}
      <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-xl text-xs space-y-1 text-gray-300">
        <div className="font-bold text-amber-400 flex items-center gap-1.5">
          <Info className="w-4 h-4" />
          <span>Academic Physics Principle: Why Paralleling BJTs Requires Ballast Emitter Resistors</span>
        </div>
        <p className="text-[11px] leading-relaxed text-gray-400">
          In MOSFETs, the mobility of electrons in the channel decreases with temperature (μ_n ∝ T^-1.5), making R_DS(on) rise with temperature (α_MOS &gt; 0). If one MOSFET heats up, its impedance automatically rises, naturally diverting load current to cooler parallel devices. In BJTs, the base-emitter forward voltage decreases by -2.1 mV/°C while β increases, producing exponential current hogging that triggers destructive thermal runaway unless external negative-feedback emitter resistors (R_E) are added.
        </p>
      </div>
    </div>
  );
};

export default TransistorThermalRunawayLab;
