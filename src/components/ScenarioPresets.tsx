import React, { useState, useRef } from 'react';
import { SoftStarterParams, LoadType, StartMode, WiringConnection } from '../types/softStarter';
import { Sparkles, Play, Zap, RotateCcw, Flame } from 'lucide-react';

export interface PresetCardData {
  id: string;
  name: string;
  icon: string;
  category: string;
  lesson: string;
  badgeColor: string;
  params: {
    motorPowerKw?: number;
    wiringConnection?: WiringConnection;
    initialVoltagePct: number;
    rampTimeSec: number;
    softStopTimeSec?: number;
    currentLimitPct: number;
    kickStart: boolean;
    kickStartVoltagePct?: number;
    kickStartDurationSec?: number;
    loadType: LoadType;
    startMode: StartMode;
    iScRatio?: number;
    relay50PickupPct?: number;
  };
}

export const SOFT_STARTER_PRESETS: PresetCardData[] = [
  {
    id: 'borewell-pump',
    name: 'Borewell Pump',
    icon: '💧',
    category: 'Hydraulic Pumping',
    lesson: 'Water hammer surge mitigation & closed-valve hydraulic soft stop (t_stop = 20s).',
    badgeColor: 'border-cyan-500/50 text-cyan-300 bg-cyan-950/40',
    params: {
      motorPowerKw: 160,
      wiringConnection: 'IN_LINE',
      initialVoltagePct: 40,
      rampTimeSec: 12,
      softStopTimeSec: 20,
      currentLimitPct: 300,
      kickStart: false,
      loadType: 'CENTRIFUGAL_PUMP',
      startMode: 'VOLTAGE_RAMP',
      iScRatio: 20,
    },
  },
  {
    id: 'boiler-fan',
    name: 'Boiler ID Fan',
    icon: '🌀',
    category: 'High Inertia Load',
    lesson: 'Ramp time ≠ Accel time — high rotor inertia (J) thermal stress during long 25s start.',
    badgeColor: 'border-amber-500/50 text-amber-300 bg-amber-950/40',
    params: {
      motorPowerKw: 160,
      wiringConnection: 'IN_LINE',
      initialVoltagePct: 30,
      rampTimeSec: 25,
      softStopTimeSec: 5,
      currentLimitPct: 350,
      kickStart: false,
      loadType: 'COMPRESSOR',
      startMode: 'CURRENT_LIMIT',
      iScRatio: 20,
    },
  },
  {
    id: 'incline-conveyor',
    name: 'Incline Conveyor',
    icon: '🛗',
    category: 'Heavy Handling',
    lesson: 'Breakaway static friction stiction & kickstart torque pulse (70% V / 0.5s).',
    badgeColor: 'border-emerald-500/50 text-emerald-300 bg-emerald-950/40',
    params: {
      motorPowerKw: 160,
      wiringConnection: 'IN_LINE',
      initialVoltagePct: 55,
      rampTimeSec: 10,
      softStopTimeSec: 5,
      currentLimitPct: 300,
      kickStart: true,
      kickStartVoltagePct: 70,
      kickStartDurationSec: 0.5,
      loadType: 'CONVEYOR',
      startMode: 'VOLTAGE_RAMP',
      iScRatio: 20,
    },
  },
  {
    id: 'mining-crusher',
    name: 'Mining Crusher',
    icon: '🪨',
    category: 'Pulsating Torque',
    lesson: 'Heavy jam torque, 80% kickstart pulse, 400% limit & 50 relay high setting.',
    badgeColor: 'border-red-500/50 text-red-300 bg-red-950/40',
    params: {
      motorPowerKw: 160,
      wiringConnection: 'IN_LINE',
      initialVoltagePct: 50,
      rampTimeSec: 15,
      softStopTimeSec: 0,
      currentLimitPct: 400,
      kickStart: true,
      kickStartVoltagePct: 80,
      kickStartDurationSec: 0.6,
      loadType: 'HEAVY_CRUSHER',
      startMode: 'CURRENT_LIMIT',
      iScRatio: 20,
      relay50PickupPct: 600,
    },
  },
  {
    id: 'weak-grid',
    name: 'Shipboard / Weak Grid',
    icon: '⛴',
    category: 'Isolated Supply',
    lesson: 'Severe supply bus voltage dip on weak generator grid (Isc = 6× FLA) & 250% limit capping.',
    badgeColor: 'border-purple-500/50 text-purple-300 bg-purple-950/40',
    params: {
      motorPowerKw: 160,
      wiringConnection: 'IN_LINE',
      initialVoltagePct: 35,
      rampTimeSec: 18,
      softStopTimeSec: 10,
      currentLimitPct: 250,
      kickStart: false,
      loadType: 'CENTRIFUGAL_PUMP',
      startMode: 'CURRENT_LIMIT',
      iScRatio: 6,
    },
  },
  {
    id: 'inside-delta',
    name: 'Inside-Delta Retrofit',
    icon: '🏭',
    category: 'Topology Sizing',
    lesson: 'Inside-Delta winding topology reduces SCR current to 57.7% (155A for 269A motor).',
    badgeColor: 'border-blue-500/50 text-blue-300 bg-blue-950/40',
    params: {
      motorPowerKw: 160,
      wiringConnection: 'INSIDE_DELTA',
      initialVoltagePct: 40,
      rampTimeSec: 10,
      softStopTimeSec: 5,
      currentLimitPct: 300,
      kickStart: false,
      loadType: 'CENTRIFUGAL_PUMP',
      startMode: 'VOLTAGE_RAMP',
      iScRatio: 20,
    },
  },
];

