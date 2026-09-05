import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Clock,
  Zap,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { audioAcoustics } from '../../engine/AudioAcoustics';

export interface SimulationControlHUDProps {
  isPaused: boolean;
  onTogglePause: () => void;
  timeDilation: number; // e.g. 1.0 = 1x, 0.001 = 0.001x
  onTimeDilationChange: (dilation: number) => void;
  simTimeUs: number; // Elapsed simulation time in microseconds
  onStepForward?: () => void;
  onStepBackward?: () => void;
  onResetTime?: () => void;
  switchingFreqHz?: number;
  periodProgressPct?: number; // 0 to 100% within current visual or electrical period
  activeStateText?: string;
  stepSizeUs?: number;
}

export const SimulationControlHUD: React.FC<SimulationControlHUDProps> = ({
  isPaused,
  onTogglePause,
  timeDilation,
  onTimeDilationChange,
  simTimeUs,
  onStepForward,
  onStepBackward,
  onResetTime,
  switchingFreqHz = 50000,
  periodProgressPct = 0,
  activeStateText = '',
  stepSizeUs = 10,
}) => {
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => audioAcoustics.getIsMuted());

  const SPEED_PRESETS = [
    { label: '1x', val: 1.0 },
    { label: '0.5x', val: 0.5 },
    { label: '0.2x', val: 0.2 },
    { label: '0.1x', val: 0.1 },
    { label: '0.01x', val: 0.01 },
    { label: '0.001x', val: 0.001 },
    { label: '0.0001x', val: 0.0001 },
  ];

  // Format microsecond clock nicely: ms and µs
  const totalMs = simTimeUs / 1000;
  const displayMs = totalMs.toFixed(3);

  return (
    <div className="w-full bg-[#080d1a] border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono select-none">
      {/* LEFT: PLAY/PAUSE & STEPPING BUTTONS */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={onTogglePause}
          className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
            isPaused
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]'
          }`}
          title={isPaused ? 'Resume Real-time Physics' : 'Pause Simulation for Inspection'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
          <span>{isPaused ? 'PAUSED' : 'LIVE'}</span>
        </button>

        {/* Step Backward */}
        {onStepBackward && (
          <button
            type="button"
            onClick={onStepBackward}
            disabled={!isPaused}
            className={`px-2 py-1.5 rounded-lg border flex items-center gap-1 font-bold text-[11px] transition-all ${
              isPaused
                ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700 cursor-pointer shadow-sm active:scale-95'
                : 'bg-slate-900/60 text-slate-600 border-slate-800/60 cursor-not-allowed opacity-50'
            }`}
            title="Step backward frame-by-frame (-10 µs)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>-{stepSizeUs}µs</span>
          </button>
        )}

        {/* Step Forward */}
        {onStepForward && (
          <button
            type="button"
            onClick={onStepForward}
            disabled={!isPaused}
            className={`px-2 py-1.5 rounded-lg border flex items-center gap-1 font-bold text-[11px] transition-all ${
              isPaused
                ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700 cursor-pointer shadow-sm active:scale-95'
                : 'bg-slate-900/60 text-slate-600 border-slate-800/60 cursor-not-allowed opacity-50'
            }`}
            title="Step forward frame-by-frame (+10 µs)"
          >
            <span>+{stepSizeUs}µs</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Reset Clock */}
        {onResetTime && (
          <button
            type="button"
            onClick={onResetTime}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 cursor-pointer transition-colors"
            title="Reset Simulation Clock to 0.000 ms"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Audio Acoustics Feedback Toggle (Rec 19) */}
        <button
          type="button"
          onClick={() => {
            const next = audioAcoustics.toggleMute();
            setIsAudioMuted(next);
            if (!next) {
              audioAcoustics.playBreakerClick();
            }
          }}
          className={`px-2 py-1.5 rounded-lg border flex items-center gap-1 font-bold text-[10.5px] transition-all cursor-pointer ${
            !isAudioMuted
              ? 'bg-amber-950 text-amber-300 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
              : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
          }`}
          title={isAudioMuted ? 'Enable physical switching acoustics (Web Audio)' : 'Mute acoustics'}
        >
          {!isAudioMuted ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{!isAudioMuted ? 'AUDIO: ON' : 'AUDIO: OFF'}</span>
        </button>
      </div>

      {/* CENTER: SPEED PRESETS & ULTRA-SLOW MOTION SLIDER */}
      <div className="flex items-center gap-2 bg-[#0d1527] px-2.5 py-1 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          <span>SPEED:</span>
        </div>

        {SPEED_PRESETS.map((preset) => {
          const isActive = Math.abs(timeDilation - preset.val) < 0.00001;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onTimeDilationChange(preset.val)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          );
        })}

        {/* Free Range Slider for Fine-Tuned Slow-Motion */}
        <div className="flex items-center gap-1 ml-1.5 pl-2 border-l border-slate-700/80">
          <input
            type="range"
            min="-4"
            max="0"
            step="0.1"
            value={Math.log10(Math.max(0.0001, Math.min(1.0, timeDilation)))}
            onChange={(e) => {
              const val = Math.pow(10, parseFloat(e.target.value));
              onTimeDilationChange(Math.round(val * 10000) / 10000);
            }}
            className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            title={`Fine-tune Speed: ${timeDilation.toFixed(4)}x`}
          />
          <span className="text-[10px] font-bold text-cyan-300 min-w-[42px] text-right">
            {timeDilation < 0.01 ? `${(timeDilation * 1000).toFixed(1)}m×` : `${timeDilation.toFixed(2)}×`}
          </span>
        </div>
      </div>

      {/* RIGHT: SIMULATION TELEMETRY & CLOCK HUD */}
      <div className="flex items-center gap-3 text-[11px]">
        {/* Microsecond Stopwatch HUD */}
        <div className="flex items-center gap-1.5 bg-[#040812] px-2.5 py-1 rounded-lg border border-cyan-900/60 shadow-inner">
          <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-slate-400 text-[10px]">t_sim:</span>
          <span className="font-extrabold text-cyan-200 tracking-wider">
            {displayMs} <span className="text-[9px] text-cyan-400 font-normal">ms</span>
          </span>
        </div>

        {/* Period Progress Bar */}
        <div className="hidden sm:flex items-center gap-1.5 bg-[#040812] px-2 py-1 rounded-lg border border-slate-800">
          <span className="text-slate-400 text-[9px]">CYCLE:</span>
          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-75"
              style={{ width: `${Math.min(100, Math.max(0, periodProgressPct))}%` }}
            />
          </div>
          <span className="text-emerald-300 font-bold text-[9px] min-w-[28px]">
            {Math.round(periodProgressPct)}%
          </span>
        </div>

        {/* Instantaneous Switching State */}
        {activeStateText && (
          <div className="hidden md:flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800 text-[10px]">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-slate-200 font-bold">{activeStateText}</span>
          </div>
        )}
      </div>
    </div>
  );
};
