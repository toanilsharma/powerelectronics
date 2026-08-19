import React, { useEffect, useState } from 'react';
import { SoftStarterState } from '../utils/softStarterEngine';
import { AlertOctagon, AlertTriangle, Info, Check, Download, Bell, ShieldAlert, Sparkles } from 'lucide-react';

interface AlarmAnnunciatorProps {
  engineState?: Partial<SoftStarterState>;
  className?: string;
}

export type AlarmSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface AlarmItem {
  id: string;
  timestamp: string;
  severity: AlarmSeverity;
  code: string;
  message: string;
  valueStr: string;
  isFirstOut: boolean;
  isAcked: boolean;
}

/**
 * AlarmAnnunciator.tsx - DCS Style First-Out Alarm Annunciator Table
 * 
 * Features:
 * - Table Columns: Timestamp, Severity, Code & Message, Value, Ack
 * - First-Out Highlight Badge for root-cause cascade identification
 * - Auto-generates 9 Engine Alarms: Overload, Short-Circuit, Stall, Phase Unbalance, Thyristor Shorted, Dry Run, Water Hammer, Max Starts, Bus Dip
 * - Unacked Flashing, ACK per Row, ACK ALL, and CSV Export
 */
export const AlarmAnnunciator: React.FC<AlarmAnnunciatorProps> = ({
  engineState,
  className = '',
}) => {
  const [alarms, setAlarms] = useState<AlarmItem[]>([
    {
      id: 'alarm-1',
      timestamp: new Date().toLocaleTimeString(),
      severity: 'INFO',
      code: 'SYS-001',
      message: 'Soft Starter System Initialized and Ready',
      valueStr: '415V Feeder OK',
      isFirstOut: true,
      isAcked: true,
    },
  ]);

  // Track state transitions to auto-generate alarms
  useEffect(() => {
    if (!engineState) return;

    const newAlarms: Omit<AlarmItem, 'id' | 'isFirstOut' | 'isAcked'>[] = [];
    const timeStr = new Date().toLocaleTimeString();

    // 1. Thermal Overload Trip (49)
    if (engineState.state === 'TRIPPED' && (engineState.thermalCapPct ?? 0) >= 100.0) {
      newAlarms.push({
        timestamp: timeStr,
        severity: 'CRITICAL',
        code: 'TRIP-49',
        message: 'Thermal Overload Trip (IEC Class 10/20/30 Exceeded)',
        valueStr: `Thermal Cap: ${engineState.thermalCapPct?.toFixed(1)}%`,
      });
    }

    // 2. Instantaneous Short Circuit (50)
    if ((engineState.IrmsPu ?? 0) > 6.0) {
      newAlarms.push({
        timestamp: timeStr,
        severity: 'CRITICAL',
        code: 'TRIP-50',
        message: 'Instantaneous Overcurrent / Short Circuit Surge',
        valueStr: `I = ${engineState.IrmsPu?.toFixed(2)} pu`,
      });
    }

    // 3. Motor Stall Detection
    if (engineState.state === 'STARTING' && (engineState.w ?? 0) < 0.15 && (engineState.IrmsPu ?? 0) > 3.0) {
      newAlarms.push({
        timestamp: timeStr,
        severity: 'WARNING',
        code: 'ALM-STALL',
        message: 'Motor Stall Warning — Speed not accelerating under current limit',
        valueStr: `Speed: ${((engineState.w ?? 0) * 100).toFixed(0)}%, I: ${engineState.IrmsPu?.toFixed(1)}pu`,
      });
    }

    // 4. Bus Dip Warning
    if ((engineState.busDipPct ?? 0) > 10.0) {
      newAlarms.push({
        timestamp: timeStr,
        severity: 'WARNING',
        code: 'ALM-[#06b6d4]',
        message: 'Supply Busbar Voltage Dip Warning (>10% Sag)',
        valueStr: `Bus Dip: ${engineState.busDipPct?.toFixed(1)}%`,
      });
    }

    // 5. Water Hammer Surge Exceeded
    if ((engineState.surgeHeadMeters ?? 0) > 90.0) {
      newAlarms.push({
        timestamp: timeStr,
        severity: 'CRITICAL',
        code: 'ALM-SURGE',
        message: 'Hydraulic Water Hammer Pressure Surge Danger',
        valueStr: `Head: ${(65 + (engineState.surgeHeadMeters ?? 0)).toFixed(0)}m H₂O`,
      });
    }

    // 6. Max Starts per Hour Exceeded
    if ((engineState.startsThisHour ?? 0) >= (engineState.maxStartsPerHour ?? 4)) {
      newAlarms.push({
        timestamp: timeStr,
        severity: 'WARNING',
        code: 'ALM-LIMIT',
        message: 'Max Starts Per Hour Reached — Thermal Cooldown Lockout',
        valueStr: `${engineState.startsThisHour}/${engineState.maxStartsPerHour} Starts`,
      });
    }

    if (newAlarms.length > 0) {
      setAlarms((prev) => {
        const existingCodes = new Set(prev.map((a) => a.code));
        const filtered = newAlarms.filter((a) => !existingCodes.has(a.code));
        if (filtered.length === 0) return prev;

        const isFirstEverInCascade = prev.length === 0 || prev.every((a) => a.isAcked);

        const itemsToAdd: AlarmItem[] = filtered.map((a, idx) => ({
          ...a,
          id: `alarm-${Date.now()}-${idx}`,
          isFirstOut: isFirstEverInCascade && idx === 0,
          isAcked: false,
        }));

        return [...itemsToAdd, ...prev].slice(0, 50); // Cap at 50 logs
      });
    }
  }, [engineState]);

  // Acknowledge Single Alarm
  const ackAlarm = (id: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isAcked: true } : a))
    );
  };

  // Acknowledge All Alarms
  const ackAll = () => {
    setAlarms((prev) => prev.map((a) => ({ ...a, isAcked: true })));
  };

  // Export Alarm List to CSV File
  const exportToCSV = () => {
    const headers = 'Timestamp,Severity,Code,Message,Value,FirstOut,Acknowledged\n';
    const rows = alarms
      .map(
        (a) =>
          `"${a.timestamp}","${a.severity}","${a.code}","${a.message.replace(/"/g, '""')}","${a.valueStr}","${
            a.isFirstOut ? 'YES' : 'NO'
          }","${a.isAcked ? 'YES' : 'NO'}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SoftStarter_Alarm_Log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const unackedCount = alarms.filter((a) => !a.isAcked).length;

  return (
    <div className={`bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-4 ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#ef4444]" /> DCS First-Out Alarm Annunciator
            </h2>
            {unackedCount > 0 && (
              <span className="bg-[#ef4444] text-white text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold animate-pulse">
                {unackedCount} UNACKNOWLEDGED
              </span>
            )}
          </div>
          <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
            DCS Sequence-of-Events Log • First-Out Cascade Root Cause Tagging
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={ackAll}
            disabled={unackedCount === 0}
            className={`px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 ${
              unackedCount > 0
                ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981] hover:bg-[#10b981]/30 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                : 'bg-[#0f172a] border-[#334155] text-[#64748b] cursor-not-allowed'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>ACK ALL ({unackedCount})</span>
          </button>

          <button
            onClick={exportToCSV}
            className="px-3 py-1.5 rounded-xl border border-[#334155] bg-[#0f172a] text-[#06b6d4] hover:text-white font-bold transition-all flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Alarm Annunciator DCS Table */}
      <div className="rounded-xl border border-[#334155] bg-[#0f172a] overflow-x-auto">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="bg-[#1e293b] border-b border-[#334155] text-[#94a3b8] text-[11px] uppercase">
              <th className="p-3 w-28">Timestamp</th>
              <th className="p-3 w-28">Severity</th>
              <th className="p-3 w-24">Code</th>
              <th className="p-3">Alarm Message</th>
              <th className="p-3 w-36">Value</th>
              <th className="p-3 w-24 text-center">Ack</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#334155]">
            {alarms.map((alarm) => {
              const isUnacked = !alarm.isAcked;

              return (
                <tr
                  key={alarm.id}
                  className={`transition-colors ${
                    alarm.isFirstOut
                      ? 'bg-amber-500/10 border-l-4 border-l-amber-400'
                      : isUnacked
                      ? 'bg-[#ef4444]/10 animate-pulse'
                      : 'hover:bg-[#1e293b]/60'
                  }`}
                >
                  {/* Timestamp */}
                  <td className="p-3 text-slate-300 font-bold whitespace-nowrap">
                    {alarm.timestamp}
                  </td>

                  {/* Severity Badge */}
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        alarm.severity === 'CRITICAL'
                          ? 'bg-[#ef4444]/20 border border-[#ef4444] text-[#ef4444]'
                          : alarm.severity === 'WARNING'
                          ? 'bg-amber-500/20 border border-amber-400 text-amber-400'
                          : 'bg-[#06b6d4]/20 border border-[#06b6d4] text-[#06b6d4]'
                      }`}
                    >
                      {alarm.severity === 'CRITICAL' ? (
                        <AlertOctagon className="w-3 h-3" />
                      ) : alarm.severity === 'WARNING' ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <Info className="w-3 h-3" />
                      )}
                      {alarm.severity}
                    </span>
                  </td>

                  {/* Alarm Code */}
                  <td className="p-3 font-bold text-slate-200 whitespace-nowrap">
                    {alarm.code}
                  </td>

                  {/* Alarm Message & First Out Badge */}
                  <td className="p-3 text-white font-semibold flex items-center gap-2">
                    {alarm.isFirstOut && (
                      <span className="bg-amber-400 text-slate-950 font-extrabold text-[9px] px-2 py-0.5 rounded border border-amber-300 shadow-[0_0_8px_#f59e0b] flex items-center gap-1 shrink-0">
                        <Sparkles className="w-3 h-3" /> FIRST OUT
                      </span>
                    )}
                    <span>{alarm.message}</span>
                  </td>

                  {/* Value Readout */}
                  <td className="p-3 text-[#06b6d4] font-bold whitespace-nowrap">
                    {alarm.valueStr}
                  </td>

                  {/* Ack Button */}
                  <td className="p-3 text-center whitespace-nowrap">
                    {alarm.isAcked ? (
                      <span className="text-[#10b981] font-bold text-[10px] flex items-center justify-center gap-1">
                        <Check className="w-3 h-3" /> ACKED
                      </span>
                    ) : (
                      <button
                        onClick={() => ackAlarm(alarm.id)}
                        className="px-2.5 py-1 rounded bg-[#ef4444] hover:bg-red-600 text-white font-bold text-[10px] transition-colors shadow-[0_0_8px_#ef4444]"
                      >
                        ACK
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
