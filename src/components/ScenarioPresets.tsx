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
      currentLimitPct: 350,
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

  const handleSelectPresetId = (presetId: string) => {
    const preset = SOFT_STARTER_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      handleSelectPreset(preset);
    }
  };

  const activePreset = SOFT_STARTER_PRESETS.find((p) => p.id === activePresetId) || SOFT_STARTER_PRESETS[0];

  return (
    <div className={`h-[45px] min-h-[45px] max-h-[45px] bg-[#0d1117] border border-[#30363d] rounded-xl px-3 flex items-center justify-between font-mono text-xs shadow-md ${className}`}>
      {/* Left: Dropdown select */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
        <span className="font-bold text-white uppercase tracking-wider text-xs hidden sm:inline">Presets:</span>
        <select
          value={activePresetId}
          onChange={(e) => handleSelectPresetId(e.target.value)}
          className="bg-[#161b22] border border-[#30363d] text-cyan-300 font-bold px-2.5 py-1 rounded-lg text-xs cursor-pointer focus:border-[#58a6ff] outline-none"
        >
          {SOFT_STARTER_PRESETS.map((preset) => {
            const limitText =
              preset.params.wiringConnection === 'INSIDE_DELTA'
                ? '58% SCR'
                : `${preset.params.currentLimitPct}% limit`;
            return (
              <option key={preset.id} value={preset.id} className="bg-[#0d1117] text-white">
                {preset.name} ({limitText})
              </option>
            );
          })}
        </select>
        {isTweening && (
          <div className="flex items-center gap-1 text-cyan-400 font-extrabold text-[11px] animate-pulse">
            <RotateCcw className="w-3 h-3 animate-spin" />
            <span className="hidden md:inline">Interpolating...</span>
          </div>
        )}
      </div>

      {/* Right: Active Preset Lesson */}
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="text-[11px] text-slate-300 hidden lg:inline truncate max-w-[500px] font-sans">
          💡 <strong className="text-cyan-300">{activePreset.name}:</strong> {activePreset.lesson}
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded border font-extrabold shrink-0 ${activePreset.badgeColor}`}>
          {activePreset.params.wiringConnection === 'INSIDE_DELTA' ? '58% SCR' : `${activePreset.params.currentLimitPct}% Limit`}
        </span>
      </div>
    </div>
  );
};

export default ScenarioPresets;
