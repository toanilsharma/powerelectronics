import React, { useState } from 'react';
import { AlarmEntry } from '../types/batteryCharger';
import { AlertTriangle, ShieldAlert, Info, Trash2, X, Search, Bell, CheckCircle2, Download, ExternalLink } from 'lucide-react';

interface AlarmsAndAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alarmLog: AlarmEntry[];
  onClearLog?: () => void;
  moduleName: string;
  onSelectLogEntry?: (entry: AlarmEntry) => void;
}

const getComponentIdFromMessage = (msg: string, explicitId?: string): string => {
  if (explicitId) return explicitId;
  const lower = msg.toLowerCase();
  if (lower.includes('bypass') || lower.includes('km1')) return 'bypassKM1';
  if (lower.includes('mccb') || lower.includes('breaker') || lower.includes('q1')) return 'q1';
  if (lower.includes('suction')) return 'suctionValve';
  if (lower.includes('discharge')) return 'dischargeValve';
  if (lower.includes('thyristor') || lower.includes('scr') || lower.includes('power stage')) return 'scr';
  if (lower.includes('motor') || lower.includes('start') || lower.includes('stop') || lower.includes('jog') || lower.includes('speed')) return 'motor';
  if (lower.includes('overcurrent') || lower.includes('ct') || lower.includes('relay') || lower.includes('trip')) return 'ct';
  return 'q1';
};

const getComponentLabel = (compId: string): string => {
  switch (compId) {
    case 'q1': return 'Breaker Q1';
    case 'bypassKM1': return 'Bypass KM1';
    case 'suctionValve': return 'Suction Valve';
    case 'dischargeValve': return 'Discharge Valve';
    case 'scr': return 'Thyristor Bridge';
    case 'motor': return 'Induction Motor';
    case 'ct': return 'CT / Relays';
    default: return 'SLD Target';
  }
};

