import React, { useState } from 'react';
import { STSFaults } from '../types/staticSwitch';

interface ProtectionRelay {
  code: string;
  name: string;
  setting: string;
  status: 'NORMAL' | 'OPERATED';
}

interface StaticSwitchFaultPanelProps {
  faults: STSFaults;
  onTriggerFault: (faultKey: keyof STSFaults) => void;
  onResetFaults: () => void;
  relays: ProtectionRelay[];
}

export const StaticSwitchFaultPanel: React.FC<StaticSwitchFaultPanelProps> = ({
  faults,
  onTriggerFault,
  onResetFaults,
  relays,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  return (
    <div className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-4 select-none flex flex-col gap-4 font-mono shadow-lg">
      {/* HEADER & RESET BUTTON */}
      <div className="flex items-center justify-between pb-2 border-b border-[#21262d]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#c9d1d9] uppercase tracking-wider flex items-center gap-2">
            ⚡ STS Fault Injection (Training Mode)
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e]">
            IEC 62040-3 / IEEE 1547
          </span>
        </div>

        {/* RESET FAULTS BUTTON */}
        <button
          onClick={() => setShowConfirmReset(true)}
          className="px-3 py-1.5 rounded-md text-xs font-bold border border-[#da3633] text-[#f85149] hover:bg-[#da3633]/20 transition-all flex items-center gap-1.5 shadow-sm"
        >
          <span>🔄</span>
          <span>RESET ALL FAULTS</span>
        </button>
      </div>

      {/* CONFIRMATION MODAL OVERLAY */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border-2 border-[#da3633] rounded-lg p-5 max-w-sm w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[#f85149] font-bold text-sm">
              <span>⚠️</span>
              <span>Reset STS Faults & Restore?</span>
            </div>
            <p className="text-xs text-[#c9d1d9]">
              Clear all injected STS faults, restore relays to normal, and reset transfer logic?
            </p>
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-3 py-1.5 rounded text-xs bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onResetFaults();
                  setShowConfirmReset(false);
                }}
                className="px-4 py-1.5 rounded text-xs font-bold bg-[#da3633] text-white hover:bg-[#f85149]"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: 2x2 FAULT INJECTION BUTTONS */}
        <div className="flex flex-col gap-2">
          <div className="text-[11px] text-[#8b949e] font-semibold">
            INJECT SYSTEM FAULTS:
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. SOURCE A LOSS */}
            <button
              onClick={() => onTriggerFault('sourceALoss')}
              className={`p-3 rounded-md text-left transition-all border flex flex-col justify-between h-[85px] ${
                faults.sourceALoss
                  ? 'bg-[#da3633]/20 border-[#f85149] text-[#f85149] shadow-[0_0_12px_#f8514944] animate-pulse'
                  : 'bg-[#0d1117] border-[#30363d] text-[#c9d1d9] hover:border-[#58a6ff] hover:bg-[#1c2128]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">1. SOURCE A LOSS</span>
                <span className={`w-2.5 h-2.5 rounded-full ${faults.sourceALoss ? 'bg-[#f85149]' : 'bg-[#30363d]'}`} />
              </div>
              <div className="text-[10px] text-[#8b949e] leading-tight">
                VA drops to 0V. Auto fast-transfer to Source B in &lt; 4ms.
              </div>
            </button>

            {/* 2. PHASE REVERSAL B */}
            <button
              onClick={() => onTriggerFault('phaseReversalB')}
              className={`p-3 rounded-md text-left transition-all border flex flex-col justify-between h-[85px] ${
                faults.phaseReversalB
                  ? 'bg-[#da3633]/20 border-[#f85149] text-[#f85149] shadow-[0_0_12px_#f8514944] animate-pulse'
                  : 'bg-[#0d1117] border-[#30363d] text-[#c9d1d9] hover:border-[#58a6ff] hover:bg-[#1c2128]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">2. L-N POLARITY INVERSION</span>
                <span className={`w-2.5 h-2.5 rounded-full ${faults.phaseReversalB ? 'bg-[#f85149]' : 'bg-[#30363d]'}`} />
              </div>
              <div className="text-[10px] text-[#8b949e] leading-tight">
                Invert L/N on Source B. Sync check fails, Alarm 25 active.
              </div>
            </button>

            {/* 3. SCR SHORT - BRIDGE A T2 */}
            <button
              onClick={() => onTriggerFault('scrShortBridgeAT2')}
              className={`p-3 rounded-md text-left transition-all border flex flex-col justify-between h-[85px] ${
                faults.scrShortBridgeAT2
                  ? 'bg-[#da3633]/20 border-[#f85149] text-[#f85149] shadow-[0_0_12px_#f8514944] animate-pulse'
                  : 'bg-[#0d1117] border-[#30363d] text-[#c9d1d9] hover:border-[#58a6ff] hover:bg-[#1c2128]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">3. SCR SHORT (T2)</span>
                <span className={`w-2.5 h-2.5 rounded-full ${faults.scrShortBridgeAT2 ? 'bg-[#f85149]' : 'bg-[#30363d]'}`} />
              </div>
              <div className="text-[10px] text-[#8b949e] leading-tight">
                Fuse blows, Bridge A disabled, forced transfer to B.
              </div>
            </button>

            {/* 4. LOSS OF SYNC */}
            <button
              onClick={() => onTriggerFault('lossOfSync')}
              className={`p-3 rounded-md text-left transition-all border flex flex-col justify-between h-[85px] ${
                faults.lossOfSync
                  ? 'bg-[#da3633]/20 border-[#f85149] text-[#f85149] shadow-[0_0_12px_#f8514944] animate-pulse'
                  : 'bg-[#0d1117] border-[#30363d] text-[#c9d1d9] hover:border-[#58a6ff] hover:bg-[#1c2128]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">4. LOSS OF SYNC</span>
                <span className={`w-2.5 h-2.5 rounded-full ${faults.lossOfSync ? 'bg-[#f85149]' : 'bg-[#30363d]'}`} />
              </div>
              <div className="text-[10px] text-[#8b949e] leading-tight">
                Δθ drifts &gt; 30°, transfers blocked, Alarm 25 active.
              </div>
            </button>
          </div>
        </div>

        {/* RIGHT: PROTECTION RELAY ANNUNCIATOR TABLE */}
        <div className="flex flex-col gap-2">
          <div className="text-[11px] text-[#8b949e] font-semibold">
            PROTECTION RELAY ANNUNCIATOR:
          </div>

          <div className="bg-[#0d1117] border border-[#30363d] rounded-md overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#21262d] text-[#8b949e] border-b border-[#30363d]">
                  <th className="py-1.5 px-3">Relay Code</th>
                  <th className="py-1.5 px-3">Setting</th>
                  <th className="py-1.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d]">
                {relays.map((r) => {
                  const isOperated = r.status === 'OPERATED';
                  return (
                    <tr
                      key={r.code}
                      className={`transition-all ${
                        isOperated
                          ? 'bg-[#da3633]/20 text-[#f85149] font-bold'
                          : 'text-[#c9d1d9] hover:bg-[#161b22]'
                      }`}
                    >
                      <td className="py-1.5 px-3 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOperated ? 'bg-[#f85149] animate-ping' : 'bg-[#3fb950]'
                          }`}
                        />
                        <span>{r.code} - {r.name}</span>
                      </td>
                      <td className="py-1.5 px-3 text-[#8b949e]">{r.setting}</td>
                      <td className="py-1.5 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isOperated
                              ? 'bg-[#f85149] text-white'
                              : 'bg-[#238636]/30 text-[#3fb950]'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
