import React, { useState } from 'react';
import { StateMachineLamps } from '../components/StateMachineLamps';
import { SoftStarterControlsAndSOP } from '../components/SoftStarterControlsAndSOP';
import { SoftStarterSLD } from '../components/SoftStarterSLD';
import { SoftStarterRightPanel } from '../components/SoftStarterRightPanel';
import { SoftStarterFaultPanel } from '../components/SoftStarterFaultPanel';
import { SoftStarterWaveforms } from '../components/SoftStarterWaveforms';
import { ScenarioPresets } from '../components/ScenarioPresets';
import { StartProfileChart } from '../components/StartProfileChart';
import { TorqueSpeedCurve } from '../components/TorqueSpeedCurve';
import { ThyristorScope } from '../components/ThyristorScope';
import { BusDipView } from '../components/BusDipView';
import { ThermalGauge } from '../components/ThermalGauge';
import { WaterHammerTrace } from '../components/WaterHammerTrace';
import { CompareStarters } from '../components/CompareStarters';
import { FaultTrainer } from '../components/FaultTrainer';
import { SoftStarterGuidedTour, SOFT_STARTER_TOUR_STEPS } from '../components/SoftStarterGuidedTour';
import { SoftStarterBottomTabs } from '../components/SoftStarterBottomTabs';
import { generateStartReportPDF } from '../utils/pdfReportGenerator';

