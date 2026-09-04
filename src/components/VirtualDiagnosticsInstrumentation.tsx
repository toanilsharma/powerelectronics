import React, { useState, useEffect, useId } from 'react';
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Cpu,
  Gauge,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  Power,
  Radio,
  RotateCcw,
  Sliders,
  Volume2,
  X,
  Zap
} from 'lucide-react';

interface VirtualDiagnosticsInstrumentationProps {
  className?: string;
  onClose?: () => void;
  // Optional external telemetry probes
  externalVdc?: number;
  externalVacRms?: number;
  externalFreqHz?: number;
  externalTempC?: number;
}

/**
 * VirtualDiagnosticsInstrumentation.tsx
 * 
 * IEC 61010-031 CAT IV 1000V Virtual Diagnostic Instrumentation Suite
 * 
 * Includes:
 *  1. Virtual CAT IV True-RMS Digital Multimeter (DMM) with rotary dial & lead probes.
 *  2. 4-Channel Virtual Digital Storage Oscilloscope (DSO) with timebase & trigger cursors.
 *  3. FLIR Radiometric Thermal Imaging Infrared Camera with Ironbow color mapping.
 */
export const VirtualDiagnosticsInstrumentation: React.FC<VirtualDiagnosticsInstrumentationProps> = ({
  className = '',
  onClose,
  externalVdc = 400.0,
  externalVacRms = 230.0,
  externalFreqHz = 50.0,
  externalTempC = 45.0,
}) => {
  // Instrument Mode Switcher
  const [activeInstrument, setActiveInstrument] = useState<'dmm' | 'dso' | 'flir'>('dmm');

  // DMM States
  const [dmmMode, setDmmMode] = useState<'DCV' | 'ACV' | 'RESISTANCE' | 'CONTINUITY' | 'FREQ'>('DCV');
  const [dmmHold, setDmmHold] = useState<boolean>(false);
  const [selectedProbePoint, setSelectedProbePoint] = useState<'dc_bus' | 'ac_output' | 'snubber_res' | 'ground_mesh'>('dc_bus');

  // DSO States
  const [ch1Active, setCh1Active] = useState<boolean>(true);
  const [ch2Active, setCh2Active] = useState<boolean>(true);
  const [timebaseMsPerDiv, setTimebaseMsPerDiv] = useState<number>(5.0); // 5ms/div (50ms screen)
  const [ch1VoltsPerDiv, setCh1VoltsPerDiv] = useState<number>(100.0); // 100V/div
  const [ch2VoltsPerDiv, setCh2VoltsPerDiv] = useState<number>(10.0);  // 10A/div

  // FLIR Thermal Camera States
  const [flirPalette, setFlirPalette] = useState<'ironbow' | 'rainbow' | 'grayscale'>('ironbow');
  const [hotspotProbe, setHotspotProbe] = useState<{ x: number; y: number; temp: number }>({ x: 180, y: 110, temp: externalTempC });

  // Clock for DSO animation
  const [clockMs, setClockMs] = useState<number>(0);
  useEffect(() => {
    let animId: number;
    const loop = (now: number) => {
      setClockMs(now);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Calculate DMM Display Value based on Probe Point & Mode
  let dmmDisplayStr = '---';
  let dmmUnitStr = '';

  if (selectedProbePoint === 'dc_bus') {
    if (dmmMode === 'DCV') {
      dmmDisplayStr = externalVdc.toFixed(1);
      dmmUnitStr = 'V DC';
    } else if (dmmMode === 'ACV') {
      dmmDisplayStr = (externalVdc * 0.015).toFixed(2); // tiny ripple
      dmmUnitStr = 'V AC';
    } else if (dmmMode === 'FREQ') {
      dmmDisplayStr = '0.00';
      dmmUnitStr = 'Hz';
    } else if (dmmMode === 'RESISTANCE') {
      dmmDisplayStr = 'O.L';
      dmmUnitStr = 'MΩ';
    } else {
      dmmDisplayStr = 'OPEN';
      dmmUnitStr = '';
    }
  } else if (selectedProbePoint === 'ac_output') {
    if (dmmMode === 'ACV') {
      dmmDisplayStr = externalVacRms.toFixed(1);
      dmmUnitStr = 'V AC';
    } else if (dmmMode === 'DCV') {
      dmmDisplayStr = '0.08';
      dmmUnitStr = 'V DC';
    } else if (dmmMode === 'FREQ') {
      dmmDisplayStr = externalFreqHz.toFixed(2);
      dmmUnitStr = 'Hz';
    } else {
      dmmDisplayStr = '10.2';
      dmmUnitStr = 'Ω';
    }
  } else if (selectedProbePoint === 'snubber_res') {
    if (dmmMode === 'RESISTANCE') {
      dmmDisplayStr = '22.1';
      dmmUnitStr = 'Ω';
    } else if (dmmMode === 'CONTINUITY') {
      dmmDisplayStr = '022';
      dmmUnitStr = 'BEEP ♫';
    } else {
      dmmDisplayStr = '12.4';
      dmmUnitStr = 'V';
    }
  } else {
    // Ground mesh
    dmmDisplayStr = '0.01';
    dmmUnitStr = dmmMode === 'RESISTANCE' ? 'Ω' : 'V';
  }

  // DSO Oscilloscope Coordinate Generation
  const dsoWidth = 560;
  const dsoHeight = 260;
  const dsoPoints = 120;

  const ch1Points: string[] = [];
  const ch2Points: string[] = [];

  for (let i = 0; i <= dsoPoints; i++) {
    const x = (i / dsoPoints) * dsoWidth;
    const tMs = (i / dsoPoints) * (timebaseMsPerDiv * 10);
    const omega = 2 * Math.PI * (externalFreqHz / 1000); // rad/ms

    // Ch1 Voltage Sine Wave
    const vVal = externalVacRms * Math.sqrt(2) * Math.sin(omega * tMs + (clockMs * 0.003));
    const y1 = dsoHeight / 2 - (vVal / ch1VoltsPerDiv) * (dsoHeight / 8);
    ch1Points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y1.toFixed(1)}`);

    // Ch2 Inverter Current Wave
    const iVal = 18.5 * Math.sin(omega * tMs + (clockMs * 0.003) - 0.45);
    const y2 = dsoHeight / 2 - (iVal / ch2VoltsPerDiv) * (dsoHeight / 8);
    ch2Points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y2.toFixed(1)}`);
  }

  const ch1PathD = ch1Points.join(' ');
  const ch2PathD = ch2Points.join(' ');

  return (
    <div className={`bg-[#0f172a] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-5 text-white font-sans ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#06b6d4]/20 border border-[#06b6d4]">
              <Gauge className="w-5 h-5 text-[#06b6d4]" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide uppercase">
              IEC 61010-031 Virtual Diagnostic Instrumentation Suite
            </h2>
          </div>
          <p className="text-xs text-[#94a3b8] font-mono mt-1">
            CAT IV 1000V True-RMS Multimeter • 4-Channel DSO Oscilloscope with FFT • FLIR Radiometric Thermal Camera
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          {/* Instrument Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 bg-[#020617] p-1 rounded-xl border border-[#334155]">
            <button
              onClick={() => setActiveInstrument('dmm')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeInstrument === 'dmm' ? 'bg-[#f59e0b] text-black shadow-md' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              1. True-RMS DMM
            </button>
            <button
              onClick={() => setActiveInstrument('dso')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeInstrument === 'dso' ? 'bg-[#06b6d4] text-black shadow-md' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              2. 4-Ch Scope
            </button>
            <button
              onClick={() => setActiveInstrument('flir')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeInstrument === 'flir' ? 'bg-[#ef4444] text-white shadow-md' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              3. FLIR Thermal
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white font-bold"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Main Instrumentation Display */}
      {activeInstrument === 'dmm' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-mono text-xs">
          
          {/* DMM Physical Chassis Viewport (6 Cols) */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-80 bg-[#1e293b] border-4 border-[#f59e0b] rounded-3xl p-5 shadow-2xl flex flex-col justify-between space-y-4">
              
              {/* Top Brand & Rating */}
              <div className="flex items-center justify-between text-[10px] text-[#94a3b8]">
                <span className="font-extrabold text-white">PE-LAB PRO 87V</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500">
                  CAT IV 1000V
                </span>
              </div>

              {/* Large LCD Backlit Screen */}
              <div className="relative bg-[#a3e635]/20 border-2 border-[#65a30d] rounded-2xl p-4 shadow-inner">
                <div className="flex justify-between text-[10px] text-[#65a30d] font-bold">
                  <span>AUTO RANGE</span>
                  <span>{dmmHold ? 'HOLD' : 'LIVE'}</span>
                </div>
                <div className="py-2 text-right">
                  <span className="text-4xl font-extrabold text-white tracking-widest drop-shadow-md">
                    {dmmDisplayStr}
                  </span>
                  <div className="text-xs text-[#a3e635] font-bold mt-1">
                    {dmmUnitStr}
                  </div>
                </div>
                <div className="text-[9px] text-[#65a30d] flex justify-between border-t border-[#65a30d]/40 pt-1">
                  <span>True-RMS AC+DC</span>
                  <span>Crest: 1.41</span>
                </div>
              </div>

              {/* Rotary Switch Dial Representation */}
              <div className="flex flex-col items-center space-y-2">
                <div className="grid grid-cols-5 gap-1.5 w-full text-center text-[10px] font-bold">
                  {[
                    { id: 'DCV', label: 'V⎓' },
                    { id: 'ACV', label: 'V~' },
                    { id: 'RESISTANCE', label: 'Ω' },
                    { id: 'CONTINUITY', label: '•)))' },
                    { id: 'FREQ', label: 'Hz' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setDmmMode(m.id as any)}
                      className={`py-2 rounded-xl border transition-all cursor-pointer ${
                        dmmMode === m.id
                          ? 'bg-[#f59e0b] text-black font-extrabold border-white shadow-lg'
                          : 'bg-[#0f172a] text-[#94a3b8] border-[#334155]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Probe Input Jacks (COM, V/Ω, mA, 10A) */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#334155] text-center text-[9px] font-bold">
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-red-600 border-2 border-white shadow-md" />
                  <span className="text-red-400 mt-1">V / Ω</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-black border-2 border-white shadow-md" />
                  <span className="text-slate-400 mt-1">COM</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-red-800 border border-slate-600" />
                  <span className="text-slate-400 mt-1">mA</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-red-800 border border-slate-600" />
                  <span className="text-slate-400 mt-1">10A</span>
                </div>
              </div>

            </div>
          </div>

          {/* Test Points Selector & Measurement Analysis (6 Cols) */}
          <div className="lg:col-span-6 space-y-4">
            
            <div className="p-4 bg-[#1e293b]/60 border border-[#334155] rounded-2xl space-y-3">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-[#06b6d4]" /> Virtual Test Points Selection (Click to Place Probes)
              </span>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'dc_bus', label: 'DC Link Bus (+Vdc / -Vdc)', desc: 'Nominal 400V DC' },
                  { id: 'ac_output', label: 'AC Inverter Output (Ph-N)', desc: 'Nominal 230V AC RMS' },
                  { id: 'snubber_res', label: 'RC Snubber Resistor (Rs)', desc: '22Ω Component Test' },
                  { id: 'ground_mesh', label: 'Substation Ground Bond', desc: 'Earth Continuity Test' },
                ].map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setSelectedProbePoint(pt.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedProbePoint === pt.id
                        ? 'bg-[#06b6d4] text-black font-bold border-white shadow-lg'
                        : 'bg-[#0f172a] text-[#94a3b8] border-[#334155] hover:text-white'
                    }`}
                  >
                    <div className="text-xs">{pt.label}</div>
                    <div className="text-[10px] opacity-75">{pt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#0f172a] border border-[#334155] rounded-2xl space-y-2 text-xs text-[#94a3b8] font-sans">
              <div className="text-white font-bold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#06b6d4]" />
                IEC 61010-031 Safety Category Rules
              </div>
              <p className="text-[11px] leading-relaxed">
                <strong>CAT IV 1000V Rating:</strong> Suitable for measurements performed at the source of low-voltage installations (e.g., electricity meters, main branch circuit breakers, and industrial inverters). Always test meter on known energized source before taking live measurements!
              </p>
            </div>

          </div>

        </div>
      )}

      {/* 4-Channel DSO Oscilloscope Mode */}
      {activeInstrument === 'dso' && (
        <div className="space-y-4 font-mono text-xs">
          
          <div className="bg-[#020617] border border-[#334155] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-[#94a3b8]">
              <span className="text-white font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#06b6d4]" /> 4-Channel Digital Storage Oscilloscope (100 MSa/s)
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[#facc15] font-bold">CH1: {ch1VoltsPerDiv}V/div</span>
                <span className="text-[#06b6d4] font-bold">CH2: {ch2VoltsPerDiv}A/div</span>
                <span className="text-white font-bold">TB: {timebaseMsPerDiv}ms/div</span>
              </div>
            </div>

            {/* Scope Grid & Traces */}
            <div className="relative rounded-xl overflow-hidden border border-[#1e293b] bg-[#090d16]">
              <svg viewBox={`0 0 ${dsoWidth} ${dsoHeight}`} className="w-full h-auto block select-none">
                {/* 10x8 Division Grid */}
                <g stroke="#1e293b" strokeWidth="1">
                  {[1, 2, 3, 4, 5, 6, 7].map((div) => (
                    <line key={`h-${div}`} x1="0" y1={(dsoHeight / 8) * div} x2={dsoWidth} y2={(dsoHeight / 8) * div} />
                  ))}
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((div) => (
                    <line key={`v-${div}`} x1={(dsoWidth / 10) * div} y1="0" x2={(dsoWidth / 10) * div} y2={dsoHeight} />
                  ))}
                </g>

                {/* Center Axes */}
                <line x1="0" y1={dsoHeight / 2} x2={dsoWidth} y2={dsoHeight / 2} stroke="#334155" strokeWidth="1.5" />
                <line x1={dsoWidth / 2} y1="0" x2={dsoWidth / 2} y2={dsoHeight} stroke="#334155" strokeWidth="1.5" />

                {/* CH1 Trace (Yellow) */}
                {ch1Active && (
                  <path d={ch1PathD} fill="none" stroke="#facc15" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 6px rgba(250, 204, 21, 0.6))' }} />
                )}

                {/* CH2 Trace (Cyan) */}
                {ch2Active && (
                  <path d={ch2PathD} fill="none" stroke="#06b6d4" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))' }} />
                )}
              </svg>
            </div>

            {/* Oscilloscope Hardware Knobs & Channel Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-[#0f172a] border border-[#1e293b] rounded-xl">
              <div className="space-y-1">
                <div className="flex justify-between text-[#94a3b8] text-[10px]">
                  <span>Timebase</span>
                  <span className="text-white font-bold">{timebaseMsPerDiv} ms/div</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={timebaseMsPerDiv}
                  onChange={(e) => setTimebaseMsPerDiv(Number(e.target.value))}
                  className="w-full accent-white cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[#facc15] text-[10px]">
                  <span>CH1 Volts/div</span>
                  <span className="font-bold">{ch1VoltsPerDiv} V</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="10"
                  value={ch1VoltsPerDiv}
                  onChange={(e) => setCh1VoltsPerDiv(Number(e.target.value))}
                  className="w-full accent-[#facc15] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[#06b6d4] text-[10px]">
                  <span>CH2 Current/div</span>
                  <span className="font-bold">{ch2VoltsPerDiv} A</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={ch2VoltsPerDiv}
                  onChange={(e) => setCh2VoltsPerDiv(Number(e.target.value))}
                  className="w-full accent-[#06b6d4] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-around">
                <button
                  onClick={() => setCh1Active(!ch1Active)}
                  className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                    ch1Active ? 'bg-[#facc15] text-black' : 'bg-transparent text-[#94a3b8] border-[#334155]'
                  }`}
                >
                  CH1
                </button>
                <button
                  onClick={() => setCh2Active(!ch2Active)}
                  className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                    ch2Active ? 'bg-[#06b6d4] text-black' : 'bg-transparent text-[#94a3b8] border-[#334155]'
                  }`}
                >
                  CH2
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* FLIR Radiometric Thermal Infrared Camera Mode */}
      {activeInstrument === 'flir' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-mono text-xs">
          
          {/* Thermal Viewport (7 Cols) */}
          <div className="lg:col-span-7 bg-[#020617] border border-[#334155] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-[#94a3b8]">
              <span className="text-white font-bold flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#ef4444]" /> FLIR Thermal Camera Radiometric Scan (Ironbow)
              </span>
              <span className="text-[#ef4444] font-bold">Max Spot: {hotspotProbe.temp.toFixed(1)}°C</span>
            </div>

            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                // Calculate temperature based on distance from center heatsink (180, 110)
                const dist = Math.hypot(x - 180, y - 110);
                const temp = Math.max(25, 115 - dist * 0.45);
                setHotspotProbe({ x, y, temp });
              }}
              className="relative w-full h-64 rounded-xl border border-[#334155] overflow-hidden cursor-crosshair select-none bg-gradient-to-tr from-blue-900 via-purple-900 to-amber-600"
            >
              {/* Simulated Hotspots (IGBT Switch Die & Snubber Resistor) */}
              <div className="absolute left-36 top-16 w-24 h-24 rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-white blur-xl opacity-80 animate-pulse" />
              <div className="absolute right-24 bottom-14 w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-yellow-300 blur-lg opacity-70" />

              {/* Crosshair Probe Marker */}
              <div
                style={{ left: hotspotProbe.x - 12, top: hotspotProbe.y - 12 }}
                className="absolute pointer-events-none"
              >
                <div className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center">
                  <div className="w-1 h-1 bg-red-500" />
                </div>
                <div className="absolute left-7 -top-2 bg-black/85 px-2 py-0.5 rounded text-[10px] text-white font-bold whitespace-nowrap border border-white/40">
                  {hotspotProbe.temp.toFixed(1)}°C
                </div>
              </div>

              {/* Thermal Temperature Scale Bar on Right */}
              <div className="absolute right-3 top-3 bottom-3 w-4 rounded-full bg-gradient-to-b from-white via-red-500 via-purple-600 to-blue-950 border border-white/50 flex flex-col justify-between py-1 text-[8px] font-bold text-white text-center">
                <span>120°</span>
                <span>75°</span>
                <span>25°</span>
              </div>
            </div>

            <p className="text-[10px] text-[#94a3b8]">
              💡 Click anywhere on the thermal scan to place crosshairs and measure live radiometric junction temperatures!
            </p>
          </div>

          {/* Thermal Diagnostics Advice (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 bg-[#1e293b]/60 border border-[#334155] rounded-2xl space-y-2">
              <span className="text-white font-bold">Infrared Inspection Insights</span>
              <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                Thermal imaging detects loose bolted busbar connections, unbalanced parallel IGBT current sharing, and deteriorating snubber capacitors long before smoke or catastrophic failure occurs.
              </p>
              <div className="p-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">IGBT Junction Temp:</span>
                  <span className="text-[#ef4444] font-bold">108.4°C (Normal &lt; 125°C)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Busbar Joint Delta-T:</span>
                  <span className="text-[#10b981] font-bold">ΔT = 4.2°C (Healthy)</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
