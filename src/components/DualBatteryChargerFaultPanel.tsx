import React from 'react';
import { DualChargerFaults, DualBatteryChargerReadouts } from '../types/dualBatteryCharger';
import { AlertTriangle, ShieldAlert, ZapOff, CheckCircle2, RefreshCw } from 'lucide-react';

interface DualBatteryChargerFaultPanelProps {
  faults: DualChargerFaults;
  readouts: DualBatteryChargerReadouts;
  onToggleFault: (key: keyof DualChargerFaults) => void;
  onResetFaults: () => void;
}

export const DualBatteryChargerFaultPanel: React.FC<DualBatteryChargerFaultPanelProps> = ({
  faults,
  readouts,
  onToggleFault,
  onResetFaults,
}) => {
  const faultItems: { key: keyof DualChargerFaults; name: string; desc: string; severity: 'TRIP' | 'WARNING' }[] = [
    {
      key: 'acOutageA',
      name: 'AC Supply A Loss (415V Outage)',
      desc: 'Simulates complete blackout on 3PH AC Supply A. Charger 1A stops generating.',
      severity: 'TRIP',
    },
    {
      key: 'acOutageB',
      name: 'AC Supply B Loss (415V Outage)',
      desc: 'Simulates complete blackout on 3PH AC Supply B. Charger 1B stops generating.',
      severity: 'TRIP',
    },
    {
      key: 'moduleFailA',
      name: 'Charger 1A Rectifier Module Tripped',
      desc: 'Forces 2 of 4 modules in Charger 1A offline (reduces capacity to 40A).',
      severity: 'WARNING',
    },
    {
      key: 'moduleFailB',
      name: 'Charger 1B Rectifier Module Tripped',
      desc: 'Forces 2 of 4 modules in Charger 1B offline (reduces capacity to 40A).',
      severity: 'WARNING',
    },
    {
      key: 'groundFaultBus1Pos',
      name: 'DC Bus 1 Positive (+VE) Rail Earth Fault (ANSI 64 / 89G)',
      desc: 'Positive busbar 1 shorts to earth ground. V_L1+ collapses to 0V while V_L1- shifts to -220V. Station load stays live.',
      severity: 'WARNING',
    },
    {
      key: 'groundFaultBus1Neg',
      name: 'DC Bus 1 Negative (-VE) Rail Earth Fault (ANSI 64 / 89G)',
      desc: 'Negative busbar 1 shorts to earth ground. V_L1- collapses to 0V while V_L1+ shifts to +220V. Station load stays live.',
      severity: 'WARNING',
    },
    {
      key: 'groundFaultBus2Pos',
      name: 'DC Bus 2 Positive (+VE) Rail Earth Fault (ANSI 64 / 89G)',
      desc: 'Positive busbar 2 shorts to earth ground. V_L2+ collapses to 0V while V_L2- shifts to -220V. Station load stays live.',
      severity: 'WARNING',
    },
    {
      key: 'groundFaultBus2Neg',
      name: 'DC Bus 2 Negative (-VE) Rail Earth Fault (ANSI 64 / 89G)',
      desc: 'Negative busbar 2 shorts to earth ground. V_L2- collapses to 0V while V_L2+ shifts to +220V. Station load stays live.',
      severity: 'WARNING',
    },
    {
      key: 'groundFaultBus1',
      name: 'DC Bus 1 General Earth Insulation Fault (64G)',
      desc: 'Triggers insulation monitoring relay (64G) on DC Bus 1 due to low earth resistance.',
      severity: 'WARNING',
    },
    {
      key: 'groundFaultBus2',
      name: 'DC Bus 2 General Earth Insulation Fault (64G)',
      desc: 'Triggers insulation monitoring relay (64G) on DC Bus 2 due to low earth resistance.',
      severity: 'WARNING',
    },
    {
      key: 'diodeAOpen',
      name: 'Blocking Diode MR 150A Open Circuit (Charger 1A)',
      desc: 'Diode failure prevents Charger 1A from conducting output current to DC Bus 1.',
      severity: 'TRIP',
    },
    {
      key: 'diodeBOpen',
      name: 'Blocking Diode MR 150A Open Circuit (Charger 1B)',
      desc: 'Diode failure prevents Charger 1B from conducting output current to DC Bus 2.',
      severity: 'TRIP',
    },
    {
      key: 'load1Trip',
      name: 'DCDB 1 Downstream Load Short / Trip',
      desc: 'Simulates heavy short circuit on DCDB 1 downstream feeders. Triggers LOAD TRIPPED critical emergency alarm.',
      severity: 'TRIP',
    },
    {
      key: 'load2Trip',
      name: 'DCDB 2 Downstream Load Short / Trip',
      desc: 'Simulates heavy short circuit on DCDB 2 downstream feeders. Triggers LOAD TRIPPED critical emergency alarm.',
      severity: 'TRIP',
    },
  ];

  const anyFaultActive = Object.values(faults).some(Boolean);

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 font-mono select-none">
      <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-950/80 border border-red-500/50 rounded-xl text-red-400">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wider flex items-center gap-2">
              DUAL BATTERY CHARGER FAULT INJECTION & RELAY 64G PROTECTION
            </h3>
            <p className="text-xs text-slate-400">
              Simulate AC outages, module failures, earth faults, and diode open-circuits
            </p>
          </div>
        </div>

        {anyFaultActive && (
          <button
            onClick={onResetFaults}
            className="px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-500 text-red-200 text-xs font-bold flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            CLEAR ALL FAULTS
          </button>
        )}
      </div>

      {/* FAULT BUTTONS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {faultItems.map((item) => {
          const isActive = faults[item.key];
          return (
            <button
              key={item.key}
              onClick={() => onToggleFault(item.key)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                isActive
                  ? 'bg-red-950/80 border-red-500 text-red-200 shadow-lg shadow-red-950/50 animate-pulse'
                  : 'bg-[#0d1117] border-[#30363d] text-slate-300 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">{item.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                    item.severity === 'TRIP' ? 'bg-red-900 text-red-300' : 'bg-amber-900 text-amber-300'
                  }`}
                >
                  {item.severity}
                </span>
              </div>
              <p className="text-[10px] opacity-80">{item.desc}</p>
              <div className="text-[10px] font-bold mt-1">
                STATUS: {isActive ? '🔴 ACTIVE FAULT' : '🟢 NORMAL'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
