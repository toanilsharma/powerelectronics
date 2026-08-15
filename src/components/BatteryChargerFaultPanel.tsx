import React, { useState } from 'react';
import { ActiveFaults, ProtectionRelay } from '../types/batteryCharger';
import { AlertTriangle, Wrench, RefreshCw, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';

interface BatteryChargerFaultPanelProps {
  activeFaults: ActiveFaults;
  onTriggerFault: (faultType: keyof ActiveFaults) => void;
  onResetFaults: () => void;
  relays: ProtectionRelay[];
}

interface FaultDetail {
  key: keyof ActiveFaults;
  title: string;
  code: string;
  badge: string;
  summary: string;
  symptom: string;
  rootCause: string;
  maintenanceAction: string;
}

export const BatteryChargerFaultPanel: React.FC<BatteryChargerFaultPanelProps> = ({
  activeFaults,
  onTriggerFault,
  onResetFaults,
  relays,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);
  const [selectedFaultKey, setSelectedFaultKey] = useState<keyof ActiveFaults | null>(null);

  const faultDefinitions: FaultDetail[] = [
    {
      key: 'scrT3Open',
      code: 'FAULT-01',
      title: '1. SCR OPEN CIRCUIT (T3)',
      badge: 'THYRISTOR MISFIRE',
      summary: 'T3 gate failure. Vdc drops ~75%, ripple ↑ 8%. Auto 5s UV trip.',
      symptom: 'DC voltage drops to ~92V; AC ripple increases to 8.2% Vrms; Relay 27 operates after 5s delay.',
      rootCause: 'Gate pulse driver transformer failure or open-circuit gate resistor on SCR thyristor T3.',
      maintenanceAction: 'Isolate AC input. Measure gate-cathode resistance with DMM (10-50Ω normal). Replace defective SCR module and re-verify firing pulses.',
    },
    {
      key: 'acPhaseLossL2',
      code: 'FAULT-02',
      title: '2. AC PHASE LOSS (L2)',
      badge: 'PHASE FAILURE',
      summary: 'L2 voltage = 0V. Heavy 2nd harmonic ripple 14.8%. Auto 2s trip.',
      symptom: 'AC Phase L2 drops to 0V; heavy 100Hz 2nd harmonic ripple (14.8%); Relay 27 trips breaker 52-Q1 in 2s.',
      rootCause: 'Blown upstream AC distribution fuse F2 or loose terminal connection on AC breaker 52-Q1 L2 lug.',
      maintenanceAction: 'Measure 3-phase AC voltage (415V L-L). Replace blown fuse F2, inspect contactor contacts, and torque L2 cable lug to 25 N·m per IEEE 1188.',
    },
    {
      key: 'groundFault',
      code: 'FAULT-03',
      title: '3. BATTERY GROUND FAULT',
      badge: 'RELAY 64G OPERATED',
      summary: 'Igf = 150mA at Cell #14. 64G detector triggers. Breaker Q2 trips.',
      symptom: 'Positive DC bus insulation breakdown; Igf = 150mA leakage at Cell #14; Relay 64G trips battery breaker 52-Q2.',
      rootCause: 'Electrolyte spillage on battery rack or insulation breakdown between cell jar casing and grounded metal rack.',
      maintenanceAction: 'Neutralize and clean electrolyte spill on rack frame. Perform insulation resistance test using 500V Megger (>10 MΩ required per IEEE 1188).',
    },
    {
      key: 'dcOvervoltage',
      code: 'FAULT-04',
      title: '4. DC OVERVOLTAGE (145V)',
      badge: 'RELAY 59 OPERATED',
      summary: 'Vdc spikes to 145V. OVP 59 relay fires in 1s. Q1 & Q2 trip.',
      symptom: 'DC voltage spikes to 145.0V (130% nominal); OVP Relay 59 fires within 1.0s; Breakers 52-Q1 & 52-Q2 trip.',
      rootCause: 'Voltage sensing feedback loop open circuit or PID control board voltage regulator IC runaway failure.',
      maintenanceAction: 'Inspect DC voltage feedback wiring harness. Recalibrate control card reference potentiometer or replace main control PCB per IEEE 1188.',
    },
    {
      key: 'loadTrip',
      code: 'FAULT-05',
      title: '5. DOWNSTREAM LOAD SHORT',
      badge: 'RELAY 50 OPERATED',
      summary: 'Instantaneous short circuit. Relay 50 operates. Breaker 52-Q3 trips.',
      symptom: 'Instantaneous DC overcurrent (>100A); Relay 50 operates instantly; Downstream DC breaker 52-Q3 trips.',
      rootCause: 'Short circuit fault on downstream DC distribution busbar or failed inverter load module.',
      maintenanceAction: 'Isolate load feeders, perform insulation test on DC buswork, clear fault before re-closing breaker 52-Q3.',
    },
    {
      key: 'controlFuseBlown',
      code: 'FAULT-06',
      title: '6. AC CONTROL FUSE BLOWN',
      badge: 'NO GATE PULSES',
      summary: 'No gate pulses, Vdc = 0V, AC breaker 52-Q1 remains CLOSED.',
      symptom: 'AC breaker 52-Q1 remains CLOSED, but gate firing pulses cease completely. Vdc drops to 0V (or battery discharge level).',
      rootCause: 'Primary or secondary short circuit on 120VAC control power transformer or shorted gate driver power supply.',
      maintenanceAction: 'De-energize control circuit. Test control fuses F1/F2 continuity with DMM. Replace with 2A slow-blow ceramic fuse per manufacturer schematic.',
    },
    {
      key: 'filterCapOpen',
      code: 'FAULT-07',
      title: '7. FILTER CAPACITOR C1 OPEN',
      badge: 'HIGH AC RIPPLE (9%)',
      summary: 'Ripple jumps from 1.5% to 9.0%, loud 300Hz hum, battery heating risk.',
      symptom: 'DC voltage ripple skyrockets to 9.0% Vrms; audible 300Hz choke hum; battery cell micro-cycling heating risk.',
      rootCause: 'Internal open-circuit fault in aluminum electrolytic capacitor C1 or loose filter link connection bar.',
      maintenanceAction: 'Discharge capacitor C1. Measure ESR with LCR meter (>50mΩ indicates bad C1). Replace C1 assembly to restore AC ripple < 0.5% per IEEE 1188.',
    },
    {
      key: 'looseTerminal',
      code: 'FAULT-08',
      title: '8. LOOSE BATTERY TERMINAL',
      badge: 'HOTSPOT 85°C / VOLTAGE DIP',
      summary: 'Vdc dips on load ON. Heatsink normal, terminal hotspot 85°C.',
      symptom: 'Load bus voltage dips sharply (from 122.6V to 95V) when load is turned ON; terminal #28 hotspot temperature hits 85°C.',
      rootCause: 'High contact resistance (I*R drop) at inter-cell connector due to insufficient bolt torque or surface lead oxidation.',
      maintenanceAction: 'Thermal camera inspection. De-energize string, clean lead post with wire brush, coat with NO-OX-ID grease, re-torque to 11 N·m (100 in-lb) per IEEE 1188.',
    },
    {
      key: 'roomFanFail',
      code: 'FAULT-09',
      title: '9. BATTERY ROOM FAN FAIL',
      badge: 'THERMAL RISE / DERATE 50%',
      summary: 'Heatsink/room temp rises 38°C -> 72°C. Current auto-derates to 50%.',
      symptom: 'Battery room ambient temp climbs from 38°C to 72°C over 2 mins; charger automatically limits current output to 50% max.',
      rootCause: 'Battery room ventilation exhaust fan motor failure or tripped motor thermal overload switch.',
      maintenanceAction: 'Inspect fan circuit breaker, test fan motor winding resistance, reset thermal overload, restore airflow to keep room < 25°C per IEEE 1188.',
    },
    {
      key: 'equalizeForgotten',
      code: 'FAULT-10',
      title: '10. EQUALIZE TIMER FORGOTTEN',
      badge: 'GASSING / WATER LOSS',
      summary: 'Stuck in equalize >12h at 137.5V. Cell gassing, life reduced 10%.',
      symptom: 'Charger remains stuck in Equalize mode (137.5V / 2.50V per cell) for >12 hours; active hydrogen gassing & electrolyte loss.',
      rootCause: 'Mechanical equalize timer contact stuck closed or operator forgot manual return to Float charging mode.',
      maintenanceAction: 'Manually switch charger back to Float mode (122.6V). Top off cell electrolyte with distilled water, perform capacity test per IEEE 1188.',
    },
  ];

  const handleResetClick = () => {
    setShowConfirmReset(true);
  };

  const confirmReset = () => {
    onResetFaults();
    setSelectedFaultKey(null);
    setShowConfirmReset(false);
  };

  // Find active or selected fault detail
  const activeFaultKeys = (Object.keys(activeFaults) as (keyof ActiveFaults)[]).filter(
    (k) => activeFaults[k]
  );

  const displayedDetailKey =
    selectedFaultKey || (activeFaultKeys.length > 0 ? activeFaultKeys[0] : null);

  const activeDetail = faultDefinitions.find((f) => f.key === displayedDetailKey);

  return (
    <div className="w-full bg-[#161b22] border border-[#30363d] rounded-xl p-4 select-none flex flex-col gap-4 shadow-xl">
      {/* HEADER & RESET BUTTON */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-[#21262d] gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#c9d1d9] uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#e3b341]" />
            Maintenance Fault Injection System (IEEE 1188 Standard)
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
            10 Realistic Fault Modes
          </span>
        </div>

        {/* RESET FAULTS BUTTON */}
        <button
          onClick={handleResetClick}
          className="px-4 py-2 rounded-lg text-xs font-bold font-mono border border-[#da3633] text-[#f85149] hover:bg-[#da3633] hover:text-white transition-all flex items-center gap-2 shadow-md bg-[#21262d]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>RESET ALL FAULTS</span>
        </button>
      </div>

      {/* CONFIRMATION MODAL OVERLAY */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161b22] border-2 border-[#da3633] rounded-xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[#f85149] font-bold text-sm">
              <ShieldAlert className="w-5 h-5" />
              <span>Reset All Injected Faults & Restore Charger?</span>
            </div>
            <p className="text-xs text-[#c9d1d9] leading-relaxed">
              This action will reset all 10 injected fault modes, restore protection relays to NORMAL status, re-close breakers (Q1, Q2, Q3), and re-establish normal 122.6V Float charging.
            </p>
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-3 py-1.5 rounded text-xs font-mono bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9]"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="px-4 py-1.5 rounded text-xs font-mono font-bold bg-[#da3633] text-white hover:bg-[#f85149] shadow-lg"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN GRID: 10 FAULT BUTTONS (LEFT) + IEEE 1188 MAINTENANCE GUIDE (RIGHT) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT 7 COLS: 10 FAULT BUTTONS IN 2-COLUMN GRID */}
        <div className="xl:col-span-7 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#8b949e] font-semibold">
            <span>SELECT FAULT TO INJECT:</span>
            <span className="text-[10px]">
              Active: {activeFaultKeys.length} / 10
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {faultDefinitions.map((f) => {
              const isActive = Boolean(activeFaults[f.key]);
              const isSelected = selectedFaultKey === f.key;

              return (
                <button
                  key={f.key}
                  onClick={() => {
                    onTriggerFault(f.key);
                    setSelectedFaultKey(f.key);
                  }}
                  className={`p-3 rounded-lg text-left transition-all border flex flex-col justify-between h-[92px] relative overflow-hidden ${
                    isActive
                      ? 'bg-[#da3633]/20 border-[#f85149] text-[#f85149] shadow-[0_0_12px_#f8514944] ring-1 ring-[#f85149]'
                      : isSelected
                      ? 'bg-[#1c2128] border-[#58a6ff] text-[#c9d1d9]'
                      : 'bg-[#0d1117] border-[#30363d] text-[#c9d1d9] hover:border-[#58a6ff]/60 hover:bg-[#161b22]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs font-mono truncate max-w-[80%]">
                      {f.title}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isActive ? 'bg-[#f85149] animate-ping' : 'bg-[#30363d]'
                      }`}
                    />
                  </div>
                  <div className="text-[10px] text-[#8b949e] leading-tight line-clamp-2 my-1">
                    {f.summary}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-[#21262d]">
                    <span className={`px-1.5 py-0.2 rounded font-bold ${isActive ? 'bg-[#f85149] text-white' : 'bg-[#21262d] text-[#8b949e]'}`}>
                      {f.badge}
                    </span>
                    <span className="text-[#58a6ff] hover:underline">IEEE 1188 Guide &gt;</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT 5 COLS: IEEE 1188 MAINTENANCE & TROUBLESHOOTING CARD */}
        <div className="xl:col-span-5 flex flex-col gap-3">
          <div className="text-[11px] font-mono text-[#8b949e] font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-[#58a6ff]" />
              IEEE 1188 TROUBLESHOOTING & MAINTENANCE CHECKLIST:
            </span>
            {activeDetail && (
              <span className="text-[10px] text-[#58a6ff] font-mono">
                {activeDetail.code}
              </span>
            )}
          </div>

          {activeDetail ? (
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
                <h4 className="font-bold text-sm text-white font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#e3b341]" />
                  {activeDetail.title}
                </h4>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  activeFaults[activeDetail.key]
                    ? 'bg-[#490202] text-[#f85149] border border-[#da3633]'
                    : 'bg-[#21262d] text-[#8b949e]'
                }`}>
                  {activeFaults[activeDetail.key] ? 'FAULT ACTIVE' : 'INSPECT MODE'}
                </span>
              </div>

              {/* 1. SYMPTOM */}
              <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#30363d]">
                <div className="text-[10px] font-bold text-[#f2cc60] font-mono uppercase tracking-wide flex items-center gap-1 mb-1">
                  🔍 SYMPTOM (OPERATOR OBSERVATION):
                </div>
                <p className="text-xs text-[#c9d1d9] leading-relaxed">
                  {activeDetail.symptom}
                </p>
              </div>

              {/* 2. ROOT CAUSE */}
              <div className="bg-[#161b22] p-2.5 rounded-lg border border-[#30363d]">
                <div className="text-[10px] font-bold text-[#f85149] font-mono uppercase tracking-wide flex items-center gap-1 mb-1">
                  🔬 ROOT CAUSE (ELECTRICAL FAILURE MODE):
                </div>
                <p className="text-xs text-[#c9d1d9] leading-relaxed">
                  {activeDetail.rootCause}
                </p>
              </div>

              {/* 3. MAINTENANCE ACTION (IEEE 1188) */}
              <div className="bg-[#0e4429]/30 p-2.5 rounded-lg border border-[#238636]/50">
                <div className="text-[10px] font-bold text-[#3fb950] font-mono uppercase tracking-wide flex items-center gap-1 mb-1">
                  🛠️ MAINTENANCE ACTION (IEEE 1188 CHECKLIST):
                </div>
                <p className="text-xs text-[#3fb950] leading-relaxed font-mono">
                  {activeDetail.maintenanceAction}
                </p>
              </div>

              <div className="text-[10px] text-[#8b949e] font-mono text-right pt-1">
                IEEE Standard 1188-2005 Maintenance, Testing & Replacement of VRLA Batteries
              </div>
            </div>
          ) : (
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6 text-center text-[#8b949e] flex flex-col items-center justify-center min-h-[250px]">
              <CheckCircle2 className="w-10 h-10 text-[#3fb950] mb-2" />
              <span className="text-xs font-bold text-white">All Systems Normal</span>
              <span className="text-[11px] mt-1">
                Select any fault card above to inject a simulated fault and view the IEEE 1188 maintenance procedure.
              </span>
            </div>
          )}

          {/* PROTECTION RELAY TABLE */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden mt-1">
            <div className="bg-[#21262d] px-3 py-1.5 text-[10px] font-mono font-bold text-[#8b949e] uppercase border-b border-[#30363d]">
              PROTECTION RELAY ANNUNCIATOR STATUS
            </div>
            <table className="w-full text-left text-xs font-mono border-collapse">
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
                      <td className="py-1 px-3 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOperated ? 'bg-[#f85149] animate-ping' : 'bg-[#3fb950]'
                          }`}
                        />
                        <span>{r.code} - {r.name}</span>
                      </td>
                      <td className="py-1 px-3 text-[#8b949e] text-[10px]">{r.setting}</td>
                      <td className="py-1 px-3 text-right">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
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

