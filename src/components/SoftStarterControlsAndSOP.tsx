import React, { useState } from 'react';
import { LoadType, StartMode, SoftStarterParams, SoftStarterReadouts } from '../types/softStarter';
import { CheckSquare, Square, FileText, Settings, Play, Square as StopIcon, RefreshCw, ShieldCheck, Zap, CheckCircle2 } from 'lucide-react';
import { InteractiveSOPWizard, SOPStepItem } from './InteractiveSOPWizard';

interface SoftStarterControlsAndSOPProps {
  params: SoftStarterParams;
  readouts: SoftStarterReadouts;
  isRunning: boolean;
  isTrip: boolean;
  onUpdateParams: (newParams: Partial<SoftStarterParams>) => void;
  onStart: () => void;
  onStop: () => void;
  onJog: () => void;
}

export const SoftStarterControlsAndSOP: React.FC<SoftStarterControlsAndSOPProps> = ({
  params,
  readouts,
  isRunning,
  isTrip,
  onUpdateParams,
  onStart,
  onStop,
  onJog,
}) => {
  // Interactive SOP Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isSopCompleted, setIsSopCompleted] = useState<boolean>(false);

  const sopWizardSteps: SOPStepItem[] = [
    {
      id: 1,
      title: '1. Verify pump suction valve OPEN',
      description: 'Ensure pump suction line is flooded and suction valve fully open to prevent cavitation.',
      actionLabel: 'Confirm Suction Valve Open',
    },
    {
      id: 2,
      title: '2. Verify discharge valve CLOSED',
      description: 'Ensure discharge valve is closed to minimize initial mechanical starting torque load.',
      actionLabel: 'Confirm Discharge Closed',
    },
    {
      id: 3,
      title: '3. Set ramp time: 15 seconds',
      description: 'Configure soft starter ramp time to 15 seconds for smooth acceleration.',
      actionLabel: 'Set Ramp Time to 15s',
      onExecute: () => onUpdateParams({ rampTimeSec: 15 }),
    },
    {
      id: 4,
      title: '4. Set current limit: 300%',
      description: 'Set peak current limit clamp to 300% rated FLA to prevent voltage sag on mains.',
      actionLabel: 'Set Current Limit 300%',
      onExecute: () => onUpdateParams({ currentLimitPct: 300 }),
    },
    {
      id: 5,
      title: '5. Set initial breakaway voltage: 40%',
      description: 'Set initial voltage pedestal to 40% (166V) to overcome mechanical stiction.',
      actionLabel: 'Set Initial Volts 40%',
      onExecute: () => onUpdateParams({ initialVoltagePct: 40 }),
    },
    {
      id: 6,
      title: '6. Issue START command to soft starter',
      description: 'Trigger SCR phase-angle firing to begin voltage ramp up.',
      actionLabel: 'Issue Soft Start Command',
      onExecute: () => onStart(),
    },
    {
      id: 7,
      title: '7. Monitor motor current envelope during ramp up',
      description: 'Verify starting current stays clamped below set 300% limit.',
      actionLabel: 'Confirm Ramp Current OK',
    },
    {
      id: 8,
      title: '8. Verify bypass contactor KM1 closes at top of ramp',
      description: 'Ensure internal bypass contactor engages to bypass SCRs during steady-state run.',
      actionLabel: 'Confirm Bypass KM1 Closed',
    },
    {
      id: 9,
      title: '9. Open discharge valve slowly',
      description: 'Gradually open pump discharge valve to establish rated system hydraulic flow.',
      actionLabel: 'Confirm Discharge Valve Open',
    },
    {
      id: 10,
      title: '10. Verify motor operating current < 269A FLA',
      description: 'Confirm motor running current is stable and within nameplate 269A full-load amps.',
      actionLabel: 'Confirm FLA & Complete SOP',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs select-none">
      {/* LEFT: PARAMETER TUNING & COMMAND BUTTONS */}
      <div className="bg-[#0d131f] border border-[#1e293b] rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Settings className="w-4 h-4 text-[#00e5a0]" />
            <span>SOFT STARTER WORKSTATION CONTROLS</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onStart}
              disabled={isRunning || isTrip}
              className="px-3.5 py-1.5 rounded-xl bg-[#00e5a0] hover:bg-[#00c98c] disabled:opacity-30 text-[#070a10] font-extrabold text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> START
            </button>
            <button
              onClick={onStop}
              disabled={!isRunning}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
            >
              <StopIcon className="w-3.5 h-3.5 fill-current" /> STOP
            </button>
            <button
              onClick={onJog}
              disabled={isRunning || isTrip}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> JOG
            </button>
          </div>
        </div>

        {/* MAINS VOLTAGE, MOTOR POWER & WIRING SELECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#070a10] p-3 rounded-xl border border-[#1e293b]">
          {/* VOLTAGE INPUT */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center font-bold text-slate-300">
              <span>MAINS VOLTAGE:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="200"
                  max="690"
                  step="5"
                  value={params.lineVoltageNominal || 415}
                  onChange={(e) => onUpdateParams({ lineVoltageNominal: Math.max(200, Math.min(690, Number(e.target.value))) })}
                  className="w-16 bg-[#0d131f] border border-[#1e293b] rounded px-1.5 py-0.5 text-cyan-300 font-bold text-xs text-center focus:outline-none focus:border-[#00e5a0]"
                />
                <span className="text-cyan-400 font-mono">V</span>
              </div>
            </div>
            <input
              type="range"
              min="200"
              max="690"
              step="5"
              value={params.lineVoltageNominal || 415}
              onChange={(e) => onUpdateParams({ lineVoltageNominal: Number(e.target.value) })}
              className="w-full accent-[#00e5a0] cursor-pointer h-1.5 bg-[#121a29] rounded"
            />
          </div>

          {/* MOTOR POWER KW */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center font-bold text-slate-300">
              <span>MOTOR POWER:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="10"
                  max="500"
                  step="5"
                  value={params.motorPowerKw || 160}
                  onChange={(e) => onUpdateParams({ motorPowerKw: Math.max(10, Math.min(500, Number(e.target.value))) })}
                  className="w-16 bg-[#0d131f] border border-[#1e293b] rounded px-1.5 py-0.5 text-[#00e5a0] font-bold text-xs text-center focus:outline-none focus:border-[#00e5a0]"
                />
                <span className="text-[#00e5a0] font-mono">kW</span>
              </div>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="5"
              value={params.motorPowerKw || 160}
              onChange={(e) => onUpdateParams({ motorPowerKw: Number(e.target.value) })}
              className="w-full accent-[#00e5a0] cursor-pointer h-1.5 bg-[#121a29] rounded"
            />
          </div>

          {/* WIRING CONNECTION */}
          <div className="flex flex-col gap-1">
            <span className="font-bold text-slate-300">WIRING TOPOLOGY</span>
            <div className="grid grid-cols-2 gap-1 mt-0.5">
              {['IN_LINE', 'INSIDE_DELTA'].map((w) => (
                <button
                  key={w}
                  onClick={() => onUpdateParams({ wiringConnection: w as 'IN_LINE' | 'INSIDE_DELTA' })}
                  className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                    (params.wiringConnection || 'IN_LINE') === w
                      ? 'bg-[#00e5a0]/20 border-[#00e5a0] text-[#00e5a0]'
                      : 'bg-[#0d131f] border-[#1e293b] text-slate-400 hover:text-white'
                  }`}
                >
                  {w.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* APPLICATION LOAD PROFILE SELECTOR */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-300">APPLICATION LOAD PROFILE</label>
          <div className="grid grid-cols-4 gap-2">
            {(['CENTRIFUGAL_PUMP', 'COMPRESSOR', 'CONVEYOR', 'HEAVY_CRUSHER'] as LoadType[]).map((lt) => (
              <button
                key={lt}
                onClick={() => onUpdateParams({ loadType: lt })}
                className={`px-2 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  params.loadType === lt
                    ? 'bg-[#00e5a0]/20 border-[#00e5a0] text-[#00e5a0] shadow-md'
                    : 'bg-[#070a10] border-[#1e293b] text-slate-400 hover:text-white'
                }`}
              >
                {lt.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* START MODE SELECTOR */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-300">STARTING CONTROL MODE</label>
          <div className="grid grid-cols-3 gap-2">
            {(['VOLTAGE_RAMP', 'CURRENT_LIMIT', 'TORQUE_CONTROL'] as StartMode[]).map((sm) => (
              <button
                key={sm}
                onClick={() => onUpdateParams({ startMode: sm })}
                className={`px-2 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  params.startMode === sm
                    ? 'bg-[#00e5a0]/20 border-[#00e5a0] text-[#00e5a0] shadow-md'
                    : 'bg-[#070a10] border-[#1e293b] text-slate-400 hover:text-white'
                }`}
              >
                {sm.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* TUNING SLIDERS WITH NUMERIC INPUT BOXES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* INITIAL VOLTAGE */}
          <div className="bg-[#070a10] p-3 rounded-xl border border-[#1e293b] flex flex-col gap-1.5">
            <div className="flex justify-between items-center font-bold text-slate-300">
              <span>INITIAL VOLTAGE (V_start):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="10"
                  max="80"
                  value={params.initialVoltagePct}
                  onChange={(e) => onUpdateParams({ initialVoltagePct: Math.max(10, Math.min(80, Number(e.target.value))) })}
                  className="w-14 bg-[#0d131f] border border-[#1e293b] rounded px-1.5 py-0.5 text-[#00e5a0] font-bold text-xs text-center focus:outline-none focus:border-[#00e5a0]"
                />
                <span className="text-[#00e5a0] font-mono">%</span>
              </div>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              value={params.initialVoltagePct}
              onChange={(e) => onUpdateParams({ initialVoltagePct: Number(e.target.value) })}
              className="w-full accent-[#00e5a0] cursor-pointer h-1.5 bg-[#121a29] rounded"
            />
            <span className="text-[10px] text-slate-500 font-mono">Breakaway torque pedestal = (V_init / 100)²</span>
          </div>

          {/* RAMP TIME */}
          <div className="bg-[#070a10] p-3 rounded-xl border border-[#1e293b] flex flex-col gap-1.5">
            <div className="flex justify-between items-center font-bold text-slate-300">
              <span>ACCEL RAMP TIME (t_ramp):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={params.rampTimeSec}
                  onChange={(e) => onUpdateParams({ rampTimeSec: Math.max(1, Math.min(60, Number(e.target.value))) })}
                  className="w-14 bg-[#0d131f] border border-[#1e293b] rounded px-1.5 py-0.5 text-cyan-400 font-bold text-xs text-center focus:outline-none focus:border-cyan-400"
                />
                <span className="text-cyan-400 font-mono">s</span>
              </div>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              value={params.rampTimeSec}
              onChange={(e) => onUpdateParams({ rampTimeSec: Number(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-[#121a29] rounded"
            />
            <span className="text-[10px] text-slate-500 font-mono">Duration to 100% full line voltage (15s nominal)</span>
          </div>

          {/* SOFT STOP TIME */}
          <div className="bg-[#070a10] p-3 rounded-xl border border-[#1e293b] flex flex-col gap-1.5">
            <div className="flex justify-between items-center font-bold text-slate-300">
              <span>SOFT STOP TIME (t_stop):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={params.softStopTimeSec || 10}
                  onChange={(e) => onUpdateParams({ softStopTimeSec: Math.max(0, Math.min(60, Number(e.target.value))) })}
                  className="w-14 bg-[#0d131f] border border-[#1e293b] rounded px-1.5 py-0.5 text-purple-400 font-bold text-xs text-center focus:outline-none focus:border-purple-400"
                />
                <span className="text-purple-400 font-mono">s</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={params.softStopTimeSec || 10}
              onChange={(e) => onUpdateParams({ softStopTimeSec: Number(e.target.value) })}
              className="w-full accent-purple-500 cursor-pointer h-1.5 bg-[#121a29] rounded"
            />
            <span className="text-[10px] text-slate-500 font-mono">Deceleration ramp to eliminate water hammer</span>
          </div>

          {/* CURRENT LIMIT */}
          <div className="bg-[#070a10] p-3 rounded-xl border border-[#1e293b] flex flex-col gap-1.5">
            <div className="flex justify-between items-center font-bold text-slate-300">
              <span>CURRENT LIMIT (I_limit):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="100"
                  max="500"
                  step="10"
                  value={params.currentLimitPct}
                  onChange={(e) => onUpdateParams({ currentLimitPct: Math.max(100, Math.min(500, Number(e.target.value))) })}
                  className="w-14 bg-[#0d131f] border border-[#1e293b] rounded px-1.5 py-0.5 text-amber-400 font-bold text-xs text-center focus:outline-none focus:border-amber-400"
                />
                <span className="text-amber-400 font-mono">% FLA</span>
              </div>
            </div>
            <input
              type="range"
              min="100"
              max="500"
              step="10"
              value={params.currentLimitPct}
              onChange={(e) => onUpdateParams({ currentLimitPct: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-[#121a29] rounded"
            />
            <span className="text-[10px] text-slate-500 font-mono">Peak current limit clamp during ramp</span>
          </div>

          {/* KICK START CHECKBOX & BOOST */}
          <div className="bg-[#070a10] p-3 rounded-xl border border-[#1e293b] flex items-center justify-between col-span-1 sm:col-span-2">
            <div className="flex flex-col">
              <span className="font-bold text-slate-300">KICKSTART TORQUE BOOST PULSE</span>
              <span className="text-[10px] text-slate-500">Injects 70% V boost pulse for 0.5s to overcome high stiction loads</span>
            </div>
            <input
              type="checkbox"
              checked={params.kickStart}
              onChange={(e) => onUpdateParams({ kickStart: e.target.checked })}
              className="w-5 h-5 accent-[#00e5a0] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* RIGHT: SOP-SS-001 CENTRIFUGAL PUMP START PROCEDURE EMBEDDED ON SAME SCREEN */}
      <InteractiveSOPWizard
        sopId="SOP-SS-001"
        title="Soft Starter Centrifugal Pump Start Procedure"
        standard="IEC 60947-4-2 Compliant"
        steps={sopWizardSteps}
      />
    </div>
  );
};
