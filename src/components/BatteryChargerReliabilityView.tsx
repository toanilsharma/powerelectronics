import React, { useState, useEffect } from 'react';
import { ActiveFaults, AlarmEntry } from '../types/batteryCharger';
import { Activity, Thermometer, ShieldCheck, History, Cpu, Clock } from 'lucide-react';

interface BatteryChargerReliabilityViewProps {
  voltageIn: number;
  loadPct: number;
  firingAngle: number;
  q1Closed: boolean;
  q2Closed: boolean;
  q3Closed: boolean;
  isRunning: boolean;
  soc: number;
  activeFaults: ActiveFaults;
  hasLcFilter: boolean;
  alarms: AlarmEntry[];
}

export const BatteryChargerReliabilityView: React.FC<BatteryChargerReliabilityViewProps> = ({
  voltageIn,
  loadPct,
  firingAngle,
  q1Closed,
  q2Closed,
  q3Closed,
  isRunning,
  soc,
  activeFaults,
  hasLcFilter,
  alarms,
}) => {
  const [ambientTemp, setAmbientTemp] = useState<number>(25);
  const [opHours, setOpHours] = useState<number>(34250);

  // Auto-increment operating hours timer
  useEffect(() => {
    const timer = setInterval(() => {
      setOpHours((prev) => prev + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Calculate current AC Ripple %
  const currentRipplePct = !q1Closed
    ? 0
    : activeFaults.filterCapOpen
    ? 9.0
    : hasLcFilter
    ? Math.max(0.2, (firingAngle / 67) * 0.4)
    : Math.max(1.5, (firingAngle / 67) * 3.8);

  const effectiveTemp = activeFaults.roomFanFail ? 72.0 : ambientTemp;

  // IEEE 1188 Battery Life Expectancy Calculation
  // Nominal life = 15 years @ <0.5% ripple & 25°C
  const calculateBatteryLifeYears = (ripplePct: number, tempC: number) => {
    let life = 15.0;
    // Ripple penalty
    if (ripplePct > 0.5) {
      life *= Math.max(0.15, 1 - (ripplePct - 0.5) * 0.25);
    }
    // Temperature penalty: Every 10°C above 25°C halves battery life
    if (tempC > 25) {
      life *= Math.pow(0.5, (tempC - 25) / 10);
    }
    // Equalize timer forgotten penalty: 10% reduction due to gassing & water loss
    if (activeFaults.equalizeForgotten) {
      life *= 0.90;
    }
    return Math.max(0.5, life);
  };

  const expectedLifeYears = calculateBatteryLifeYears(currentRipplePct, effectiveTemp);

  // Temperature Compensation Curve (-3mV/cell/°C)
  // Nominal @ 25°C = 2.23V/cell * 55 cells = 122.65V
  const floatVoltagePerCell = 2.23 - (effectiveTemp - 25) * 0.003;
  const targetFloatVoltageString = floatVoltagePerCell * 55;

  // Capacitor C1 ESR Trend calculation (mΩ)
  const capacitorEsr = 20 + (opHours / 1000) * 0.8 + (hasLcFilter && !activeFaults.filterCapOpen ? 0 : 18);

  // Formatted Timestamp Generator
  const getFormattedTimestamp = (offsetSec: number = 0) => {
    const d = new Date(Date.now() - offsetSec * 1000);
    return d.toISOString().replace('T', ' ').substring(0, 19);
  };

  // Synthetic Event Logger array combining live alarms + operational events
  const eventLogs = [
    {
      id: 'EVT-101',
      timestamp: getFormattedTimestamp(0),
      level: hasLcFilter ? 'INFO' : 'WARNING',
      source: 'LC FILTER ENGINE',
      message: hasLcFilter
        ? 'LC Filter Active (L1=2.5mH, C1=4700µF). AC Ripple < 0.5% Vrms (IEEE 1188 Limit Pass).'
        : 'LC Filter Bypassed! Elevated DC Ripple detected (> 3.5% Vrms). Battery grid corrosion risk increased.',
    },
    {
      id: 'EVT-102',
      timestamp: getFormattedTimestamp(120),
      level: 'INFO',
      source: 'TEMP COMPENSATOR',
      message: `Ambient Temperature ${ambientTemp}°C. Temperature Compensation slope -3mV/cell/°C active. Target: ${targetFloatVoltageString.toFixed(2)}V (${floatVoltagePerCell.toFixed(3)}V/cell).`,
    },
    {
      id: 'EVT-103',
      timestamp: getFormattedTimestamp(300),
      level: 'INFO',
      source: 'THYRISTOR FIRING',
      message: `SCR Firing Angle α = ${firingAngle}°. Phase Angle Synchronized to 415VAC 3-Phase Mains.`,
    },
    ...alarms.map((a, idx) => ({
      id: `ALM-${idx + 200}`,
      timestamp: a.time || getFormattedTimestamp(),
      level: a.level === 'TRIP' ? 'FAULT' : a.level === 'WARNING' ? 'WARNING' : 'INFO',
      source: 'PROTECTION RELAY',
      message: a.message,
    })),
  ];

  return (
    <div className="flex flex-col gap-6 w-full text-slate-200">
      {/* HEADER BAR: PRO RELIABILITY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MTBF COUNTER */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b949e] text-xs font-bold">
            <span>MTBF COUNTER</span>
            <ShieldCheck className="w-4 h-4 text-[#3fb950]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-[#3fb950]">
              142,800 <span className="text-xs font-normal text-[#8b949e]">Hours</span>
            </span>
            <div className="text-[10px] text-[#8b949e] font-mono mt-1 flex justify-between">
              <span>Availability: 99.9985%</span>
              <span>MTTR: 1.5h</span>
            </div>
          </div>
        </div>

        {/* BATTERY DESIGN LIFE (IEEE 1188) */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b949e] text-xs font-bold">
            <span>EXPECTED BATTERY LIFE</span>
            <Activity className="w-4 h-4 text-[#58a6ff]" />
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-mono font-bold ${expectedLifeYears > 10 ? 'text-[#3fb950]' : expectedLifeYears > 5 ? 'text-[#e3b341]' : 'text-[#f85149]'}`}>
              {expectedLifeYears.toFixed(1)} <span className="text-xs font-normal text-[#8b949e]">Years</span>
            </span>
            <div className="text-[10px] text-[#8b949e] font-mono mt-1">
              IEEE 1188 Standard (Nominal 15 Yrs)
            </div>
          </div>
        </div>

        {/* CAPACITOR C1 ESR HEALTH */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b949e] text-xs font-bold">
            <span>CAPACITOR C1 ESR HEALTH</span>
            <Cpu className="w-4 h-4 text-[#d2a8ff]" />
          </div>
          <div className="mt-2">
            <span className={`text-2xl font-mono font-bold ${capacitorEsr < 40 ? 'text-[#3fb950]' : 'text-[#e3b341]'}`}>
              {capacitorEsr.toFixed(1)} <span className="text-xs font-normal text-[#8b949e]">mΩ</span>
            </span>
            <div className="text-[10px] text-[#8b949e] font-mono mt-1">
              {capacitorEsr < 50 ? 'HEALTHY (Limit 80mΩ)' : 'AGED - Replace C1 Soon'}
            </div>
          </div>
        </div>

        {/* TOTAL OPERATING HOURS */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b949e] text-xs font-bold">
            <span>TOTAL OPERATING HOURS</span>
            <Clock className="w-4 h-4 text-[#e3b341]" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-[#e3b341]">
              {opHours.toLocaleString()} <span className="text-xs font-normal text-[#8b949e]">hrs</span>
            </span>
            <div className="text-[10px] text-[#8b949e] font-mono mt-1">
              Continuous Refinery Service
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: BATTERY AGING CHART & TEMPERATURE COMPENSATION CURVE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: BATTERY AGING CHART [RIPPLE VS LIFE PER IEEE 1188] */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#58a6ff]" />
                IEEE 1188 Battery Aging Chart (AC Ripple vs Design Life)
              </h3>
              <p className="text-xs text-[#8b949e] mt-0.5">
                VRLA battery life degradation from AC ripple current & heat dissipation
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[#0d1117] text-[#58a6ff] border border-[#30363d]">
              Ripple: {currentRipplePct.toFixed(2)}% Vrms
            </span>
          </div>

          {/* SVG GRAPH */}
          <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d] relative">
            <svg viewBox="0 0 500 200" className="w-full h-48 overflow-visible">
              {/* Grid Lines */}
              {[0, 5, 10, 15].map((yVal, i) => {
                const y = 170 - (yVal / 15) * 150;
                return (
                  <g key={i}>
                    <line x1={40} y1={y} x2={480} y2={y} stroke="#21262d" strokeWidth={1} strokeDasharray="4 4" />
                    <text x={32} y={y + 4} textAnchor="end" fill="#8b949e" fontSize={9} fontFamily="monospace">
                      {yVal}y
                    </text>
                  </g>
                );
              })}

              {/* X Axis Ticks */}
              {[0, 1, 2, 3, 4, 5].map((xVal, i) => {
                const x = 40 + (xVal / 5) * 440;
                return (
                  <g key={i}>
                    <line x1={x} y1={170} x2={x} y2={175} stroke="#30363d" strokeWidth={1} />
                    <text x={x} y={188} textAnchor="middle" fill="#8b949e" fontSize={9} fontFamily="monospace">
                      {xVal}%
                    </text>
                  </g>
                );
              })}

              {/* IEEE 1188 Recommended Limit Zone (<0.5%) */}
              <rect x={40} y={20} width={44} height={150} fill="#3fb950" fillOpacity={0.12} />
              <line x1={84} y1={20} x2={84} y2={170} stroke="#3fb950" strokeWidth={1.5} strokeDasharray="3 3" />
              <text x={88} y={32} fill="#3fb950" fontSize={8} fontWeight="bold" fontFamily="monospace">
                IEEE 1188 Limit (&lt;0.5%)
              </text>

              {/* Curve Line */}
              {(() => {
                const points: string[] = [];
                for (let r = 0; r <= 5; r += 0.1) {
                  const life = calculateBatteryLifeYears(r, 25);
                  const x = 40 + (r / 5) * 440;
                  const y = 170 - (life / 15) * 150;
                  points.push(`${x},${y}`);
                }
                return <polyline points={points.join(' ')} fill="none" stroke="#58a6ff" strokeWidth={3} />;
              })()}

              {/* Live Operating Point */}
              {(() => {
                const cx = 40 + (Math.min(5, currentRipplePct) / 5) * 440;
                const cy = 170 - (calculateBatteryLifeYears(currentRipplePct, 25) / 15) * 150;
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={7} fill="#f85149" className="animate-ping" opacity={0.5} />
                    <circle cx={cx} cy={cy} r={5} fill="#e3b341" stroke="#ffffff" strokeWidth={2} />
                    <text x={cx + 10} y={cy - 5} fill="#e3b341" fontSize={10} fontWeight="bold" fontFamily="monospace">
                      CURRENT ({expectedLifeYears.toFixed(1)} yrs)
                    </text>
                  </g>
                );
              })()}
            </svg>
            <div className="text-[10px] text-[#8b949e] font-mono text-center mt-2">
              X-Axis: AC Ripple Voltage (% Vrms) | Y-Axis: Battery Design Life (Years)
            </div>
          </div>
        </div>

        {/* CHART 2: TEMPERATURE COMPENSATION CURVE [-3mV/cell/°C] */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-[#e3b341]" />
                Temperature Compensation Curve (-3mV / cell / °C)
              </h3>
              <p className="text-xs text-[#8b949e] mt-0.5">
                VRLA float voltage regulation dynamically adjusted to prevent thermal runaway
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[#0d1117] text-[#e3b341] border border-[#30363d]">
              {ambientTemp}°C Ambient
            </span>
          </div>

          {/* Interactive Temperature Control Slider */}
          <div className="flex items-center gap-4 bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
            <span className="text-xs font-mono text-[#8b949e]">Battery Temp:</span>
            <input
              type="range"
              min={10}
              max={50}
              value={ambientTemp}
              onChange={(e) => setAmbientTemp(Number(e.target.value))}
              className="w-full accent-[#e3b341] cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-[#e3b341] min-w-[45px]">
              {ambientTemp} °C
            </span>
          </div>

          {/* SVG GRAPH */}
          <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
            <svg viewBox="0 0 500 160" className="w-full h-40 overflow-visible">
              {/* Y Axis Grid */}
              {[2.15, 2.20, 2.23, 2.28, 2.30].map((vVal, i) => {
                const y = 140 - ((vVal - 2.15) / 0.15) * 120;
                return (
                  <g key={i}>
                    <line x1={40} y1={y} x2={480} y2={y} stroke="#21262d" strokeWidth={1} strokeDasharray="4 4" />
                    <text x={32} y={y + 3} textAnchor="end" fill="#8b949e" fontSize={9} fontFamily="monospace">
                      {vVal.toFixed(2)}V
                    </text>
                  </g>
                );
              })}

              {/* X Axis Ticks */}
              {[10, 20, 25, 30, 40, 50].map((tVal, i) => {
                const x = 40 + ((tVal - 10) / 40) * 440;
                return (
                  <g key={i}>
                    <line x1={x} y1={140} x2={x} y2={145} stroke="#30363d" strokeWidth={1} />
                    <text x={x} y={157} textAnchor="middle" fill="#8b949e" fontSize={9} fontFamily="monospace">
                      {tVal}°C
                    </text>
                  </g>
                );
              })}

              {/* Compensation Slope Line */}
              {(() => {
                const x1 = 40;
                const y1 = 140 - ((2.23 - (10 - 25) * 0.003 - 2.15) / 0.15) * 120;
                const x2 = 480;
                const y2 = 140 - ((2.23 - (50 - 25) * 0.003 - 2.15) / 0.15) * 120;
                return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e3b341" strokeWidth={3} />;
              })()}

              {/* Active Temp Marker */}
              {(() => {
                const cx = 40 + ((ambientTemp - 10) / 40) * 440;
                const cy = 140 - ((floatVoltagePerCell - 2.15) / 0.15) * 120;
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={6} fill="#f85149" className="animate-ping" opacity={0.5} />
                    <circle cx={cx} cy={cy} r={4} fill="#58a6ff" stroke="#ffffff" strokeWidth={1.5} />
                    <text x={cx + 8} y={cy - 4} fill="#58a6ff" fontSize={10} fontWeight="bold" fontFamily="monospace">
                      {targetFloatVoltageString.toFixed(1)}V ({floatVoltagePerCell.toFixed(3)}V/cell)
                    </text>
                  </g>
                );
              })()}
            </svg>
            <div className="text-[10px] text-[#8b949e] font-mono text-center mt-2">
              X-Axis: Temperature (°C) | Y-Axis: Target Float Voltage per Cell (55 Cells total)
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3: EVENT LOGGER WITH TIMESTAMP */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-lg flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-[#d2a8ff]" />
            Real-Time Diagnostic & Reliability Event Log
          </h3>
          <span className="text-xs font-mono text-[#8b949e]">ISO 8601 Timestamps</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#0d1117] text-[#8b949e] border-b border-[#30363d]">
                <th className="p-2.5">EVENT ID</th>
                <th className="p-2.5">TIMESTAMP</th>
                <th className="p-2.5">SEVERITY</th>
                <th className="p-2.5">SOURCE</th>
                <th className="p-2.5">EVENT DESCRIPTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
              {eventLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#21262d]/50 transition-colors">
                  <td className="p-2.5 text-[#58a6ff] font-bold">{log.id}</td>
                  <td className="p-2.5 text-[#8b949e] whitespace-nowrap">{log.timestamp}</td>
                  <td className="p-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.level === 'FAULT'
                          ? 'bg-[#490202] text-[#f85149] border border-[#da3633]'
                          : log.level === 'WARNING'
                          ? 'bg-[#382300] text-[#f2cc60] border border-[#d29922]'
                          : 'bg-[#0e4429] text-[#3fb950] border border-[#238636]'
                      }`}
                    >
                      {log.level}
                    </span>
                  </td>
                  <td className="p-2.5 text-[#c9d1d9] font-semibold">{log.source}</td>
                  <td className="p-2.5 text-[#8b949e]">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
