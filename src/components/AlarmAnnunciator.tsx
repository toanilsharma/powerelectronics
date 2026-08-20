import React, { useEffect, useState } from 'react';
import { SoftStarterState } from '../utils/softStarterEngine';
import { AlertOctagon, AlertTriangle, Info, Check, Download, Bell, ShieldAlert, Sparkles } from 'lucide-react';

export interface AlarmAnnunciatorProps {
  engineState?: Partial<SoftStarterState> & {
    busDipPct?: number;
    dipPct?: number;
    surgeHeadMeters?: number;
    surgeHead_m?: number;
    startsThisHour?: number;
    maxStartsPerHour?: number;
    startsLeft?: number;
    phaseImbalance?: number;
    phaseLoss?: boolean;
    scrShort?: boolean;
    dryRun?: boolean;
    stall?: boolean;
    overcurrent?: boolean;
  };
  engine?: Partial<SoftStarterState> & {
    busDipPct?: number;
    dipPct?: number;
    surgeHeadMeters?: number;
    surgeHead_m?: number;
    startsThisHour?: number;
    maxStartsPerHour?: number;
    startsLeft?: number;
    phaseImbalance?: number;
    phaseLoss?: boolean;
    scrShort?: boolean;
    dryRun?: boolean;
    stall?: boolean;
    overcurrent?: boolean;
  };
  alarms?: AlarmItem[];
  onAcknowledge?: (id: string) => void;
  onAcknowledgeAll?: () => void;
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
 * AlarmAnnunciator.tsx - Industrial DCS First-Out Alarm Annunciator Panel
 * 
 * Features:
 * - Table Columns: Timestamp, Severity (Icon), Code, Message, Value, Ack
 * - First-Out Highlight Badge & Border for root-cause cascade identification
 * - Auto-generates 9 Engine Alarms: Overload, Short Circuit, Stall, Phase Imbalance, Thyristor Shorted, Dry Run, Water Hammer, Max Starts, Bus Dip
 * - Unacked Flashing, ACK per Row, ACK ALL, and CSV Export
 */
export const AlarmAnnunciator: React.FC<AlarmAnnunciatorProps> = ({
  engineState,
  engine,
  alarms: externalAlarms,
  onAcknowledge,
  onAcknowledgeAll,
  className = '',
}) => {
  const activeEngine = engineState || engine;

  const [internalAlarms, setInternalAlarms] = useState<AlarmItem[]>([
    {
      id: 'alarm-init-1',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + '.000',
      severity: 'INFO',
      code: 'SYS-001',
      message: 'Soft Starter DCS Control System Initialized & Online',
      valueStr: '415V 160kW Ready',
      isFirstOut: true,
      isAcked: true,
    },
  ]);

  const activeAlarms = externalAlarms || internalAlarms;

  // Auto-generate 9 engine event alarms from real-time engine state changes
  useEffect(() => {
    if (!activeEngine) return;

    const detectedAlarms: Omit<AlarmItem, 'id' | 'isFirstOut' | 'isAcked'>[] = [];
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');

    // 1. Overload Trip (49)
    const thermalCap = activeEngine.thermalCapPct ?? activeEngine.thermalCap ?? 0;
    if (activeEngine.state === 'TRIPPED' || thermalCap >= 100.0) {
      detectedAlarms.push({
        timestamp: timeStr,
        severity: 'CRITICAL',
        code: 'TRIP-49',
        message: 'Thermal Overload Trip (IEC Class 10/20/30 Exceeded)',
        valueStr: `Cap: ${thermalCap.toFixed(1)}%`,
      });
    }

    // 2. Instantaneous (50) Short Circuit Trip
    const iPu = activeEngine.IrmsPu ?? 0;
    if (iPu > 5.0 || activeEngine.overcurrent) {
      detectedAlarms.push({
        timestamp: timeStr,
        severity: 'CRITICAL',
        code: 'TRIP-50',
        message: 'Instantaneous Overcurrent / Short Circuit Surge Trip',
        valueStr: `I = ${iPu > 0 ? iPu.toFixed(2) : '5.20'} pu (${Math.round((iPu || 5.2) * 269)}A)`,
      });
    }

    // 3. Motor Stall Detection (speed not accelerating despite current limit)
    const speed = activeEngine.w ?? 0;
    if ((activeEngine.state === 'STARTING' || activeEngine.stall) && speed < 0.15 && iPu > 2.2) {
      detectedAlarms.push({
        timestamp: timeStr,
        severity: 'WARNING',
        code: 'ALM-STALL',
        message: 'Motor Stall Warning — Speed not accelerating under current limit',
        valueStr: `Speed: ${Math.round(speed * 100)}%, I: ${iPu.toFixed(1)}pu`,
      });
    }

    // 4. Phase Imbalance / Phase Loss
    const imb = activeEngine.phaseImbalance ?? (activeEngine.phaseLoss ? 28 : 0);
    if (imb > 15.0 || activeEngine.phaseLoss) {
      detectedAlarms.push({
        timestamp: timeStr,
        severity: 'CRITICAL',
        code: 'ALM-PHASE',
        message: 'Phase Current Imbalance / Single Phasing Hazard',
        valueStr: `Unbalance: ${imb.toFixed(1)}% (Ineg > 20%)`,
      });
    }

    // 5. Thyristor Shorted (Simulated SCR Failure)
    if (activeEngine.scrShort) {
      detectedAlarms.push({
        timestamp: timeStr,
        severity: 'CRITICAL',
        code: 'TRIP-SCR',
        message: 'Thyristor Short-Circuit Junction Breakdown (SCR Bridge Fault)',
        valueStr: 'V_drop < 1.0V (Shorted)',
      });
    }

    // 6. Underload / Dry-Run (Pump)
    if (activeEngine.dryRun || (speed > 0.8 && iPu > 0 && iPu < 0.35)) {
      detectedAlarms.push({
        timestamp: timeStr,
        severity: 'WARNING',
        code: 'ALM-DRYRUN',
        message: 'Pump Dry-Run / Underload Protection (Cavitation Hazard)',
        valueStr: `I = ${iPu.toFixed(2)} pu (< 40% FLA)`,
      });
    }

    // 7. Water Hammer Surge Pressure Exceeded
    const surgeHead = activeEngine.surgeHeadMeters ?? activeEngine.surgeHead_m ?? 0;
    if (surgeHead > 80.0) {
      detectedAlarms.push({
        timestamp: timeStr,
        severity: 'CRITICAL',
        code: 'ALM-SURGE',
        message: 'Hydraulic Water Hammer Pressure Surge Danger Exceeded',
        valueStr: `Head: ${(65 + surgeHead).toFixed(0)}m H₂O (+${surgeHead.toFixed(0)}m Surge)`,
      });
    }

    // 8. Starts per Hour Limit Exceeded
    const maxStarts = activeEngine.maxStartsPerHour ?? 4;
    const startsCount = activeEngine.startsThisHour ?? (maxStarts - (activeEngine.startsLeft ?? 2));
    if (startsCount >= maxStarts) {
      detectedAlarms.push({
        timestamp: timeStr,
        severity: 'WARNING',
        code: 'ALM-LIMIT',
        message: 'Max Starts Per Hour Reached — Thermal Cooldown Lockout',
        valueStr: `${startsCount} / ${maxStarts} Starts Used`,
      });
    }

    // 9. Bus Dip Warning
    const busDip = activeEngine.busDipPct ?? activeEngine.dipPct ?? 0;
    if (busDip > 10.0) {
      detectedAlarms.push({
        timestamp: timeStr,
        severity: 'WARNING',
        code: 'ALM-BUSDIP',
        message: 'Supply Busbar Voltage Dip Sag Warning (>10% V)',
        valueStr: `Bus Dip: ${busDip.toFixed(1)}% V`,
      });
    }

    if (detectedAlarms.length > 0) {
      setInternalAlarms((prev) => {
        const existingCodes = new Set(prev.map((a) => a.code));
        const filtered = detectedAlarms.filter((a) => !existingCodes.has(a.code));
        if (filtered.length === 0) return prev;

        const isFirstEverInCascade = prev.length === 0 || prev.every((a) => a.isAcked);

        const newItems: AlarmItem[] = filtered.map((a, idx) => ({
          ...a,
          id: `alarm-${Date.now()}-${idx}`,
          isFirstOut: isFirstEverInCascade && idx === 0,
          isAcked: false,
        }));

        return [...newItems, ...prev].slice(0, 50); // Keep max 50 log items
      });
    }
  }, [activeEngine]);

  // Acknowledge Single Alarm Row
  const handleAckRow = (id: string) => {
    if (onAcknowledge) {
      onAcknowledge(id);
    } else {
      setInternalAlarms((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isAcked: true } : a))
      );
    }
  };

  // Acknowledge All Alarms
  const handleAckAll = () => {
    if (onAcknowledgeAll) {
      onAcknowledgeAll();
    } else {
      setInternalAlarms((prev) => prev.map((a) => ({ ...a, isAcked: true })));
    }
  };

  // Export Alarm List to CSV File
  const exportToCSV = () => {
    const headers = 'Timestamp,Severity,Code,Message,Value,FirstOut,Acknowledged\n';
    const rows = activeAlarms
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
    link.setAttribute('download', `DCS_Alarm_Annunciator_Log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const unackedCount = activeAlarms.filter((a) => !a.isAcked).length;

  return (
    <div className={`bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 shadow-2xl space-y-4 font-mono ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#21262d] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
              <Bell className="w-5 h-5 text-red-500 animate-pulse" /> DCS FIRST-OUT ALARM ANNUNCIATOR
            </h2>
            {unackedCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] px-2.5 py-0.5 rounded-full font-extrabold animate-pulse shadow-[0_0_10px_#ef4444]">
                {unackedCount} UNACKNOWLEDGED
              </span>
            )}
          </div>
          <p className="text-xs text-[#8b949e] font-mono mt-0.5">
            IEC 60947-4-2 / DCS Sequence-of-Events Log • First-Out Root Cause Cascade Tagging
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleAckAll}
            disabled={unackedCount === 0}
            className={`px-3.5 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 ${
              unackedCount > 0
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 hover:bg-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-[#161b22] border-[#30363d] text-[#475569] cursor-not-allowed'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>ACK ALL ({unackedCount})</span>
          </button>

          <button
            onClick={exportToCSV}
            className="px-3.5 py-1.5 rounded-xl border border-[#30363d] bg-[#161b22] text-[#38bdf8] hover:text-white hover:border-[#58a6ff] font-bold transition-all flex items-center gap-1.5 shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Alarm Annunciator DCS Table */}
      <div className="rounded-xl border border-[#30363d] bg-[#161b22] overflow-x-auto shadow-inner">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#0d1117] border-b border-[#30363d] text-[#8b949e] text-[11px] uppercase tracking-wider">
              <th className="p-3 w-32 font-bold">Timestamp</th>
              <th className="p-3 w-28 font-bold">Severity</th>
              <th className="p-3 w-24 font-bold">Code</th>
              <th className="p-3 font-bold">Alarm Message</th>
              <th className="p-3 w-40 font-bold">Value</th>
              <th className="p-3 w-28 text-center font-bold">Ack</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#21262d]">
            {activeAlarms.map((alarm) => {
              const isUnacked = !alarm.isAcked;

              return (
                <tr
                  key={alarm.id}
                  className={`transition-all duration-300 ${
                    alarm.isFirstOut
                      ? 'bg-amber-500/15 border-l-4 border-l-amber-400 font-semibold'
                      : isUnacked
                      ? 'bg-red-500/10 animate-pulse'
                      : 'hover:bg-[#21262d]/50'
                  }`}
                >
                  {/* Timestamp */}
                  <td className="p-3 text-slate-300 font-bold whitespace-nowrap font-mono text-[11px]">
                    {alarm.timestamp}
                  </td>

                  {/* Severity Icon Badge */}
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-extrabold ${
                        alarm.severity === 'CRITICAL'
                          ? 'bg-red-500/20 border border-red-500 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                          : alarm.severity === 'WARNING'
                          ? 'bg-amber-500/20 border border-amber-400 text-amber-300'
                          : 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                      }`}
                    >
                      {alarm.severity === 'CRITICAL' ? (
                        <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      ) : alarm.severity === 'WARNING' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                      )}
                      {alarm.severity}
                    </span>
                  </td>

                  {/* Alarm Code */}
                  <td className="p-3 font-bold text-slate-200 whitespace-nowrap font-mono">
                    {alarm.code}
                  </td>

                  {/* Message + FIRST OUT Highlight Badge */}
                  <td className="p-3 text-white font-semibold flex items-center gap-2">
                    {alarm.isFirstOut && (
                      <span className="bg-amber-400 text-slate-950 font-extrabold text-[9px] px-2 py-0.5 rounded border border-amber-300 shadow-[0_0_10px_#f59e0b] flex items-center gap-1 shrink-0 animate-pulse">
                        <Sparkles className="w-3 h-3 fill-current" /> FIRST OUT
                      </span>
                    )}
                    <span className="leading-snug">{alarm.message}</span>
                  </td>

                  {/* Measured Value Readout */}
                  <td className="p-3 text-[#38bdf8] font-bold whitespace-nowrap font-mono">
                    {alarm.valueStr}
                  </td>

                  {/* Ack Action Button / Status */}
                  <td className="p-3 text-center whitespace-nowrap">
                    {alarm.isAcked ? (
                      <span className="text-emerald-400 font-bold text-[10px] flex items-center justify-center gap-1">
                        <Check className="w-3.5 h-3.5" /> ACKED
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAckRow(alarm.id)}
                        className="px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white font-extrabold text-[10px] transition-all shadow-[0_0_10px_#ef4444] active:scale-95"
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

export default AlarmAnnunciator;
