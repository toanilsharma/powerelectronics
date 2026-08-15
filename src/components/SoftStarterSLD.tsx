import React, { useState } from 'react';
import { SoftStarterFaults, SoftStarterParams, SoftStarterReadouts } from '../types/softStarter';
import { Zap, Activity, AlertTriangle, ShieldCheck, Cpu, Flame, Gauge, CheckCircle2 } from 'lucide-react';

interface SoftStarterSLDProps {
  mccbClosed: boolean;
  onToggleMCCB: () => void;
  isRunning: boolean;
  isTrip: boolean;
  params: SoftStarterParams;
  readouts: SoftStarterReadouts;
  faults: SoftStarterFaults;
  onToggleSuctionValve: () => void;
  onToggleDischargeValve: () => void;
}

interface ComponentInfo {
  name: string;
  rating: string;
  standard: string;
}

const TOOLTIPS: Record<string, ComponentInfo> = {
  MCCB: { name: 'Main Line Breaker (52-MCCB)', rating: '400A 35kA Icu, 3-Pole', standard: 'IEC 60947-2 / IEEE C37.2-52' },
  KM1: { name: 'AC-3 Bypass Contactor (KM1)', rating: '300A 415V AC-3 Rated', standard: 'IEC 60947-4-1' },
  SCR: { name: '6× Back-to-Back SCRs (T1-T6)', rating: '1600V / 500A Phase-Angle Controlled', standard: 'IEC 60947-4-2' },
  CT: { name: '3-Phase Current Transformers (CT1-CT3)', rating: '400/5A Class 0.5M', standard: 'IEC 61869-2' },
  MOTOR: { name: '3-Phase Induction Motor', rating: '415V 160kW 4-Pole 285A FLA', standard: 'IEC 60034-1' },
  LOAD: { name: 'Mechanical Load Assembly', rating: 'Centrifugal Pump / Compressor / Conveyor', standard: 'ISO 5199 / API 610' },
};

