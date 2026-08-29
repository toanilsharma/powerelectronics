import React from 'react';
import { ActiveSource, BumplessMatrixState, STSTransferMode } from '../types/staticSwitch';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Zap, ArrowRightLeft, Clock, Gauge } from 'lucide-react';

interface BumplessTransferMatrixProps {
  voltageA: number;
  freqA: number;
  phaseA: number;
  voltageB: number;
  freqB: number;
  phaseB: number;
  deltaTheta: number;
  deltaFreq: number;
  deltaVoltPct: number;
  
  activeBridge: ActiveSource;
  transferMode: STSTransferMode;
  autoTransferEnabled: boolean;
  onToggleAutoTransfer: () => void;
  
  sourceAPowerStopped: boolean;
  sourceBPowerStopped: boolean;
  onToggleStopSourceA: () => void;
  onToggleStopSourceB: () => void;

  qaClosed: boolean;
  qbClosed: boolean;
  q3Closed: boolean;
  
  matrixState: BumplessMatrixState;
  lastTransferTimeMs: number | null;
  lastTransferReason: string;
}

export const BumplessTransferMatrix: React.FC<BumplessTransferMatrixProps> = ({
  voltageA,
  freqA,
  phaseA,
  voltageB,
  freqB,
  phaseB,
  deltaTheta,
  deltaFreq,
  deltaVoltPct,
  activeBridge,
  transferMode,
  autoTransferEnabled,
  onToggleAutoTransfer,
  sourceAPowerStopped,
  sourceBPowerStopped,
  onToggleStopSourceA,
  onToggleStopSourceB,
  qaClosed,
  qbClosed,
  q3Closed,
  matrixState,
  lastTransferTimeMs,
  lastTransferReason,
}) => {
  const conditions = [
    {
      id: 'voltage_matching',
      name: 'Voltage Amplitude Matching (|ΔV|)',
      standardLimit: '≤ ± 5.0% (IEC 62040-3 Class 1)',
      measured: `ΔV = ${deltaVoltPct.toFixed(1)}% (${Math.abs(voltageA - voltageB).toFixed(1)}V diff)`,
      isMet: matrixState.voltageMatchOk,
      category: 'Power Quality',
      importance: 'CRITICAL' as const,
      description: 'Prevents circulating cross-currents and downstream voltage step changes during transfer.',
    },
    {
      id: 'freq_sync',
      name: 'Frequency Synchronization (|Δf|)',
      standardLimit: '≤ ± 0.10 Hz (IEEE 1547 / OEM Spec)',
      measured: `Δf = ${deltaFreq.toFixed(2)} Hz (${freqA.toFixed(2)}Hz vs ${freqB.toFixed(2)}Hz)`,
      isMet: matrixState.freqMatchOk,
      category: 'Phase Lock',
      importance: 'CRITICAL' as const,
      description: 'Ensures phase drift rate is low enough to guarantee safe SCR commutation window.',
    },
    {
      id: 'phase_angle',
      name: 'Phase Displacement (|Δθ|)',
      standardLimit: '≤ ± 5.0° (Synchrocheck Relay 25)',
      measured: `Δθ = ${deltaTheta.toFixed(1)}°`,
      isMet: matrixState.phaseMatchOk,
      category: 'Phase Lock',
      importance: 'CRITICAL' as const,
      description: 'Prevents phase jump impulse currents and transformer inrush saturation upon transfer.',
    },
    {
      id: 'phase_sequence',
      name: 'Phase Sequence & Rotation Match',
      standardLimit: '120° Positive Sequence (L1-L2-L3)',
      measured: matrixState.phaseSequenceOk ? 'ABC Positive Sequence (Matched)' : 'REVERSED / INVERTED (SWAPPED)',
      isMet: matrixState.phaseSequenceOk,
      category: 'Phase Lock',
      importance: 'CRITICAL' as const,
      description: 'Prevents 180° anti-phase dead short between dual utility sources.',
    },
    {
      id: 'synchrocheck_relay',
      name: 'Relay 25 In-Phase Lock Qualification',
      standardLimit: 'Locked ≥ 100ms Continuous Window',
      measured: matrixState.synchrocheckLockOk ? 'Relay 25 LOCKED (Stable)' : 'Relay 25 UNLOCKED / DRIFTING',
      isMet: matrixState.synchrocheckLockOk,
      category: 'Interlock',
      importance: 'SAFETY_INTERLOCK' as const,
      description: 'Hardware phase-locked loop (PLL) verification before enabling auto transfer.',
    },
    {
      id: 'scr_bridge_health',
      name: 'SCR Gate Driver & Thyristor Integrity',
      standardLimit: 'No Shorted/Open SCRs (T1-T6 OK)',
      measured: matrixState.scrBridgeHealthOk ? 'Gate Drivers & SCR Bridges HEALTHY' : 'SCR FAULT / SHORT DETECTED',
      isMet: matrixState.scrBridgeHealthOk,
      category: 'Hardware',
      importance: 'CRITICAL' as const,
      description: 'Ensures target bridge thyristors can fire properly and active bridge can extinguish.',
    },
    {
      id: 'target_source_ok',
      name: 'Target Source Availability & Breaker',
      standardLimit: 'V > 373V (90% Nom) & Breaker Closed',
      measured: activeBridge === 'A'
        ? `Source B: ${voltageB.toFixed(0)}V (${qbClosed ? 'QB Closed' : 'QB Open'})`
        : `Source A: ${voltageA.toFixed(0)}V (${qaClosed ? 'QA Closed' : 'QA Open'})`,
      isMet: matrixState.targetSourceAvailable,
      category: 'Source Feed',
      importance: 'CRITICAL' as const,
      description: 'Guarantees the destination source is energized, stable, and ready to accept load.',
    },
    {
      id: 'no_downstream_fault',
      name: 'Load Bus Integrity (No Downstream Short)',
      standardLimit: 'Load Current ≤ 100% (I_load ≤ 800A)',
      measured: matrixState.noDownstreamFault ? 'Load Current Normal (No Bus Short)' : 'HIGH OVERCURRENT / SHORT CIRCUIT',
      isMet: matrixState.noDownstreamFault,
      category: 'Protection',
      importance: 'SAFETY_INTERLOCK' as const,
      description: 'Inhibits transfer into a shorted bus to prevent fault escalation to the alternate source.',
    },
    {
      id: 'fast_commutation',
      name: 'Sub-4ms Natural Zero-Crossing Commutation',
      standardLimit: '< 4.0ms Break-Before-Make / Overlap',
      measured: matrixState.fastCommutationOk ? 'SCR Commutation Delay < 2.5ms' : 'Commutation Stalled',
      isMet: matrixState.fastCommutationOk,
      category: 'Execution',
      importance: 'RECOMMENDED' as const,
      description: 'Calculates natural current zero-crossing to fire gate drivers within 1/4 cycle.',
    },
    {
      id: 'no_lockout',
      name: 'Lockout Relay 86 Normal State',
      standardLimit: 'No Manual Reset Lockout Active',
      measured: matrixState.noLockout ? 'Relay 86 NORMAL' : 'RELAY 86 TRIP LOCKOUT ACTIVE',
      isMet: matrixState.noLockout,
      category: 'Protection',
      importance: 'SAFETY_INTERLOCK' as const,
      description: 'Master protection lockout prevents automatic transfer during critical device faults.',
    },
  ];

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-2xl flex flex-col gap-5 font-mono select-none">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-950/60 border border-blue-500/50 rounded-lg text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <span>BUMPLESS TRANSFER CONDITIONS & OEM DIAGNOSTICS</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-500/40">
                IEC 62040-3 / IEEE 1547
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Minimum required conditions for &lt; 4ms uninterrupted static transfer without critical load dropping
            </p>
          </div>
        </div>

        {/* CONTROLS: POWER LOSS SIMULATION & AUTO-TRANSFER */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onToggleStopSourceA}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${
              sourceAPowerStopped
                ? 'bg-red-950 border-red-500 text-red-300 shadow-md shadow-red-950/50 animate-pulse'
                : 'bg-[#21262d] border-[#30363d] text-emerald-400 hover:border-emerald-500'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            SOURCE A POWER: {sourceAPowerStopped ? 'STOPPED / OUTAGE' : 'ONLINE (415V)'}
          </button>

          <button
            onClick={onToggleStopSourceB}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${
              sourceBPowerStopped
                ? 'bg-red-950 border-red-500 text-red-300 shadow-md shadow-red-950/50 animate-pulse'
                : 'bg-[#21262d] border-[#30363d] text-cyan-400 hover:border-cyan-500'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            SOURCE B POWER: {sourceBPowerStopped ? 'STOPPED / OUTAGE' : 'ONLINE (415V)'}
          </button>

          <button
            onClick={onToggleAutoTransfer}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${
              autoTransferEnabled
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/50'
                : 'bg-amber-950/80 border-amber-500 text-amber-300'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            AUTO FAST-TRANSFER: {autoTransferEnabled ? 'ENABLED (<4ms)' : 'INHIBITED'}
          </button>
        </div>
      </div>

      {/* REAL-TIME BUMPLESS STATUS BANNER */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
          matrixState.isBumplessQualified
            ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300'
            : 'bg-amber-950/40 border-amber-500/60 text-amber-300'
        }`}
      >
        <div className="flex items-center gap-3">
          {matrixState.isBumplessQualified ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0 animate-bounce" />
          )}
          <div>
            <div className="text-base font-bold tracking-wider uppercase flex items-center gap-2">
              <span>
                {matrixState.isBumplessQualified
                  ? '✅ BUMPLESS TRANSFER QUALIFIED — ALL 10 CONDITIONS MET'
                  : '⚠️ BUMPLESS TRANSFER INHIBITED — OUT OF SYNCHRONIZATION OR INTERLOCK ACTIVE'}
              </span>
            </div>
            <div className="text-xs opacity-90 mt-0.5">
              {matrixState.isBumplessQualified
                ? 'Synchrocheck Relay 25 locked. Automatic shift upon source failure will execute in < 3.2ms without dropping critical load.'
                : 'Phase angle, frequency, or voltage delta exceeds OEM limits. Automatic transfer will revert to Break-Before-Make safety gap or inhibit.'}
            </div>
          </div>
        </div>

        {/* LAST TRANSFER TIMING METRIC */}
        <div className="flex items-center gap-3 bg-black/40 px-3.5 py-2 rounded-lg border border-slate-700 shrink-0">
          <Clock className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">LAST TRANSFER TIMING</div>
            <div className="text-sm font-black text-cyan-300">
              {lastTransferTimeMs !== null ? `${lastTransferTimeMs.toFixed(1)} ms` : '< 3.2 ms'}
            </div>
          </div>
        </div>
      </div>

      {/* LAST EVENT REASON BAR */}
      {lastTransferReason && (
        <div className="px-3.5 py-2 bg-slate-900/80 border border-slate-700/80 rounded-lg text-xs text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <strong className="text-emerald-400">LAST EVENT RECORD:</strong> {lastTransferReason}
          </span>
          <span className="text-[10px] text-slate-400">ITIC / CBEMA Ride-Through Limit Pass</span>
        </div>
      )}

      {/* MINIMUM REQUIRED CONDITIONS TABLE */}
      <div className="overflow-x-auto border border-[#30363d] rounded-xl bg-[#0d1117]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#161b22] border-b border-[#30363d] text-[#8b949e]">
              <th className="py-2.5 px-3.5 font-bold uppercase">Status</th>
              <th className="py-2.5 px-3.5 font-bold uppercase">Condition / Parameter</th>
              <th className="py-2.5 px-3.5 font-bold uppercase">Standard OEM Limit</th>
              <th className="py-2.5 px-3.5 font-bold uppercase">Real-Time Measured</th>
              <th className="py-2.5 px-3.5 font-bold uppercase">Importance</th>
              <th className="py-2.5 px-3.5 font-bold uppercase hidden lg:table-cell">OEM Technical Purpose</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262d]">
            {conditions.map((item) => (
              <tr key={item.id} className="hover:bg-[#161b22]/50 transition-colors">
                <td className="py-2.5 px-3.5 whitespace-nowrap">
                  {item.isMet ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      PASSED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-red-950/80 text-red-400 border border-red-500/40 animate-pulse">
                      <XCircle className="w-3.5 h-3.5" />
                      FAILED
                    </span>
                  )}
                </td>

                <td className="py-2.5 px-3.5 font-bold text-white">
                  {item.name}
                </td>

                <td className="py-2.5 px-3.5 text-amber-300 font-mono">
                  {item.standardLimit}
                </td>

                <td className="py-2.5 px-3.5 font-mono">
                  <span className={item.isMet ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {item.measured}
                  </span>
                </td>

                <td className="py-2.5 px-3.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      item.importance === 'CRITICAL'
                        ? 'bg-red-950/50 border-red-800 text-red-300'
                        : item.importance === 'SAFETY_INTERLOCK'
                        ? 'bg-purple-950/50 border-purple-800 text-purple-300'
                        : 'bg-blue-950/50 border-blue-800 text-blue-300'
                    }`}
                  >
                    {item.importance}
                  </span>
                </td>

                <td className="py-2.5 px-3.5 text-slate-400 text-[11px] hidden lg:table-cell">
                  {item.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SUB-MILLISECOND TRANSFER TIMELINE DIAGRAM */}
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs border-b border-[#21262d] pb-2">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>⚡ OEM Sub-Millisecond Automatic Transfer Hardware Sequence (&lt; 4ms)</span>
          </span>
          <span className="text-[10px] text-cyan-400 font-bold">ITIC / CBEMA Ride-Through Standard</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="text-[10px] text-amber-400 font-bold">STAGE 1: t = 0.0 - 0.8 ms</div>
            <div className="font-bold text-white text-xs mt-1">Sensing & DSP Detection</div>
            <div className="text-[11px] text-slate-400 mt-1">
              FPGA/DSP samples AC waveforms at 50kHz. Detects voltage loss or frequency dip within 500μs.
            </div>
          </div>

          <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="text-[10px] text-amber-400 font-bold">STAGE 2: t = 0.8 - 1.5 ms</div>
            <div className="font-bold text-white text-xs mt-1">SCR Gate Inhibition</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Failsafe active SCR gate pulses removed. Thyristors extinguish at zero-current crossing.
            </div>
          </div>

          <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg">
            <div className="text-[10px] text-amber-400 font-bold">STAGE 3: t = 1.5 - 2.4 ms</div>
            <div className="font-bold text-white text-xs mt-1">Target Gate Pulse Firing</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Synchronized gate pulses applied to alternate source SCR bridge in phase alignment.
            </div>
          </div>

          <div className="p-3 bg-[#161b22] border border-emerald-500/50 rounded-lg bg-emerald-950/20">
            <div className="text-[10px] text-emerald-400 font-bold">STAGE 4: t = 2.4 - 3.2 ms</div>
            <div className="font-bold text-emerald-300 text-xs mt-1">Full Load Conducted</div>
            <div className="text-[11px] text-emerald-200/80 mt-1">
              Load fully supported by Alternate Source. Total transfer time: <strong>2.4 ms</strong> (&lt; 4ms). No load drop!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
