import React, { useState } from 'react';
import {
  Zap,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Cpu,
  Gauge,
  Power,
  ShieldCheck,
  Info,
  Maximize2,
} from 'lucide-react';

interface DCDCSLDProps {
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
  etaPct: number;
  onToggleQ1: () => void;
  onToggleQ2: () => void;
  onToggleQ3: () => void;
  onSelectComponent: (compName: string) => void;
}

const TOOLTIPS: Record<string, { name: string; rating: string; standard: string }> = {
  VinSource: { name: 'Primary DC Infeed Bus', rating: '12V - 400V DC 100A Nominal', standard: 'IEEE 946 / IEC 62040-3' },
  Q1Breaker: { name: 'DC Input Air Circuit Breaker (52-Q1)', rating: '400A 500VDC 25kA Icu', standard: 'IEC 60947-2 / IEEE C37.14' },
  Cin: { name: 'Input EMI & Decoupling Capacitor (Cin)', rating: '100 µF 450V Low ESR Polymer', standard: 'IPC-9592 Class 2' },
  S1MOSFET: { name: 'High-Side Switch (S1 N-Channel MOSFET)', rating: '600V 80A 10mΩ Rds(on) SiC/GaN', standard: 'IEC 60747-8' },
  S2Diode: { name: 'Low-Side Synchronous MOSFET / Freewheel Diode (S2)', rating: '600V 80A Ultra-Fast Schottky Diode', standard: 'IEC 60747-2' },
  LInductor: { name: 'High-Frequency Power Reactor (Inductor L)', rating: '100 µH 50A Ferrite E-Core (Isat=65A)', standard: 'IEEE 389 / IEC 63182' },
  CCapacitor: { name: 'Output Low-ESR Filter Capacitor (C)', rating: '470 µF 100V Aluminum Polymer (ESR=10mΩ)', standard: 'IEC 60384-4' },
  Q2Switch: { name: 'DC Output Isolation Breaker (52-Q2)', rating: '250A 250VDC 2-Pole Switchgear', standard: 'IEC 60947-3' },
  Q3Isolator: { name: 'Substation Load Disconnect Switch (89-Q3)', rating: '250A Manual Lockout Disconnector', standard: 'IEC 60947-3' },
  Load: { name: 'Substation Critical Auxiliary DC Load', rating: 'Programmable Resistor Load (1 - 100Ω)', standard: 'IEEE 1188 Station Battery Load' },
};

