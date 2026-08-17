import React, { useState, useRef, useEffect } from 'react';
import { SoftStarterFaults, SoftStarterParams, SoftStarterReadouts } from '../types/softStarter';
import { Zap, Activity, ShieldCheck, Flame, Gauge, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface SoftStarterSLDProps {
  mccbClosed: boolean;
  onToggleMCCB: () => void;
  onToggleBypass?: () => void;
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
  MCCB: { name: 'Main Line Circuit Breaker (52-MCCB)', rating: '400A 35kA Icu, 3-Pole Motor Protection', standard: 'IEC 60947-2 / IEEE C37.2-52' },
  KM1: { name: 'AC-3 Bypass Contactor (KM1)', rating: '300A 415V Continuous Duty', standard: 'IEC 60947-4-1' },
  SCR: { name: '6× Back-to-Back SCRs (T1-T6)', rating: '1600V / 500A Phase-Angle Controlled', standard: 'IEC 60947-4-2' },
  CT: { name: '3-Phase Current Transformers (CT1-CT3)', rating: '400/5A Class 0.5M', standard: 'IEC 61869-2' },
  MOTOR: { name: '3-Phase Squirrel Cage Motor', rating: '415V 160kW 4-Pole 269A FLA', standard: 'IEC 60034-1' },
  LOAD: { name: 'Mechanical Centrifugal Load', rating: '45m Head, 120 m³/h Nominal Flow', standard: 'ISO 5199 / API 610' },
};

export const SoftStarterSLD: React.FC<SoftStarterSLDProps> = ({
  mccbClosed,
  onToggleMCCB,
  onToggleBypass,
  isRunning,
  isTrip,
  params,
  readouts,
  faults,
  onToggleSuctionValve,
  onToggleDischargeValve,
}) => {
  const [hovered, setHovered] = useState<string | null>(null);

  // Zoom & Pan State for SLD Canvas
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Animation cycle for electron flow dots
  const [flowOffset, setFlowOffset] = useState<number>(0);

  // Electrical Conduction States
  const mainsPowered = mccbClosed;
  const isScrConducting = mainsPowered && isRunning && !readouts.bypassClosed && !isTrip;
  const isBypassConducting = mainsPowered && isRunning && readouts.bypassClosed && !isTrip;
  const isMotorPowered = mainsPowered && (isScrConducting || isBypassConducting);

  // Stator Current Calculation (269A FLA Nominal for 160kW 415V motor)
  const currentAmps = Math.round((readouts.motorCurrentFLA / 100) * 269);
  const firingAngle = readouts.firingAngleDeg ?? (readouts.bypassClosed ? 0 : isRunning ? 67 : 180);

  // Dot speed proportional to stator current (0 when stopped, fast when full load)
  const currentRatio = isMotorPowered ? Math.max(0.1, readouts.motorCurrentFLA / 100) : 0;

  useEffect(() => {
    let animId: number;
    const animateFlow = () => {
      if (currentRatio > 0) {
        setFlowOffset((prev) => (prev + currentRatio * 2.5) % 40);
      }
      animId = requestAnimationFrame(animateFlow);
    };
    animId = requestAnimationFrame(animateFlow);
    return () => cancelAnimationFrame(animId);
  }, [currentRatio]);

  // Zoom / Pan Control Handlers
  const handleZoomIn = () => setZoomScale((prev) => Math.min(2.5, prev + 0.2));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(0.8, prev - 0.2));
  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoomScale((prev) => Math.min(2.5, Math.max(0.8, prev + delta)));
  };

  // Helper: Interactive 52-MCCB Breaker with 44px Touch Target & Arc Animation
  const renderInteractiveMCCB = (x: number, y: number) => {
    const isClosed = mccbClosed;
    const isHovered = hovered === 'MCCB';
    const stateColor = isClosed ? '#00e5a0' : '#ff4d4d';

    return (
      <g
        className="cursor-pointer group"
        onClick={(e) => {
          e.stopPropagation();
          onToggleMCCB();
        }}
        onMouseEnter={() => setHovered('MCCB')}
        onMouseLeave={() => setHovered(null)}
      >
        {/* 44px Touch Target Hitbox */}
        <rect
          x={x - 120}
          y={y - 10}
          width={240}
          height={60}
          fill={isHovered ? '#162235' : '#0d131f'}
          rx={8}
          stroke={isHovered ? '#00e5a0' : isClosed ? '#00e5a0' : '#f59e0b'}
          strokeWidth={isHovered ? 2 : 1.2}
          className="transition-colors duration-200"
        />

        {/* Vertical Conductor Line Top/Bottom */}
        <line x1={x - 70} y1={y - 10} x2={x - 70} y2={y + 10} stroke="#38bdf8" strokeWidth={3} />
        <line x1={x - 70} y1={y + 36} x2={x - 70} y2={y + 50} stroke="#38bdf8" strokeWidth={3} />

        {/* Fixed Top Contact Point */}
        <circle cx={x - 70} cy={y + 10} r={4} fill="#f8fafc" stroke="#38bdf8" strokeWidth={1} />
        {/* Bottom Pivot Point */}
        <circle cx={x - 70} cy={y + 36} r={4} fill="#f8fafc" stroke="#38bdf8" strokeWidth={1} />

        {/* Animated Contact Blade with Arc Transition */}
        <g transform={`translate(${x - 70}, ${y + 36})`}>
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="-26"
            stroke={stateColor}
            strokeWidth={3.5}
            strokeLinecap="round"
            style={{
              transformOrigin: '0px 0px',
              transform: isClosed ? 'rotate(0deg)' : 'rotate(-32deg)',
              transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </g>

        {/* Arc Path Animation Overlay */}
        {!isClosed && (
          <path
            d={`M ${x - 70} ${y + 10} A 26 26 0 0 0 ${x - 70 - 14} ${y + 14}`}
            fill="none"
            stroke="#ff4d4d"
            strokeWidth="1.5"
            strokeDasharray="2 2"
            opacity="0.7"
          />
        )}

        {/* Device Code Tag */}
        <rect x={x - 110} y={y + 10} width={28} height={20} rx={4} fill="#1e293b" stroke="#38bdf8" strokeWidth={1} />
        <text x={x - 96} y={y + 24} textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">
          52
        </text>

        {/* Label & Subtitle */}
        <text x={x - 35} y={y + 18} fill="#ffffff" fontSize="11" fontWeight="bold">
          52-MCCB Line Breaker
        </text>
        <text x={x - 35} y={y + 32} fill="#94a3b8" fontSize="9" fontFamily="monospace">
          400A 35kA • {isClosed ? 'CLOSED (415V ON)' : 'OPEN (ISOLATED)'}
        </text>

        {/* Tappable Badge Button */}
        <rect
          x={x + 45}
          y={y + 8}
          width={65}
          height={24}
          rx={6}
          fill={isClosed ? '#00e5a0' : '#ef4444'}
          className="transition-colors duration-200 cursor-pointer shadow-md"
        />
        <text x={x + 77} y={y + 24} textAnchor="middle" fill="#070a10" fontSize={10} fontWeight="extrabold">
          {isClosed ? 'OPEN' : 'CLOSE'}
        </text>
      </g>
    );
  };

  // Helper: Interactive Bypass Contactor KM1 with Arc Animation
  const renderInteractiveBypassKM1 = (x: number, y: number) => {
    const isClosed = readouts.bypassClosed;
    const isHovered = hovered === 'KM1';

    return (
      <g
        className="cursor-pointer group"
        onClick={(e) => {
          e.stopPropagation();
          if (onToggleBypass) onToggleBypass();
        }}
        onMouseEnter={() => setHovered('KM1')}
        onMouseLeave={() => setHovered(null)}
      >
        {/* 44px+ Hitbox Container */}
        <rect
          x={x - 65}
          y={y}
          width={130}
          height={80}
          fill={isHovered ? '#162235' : '#0d131f'}
          stroke={isClosed ? '#00e5a0' : isHovered ? '#38bdf8' : '#1e293b'}
          strokeWidth={isClosed ? 2.5 : 1.5}
          rx={8}
          className="transition-colors duration-200"
        />
        <text x={x} y={y + 18} textAnchor="middle" fill={isClosed ? '#00e5a0' : '#94a3b8'} fontSize="10" fontWeight="bold">
          BYPASS CONTACTOR KM1
        </text>

        {/* 3 Contactor Poles with Rotating Blade Arc Animations */}
        {[-30, 0, 30].map((offsetX, idx) => (
          <g key={idx} transform={`translate(${x + offsetX}, ${y + 32})`}>
            {/* Top & Bottom Terminal Dots */}
            <circle cx="0" cy="0" r="3" fill="#ffffff" />
            <circle cx="0" cy="24" r="3" fill="#ffffff" />

            {/* Rotating Contact Arm */}
            <line
              x1="0"
              y1="24"
              x2="0"
              y2="0"
              stroke={isClosed ? '#00e5a0' : '#ef4444'}
              strokeWidth={3}
              strokeLinecap="round"
              style={{
                transformOrigin: '0px 24px',
                transform: isClosed ? 'rotate(0deg)' : 'rotate(35deg)',
                transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          </g>
        ))}

        {/* Status Badge */}
        <rect
          x={x - 45}
          y={y + 60}
          width={90}
          height={16}
          rx={4}
          fill={isClosed ? '#00e5a0' : '#1e293b'}
        />
        <text x={x} y={y + 72} textAnchor="middle" fill={isClosed ? '#070a10' : '#94a3b8'} fontSize="8" fontWeight="bold">
          {isClosed ? 'KM1 CLOSED (BYPASSED)' : 'TAP TO TOGGLE KM1'}
        </text>
      </g>
    );
  };

  // Helper: Interactive Hydraulic Valve with 90° Arc Rotation
  const renderInteractiveValve = (
    x: number,
    y: number,
    id: string,
    title: string,
    isOpen: boolean,
    onToggle: () => void
  ) => {
    const isHovered = hovered === id;

    return (
      <g
        className="cursor-pointer group"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        onMouseEnter={() => setHovered(id)}
        onMouseLeave={() => setHovered(null)}
      >
        {/* 44px Touch Target Card */}
        <rect
          x={x - 85}
          y={y - 8}
          width={170}
          height={48}
          rx={6}
          fill={isHovered ? '#162235' : isOpen ? '#064e3b' : '#451a1a'}
          stroke={isOpen ? '#00e5a0' : '#ef4444'}
          strokeWidth={isHovered ? 2 : 1.2}
          className="transition-colors duration-200"
        />

        {/* Rotating Valve Handle Symbol */}
        <g transform={`translate(${x - 55}, ${y + 16})`}>
          <circle cx="0" cy="0" r="10" fill="none" stroke={isOpen ? '#00e5a0' : '#ef4444'} strokeWidth="2" />
          <line
            x1="-10"
            y1="0"
            x2="10"
            y2="0"
            stroke={isOpen ? '#00e5a0' : '#ef4444'}
            strokeWidth="2.5"
            style={{
              transformOrigin: '0px 0px',
              transform: isOpen ? 'rotate(0deg)' : 'rotate(90deg)',
              transition: 'transform 0.4s ease-out',
            }}
          />
        </g>

        {/* Text Details */}
        <text x={x - 35} y={y + 12} fill="#ffffff" fontSize="10" fontWeight="bold">
          {title}
        </text>
        <text x={x - 35} y={y + 26} fill={isOpen ? '#00e5a0' : '#f87171'} fontSize="9" fontWeight="extrabold">
          {isOpen ? 'OPEN (100% FLOW)' : 'CLOSED (0% FLOW)'}
        </text>
      </g>
    );
  };

  return (
    <div className="w-full bg-[#070a10] border border-[#1e293b] rounded-2xl p-4 shadow-2xl flex flex-col gap-4 font-mono select-none text-xs">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#00e5a0]/10 border border-[#00e5a0]/30 rounded-xl text-[#00e5a0]">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <span>3-PHASE SOFT STARTER TOPOLOGY (415V 160kW)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00e5a0]/20 text-[#00e5a0] border border-[#00e5a0]/40">
                269A FLA
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Interactive Full-Bleed SLD • Dual-Path Thyristor Ramp & Automatic KM1 Bypass
            </p>
          </div>
        </div>

        {/* STATUS & ZOOM CONTROLS */}
        <div className="flex items-center gap-2">
          {/* Zoom Buttons */}
          <div className="flex items-center bg-[#0d131f] border border-[#1e293b] rounded-lg p-1 gap-1">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-1 hover:bg-[#1e293b] rounded text-slate-300 hover:text-white cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-1 hover:bg-[#1e293b] rounded text-slate-300 hover:text-white cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Reset Zoom"
              className="p-1 hover:bg-[#1e293b] rounded text-slate-300 hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 ${
              isTrip
                ? 'bg-red-950/80 border-red-500 text-red-300 animate-pulse'
                : isRunning
                ? readouts.bypassClosed
                  ? 'bg-emerald-950/80 border-[#00e5a0] text-[#00e5a0]'
                  : 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse'
                : 'bg-[#0d131f] border-[#1e293b] text-slate-400'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>
              {isTrip
                ? 'TRIPPED'
                : isRunning
                ? readouts.bypassClosed
                  ? 'KM1 BYPASS RUNNING (100% V)'
                  : `RAMPING (α = ${firingAngle}°)`
                : 'STOPPED (415V BUS / 0V MOTOR)'}
            </span>
          </div>
        </div>
      </div>

      {/* HOVER TOOLTIP FLOATING DISPLAY */}
      {hovered && TOOLTIPS[hovered] && (
        <div className="absolute top-20 right-6 bg-[#0d131f] border border-[#00e5a0]/60 rounded-xl p-3 shadow-2xl z-30 pointer-events-none text-xs max-w-xs backdrop-blur-md">
          <div className="font-bold text-[#00e5a0] mb-1">{TOOLTIPS[hovered].name}</div>
          <div className="text-slate-300 mb-1">
            Rating: <span className="text-amber-400 font-bold">{TOOLTIPS[hovered].rating}</span>
          </div>
          <div className="text-slate-500 text-[10px]">Standard: {TOOLTIPS[hovered].standard}</div>
        </div>
      )}

      {/* MAIN FULL-BLEED SVG CONTAINER WITH ZOOM & PAN GESTURES */}
      <div
        className={`relative w-full bg-[#04060a] border border-[#1e293b] rounded-xl overflow-hidden cursor-${
          isDragging ? 'grabbing' : 'grab'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
            transformOrigin: '50% 50%',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <svg viewBox="0 0 1000 660" className="w-full h-auto select-none">
            <defs>
              {/* Background Grid Pattern */}
              <pattern id="ssGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#121a29" strokeWidth="0.8" />
              </pattern>

              {/* Glowing Filters */}
              <filter id="neonGreenGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="thyristorGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="1.5" />
                </feComponentTransfer>
                <feComposite in="SourceGraphic" operator="over" />
              </filter>
            </defs>

            {/* Background Canvas */}
            <rect width="1000" height="660" fill="#04060a" />
            <rect width="1000" height="660" fill="url(#ssGrid)" />
            <rect x="8" y="8" width="984" height="644" fill="none" stroke="#1e293b" strokeWidth="2" rx="12" />

            {/* ============================================================== */}
            {/* 1. 3-PHASE UTILITY MAINS BUSBAR (415V 50Hz)                    */}
            {/* ============================================================== */}
            <g transform="translate(300, 35)">
              <line x1="-140" y1="0" x2="140" y2="0" stroke="#38bdf8" strokeWidth="6" />
              <line x1="-140" y1="-4" x2="140" y2="-4" stroke="#f59e0b" strokeWidth="2" />
              <line x1="-140" y1="4" x2="140" y2="4" stroke="#ef4444" strokeWidth="2" />

              {/* Hash marks /// */}
              <line x1="-10" y1="-12" x2="-18" y2="12" stroke="#ffffff" strokeWidth="2" />
              <line x1="-5" y1="-12" x2="-13" y2="12" stroke="#ffffff" strokeWidth="2" />
              <line x1="0" y1="-12" x2="-8" y2="12" stroke="#ffffff" strokeWidth="2" />

              <text x="0" y="-18" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="black">
                3~ 415V 50Hz UTILITY MAINS BUSBAR
              </text>
            </g>

            {/* ============================================================== */}
            {/* 2. UPSTREAM POWER FLOW CONDUCTOR (BUS TO MCCB)                 */}
            {/* ============================================================== */}
            <line x1="300" y1="35" x2="300" y2="75" stroke={mainsPowered ? '#38bdf8' : '#1e293b'} strokeWidth="4" />
            {mainsPowered && (
              <line x1="300" y1="35" x2="300" y2="75" stroke="#7dd3fc" strokeWidth="2.5" strokeDasharray="6,6" />
            )}

            {/* ============================================================== */}
            {/* 3. MAIN INCOMING CIRCUIT BREAKER (52-MCCB) TAPPABLE ON SLD     */}
            {/* ============================================================== */}
            <g transform="translate(300, 75)">{renderInteractiveMCCB(0, 0)}</g>

            {/* Conductor from MCCB to Split Node */}
            <line x1="300" y1="125" x2="300" y2="185" stroke={mainsPowered ? '#38bdf8' : '#1e293b'} strokeWidth="4" />

            {/* ============================================================== */}
            {/* 4. SOFT STARTER CUBICLE ENCLOSURE                              */}
            {/* ============================================================== */}
            <g transform="translate(130, 185)">
              <rect
                x="0"
                y="0"
                width="340"
                height="240"
                fill="#0b1019"
                fillOpacity="0.85"
                stroke="#1e293b"
                strokeWidth="2"
                rx="12"
              />
              <text x="16" y="22" fill="#00e5a0" fontSize="10" fontWeight="bold">
                3-PHASE THYRISTOR SOFT STARTER (IEC 60947-4-2)
              </text>

              {/* Firing Angle Badge */}
              <g transform="translate(190, 10)">
                <rect x="0" y="0" width="135" height="24" rx="6" fill="#162235" stroke="#00e5a0" strokeWidth="1" />
                <text x="67" y="16" textAnchor="middle" fill="#00e5a0" fontSize="9" fontWeight="bold">
                  FIRING α: {firingAngle}° ({readouts.outputVoltagePct.toFixed(0)}% V)
                </text>
              </g>
            </g>

            {/* Split Node */}
            <circle cx="300" cy="195" r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />

            {/* ============================================================== */}
            {/* 5. DUAL POWER BRANCH CONDUCTOR PATHS                           */}
            {/*    BRANCH A (LEFT): 6× SCR THYRISTOR BRIDGE                     */}
            {/*    BRANCH B (RIGHT): BYPASS CONTACTOR KM1                      */}
            {/* ============================================================== */}

            {/* Branch A Base Lines */}
            <path d="M 300 195 L 210 195 L 210 225" fill="none" stroke="#1e293b" strokeWidth="4" />
            <path d="M 210 375 L 210 405 L 300 405" fill="none" stroke="#1e293b" strokeWidth="4" />

            {/* Branch B Base Lines */}
            <path d="M 300 195 L 390 195 L 390 260" fill="none" stroke="#1e293b" strokeWidth="4" />
            <path d="M 390 340 L 390 405 L 300 405" fill="none" stroke="#1e293b" strokeWidth="4" />

            {/* Branch A Animated SCR Conduction Path */}
            {isScrConducting && (
              <>
                <path
                  d="M 300 195 L 210 195 L 210 225"
                  fill="none"
                  stroke="#ff9900"
                  strokeWidth="4"
                  filter="url(#thyristorGlow)"
                />
                <path
                  d="M 210 375 L 210 405 L 300 405"
                  fill="none"
                  stroke="#ff9900"
                  strokeWidth="4"
                  filter="url(#thyristorGlow)"
                />
              </>
            )}

            {/* Branch B Animated Bypass Conduction Path */}
            {isBypassConducting && (
              <>
                <path
                  d="M 300 195 L 390 195 L 390 260"
                  fill="none"
                  stroke="#00e5a0"
                  strokeWidth="4.5"
                  filter="url(#neonGreenGlow)"
                />
                <path
                  d="M 390 340 L 390 405 L 300 405"
                  fill="none"
                  stroke="#00e5a0"
                  strokeWidth="4.5"
                  filter="url(#neonGreenGlow)"
                />
              </>
            )}

            {/* REAL PHYSICS ANIMATION: ELECTRON FLOW DOTS ALONG POWER PATH */}
            {isMotorPowered && (
              <>
                {/* Upstream dots */}
                <circle cx="300" cy={35 + (flowOffset % 40)} r="3.5" fill="#ffffff" />
                <circle cx="300" cy={125 + (flowOffset % 60)} r="3.5" fill="#ffffff" />

                {/* Branch dots */}
                {isScrConducting && (
                  <>
                    <circle cx={300 - (flowOffset % 90)} cy="195" r="3.5" fill="#ffea00" />
                    <circle cx="210" cy={225 + (flowOffset % 150)} r="3.5" fill="#ffea00" />
                    <circle cx="210" cy={375 + (flowOffset % 30)} r="3.5" fill="#ffea00" />
                  </>
                )}

                {isBypassConducting && (
                  <>
                    <circle cx={300 + (flowOffset % 90)} cy="195" r="3.5" fill="#00e5a0" />
                    <circle cx="390" cy={260 + (flowOffset % 80)} r="3.5" fill="#00e5a0" />
                    <circle cx="390" cy={340 + (flowOffset % 65)} r="3.5" fill="#00e5a0" />
                  </>
                )}

                {/* Downstream dots */}
                <circle cx="300" cy={405 + (flowOffset % 95)} r="3.5" fill={isBypassConducting ? '#00e5a0' : '#ffea00'} />
              </>
            )}

            {/* --- BRANCH A: 6× SCR THYRISTORS MODULE WITH GLOW EFFECT --- */}
            <g
              transform="translate(210, 225)"
              onMouseEnter={() => setHovered('SCR')}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <rect
                x="-65"
                y="0"
                width="130"
                height="150"
                fill="#0d131f"
                stroke={isScrConducting ? '#ff9900' : '#1e293b'}
                strokeWidth={isScrConducting ? 2.5 : 1.5}
                rx="8"
                filter={isScrConducting ? 'url(#thyristorGlow)' : undefined}
              />
              <text x="0" y="18" textAnchor="middle" fill={isScrConducting ? '#ff9900' : '#94a3b8'} fontSize="10" fontWeight="bold">
                6× THYRISTOR SCRs
              </text>

              {/* SCR Symbol Displays */}
              {[-10, 25, 60].map((posY, idx) => (
                <g key={idx} transform={`translate(0, ${posY + 30})`}>
                  <line x1="-35" y1="0" x2="35" y2="0" stroke={isScrConducting ? '#ff9900' : '#64748b'} strokeWidth="2" />
                  <polygon
                    points="-12,-8 4,-8 -4,2"
                    fill={isScrConducting ? '#ff9900' : '#334155'}
                    stroke={isScrConducting ? '#ffea00' : '#64748b'}
                    strokeWidth="1.5"
                  />
                  <polygon
                    points="12,8 -4,8 4,-2"
                    fill={isScrConducting ? '#ff9900' : '#334155'}
                    stroke={isScrConducting ? '#ffea00' : '#64748b'}
                    strokeWidth="1.5"
                  />
                </g>
              ))}

              <text
                x="0"
                y="138"
                textAnchor="middle"
                fill={isScrConducting ? '#ffea00' : '#64748b'}
                fontSize="8"
                fontWeight="bold"
              >
                {isScrConducting ? `FIRING (α = ${firingAngle}°)` : 'STANDBY'}
              </text>
            </g>

            {/* --- BRANCH B: AC-3 BYPASS CONTACTOR KM1 TAPPABLE ON SLD --- */}
            <g transform="translate(390, 260)">{renderInteractiveBypassKM1(0, 0)}</g>

            {/* Merge Node */}
            <circle cx="300" cy="405" r="5" fill={isMotorPowered ? (isBypassConducting ? '#00e5a0' : '#ff9900') : '#1e293b'} stroke="#ffffff" strokeWidth="2" />

            {/* ============================================================== */}
            {/* 6. DOWNSTREAM CONTINUOUS POWER FLOW TO MOTOR                   */}
            {/* ============================================================== */}
            <line
              x1="300"
              y1="405"
              x2="300"
              y2="500"
              stroke={isMotorPowered ? (isBypassConducting ? '#00e5a0' : '#ff9900') : '#1e293b'}
              strokeWidth="4"
            />

            {/* CT Instrument Box */}
            <g transform="translate(300, 440)" onMouseEnter={() => setHovered('CT')} onMouseLeave={() => setHovered(null)}>
              <rect x="-55" y="-12" width="110" height="28" fill="#0d131f" stroke="#38bdf8" strokeWidth="1.2" rx="6" />
              <circle cx="-22" cy="2" r="7" fill="none" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="0" cy="2" r="7" fill="none" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="22" cy="2" r="7" fill="none" stroke="#38bdf8" strokeWidth="2" />
              <text x="0" y="-16" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
                3× CTs (Relays 50/51/49)
              </text>
            </g>

            {/* Relay 49/51 Symbol */}
            <g transform="translate(300, 475)">
              <rect x="-18" y="-10" width="36" height="20" fill="#0d131f" stroke="#f59e0b" strokeWidth="1.5" rx="3" />
              <path d="M -12 -5 L 0 5 L 12 -5" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="24" y="4" fill="#f59e0b" fontSize="8" fontWeight="bold">
                49/51
              </text>
            </g>

            {/* ============================================================== */}
            {/* 7. 3-PHASE SQUIRREL CAGE INDUCTION MOTOR (160kW 415V 269A FLA)   */}
            {/* ============================================================== */}
            <g
              transform="translate(300, 540)"
              onMouseEnter={() => setHovered('MOTOR')}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <circle
                cx="0"
                cy="0"
                r="36"
                fill="#0d131f"
                stroke={isTrip ? '#ef4444' : isMotorPowered ? '#00e5a0' : '#1e293b'}
                strokeWidth="4"
                filter={isMotorPowered ? 'url(#neonGreenGlow)' : undefined}
              />
              <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="black">
                M
              </text>
              <text x="0" y="18" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">
                3~
              </text>

              {/* Motor Live Telemetry Labels */}
              <text x="50" y="-12" fill="#ffffff" fontSize="12" fontWeight="bold">
                160kW 415V Motor
              </text>
              <text x="50" y="6" fill="#00e5a0" fontSize="12" fontWeight="extrabold">
                {Math.round(readouts.motorSpeedRPM)} RPM ({((readouts.motorSpeedRPM / 1480) * 100).toFixed(1)}%)
              </text>
              <text x="50" y="24" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                I_stat: {currentAmps} A ({readouts.motorCurrentFLA.toFixed(0)}% FLA)
              </text>

              {/* Earth / Ground Connection */}
              <line x1="0" y1="36" x2="0" y2="52" stroke="#00e5a0" strokeWidth="2" />
              <g transform="translate(0, 52)">
                <line x1="-10" y1="0" x2="10" y2="0" stroke="#00e5a0" strokeWidth="2" />
                <line x1="-6" y1="3" x2="6" y2="3" stroke="#00e5a0" strokeWidth="2" />
                <line x1="-3" y1="6" x2="3" y2="6" stroke="#00e5a0" strokeWidth="2" />
              </g>
            </g>

            {/* Rotating Drive Shaft to Load */}
            <g transform="translate(336, 540)">
              <line x1="0" y1="0" x2="214" y2="0" stroke={isMotorPowered ? '#38bdf8' : '#1e293b'} strokeWidth="5" />
              {isMotorPowered && (
                <line x1="0" y1="0" x2="214" y2="0" stroke="#00e5a0" strokeWidth="2.5" strokeDasharray="8,6" />
              )}
              <g transform="translate(107, 0)">
                <rect x="-6" y="-12" width="12" height="24" fill="#162235" stroke="#38bdf8" strokeWidth="1.5" rx="3" />
                <text x="0" y="-16" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
                  COUPLING
                </text>
              </g>
            </g>

            {/* ============================================================== */}
            {/* 8. MECHANICAL LOAD & HYDRAULIC VALVES TAPPABLE ON SLD           */}
            {/* ============================================================== */}
            <g transform="translate(550, 460)" onMouseEnter={() => setHovered('LOAD')} onMouseLeave={() => setHovered(null)}>
              <rect
                x="0"
                y="0"
                width="430"
                height="160"
                fill={isTrip ? '#3b0a0a' : '#0d131f'}
                stroke={isTrip ? '#ef4444' : '#1e293b'}
                strokeWidth={isTrip ? 2.5 : 1.5}
                rx="10"
              />

              <text x="15" y="24" fill={isTrip ? '#f87171' : '#00e5a0'} fontSize="11" fontWeight="bold">
                {isTrip ? '🚨 MECHANICAL LOAD TRIPPED' : `DRIVEN EQUIPMENT: CENTRIFUGAL PUMP (45m HEAD)`}
              </text>

              {!isTrip && (
                <g transform="translate(15, 36)">
                  {/* Suction Valve Button Tappable ON SLD */}
                  <g transform="translate(0, 0)">
                    {renderInteractiveValve(
                      85,
                      0,
                      'SUCTION_VALVE',
                      'PUMP SUCTION VALVE',
                      readouts.suctionValveOpen,
                      onToggleSuctionValve
                    )}
                  </g>

                  {/* Discharge Valve Button Tappable ON SLD */}
                  <g transform="translate(210, 0)">
                    {renderInteractiveValve(
                      85,
                      0,
                      'DISCHARGE_VALVE',
                      'PUMP DISCHARGE VALVE',
                      readouts.dischargeValveOpen,
                      onToggleDischargeValve
                    )}
                  </g>

                  {/* Real-time Hydraulic Readouts */}
                  <g transform="translate(0, 50)">
                    <rect x="0" y="0" width="400" height="52" fill="#04060a" rx="8" stroke="#1e293b" strokeWidth="1" />
                    <text x="15" y="20" fill="#94a3b8" fontSize="10">
                      HYDRAULIC HEAD PRESSURE:
                    </text>
                    <text x="15" y="38" fill="#00e5a0" fontSize="14" fontWeight="extrabold">
                      {readouts.pumpHeadMeters.toFixed(1)} m H₂O
                    </text>

                    <text x="210" y="20" fill="#94a3b8" fontSize="10">
                      VOLUMETRIC FLOW RATE:
                    </text>
                    <text x="210" y="38" fill="#38bdf8" fontSize="14" fontWeight="extrabold">
                      {readouts.pumpFlowM3H.toFixed(1)} m³/h
                    </text>
                  </g>
                </g>
              )}
            </g>

            {/* ============================================================== */}
            {/* 9. REAL-TIME 3-PHASE METRICS DASHBOARD (TOP RIGHT)              */}
            {/* ============================================================== */}
            <g transform="translate(550, 35)">
              <rect x="0" y="0" width="430" height="405" fill="#0d131f" stroke="#1e293b" strokeWidth="1.5" rx="10" />

              <text x="16" y="24" fill="#00e5a0" fontSize="11" fontWeight="bold">
                📊 LIVE TELEMETRY: 415V LINE / MOTOR VOLTAGE & 269A FLA
              </text>

              {/* Voltages Display */}
              <g transform="translate(15, 38)">
                <rect x="0" y="0" width="400" height="115" fill="#04060a" rx="8" stroke="#1e293b" strokeWidth="1" />
                <text x="12" y="18" fill="#ffffff" fontSize="10" fontWeight="bold">
                  PHASE VOLTAGES (415V NOMINAL INPUT / MOTOR OUTPUT)
                </text>

                {[
                  { label: 'V_A', color: '#00f0ff', val: (415 * (readouts.outputVoltagePct / 100)).toFixed(0) },
                  { label: 'V_B', color: '#f59e0b', val: (415 * (readouts.outputVoltagePct / 100)).toFixed(0) },
                  { label: 'V_C', color: '#f43f5e', val: (415 * (readouts.outputVoltagePct / 100)).toFixed(0) },
                ].map((ph, idx) => (
                  <g key={ph.label} transform={`translate(12, ${30 + idx * 24})`}>
                    <text x="0" y="12" fill={ph.color} fontSize="10" fontWeight="bold">
                      {ph.label}: {ph.val} V
                    </text>
                    <rect x="70" y="4" width="300" height="10" fill="#121a29" rx="3" />
                    <rect
                      x="70"
                      y="4"
                      width={(300 * readouts.outputVoltagePct) / 100}
                      height="10"
                      fill={ph.color}
                      rx="3"
                    />
                  </g>
                ))}
              </g>

              {/* Stator Currents Display */}
              <g transform="translate(15, 165)">
                <rect x="0" y="0" width="400" height="115" fill="#04060a" rx="8" stroke="#1e293b" strokeWidth="1" />
                <text x="12" y="18" fill="#ffffff" fontSize="10" fontWeight="bold">
                  STATOR CURRENTS (269A NOMINAL FLA)
                </text>

                {[
                  { label: 'I_A', color: '#00f0ff', amps: currentAmps },
                  { label: 'I_B', color: '#f59e0b', amps: currentAmps },
                  { label: 'I_C', color: '#f43f5e', amps: currentAmps },
                ].map((ph, idx) => (
                  <g key={ph.label} transform={`translate(12, ${30 + idx * 24})`}>
                    <text x="0" y="12" fill={ph.color} fontSize="10" fontWeight="bold">
                      {ph.label}: {ph.amps} A
                    </text>
                    <rect x="70" y="4" width="300" height="10" fill="#121a29" rx="3" />
                    <rect
                      x="70"
                      y="4"
                      width={Math.min(300, (300 * readouts.motorCurrentFLA) / 300)}
                      height="10"
                      fill={ph.color}
                      rx="3"
                    />
                  </g>
                ))}
              </g>

              {/* Status Summary */}
              <g transform="translate(15, 290)">
                <rect x="0" y="0" width="400" height="100" fill="#04060a" rx="8" stroke="#1e293b" strokeWidth="1" />
                <text x="12" y="18" fill="#94a3b8" fontSize="10" fontWeight="bold">
                  OPERATIONAL PARAMETERS & PROTECTION STATUS
                </text>

                <g transform="translate(12, 30)">
                  <text x="0" y="12" fill="#94a3b8" fontSize="10">
                    Mode: <tspan fill="#00e5a0" fontWeight="bold">{params.startMode}</tspan>
                  </text>
                  <text x="210" y="12" fill="#94a3b8" fontSize="10">
                    Initial Ramp V: <tspan fill="#f59e0b" fontWeight="bold">{params.initialVoltagePct}% (166V)</tspan>
                  </text>

                  <text x="0" y="32" fill="#94a3b8" fontSize="10">
                    Ramp Time: <tspan fill="#ffffff" fontWeight="bold">{params.rampTimeSec}s</tspan>
                  </text>
                  <text x="210" y="32" fill="#94a3b8" fontSize="10">
                    Current Limit: <tspan fill="#ef4444" fontWeight="bold">{params.currentLimitPct}% (807A)</tspan>
                  </text>

                  <text x="0" y="52" fill="#94a3b8" fontSize="10">
                    KM1 Bypass State:{' '}
                    <tspan fill={readouts.bypassClosed ? '#00e5a0' : '#f59e0b'} fontWeight="extrabold">
                      {readouts.bypassClosed ? 'CLOSED (BYPASSED)' : 'OPEN (RAMPING)'}
                    </tspan>
                  </text>
                </g>
              </g>
            </g>

            {/* ============================================================== */}
            {/* 10. TITLE BLOCK                                                 */}
            {/* ============================================================== */}
            <g transform="translate(680, 580)">
              <rect x="0" y="0" width="300" height="65" fill="#0d131f" stroke="#1e293b" strokeWidth="1.5" rx="4" />
              <line x1="0" y1="20" x2="300" y2="20" stroke="#1e293b" strokeWidth="1" />
              <line x1="0" y1="42" x2="300" y2="42" stroke="#1e293b" strokeWidth="1" />
              <line x1="150" y1="0" x2="150" y2="65" stroke="#1e293b" strokeWidth="1" />

              <text x="8" y="14" fill="#94a3b8" fontSize="8">DWG: PE-SIM-SS-001</text>
              <text x="158" y="14" fill="#94a3b8" fontSize="8">REV: C (2026-STD)</text>

              <text x="8" y="33" fill="#ffffff" fontSize="9" fontWeight="bold">TITLE: 3-Phase Soft Starter SLD</text>

              <text x="8" y="54" fill="#94a3b8" fontSize="8">STD: IEC 60947-4-2 / IEEE 315</text>
              <text x="158" y="54" fill="#00e5a0" fontSize="8" fontWeight="bold">PowerElectronics Lab</text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