export const SoftStarterContent = ({
  ssParams,
  setSsParams,
  ssReadouts,
  ssIsRunning,
  ssIsTrip,
  ssFaults,
  currentSsEngineState,
  handleSsStart,
  handleSsStop,
  handleSsJog,
  ssMCCBClosed,
  setSsMCCBClosed,
  ssBypassOverride,
  setSsBypassOverride,
  ssSuctionValveOpen,
  setSsSuctionValveOpen,
  ssDischargeValveOpen,
  setSsDischargeValveOpen,
  ssFlashTargetComponent,
  addSsAlarm,
  ssAlarmLog,
  renderViewAlarmsButton,
  handleTriggerFault,
  setActiveTab,
}) => {
  const [isTrainerMode, setIsTrainerMode] = useState(false);
  const [ssSubTab, setSsSubTab] = useState('telemetry');
  const [isFaultTrainerOpen, setIsFaultTrainerOpen] = useState(false);
  const [ssIsTourActive, setSsIsTourActive] = useState(false);
  const [ssTourStepIndex, setSsTourStepIndex] = useState(0);

  return (
    <div className="w-full min-h-screen md:h-screen flex flex-col md:grid md:grid-rows-[60px_50px_1fr_45px] bg-[#04060a] text-slate-100 font-sans select-none overflow-y-auto md:overflow-hidden">
      {/* ROW 1: HEADER (60px) */}
      <header
        className="w-full h-[60px] max-h-[60px] px-3 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#00e5a0]/10 border border-[#00e5a0]/30 rounded-xl text-[#00e5a0]">
            <span className="text-lg font-black">3~</span>
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>INDUSTRIAL SCR SOFT STARTER LAB</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                415V 160kW 269A
              </span>
            </h1>
            <p className="text-[10px] md:text-xs text-slate-400">
              IEC 60947-4-2 Thyristor Phase Control • Dynamic Bypass KM1 • Kloss Physics Engine
            </p>
          </div>
        </div>

        {/* WORKSTATION TOOLBAR BUTTONS */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => generateStartReportPDF(ssParams, ssReadouts)}
            className="px-3 py-1.5 rounded-xl border border-emerald-500/50 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/80 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)] active:scale-95 min-h-[44px]"
          >
            <span>📄 Commissioning Report PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab && setActiveTab('harmonics')}
            className="px-3 py-1.5 rounded-xl border border-amber-500/50 bg-amber-950/60 text-amber-300 hover:bg-amber-900/80 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.3)] active:scale-95 min-h-[44px]"
          >
            <span>⚡ Compare Starters</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFaultTrainerOpen(true)}
            className="px-3.5 py-1.5 rounded-xl border border-cyan-400/60 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/80 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.4)] active:scale-95 min-h-[44px]"
          >
            <span>🎯 Fault Challenge</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !ssIsTourActive;
              setSsIsTourActive(next);
              if (next) setSsTourStepIndex(0);
            }}
            className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px] ${
              ssIsTourActive
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.5)] animate-pulse'
                : 'bg-[#0d1117] border-[#30363d] text-slate-300 hover:text-white hover:border-[#58a6ff]'
            }`}
          >
            <span>🎓 Learning Mode</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${ssIsTourActive ? 'bg-cyan-400 text-slate-950' : 'bg-[#161b22] text-[#8b949e]'}`}>
              {ssIsTourActive ? `Step ${ssTourStepIndex + 1}/8` : '8 Guided Steps'}
            </span>
          </button>

          {renderViewAlarmsButton && renderViewAlarmsButton(ssAlarmLog)}
        </div>
      </header>

      {/* ROW 2: STATE MACHINE ANNUNCIATOR LAMPS (50px) */}
      <div
        className="w-full px-3 py-1 bg-[#090d16] border-b border-[#30363d] overflow-hidden flex items-center shrink-0 min-h-[50px]"
      >
        <StateMachineLamps engineState={currentSsEngineState} />
      </div>

      {/* ROW 3: MAIN LAYOUT (Single column on Mobile <768px, 3-Column Grid on Desktop >=768px) */}
      <main
        className="w-full flex flex-col md:grid md:grid-cols-[300px_1fr_340px] gap-3 p-3 overflow-y-auto md:overflow-hidden md:h-full box-border"
      >
        {/* COLUMN 1: LEFT CONTROLS (300px) */}
        <section
          className="w-full md:w-[300px] md:h-full overflow-y-auto scrollbar-thin pr-0 md:pr-1 flex flex-col gap-3 order-1 md:order-none"
        >
          <SoftStarterControlsAndSOP
            params={ssParams}
            readouts={ssReadouts}
            isRunning={ssIsRunning}
            isTrip={ssIsTrip}
            onUpdateParams={(newP) => setSsParams((prev) => ({ ...prev, ...newP }))}
            onStart={handleSsStart}
            onStop={handleSsStop}
            onJog={handleSsJog}
          />
        </section>

        {/* COLUMN 2: CENTER SLD & BOTTOM TABS (1fr) */}
        <section
          className="w-full md:flex-1 md:min-w-0 md:h-full overflow-y-auto scrollbar-thin flex flex-col gap-3 pr-0 md:pr-1 order-2 md:order-none"
        >
          <SoftStarterSLD
            mccbClosed={ssMCCBClosed}
            onToggleMCCB={() => {
              const next = !ssMCCBClosed;
              setSsMCCBClosed(next);
              if (addSsAlarm) addSsAlarm('INFO', `MCCB Breaker 52 ${next ? 'CLOSED' : 'OPENED'}.`, 'q1');
            }}
            onToggleBypass={() => {
              const next = !ssBypassOverride;
              setSsBypassOverride(next);
              if (addSsAlarm) addSsAlarm('INFO', `Bypass Contactor KM1 ${next ? 'MANUALLY CLOSED' : 'AUTO/OPEN'}.`, 'bypassKM1');
            }}
            isRunning={ssIsRunning}
            isTrip={ssIsTrip}
            params={ssParams}
            readouts={ssReadouts}
            faults={ssFaults}
            onToggleSuctionValve={() => {
              const next = !ssSuctionValveOpen;
              setSsSuctionValveOpen(next);
              if (addSsAlarm) addSsAlarm('INFO', `Pump Suction Valve ${next ? 'OPENED' : 'CLOSED'}.`, 'suctionValve');
            }}
            onToggleDischargeValve={() => {
              const next = !ssDischargeValveOpen;
              setSsDischargeValveOpen(next);
              if (addSsAlarm) addSsAlarm('INFO', `Pump Discharge Valve ${next ? 'OPENED' : 'CLOSED'}.`, 'dischargeValve');
            }}
            flashTargetComponent={ssFlashTargetComponent}
          />

          <div className="w-full border-t border-[#30363d] pt-2">
            <SoftStarterBottomTabs
              params={ssParams}
              readouts={ssReadouts}
              engineState={currentSsEngineState}
              isRunning={ssIsRunning}
              isTrip={ssIsTrip}
            />
          </div>
        </section>

        {/* COLUMN 3: RIGHT TELEMETRY & FAULTS (340px) */}
        <section
          className="w-full md:w-[340px] md:h-full overflow-y-auto scrollbar-thin flex flex-col gap-3 pr-0 md:pr-1 order-3 md:order-none"
        >
          <SoftStarterRightPanel
            params={ssParams}
            readouts={ssReadouts}
            isRunning={ssIsRunning}
            isTrip={ssIsTrip}
            onExportToHarmonicsLab={() => setActiveTab && setActiveTab('harmonics')}
          />
          <SoftStarterFaultPanel
            faults={ssFaults}
            onTriggerFault={handleTriggerFault}
          />
        </section>
      </main>

      {/* ROW 4: FOOTER PRESETS DROPDOWN TOOLBAR (45px) */}
      <footer
        className="w-full h-[45px] max-h-[45px] px-3 bg-[#0d1117] border-t border-[#30363d] flex items-center shrink-0 min-h-[45px]"
      >
        <ScenarioPresets
          currentParams={ssParams}
          onUpdateParams={(newP) => setSsParams((prev) => ({ ...prev, ...newP }))}
          onStartDemo={handleSsStart}
          className="w-full border-none shadow-none bg-transparent p-0"
        />
      </footer>

      {/* FAULT TRAINER MODAL */}
      <FaultTrainer
        isOpen={isFaultTrainerOpen}
        onClose={() => setIsFaultTrainerOpen(false)}
        params={ssParams}
        onUpdateParams={(newP) => setSsParams((prev) => ({ ...prev, ...newP }))}
        onTriggerFault={handleTriggerFault}
      />

      {/* GUIDED TOUR OVERLAY */}
      <SoftStarterGuidedTour
        isActive={ssIsTourActive}
        currentStepIndex={ssTourStepIndex}
        onNext={() => setSsTourStepIndex((prev) => Math.min(SOFT_STARTER_TOUR_STEPS.length - 1, prev + 1))}
        onPrev={() => setSsTourStepIndex((prev) => Math.max(0, prev - 1))}
        onClose={() => setSsIsTourActive(false)}
      />
    </div>
  );
};

export const SoftStarter = SoftStarterContent;
export default SoftStarterContent;