export const DCDCSLD: React.FC<DCDCSLDProps> = ({
  topology,
  Vin,
  duty,
  fsw,
  inductanceuH,
  capacitanceuF,
  loadR,
  q1Closed,
  q2Closed,
  q3Closed,
  isEngineRunning,
  mode,
  activeFault,
  Vout,
  Iout,
  deltaIL,
  deltaVout,
  Pout,
  etaPct,
  onToggleQ1,
  onToggleQ2,
  onToggleQ3,
  onSelectComponent,
}) => {
  // Zoom & Pan State
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredComp, setHoveredComp] = useState<string | null>(null);

  const handleZoomIn = () => setZoomScale((prev) => Math.min(2.5, prev + 0.25));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(0.75, prev - 0.25));
  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const isInputPowered = isEngineRunning && q1Closed && activeFault !== 'S1_OPEN' && activeFault !== 'S1_SHORT';
  const isOutputConnected = q2Closed && q3Closed && activeFault !== 'DIODE_OPEN';
  const Vout_abs = Math.abs(Vout);

  return (
    <div className="w-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-3 shadow-2xl relative flex flex-col gap-3 font-mono overflow-hidden select-none min-h-[580px]">
      {/* Background Watermark & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      {/* Canvas Top Bar with Controls & Zoom */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="font-extrabold text-xs sm:text-sm text-white tracking-wide">
            INDUSTRIAL DC-DC SCHEMATIC SLD WORKBENCH
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-cyan-300 border border-blue-700 font-bold uppercase">
            {topology} ({mode})
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 bg-[#0b1220] border border-[#1e293b] rounded-xl p-1 shadow-md">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-bold text-slate-300 px-1.5">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold cursor-pointer ml-1"
            title="Reset Zoom (100%)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SLD CANVAS TRANSFORM CONTAINER */}
      <div
        className="relative z-10 w-full flex-1 min-h-[480px] overflow-hidden rounded-xl border border-blue-900/40 bg-[#040812] flex items-center justify-center p-2"
        style={{
          transform: `scale(${zoomScale}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s ease-out',
        }}
      >
        {/* 4 SUBSTATION DASHED SECTIONS GRID */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* SECTION 1: DC INFEED & PROTECTION */}
          <div
            onMouseEnter={() => setHoveredComp('Q1Breaker')}
            onMouseLeave={() => setHoveredComp(null)}
            className={`border-2 border-dashed rounded-2xl p-3 bg-[#091326]/80 flex flex-col justify-between transition-all relative ${
              hoveredComp === 'Q1Breaker' ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'border-blue-500/60'
            }`}
          >
            <div className="flex items-center justify-between border-b border-blue-500/40 pb-1 text-[10px] font-bold text-blue-300">
              <span>SEC 1: DC INFEED &amp; 52-Q1</span>
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            </div>

            <div className="flex flex-col items-center gap-3 py-3">
              {/* DC Source */}
              <div
                onClick={() => onSelectComponent('VinSource')}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 border-2 border-cyan-400 flex flex-col items-center justify-center text-white cursor-pointer shadow-lg hover:scale-105 transition-all"
              >
                <span className="text-xs font-black">+{Vin}V</span>
                <span className="text-[9px] font-bold text-cyan-200">DC IN</span>
              </div>

              {/* 52-Q1 Breaker */}
              <button
                type="button"
                onClick={onToggleQ1}
                className={`w-full py-2 px-2.5 rounded-xl border-2 text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-between ${
                  q1Closed ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300' : 'bg-rose-950/90 border-rose-500 text-rose-300'
                }`}
              >
                <span>52-Q1 Breaker</span>
                <span>{q1Closed ? 'CLOSED' : 'OPEN'}</span>
              </button>

              {/* Cin Cap */}
              <div
                onClick={() => onSelectComponent('Cin')}
                className="w-full p-2 bg-[#060c18] border border-blue-800/60 rounded-xl flex items-center justify-between text-[11px] cursor-pointer hover:border-cyan-400"
              >
                <span className="text-slate-400">Cin Decoupling:</span>
                <span className="text-cyan-300 font-bold">100 µF</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 border-t border-blue-900/40 pt-1 flex justify-between">
              <span>Primary Infeed:</span>
              <strong className="text-sky-300">{Vin}V DC</strong>
            </div>
          </div>

          {/* SECTION 2: MOSFET HALF-BRIDGE */}
          <div
            onMouseEnter={() => setHoveredComp('S1MOSFET')}
            onMouseLeave={() => setHoveredComp(null)}
            className={`border-2 border-dashed rounded-2xl p-3 bg-[#08162b]/80 flex flex-col justify-between transition-all relative ${
              hoveredComp === 'S1MOSFET' ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'border-cyan-500/60'
            }`}
          >
            <div className="flex items-center justify-between border-b border-cyan-500/40 pb-1 text-[10px] font-bold text-cyan-300">
              <span>SEC 2: MOSFET POWER STAGE</span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>

            <div className="flex flex-col items-center gap-2 py-2">
              {/* S1 High MOSFET */}
              <div
                onClick={() => onSelectComponent('S1MOSFET')}
                className={`w-full p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between text-xs ${
                  activeFault === 'S1_OPEN'
                    ? 'bg-slate-900 border-rose-500 text-rose-400'
                    : activeFault === 'S1_SHORT'
                    ? 'bg-rose-950 border-rose-400 text-white animate-pulse'
                    : isInputPowered
                    ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : 'bg-[#060c18] border-[#1e293b] text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-bold">S1 MOSFET (High)</div>
                    <div className="text-[9.5px] text-slate-400">Gate: PWM {duty}%</div>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded border bg-slate-800">
                  {activeFault === 'S1_OPEN' ? 'OPEN' : activeFault === 'S1_SHORT' ? 'SHORT' : 'ACTIVE'}
                </span>
              </div>

              {/* S2 Low MOSFET / Diode */}
              <div
                onClick={() => onSelectComponent('S2Diode')}
                className={`w-full p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between text-xs ${
                  activeFault === 'DIODE_OPEN'
                    ? 'bg-rose-950 border-rose-500 text-rose-300'
                    : isInputPowered
                    ? 'bg-blue-950/90 border-blue-400 text-cyan-200'
                    : 'bg-[#060c18] border-[#1e293b] text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="font-bold">S2 / Freewheel Diode</div>
                    <div className="text-[9.5px] text-slate-400">Recirculation</div>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded border bg-slate-800">
                  {activeFault === 'DIODE_OPEN' ? 'OPEN' : 'ACTIVE'}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 border-t border-cyan-900/40 pt-1 flex justify-between">
              <span>Switch Freq:</span>
              <strong className="text-amber-300">{(fsw / 1000).toFixed(0)} kHz</strong>
            </div>
          </div>

          {/* SECTION 3: LC SMOOTHING FILTER STAGE */}
          <div
            onMouseEnter={() => setHoveredComp('LInductor')}
            onMouseLeave={() => setHoveredComp(null)}
            className={`border-2 border-dashed rounded-2xl p-3 bg-[#061814]/80 flex flex-col justify-between transition-all relative ${
              hoveredComp === 'LInductor' ? 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-emerald-500/60'
            }`}
          >
            <div className="flex items-center justify-between border-b border-emerald-500/40 pb-1 text-[10px] font-bold text-emerald-300">
              <span>SEC 3: LC FILTER STAGE</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <div className="flex flex-col items-center gap-2 py-2">
              {/* Inductor L */}
              <div
                onClick={() => onSelectComponent('LInductor')}
                className={`w-full p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                  activeFault === 'L_SAT' ? 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse' : 'bg-[#040f0c] border-emerald-700/60 text-emerald-300'
                }`}
              >
                <div>
                  <span className="font-extrabold block">Power Inductor L</span>
                  <span className="text-[10px] text-slate-400">{inductanceuH} µH</span>
                </div>
                <span className="text-[11px] font-bold text-cyan-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  ΔIL = {deltaIL.toFixed(2)}A
                </span>
              </div>

              {/* Capacitor C */}
              <div
                onClick={() => onSelectComponent('CCapacitor')}
                className={`w-full p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                  activeFault === 'C_ESR_HIGH' ? 'bg-rose-950/80 border-rose-500 text-rose-300' : 'bg-[#040f0c] border-emerald-700/60 text-emerald-300'
                }`}
              >
                <div>
                  <span className="font-extrabold block">Filter Capacitor C</span>
                  <span className="text-[10px] text-slate-400">{capacitanceuF} µF</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  ΔV = {(deltaVout * 1000).toFixed(1)}mV
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 border-t border-emerald-900/40 pt-1 flex justify-between">
              <span>Filter Mode:</span>
              <strong className={mode === 'CCM' ? 'text-emerald-400' : 'text-amber-400'}>{mode}</strong>
            </div>
          </div>

          {/* SECTION 4: DC BUSBAR & CRITICAL LOAD */}
          <div
            onMouseEnter={() => setHoveredComp('Load')}
            onMouseLeave={() => setHoveredComp(null)}
            className={`border-2 border-dashed rounded-2xl p-3 bg-[#0a1628]/80 flex flex-col justify-between transition-all relative ${
              hoveredComp === 'Load' ? 'border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]' : 'border-sky-500/60'
            }`}
          >
            <div className="flex items-center justify-between border-b border-sky-500/40 pb-1 text-[10px] font-bold text-sky-300">
              <span>SEC 4: DC BUS &amp; LOAD</span>
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            </div>

            <div className="flex flex-col items-center gap-2 py-2">
              <button
                type="button"
                onClick={onToggleQ2}
                className={`w-full p-2 rounded-xl border text-xs font-bold flex items-center justify-between ${
                  q2Closed ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' : 'bg-rose-950/80 border-rose-600 text-rose-300'
                }`}
              >
                <span>52-Q2 Battery Switch</span>
                <span>{q2Closed ? 'CLOSED' : 'OPEN'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleQ3}
                className={`w-full p-2 rounded-xl border text-xs font-bold flex items-center justify-between ${
                  q3Closed ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' : 'bg-rose-950/80 border-rose-600 text-rose-300'
                }`}
              >
                <span>89-Q3 Load Isolator</span>
                <span>{q3Closed ? 'CLOSED' : 'OPEN'}</span>
              </button>

              <div
                onClick={() => onSelectComponent('Load')}
                className="w-full p-2.5 rounded-xl bg-gradient-to-br from-blue-950 to-indigo-950 border-2 border-cyan-400 flex flex-col items-center justify-center gap-1 shadow-lg cursor-pointer hover:scale-105 transition-all"
              >
                <span className="text-[10px] font-extrabold text-cyan-300 uppercase tracking-wider">CRITICAL LOAD DEMAND</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-white">{Vout_abs.toFixed(1)} V</span>
                  <span className="text-sm font-extrabold text-emerald-400">{Iout.toFixed(2)} A</span>
                </div>
                <span className="text-[10px] text-slate-300 font-bold">Pout: {Pout.toFixed(1)} W</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 border-t border-sky-900/40 pt-1 flex justify-between">
              <span>Converter Efficiency η:</span>
              <strong className="text-emerald-400 font-bold">{etaPct.toFixed(1)} %</strong>
            </div>
          </div>

        </div>
      </div>

      {/* COMPONENT TOOLTIP BANNER */}
      {hoveredComp && TOOLTIPS[hoveredComp] && (
        <div className="relative z-20 w-full p-2.5 bg-[#0d1729] border border-cyan-500/60 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="font-extrabold text-white">{TOOLTIPS[hoveredComp].name}</span>
              <span className="text-[11px] text-slate-300 ml-2">Rating: {TOOLTIPS[hoveredComp].rating}</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-cyan-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-700">
            {TOOLTIPS[hoveredComp].standard}
          </span>
        </div>
      )}
    </div>
  );
};
