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
import { DOLvsSoftComparison } from '../components/DOLvsSoftComparison';
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
  handleResetSsFaults,
  setActiveTab,
}) => {
  const [isTrainerMode, setIsTrainerMode] = useState(false);
  const [ssSubTab, setSsSubTab] = useState('telemetry');
  const [isFaultTrainerOpen, setIsFaultTrainerOpen] = useState(false);
  const [ssIsTourActive, setSsIsTourActive] = useState(false);
  const [ssTourStepIndex, setSsTourStepIndex] = useState(0);
  const [learningLevel, setLearningLevel] = useState('INTERMEDIATE');

  return (
    <div className="w-full min-h-screen md:h-screen flex flex-col bg-[#04060a] text-slate-100 font-sans select-none overflow-y-auto md:overflow-hidden">
      {/* ROW 1: STICKY HEADER (60px) */}
      <header
        className="w-full h-[60px] max-h-[60px] px-4 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#00e5a0]/10 border border-[#00e5a0]/30 rounded-xl text-[#00e5a0]">
            <span className="text-lg font-black">3~</span>
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>INDUSTRIAL SCR SOFT STARTER LAB</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                415V 160kW 269A
              </span>
            </h1>
            <p className="text-[10px] md:text-xs text-slate-400">
              IEC 60947-4-2 Thyristor Phase Control • Dynamic Bypass KM1 • Kloss Physics Engine
            </p>
          </div>
        </div>

        {/* TOP CONTROLS: LEARNING MODE + START/STOP/RESET + PRESET + TOOLS */}
        <div className="flex items-center gap-2">
          {/* LEARNING MODE LEVEL SELECTOR */}
          <select
            value={learningLevel}
            onChange={(e) => setLearningLevel(e.target.value)}
            className="h-[44px] min-h-[44px] bg-[#070a10] border border-emerald-500/50 text-[#00e5a0] font-extrabold text-xs rounded-xl px-3 focus:outline-none focus:border-[#00e5a0] cursor-pointer shadow-[0_0_10px_rgba(0,229,160,0.2)]"
          >
            <option value="BEGINNER">🎓 Mode: Beginner (3 Controls)</option>
            <option value="INTERMEDIATE">📘 Mode: Intermediate</option>
            <option value="EXPERT">⚡ Mode: Expert (Full Control)</option>
          </select>

          {/* START BUTTON */}
          <button
            type="button"
            onClick={handleSsStart}
            className="h-[44px] min-h-[44px] px-4 bg-[#10b981] hover:bg-[#059669] text-white font-extrabold text-xs rounded-xl border border-[#00ffb7] shadow-[0_0_14px_rgba(16,185,129,0.5)] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>▶ START</span>
          </button>

          {/* STOP BUTTON */}
          <button
            type="button"
            onClick={handleSsStop}
            className="h-[44px] min-h-[44px] px-4 bg-[#ef4444] hover:bg-[#dc2626] text-white font-extrabold text-xs rounded-xl border border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.5)] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>⏹ STOP</span>
          </button>

          {/* RESET BUTTON */}
          <button
            type="button"
            onClick={() => {
              if (handleResetSsFaults) handleResetSsFaults();
              else handleSsStop();
            }}
            className="h-[44px] min-h-[44px] px-3.5 bg-[#1f2937] hover:bg-[#374151] text-amber-300 font-extrabold text-xs rounded-xl border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            title="Reset all faults, trip states & motor simulation"
          >
            <span>🔄 RESET</span>
          </button>

          {/* INDUSTRIAL PRESET DROPDOWN */}
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'borewell') setSsParams((p) => ({ ...p, initialVoltagePct: 40, rampTimeSec: 15, currentLimitPct: 300, loadType: 'CENTRIFUGAL_PUMP' }));
              else if (val === 'fan') setSsParams((p) => ({ ...p, initialVoltagePct: 30, rampTimeSec: 25, currentLimitPct: 350, loadType: 'HIGH_INERTIA_FAN' }));
              else if (val === 'conveyor') setSsParams((p) => ({ ...p, initialVoltagePct: 50, rampTimeSec: 10, currentLimitPct: 350, loadType: 'LOADED_CONVEYOR' }));
              else if (val === 'crusher') setSsParams((p) => ({ ...p, initialVoltagePct: 60, rampTimeSec: 12, currentLimitPct: 400, loadType: 'LOADED_CONVEYOR' }));
              else if (val === 'weakgrid') setSsParams((p) => ({ ...p, initialVoltagePct: 30, rampTimeSec: 20, currentLimitPct: 250, loadType: 'CENTRIFUGAL_PUMP' }));
              else if (val === 'insidedelta') setSsParams((p) => ({ ...p, initialVoltagePct: 40, rampTimeSec: 15, currentLimitPct: 300, wiringConnection: 'INSIDE_DELTA' }));
            }}
            className="h-[44px] min-h-[44px] bg-[#070a10] border border-[#1e293b] text-cyan-300 font-extrabold text-xs rounded-xl px-3 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="borewell">Borewell Pump (300% limit) ▼</option>
            <option value="fan">Boiler ID Fan (350% limit)</option>
            <option value="conveyor">Incline Conveyor (350% limit)</option>
            <option value="crusher">Mining Crusher (400% limit)</option>
            <option value="weakgrid">Shipboard / Weak Grid (250% limit)</option>
            <option value="insidedelta">Inside-Delta Retrofit (58% SCR)</option>
          </select>

          {/* TOOLS MENU DROPDOWN */}
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'pdf') generateStartReportPDF(ssParams, ssReadouts);
              else if (val === 'tour') { setSsIsTourActive(true); setSsTourStepIndex(0); }
              else if (val === 'fault') setIsFaultTrainerOpen(true);
              e.target.value = 'menu';
            }}
            defaultValue="menu"
            className="h-[44px] min-h-[44px] bg-[#070a10] border border-purple-500/40 text-purple-300 font-extrabold text-xs rounded-xl px-3 focus:outline-none focus:border-purple-400 cursor-pointer"
          >
            <option value="menu" disabled>Tools Menu ▼</option>
            <option value="pdf">📄 Commissioning Report PDF</option>
            <option value="tour">🎓 Learning Mode Tour</option>
            <option value="fault">🎯 Fault Challenge</option>
          </select>

          {renderViewAlarmsButton && renderViewAlarmsButton(ssAlarmLog)}
        </div>
      </header>

      {/* ROW 2: MAIN 3-COLUMN LAYOUT (height: calc(100vh - 60px), grid-template-columns: 300px 1fr 360px, gap: 12px) */}
      <main
        style={{
          display: 'grid',
          gridTemplateColumns: '300px 1fr 360px',
          gap: '12px',
          padding: '12px',
          height: 'calc(100vh - 60px)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
        className="w-full"
      >
        {/* COLUMN 1: LEFT CONTROLS (300px) */}
        <section
          className="w-full md:w-[300px] md:h-full overflow-y-auto scrollbar-thin pr-0 md:pr-1 flex flex-col gap-3 order-1 md:order-none"
        >
          <SoftStarterControlsAndSOP
            params={ssParams}
            readouts={ssReadouts}
            faults={ssFaults}
            isRunning={ssIsRunning}
            isTrip={ssIsTrip}
            learningLevel={learningLevel}
            onUpdateParams={(newP) => setSsParams((prev) => ({ ...prev, ...newP }))}
            onStart={handleSsStart}
            onStop={handleSsStop}
            onJog={handleSsJog}
            onTriggerFault={handleTriggerFault}
          />
        </section>

        {/* COLUMN 2: CENTER SLD & BOTTOM TABS (1fr) */}
        <section
          className="w-full md:flex-1 md:min-w-0 md:h-full overflow-y-auto scrollbar-thin flex flex-col gap-3 pr-0 md:pr-1 order-2 md:order-none"
        >
          {/* GUIDED 3-STEP OVERLAY FOR BEGINNER MODE */}
          {learningLevel === 'BEGINNER' && (
            <div className="w-full bg-[#0d131f] border border-cyan-500/40 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs font-mono select-none shadow-lg shrink-0">
              <div className="flex items-center gap-2 text-cyan-300 font-extrabold shrink-0">
                <span className="p-1 bg-cyan-500/20 rounded border border-cyan-400">🎓 Guided Steps:</span>
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto text-[11px] font-bold scrollbar-none">
                <span className="px-2.5 py-1 bg-[#070a10] border border-slate-700 rounded-lg text-slate-200 shrink-0">
                  1️⃣ Set V_start to 40%
                </span>
                <span className="text-slate-500">➔</span>
                <span className="px-2.5 py-1 bg-[#070a10] border border-emerald-500/50 rounded-lg text-[#00e5a0] shrink-0">
                  2️⃣ Click ▶ START
                </span>
                <span className="text-slate-500">➔</span>
                <span className="px-2.5 py-1 bg-[#070a10] border border-amber-500/50 rounded-lg text-amber-300 shrink-0">
                  3️⃣ Watch SLD SCRs fire &amp; current clamp at 807A
                </span>
              </div>
              <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-1 rounded border border-emerald-500/40 shrink-0 hidden xl:block">
                Te_start = 24% of DOL (Te ∝ V²)
              </div>
            </div>
          )}

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
            onTriggerFault={handleTriggerFault}
          />

          {/* PRE / POST / SPLIT DOL vs SOFT START COMPARISON BAR (120px HEIGHT) */}
          <DOLvsSoftComparison
            params={ssParams}
            readouts={ssReadouts}
            faults={ssFaults}
            isRunning={ssIsRunning}
            isTrip={ssIsTrip}
          />

          <div className="w-full border-t border-[#30363d] pt-2">
            <SoftStarterBottomTabs
              params={ssParams}
              readouts={ssReadouts}
              engineState={currentSsEngineState}
              isRunning={ssIsRunning}
              isTrip={ssIsTrip}
              learningLevel={learningLevel}
            />
          </div>
        </section>

        {/* COLUMN 3: RIGHT TELEMETRY & FAULTS (360px) */}
        <section
          className="w-full md:w-[360px] md:h-full overflow-y-auto scrollbar-thin flex flex-col gap-3 pr-0 md:pr-1 order-3 md:order-none"
        >
          <SoftStarterRightPanel
            params={ssParams}
            readouts={ssReadouts}
            faults={ssFaults}
            isRunning={ssIsRunning}
            isTrip={ssIsTrip}
            onExportToHarmonicsLab={() => setActiveTab && setActiveTab('harmonics')}
          />
          <SoftStarterFaultPanel
            faults={ssFaults}
            onTriggerFault={handleTriggerFault}
            onResetFaults={handleResetSsFaults}
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