export const AlarmsAndAlertsModal: React.FC<AlarmsAndAlertsModalProps> = ({
  isOpen,
  onClose,
  alarmLog = [],
  onClearLog,
  moduleName,
  onSelectLogEntry,
}) => {
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'TRIP' | 'WARNING' | 'INFO'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const tripCount = alarmLog.filter((a) => a.level === 'TRIP').length;
  const warningCount = alarmLog.filter((a) => a.level === 'WARNING').length;
  const infoCount = alarmLog.filter((a) => a.level === 'INFO').length;

  // Calculate base timestamp for relative offsets (+0.0s, +2.3s)
  const timestamps = alarmLog.map((a) => a.timestampMs).filter((t): t is number => typeof t === 'number');
  const minTimestampMs = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();

  const getRelativeTimeStr = (entry: AlarmEntry): string => {
    if (typeof entry.timestampMs === 'number') {
      const diffSec = (entry.timestampMs - minTimestampMs) / 1000;
      return `+${diffSec.toFixed(1)}s`;
    }
    return '+0.0s';
  };

  const filteredLogs = alarmLog.filter((entry) => {
    const matchesLevel = filterLevel === 'ALL' || entry.level === filterLevel;
    const matchesSearch =
      searchQuery.trim() === '' ||
      entry.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.time.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.level.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const handleExportCSV = () => {
    if (alarmLog.length === 0) return;

    const headers = ['Timestamp', 'Relative Time', 'Level', 'Event Message', 'Component'];
    const rows = alarmLog.map((entry) => {
      const relTime = getRelativeTimeStr(entry);
      const compId = getComponentIdFromMessage(entry.message, entry.componentId);
      const compLabel = getComponentLabel(compId);
      return [
        `"${entry.time}"`,
        `"${relTime}"`,
        `"${entry.level}"`,
        `"${entry.message.replace(/"/g, '""')}"`,
        `"${compLabel}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `scada_event_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-[#0d131f] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#c9d1d9] font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="bg-[#121a29] px-6 py-4 border-b border-[#1e293b] flex items-center justify-between shrink-0">
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
                  Alarms &amp; SCADA Event Log
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-[#1e293b] border border-[#334155] text-cyan-400 font-extrabold">
                  {moduleName}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Sequential millisecond timestamps • Click any entry to highlight component on SLD
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* EXPORT CSV BUTTON */}
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-[#00e5a0] border border-[#00e5a0]/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              title="Download full event log in CSV format"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-slate-300 hover:text-white transition-all border border-[#334155] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* METRICS & FILTER BAR */}
        <div className="bg-[#070a10] px-6 py-3 border-b border-[#1e293b] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          {/* STATS PILLS */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterLevel('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                filterLevel === 'ALL'
                  ? 'bg-[#1e293b] border-[#38bdf8] text-white shadow'
                  : 'bg-[#0d131f] border-[#1e293b] text-slate-400 hover:text-white'
              }`}
            >
              <span>TOTAL</span>
              <span className="px-1.5 py-0.2 rounded bg-black/40 text-slate-300 text-[10px]">
                {alarmLog.length}
              </span>
            </button>

            <button
              onClick={() => setFilterLevel('TRIP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                filterLevel === 'TRIP'
                  ? 'bg-red-950/90 border-red-500 text-red-200 shadow'
                  : 'bg-[#0d131f] border-[#1e293b] text-red-400 hover:bg-red-950/30'
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                filterLevel === 'WARNING'
                  ? 'bg-amber-950/90 border-amber-500 text-amber-200 shadow'
                  : 'bg-[#0d131f] border-[#1e293b] text-amber-400 hover:bg-amber-950/30'
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                filterLevel === 'INFO'
                  ? 'bg-sky-950/90 border-sky-500 text-sky-200 shadow'
                  : 'bg-[#0d131f] border-[#1e293b] text-sky-400 hover:bg-sky-950/30'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>INFO</span>
              <span className="px-1.5 py-0.2 rounded bg-sky-900/60 text-sky-200 text-[10px]">
                {infoCount}
              </span>
            </button>
          </div>

          {/* SEARCH INPUT */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search event log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121a29] border border-[#1e293b] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00e5a0]"
            />
          </div>
        </div>

        {/* LOG MESSAGES SCROLL AREA */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5 text-xs">
          {filteredLogs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-[#1e293b] rounded-xl bg-[#070a10]">
              <CheckCircle2 className="w-8 h-8 text-[#00e5a0]" />
              <p className="text-sm font-bold text-white">No Event Log Entries Found</p>
              <p className="text-xs text-slate-400">
                {searchQuery || filterLevel !== 'ALL'
                  ? 'No alarms match the selected filter criteria.'
                  : 'System is operating within normal parameters.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const isTrip = entry.level === 'TRIP';
              const isWarning = entry.level === 'WARNING';
              const relTime = getRelativeTimeStr(entry);
              const compId = getComponentIdFromMessage(entry.message, entry.componentId);
              const compLabel = getComponentLabel(compId);

              return (
                <div
                  key={entry.id}
                  onClick={() => {
                    if (onSelectLogEntry) onSelectLogEntry(entry);
                  }}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer group ${
                    isTrip
                      ? 'bg-red-950/70 border-red-500/70 text-red-200 hover:border-red-400 hover:shadow-lg hover:shadow-red-950/50'
                      : isWarning
                      ? 'bg-amber-950/70 border-amber-500/70 text-amber-200 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-950/50'
                      : 'bg-[#121a29] border-[#1e293b] text-slate-200 hover:border-[#00e5a0] hover:bg-[#162235]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* COLOR CODED LEVEL BADGE */}
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider shrink-0 border ${
                        isTrip
                          ? 'bg-red-600 border-red-400 text-white animate-pulse'
                          : isWarning
                          ? 'bg-amber-600 border-amber-400 text-black font-black'
                          : 'bg-sky-600 border-sky-400 text-white font-extrabold'
                      }`}
                    >
                      {entry.level}
                    </span>

                    {/* TIMESTAMP & MESSAGE */}
                    <div className="flex flex-col gap-0.5">
                      <div className="text-xs font-bold leading-relaxed flex items-center gap-2">
                        <span>{entry.message}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="font-mono text-cyan-300 font-bold">{entry.time}</span>
                        <span className="text-slate-600">•</span>
                        <span className="px-1.5 py-0.2 rounded bg-black/40 text-amber-400 font-bold font-mono">
                          {relTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* COMPONENT HIGHLIGHT ACTION BUTTON */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2.5 py-1 rounded-lg bg-[#070a10] border border-[#1e293b] text-[#00e5a0] font-bold group-hover:border-[#00e5a0] transition-colors flex items-center gap-1">
                      <span>{compLabel}</span>
                      <ExternalLink className="w-3 h-3 text-[#00e5a0]" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-[#121a29] px-6 py-3.5 border-t border-[#1e293b] flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            Displaying <span className="text-white font-bold">{filteredLogs.length}</span> of{' '}
            <span className="text-white font-bold">{alarmLog.length}</span> recorded entries
          </div>

          <div className="flex items-center gap-3">
            {onClearLog && (
              <button
                onClick={onClearLog}
                className="px-3.5 py-1.5 rounded-lg bg-[#1e293b] hover:bg-red-950 hover:text-red-300 border border-[#334155] text-xs font-bold text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Event History</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-1.5 rounded-lg bg-[#00e5a0] hover:bg-[#00c78b] text-[#070a10] text-xs font-black transition-all border border-[#00e5a0] cursor-pointer shadow-lg"
            >
              Close Log Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
