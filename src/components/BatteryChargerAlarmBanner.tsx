import React, { useEffect, useRef } from 'react';
import { AlarmEntry } from '../types/batteryCharger';

interface BatteryChargerAlarmBannerProps {
  alarmLog: AlarmEntry[];
  warningCount: number;
  tripCount: number;
}

export const BatteryChargerAlarmBanner: React.FC<BatteryChargerAlarmBannerProps> = ({
  alarmLog = [],
  warningCount = 0,
  tripCount = 0,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to top when new alarms arrive (since newest is on top)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [alarmLog]);

  return (
    <div className="w-full h-[65px] bg-[#0d1117] border-t border-[#30363d] px-4 py-2 flex items-center justify-between select-none z-30 shadow-2xl">
      {/* LEFT: ALARMS & EVENTS LABEL */}
      <div className="flex items-center gap-2 shrink-0 border-r border-[#21262d] pr-4 h-full">
        <span className="relative flex h-2.5 w-2.5">
          {(warningCount > 0 || tripCount > 0) && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f85149] opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              tripCount > 0
                ? 'bg-[#f85149]'
                : warningCount > 0
                ? 'bg-[#d29922]'
                : 'bg-[#3fb950]'
            }`}
          />
        </span>
        <span className="text-xs font-bold font-mono text-[#c9d1d9] tracking-wider uppercase">
          ALARMS & EVENTS
        </span>
      </div>

      {/* MIDDLE: SCROLLING EVENT LOG */}
      <div
        ref={scrollRef}
        className="flex-1 mx-4 h-full overflow-y-auto font-mono text-xs flex flex-col gap-1 pr-2 scrollbar-thin"
      >
        {alarmLog.length === 0 ? (
          <div className="text-[#8b949e] text-[11px] italic flex items-center h-full">
            No active alarms or trips. All systems nominal.
          </div>
        ) : (
          alarmLog.map((entry) => {
            const levelColor =
              entry.level === 'TRIP'
                ? 'text-[#f85149] bg-[#da3633]/20 border-[#f85149]'
                : entry.level === 'WARNING'
                ? 'text-[#d29922] bg-[#d29922]/15 border-[#d29922]'
                : 'text-[#58a6ff] bg-[#58a6ff]/10 border-[#58a6ff]';

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-2 px-2 py-0.5 rounded border text-[11px] transition-all animate-fadeIn ${levelColor}`}
              >
                <span className="text-[#8b949e] font-semibold">[{entry.time}]</span>
                <span className="font-bold">[{entry.level}]</span>
                <span>{entry.message}</span>
              </div>
            );
          })
        )}
      </div>

      {/* RIGHT: ALARM COUNT BADGES */}
      <div className="flex items-center gap-2 shrink-0 border-l border-[#21262d] pl-4 h-full">
        {/* WARNING BADGE */}
        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold font-mono border ${
            warningCount > 0
              ? 'bg-[#d29922]/20 border-[#d29922] text-[#d29922] shadow-[0_0_8px_#d2992255]'
              : 'bg-[#21262d] border-[#30363d] text-[#8b949e]'
          }`}
        >
          <span>⚠</span>
          <span>{warningCount}</span>
        </div>

        {/* TRIP BADGE */}
        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold font-mono border ${
            tripCount > 0
              ? 'bg-[#da3633]/20 border-[#f85149] text-[#f85149] shadow-[0_0_8px_#f8514955] animate-pulse'
              : 'bg-[#21262d] border-[#30363d] text-[#8b949e]'
          }`}
        >
          <span>🔴</span>
          <span>{tripCount}</span>
        </div>
      </div>
    </div>
  );
};
