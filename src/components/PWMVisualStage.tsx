import React, { useState } from 'react';
import {
  Zap,
  Activity,
  Layers,
  ZoomIn,
  Compass,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';

import { calculatePWMPhysics } from '../engine/PWMPhysicsEngine';

export type PWMModulationType = 'spwm' | 'bipolar' | 'unipolar' | 'svpwm';

interface PWMVisualStageProps {
  modulationType: PWMModulationType;
  setModulationType: (type: PWMModulationType) => void;
  busVoltage: number;
  pwmMa: number;
  pwmFc: number;
  pwmF1: number;
  pwmDeadTime: number;
  rectifierLoad: number;
  filterL_mH?: number;
  filterC_uF?: number;
  time: number;
  timeSpeed: number;
  isPlaying: boolean;
}

export const PWMVisualStage: React.FC<PWMVisualStageProps> = ({
  modulationType,
  setModulationType,
  busVoltage = 400,
  pwmMa = 0.85,
  pwmFc = 5000,
  pwmF1 = 50,
  pwmDeadTime = 1.5,
  rectifierLoad = 20,
  filterL_mH = 2.0,
  filterC_uF = 20.0,
  time,
  timeSpeed,
  isPlaying
}) => {
  // Visual sub-view mode: 'schematic' (H-Bridge/Half-Bridge SLD) | 'comparator' (Microscope Carrier Zoom) | 'svpwm_hexagon' (Space Vector Plane)
  const [visualMode, setVisualMode] = useState<'schematic' | 'comparator' | 'svpwm_hexagon'>(
    modulationType === 'svpwm' ? 'svpwm_hexagon' : 'schematic'
  );

  // Exact Physical Modeling via PWMPhysicsEngine
  const physics = calculatePWMPhysics({
    busVoltage,
    modulationType,
    ma: pwmMa,
    fc: pwmFc,
    f1: pwmF1,
    deadTimeUs: pwmDeadTime,
    loadR: rectifierLoad,
    filterL_mH,
    filterC_uF
  });

  // Electrical variables
  const vDcTotal = busVoltage;
  const vDcHalf = vDcTotal / 2;
  const omega1 = 2 * Math.PI * pwmF1;
  const theta = (omega1 * time) % (2 * Math.PI);
  const v1RmsHalf = physics.v1RmsNet;
  const v1RmsFull = physics.v1RmsNet;
  const loadR = Math.max(1, rectifierLoad || 20);

  // Carrier & Dead-time calculations
  const carrierPeriod = 1 / Math.max(10, pwmFc);
  const tMod = time % carrierPeriod;
  const carrierNorm = tMod / carrierPeriod; // 0 to 1
  const instantCarrier = carrierNorm < 0.5 ? (4 * carrierNorm - 1) : (3 - 4 * carrierNorm); // -1 to +1

  // Reference sine waves
  const instantRefA = Math.min(1.0, Math.max(-1.0, Math.sin(omega1 * time) * pwmMa));
  const instantRefB = modulationType === 'unipolar'
    ? Math.min(1.0, Math.max(-1.0, -Math.sin(omega1 * time) * pwmMa)) // 180° inverted for Unipolar Leg B
    : -instantRefA; // Complementary for Bipolar

  // Dead-time normalized interval
  const deadTimeSec = (pwmDeadTime || 0) * 1e-6;
  const deadTimeFraction = Math.min(0.4, deadTimeSec * pwmFc);
  const isDeadTimeActive = carrierNorm < deadTimeFraction || (1 - carrierNorm) < deadTimeFraction;
  const isShootThrough = pwmDeadTime === 0;

  // Gate signals
  // Leg A (Q1 upper, Q2 lower)
  const q1Raw = instantRefA >= instantCarrier;
  const q1On = !isShootThrough ? (!isDeadTimeActive && q1Raw) : true;
  const q2On = !isShootThrough ? (!isDeadTimeActive && !q1Raw) : true;

  // Leg B (Q3 upper, Q4 lower)
  const q3Raw = instantRefB >= instantCarrier;
  const q3On = !isShootThrough ? (!isDeadTimeActive && q3Raw) : true;
  const q4On = !isShootThrough ? (!isDeadTimeActive && !q3Raw) : true;

  // Diode conduction (inductive freewheeling during dead-time)
  const isPositiveHalf = Math.sin(omega1 * time) >= 0;
  const d1On = isDeadTimeActive && !isPositiveHalf;
  const d2On = isDeadTimeActive && isPositiveHalf;
  const d3On = isDeadTimeActive && isPositiveHalf;
  const d4On = isDeadTimeActive && !isPositiveHalf;

  // Instantaneous terminal voltages
  let vSwInstant = 0;
  if (modulationType === 'spwm') {
    vSwInstant = q1On ? vDcHalf : q2On ? -vDcHalf : 0;
  } else if (modulationType === 'unipolar') {
    // 3-Level Output: +Vdc, 0V, -Vdc
    const vA = q1On ? vDcTotal : 0;
    const vB = q3On ? vDcTotal : 0;
    vSwInstant = vA - vB;
  } else {
    // Bipolar: +Vdc or -Vdc
    vSwInstant = (q1On && q4On) ? vDcTotal : (q2On && q3On) ? -vDcTotal : 0;
  }

  // SVPWM Sector and Dwell Time calculations
  const thetaDeg = (theta * 180 / Math.PI);
  const sector = Math.floor(thetaDeg / 60) + 1; // 1 to 6
  const sectorAngleRad = ((thetaDeg % 60) * Math.PI) / 180;
  const tA_dwell = Math.sin(Math.PI / 3 - sectorAngleRad) * pwmMa;
  const tB_dwell = Math.sin(sectorAngleRad) * pwmMa;
  const t0_dwell = Math.max(0, 1 - tA_dwell - tB_dwell);

  return (
    <div className="w-full flex flex-col gap-2 font-mono">
      {/* VISUAL SUB-VIEW TOOLBAR TABS */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-[#161b22] border border-[#30363d] px-3 py-2 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#8b949e] font-bold uppercase tracking-wider">VISUAL INSPECTOR:</span>
          <div className="flex items-center gap-1 bg-[#0d1117] p-0.5 rounded-lg border border-[#30363d]">
            <button
              onClick={() => setVisualMode('schematic')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                visualMode === 'schematic'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              📐 CIRCUIT SCHEMATIC (SLD)
            </button>
            <button
              onClick={() => setVisualMode('comparator')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                visualMode === 'comparator'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              🔬 CARRIER COMPARATOR MICROSCOPE
            </button>
            <button
              onClick={() => {
                setVisualMode('svpwm_hexagon');
                setModulationType('svpwm');
              }}
              className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                visualMode === 'svpwm_hexagon'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-[#8b949e] hover:text-white'
              }`}
            >
              ⬡ SPACE VECTOR (SVPWM) HEXAGON
            </button>
          </div>
        </div>

        {/* Operating status badge */}
        <div className="flex items-center gap-2">
          {isShootThrough ? (
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500 font-extrabold text-[10px] animate-pulse">
              ⚠️ 0µs SHOOT-THROUGH BLAST
            </span>
          ) : isDeadTimeActive ? (
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500 font-extrabold text-[10px]">
              ⏱️ DEAD-TIME BLANKING ({pwmDeadTime.toFixed(1)}µs)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500 font-extrabold text-[10px]">
              ⚡ ACTIVE SWITCHING ({vSwInstant > 0 ? `+${vSwInstant.toFixed(0)}V` : `${vSwInstant.toFixed(0)}V`})
            </span>
          )}
        </div>
      </div>

      {/* VIEWPORT SVG CANVAS STAGE */}
      <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden relative p-3 flex flex-col items-center justify-center min-h-[340px]">
        {/* ========================================================================= */}
        {/* MODE 1: MICROSCOPE CARRIER ZOOM (CARRIER VS REFERENCE COMPARATOR)        */}
        {/* ========================================================================= */}
        {visualMode === 'comparator' ? (
          <svg viewBox="0 0 540 300" className="w-full h-auto max-h-[320px] select-none">
            {/* Background Grid */}
            <rect x="10" y="10" width="520" height="280" fill="#141a24" rx="8" stroke="#30363d" strokeWidth="1.5" />
            
            {/* Title Header */}
            <text x="270" y="28" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="bold">
              CARRIER MODULATION MICROSCOPE: v_ref(t) vs v_tri(t) COMPARISON
            </text>
            <text x="270" y="42" textAnchor="middle" fill="#8b949e" fontSize="9">
              f1 = {pwmF1} Hz | fc = {pwmFc} Hz | Dead-Time t_dead = {pwmDeadTime.toFixed(1)} µs | Ma = {pwmMa.toFixed(2)}
            </text>

            {/* Scope Channel 1: Reference vs Carrier Wave Overlay (Top Half Y=50 to Y=170) */}
            <g transform="translate(20, 50)">
              <rect x="0" y="0" width="500" height="120" fill="#0d1117" stroke="#30363d" strokeWidth="1" rx="6" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#21262d" strokeWidth="1" strokeDasharray="4 4" />
              <text x="8" y="15" fill="#e3b341" fontSize="9" fontWeight="bold">v_ref(t) Sine Reference (Ma = {pwmMa.toFixed(2)})</text>
              <text x="350" y="15" fill="#38bdf8" fontSize="9" fontWeight="bold">v_tri(t) Triangle Carrier (fc = {pwmFc}Hz)</text>

              {/* Multiple Carrier Triangles */}
              <path
                d="M 0 110 L 25 10 L 50 110 L 75 10 L 100 110 L 125 10 L 150 110 L 175 10 L 200 110 L 225 10 L 250 110 L 275 10 L 300 110 L 325 10 L 350 110 L 375 10 L 400 110 L 425 10 L 450 110 L 475 10 L 500 110"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.8"
              />

              {/* Reference Sine Wave */}
              <path
                d={`M 0 ${60 - Math.sin((time * 3 + 0) * 0.8) * 50 * pwmMa} Q 125 ${60 - Math.sin((time * 3 + 1.5) * 0.8) * 50 * pwmMa} 250 ${60 - Math.sin((time * 3 + 3.0) * 0.8) * 50 * pwmMa} T 500 ${60 - Math.sin((time * 3 + 6.0) * 0.8) * 50 * pwmMa}`}
                fill="none"
                stroke="#e3b341"
                strokeWidth="2.5"
              />

              {/* Animated Cursor Head Scanning */}
              {(() => {
                const scanX = (time * 80) % 500;
                return (
                  <g>
                    <line x1={scanX} y1="0" x2={scanX} y2="120" stroke="#f472b6" strokeWidth="1.5" strokeDasharray="3 3" />
                    <circle cx={scanX} cy="60" r="3" fill="#f472b6" />
                  </g>
                );
              })()}
            </g>

            {/* Scope Channel 2: Gating Pulses G1, G2 & Dead-Time Blanking Gap (Y=185 to Y=280) */}
            <g transform="translate(20, 185)">
              <rect x="0" y="0" width="500" height="90" fill="#0d1117" stroke="#30363d" strokeWidth="1" rx="6" />

              {/* Gate G1 High-Side */}
              <text x="8" y="24" fill={q1On ? '#22c55e' : '#8b949e'} fontSize="9" fontWeight="bold">
                G1 (Upper): {q1On ? 'ON (+15V)' : 'OFF (0V)'}
              </text>
              <path
                d={`M 0 35 L 50 35 L 50 ${q1On ? 10 : 35} L 200 ${q1On ? 10 : 35} L 200 35 L 300 35 L 300 ${q1On ? 10 : 35} L 450 ${q1On ? 10 : 35} L 450 35 L 500 35`}
                fill="none"
                stroke={q1On ? '#22c55e' : '#475569'}
                strokeWidth="2"
              />

              {/* Gate G2 Low-Side */}
              <text x="8" y="60" fill={q2On ? '#38bdf8' : '#8b949e'} fontSize="9" fontWeight="bold">
                G2 (Lower): {q2On ? 'ON (+15V)' : 'OFF (0V)'}
              </text>
              <path
                d={`M 0 75 L 50 75 L 50 ${q2On ? 50 : 75} L 200 ${q2On ? 50 : 75} L 200 75 L 300 75 L 300 ${q2On ? 50 : 75} L 450 ${q2On ? 50 : 75} L 450 75 L 500 75`}
                fill="none"
                stroke={q2On ? '#38bdf8' : '#475569'}
                strokeWidth="2"
              />

              {/* Dead-Time Blanking Window Highlights */}
              {isDeadTimeActive && (
                <rect x="190" y="5" width="25" height="75" fill="#f59e0b20" stroke="#f59e0b" strokeWidth="1.5" rx="3" strokeDasharray="3 2" />
              )}
              {isDeadTimeActive && (
                <text x="202" y="47" textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="bold">
                  t_dead
                </text>
              )}

              {/* Shoot-Through Warning Banner */}
              {isShootThrough && (
                <g transform="translate(140, 25)">
                  <rect x="0" y="0" width="220" height="30" fill="#da3633dd" rx="4" stroke="#ff7b72" strokeWidth="1.5" />
                  <text x="110" y="19" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                    ⚠️ 0µs SHOOT-THROUGH ACTIVE!
                  </text>
                </g>
              )}
            </g>
          </svg>
        ) : visualMode === 'svpwm_hexagon' ? (
          /* ========================================================================= */
          /* MODE 2: SPACE VECTOR PWM (SVPWM) COMPLEX VOLTAGE PLANE & HEXAGON SECTORS   */
          /* ========================================================================= */
          <svg viewBox="0 0 540 310" className="w-full h-auto max-h-[320px] select-none">
            <rect x="10" y="10" width="520" height="290" fill="#141a24" rx="8" stroke="#8957e5" strokeWidth="1.5" />
            
            {/* Header */}
            <text x="270" y="28" textAnchor="middle" fill="#d2a8ff" fontSize="12" fontWeight="bold">
              SPACE VECTOR PWM (SVPWM) COMPLEX VOLTAGE PLANE (α - β)
            </text>
            <text x="270" y="42" textAnchor="middle" fill="#8b949e" fontSize="9">
              Active Sector: {sector} ({((sector - 1) * 60)}° - {(sector * 60)}°) | DC Utilization Gain: +15.5% (Vmax = Vdc / √3)
            </text>

            {/* Left Hexagonal Voltage Space Plane (Center at X=160, Y=175, R=105) */}
            <g transform="translate(160, 175)">
              {/* Complex Axes (Alpha - Beta) */}
              <line x1="-120" y1="0" x2="120" y2="0" stroke="#30363d" strokeWidth="1.5" />
              <line x1="0" y1="-115" x2="0" y2="115" stroke="#30363d" strokeWidth="1.5" />
              <text x="125" y="4" fill="#8b949e" fontSize="9" fontWeight="bold">α</text>
              <text x="4" y="-115" fill="#8b949e" fontSize="9" fontWeight="bold">β</text>

              {/* Outer Hexagon Boundaries (6 Active Voltage Vectors V1 to V6) */}
              {(() => {
                const r = 100;
                const points = [
                  [r, 0],                               // V1 [100] 0°
                  [r * 0.5, -r * Math.sqrt(3) / 2],      // V2 [110] 60°
                  [-r * 0.5, -r * Math.sqrt(3) / 2],     // V3 [010] 120°
                  [-r, 0],                              // V4 [011] 180°
                  [-r * 0.5, r * Math.sqrt(3) / 2],      // V5 [001] 240°
                  [r * 0.5, r * Math.sqrt(3) / 2],       // V6 [101] 300°
                ];
                const ptsStr = points.map((p) => p.join(',')).join(' ');

                return (
                  <g>
                    {/* Active Sector Highlight Wedge */}
                    {(() => {
                      const startIdx = sector - 1;
                      const pA = points[startIdx];
                      const pB = points[(startIdx + 1) % 6];
                      return (
                        <polygon
                          points={`0,0 ${pA[0]},${pA[1]} ${pB[0]},${pB[1]}`}
                          fill="#8957e530"
                          stroke="#bc8cff"
                          strokeWidth="2"
                        />
                      );
                    })()}

                    <polygon points={ptsStr} fill="none" stroke="#58a6ff" strokeWidth="2" />

                    {/* Maximum Inscribed Circle (SPWM limit) */}
                    <circle cx="0" cy="0" r={r * Math.sqrt(3) / 2} fill="none" stroke="#e3b341" strokeWidth="1.5" strokeDasharray="3 3" />

                    {/* Vector Lines from Center to Vertices */}
                    {points.map((p, idx) => {
                      const labels = ['V1 [100]', 'V2 [110]', 'V3 [010]', 'V4 [011]', 'V5 [001]', 'V6 [101]'];
                      return (
                        <g key={idx}>
                          <line x1="0" y1="0" x2={p[0]} y2={p[1]} stroke="#58a6ff" strokeWidth="1.5" />
                          <circle cx={p[0]} cy={p[1]} r="4" fill="#38bdf8" />
                          <text
                            x={p[0] * 1.25}
                            y={p[1] * 1.25 + 4}
                            textAnchor="middle"
                            fill="#38bdf8"
                            fontSize="8"
                            fontWeight="bold"
                          >
                            {labels[idx]}
                          </text>
                        </g>
                      );
                    })}

                    {/* Zero Vectors V0 / V7 at center */}
                    <circle cx="0" cy="0" r="4" fill="#f85149" />
                    <text x="-5" y="16" fill="#f85149" fontSize="8" fontWeight="bold">V0,V7</text>

                    {/* Continuous Rotating Reference Voltage Vector V* */}
                    {(() => {
                      const vMag = (r * Math.sqrt(3) / 2) * Math.min(1.0, pwmMa);
                      const vx = vMag * Math.cos(-theta);
                      const vy = vMag * Math.sin(-theta);
                      return (
                        <g>
                          <line x1="0" y1="0" x2={vx} y2={vy} stroke="#f472b6" strokeWidth="2.5" />
                          <circle cx={vx} cy={vy} r="5" fill="#f472b6" stroke="#ffffff" strokeWidth="1.5" />
                          <text x={vx + 10} y={vy} fill="#f472b6" fontSize="9" fontWeight="bold">
                            V* ({thetaDeg.toFixed(0)}°)
                          </text>
                        </g>
                      );
                    })()}
                  </g>
                );
              })()}
            </g>

            {/* Right Side: Dwell Time Decomposition Bars & Physics Equations */}
            <g transform="translate(320, 60)">
              <rect x="0" y="0" width="190" height="225" fill="#0d1117" stroke="#30363d" strokeWidth="1" rx="6" />
              <text x="95" y="18" textAnchor="middle" fill="#d2a8ff" fontSize="10" fontWeight="bold">
                SECTOR {sector} VOLT-SECOND TIMING
              </text>

              {/* Dwell Time Equation */}
              <g transform="translate(10, 30)">
                <text x="0" y="10" fill="#8b949e" fontSize="8">Volt-Second Invariant:</text>
                <text x="0" y="22" fill="#e3b341" fontSize="9" fontWeight="bold">V*·Ts = Va·Ta + Vb·Tb + V0·T0</text>

                {/* Ta Dwell Bar */}
                <text x="0" y="45" fill="#38bdf8" fontSize="9" fontWeight="bold">
                  Ta (Active Vector A): {(tA_dwell * 100).toFixed(1)}% Ts
                </text>
                <rect x="0" y="52" width="170" height="12" fill="#161b22" rx="3" stroke="#30363d" />
                <rect x="0" y="52" width={Math.max(2, 170 * tA_dwell)} height="12" fill="#38bdf8" rx="3" />

                {/* Tb Dwell Bar */}
                <text x="0" y="82" fill="#bc8cff" fontSize="9" fontWeight="bold">
                  Tb (Active Vector B): {(tB_dwell * 100).toFixed(1)}% Ts
                </text>
                <rect x="0" y="89" width="170" height="12" fill="#161b22" rx="3" stroke="#30363d" />
                <rect x="0" y="89" width={Math.max(2, 170 * tB_dwell)} height="12" fill="#bc8cff" rx="3" />

                {/* T0 Zero Vector Dwell Bar */}
                <text x="0" y="119" fill="#f85149" fontSize="9" fontWeight="bold">
                  T0 (Zero Vectors V0,V7): {(t0_dwell * 100).toFixed(1)}% Ts
                </text>
                <rect x="0" y="126" width="170" height="12" fill="#161b22" rx="3" stroke="#30363d" />
                <rect x="0" y="126" width={Math.max(2, 170 * t0_dwell)} height="12" fill="#f85149" rx="3" />

                {/* Advantage Card */}
                <g transform="translate(0, 150)">
                  <rect x="0" y="0" width="170" height="38" fill="#161b22" rx="4" stroke="#8957e5" strokeWidth="1" />
                  <text x="8" y="14" fill="#3fb950" fontSize="8" fontWeight="bold">⚡ SVPWM Advantages:</text>
                  <text x="8" y="24" fill="#c9d1d9" fontSize="7.5">• 15.5% Higher Peak AC Voltage</text>
                  <text x="8" y="32" fill="#c9d1d9" fontSize="7.5">• Lower Current THD for Motor Drives</text>
                </g>
              </g>
            </g>
          </svg>
        ) : (
          /* ========================================================================= */
          /* MODE 3: FULL MULTI-TOPOLOGY SCHEMATIC (HALF-BRIDGE & FULL-BRIDGE H-BRIDGE)*/
          /* ========================================================================= */
          <svg viewBox="0 0 540 300" className="w-full h-auto max-h-[320px] select-none font-mono">
            {/* Header */}
            <text x="270" y="18" textAnchor="middle" fill="#f472b6" fontSize="12" fontWeight="bold">
              {modulationType === 'spwm'
                ? 'HALF-BRIDGE SPWM INVERTER (2-LEVEL ±VDC/2)'
                : modulationType === 'unipolar'
                ? 'FULL-BRIDGE UNIPOLAR 3-LEVEL INVERTER (+VDC, 0V, -VDC)'
                : 'FULL-BRIDGE BIPOLAR 2-LEVEL INVERTER (±VDC)'}
            </text>
            <text x="270" y="32" textAnchor="middle" fill="#94a3b8" fontSize="8.5">
              Vdc={busVoltage}V | V1(rms)={physics.v1RmsNet.toFixed(1)}V | THD={physics.thdTotalV.toFixed(1)}% | f0={physics.filterCutoffHz.toFixed(0)}Hz ({physics.attenuationFswDb.toFixed(1)}dB) | η={physics.efficiencyPct.toFixed(1)}%
            </text>

            {/* +VDC Rail (Top) */}
            <line x1="25" y1="50" x2={modulationType === 'spwm' ? '300' : '410'} y2="50" stroke="#ef4444" strokeWidth="2.5" />
            <text x="28" y="44" fill="#ef4444" fontSize="8.5" fontWeight="bold">+VDC (+{busVoltage}V)</text>

            {/* -VDC / GND Rail (Bottom) */}
            <line x1="25" y1="255" x2={modulationType === 'spwm' ? '300' : '410'} y2="255" stroke="#38bdf8" strokeWidth="2.5" />
            <text x="28" y="267" fill="#38bdf8" fontSize="8.5" fontWeight="bold">-VDC (0.0V Return)</text>

            {/* If Half-Bridge: Split DC Link Capacitors C1 & C2 + Neutral Bus Rail */}
            {modulationType === 'spwm' ? (
              <g>
                {/* Neutral Bus N */}
                <line x1="25" y1="150" x2="480" y2="150" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 3" />
                <text x="28" y="144" fill="#06b6d4" fontSize="8" fontWeight="bold">N (0V NEUTRAL MIDPOINT)</text>

                {/* Capacitor C1 */}
                <line x1="80" y1="50" x2="80" y2="92" stroke="#ef4444" strokeWidth="2" />
                <line x1="68" y1="92" x2="92" y2="92" stroke="#38bdf8" strokeWidth="3" />
                <line x1="68" y1="100" x2="92" y2="100" stroke="#38bdf8" strokeWidth="3" />
                <line x1="80" y1="100" x2="80" y2="150" stroke="#06b6d4" strokeWidth="2" />
                <text x="40" y="97" textAnchor="end" fill="#38bdf8" fontSize="8" fontWeight="bold">C1 1000µF</text>

                {/* Capacitor C2 */}
                <line x1="80" y1="150" x2="80" y2="198" stroke="#06b6d4" strokeWidth="2" />
                <line x1="68" y1="198" x2="92" y2="198" stroke="#38bdf8" strokeWidth="3" />
                <line x1="68" y1="206" x2="92" y2="206" stroke="#38bdf8" strokeWidth="3" />
                <line x1="80" y1="206" x2="80" y2="255" stroke="#38bdf8" strokeWidth="2" />
                <text x="40" y="203" textAnchor="end" fill="#38bdf8" fontSize="8" fontWeight="bold">C2 1000µF</text>
              </g>
            ) : null}

            {/* LEG A: Switches Q1 & Q2 */}
            <g transform="translate(190, 0)">
              {/* Q1 Upper Switch */}
              <rect
                x="0"
                y="65"
                width="45"
                height="45"
                fill={q1On ? '#15803d' : '#161b22'}
                stroke={q1On ? '#22c55e' : '#475569'}
                strokeWidth="2"
                rx="5"
              />
              <text x="22" y="92" textAnchor="middle" fill={q1On ? '#ffffff' : '#94a3b8'} fontSize="11" fontWeight="bold">Q1</text>
              {q1On && <circle cx="22" cy="72" r="3" fill="#22c55e" className="animate-ping" />}

              {/* Anti-parallel Diode D1 */}
              <g transform="translate(52, 68)">
                <polygon points="12,5 12,35 0,20" fill={d1On ? '#eab308' : '#161b22'} stroke={d1On ? '#fde047' : '#64748b'} strokeWidth="1.5" />
                <line x1="0" y1="5" x2="0" y2="35" stroke={d1On ? '#fde047' : '#64748b'} strokeWidth="2" />
                <text x="8" y="-3" textAnchor="middle" fill={d1On ? '#fde047' : '#64748b'} fontSize="7" fontWeight="bold">D1</text>
              </g>

              {/* Midpoint Node A */}
              <circle cx="22" cy="150" r="4" fill="#06b6d4" />
              <text x="-5" y="154" fill="#06b6d4" fontSize="9" fontWeight="bold">Node A</text>

              {/* Q2 Lower Switch */}
              <rect
                x="0"
                y="190"
                width="45"
                height="45"
                fill={q2On ? '#15803d' : '#161b22'}
                stroke={q2On ? '#22c55e' : '#475569'}
                strokeWidth="2"
                rx="5"
              />
              <text x="22" y="217" textAnchor="middle" fill={q2On ? '#ffffff' : '#94a3b8'} fontSize="11" fontWeight="bold">Q2</text>
              {q2On && <circle cx="22" cy="197" r="3" fill="#22c55e" className="animate-ping" />}

              {/* Anti-parallel Diode D2 */}
              <g transform="translate(52, 193)">
                <polygon points="12,5 12,35 0,20" fill={d2On ? '#eab308' : '#161b22'} stroke={d2On ? '#fde047' : '#64748b'} strokeWidth="1.5" />
                <line x1="0" y1="5" x2="0" y2="35" stroke={d2On ? '#fde047' : '#64748b'} strokeWidth="2" />
                <text x="8" y="-3" textAnchor="middle" fill={d2On ? '#fde047' : '#64748b'} fontSize="7" fontWeight="bold">D2</text>
              </g>

              {/* Vertical connection lines */}
              <line x1="22" y1="50" x2="22" y2="65" stroke="#ef4444" strokeWidth="2" />
              <line x1="22" y1="110" x2="22" y2="190" stroke="#06b6d4" strokeWidth="2" />
              <line x1="22" y1="235" x2="22" y2="255" stroke="#38bdf8" strokeWidth="2" />
            </g>

            {/* LEG B: Switches Q3 & Q4 (Full-Bridge Bipolar & Unipolar only) */}
            {modulationType !== 'spwm' ? (
              <g transform="translate(300, 0)">
                {/* Q3 Upper Switch */}
                <rect
                  x="0"
                  y="65"
                  width="45"
                  height="45"
                  fill={q3On ? '#15803d' : '#161b22'}
                  stroke={q3On ? '#22c55e' : '#475569'}
                  strokeWidth="2"
                  rx="5"
                />
                <text x="22" y="92" textAnchor="middle" fill={q3On ? '#ffffff' : '#94a3b8'} fontSize="11" fontWeight="bold">Q3</text>
                {q3On && <circle cx="22" cy="72" r="3" fill="#22c55e" className="animate-ping" />}

                {/* Anti-parallel Diode D3 */}
                <g transform="translate(52, 68)">
                  <polygon points="12,5 12,35 0,20" fill={d3On ? '#eab308' : '#161b22'} stroke={d3On ? '#fde047' : '#64748b'} strokeWidth="1.5" />
                  <line x1="0" y1="5" x2="0" y2="35" stroke={d3On ? '#fde047' : '#64748b'} strokeWidth="2" />
                  <text x="8" y="-3" textAnchor="middle" fill={d3On ? '#fde047' : '#64748b'} fontSize="7" fontWeight="bold">D3</text>
                </g>

                {/* Midpoint Node B */}
                <circle cx="22" cy="150" r="4" fill="#a855f7" />
                <text x="30" y="154" fill="#a855f7" fontSize="9" fontWeight="bold">Node B</text>

                {/* Q4 Lower Switch */}
                <rect
                  x="0"
                  y="190"
                  width="45"
                  height="45"
                  fill={q4On ? '#15803d' : '#161b22'}
                  stroke={q4On ? '#22c55e' : '#475569'}
                  strokeWidth="2"
                  rx="5"
                />
                <text x="22" y="217" textAnchor="middle" fill={q4On ? '#ffffff' : '#94a3b8'} fontSize="11" fontWeight="bold">Q4</text>
                {q4On && <circle cx="22" cy="197" r="3" fill="#22c55e" className="animate-ping" />}

                {/* Anti-parallel Diode D4 */}
                <g transform="translate(52, 193)">
                  <polygon points="12,5 12,35 0,20" fill={d4On ? '#eab308' : '#161b22'} stroke={d4On ? '#fde047' : '#64748b'} strokeWidth="1.5" />
                  <line x1="0" y1="5" x2="0" y2="35" stroke={d4On ? '#fde047' : '#64748b'} strokeWidth="2" />
                  <text x="8" y="-3" textAnchor="middle" fill={d4On ? '#fde047' : '#64748b'} fontSize="7" fontWeight="bold">D4</text>
                </g>

                {/* Vertical connection lines */}
                <line x1="22" y1="50" x2="22" y2="65" stroke="#ef4444" strokeWidth="2" />
                <line x1="22" y1="110" x2="22" y2="190" stroke="#a855f7" strokeWidth="2" />
                <line x1="22" y1="235" x2="22" y2="255" stroke="#38bdf8" strokeWidth="2" />
              </g>
            ) : null}

            {/* Output 2nd-Order LC Filter: Choke Lf & Shunt Cf with Animated Flux Halo */}
            <g transform={modulationType === 'spwm' ? 'translate(250, 140)' : 'translate(360, 140)'}>
              {/* Expanding/contracting magnetic energy halo */}
              <ellipse cx="25" cy="10" rx="28" ry="14" fill="#06b6d415" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 3" />
              
              {/* Series Inductor Coils Lf */}
              <path d="M 0 10 Q 7 -5 14 10 Q 21 -5 28 10 Q 35 -5 42 10 Q 49 -5 56 10" fill="none" stroke="#06b6d4" strokeWidth="2.8" />
              <text x="28" y="-7" textAnchor="middle" fill="#06b6d4" fontSize="8" fontWeight="bold">Lf {filterL_mH.toFixed(1)}mH</text>

              {/* Shunt Filter Capacitor Cf */}
              <g transform="translate(68, 10)">
                <line x1="0" y1="0" x2="0" y2="28" stroke="#06b6d4" strokeWidth="1.5" />
                <line x1="-8" y1="28" x2="8" y2="28" stroke="#38bdf8" strokeWidth="2.5" />
                <line x1="-8" y1="34" x2="8" y2="34" stroke="#38bdf8" strokeWidth="2.5" />
                <line x1="0" y1="34" x2="0" y2="60" stroke="#06b6d4" strokeWidth="1.5" />
                <text x="12" y="34" fill="#38bdf8" fontSize="7.5" fontWeight="bold">Cf {filterC_uF.toFixed(0)}µF</text>
              </g>

              {/* Load Resistor RL */}
              <g transform="translate(85, 0)">
                <line x1="-29" y1="10" x2="0" y2="10" stroke="#06b6d4" strokeWidth="2" />
                <rect x="0" y="2" width="28" height="16" fill="#161b22" stroke="#e3b341" strokeWidth="2" />
                <text x="14" y="-6" textAnchor="middle" fill="#e3b341" fontSize="8" fontWeight="bold">RL {loadR}Ω</text>
                <text x="14" y="13" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">LOAD</text>
              </g>
            </g>

            {/* Shoot-Through Cross-Conduction Short Circuit Blast (if t_dead == 0) */}
            {isShootThrough && (
              <g transform="translate(195, 120)">
                <rect x="-10" y="-15" width="65" height="30" fill="#da3633" rx="4" className="animate-pulse" />
                <text x="22" y="4" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                  💥 SHORT!
                </text>
              </g>
            )}

            {/* Animated Conduction Current Dots */}
            {(() => {
              const p = (time * 3) % 1;
              const pathX = 212 + p * 150;
              return (
                <circle cx={pathX} cy="150" r="3.5" fill="#22c55e" className="animate-pulse" />
              );
            })()}
          </svg>
        )}
      </div>
    </div>
  );
};
