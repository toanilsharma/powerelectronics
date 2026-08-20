import React, { useState } from 'react';
import { SoftStarterFaults, SoftStarterParams, SoftStarterReadouts } from '../types/softStarter';
import { Zap, Activity, ZoomIn, ZoomOut, RotateCcw, Cpu, Gauge } from 'lucide-react';

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
  flashTargetComponent?: string | null;
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
  flashTargetComponent,
}) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [flashTarget, setFlashTarget] = useState<string | null>(null);
  const activeFlashTarget = flashTarget || flashTargetComponent;

  // Zoom & Pan State for SLD Canvas
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Electrical Conduction States
  const mainsPowered = mccbClosed;
  const isScrConducting = mainsPowered && isRunning && !readouts.bypassClosed && !isTrip;
  const isBypassConducting = mainsPowered && isRunning && readouts.bypassClosed && !isTrip;
  const isMotorPowered = mainsPowered && (isScrConducting || isBypassConducting);

  // Stator Current Calculation (269A FLA Nominal for 160kW 415V motor)
  const currentAmps = isMotorPowered
    ? readouts.bypassClosed
      ? Math.round((readouts.motorCurrentFLA / 100) * 269)
      : Math.round((readouts.motorCurrentFLA / 100) * 269) || 205
    : 0;

  const firingAngle = readouts.firingAngleDeg ?? (readouts.bypassClosed ? 0 : isRunning ? 67 : 180);

  // Electron Flow Velocity & Speed Multiplier (3x faster when ILIMIT 300% active or high current)
  const isILimitActive = isRunning && !readouts.bypassClosed && (params.currentLimitPct >= 300 || readouts.motorCurrentFLA >= 280);
  const speedMultiplier = isILimitActive ? 3.0 : 1.0;
  const flowSpeed = (currentAmps / 50) * speedMultiplier;

  // Thyristor Voltage Formula Physics
  // Vout = Vin * sqrt((PI - alpha + 0.5 * sin(2*alpha)) / PI)
  const nominalPhaseVoltage = mccbClosed ? 415 : 0;
  const alphaRad = (firingAngle * Math.PI) / 180;
  const vOutPhysicsRatio = Math.sqrt(Math.max(0, (Math.PI - alphaRad + 0.5 * Math.sin(2 * alphaRad)) / Math.PI));
  const calcVoutRMS = Math.round(nominalPhaseVoltage * vOutPhysicsRatio);

  // Torque & Hydraulic Pump Head Physics
  // Torque T = (V/100)^2
  const torquePct = Math.round(Math.pow(readouts.outputVoltagePct / 100, 2) * 100);
  // Pump Head H = 45m * (RPM / 1480)^2
  const pumpHeadMeters = (45 * Math.pow(readouts.motorSpeedRPM / 1480, 2)).toFixed(1);

  // Motor Rotor Spin Period in seconds
  const spinPeriodSec = readouts.motorSpeedRPM > 0 ? Math.max(0.12, 60 / readouts.motorSpeedRPM) : 0;

  const handleFlash = (target: string) => {
    setFlashTarget(target);
    setTimeout(() => setFlashTarget(null), 500);
  };

  const touchDistRef = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - touchDistRef.current) * 0.005;
      setZoomScale((prev) => Math.min(2.5, Math.max(0.8, prev + delta)));
      touchDistRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    touchDistRef.current = null;
  };

  // Zoom / Pan Control Handlers
  const handleZoomIn = () => setZoomScale((prev) => Math.min(2.5, prev + 0.2));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(0.8, prev - 0.2));
  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset((prev) => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY,
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoomScale((prev) => Math.min(2.5, Math.max(0.8, prev + delta)));
  };

  return (
    <div id="ss-sld" className="w-full bg-[#070a10] border border-[#1e293b] rounded-2xl p-4 shadow-2xl flex flex-col gap-4 font-mono select-none text-xs">
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
              Interactive Vector SLD • Real-time Thyristor Physics &amp; Dynamic KM1 Bypass
            </p>
          </div>
        </div>

        {/* STATUS & ZOOM CONTROLS */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0d131f] border border-[#1e293b] rounded-xl p-1 gap-1">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="w-[44px] h-[44px] flex items-center justify-center bg-[#121a29] hover:bg-[#1e293b] rounded-xl text-slate-200 hover:text-white cursor-pointer transition-colors border border-[#1e293b]"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="w-[44px] h-[44px] flex items-center justify-center bg-[#121a29] hover:bg-[#1e293b] rounded-xl text-slate-200 hover:text-white cursor-pointer transition-colors border border-[#1e293b]"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={handleResetZoom}
              title="Reset Zoom"
              className="w-[44px] h-[44px] flex items-center justify-center bg-[#121a29] hover:bg-[#1e293b] rounded-xl text-slate-200 hover:text-white cursor-pointer transition-colors border border-[#1e293b]"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          <div
            className={`px-3.5 py-1.5 min-h-[44px] rounded-xl text-xs font-extrabold border flex items-center gap-2 shadow-md ${
              isTrip
                ? 'bg-red-950/90 border-red-500 text-red-200 animate-pulse'
                : readouts.bypassClosed
                ? 'bg-emerald-950/90 border-[#00e5a0] text-[#00e5a0]'
                : isRunning
                ? 'bg-amber-950/90 border-amber-500 text-amber-300 animate-pulse'
                : 'bg-[#0d131f] border-[#1e293b] text-slate-400'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>
              {isTrip
                ? '🚨 MODE: PROTECTION TRIP OPERATED'
                : readouts.bypassClosed
                ? '⚡ MODE: MOTOR RUNNING ON BYPASS (CONTACTOR KM1)'
                : isRunning
                ? `🔥 MODE: MOTOR RUNNING ON SOFT STARTER (SCR RAMP: α = ${firingAngle}°, ${currentAmps}A)`
                : 'STOPPED (415V BUS / 0A MOTOR)'}
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

      {/* MAIN VECTOR SVG CONTAINER (Full Diagram Visible on Desktop/Laptops Without Scrolling) */}
      <div
        className={`relative w-full h-[520px] lg:h-[calc(100vh-175px)] lg:max-h-[580px] overflow-hidden bg-[#04060a] border border-[#1e293b] rounded-xl flex items-center justify-center cursor-${
          isDragging ? 'grabbing' : 'grab'
        }`}
        style={{ touchAction: 'pan-x pan-y' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
            transformOrigin: '50% 50%',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <svg id="sldSvg" viewBox="0 0 900 900" preserveAspectRatio="xMidYMid meet" className="w-full h-full select-none">
            <defs>
              <style>{`
                @keyframes flow {
                  from { stroke-dashoffset: 0; }
                  to { stroke-dashoffset: -24; }
                }
                @keyframes flashGlow {
                  0% { stroke: #ffbf00; fill: #ffbf00; filter: drop-shadow(0 0 14px #ffbf00); }
                  50% { stroke: #ffbf00; fill: #ffbf00; filter: drop-shadow(0 0 20px #ffbf00); }
                  100% { stroke: inherit; filter: none; }
                }
                @keyframes spinMotorRotor {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                .firing {
                  fill: #00e5a0 !important;
                  stroke: #00e5a0 !important;
                  filter: drop-shadow(0 0 8px #00e5a0) !important;
                }
                .blocking {
                  fill: #ef4444 !important;
                  stroke: #ff4d6d !important;
                  filter: drop-shadow(0 0 6px #ef4444) !important;
                }
                .bypassed-grey {
                  fill: #475569 !important;
                  stroke: #334155 !important;
                  filter: none !important;
                }
                .flash-active {
                  animation: flashGlow 0.5s ease-in-out;
                }
              `}</style>

              {/* Background Grid Pattern */}
              <pattern id="ssGrid900" width="30" height="30" patternUnits="userSpaceOnUse">
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
              <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="2.0" />
                </feComponentTransfer>
                <feComposite in="SourceGraphic" operator="over" />
              </filter>
            </defs>

            {/* Background Canvas */}
            <rect width="900" height="900" fill="#04060a" />
            <rect width="900" height="900" fill="url(#ssGrid900)" />
            <rect x="8" y="8" width="884" height="884" fill="none" stroke="#1e293b" strokeWidth="2" rx="12" />

            {/* ============================================================== */}
            {/* 1. 3-PHASE UTILITY MAINS BUSBAR (415V 50Hz)                    */}
            {/* ============================================================== */}
            <g transform="translate(250, 45)">
              <line x1="-190" y1="0" x2="190" y2="0" stroke="#38bdf8" strokeWidth="6" />
              <line x1="-190" y1="-4" x2="190" y2="-4" stroke="#f59e0b" strokeWidth="2" />
              <line x1="-190" y1="4" x2="190" y2="4" stroke="#ef4444" strokeWidth="2" />

              {/* Hash marks /// */}
              <line x1="-10" y1="-12" x2="-18" y2="12" stroke="#ffffff" strokeWidth="2" />
              <line x1="-5" y1="-12" x2="-13" y2="12" stroke="#ffffff" strokeWidth="2" />
              <line x1="0" y1="-12" x2="-8" y2="12" stroke="#ffffff" strokeWidth="2" />

              <text x="0" y="-16" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="black">
                3~ 415V 50Hz UTILITY MAINS BUSBAR
              </text>
            </g>

            {/* Downstream Conductor: Busbar to Breaker Q1 */}
            <line x1="250" y1="45" x2="250" y2="85" stroke={mainsPowered ? '#38bdf8' : '#1e293b'} strokeWidth="4" />

            {/* ============================================================== */}
            {/* 2. CLICKABLE GROUP: BREAKER <g id="q1" class="breaker">        */}
            {/* ============================================================== */}
            <g
              id="q1"
              className={`breaker cursor-pointer group ${mccbClosed ? 'closed' : 'open'} ${
                activeFlashTarget === 'q1' || faults.phaseLoss ? 'flash-active' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleFlash('q1');
                onToggleMCCB();
              }}
              onMouseEnter={() => setHovered('MCCB')}
              onMouseLeave={() => setHovered(null)}
              transform="translate(250, 85)"
            >
              {/* Hitbox Touch Target */}
              <rect
                x="-120"
                y="0"
                width="240"
                height="65"
                fill={faults.phaseLoss ? '#3b0a0a' : (hovered === 'MCCB' ? '#162235' : '#0d131f')}
                rx="8"
                stroke={faults.phaseLoss ? '#ff4d6d' : (hovered === 'MCCB' ? '#00e5a0' : mccbClosed ? '#00e5a0' : '#f59e0b')}
                strokeWidth={faults.phaseLoss ? 2.5 : (hovered === 'MCCB' ? 2 : 1.2)}
                className="transition-colors duration-200"
              />

              {/* Vertical Conductors */}
              <line x1="-70" y1="0" x2="-70" y2="15" stroke={faults.phaseLoss ? '#ff4d6d' : '#38bdf8'} strokeWidth="3" />
              <line x1="-70" y1="45" x2="-70" y2="65" stroke={faults.phaseLoss ? '#ff4d6d' : '#38bdf8'} strokeWidth="3" />

              {/* Fixed Top Contact */}
              <circle cx="-70" cy="15" r="4" fill="#f8fafc" stroke={faults.phaseLoss ? '#ff4d6d' : '#38bdf8'} strokeWidth="1" />
              {/* Bottom Pivot Point */}
              <circle cx="-70" cy="45" r="4" fill="#f8fafc" stroke={faults.phaseLoss ? '#ff4d6d' : '#38bdf8'} strokeWidth="1" />

              {/* Animated Contact Blade */}
              <g transform="translate(-70, 45)">
                <line
                  x1="0"
                  y1="0"
                  x2={mccbClosed ? '0' : '-12'}
                  y2={mccbClosed ? '-30' : '-26'}
                  stroke={faults.phaseLoss ? '#ff4d6d' : mccbClosed ? '#00e5a0' : '#ff4d4d'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  style={{
                    transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
              </g>

              {/* Device Code Tag 52 */}
              <rect x="-112" y="20" width="30" height="22" rx="4" fill="#1e293b" stroke={faults.phaseLoss ? '#ff4d6d' : '#38bdf8'} strokeWidth="1" />
              <text x="-97" y="35" textAnchor="middle" fill={faults.phaseLoss ? '#ff4d6d' : '#38bdf8'} fontSize="10" fontWeight="bold">
                52
              </text>

              {/* Labels */}
              <text x="-30" y="26" fill="#ffffff" fontSize="11" fontWeight="bold">
                52-MCCB Line Breaker
              </text>
              <text x="-30" y="42" fill={faults.phaseLoss ? '#f87171' : '#94a3b8'} fontSize="9" fontFamily="monospace">
                400A • {faults.phaseLoss ? 'PHASE LOSS TRIP' : mccbClosed ? 'CLOSED (415V ON)' : 'OPEN (ISOLATED)'}
              </text>

              {/* Tappable Badge Button */}
              <rect
                x="45"
                y="18"
                width="65"
                height="26"
                rx="6"
                fill={faults.phaseLoss ? '#ef4444' : mccbClosed ? '#00e5a0' : '#ef4444'}
                className="transition-colors duration-200 cursor-pointer shadow-md"
              />
              <text x="77" y="35" textAnchor="middle" fill="#070a10" fontSize="10" fontWeight="extrabold">
                {mccbClosed ? 'OPEN' : 'CLOSE'}
              </text>
            </g>

            {/* Conductor from MCCB Q1 to Split Node */}
            <line x1="250" y1="150" x2="250" y2="200" stroke={mainsPowered ? '#38bdf8' : '#1e293b'} strokeWidth="4" />

            {/* ============================================================== */}
            {/* 3. SOFT STARTER CUBICLE ENCLOSURE & PHYSICS FORMULA OVERLAY    */}
            {/* ============================================================== */}
            <g transform="translate(60, 200)">
              <rect
                x="0"
                y="0"
                width="420"
                height="340"
                fill="#0b1019"
                fillOpacity="0.9"
                stroke={faults.scrShort ? '#ff4d6d' : '#1e293b'}
                strokeWidth="2"
                rx="12"
              />
              <text x="16" y="24" fill={faults.scrShort ? '#ff4d6d' : '#00e5a0'} fontSize="11" fontWeight="bold">
                3-PHASE THYRISTOR SOFT STARTER (IEC 60947-4-2)
              </text>

              {/* Firing Angle Badge */}
              <g transform="translate(230, 10)">
                <rect x="0" y="0" width="175" height="26" rx="6" fill="#162235" stroke={faults.scrShort ? '#ff4d6d' : '#00e5a0'} strokeWidth="1" />
                <text x="87" y="17" textAnchor="middle" fill={faults.scrShort ? '#ff4d6d' : '#00e5a0'} fontSize="10" fontWeight="bold">
                  FIRING α: {firingAngle}° ({readouts.outputVoltagePct.toFixed(0)}% V)
                </text>
              </g>

              {/* PHYSICS LAYER FORMULA OVERLAY */}
              <g transform="translate(16, 305)">
                <rect x="0" y="0" width="388" height="26" rx="6" fill="#070a10" stroke="#38bdf8" strokeWidth="1" />
                <text x="10" y="17" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  PHYSICS: Vout = Vin × √((π - α + 0.5 sin 2α)/π) = 415V × {vOutPhysicsRatio.toFixed(2)} = {calcVoutRMS}V RMS
                </text>
              </g>
            </g>

            {/* Split Node */}
            <circle cx="250" cy="200" r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />

            {/* Dual Power Branch Base Paths */}
            <path d="M 250 200 L 160 200 L 160 230" fill="none" stroke="#1e293b" strokeWidth="4" />
            <path d="M 160 500 L 160 540 L 250 540" fill="none" stroke="#1e293b" strokeWidth="4" />
            <path d="M 250 200 L 360 200 L 360 270" fill="none" stroke="#1e293b" strokeWidth="4" />
            <path d="M 360 450 L 360 540 L 250 540" fill="none" stroke="#1e293b" strokeWidth="4" />

            {/* Branch A Glowing Path when SCR conducting */}
            {isScrConducting && (
              <>
                <path d="M 250 200 L 160 200 L 160 230" fill="none" stroke="#ff9900" strokeWidth="4" filter="url(#thyristorGlow)" />
                <path d="M 160 500 L 160 540 L 250 540" fill="none" stroke="#ff9900" strokeWidth="4" filter="url(#thyristorGlow)" />
              </>
            )}

            {/* Branch B Glowing Path when Bypass conducting */}
            {isBypassConducting && (
              <>
                <path d="M 250 200 L 360 200 L 360 270" fill="none" stroke="#00e5a0" strokeWidth="4.5" filter="url(#neonGreenGlow)" />
                <path d="M 360 450 L 360 540 L 250 540" fill="none" stroke="#00e5a0" strokeWidth="4.5" filter="url(#neonGreenGlow)" />
              </>
            )}

            {/* ============================================================== */}
            {/* 4. REAL PHYSICS ELECTRON FLOW ANIMATION (SPEED = (Ia+Ib+Ic)/3) */}
            {/* ============================================================== */}
            {flowSpeed > 0 && (
              <g id="electronFlowPhysics">
                {/* RAMP MODE PATH: Mains -> MCCB -> SCR Bridge (x=160) -> CTs -> Motor */}
                {isScrConducting && (
                  <path
                    className="current-flow"
                    d="M 250 45 L 250 200 L 160 200 L 160 540 L 250 540 L 250 670"
                    fill="none"
                    stroke={isILimitActive ? '#00e5a0' : '#ffea00'}
                    strokeWidth={isILimitActive ? '4.5' : '3.5'}
                    strokeDasharray="6 10"
                    style={{
                      animation: `flow ${Math.max(0.05, 0.6 / (flowSpeed / 4))}s linear infinite`,
                    }}
                  />
                )}

                {/* BYPASS MODE PATH: Mains -> MCCB -> KM1 Contactor (x=360) -> CTs -> Motor */}
                {isBypassConducting && (
                  <path
                    className="current-flow"
                    d="M 250 45 L 250 200 L 360 200 L 360 540 L 250 540 L 250 670"
                    fill="none"
                    stroke="#00e5a0"
                    strokeWidth="4.5"
                    strokeDasharray="6 10"
                    style={{
                      animation: `flow ${Math.max(0.05, 0.6 / (flowSpeed / 4))}s linear infinite`,
                    }}
                  />
                )}

                {/* HIGH SPEED ELECTRON DOT PARTICLES WHEN ILIMIT 300% ACTIVE */}
                {isILimitActive && isScrConducting && (
                  <g>
                    <circle cx="250" cy="120" r="4.5" fill="#00e5a0" filter="url(#neonGreenGlow)" className="animate-ping" />
                    <circle cx="160" cy="300" r="4.5" fill="#00e5a0" filter="url(#neonGreenGlow)" className="animate-ping" />
                    <circle cx="250" cy="600" r="4.5" fill="#00e5a0" filter="url(#neonGreenGlow)" className="animate-ping" />
                  </g>
                )}
              </g>
            )}

            {/* ============================================================== */}
            {/* 5. 6× THYRISTORS MODULE WITH PHASE CONTROL & BYPASS STATES    */}
            {/* ============================================================== */}
            <g
              transform="translate(160, 230)"
              onMouseEnter={() => setHovered('SCR')}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <rect
                x="-70"
                y="0"
                width="140"
                height="270"
                fill={faults.scrShort ? '#3b0a0a' : readouts.bypassClosed ? '#0f172a' : '#0d131f'}
                stroke={
                  faults.scrShort
                    ? '#ff4d6d'
                    : readouts.bypassClosed
                    ? '#334155'
                    : isScrConducting
                    ? '#ff9900'
                    : '#1e293b'
                }
                strokeWidth={faults.scrShort || isScrConducting ? 2.5 : 1.5}
                rx="8"
                filter={faults.scrShort || isScrConducting ? 'url(#thyristorGlow)' : undefined}
                className={faults.scrShort ? 'flash-active' : ''}
              />
              <text
                x="0"
                y="20"
                textAnchor="middle"
                fill={
                  faults.scrShort
                    ? '#ff4d6d'
                    : readouts.bypassClosed
                    ? '#64748b'
                    : isScrConducting
                    ? '#ff9900'
                    : '#94a3b8'
                }
                fontSize="11"
                fontWeight="bold"
              >
                6× THYRISTOR SCRs (T1-T6)
              </text>

              {/* 6 Individual Thyristors (T1..T6) with Red Blocking vs Green Firing */}
              {[
                { name: 'Phase A: T1 / T4', y: 45, t1: 'T1', t2: 'T4' },
                { name: 'Phase B: T2 / T5', y: 120, t1: 'T2', t2: 'T5' },
                { name: 'Phase C: T3 / T6', y: 195, t1: 'T3', t2: 'T6' },
              ].map((ph, idx) => {
                const isFiringPhase = isScrConducting || firingAngle === 67;
                const isBypassed = readouts.bypassClosed;

                return (
                  <g key={idx} transform={`translate(0, ${ph.y})`}>
                    <text x="0" y="-8" textAnchor="middle" fill={isBypassed ? '#475569' : '#64748b'} fontSize="8" fontWeight="bold">
                      {ph.name}
                    </text>
                    <line
                      x1="-45"
                      y1="15"
                      x2="45"
                      y2="15"
                      stroke={
                        isBypassed
                          ? '#334155'
                          : faults.scrShort
                          ? '#ff4d6d'
                          : isFiringPhase
                          ? '#00e5a0'
                          : '#ef4444'
                      }
                      strokeWidth="2"
                    />

                    {/* Forward SCR (T1/T2/T3) */}
                    <g transform="translate(-18, 15)">
                      <polygon
                        points="-12,-10 4,-10 -4,2"
                        className={isBypassed ? 'bypassed-grey' : isFiringPhase ? 'firing' : 'blocking'}
                        fill={isBypassed ? '#475569' : isFiringPhase ? '#00e5a0' : '#ef4444'}
                        stroke={isBypassed ? '#334155' : isFiringPhase ? '#00e5a0' : '#ff4d6d'}
                        strokeWidth="1.5"
                      />
                      <line
                        x1="4"
                        y1="-10"
                        x2="4"
                        y2="2"
                        stroke={isBypassed ? '#334155' : isFiringPhase ? '#00e5a0' : '#ffea00'}
                        strokeWidth="1.5"
                      />
                      <line x1="-8" y1="-4" x2="-14" y2="-12" stroke={isBypassed ? '#334155' : '#ffea00'} strokeWidth="1.2" />
                      <text x="-12" y="12" textAnchor="middle" fill={isBypassed ? '#64748b' : '#94a3b8'} fontSize="7" fontWeight="bold">
                        {ph.t1}
                      </text>
                    </g>

                    {/* Reverse SCR (T4/T5/T6) */}
                    <g transform="translate(18, 15)">
                      <polygon
                        points="12,10 -4,10 4,-2"
                        className={isBypassed ? 'bypassed-grey' : isFiringPhase ? 'firing' : 'blocking'}
                        fill={isBypassed ? '#475569' : isFiringPhase ? '#00e5a0' : '#ef4444'}
                        stroke={isBypassed ? '#334155' : isFiringPhase ? '#00e5a0' : '#ff4d6d'}
                        strokeWidth="1.5"
                      />
                      <line
                        x1="-4"
                        y1="10"
                        x2="-4"
                        y2="-2"
                        stroke={isBypassed ? '#334155' : isFiringPhase ? '#00e5a0' : '#ffea00'}
                        strokeWidth="1.5"
                      />
                      <line x1="8" y1="4" x2="14" y2="12" stroke={isBypassed ? '#334155' : '#ffea00'} strokeWidth="1.2" />
                      <text x="12" y="-5" textAnchor="middle" fill={isBypassed ? '#64748b' : '#94a3b8'} fontSize="7" fontWeight="bold">
                        {ph.t2}
                      </text>
                    </g>
                  </g>
                );
              })}

              <text
                x="0"
                y="256"
                textAnchor="middle"
                fill={
                  faults.scrShort
                    ? '#ff4d6d'
                    : readouts.bypassClosed
                    ? '#64748b'
                    : isScrConducting
                    ? '#00e5a0'
                    : '#64748b'
                }
                fontSize="9"
                fontWeight="bold"
              >
                {faults.scrShort
                  ? '🚨 SCR SHORT CIRCUIT FAULT'
                  : readouts.bypassClosed
                  ? 'SCRs BYPASSED (STANDBY GREY)'
                  : isScrConducting
                  ? `FIRING GREEN (α = ${firingAngle}°)`
                  : 'BLOCKING RED (STANDBY)'}
              </text>
            </g>

            {/* ============================================================== */}
            {/* 6. CONTACTOR KM1 WITH AUTOMATIC BYPASS CLOSING ARC ANIMATION   */}
            {/* ============================================================== */}
            <g
              id="bypassKM1"
              className={`contactor cursor-pointer group ${readouts.bypassClosed ? 'closed' : 'open'} ${
                activeFlashTarget === 'bypassKM1' || faults.scrShort ? 'flash-active' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleFlash('bypassKM1');
                if (onToggleBypass) onToggleBypass();
              }}
              onMouseEnter={() => setHovered('KM1')}
              onMouseLeave={() => setHovered(null)}
              transform="translate(360, 270)"
            >
              {/* Hitbox Box */}
              <rect
                x="-70"
                y="0"
                width="140"
                height="180"
                fill={faults.scrShort ? '#3b0a0a' : (hovered === 'KM1' ? '#162235' : '#0d131f')}
                stroke={faults.scrShort ? '#ff4d6d' : (readouts.bypassClosed ? '#00e5a0' : hovered === 'KM1' ? '#38bdf8' : '#1e293b')}
                strokeWidth={faults.scrShort || readouts.bypassClosed ? 2.5 : 1.5}
                rx="8"
                className="transition-colors duration-200"
              />
              <text x="0" y="22" textAnchor="middle" fill={faults.scrShort ? '#ff4d6d' : (readouts.bypassClosed ? '#00e5a0' : '#94a3b8')} fontSize="10" fontWeight="bold">
                BYPASS CONTACTOR KM1
              </text>

              {/* 3 Contactor Poles with Arc Closing Flash when CLOSED */}
              {[-35, 0, 35].map((offsetX, idx) => (
                <g key={idx} transform={`translate(${offsetX}, 50)`}>
                  <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
                  <circle cx="0" cy="60" r="3.5" fill="#ffffff" />

                  {/* Contactor Blade Arm */}
                  <line
                    x1="0"
                    y1="60"
                    x2={readouts.bypassClosed ? '0' : '12'}
                    y2={readouts.bypassClosed ? '0' : '8'}
                    stroke={faults.scrShort ? '#ff4d6d' : (readouts.bypassClosed ? '#00e5a0' : '#ef4444')}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    style={{
                      transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />

                  {/* CONTACT ARC CLOSING SPARK ANIMATION */}
                  {readouts.bypassClosed && (
                    <g transform="translate(0, 0)">
                      <circle cx="0" cy="0" r="8" fill="#00e5a0" opacity="0.4" className="animate-ping" />
                      <line x1="-6" y1="-6" x2="6" y2="6" stroke="#ffbf00" strokeWidth="1.5" />
                      <line x1="6" y1="-6" x2="-6" y2="6" stroke="#ffbf00" strokeWidth="1.5" />
                    </g>
                  )}
                </g>
              ))}

              {/* Status Badge */}
              <rect
                x="-65"
                y="135"
                width="130"
                height="26"
                rx="6"
                fill={faults.scrShort ? '#ef4444' : (readouts.bypassClosed ? '#00e5a0' : '#1e293b')}
              />
              <text x="0" y="152" textAnchor="middle" fill={faults.scrShort || readouts.bypassClosed ? '#070a10' : '#94a3b8'} fontSize="9" fontWeight="extrabold">
                {faults.scrShort ? 'INTERLOCK LOCKED' : readouts.bypassClosed ? 'Bypass State: CLOSED (BYPASSED)' : 'TAP TO TOGGLE KM1'}
              </text>
            </g>

            {/* Merge Node */}
            <circle cx="250" cy="540" r="5" fill={isMotorPowered ? (isBypassConducting ? '#00e5a0' : '#ff9900') : '#1e293b'} stroke="#ffffff" strokeWidth="2" />

            {/* Downstream Power Line to Motor */}
            <line
              x1="250"
              y1="540"
              x2="250"
              y2="640"
              stroke={isMotorPowered ? (isBypassConducting ? '#00e5a0' : '#ff9900') : '#1e293b'}
              strokeWidth="4"
            />

            {/* CT Instrument Box */}
            <g transform="translate(250, 580)" onMouseEnter={() => setHovered('CT')} onMouseLeave={() => setHovered(null)}>
              <rect
                x="-60"
                y="-14"
                width="120"
                height="28"
                fill={faults.overcurrent ? '#3b0a0a' : '#0d131f'}
                stroke={faults.overcurrent ? '#ff4d6d' : '#38bdf8'}
                strokeWidth={faults.overcurrent ? 2.5 : 1.2}
                rx="6"
                className={faults.overcurrent ? 'flash-active' : ''}
              />
              <circle cx="-24" cy="0" r="7" fill="none" stroke={faults.overcurrent ? '#ff4d6d' : '#38bdf8'} strokeWidth="2" />
              <circle cx="0" cy="0" r="7" fill="none" stroke={faults.overcurrent ? '#ff4d6d' : '#38bdf8'} strokeWidth="2" />
              <circle cx="24" cy="0" r="7" fill="none" stroke={faults.overcurrent ? '#ff4d6d' : '#38bdf8'} strokeWidth="2" />
              <text x="0" y="-18" textAnchor="middle" fill={faults.overcurrent ? '#ff4d6d' : '#38bdf8'} fontSize="8" fontWeight="bold">
                3× CTs (Relays 50/51/49)
              </text>
            </g>

            {/* Relay Symbol */}
            <g transform="translate(250, 620)">
              <rect x="-20" y="-10" width="40" height="20" fill="#0d131f" stroke="#f59e0b" strokeWidth="1.5" rx="3" />
              <path d="M -12 -5 L 0 5 L 12 -5" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="26" y="4" fill="#f59e0b" fontSize="8" fontWeight="bold">
                49/51
              </text>
            </g>

            {/* ============================================================== */}
            {/* 7. DYNAMIC MOTOR ROTOR SPINNING & TORQUE/HEAD OVERLAY          */}
            {/* ============================================================== */}
            <g
              transform="translate(250, 710)"
              onMouseEnter={() => setHovered('MOTOR')}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <circle
                cx="0"
                cy="0"
                r="40"
                fill={faults.overcurrent || faults.startTimeout ? '#3b0a0a' : '#0d131f'}
                stroke={faults.overcurrent || faults.startTimeout || isTrip ? '#ff4d6d' : (isMotorPowered ? '#00e5a0' : '#1e293b')}
                strokeWidth="4"
                filter={faults.overcurrent || faults.startTimeout ? 'url(#thyristorGlow)' : (isMotorPowered ? 'url(#neonGreenGlow)' : undefined)}
                className={faults.overcurrent || faults.startTimeout ? 'flash-active' : ''}
              />

              {/* ROTATING MOTOR BLADES (SPEED = 0-1500 RPM) */}
              <g
                style={{
                  transformOrigin: '0px 0px',
                  animation: spinPeriodSec > 0 ? `spinMotorRotor ${spinPeriodSec}s linear infinite` : 'none',
                }}
              >
                <line x1="-28" y1="0" x2="28" y2="0" stroke={isMotorPowered ? '#00e5a0' : '#334155'} strokeWidth="3" />
                <line x1="0" y1="-28" x2="0" y2="28" stroke={isMotorPowered ? '#00e5a0' : '#334155'} strokeWidth="3" />
              </g>

              <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="black">
                M
              </text>
              <text x="0" y="20" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">
                3~
              </text>

              {/* Motor Live Telemetry Labels & Mode Badge */}
              <text x="-100" y="58" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                160kW 415V Motor
              </text>
              <text x="-100" y="74" textAnchor="middle" fill="#00e5a0" fontSize="12" fontWeight="extrabold">
                {Math.round(readouts.motorSpeedRPM)} RPM ({((readouts.motorSpeedRPM / 1480) * 100).toFixed(1)}%)
              </text>
              <text x="-100" y="90" textAnchor="middle" fill="#38bdf8" fontSize="10" fontFamily="monospace">
                Torque T = {torquePct}% • I_stat: {currentAmps}A
              </text>
              <g transform="translate(-205, 98)">
                <rect x="0" y="0" width="210" height="22" rx="5" fill="#070a10" stroke={isScrConducting ? '#ff9900' : isBypassConducting ? '#00e5a0' : '#1e293b'} strokeWidth="1.5" />
                <text x="105" y="15" textAnchor="middle" fill={isScrConducting ? '#ff9900' : isBypassConducting ? '#00e5a0' : '#94a3b8'} fontSize="9" fontWeight="extrabold">
                  {isScrConducting ? '🔥 RUNNING ON SOFT STARTER' : isBypassConducting ? '⚡ RUNNING ON BYPASS (KM1)' : '🛑 MOTOR STOPPED'}
                </text>
              </g>

              {/* Earth Ground */}
              <line x1="0" y1="40" x2="0" y2="58" stroke="#00e5a0" strokeWidth="2" />
              <g transform="translate(0, 58)">
                <line x1="-12" y1="0" x2="12" y2="0" stroke="#00e5a0" strokeWidth="2" />
                <line x1="-8" y1="3" x2="8" y2="3" stroke="#00e5a0" strokeWidth="2" />
                <line x1="-4" y1="6" x2="4" y2="6" stroke="#00e5a0" strokeWidth="2" />
              </g>
            </g>

            {/* Shaft Coupling from Motor to Load */}
            <g transform="translate(290, 710)">
              <line x1="0" y1="0" x2="230" y2="0" stroke={isMotorPowered ? '#38bdf8' : '#1e293b'} strokeWidth="5" />
              {isMotorPowered && (
                <line x1="0" y1="0" x2="230" y2="0" stroke="#00e5a0" strokeWidth="2.5" strokeDasharray="8,6" />
              )}
              <g transform="translate(115, 0)">
                <rect x="-6" y="-14" width="12" height="28" fill="#162235" stroke="#38bdf8" strokeWidth="1.5" rx="3" />
                <text x="0" y="-18" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
                  COUPLING
                </text>
              </g>
            </g>

            {/* ============================================================== */}
            {/* 8. DRIVEN EQUIPMENT & PUMP HYDRAULIC HEAD PHYSICS READOUT      */}
            {/* ============================================================== */}
            <g transform="translate(520, 600)" onMouseEnter={() => setHovered('LOAD')} onMouseLeave={() => setHovered(null)}>
              <rect
                x="0"
                y="0"
                width="360"
                height="240"
                fill={isTrip ? '#3b0a0a' : '#0d131f'}
                stroke={isTrip ? '#ef4444' : '#1e293b'}
                strokeWidth={isTrip ? 2.5 : 1.5}
                rx="10"
              />

              <text x="16" y="24" fill={isTrip ? '#f87171' : '#00e5a0'} fontSize="11" fontWeight="bold">
                {isTrip ? '🚨 MECHANICAL LOAD TRIPPED' : 'DRIVEN EQUIPMENT: CENTRIFUGAL PUMP'}
              </text>

              {/* Dynamic Pump Head Physics Display */}
              <g transform="translate(16, 32)">
                <rect x="0" y="0" width="328" height="22" rx="5" fill="#070a10" stroke="#00e5a0" strokeWidth="1" />
                <text x="8" y="15" fill="#00e5a0" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  HYDRAULICS: Pump Head H = {pumpHeadMeters}m / 45m (Torque = {torquePct}%)
                </text>
              </g>

              {!isTrip && (
                <g transform="translate(16, 62)">
                  {/* CLICKABLE GROUP: SUCTION VALVE <g id="suctionValve" class="valve"> */}
                  <g
                    id="suctionValve"
                    className={`valve cursor-pointer group ${readouts.suctionValveOpen ? 'open' : 'closed'} ${
                      activeFlashTarget === 'suctionValve' ? 'flash-active' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFlash('suctionValve');
                      onToggleSuctionValve();
                    }}
                    transform="translate(40, 60)"
                  >
                    <polygon
                      points="-20,-15 0,0 -20,15"
                      fill={readouts.suctionValveOpen ? '#00e5a0' : '#ef4444'}
                      stroke={readouts.suctionValveOpen ? '#00e5a0' : '#ff4d4d'}
                      strokeWidth="1.5"
                    />
                    <polygon
                      points="20,-15 0,0 20,15"
                      fill={readouts.suctionValveOpen ? '#00e5a0' : '#ef4444'}
                      stroke={readouts.suctionValveOpen ? '#00e5a0' : '#ff4d4d'}
                      strokeWidth="1.5"
                    />
                    <line x1="0" y1="0" x2="0" y2="-22" stroke={readouts.suctionValveOpen ? '#00e5a0' : '#ef4444'} strokeWidth="2" />
                    <circle cx="0" cy="-22" r="7" fill="#121a29" stroke={readouts.suctionValveOpen ? '#00e5a0' : '#ef4444'} strokeWidth="1.5" />
                    <text x="0" y="32" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                      Suction Valve V1
                    </text>
                    <text x="0" y="46" textAnchor="middle" fill={readouts.suctionValveOpen ? '#00e5a0' : '#f87171'} fontSize="9" fontWeight="bold">
                      {readouts.suctionValveOpen ? 'OPEN (100% FLOW)' : 'CLOSED (ISOLATED)'}
                    </text>
                  </g>

                  {/* Centrifugal Impeller Pump Body */}
                  <g transform="translate(160, 60)">
                    <circle
                      cx="0"
                      cy="0"
                      r="32"
                      fill="#121a29"
                      stroke={isMotorPowered && readouts.suctionValveOpen ? '#00e5a0' : '#1e293b'}
                      strokeWidth="3"
                    />
                    {/* Rotating Impeller Blades */}
                    <g
                      style={{
                        transformOrigin: '0px 0px',
                        animation: spinPeriodSec > 0 && readouts.suctionValveOpen ? `spinMotorRotor ${spinPeriodSec}s linear infinite` : 'none',
                      }}
                    >
                      <path d="M 0 0 C 10 -15 20 -15 22 0 C 10 15 -10 15 0 0 Z" fill="#38bdf8" />
                      <path d="M 0 0 C -15 10 -15 20 0 22 C 15 10 15 -10 0 0 Z" fill="#38bdf8" />
                    </g>
                    <text x="0" y="48" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                      Centrifugal Pump
                    </text>
                  </g>

                  {/* CLICKABLE GROUP: DISCHARGE VALVE <g id="dischargeValve" class="valve"> */}
                  <g
                    id="dischargeValve"
                    className={`valve cursor-pointer group ${readouts.dischargeValveOpen ? 'open' : 'closed'} ${
                      activeFlashTarget === 'dischargeValve' ? 'flash-active' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFlash('dischargeValve');
                      onToggleDischargeValve();
                    }}
                    transform="translate(270, 60)"
                  >
                    <polygon
                      points="-20,-15 0,0 -20,15"
                      fill={readouts.dischargeValveOpen ? '#00e5a0' : '#ef4444'}
                      stroke={readouts.dischargeValveOpen ? '#00e5a0' : '#ff4d4d'}
                      strokeWidth="1.5"
                    />
                    <polygon
                      points="20,-15 0,0 20,15"
                      fill={readouts.dischargeValveOpen ? '#00e5a0' : '#ef4444'}
                      stroke={readouts.dischargeValveOpen ? '#00e5a0' : '#ff4d4d'}
                      strokeWidth="1.5"
                    />
                    <line x1="0" y1="0" x2="0" y2="-22" stroke={readouts.dischargeValveOpen ? '#00e5a0' : '#ef4444'} strokeWidth="2" />
                    <circle cx="0" cy="-22" r="7" fill="#121a29" stroke={readouts.dischargeValveOpen ? '#00e5a0' : '#ef4444'} strokeWidth="1.5" />
                    <text x="0" y="32" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                      Discharge Valve V2
                    </text>
                    <text x="0" y="46" textAnchor="middle" fill={readouts.dischargeValveOpen ? '#00e5a0' : '#f87171'} fontSize="9" fontWeight="bold">
                      {readouts.dischargeValveOpen ? 'OPEN (FULL HEAD)' : 'CLOSED (THROTTLED)'}
                    </text>
                  </g>

                  {/* Interconnecting Pipes */}
                  <line x1="60" y1="60" x2="128" y2="60" stroke={readouts.suctionValveOpen ? '#38bdf8' : '#1e293b'} strokeWidth="4" />
                  <line x1="192" y1="60" x2="250" y2="60" stroke={readouts.dischargeValveOpen && isMotorPowered ? '#00e5a0' : '#1e293b'} strokeWidth="4" />
                </g>
              )}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