interface ScenarioPresetsProps {
  currentParams: SoftStarterParams;
  onUpdateParams: (newParams: Partial<SoftStarterParams>) => void;
  onStartDemo?: () => void;
  className?: string;
}

/**
 * ScenarioPresets.tsx - Industrial One-Click Preset Cards Bar
 * 
 * Features:
 * - 6 One-Click Industrial Cards (Pump, Fan, Conveyor, Crusher, Weak Grid, Inside Delta)
 * - Smooth 600ms Interpolation Animation (requestAnimationFrame)
 * - Brief Glowing Control Highlight Indicator
 * - Automatic Demo Run Launch upon completion
 */
export const ScenarioPresets: React.FC<ScenarioPresetsProps> = ({
  currentParams,
  onUpdateParams,
  onStartDemo,
  className = '',
}) => {
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isTweening, setIsTweening] = useState<boolean>(false);
  const animationRef = useRef<number | null>(null);

  const handleSelectPreset = (preset: PresetCardData) => {
    setActivePresetId(preset.id);
    setIsTweening(true);

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startParams = { ...currentParams };
    const targetParams = preset.params;
    const startTime = performance.now();
    const duration = 600; // 600ms smooth tween

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic easing
      const ease = 1 - Math.pow(1 - progress, 3);

      const interpolatedParams: Partial<SoftStarterParams> = {
        initialVoltagePct: Math.round(
          (startParams.initialVoltagePct ?? 40) +
            ((targetParams.initialVoltagePct ?? 40) - (startParams.initialVoltagePct ?? 40)) * ease
        ),
        rampTimeSec: Math.round(
          (startParams.rampTimeSec ?? 15) +
            ((targetParams.rampTimeSec ?? 15) - (startParams.rampTimeSec ?? 15)) * ease
        ),
        softStopTimeSec: Math.round(
          (startParams.softStopTimeSec ?? 10) +
            ((targetParams.softStopTimeSec ?? 10) - (startParams.softStopTimeSec ?? 10)) * ease
        ),
        currentLimitPct: Math.round(
          (startParams.currentLimitPct ?? 300) +
            ((targetParams.currentLimitPct ?? 300) - (startParams.currentLimitPct ?? 300)) * ease
        ),
      };

      onUpdateParams(interpolatedParams);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete: Apply full target params (discrete toggles + final exact values)
        onUpdateParams({
          ...targetParams,
        });
        setIsTweening(false);

        // Auto-launch demo motor run after tween
        if (onStartDemo) {
          setTimeout(() => {
            onStartDemo();
          }, 150);
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className={`bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 shadow-2xl space-y-3 font-mono ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-white uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>INDUSTRIAL APPLICATION PRESETS</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
            600ms Smooth Tweening
          </span>
        </div>

        {isTweening && (
          <div className="flex items-center gap-1.5 text-cyan-400 font-extrabold text-[11px] animate-pulse">
            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            <span>Interpolating Sliders...</span>
          </div>
        )}
      </div>

      {/* Preset Cards Grid (6 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {SOFT_STARTER_PRESETS.map((preset) => {
          const isSelected = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative group ${
                isSelected
                  ? 'bg-[#161b22] border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] scale-[1.02]'
                  : 'bg-[#161b22]/70 border-[#30363d] hover:border-[#58a6ff] hover:bg-[#161b22]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">{preset.icon}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-extrabold ${preset.badgeColor}`}>
                    {preset.params.wiringConnection === 'INSIDE_DELTA' ? '58% SCR' : `${preset.params.currentLimitPct}% Limit`}
                  </span>
                </div>

                <div className="font-bold text-xs text-white tracking-wide leading-tight group-hover:text-cyan-300 transition-colors">
                  {preset.name}
                </div>

                <div className="text-[10px] text-slate-400 mt-0.5 font-sans line-clamp-2 leading-snug">
                  {preset.lesson}
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-[#21262d] flex items-center justify-between text-[10px] text-cyan-400 font-bold">
                <span>Load: V={preset.params.initialVoltagePct}%</span>
                <Play className="w-3 h-3 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ScenarioPresets;
