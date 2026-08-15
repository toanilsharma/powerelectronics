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
      onExecute: () => onUpdateParams({ rampUpSec: 15 }),
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
      description: 'Set initial voltage pedestal to 40% to overcome mechanical stiction.',
      actionLabel: 'Set Initial Volts 40%',
      onExecute: () => onUpdateParams({ startVoltPct: 40 }),
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
      title: '10. Verify motor operating current < FLA',
      description: 'Confirm motor running current is stable and within nameplate full-load amps.',
      actionLabel: 'Confirm FLA & Complete SOP',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* LEFT: PARAMETER TUNING & COMMAND BUTTONS */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Settings className="w-4 h-4 text-emerald-400" />
            SOFT STARTER PARAMETER CONFIGURATION
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onStart}
              disabled={isRunning || isTrip}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all"
            >
              <Play className="w-3.5 h-3.5" /> START
            </button>
            <button
              onClick={onStop}
              disabled={!isRunning}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-30 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all"
            >
              <StopIcon className="w-3.5 h-3.5" /> STOP
            </button>
            <button
              onClick={onJog}
              disabled={isRunning || isTrip}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> JOG
            </button>
          </div>
        </div>

        {/* LOAD TYPE SELECTOR */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-300">APPLICATION LOAD PROFILE</label>
          <div className="grid grid-cols-3 gap-2">
            {(['CENTRIFUGAL_PUMP', 'COMPRESSOR', 'CONVEYOR'] as LoadType[]).map((lt) => (
              <button
                key={lt}
                onClick={() => onUpdateParams({ loadType: lt })}
                className={`px-2 py-2 rounded-lg text-xs font-bold border transition-all ${
                  params.loadType === lt
                    ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-md'
                    : 'bg-[#21262d] border-[#30363d] text-slate-400 hover:text-white'
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
                className={`px-2 py-2 rounded-lg text-xs font-bold border transition-all ${
                  params.startMode === sm
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-md'
                    : 'bg-[#21262d] border-[#30363d] text-slate-400 hover:text-white'
                }`}
              >
                {sm.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* TUNING SLIDERS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* INITIAL VOLTAGE */}
          <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] flex flex-col gap-1.5">
            <div className="flex justify-between font-bold text-slate-300">
              <span>INITIAL VOLTAGE:</span>
              <span className="text-emerald-400">{params.initialVoltagePct}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="80"
              value={params.initialVoltagePct}
              onChange={(e) => onUpdateParams({ initialVoltagePct: Number(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">Breakaway torque = (V_init / 100)²</span>
          </div>

          {/* RAMP TIME */}
          <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] flex flex-col gap-1.5">
            <div className="flex justify-between font-bold text-slate-300">
              <span>RAMP TIME:</span>
              <span className="text-cyan-400">{params.rampTimeSec} s</span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              value={params.rampTimeSec}
              onChange={(e) => onUpdateParams({ rampTimeSec: Number(e.target.value) })}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">Acceleration duration to 100% V</span>
          </div>

          {/* CURRENT LIMIT */}
          <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] flex flex-col gap-1.5">
            <div className="flex justify-between font-bold text-slate-300">
              <span>CURRENT LIMIT:</span>
              <span className="text-amber-400">{params.currentLimitPct}% FLA</span>
            </div>
            <input
              type="range"
              min="100"
              max="500"
              step="10"
              value={params.currentLimitPct}
              onChange={(e) => onUpdateParams({ currentLimitPct: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500">Max peak current clamp</span>
          </div>

          {/* KICK START CHECKBOX */}
          <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-bold text-slate-300">KICK START PULSE</span>
              <span className="text-[10px] text-slate-500">70% V for 2s to break stiction</span>
            </div>
            <input
              type="checkbox"
              checked={params.kickStart}
              onChange={(e) => onUpdateParams({ kickStart: e.target.checked })}
              className="w-5 h-5 accent-emerald-500 cursor-pointer"
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
