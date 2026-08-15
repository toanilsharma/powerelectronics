import React, { useState } from 'react';
import { BatteryChargerSLD } from './BatteryChargerSLD';
import { ActiveFaults } from '../types/batteryCharger';
import { Gauge, Zap, Play, ShieldAlert, CheckCircle2, Sliders } from 'lucide-react';

interface BatteryChargerOperatorViewProps {
  voltageIn: number;
  loadPct: number;
  firingAngle: number;
  setFiringAngle: (angle: number) => void;
  isRunning: boolean;
  q1Closed: boolean;
  setQ1Closed: (val: boolean) => void;
  q2Closed: boolean;
  setQ2Closed: (val: boolean) => void;
  q3Closed: boolean;
  setQ3Closed: (val: boolean) => void;
  soc: number;
  activeFaults: ActiveFaults;
  hasLcFilter: boolean;
}

export const BatteryChargerOperatorView: React.FC<BatteryChargerOperatorViewProps> = ({
  voltageIn,
  loadPct,
  firingAngle,
  setFiringAngle,
  isRunning,
  q1Closed,
  setQ1Closed,
  q2Closed,
  setQ2Closed,
  q3Closed,
  setQ3Closed,
  soc,
  activeFaults,
  hasLcFilter,
}) => {
  const [opMode, setOpMode] = useState<'FLOAT' | 'BOOST'>('FLOAT');
  const [isWalkingIn, setIsWalkingIn] = useState<boolean>(false);
  const [walkProgress, setWalkProgress] = useState<number>(0);

  // Calculated parameters
  const rad = (firingAngle * Math.PI) / 180;
  let vdc = q1Closed
    ? Math.max(0, 122.65 * (voltageIn / 415) * (Math.cos(rad) / Math.cos((67 * Math.PI) / 180)))
    : q2Closed
    ? 110 + (soc - 50) * 0.15
    : 0;

  if (activeFaults.scrT3Open) vdc *= 0.75;
  if (activeFaults.acPhaseLossL2) vdc *= 0.80;
  if (activeFaults.dcOvervoltage) vdc = 145.0;
  if (activeFaults.controlFuseBlown) vdc = q2Closed ? 110 + (soc - 50) * 0.15 : 0;
  if (activeFaults.equalizeForgotten) vdc = 137.5;
  if (activeFaults.looseTerminal && q3Closed && loadPct > 0) vdc = Math.max(85, vdc - 26.5);

  const idc = q3Closed ? (activeFaults.controlFuseBlown ? 0 : activeFaults.roomFanFail ? Math.min((loadPct / 100) * 50, 25) : (loadPct / 100) * 50) : 2.0;

  // Status lamps evaluation
  const powerOk = q1Closed && !activeFaults.controlFuseBlown;
  const isAnyFault = Boolean(
    activeFaults.scrT3Open ||
      activeFaults.acPhaseLossL2 ||
      activeFaults.groundFault ||
      activeFaults.dcOvervoltage ||
      activeFaults.loadTrip ||
      activeFaults.controlFuseBlown ||
      activeFaults.filterCapOpen ||
      activeFaults.looseTerminal ||
      activeFaults.roomFanFail ||
      activeFaults.equalizeForgotten ||
      firingAngle > 90
  );

  let chargingStateLabel = 'FLOAT (122.6V)';
  let chargingColorClass = 'text-[#3fb950] bg-[#0e4429] border-[#238636]';
  if (!q1Closed) {
    chargingStateLabel = 'OFF / DISCHARGING';
    chargingColorClass = 'text-[#8b949e] bg-[#21262d] border-[#30363d]';
  } else if (vdc < 122.6 && loadPct > 50) {
    chargingStateLabel = 'CC CURRENT LIMIT (50A)';
    chargingColorClass = 'text-[#f2cc60] bg-[#382300] border-[#d29922] animate-pulse';
  } else if (opMode === 'BOOST' || vdc > 128.0) {
    chargingStateLabel = 'BOOST MODE (132.0V)';
    chargingColorClass = 'text-[#58a6ff] bg-[#0d3880] border-[#1f6beb]';
  }

  const handleSetFloat = () => {
    setOpMode('FLOAT');
    setFiringAngle(67);
  };

  const handleSetBoost = () => {
    setOpMode('BOOST');
    setFiringAngle(45); // Boost setpoint ~132V
  };

  const handleWalkIn = () => {
    if (isWalkingIn) return;
    setIsWalkingIn(true);
    setWalkProgress(0);
    setFiringAngle(88); // start retarding firing angle

    let prog = 0;
    const interval = setInterval(() => {
      prog += 10;
      setWalkProgress(prog);
      const angle = 88 - (prog / 100) * 21; // ramp down to 67 deg
      setFiringAngle(Math.round(angle));

      if (prog >= 100) {
        clearInterval(interval);
        setIsWalkingIn(false);
      }
    }, 500);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* TOP OPERATOR DIGITAL DASHBOARD CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* DC VOLTAGE */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-[#8b949e] text-xs font-semibold">
            <span>DC BUS VOLTAGE</span>
            <Zap className="w-4 h-4 text-[#3fb950]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-[#3fb950]">
              {vdc.toFixed(1)} <span className="text-xs font-normal text-[#8b949e]">VDC</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161b22] text-[#8b949e]">
              Nominal 110V
            </span>
          </div>
        </div>

        {/* DC CURRENT */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-[#8b949e] text-xs font-semibold">
            <span>DC LOAD CURRENT</span>
            <Gauge className="w-4 h-4 text-[#58a6ff]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-[#58a6ff]">
              {idc.toFixed(1)} <span className="text-xs font-normal text-[#8b949e]">A</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161b22] text-[#8b949e]">
              Max 100A
            </span>
          </div>
        </div>

        {/* BATTERY SOC */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-[#8b949e] text-xs font-semibold">
            <span>BATTERY STATE OF CHARGE</span>
            <span className="text-xs">🔋</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-[#e3b341]">
              {soc.toFixed(0)}%
            </span>
            <div className="w-20 bg-[#21262d] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#e3b341] h-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, soc))}%` }}
              />
            </div>
          </div>
        </div>

        {/* CHARGER OPERATING MODE */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between text-[#8b949e] text-xs font-semibold">
            <span>CHARGER MODE</span>
            <Sliders className="w-4 h-4 text-[#d2a8ff]" />
          </div>
          <div className="mt-2">
            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded border inline-block ${chargingColorClass}`}>
              {chargingStateLabel}
            </span>
          </div>
        </div>

        {/* SYSTEM ANNUNCIATOR LAMPS */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3.5 flex flex-col justify-between shadow-md">
          <div className="text-[#8b949e] text-[11px] font-bold uppercase tracking-wider mb-1">
            STATUS ANNUNCIATOR
          </div>
          <div className="grid grid-cols-4 gap-1 text-center pt-1">
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full ${powerOk ? 'bg-[#3fb950] shadow-[0_0_6px_#3fb950]' : 'bg-[#21262d]'}`} />
              <span className="text-[9px] text-[#8b949e] font-mono mt-1">POWER</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full ${q1Closed && q2Closed ? 'bg-[#3fb950] shadow-[0_0_6px_#3fb950]' : 'bg-[#21262d]'}`} />
              <span className="text-[9px] text-[#8b949e] font-mono mt-1">FLOAT</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full ${isAnyFault ? 'bg-[#f85149] shadow-[0_0_6px_#f85149]' : 'bg-[#21262d]'}`} />
              <span className="text-[9px] text-[#8b949e] font-mono mt-1">FAULT</span>
            </div>
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full ${activeFaults.groundFault ? 'bg-[#f85149] shadow-[0_0_6px_#f85149]' : 'bg-[#3fb950] shadow-[0_0_6px_#3fb950]'}`} />
              <span className="text-[9px] text-[#8b949e] font-mono mt-1">GND</span>
            </div>
          </div>
        </div>
      </div>

      {/* OPERATOR CONTROL ACTIONS BAR */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#c9d1d9] uppercase tracking-wide flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-[#58a6ff]" />
            Operator Quick Controls:
          </span>

          <button
            onClick={handleSetFloat}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              opMode === 'FLOAT' && firingAngle <= 75
                ? 'bg-[#238636] text-white shadow-md border border-[#3fb950]'
                : 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950]" />
            FLOAT MODE (122.6V)
          </button>

          <button
            onClick={handleSetBoost}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              opMode === 'BOOST'
                ? 'bg-[#1f6beb] text-white shadow-md border border-[#58a6ff]'
                : 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-[#58a6ff]" />
            BOOST MODE (132V)
          </button>

          <button
            onClick={handleWalkIn}
            disabled={isWalkingIn || !q1Closed}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              isWalkingIn
                ? 'bg-[#d29922] text-black animate-pulse'
                : 'bg-[#21262d] text-[#e3b341] hover:bg-[#30363d] border border-[#d29922]/40'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            {isWalkingIn ? `WALK-IN START (${walkProgress}%)` : 'WALK-IN SOFT START (10s)'}
          </button>
        </div>

        {/* QUICK BREAKER TOGGLES */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQ1Closed(!q1Closed)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              q1Closed ? 'bg-[#0e4429] text-[#3fb950] border border-[#238636]' : 'bg-[#490202] text-[#f85149] border border-[#da3633]'
            }`}
          >
            52-Q1 AC: {q1Closed ? 'CLOSED' : 'OPEN'}
          </button>

          <button
            onClick={() => setQ2Closed(!q2Closed)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              q2Closed ? 'bg-[#0e4429] text-[#3fb950] border border-[#238636]' : 'bg-[#490202] text-[#f85149] border border-[#da3633]'
            }`}
          >
            52-Q2 BATT: {q2Closed ? 'CLOSED' : 'OPEN'}
          </button>

          <button
            onClick={() => setQ3Closed(!q3Closed)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              q3Closed ? 'bg-[#0e4429] text-[#3fb950] border border-[#238636]' : 'bg-[#490202] text-[#f85149] border border-[#da3633]'
            }`}
          >
            52-Q3 LOAD: {q3Closed ? 'CLOSED' : 'OPEN'}
          </button>
        </div>
      </div>

      {/* SIMPLIFIED SLD MAIN CANVAS DISPLAY */}
      <div className="w-full">
        <BatteryChargerSLD
          voltageIn={voltageIn}
          loadPct={loadPct}
          firingAngle={firingAngle}
          isRunning={isRunning}
          q1Closed={q1Closed}
          q2Closed={q2Closed}
          q3Closed={q3Closed}
          onToggleQ1={() => setQ1Closed(!q1Closed)}
          onToggleQ2={() => setQ2Closed(!q2Closed)}
          onToggleQ3={() => setQ3Closed(!q3Closed)}
          soc={soc}
          activeFaults={activeFaults}
          hasLcFilter={hasLcFilter}
        />
      </div>
    </div>
  );
};
