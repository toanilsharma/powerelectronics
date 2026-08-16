import React from 'react';
import { ActiveFaults } from '../types/batteryCharger';
import { ShieldAlert, AlertTriangle, X, RotateCcw, Info } from 'lucide-react';

interface SingleChargerFaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFaults: ActiveFaults;
  onToggleFault: (faultKey: keyof ActiveFaults) => void;
  onClearAllFaults: () => void;
}

interface FaultDefinition {
  key: keyof ActiveFaults;
  title: string;
  code: string;
  category: 'AC / Power' | 'Rectifier / SCR' | 'DC / Filter' | 'Control / Auxiliary';
  description: string;
  impact: string;
}

const FAULT_DEFINITIONS: FaultDefinition[] = [
  {
    key: 'scrT3Open',
    title: 'Thyristor SCR T3 Open Circuit',
    code: 'F-SCR-03',
    category: 'Rectifier / SCR',
    description: 'Phase B top thyristor fails to gate/conduct, opening one leg of the 6-pulse bridge.',
    impact: 'Output voltage drops to ~75%, introduces prominent 3-pulse (150Hz) AC ripple in DC bus.',
  },
  {
    key: 'acPhaseLossL2',
    title: 'AC Phase L2 (Phase B) Input Loss',
    code: 'F-AC-02',
    category: 'AC / Power',
    description: 'Loss of utility phase L2 input voltage (blown AC fuse or opened upstream feeder).',
    impact: 'Rectifier operates single-phase with ~20% voltage drop and heavy 100Hz ripple.',
  },
  {
    key: 'groundFault',
    title: 'DC Bus Positive/Negative Ground Fault',
    code: 'F-DC-64',
    category: 'DC / Filter',
    description: 'Low-impedance leakage or insulation breakdown to earth on DC bus conductor.',
    impact: 'Triggers 64G Ground Fault Relay alert; potential risk of breaker trip on double earth fault.',
  },
  {
    key: 'dcOvervoltage',
    title: 'DC Output Overvoltage Runaway',
    code: 'F-DC-59',
    category: 'Rectifier / SCR',
    description: 'Control feedback loop failure driving SCR firing angle α to minimum, forcing high voltage.',
    impact: 'Vdc spikes to 145VDC; risks overcharging battery bank and triggering 59 Overvoltage Relay.',
  },
  {
    key: 'loadTrip',
    title: 'DC Distribution Load Feeder Trip',
    code: 'F-DC-52Q3',
    category: 'DC / Filter',
    description: 'Short-circuit or severe overload on DC distribution bus forcing 52-Q3 breaker trip.',
    impact: 'Critical DC load current drops to 0A; battery bank remains on float standby.',
  },
  {
    key: 'controlFuseBlown',
    title: 'Control Power Transformer Fuse Blown',
    code: 'F-[#01]',
    category: 'Control / Auxiliary',
    description: 'Loss of 110VAC/24VDC internal power supply powering thyristor gate firing pulse generator.',
    impact: 'All SCR firing pulses inhibited; charger output drops to 0V (battery supplies load if Q2 closed).',
  },
  {
    key: 'filterCapOpen',
    title: 'DC Filter Capacitor Bank Open',
    code: 'F-FILT-01',
    category: 'DC / Filter',
    description: 'Internal disconnection or open-circuit degradation in electrolytic capacitor C1 bank.',
    impact: 'DC voltage ripple spikes from 0.45V to >4.8V peak-to-peak; potential ripple current heating of battery.',
  },
  {
    key: 'looseTerminal',
    title: 'High Resistance Loose AC/DC Terminal',
    code: 'F-ELEC-01',
    category: 'Control / Auxiliary',
    description: 'Increased contact resistance at main busbar joint or cable terminal lug connection.',
    impact: 'Severe I²R voltage drop (~26.5V under load) and localized overheating hazard.',
  },
  {
    key: 'roomFanFail',
    title: 'Enclosure Ventilation Fan Failure',
    code: 'F-AUX-01',
    category: 'Control / Auxiliary',
    description: 'Loss of forced-air cooling fan for SCR heatsink assembly.',
    impact: 'Triggers thermal protection derating charger output current limit to 25A maximum.',
  },
  {
    key: 'equalizeForgotten',
    title: 'Equalize Charge Mode Forgotten Active',
    code: 'F-OP-01',
    category: 'Control / Auxiliary',
    description: 'Operator left manual equalize mode active for >24 hours past recommended duration.',
    impact: 'Sustained 137.5VDC boost voltage causes battery gassing, electrolyte loss, and cell drying.',
  },
];

export const SingleChargerFaultModal: React.FC<SingleChargerFaultModalProps> = ({
  isOpen,
  onClose,
  activeFaults,
  onToggleFault,
  onClearAllFaults,
}) => {
  if (!isOpen) return null;

  const activeCount = Object.values(activeFaults).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#030712]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="bg-[#0b1220] border border-[#1e293b] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#0f172a] border-b border-[#1e293b] px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-mono font-bold text-base text-white flex items-center gap-2">
                CONTROLLED FAULT INJECTION INTERFACE
                {activeCount > 0 ? (
                  <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                    {activeCount} FAULT{activeCount > 1 ? 'S' : ''} ACTIVE
                  </span>
                ) : (
                  <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    NOMINAL / NO FAULTS
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Inject realistic industrial electrical and component faults to test charger protection relays, telemetry response, and waveform distortion.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                onClick={onClearAllFaults}
                className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear All Faults</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Fault Interface"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Fault Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {FAULT_DEFINITIONS.map((fault) => {
            const isActive = activeFaults[fault.key];

            return (
              <div
                key={fault.key}
                onClick={() => onToggleFault(fault.key)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative ${
                  isActive
                    ? 'bg-rose-950/40 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                    : 'bg-[#070d19] border-[#1e293b] hover:border-slate-700 hover:bg-[#0e172a]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center font-mono font-bold text-xs mt-0.5 ${
                        isActive
                          ? 'bg-rose-500 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isActive ? '!' : 'OFF'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {fault.code}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{fault.category}</span>
                      </div>
                      <h3 className={`font-bold text-xs mt-1 ${isActive ? 'text-rose-200' : 'text-slate-200'}`}>
                        {fault.title}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFault(fault.key);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-md border border-rose-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {isActive ? 'TRIPPED / FAULTED' : 'INJECT FAULT'}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{fault.description}</p>

                <div
                  className={`p-2 rounded-lg text-[10px] font-mono flex items-start gap-1.5 ${
                    isActive
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-900/60'
                      : 'bg-[#0b1220] text-slate-400 border border-slate-800/80'
                  }`}
                >
                  <Info className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isActive ? 'text-rose-400' : 'text-amber-400'}`} />
                  <span>
                    <strong className="font-bold">IMPACT:</strong> {fault.impact}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#0f172a] border-t border-[#1e293b] px-5 py-3 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center gap-2 text-slate-400">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Click any fault to toggle electrical fault injection in real-time.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md cursor-pointer"
          >
            Apply &amp; Return to Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
