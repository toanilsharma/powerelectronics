import React, { useState } from 'react';
import { SoftStarterState } from '../utils/softStarterEngine';
import { Activity, Info, Gauge, AlertTriangle, ShieldCheck, Sliders, Zap } from 'lucide-react';

interface TorqueSpeedCurveProps {
  engineState?: Partial<SoftStarterState>;
  scenario?: string;
  className?: string;
}

/**
 * TorqueSpeedCurve.tsx - Interactive Motor & Load Torque-Speed Diagram
 * 
 * Physics Laws & Kloss Approximation:
 *  - Motor Torque: Te(s) = [2 * Tmax / (s/smax + smax/s)] * (V_motor/100)²
 *  - Direct On Line (DOL) Full Voltage reference overlay (V = 100%)
 *  - Load Torque: Scenarios (Pump Te~w², Fan, Conveyor, Crusher, Compressor)
 *  - Net Accelerating Torque Area: Green (Te > Tl) or Red (Te < Tl -> Motor Stall Risk)
 *  - Interactive V_motor scrub slider & stall slip boundary detection
 */
export const TorqueSpeedCurve: React.FC<TorqueSpeedCurveProps> = ({
  engineState,
  scenario = 'pump',
  className = '',
}) => {
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [manualVoltagePct, setManualVoltagePct] = useState<number>(70);
  const [selectedScenario, setSelectedScenario] = useState<string>(scenario);
  const [showDOLGhost, setShowDOLGhost] = useState<boolean>(true);
  
  const [hoverData, setHoverData] = useState<{
    wPct: number;
    slip: number;
    tePu: number;
    teDolPu: number;
    tlPu: number;
    marginPu: number;
    xSvg: number;
    ySvg: number;
  } | null>(null);

  // Engine Telemetry Values
  const engineVrms = engineState?.VrmsPct ?? 0.0;
  const v_rms_pct = manualMode ? manualVoltagePct : (engineVrms > 0 ? engineVrms : manualVoltagePct);
  const w_current = engineState?.w ?? 0.0;
  const te_current = engineState?.Te ?? 0.0;
  const tl_current = engineState?.Tl ?? 0.0;
  const activeScenario = manualMode ? selectedScenario : (engineState?.scenario ?? selectedScenario);

  // SVG Canvas Dimensions
  const svgWidth = 800;
  const svgHeight = 420;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 40;
  const paddingBottom = 50;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Scale Mapping Functions: w in [0, 1.1], Torque in [0, 2.6]
  const wToX = (w: number) => paddingLeft + (w / 1.1) * chartWidth;
  const tToY = (t: number) => svgHeight - paddingBottom - (t / 2.6) * chartHeight;

  // 1. Calculate Kloss Motor Torque Te(w) at given Voltage V_rms
  const calculateKlossTorque = (w: number, vPct: number) => {
    const s = Math.max(0.001, Math.min(1.0, 1.0 - w));
    const Tmax = 2.2;
    const smax = 0.12;
    const vPu = vPct / 100.0;

    // Kloss Formula: Te(s) = 2*Tmax / (s/smax + smax/s) * (V/Vn)²
    const klossBase = (2.0 * Tmax) / (s / smax + smax / s);
    return klossBase * vPu * vPu;
  };

  // 2. Calculate Load Torque Tl(w) per Scenario
  const calculateLoadTorqueVal = (w: number, scen: string) => {
    const wNorm = Math.max(0.0, Math.min(1.0, w));
    switch (scen) {
      case 'pump':
        return 0.05 + 0.95 * wNorm * wNorm;
      case 'fan':
        return 0.10 + 0.90 * wNorm * wNorm;
      case 'conveyor':
        return wNorm < 0.02 ? 1.30 : 0.90;
      case 'crusher':
        return 0.90 + 0.35 * Math.sin(6 * Math.PI * wNorm);
      case 'compressor':
        return 0.20 + 0.80 * wNorm;
      default:
        return 0.05 + 0.95 * wNorm * wNorm;
    }
  };

  // Generate Curve Points (w from 0.0 to 1.05)
  const steps = 100;
  const motorPoints: { w: number; t: number; x: number; y: number }[] = [];
  const dolPoints: { w: number; t: number; x: number; y: number }[] = [];
  const loadPoints: { w: number; t: number; x: number; y: number }[] = [];

  let stallDetected = false;
  let firstStallSpeed = -1;

  for (let i = 0; i <= steps; i++) {
    const w = (1.05 / steps) * i;
    const te = calculateKlossTorque(w, v_rms_pct);
    const teDol = calculateKlossTorque(w, 100.0);
    const tl = calculateLoadTorqueVal(w, activeScenario);

    motorPoints.push({ w, t: te, x: wToX(w), y: tToY(te) });
    dolPoints.push({ w, t: teDol, x: wToX(w), y: tToY(teDol) });
    loadPoints.push({ w, t: tl, x: wToX(w), y: tToY(tl) });

    if (w < 0.85 && te < tl && !stallDetected) {
      stallDetected = true;
      firstStallSpeed = w;
    }
  }

  // Paths
  const motorPathD = motorPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  const dolPathD = dolPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  const loadPathD = loadPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  const shadedAreaD = `${motorPathD} ${loadPoints.slice().reverse().reduce((acc, pt) => `${acc} L ${pt.x} ${pt.y}`, '')} Z`;

  // Operating Point SVG Position
  const opW = manualMode ? 0.75 : w_current;
  const opTe = manualMode ? calculateKlossTorque(opW, v_rms_pct) : te_current;
  const opX = wToX(opW);
  const opY = tToY(opTe);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xMouse = e.clientX - rect.left;
    const yMouse = e.clientY - rect.top;

    const wHover = Math.max(0.0, Math.min(1.1, ((xMouse - paddingLeft) / chartWidth) * 1.1));
    const teHover = calculateKlossTorque(wHover, v_rms_pct);
    const teDolHover = calculateKlossTorque(wHover, 100.0);
    const tlHover = calculateLoadTorqueVal(wHover, activeScenario);

    setHoverData({
      wPct: Math.round(wHover * 100),
      slip: Number((1.0 - wHover).toFixed(3)),
      tePu: Number(teHover.toFixed(2)),
      teDolPu: Number(teDolHover.toFixed(2)),
      tlPu: Number(tlHover.toFixed(2)),
      marginPu: Number((teHover - tlHover).toFixed(2)),
      xSvg: xMouse,
      ySvg: yMouse,
    });
  };

  const startingTorquePu = calculateKlossTorque(0, v_rms_pct);
  const startingBreakawayLoadPu = calculateLoadTorqueVal(0, activeScenario);

  return (
    <div className={`bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-4 ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span>⚡</span> Induction Motor & Load Torque-Speed Dynamics (Kloss V² Law)
          </h2>
          <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
            Te(s) = [2·Tmax / (s/smax + smax/s)] · (V/Vn)² • Shaded Accelerating Margin Area
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className={`px-3 py-1 rounded-xl border flex items-center gap-1.5 font-bold ${
            stallDetected
              ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] animate-pulse'
              : 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
          }`}>
            {stallDetected ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>{stallDetected ? `STALL DANGER at ${Math.round(firstStallSpeed * 100)}% Speed!` : 'ACCELERATION MARGIN OK'}</span>
          </div>

          <div className="bg-[#0f172a] border border-[#334155] px-3 py-1 rounded-xl text-xs text-[#06b6d4] font-bold">
            V_motor: {v_rms_pct.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-[#0f172a] border border-[#334155] rounded-xl text-xs font-mono">
        {/* Voltage Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[#94a3b8]">
            <span className="flex items-center gap-1 text-white font-bold">
              <Sliders className="w-3.5 h-3.5 text-[#06b6d4]" /> Motor Terminal Voltage
            </span>
            <span className="text-[#06b6d4] font-bold">{v_rms_pct.toFixed(0)}% Un</span>
          </div>
          <input
            type="range"
            min="30"
            max="100"
            step="1"
            value={v_rms_pct}
            onChange={(e) => {
              setManualMode(true);
              setManualVoltagePct(Number(e.target.value));
            }}
            className="w-full accent-[#06b6d4] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#64748b]">
            <span>30% (Severe Sag)</span>
            <span>70% (Soft Start)</span>
            <span>100% (DOL)</span>
          </div>
        </div>

        {/* Scenario Selector */}
        <div className="space-y-1">
          <span className="text-white font-bold flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-[#f59e0b]" /> Driven Mechanical Load
          </span>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'pump', label: 'Centrifugal Pump' },
              { id: 'fan', label: 'Cooling Fan' },
              { id: 'conveyor', label: 'Conveyor' },
              { id: 'crusher', label: 'Crusher' },
              { id: 'compressor', label: 'Compressor' },
            ].map((sc) => (
              <button
                key={sc.id}
                onClick={() => {
                  setManualMode(true);
                  setSelectedScenario(sc.id);
                }}
                className={`px-1.5 py-1 rounded text-[10px] font-bold transition-all ${
                  activeScenario === sc.id
                    ? 'bg-[#f59e0b] text-black shadow-md'
                    : 'bg-[#1e293b] text-[#94a3b8] hover:text-white border border-[#334155]'
                }`}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Toggles & Telemetry */}
        <div className="flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[#94a3b8]">DOL 100% Ghost Curve:</span>
            <button
              onClick={() => setShowDOLGhost(!showDOLGhost)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                showDOLGhost
                  ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#06b6d4]'
                  : 'bg-[#1e293b] border-[#334155] text-[#64748b]'
              }`}
            >
              {showDOLGhost ? 'ENABLED' : 'HIDDEN'}
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#334155]">
            <span className="text-[#94a3b8]">Breakaway Te(0) vs Tl(0):</span>
            <span className={`font-bold ${startingTorquePu >= startingBreakawayLoadPu ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {startingTorquePu.toFixed(2)} pu vs {startingBreakawayLoadPu.toFixed(2)} pu
            </span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative rounded-xl overflow-hidden border border-[#334155] bg-[#0f172a]">
        
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverData(null)}
          className="w-full h-auto block cursor-crosshair select-none"
        >
          {/* 1. Grid Lines */}
          <g stroke="#1e293b" strokeWidth="1">
            {[0, 0.5, 1.0, 1.5, 2.0, 2.5].map((t) => {
              const y = tToY(t);
              return (
                <g key={`y-${t}`}>
                  <line x1={paddingLeft} y1={y} x2={svgWidth - paddingRight} y2={y} />
                  <text x={paddingLeft - 8} y={y + 4} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">
                    {Math.round(t * 100)}%
                  </text>
                </g>
              );
            })}

            {[0, 0.25, 0.5, 0.75, 1.0].map((w) => {
              const x = wToX(w);
              return (
                <g key={`x-${w}`}>
                  <line x1={x} y1={paddingTop} x2={x} y2={svgHeight - paddingBottom} />
                  <text x={x} y={svgHeight - paddingBottom + 16} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
                    {Math.round(w * 100)}%
                  </text>
                </g>
              );
            })}
          </g>

          {/* 2. Key Physical Marker Lines */}
          {/* Synchronous Speed Marker */}
          <line
            x1={wToX(1.0)}
            y1={paddingTop}
            x2={wToX(1.0)}
            y2={svgHeight - paddingBottom}
            stroke="#06b6d4"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />
          <text x={wToX(1.0)} y={paddingTop - 10} fill="#06b6d4" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
            100% Sync Speed (1500 RPM)
          </text>

          {/* Rated Speed Marker (98.7% / 1480 rpm) */}
          <line
            x1={wToX(0.987)}
            y1={paddingTop + 20}
            x2={wToX(0.987)}
            y2={svgHeight - paddingBottom}
            stroke="#10b981"
            strokeWidth="1"
            strokeDasharray="2,2"
          />

          {/* Breakdown Torque Point Marker */}
          <circle
            cx={wToX(0.88)}
            cy={tToY(2.2 * (v_rms_pct / 100) * (v_rms_pct / 100))}
            r="4"
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
          <text
            x={wToX(0.88) + 8}
            y={tToY(2.2 * (v_rms_pct / 100) * (v_rms_pct / 100)) - 6}
            fill="#f59e0b"
            fontSize="9"
            fontFamily="JetBrains Mono"
          >
            T_max Breakdown ({ (2.2 * Math.pow(v_rms_pct / 100, 2)).toFixed(2) } pu)
          </text>

          {/* 3. Shaded Accelerating Torque Area */}
          <path
            d={shadedAreaD}
            fill={stallDetected ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.22)'}
            stroke="none"
          />

          {/* 4. DOL 100% Full Voltage Ghost Curve */}
          {showDOLGhost && (
            <path
              d={dolPathD}
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              strokeDasharray="4,4"
              opacity="0.6"
            />
          )}

          {/* 5. Motor Torque-Speed Curve (Cyan Glow) */}
          <path
            d={motorPathD}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="3"
            style={{ filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))' }}
          />

          {/* 6. Load Torque Curve (Amber Glow) */}
          <path
            d={loadPathD}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeDasharray="6,3"
            style={{ filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))' }}
          />

          {/* 7. Live Operating Point Marker */}
          <g transform={`translate(${opX}, ${opY})`}>
            <circle r="12" fill="#06b6d4" opacity="0.3" className="animate-ping" />
            <circle r="6" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 8px #06b6d4)' }} />
          </g>

          {/* 8. Axis Titles */}
          <text x={svgWidth / 2} y={svgHeight - 10} fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="middle">
            Rotor Speed w (% of Synchronous Speed)
          </text>
          <text
            x={15}
            y={svgHeight / 2}
            fill="#94a3b8"
            fontSize="11"
            fontFamily="JetBrains Mono"
            textAnchor="middle"
            transform={`rotate(-90, 15, ${svgHeight / 2})`}
          >
            Torque (pu of Rated Torque)
          </text>

          {/* 9. Interactive Hover Cursor & Line */}
          {hoverData && (
            <g>
              <line
                x1={hoverData.xSvg}
                y1={paddingTop}
                x2={hoverData.xSvg}
                y2={svgHeight - paddingBottom}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Card */}
        {hoverData && (
          <div className="absolute top-3 right-3 bg-[#1e293b]/95 backdrop-blur border border-[#06b6d4] px-3.5 py-2.5 rounded-xl text-xs font-mono text-white shadow-2xl space-y-1 pointer-events-none z-30">
            <div className="text-[#06b6d4] font-bold border-b border-[#334155] pb-1 mb-1">
              SPEED: {hoverData.wPct}% (Slip s = {hoverData.slip})
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#06b6d4]">Motor Te ({v_rms_pct}%V):</span>
              <span className="font-bold">{hoverData.tePu} pu</span>
            </div>
            {showDOLGhost && (
              <div className="flex justify-between gap-4 text-[#94a3b8]">
                <span>DOL Te (100%V):</span>
                <span>{hoverData.teDolPu} pu</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-[#f59e0b]">Load Tl ({activeScenario}):</span>
              <span className="font-bold">{hoverData.tlPu} pu</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#334155] pt-1 mt-1">
              <span className={hoverData.marginPu >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}>
                Accel Margin:
              </span>
              <span className={`font-bold ${hoverData.marginPu >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {hoverData.marginPu > 0 ? `+${hoverData.marginPu}` : hoverData.marginPu} pu
              </span>
            </div>
          </div>
        )}

        {/* Curve Legend Footer */}
        <div className="absolute bottom-3 left-16 right-16 bg-[#1e293b]/90 backdrop-blur border border-[#334155] px-3.5 py-1.5 rounded-xl text-[10px] font-mono flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#06b6d4]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" /> Motor Te ({v_rms_pct}% V)
            </span>
            {showDOLGhost && (
              <span className="flex items-center gap-1.5 text-[#64748b]">
                <span className="w-2.5 h-0.5 bg-[#64748b]" /> DOL Te (100% V)
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[#f59e0b]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Load Tl ({activeScenario})
            </span>
            <span className="flex items-center gap-1.5 text-[#10b981]">
              <span className="w-2.5 h-2.5 rounded bg-[#10b981]/40" /> Net Accel Torque
            </span>
          </div>

          <div className="text-white font-semibold flex items-center gap-1">
            <Gauge className="w-3 h-3 text-[#06b6d4]" />
            <span>(w: {Math.round(opW * 100)}%, Te: {opTe.toFixed(2)}pu)</span>
          </div>
        </div>

      </div>

      {/* Physics Teaching Card */}
      <div className="p-3.5 bg-[#0f172a] border border-[#334155] rounded-xl text-xs space-y-1 text-[#94a3b8]">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#06b6d4]" />
          Torque-Speed Physics & Acceleration Margin (Kloss Equation)
        </div>
        <p className="text-[11px] leading-relaxed">
          Electromagnetic motor torque is proportional to the square of voltage: <span className="text-white font-mono">Te ∝ V²</span>.
          When starting at 70% voltage, torque drops to 49% (0.7² = 0.49). If terminal voltage is set too low (e.g. &lt;50%), the motor torque curve sinks below the load torque curve (shaded red), causing a stall condition where current remains at 400–600% locked-rotor levels without spinning, leading to thermal trip within seconds!
        </p>
      </div>

    </div>
  );
};

