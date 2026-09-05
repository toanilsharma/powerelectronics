import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, ShieldCheck, Zap, Sliders, Info, Flame } from 'lucide-react';

interface SpuriousMillerShootThroughLabProps {
  onClose?: () => void;
}

export const SpuriousMillerShootThroughLab: React.FC<SpuriousMillerShootThroughLabProps> = ({ onClose }) => {
  // Circuit Parameters
  const [vDcBus, setVDcBus] = useState<number>(400); // Volts DC (200V to 600V)
  const [dvDtRate, setDvDtRate] = useState<number>(25); // V/ns (5 to 60 V/ns)
  const [gateResistor, setGateResistor] = useState<number>(22); // Ohms (2 to 50 Ohms)
  const [cGdMiller, setCGdMiller] = useState<number>(80); // pF Miller capacitance (20 to 200 pF)
  const [vTh, setVTh] = useState<number>(3.5); // Gate Threshold Voltage (1.5V to 5.0V)
  const [strayLg, setStrayLg] = useState<number>(10); // nH Gate Stray Inductance (0 to 30 nH)
  const [strayLs, setStrayLs] = useState<number>(3); // nH Common Source Inductance (0 to 10 nH)

  // 3 Industrial Mitigation Strategies
  const [useSplitRgOff, setUseSplitRgOff] = useState<boolean>(false); // Split Rg with anti-parallel diode
  const [useNegativeBias, setUseNegativeBias] = useState<boolean>(false); // -5V Negative Turn-off Bias
  const [useActiveMillerClamp, setUseActiveMillerClamp] = useState<boolean>(false); // Active Miller Clamp (AMC)

  // Execution & Timing State
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [timeNs, setTimeNs] = useState<number>(0);
  const [pulseTriggered, setPulseTriggered] = useState<boolean>(true);

  const canvasScopeRef = useRef<HTMLCanvasElement | null>(null);

  // Calculated Physical Parameters
  // Displacement current through Miller capacitance: I_disp = Cgd * (dv/dt)
  const dvDt_V_per_s = dvDtRate * 1e9; // V/s
  const cGd_F = cGdMiller * 1e-12; // Farads
  const iDisp_A = cGd_F * dvDt_V_per_s; // Amps (e.g. 80pF * 25V/ns = 2.0 A)

  // Effective turn-off resistance seen by displacement current
  const rGateEffective = useActiveMillerClamp ? 0.8 : (useSplitRgOff ? Math.max(2, gateResistor / 5) : gateResistor);

  // Gate Voltage Bump calculation
  // V_bump = I_disp * R_eff
  const baseGateVoltage = useNegativeBias ? -5.0 : 0.0;
  const vBumpPeak = iDisp_A * rGateEffective;
  const maxVgs2 = baseGateVoltage + vBumpPeak;

  // Has Shoot-Through Occurred?
  const isShootThrough = maxVgs2 >= vTh;
  const shootThroughCurrentPeak = isShootThrough ? Math.min(250, (maxVgs2 - vTh) * 45) : 0;

  // Damping factor for gate RLC ringing: zeta = (R / 2) * sqrt(Ciss / Lg)
  const cIss_F = 1500e-12; // 1500pF
  const lG_H = Math.max(1, strayLg) * 1e-9;
  const zeta = (rGateEffective / 2) * Math.sqrt(cIss_F / lG_H);
  const isRinging = zeta < 1.0;

  // Animation Loop for Waveform Visualization
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime);
      lastTime = now;

      if (isRunning) {
        setTimeNs((t) => {
          const next = t + dt * 0.4;
          return next > 80 ? 0 : next;
        });
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isRunning]);

  // Render Nanosecond Multi-Trace Oscilloscope
  useEffect(() => {
    const canvas = canvasScopeRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // Grid lines (Nanosecond time base & Volts)
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const tStart = 15; // ns when High-Side turns on
    const tRise = vDcBus / dvDtRate; // ns to complete dv/dt ramp

    // 1. Trace 1 (Cyan): Switching Node Voltage Vsw (0 to Vdc)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px < w; px++) {
      const t = (px / w) * 80;
      let vsw = 0;
      if (t > tStart) {
        vsw = Math.min(vDcBus, (t - tStart) * dvDtRate);
      }
      const py = h - 25 - (vsw / (vDcBus * 1.2)) * (h * 0.45);
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 2. Trace 2 (Yellow): Low-Side Gate Voltage Vgs2(t)
    ctx.strokeStyle = isShootThrough ? '#f85149' : '#e3b341';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const vMinDisplay = useNegativeBias ? -8 : -2;
    const vMaxDisplay = 12;

    for (let px = 0; px < w; px++) {
      const t = (px / w) * 80;
      let vgs = baseGateVoltage;

      if (t > tStart && t < tStart + tRise + 12) {
        const progress = (t - tStart);
        // Pulse bump envelope
        const envelope = Math.sin(Math.min(Math.PI, (progress / (tRise + 6)) * Math.PI));
        let bump = vBumpPeak * envelope;

        // Parasitic gate inductance ringing if underdamped
        if (isRinging && progress > 0) {
          const ringFreq = 1.0 / (2 * Math.PI * Math.sqrt(lG_H * cIss_F)) * 1e-9; // GHz
          const ring = Math.exp(-progress * 0.2 * zeta) * Math.sin(progress * ringFreq * 6);
          bump += bump * 0.45 * ring;
        }

        vgs = baseGateVoltage + bump;
      }

      const py = h - 45 - ((vgs - vMinDisplay) / (vMaxDisplay - vMinDisplay)) * (h * 0.45);
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Threshold Line Vth (Red Dashed)
    const vthPy = h - 45 - ((vTh - vMinDisplay) / (vMaxDisplay - vMinDisplay)) * (h * 0.45);
    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, vthPy);
    ctx.lineTo(w, vthPy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ef4444';
    ctx.font = '8px monospace';
    ctx.fillText(`Vth Threshold = ${vTh.toFixed(1)}V`, w - 125, vthPy - 4);

    // 3. Trace 3 (Red): Shoot-Through Current Spike (if occurs)
    if (isShootThrough) {
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let px = 0; px < w; px++) {
        const t = (px / w) * 80;
        let ishoot = 0;
        if (t > tStart + 2 && t < tStart + tRise + 8) {
          const p = (t - (tStart + 2)) / (tRise + 6);
          ishoot = shootThroughCurrentPeak * Math.sin(p * Math.PI);
        }
        const py = h - 15 - (ishoot / 280) * (h * 0.35);
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Time cursor
    const curX = (timeNs / 80) * w;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(curX, 0);
    ctx.lineTo(curX, h);
    ctx.stroke();

    // Scope Legend & Channel Values
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`CH1: Vsw (${vDcBus}V Bus, dv/dt=${dvDtRate}V/ns)`, 10, 16);

    ctx.fillStyle = isShootThrough ? '#f85149' : '#e3b341';
    ctx.fillText(`CH2: Vgs2 Peak = ${maxVgs2.toFixed(2)}V (Base: ${baseGateVoltage}V)`, 10, 30);

    if (isShootThrough) {
      ctx.fillStyle = '#f43f5e';
      ctx.fillText(`CH3: SHOOT-THROUGH CURRENT = ${shootThroughCurrentPeak.toFixed(0)}A!`, 10, 44);
    }
  }, [vDcBus, dvDtRate, gateResistor, cGdMiller, vTh, strayLg, strayLs, useSplitRgOff, useNegativeBias, useActiveMillerClamp, isShootThrough, maxVgs2, timeNs]);

  return (
    <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex flex-col gap-4 text-white shadow-2xl font-mono">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/40 rounded-xl text-red-400">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-400 to-yellow-400">
              SPURIOUS MILLER TURN-ON &amp; dv/dt CROSS-CONDUCTION (SHOOT-THROUGH)
            </h3>
            <p className="text-[11px] text-gray-400">
              High-Speed Half-Bridge Cross-Conduction: Displacement Current $I_{disp} = C_{GD} \cdot \frac{dv}{dt}$ triggering catastrophic DC Bus short-circuit.
            </p>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="px-3 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-lg text-xs font-bold transition-all">
            ✕ Close
          </button>
        )}
      </div>

      {/* DANGER / PASS ALERTS */}
      {isShootThrough ? (
        <div className="p-3 rounded-xl bg-red-950/80 border border-red-500 text-red-200 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-400" />
            <span className="font-bold text-xs sm:text-sm">
              🚨 CATASTROPHIC CROSS-CONDUCTION! Vgs2 ({maxVgs2.toFixed(2)}V) &ge; Vth ({vTh.toFixed(1)}V) — Shoot-through spike = {shootThroughCurrentPeak.toFixed(0)}A!
            </span>
          </div>
          <span className="text-[11px] bg-red-800 text-white px-2 py-0.5 rounded font-bold">DC BUS DEAD SHORT</span>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2 font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            SAFE OPERATING MARGIN: Gate Voltage Bump ({maxVgs2.toFixed(2)}V) remains comfortably below Vth ({vTh.toFixed(1)}V). Margin = {(vTh - maxVgs2).toFixed(2)}V.
          </span>
          <span className="text-[11px] bg-emerald-900/80 text-emerald-300 px-2 py-0.5 rounded font-bold">ZERO SHOOT-THROUGH</span>
        </div>
      )}

      {/* CONTROLS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 bg-[#161b22] border border-[#30363d] p-3 rounded-xl text-xs">
        {/* dv/dt Rate Slider */}
        <div>
          <div className="flex justify-between text-gray-300 font-bold mb-1">
            <span>SWITCHING dv/dt RATE:</span>
            <span className="text-amber-400 font-extrabold">{dvDtRate} V/ns</span>
          </div>
          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={dvDtRate}
            onChange={(e) => setDvDtRate(parseInt(e.target.value))}
            className="w-full accent-amber-500 h-2 cursor-pointer"
          />
          <div className="text-[10px] text-gray-500 mt-1">Typical: Si=10, SiC=30, GaN=50+ V/ns</div>
        </div>

        {/* Gate Resistor Slider */}
        <div>
          <div className="flex justify-between text-gray-300 font-bold mb-1">
            <span>GATE RESISTOR (Rg):</span>
            <span className="text-sky-400 font-extrabold">{gateResistor} Ω</span>
          </div>
          <input
            type="range"
            min="2"
            max="50"
            step="2"
            value={gateResistor}
            onChange={(e) => setGateResistor(parseInt(e.target.value))}
            className="w-full accent-sky-500 h-2 cursor-pointer"
          />
          <div className="text-[10px] text-gray-500 mt-1">Larger Rg causes higher V_bump spike</div>
        </div>

        {/* Miller Capacitance Slider */}
        <div>
          <div className="flex justify-between text-gray-300 font-bold mb-1">
            <span>MILLER CAP (Cgd):</span>
            <span className="text-purple-400 font-extrabold">{cGdMiller} pF</span>
          </div>
          <input
            type="range"
            min="20"
            max="200"
            step="10"
            value={cGdMiller}
            onChange={(e) => setCGdMiller(parseInt(e.target.value))}
            className="w-full accent-purple-500 h-2 cursor-pointer"
          />
          <div className="text-[10px] text-gray-500 mt-1">Idisp = Cgd × dv/dt = {iDisp_A.toFixed(2)} A</div>
        </div>

        {/* Stray Inductances */}
        <div>
          <div className="flex justify-between text-gray-300 font-bold mb-1">
            <span>STRAY LG &amp; LS INDUCTANCE:</span>
            <span className="text-emerald-400 font-extrabold">{strayLg} nH</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="2"
            value={strayLg}
            onChange={(e) => setStrayLg(parseInt(e.target.value))}
            className="w-full accent-emerald-500 h-2 cursor-pointer"
          />
          <div className="text-[10px] text-gray-500 mt-1">Damping ζ = {zeta.toFixed(2)} ({isRinging ? 'Underdamped Ringing' : 'Damped'})</div>
        </div>
      </div>

      {/* MITIGATION STRATEGY SWITCHES (THE CORE ACADEMIC LESSON) */}
      <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-xl flex flex-col gap-2">
        <div className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          <span>INDUSTRIAL SHOOT-THROUGH MITIGATION STRATEGIES (Toggle to test):</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {/* Technique 1 */}
          <button
            onClick={() => setUseSplitRgOff(!useSplitRgOff)}
            className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
              useSplitRgOff ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:text-white'
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <span>1. Split Rg / Diode Path</span>
              <span>{useSplitRgOff ? '✔ ACTIVE' : 'OFF'}</span>
            </div>
            <p className="text-[10px] text-gray-400">
              Discharges gate through low-impedance turn-off diode (Rg_off = {Math.max(2, gateResistor / 5)}Ω).
            </p>
          </button>

          {/* Technique 2 */}
          <button
            onClick={() => setUseNegativeBias(!useNegativeBias)}
            className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
              useNegativeBias ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:text-white'
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <span>2. Negative Gate Bias (-5V)</span>
              <span>{useNegativeBias ? '✔ ACTIVE' : 'OFF'}</span>
            </div>
            <p className="text-[10px] text-gray-400">
              Pulls OFF gate to -5V instead of 0V, granting +5V extra headroom before reaching Vth.
            </p>
          </button>

          {/* Technique 3: Active Miller Clamp */}
          <button
            onClick={() => setUseActiveMillerClamp(!useActiveMillerClamp)}
            className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
              useActiveMillerClamp ? 'bg-purple-950/60 border-purple-500 text-purple-300 shadow-md' : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:text-white'
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <span>3. Active Miller Clamp (AMC)</span>
              <span>{useActiveMillerClamp ? '✔ CLAMPED (0.8Ω)' : 'OFF'}</span>
            </div>
            <p className="text-[10px] text-gray-400">
              Dedicated internal clamping FET shorts Gate to Source directly when Vgs &lt; 2V.
            </p>
          </button>
        </div>
      </div>

      {/* DUAL DISPLAY: HALF-BRIDGE SCHEMATIC (LEFT) & NANOSECOND SCOPE (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* HALF-BRIDGE SCHEMATIC WITH LIVE SHOOT-THROUGH FLASH */}
        <div className="lg:col-span-5 bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col items-center justify-center relative min-h-[300px]">
          <svg viewBox="0 0 360 260" className="w-full h-auto max-h-[290px]">
            {/* DC Bus Rails */}
            <line x1="40" y1="30" x2="320" y2="30" stroke="#58a6ff" strokeWidth="2.5" />
            <text x="50" y="22" fill="#58a6ff" fontSize="9" fontWeight="bold">+Vdc Bus ({vDcBus}V)</text>
            <line x1="40" y1="230" x2="320" y2="230" stroke="#3fb950" strokeWidth="2.5" />
            <text x="50" y="245" fill="#3fb950" fontSize="9" fontWeight="bold">Power Ground (GND)</text>

            {/* High-Side Switch Q1 */}
            <g transform="translate(180, 75)">
              <rect x="-25" y="-22" width="50" height="44" fill="#0d1117" stroke="#38bdf8" strokeWidth="2" rx="4" />
              <text x="0" y="-5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">Q1 (HIGH)</text>
              <text x="0" y="10" textAnchor="middle" fill="#38bdf8" fontSize="8">TURNING ON</text>
            </g>

            {/* Switching Node Vsw */}
            <circle cx="180" cy="130" r="4" fill="#38bdf8" />
            <text x="195" y="133" fill="#38bdf8" fontSize="9" fontWeight="bold">Vsw Node (dv/dt={dvDtRate}V/ns)</text>

            {/* Low-Side Switch Q2 (Victim of Miller bump) */}
            <g transform="translate(180, 185)">
              {/* Shoot through flame aura */}
              {isShootThrough && (
                <circle cx="0" cy="0" r="35" fill="#ef4444" opacity="0.6" className="animate-ping" />
              )}
              <rect x="-25" y="-22" width="50" height="44" fill="#0d1117" stroke={isShootThrough ? '#ef4444' : '#e3b341'} strokeWidth="2" rx="4" />
              <text x="0" y="-5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">Q2 (LOW)</text>
              <text x="0" y="10" textAnchor="middle" fill={isShootThrough ? '#ef4444' : '#e3b341'} fontSize="8" fontWeight="bold">
                {isShootThrough ? '💥 SHOOT-THROUGH!' : 'OFF (VICTIM)'}
              </text>
            </g>

            {/* Miller Displacement Current Path Cgd2 */}
            <path d="M 180 130 L 110 130 L 110 170 L 155 170" stroke="#purple" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />
            <text x="105" y="150" textAnchor="end" fill="#d2a8ff" fontSize="8">Idisp={iDisp_A.toFixed(2)}A</text>

            {/* Active Miller Clamp Indication */}
            {useActiveMillerClamp && (
              <g transform="translate(130, 205)">
                <rect x="-18" y="-8" width="36" height="16" fill="#8957e5" rx="3" />
                <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">AMC ON</text>
              </g>
            )}

            {/* Vertical Conductor Lines */}
            <line x1="180" y1="30" x2="180" y2="53" stroke={isShootThrough ? '#ef4444' : '#58a6ff'} strokeWidth={isShootThrough ? 4 : 2} />
            <line x1="180" y1="97" x2="180" y2="163" stroke={isShootThrough ? '#ef4444' : '#38bdf8'} strokeWidth={isShootThrough ? 4 : 2} />
            <line x1="180" y1="207" x2="180" y2="230" stroke={isShootThrough ? '#ef4444' : '#3fb950'} strokeWidth={isShootThrough ? 4 : 2} />
          </svg>
        </div>

        {/* NANOSECOND MULTI-TRACE SCOPE */}
        <div className="lg:col-span-7 flex flex-col gap-2">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 flex flex-col gap-1 shadow">
            <div className="text-xs font-bold text-gray-300 flex justify-between">
              <span>NANOSECOND SCOPE: Vsw(t), Vgs2(t), and Shoot-Through Spike</span>
              <span className="text-gray-500 font-mono">Timebase: 10 ns/div</span>
            </div>
            <canvas ref={canvasScopeRef} width={500} height={230} className="w-full h-[230px] rounded bg-[#0d1117] border border-[#21262d]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpuriousMillerShootThroughLab;
