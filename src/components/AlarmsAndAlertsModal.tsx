import React, { useState } from 'react';
import { AlarmEntry } from '../types/batteryCharger';
import { AlertTriangle, ShieldAlert, Info, Trash2, X, Search, Bell, CheckCircle2 } from 'lucide-react';

interface AlarmsAndAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alarmLog: AlarmEntry[];
  onClearLog?: () => void;
  moduleName: string;
}

export const AlarmsAndAlertsModal: React.FC<AlarmsAndAlertsModalProps> = ({
  isOpen,
  onClose,
  alarmLog = [],
  onClearLog,
  moduleName,
}) => {
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'TRIP' | 'WARNING' | 'INFO'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const tripCount = alarmLog.filter((a) => a.level === 'TRIP').length;
  const warningCount = alarmLog.filter((a) => a.level === 'WARNING').length;
  const infoCount = alarmLog.filter((a) => a.level === 'INFO').length;

  const filteredLogs = alarmLog.filter((entry) => {
    const matchesLevel = filterLevel === 'ALL' || entry.level === filterLevel;
    const matchesSearch =
      searchQuery.trim() === '' ||
      entry.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.time.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.level.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#0d1117] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#c9d1d9]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="bg-[#161b22] px-6 py-4 border-b border-[#30363d] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                tripCount > 0
                  ? 'bg-red-950/80 border-red-500 text-red-400 animate-pulse'
                  : warningCount > 0
                  ? 'bg-amber-950/80 border-amber-500 text-amber-400'
                  : 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
              }`}
            >
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Alarms & SCADA Event Log
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e] font-mono">
                  {moduleName}
                </span>
              </div>
              <p className="text-xs text-[#8b949e] mt-0.5 font-mono">
                Real-time protection relay trips, warning alarms, and operator sequence events
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-all border border-[#30363d]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* METRICS & FILTER BAR */}
        <div className="bg-[#0d1117] px-6 py-3 border-b border-[#21262d] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0 font-mono">
          {/* STATS PILLS */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterLevel('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                filterLevel === 'ALL'
                  ? 'bg-[#21262d] border-[#58a6ff] text-white shadow'
                  : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-white'
              }`}
            >
              <span>TOTAL</span>
              <span className="px-1.5 py-0.2 rounded bg-black/40 text-[#c9d1d9] text-[10px]">
                {alarmLog.length}
              </span>
            </button>

            <button
              onClick={() => setFilterLevel('TRIP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                filterLevel === 'TRIP'
                  ? 'bg-red-950/80 border-red-500 text-red-200 shadow'
                  : 'bg-[#161b22] border-[#30363d] text-red-400 hover:bg-red-950/30'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>TRIPS</span>
              <span className="px-1.5 py-0.2 rounded bg-red-900/60 text-red-200 text-[10px]">
                {tripCount}
              </span>
            </button>

            <button
              onClick={() => setFilterLevel('WARNING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                filterLevel === 'WARNING'
                  ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow'
                  : 'bg-[#161b22] border-[#30363d] text-amber-400 hover:bg-amber-950/30'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>WARNINGS</span>
              <span className="px-1.5 py-0.2 rounded bg-amber-900/60 text-amber-200 text-[10px]">
                {warningCount}
              </span>
            </button>

            <button
              onClick={() => setFilterLevel('INFO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                filterLevel === 'INFO'
                  ? 'bg-sky-950/80 border-sky-500 text-sky-200 shadow'
                  : 'bg-[#161b22] border-[#30363d] text-sky-400 hover:bg-sky-950/30'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>EVENTS</span>
              <span className="px-1.5 py-0.2 rounded bg-sky-900/60 text-sky-200 text-[10px]">
                {infoCount}
              </span>
            </button>
          </div>

          {/* SEARCH INPUT */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8b949e]" />
            <input
              type="text"
              placeholder="Search alarm text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>
        </div>

        {/* LOG MESSAGES SCROLL AREA */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#8b949e] gap-2 border border-dashed border-[#30363d] rounded-xl bg-[#161b22]/30">
              <CheckCircle2 className="w-8 h-8 text-[#3fb950]" />
              <p className="text-sm font-semibold text-[#c9d1d9]">No Alarms or Events Recorded</p>
              <p className="text-xs text-[#8b949e]">
                {searchQuery || filterLevel !== 'ALL'
                  ? 'No alarms match the selected filter criteria.'
                  : 'System is operating within normal parameters.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const isTrip = entry.level === 'TRIP';
              const isWarning = entry.level === 'WARNING';

              return (
                <div
                  key={entry.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                    isTrip
                      ? 'bg-red-950/30 border-red-500/50 text-red-100 shadow-md shadow-red-950/20'
                      : isWarning
                      ? 'bg-amber-950/30 border-amber-500/50 text-amber-100 shadow-md shadow-amber-950/20'
                      : 'bg-[#161b22] border-[#30363d] text-[#c9d1d9]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                        isTrip
                          ? 'bg-red-900/80 border-red-500 text-red-200'
                          : isWarning
                          ? 'bg-amber-900/80 border-amber-500 text-amber-200'
                          : 'bg-sky-900/80 border-sky-500 text-sky-200'
                      }`}
                    >
                      {entry.level}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <div className="text-xs font-medium leading-relaxed">{entry.message}</div>
                      <div className="text-[10px] text-[#8b949e]">Timestamp: {entry.time}</div>
                    </div>
                  </div>

                  <div className="text-[10px] px-2 py-0.5 rounded bg-[#0d1117] border border-[#21262d] text-[#8b949e] shrink-0 font-mono">
                    LOGGED
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-[#161b22] px-6 py-3 border-t border-[#30363d] flex items-center justify-between shrink-0 font-mono">
          <div className="text-xs text-[#8b949e]">
            Displaying <span className="text-white font-bold">{filteredLogs.length}</span> of{' '}
            <span className="text-white font-bold">{alarmLog.length}</span> recorded entries
          </div>

          <div className="flex items-center gap-3">
            {onClearLog && (
              <button
                onClick={onClearLog}
                className="px-3.5 py-1.5 rounded-lg bg-[#21262d] hover:bg-red-950 hover:text-red-300 border border-[#30363d] text-xs font-bold text-[#8b949e] transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Event History</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold transition-all border border-[#3fb950]"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