export const SoftStarterSLD: React.FC<SoftStarterSLDProps> = ({
  mccbClosed,
  onToggleMCCB,
  isRunning,
  isTrip,
  params,
  readouts,
  faults,
  onToggleSuctionValve,
  onToggleDischargeValve,
}) => {
  const [hovered, setHovered] = useState<string | null>(null);

  // Electrical Conduction States
  const mainsPowered = mccbClosed;
  const isScrConducting = mainsPowered && isRunning && !readouts.bypassClosed && !isTrip;
  const isBypassConducting = mainsPowered && isRunning && readouts.bypassClosed && !isTrip;
  const isMotorPowered = mainsPowered && isRunning && !isTrip;

  // Active Conduction Color
  const activeColor = isBypassConducting ? '#10b981' : isScrConducting ? '#f97316' : '#475569';
  const flowDashClass = isBypassConducting
    ? 'power-flow-dash-fast-down'
    : isScrConducting
    ? 'power-flow-dash-down'
    : '';

  // Helper to render standard IEC 60617 / IEEE 315 Circuit Breaker
  const renderIECBreaker = (
    x: number,
    y: number,
    id: string,
    label: string,
    rating: string,
    isClosed: boolean,
    onToggle: () => void,
    deviceNum: string = '52'
  ) => {
    const isHovered = hovered === id;
    const stateColor = isClosed ? '#10b981' : '#ef4444';

    return (
      <g
        className="cursor-pointer transition-all duration-200"
        onClick={onToggle}
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Component Card Hitbox */}
        <rect
          x={x - 120}
          y={y - 6}
          width={240}
          height={55}
          fill={isHovered ? '#1e293b' : '#0f172a'}
          rx={6}
          stroke={isHovered ? '#38bdf8' : isClosed ? '#10b981' : '#f59e0b'}
          strokeWidth={isHovered ? 2 : 1.2}
        />

        {/* Vertical Conductor Line */}
        <line x1={x - 70} y1={y - 6} x2={x - 70} y2={y + 10} stroke="#38bdf8" strokeWidth={3} />
        <line x1={x - 70} y1={y + 36} x2={x - 70} y2={y + 49} stroke="#38bdf8" strokeWidth={3} />

        {/* Fixed Top Contact Symbol & Trip 'X' */}
        <g transform={`translate(${x - 70}, ${y + 10})`}>
          <line x1="-6" y1="0" x2="6" y2="0" stroke="#f8fafc" strokeWidth="2" />
          <line x1="-5" y1="-5" x2="5" y2="5" stroke="#f59e0b" strokeWidth="2" />
          <line x1="5" y1="-5" x2="-5" y2="5" stroke="#f59e0b" strokeWidth="2" />
        </g>

        {/* Bottom Contact Pivot */}
        <circle cx={x - 70} cy={y + 36} r={3} fill="#f8fafc" />

        {/* Moving Contact Blade */}
        {isClosed ? (
          <line x1={x - 70} y1={y + 36} x2={x - 70} y2={y + 10} stroke={stateColor} strokeWidth={3} />
        ) : (
          <line x1={x - 70} y1={y + 36} x2={x - 56} y2={y + 14} stroke={stateColor} strokeWidth={3} />
        )}

        {/* Device Number Tag */}
        <circle cx={x - 98} cy={y + 22} r={12} fill="#1e293b" stroke="#38bdf8" strokeWidth={1.5} />
        <text x={x - 98} y={y + 26} textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
          {deviceNum}
        </text>

        {/* Label & Rating */}
        <text x={x - 42} y={y + 18} fill="#ffffff" fontSize="11" fontWeight="bold">
          {label}
        </text>
        <text x={x - 42} y={y + 32} fill="#94a3b8" fontSize="9" fontFamily="monospace">
          {rating}
        </text>

        {/* Status Badge */}
        <rect
          x={x + 48}
          y={y + 10}
          width={60}
          height={20}
          rx={4}
          fill={isClosed ? '#065f46' : '#991b1b'}
          stroke={isClosed ? '#34d399' : '#f87171'}
          strokeWidth={1}
        />
        <text x={x + 78} y={y + 23} textAnchor="middle" fill="#ffffff" fontSize={9} fontWeight="bold">
          {isClosed ? 'CLOSED' : 'OPEN'}
        </text>
      </g>
    );
  };

  // Helper for rendering 3-Phase Anti-Parallel SCR (Thyristor) Pair
  const renderSCRPair3Phase = (x: number, y: number, phaseLabel: string, isCond: boolean) => {
    const fill = isCond ? '#f97316' : '#334155';
    const stroke = isCond ? '#f97316' : '#64748b';

    return (
      <g transform={`translate(${x}, ${y})`}>
        {/* Phase Line */}
        <line x1={-35} y1={0} x2={35} y2={0} stroke={stroke} strokeWidth={2} />

        {/* SCR 1 (Forward) */}
        <polygon points="-12,-8 4,-8 -4,2" fill={fill} stroke={stroke} strokeWidth={1.5} />
        <line x1={4} y1={-10} x2={4} y2={4} stroke={stroke} strokeWidth={1.5} />
        <line x1={-4} y1={-3} x2={-10} y2={-10} stroke="#f59e0b" strokeWidth={1.2} /> {/* Gate */}

        {/* SCR 2 (Reverse) */}
        <polygon points="12,8 -4,8 4,-2" fill={fill} stroke={stroke} strokeWidth={1.5} />
        <line x1={-4} y1={10} x2={-4} y2={-4} stroke={stroke} strokeWidth={1.5} />
        <line x1={4} y1={3} x2={10} y2={10} stroke="#f59e0b" strokeWidth={1.2} /> {/* Gate */}

        {/* Label */}
        <text x={42} y={3} fill={isCond ? '#f97316' : '#94a3b8'} fontSize={9} fontWeight="bold" fontFamily="monospace">
          {phaseLabel}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-2xl flex flex-col gap-4 font-mono select-none">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-950/50 border border-emerald-800/60 rounded-lg text-emerald-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">3-PHASE SOLID-STATE SOFT STARTER (415V 160kW)</h2>
            <p className="text-xs text-slate-400">
              IEC 60947-4-2 / IEEE 315 Dual-Path Thyristor Phase-Ramp & Continuous Power Flow SLD
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 ${
              isTrip
                ? 'bg-red-950 border-red-500 text-red-300 animate-pulse'
                : isRunning
                ? readouts.bypassClosed
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                  : 'bg-amber-950 border-amber-500 text-amber-300 animate-pulse'
                : 'bg-[#21262d] border-[#30363d] text-slate-400'
            }`}
          >
            <Activity className="w-4 h-4" />
            STATE:{' '}
            {isTrip
              ? 'TRIPPED'
              : isRunning
              ? readouts.bypassClosed
                ? 'RUNNING (BYPASS CLOSED)'
                : 'RAMPING (SCR FIRING)'
              : 'STOPPED'}
          </div>
        </div>
      </div>

      {/* HOVER TOOLTIP */}
      {hovered && TOOLTIPS[hovered] && (
        <div className="absolute top-28 right-8 bg-[#161b22] border border-[#38bdf8] rounded-md p-3 shadow-2xl z-30 pointer-events-none text-xs max-w-xs">
          <div className="font-bold text-[#38bdf8] mb-1">{TOOLTIPS[hovered].name}</div>
          <div className="text-[#c9d1d9] mb-1">
            Rating: <span className="text-[#f59e0b] font-bold">{TOOLTIPS[hovered].rating}</span>
          </div>
          <div className="text-[#8b949e]">Standard: <span>{TOOLTIPS[hovered].standard}</span></div>
        </div>
      )}

      {/* MAIN SVG CANVAS */}
      <div className="relative w-full bg-[#090d12] border border-[#30363d] rounded-xl overflow-hidden p-2">
        <svg viewBox="0 0 1000 660" className="w-full h-auto select-none">
          <defs>
            <pattern id="ssGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>

            {/* Glowing Gradient Filters */}
            <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glowOrange" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Canvas Background Grid */}
          <rect width="1000" height="660" fill="#090d12" />
          <rect width="1000" height="660" fill="url(#ssGrid)" />
          <rect x="10" y="10" width="980" height="640" fill="none" stroke="#1e293b" strokeWidth="2" />

          {/* ============================================================== */}
          {/* 1. UPSTREAM MAINS SUPPLY BUSBAR (415V 3-PHASE 50Hz)            */}
          {/* ============================================================== */}
          <g transform="translate(300, 35)">
            {/* Horizontal 3-Phase Busbar */}
            <line x1="-120" y1="0" x2="120" y2="0" stroke="#38bdf8" strokeWidth="5" />
            <line x1="-120" y1="-4" x2="120" y2="-4" stroke="#f59e0b" strokeWidth="1.5" />
            <line x1="-120" y1="4" x2="120" y2="4" stroke="#ef4444" strokeWidth="1.5" />

            {/* 3-Phase Standard Hash Mark /// */}
            <line x1="0" y1="-12" x2="-8" y2="12" stroke="#ffffff" strokeWidth="2" />
            <line x1="5" y1="-12" x2="-3" y2="12" stroke="#ffffff" strokeWidth="2" />
            <line x1="10" y1="-12" x2="2" y2="12" stroke="#ffffff" strokeWidth="2" />

            <text x="0" y="-18" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="black">
              3~ 415V 50Hz UTILITY MAINS BUSBAR
            </text>
          </g>

          {/* ============================================================== */}
          {/* 2. UPSTREAM POWER FLOW CONDUCTOR (BUS TO MCCB)                 */}
          {/* ============================================================== */}
          {/* Base Conductor Line (Always Visible & Connected) */}
          <line x1="300" y1="35" x2="300" y2="75" stroke={mainsPowered ? '#38bdf8' : '#334155'} strokeWidth="4" />
          {mainsPowered && (
            <line x1="300" y1="35" x2="300" y2="75" stroke="#7dd3fc" strokeWidth="2" className="power-flow-dash-down" />
          )}

          {/* ============================================================== */}
          {/* 3. MAIN INCOMING CIRCUIT BREAKER (52-MCCB)                     */}
          {/* ============================================================== */}
          <g transform="translate(300, 75)">
            {renderIECBreaker(0, 0, 'MCCB', '52-MCCB Soft Starter Incomer', '400A 35kA Icu, 3P', mccbClosed, onToggleMCCB, '52')}
          </g>

          {/* Conductor from MCCB to Soft Starter Split Node */}
          <line x1="300" y1="124" x2="300" y2="185" stroke={mainsPowered ? '#38bdf8' : '#334155'} strokeWidth="4" />
          {mainsPowered && (
            <line x1="300" y1="124" x2="300" y2="185" stroke="#7dd3fc" strokeWidth="2" className="power-flow-dash-down" />
          )}

          {/* ============================================================== */}
          {/* 4. SOFT STARTER CUBICLE ENCLOSURE (IEC 60947-4-2 FORM 4)       */}
          {/* ============================================================== */}
          <g transform="translate(130, 185)">
            <rect
              x="0"
              y="0"
              width="340"
              height="240"
              fill="#0f172a"
              fillOpacity="0.75"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="6,4"
              rx="10"
            />
            <text x="15" y="22" fill="#38bdf8" fontSize="10" fontWeight="bold" letterSpacing="0.5">
              3-PHASE SOFT STARTER CUBICLE (IEC 60947-4-2)
            </text>

            {/* Firing Angle & Ramp Telemetry Badge */}
            <g transform="translate(190, 12)">
              <rect x="0" y="0" width="135" height="24" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
              <text x="67" y="16" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="bold">
                RAMP α: {readouts.bypassClosed ? '0° (100% V)' : isRunning ? `${Math.round(180 * (1 - readouts.outputVoltagePct / 100))}°` : '180° (0% V)'}
              </text>
            </g>
          </g>

          {/* Split Node Point at (300, 195) */}
          <circle cx="300" cy="195" r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />

          {/* ============================================================== */}
          {/* 5. PARALLEL DUAL-PATH ELECTRICAL ROUTING                       */}
          {/*    BRANCH A (LEFT): 6× SCR Thyristors Module                  */}
          {/*    BRANCH B (RIGHT): Bypass Contactor KM1                      */}
          {/* ============================================================== */}

          {/* Underlying Permanent Conductor Base Lines (Ensures NO BREAKS!) */}
          <path d="M 300 195 L 210 195 L 210 225" fill="none" stroke="#334155" strokeWidth="3.5" />
          <path d="M 210 375 L 210 405 L 300 405" fill="none" stroke="#334155" strokeWidth="3.5" />

          <path d="M 300 195 L 390 195 L 390 260" fill="none" stroke="#334155" strokeWidth="3.5" />
          <path d="M 390 330 L 390 405 L 300 405" fill="none" stroke="#334155" strokeWidth="3.5" />

          {/* Branch A (SCR) Animated Power Flow (When SCRs are Firing/Ramping) */}
          {isScrConducting && (
            <>
              <path
                d="M 300 195 L 210 195 L 210 225"
                fill="none"
                stroke="#f97316"
                strokeWidth="4"
                filter="url(#glowOrange)"
              />
              <path
                d="M 300 195 L 210 195 L 210 225"
                fill="none"
                stroke="#ffedd5"
                strokeWidth="2"
                className="power-flow-dash-down"
              />

              <path
                d="M 210 375 L 210 405 L 300 405"
                fill="none"
                stroke="#f97316"
                strokeWidth="4"
                filter="url(#glowOrange)"
              />
              <path
                d="M 210 375 L 210 405 L 300 405"
                fill="none"
                stroke="#ffedd5"
                strokeWidth="2"
                className="power-flow-dash-down"
              />
            </>
          )}

          {/* Branch B (Bypass Contactor) Animated Power Flow (When Bypass Closed) */}
          {isBypassConducting && (
            <>
              <path
                d="M 300 195 L 390 195 L 390 260"
                fill="none"
                stroke="#10b981"
                strokeWidth="4"
                filter="url(#glowGreen)"
              />
              <path
                d="M 300 195 L 390 195 L 390 260"
                fill="none"
                stroke="#a7f3d0"
                strokeWidth="2"
                className="power-flow-dash-fast-down"
              />

              <path
                d="M 390 330 L 390 405 L 300 405"
                fill="none"
                stroke="#10b981"
                strokeWidth="4"
                filter="url(#glowGreen)"
              />
              <path
                d="M 390 330 L 390 405 L 300 405"
                fill="none"
                stroke="#a7f3d0"
                strokeWidth="2"
                className="power-flow-dash-fast-down"
              />
            </>
          )}

          {/* --- BRANCH A MODULE: 6× SCR THYRISTOR ASSEMBLY --- */}
          <g transform="translate(210, 225)" onMouseEnter={() => setHovered('SCR')} onMouseLeave={() => setHovered(null)}>
            <rect
              x="-65"
              y="0"
              width="130"
              height="150"
              fill="#0f172a"
              stroke={isScrConducting ? '#f97316' : '#334155'}
              strokeWidth={isScrConducting ? 2.5 : 1.5}
              rx="6"
            />
            <text x="0" y="18" textAnchor="middle" fill="#f97316" fontSize="10" fontWeight="bold">
              6× SCR THYRISTORS
            </text>

            {/* 3 Phase Anti-Parallel SCR Pairs */}
            {renderSCRPair3Phase(0, 45, 'L1 (T1/T4)', isScrConducting)}
            {renderSCRPair3Phase(0, 80, 'L2 (T3/T6)', isScrConducting)}
            {renderSCRPair3Phase(0, 115, 'L3 (T5/T2)', isScrConducting)}
          </g>

          {/* --- BRANCH B MODULE: AC-3 BYPASS CONTACTOR KM1 --- */}
          <g transform="translate(390, 260)" onMouseEnter={() => setHovered('KM1')} onMouseLeave={() => setHovered(null)}>
            <rect
              x="-55"
              y="0"
              width="110"
              height="70"
              fill="#0f172a"
              stroke={readouts.bypassClosed ? '#10b981' : '#334155'}
              strokeWidth={readouts.bypassClosed ? 2.5 : 1.5}
              rx="6"
            />
            <text x="0" y="16" textAnchor="middle" fill={readouts.bypassClosed ? '#10b981' : '#94a3b8'} fontSize="10" fontWeight="bold">
              BYPASS KM1
            </text>

            {/* 3 Contactor Poles */}
            <g transform="translate(-25, 30)">
              <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
              <circle cx="0" cy="20" r="2.5" fill="#ffffff" />
              {readouts.bypassClosed ? (
                <line x1="0" y1="0" x2="0" y2="20" stroke="#10b981" strokeWidth="2.5" />
              ) : (
                <line x1="0" y1="20" x2="8" y2="2" stroke="#ef4444" strokeWidth="2.5" />
              )}
            </g>

            <g transform="translate(0, 30)">
              <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
              <circle cx="0" cy="20" r="2.5" fill="#ffffff" />
              {readouts.bypassClosed ? (
                <line x1="0" y1="0" x2="0" y2="20" stroke="#10b981" strokeWidth="2.5" />
              ) : (
                <line x1="0" y1="20" x2="8" y2="2" stroke="#ef4444" strokeWidth="2.5" />
              )}
            </g>

            <g transform="translate(25, 30)">
              <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
              <circle cx="0" cy="20" r="2.5" fill="#ffffff" />
              {readouts.bypassClosed ? (
                <line x1="0" y1="0" x2="0" y2="20" stroke="#10b981" strokeWidth="2.5" />
              ) : (
                <line x1="0" y1="20" x2="8" y2="2" stroke="#ef4444" strokeWidth="2.5" />
              )}
            </g>

            {/* Status Text */}
            <text
              x="0"
              y="62"
              textAnchor="middle"
              fill={readouts.bypassClosed ? '#34d399' : '#f87171'}
              fontSize="8"
              fontWeight="bold"
            >
              {readouts.bypassClosed ? 'CLOSED (ACTIVE)' : 'OPEN (ISOLATED)'}
            </text>
          </g>

          {/* Merge Node Point at (300, 405) */}
          <circle cx="300" cy="405" r="4.5" fill={activeColor} stroke="#ffffff" strokeWidth="1.5" />

          {/* ============================================================== */}
          {/* 6. DOWNSTREAM CONTINUOUS POWER FLOW (MERGE NODE TO MOTOR)      */}
          {/* ============================================================== */}
          {/* Base Output Line */}
          <line x1="300" y1="405" x2="300" y2="500" stroke={isMotorPowered ? activeColor : '#334155'} strokeWidth="4" />
          {isMotorPowered && (
            <line
              x1="300"
              y1="405"
              x2="300"
              y2="500"
              stroke={isBypassConducting ? '#a7f3d0' : '#ffedd5'}
              strokeWidth="2"
              className={flowDashClass}
            />
          )}

          {/* Current Transformers (CT1, CT2, CT3) Instrument Box */}
          <g transform="translate(300, 440)" onMouseEnter={() => setHovered('CT')} onMouseLeave={() => setHovered(null)}>
            <rect x="-55" y="-12" width="110" height="28" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" rx="4" />
            {/* 3 CT Toroidal Rings */}
            <circle cx="-22" cy="2" r="7" fill="none" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="0" cy="2" r="7" fill="none" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="22" cy="2" r="7" fill="none" stroke="#38bdf8" strokeWidth="2" />
            <text x="0" y="-16" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
              3× CTs (Dev 50/51/49)
            </text>
          </g>

          {/* Thermal Overload Protection Relay Symbol */}
          <g transform="translate(300, 475)">
            <rect x="-18" y="-10" width="36" height="20" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" rx="2" />
            <path d="M -12 -5 L 0 5 L 12 -5" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="24" y="4" fill="#f59e0b" fontSize="8" fontWeight="bold">
              49/51
            </text>
          </g>

          {/* ============================================================== */}
          {/* 7. 3-PHASE INDUCTION MOTOR (M 3~)                              */}
          {/* ============================================================== */}
          <g transform="translate(300, 540)" onMouseEnter={() => setHovered('MOTOR')} onMouseLeave={() => setHovered(null)}>
            {/* Motor Outer Ring */}
            <circle
              cx="0"
              cy="0"
              r="34"
              fill="#0f172a"
              stroke={isTrip ? '#ef4444' : isMotorPowered ? '#10b981' : '#334155'}
              strokeWidth="3.5"
              className={isMotorPowered && !isTrip ? 'energy-pulse' : ''}
            />

            {/* Motor Label M 3~ */}
            <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="black">
              M
            </text>
            <text x="0" y="18" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">
              3~
            </text>

            {/* Motor Rating & Real-Time Speed */}
            <text x="48" y="-10" fill="#ffffff" fontSize="12" fontWeight="bold">
              415V 160kW Motor
            </text>
            <text x="48" y="8" fill="#10b981" fontSize="12" fontWeight="bold">
              {Math.round(readouts.motorSpeedRPM)} RPM ({((readouts.motorSpeedRPM / 1480) * 100).toFixed(1)}%)
            </text>
            <text x="48" y="24" fill="#94a3b8" fontSize="10" fontFamily="monospace">
              I_stat: {Math.round((readouts.motorCurrentFLA / 100) * 285)} A ({readouts.motorCurrentFLA.toFixed(0)}% FLA)
            </text>

            {/* Ground PE Connection */}
            <line x1="0" y1="34" x2="0" y2="52" stroke="#10b981" strokeWidth="2" />
            <g transform="translate(0, 52)">
              <line x1="-10" y1="0" x2="10" y2="0" stroke="#10b981" strokeWidth="2" />
              <line x1="-6" y1="3" x2="6" y2="3" stroke="#10b981" strokeWidth="2" />
              <line x1="-3" y1="6" x2="3" y2="6" stroke="#10b981" strokeWidth="2" />
            </g>
          </g>

          {/* ============================================================== */}
          {/* 8. ROTATING MECHANICAL DRIVE SHAFT                             */}
          {/* ============================================================== */}
          <g transform="translate(334, 540)">
            {/* Base Shaft Line */}
            <line x1="0" y1="0" x2="216" y2="0" stroke={isMotorPowered ? '#38bdf8' : '#334155'} strokeWidth="5" />
            {isMotorPowered && (
              <line x1="0" y1="0" x2="216" y2="0" stroke="#7dd3fc" strokeWidth="2" className="power-flow-dash-fast-right" />
            )}

            {/* Mechanical Coupling Symbol */}
            <g transform="translate(108, 0)">
              <rect x="-6" y="-12" width="12" height="24" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="2" />
              <text x="0" y="-16" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
                COUPLING
              </text>
            </g>
          </g>

          {/* ============================================================== */}
          {/* 9. MECHANICAL LOAD ASSEMBLY (PUMP / COMPRESSOR / CONVEYOR)      */}
          {/* ============================================================== */}
          <g transform="translate(550, 460)" onMouseEnter={() => setHovered('LOAD')} onMouseLeave={() => setHovered(null)}>
            <rect
              x="0"
              y="0"
              width="430"
              height="160"
              fill={isTrip ? '#450a0a' : '#0f172a'}
              stroke={isTrip ? '#ef4444' : '#334155'}
              strokeWidth={isTrip ? 2.5 : 1.5}
              rx="8"
            />

            {/* Header Title */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e293b]">
              <text x="15" y="24" fill={isTrip ? '#f87171' : '#38bdf8'} fontSize="11" fontWeight="bold">
                {isTrip ? '🚨 MECHANICAL LOAD TRIPPED' : `DRIVEN EQUIPMENT: ${params.loadType}`}
              </text>
            </div>

            {/* Alarm Banner if Tripped */}
            {isTrip && (
              <g transform="translate(15, 35)">
                <rect x="0" y="0" width="400" height="110" rx="6" fill="#991b1b" stroke="#f87171" strokeWidth="2" className="animate-pulse" />
                <text x="200" y="32" fill="#ffffff" fontSize="13" fontWeight="black" textAnchor="middle">
                  🚨 CRITICAL MECHANICAL TRIP / STALL ALARM 🚨
                </text>
                <text x="200" y="58" fill="#fef08a" fontSize="12" fontWeight="black" textAnchor="middle">
                  PROTECTION RELAY 49/51 TRIPPED INVERTER / SOFT STARTER
                </text>
                <text x="200" y="84" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
                  CHECK PUMP CAVITATION / MOTOR STALL / OVERCURRENT INHIBIT
                </text>
              </g>
            )}

            {!isTrip && params.loadType === 'CENTRIFUGAL_PUMP' && (
              <g transform="translate(15, 40)">
                {/* Suction Valve Button */}
                <g className="cursor-pointer" onClick={onToggleSuctionValve}>
                  <rect
                    x="0"
                    y="5"
                    width="180"
                    height="32"
                    rx="4"
                    fill={readouts.suctionValveOpen ? '#064e3b' : '#7f1d1d'}
                    stroke={readouts.suctionValveOpen ? '#10b981' : '#ef4444'}
                    strokeWidth="1.2"
                  />
                  <text x="90" y="25" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
                    SUCTION VALVE: {readouts.suctionValveOpen ? 'OPEN (100%)' : 'CLOSED (0%)'}
                  </text>
                </g>

                {/* Discharge Valve Button */}
                <g transform="translate(210, 0)" className="cursor-pointer" onClick={onToggleDischargeValve}>
                  <rect
                    x="0"
                    y="5"
                    width="180"
                    height="32"
                    rx="4"
                    fill={readouts.dischargeValveOpen ? '#064e3b' : '#7f1d1d'}
                    stroke={readouts.dischargeValveOpen ? '#10b981' : '#ef4444'}
                    strokeWidth="1.2"
                  />
                  <text x="90" y="25" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
                    DISCHARGE VALVE: {readouts.dischargeValveOpen ? 'OPEN (100%)' : 'CLOSED (0%)'}
                  </text>
                </g>

                {/* Hydraulic Readouts */}
                <g transform="translate(0, 52)">
                  <rect x="0" y="0" width="390" height="50" fill="#1e293b" rx="6" stroke="#334155" strokeWidth="1" />
                  <text x="15" y="22" fill="#94a3b8" fontSize="10">
                    PUMP HEAD PRESSURE:
                  </text>
                  <text x="15" y="38" fill="#10b981" fontSize="13" fontWeight="bold">
                    {readouts.pumpHeadMeters.toFixed(1)} m H₂O
                  </text>

                  <text x="210" y="22" fill="#94a3b8" fontSize="10">
                    VOLUMETRIC FLOW RATE:
                  </text>
                  <text x="210" y="38" fill="#38bdf8" fontSize="13" fontWeight="bold">
                    {readouts.pumpFlowM3H.toFixed(1)} m³/h
                  </text>
                </g>
              </g>
            )}

            {!isTrip && params.loadType === 'COMPRESSOR' && (
              <g transform="translate(20, 45)">
                <rect x="0" y="0" width="390" height="95" fill="#1e293b" rx="6" stroke="#334155" strokeWidth="1" />
                <text x="15" y="25" fill="#ffffff" fontSize="12" fontWeight="bold">
                  Heavy Reciprocating Air Compressor Unit
                </text>
                <text x="15" y="50" fill="#94a3b8" fontSize="11">
                  Discharge Line Pressure:
                </text>
                <text x="15" y="75" fill="#38bdf8" fontSize="18" fontWeight="bold">
                  {((readouts.motorSpeedRPM / 1480) * 8.5).toFixed(1)} bar (G)
                </text>
              </g>
            )}

            {!isTrip && params.loadType === 'CONVEYOR' && (
              <g transform="translate(20, 45)">
                <rect x="0" y="0" width="390" height="95" fill="#1e293b" rx="6" stroke="#334155" strokeWidth="1" />
                <text x="15" y="25" fill="#ffffff" fontSize="12" fontWeight="bold">
                  Heavy Industrial Material Conveyor Belt
                </text>
                <text x="15" y="50" fill="#94a3b8" fontSize="11">
                  Linear Belt Velocity:
                </text>
                <text x="15" y="75" fill="#f59e0b" fontSize="18" fontWeight="bold">
                  {((readouts.motorSpeedRPM / 1480) * 2.5).toFixed(2)} m/s
                </text>
              </g>
            )}
          </g>

          {/* ============================================================== */}
          {/* 10. REAL-TIME SYNOPTIC METRICS DASHBOARD (TOP RIGHT)            */}
          {/* ============================================================== */}
          <g transform="translate(550, 35)">
            <rect x="0" y="0" width="430" height="405" fill="#0f172a" stroke="#334155" strokeWidth="1.5" rx="8" />

            {/* Title */}
            <text x="15" y="24" fill="#38bdf8" fontSize="11" fontWeight="bold">
              📊 REAL-TIME 3-PHASE ELECTRICAL TELEMETRY
            </text>

            {/* 3 Phase Voltage Gauges */}
            <g transform="translate(15, 38)">
              <rect x="0" y="0" width="390" height="110" fill="#1e293b" rx="6" stroke="#334155" strokeWidth="1" />
              <text x="12" y="20" fill="#ffffff" fontSize="10" fontWeight="bold">
                PHASE VOLTAGES (415V NOMINAL)
              </text>

              {/* Phase A Voltage */}
              <g transform="translate(12, 32)">
                <text x="0" y="10" fill="#ef4444" fontSize="10" fontWeight="bold">
                  V_A: {(415 * (readouts.outputVoltagePct / 100)).toFixed(0)} V
                </text>
                <rect x="70" y="2" width="290" height="10" fill="#0f172a" rx="2" />
                <rect
                  x="70"
                  y="2"
                  width={(290 * readouts.outputVoltagePct) / 100}
                  height="10"
                  fill="#ef4444"
                  rx="2"
                />
              </g>

              {/* Phase B Voltage */}
              <g transform="translate(12, 54)">
                <text x="0" y="10" fill="#f59e0b" fontSize="10" fontWeight="bold">
                  V_B: {(415 * (readouts.outputVoltagePct / 100)).toFixed(0)} V
                </text>
                <rect x="70" y="2" width="290" height="10" fill="#0f172a" rx="2" />
                <rect
                  x="70"
                  y="2"
                  width={(290 * readouts.outputVoltagePct) / 100}
                  height="10"
                  fill="#f59e0b"
                  rx="2"
                />
              </g>

              {/* Phase C Voltage */}
              <g transform="translate(12, 76)">
                <text x="0" y="10" fill="#38bdf8" fontSize="10" fontWeight="bold">
                  V_C: {(415 * (readouts.outputVoltagePct / 100)).toFixed(0)} V
                </text>
                <rect x="70" y="2" width="290" height="10" fill="#0f172a" rx="2" />
                <rect
                  x="70"
                  y="2"
                  width={(290 * readouts.outputVoltagePct) / 100}
                  height="10"
                  fill="#38bdf8"
                  rx="2"
                />
              </g>
            </g>

            {/* 3 Phase Currents Gauges */}
            <g transform="translate(15, 160)">
              <rect x="0" y="0" width="390" height="110" fill="#1e293b" rx="6" stroke="#334155" strokeWidth="1" />
              <text x="12" y="20" fill="#ffffff" fontSize="10" fontWeight="bold">
                STATOR CURRENTS (285A FLA)
              </text>

              {/* Phase A Current */}
              <g transform="translate(12, 32)">
                <text x="0" y="10" fill="#ef4444" fontSize="10" fontWeight="bold">
                  I_A: {((readouts.motorCurrentFLA / 100) * 285).toFixed(0)} A
                </text>
                <rect x="70" y="2" width="290" height="10" fill="#0f172a" rx="2" />
                <rect
                  x="70"
                  y="2"
                  width={Math.min(290, (290 * readouts.motorCurrentFLA) / 500)}
                  height="10"
                  fill="#ef4444"
                  rx="2"
                />
              </g>

              {/* Phase B Current */}
              <g transform="translate(12, 54)">
                <text x="0" y="10" fill="#f59e0b" fontSize="10" fontWeight="bold">
                  I_B: {((readouts.motorCurrentFLA / 100) * 285).toFixed(0)} A
                </text>
                <rect x="70" y="2" width="290" height="10" fill="#0f172a" rx="2" />
                <rect
                  x="70"
                  y="2"
                  width={Math.min(290, (290 * readouts.motorCurrentFLA) / 500)}
                  height="10"
                  fill="#f59e0b"
                  rx="2"
                />
              </g>

              {/* Phase C Current */}
              <g transform="translate(12, 76)">
                <text x="0" y="10" fill="#38bdf8" fontSize="10" fontWeight="bold">
                  I_C: {((readouts.motorCurrentFLA / 100) * 285).toFixed(0)} A
                </text>
                <rect x="70" y="2" width="290" height="10" fill="#0f172a" rx="2" />
                <rect
                  x="70"
                  y="2"
                  width={Math.min(290, (290 * readouts.motorCurrentFLA) / 500)}
                  height="10"
                  fill="#38bdf8"
                  rx="2"
                />
              </g>
            </g>

            {/* Operating Mode Status Summary */}
            <g transform="translate(15, 282)">
              <rect x="0" y="0" width="390" height="110" fill="#1e293b" rx="6" stroke="#334155" strokeWidth="1" />
              <text x="12" y="20" fill="#94a3b8" fontSize="10" fontWeight="bold">
                OPERATIONAL PARAMETERS & PROTECTION STATUS
              </text>

              <g transform="translate(12, 32)">
                <text x="0" y="12" fill="#94a3b8" fontSize="10">
                  Control Mode: <tspan fill="#38bdf8" fontWeight="bold">{params.startMode}</tspan>
                </text>
                <text x="210" y="12" fill="#94a3b8" fontSize="10">
                  Initial Ramp V: <tspan fill="#f59e0b" fontWeight="bold">{params.initialVoltagePct}%</tspan>
                </text>

                <text x="0" y="34" fill="#94a3b8" fontSize="10">
                  Ramp Time: <tspan fill="#ffffff" fontWeight="bold">{params.rampTimeSec}s</tspan>
                </text>
                <text x="210" y="34" fill="#94a3b8" fontSize="10">
                  Current Limit: <tspan fill="#ef4444" fontWeight="bold">{params.currentLimitPct}%</tspan>
                </text>

                <text x="0" y="56" fill="#94a3b8" fontSize="10">
                  Kickstart Boost: <tspan fill={params.kickStart ? '#10b981' : '#64748b'} fontWeight="bold">{params.kickStart ? 'ENABLED (+70%)' : 'DISABLED'}</tspan>
                </text>
                <text x="210" y="56" fill="#94a3b8" fontSize="10">
                  Bypass State: <tspan fill={readouts.bypassClosed ? '#10b981' : '#f59e0b'} fontWeight="bold">{readouts.bypassClosed ? 'CLOSED (100% V)' : 'OPEN (RAMPING)'}</tspan>
                </text>
              </g>
            </g>
          </g>

          {/* ============================================================== */}
          {/* 11. IEC/IEEE ENGINEERING TITLE BLOCK                            */}
          {/* ============================================================== */}
          <g transform="translate(680, 580)">
            <rect x="0" y="0" width="300" height="65" fill="#0f172a" stroke="#334155" strokeWidth="1.5" rx="2" />
            <line x1="0" y1="20" x2="300" y2="20" stroke="#334155" strokeWidth="1" />
            <line x1="0" y1="42" x2="300" y2="42" stroke="#334155" strokeWidth="1" />
            <line x1="150" y1="0" x2="150" y2="65" stroke="#334155" strokeWidth="1" />

            <text x="8" y="14" fill="#94a3b8" fontSize="8">DWG NO: PE-SIM-SS-001</text>
            <text x="158" y="14" fill="#94a3b8" fontSize="8">REV: B (2026-STD)</text>

            <text x="8" y="33" fill="#ffffff" fontSize="9" fontWeight="bold">TITLE: 3-Phase Soft Starter SLD</text>

            <text x="8" y="54" fill="#94a3b8" fontSize="8">STD: IEC 60947-4-2 / IEEE 315</text>
            <text x="158" y="54" fill="#38bdf8" fontSize="8" fontWeight="bold">DRAWN BY: PowerElectronics Lab</text>
          </g>
        </svg>
      </div>
    </div>
  );
};

