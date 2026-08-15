import React, { useState, useEffect } from 'react';
import { DualBatteryChargerState, DualBatteryChargerReadouts } from '../types/dualBatteryCharger';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Play,
  Award,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Layers,
  Zap
} from 'lucide-react';

interface InteractiveSOPDrillManagerProps {
  state: DualBatteryChargerState;
  readouts: DualBatteryChargerReadouts;
  onToggleBreaker: (key: keyof DualBatteryChargerState) => void;
  onSetTargetHighlight?: (key: string | undefined) => void;
}

export interface SOPStep {
  stepNumber: number;
  objective: string;
  requiredAction: string;
  expectedIndication: string;
  targetComponentKey: string;
  isCompleted: (state: DualBatteryChargerState) => boolean;
  incorrectActionHint: string;
}

export interface SOPDrill {
  id: string;
  title: string;
  category: 'NORMAL_OPS' | 'EMERGENCY' | 'MAINTENANCE';
  estimatedTime: string;
  description: string;
  steps: SOPStep[];
}

const SOP_DRILLS: SOPDrill[] = [
  {
    id: 'normal-startup',
    title: '1. Normal Charger Start-Up',
    category: 'NORMAL_OPS',
    estimatedTime: '3 Mins',
    description: 'Energize Float Cum Boost Charger 1A from de-energized state to feed DC Bus 1.',
    steps: [
      {
        stepNumber: 1,
        objective: 'Energize 415V AC Supply A to Charger 1A incomer.',
        requiredAction: 'Turn ON 415V AC Supply A incomer breaker.',
        expectedIndication: 'AC Supply Voltmeter indicates 415V AC 50Hz, LED indicator turns GREEN.',
        targetComponentKey: 'acIncomerA',
        isCompleted: (s) => s.acSupplyAOnline,
        incorrectActionHint: 'You must first energize 415V AC Input A before closing DC output breakers.',
      },
      {
        stepNumber: 2,
        objective: 'Verify Charger 1A AC Input power is present.',
        requiredAction: 'Ensure 415V AC Supply A is active.',
        expectedIndication: 'Thyristor bridge energizes, Float Mode initializes at 234.15V DC.',
        targetComponentKey: 'acIncomerA',
        isCompleted: (s) => s.acSupplyAOnline,
        incorrectActionHint: 'Verify 415V AC Input A is active to power the SCR rectifier bridge.',
      },
      {
        stepNumber: 3,
        objective: 'Connect Charger 1A Output MCCB 100A to DC Bus 1.',
        requiredAction: 'Close Charger 1A Output MCCB 100A.',
        expectedIndication: 'DC Bus 1 Voltmeter shows 234V DC. Ammeter indicates charging current.',
        targetComponentKey: 'mccbChargerA',
        isCompleted: (s) => s.mccbChargerA,
        incorrectActionHint: 'Connect Charger 1A output breaker to supply DC Bus 1.',
      },
      {
        stepNumber: 4,
        objective: 'Connect Battery Bank 1 to DC Bus 1.',
        requiredAction: 'Close Battery Bank 1 MCCB 160A.',
        expectedIndication: 'Battery 1 enters Float charging mode (+6A to +12A trickle charge).',
        targetComponentKey: 'mccbBattery1_160A',
        isCompleted: (s) => s.mccbBattery1_160A,
        incorrectActionHint: 'Connect Battery Bank 1 breaker to float charge the battery string.',
      },
    ],
  },
  {
    id: 'charger-shutdown',
    title: '2. Controlled Charger Shutdown',
    category: 'MAINTENANCE',
    estimatedTime: '2 Mins',
    description: 'Safely de-energize Charger 1A for annual maintenance while keeping DC Bus 1 supported by Battery 1.',
    steps: [
      {
        stepNumber: 1,
        objective: 'Verify Battery Bank 1 is online to support DC Bus 1 load.',
        requiredAction: 'Ensure Battery 1 MCCB 160A is CLOSED.',
        expectedIndication: 'Battery 1 connected at 100% SOC ready to take over load.',
        targetComponentKey: 'mccbBattery1_160A',
        isCompleted: (s) => s.mccbBattery1_160A,
        incorrectActionHint: 'Battery 1 must remain connected so DC Bus 1 does not blackout during charger shutdown.',
      },
      {
        stepNumber: 2,
        objective: 'Isolate Charger 1A DC Output.',
        requiredAction: 'Open Charger 1A Output MCCB 100A.',
        expectedIndication: 'Charger 1A output current drops to 0A. Battery 1 takes over DC Bus 1 load.',
        targetComponentKey: 'mccbChargerA',
        isCompleted: (s) => !s.mccbChargerA,
        incorrectActionHint: 'Open Charger 1A output MCCB to isolate charger from DC Bus 1.',
      },
      {
        stepNumber: 3,
        objective: 'De-energize Charger 1A AC Input.',
        requiredAction: 'Trip AC Supply A to 0V.',
        expectedIndication: 'Thyristor bridge powers down completely.',
        targetComponentKey: 'acIncomerA',
        isCompleted: (s) => !s.acSupplyAOnline,
        incorrectActionHint: 'Turn off AC supply A to isolate Charger 1A for safe maintenance.',
      },
    ],
  },
  {
    id: 'charger-changeover',
    title: '3. Charger A to B Changeover',
    category: 'NORMAL_OPS',
    estimatedTime: '4 Mins',
    description: 'Perform seamless load transfer from Charger 1A to Charger 1B via DC Bus-Tie MCCB 125A without DC interruption.',
    steps: [
      {
        stepNumber: 1,
        objective: 'Ensure Charger 1B is fully energized and healthy.',
        requiredAction: 'Ensure Charger 1B AC Input & Output MCCBs are CLOSED.',
        expectedIndication: 'Charger 1B generates 234V DC on DC Bus 2.',
        targetComponentKey: 'mccbChargerB',
        isCompleted: (s) => s.acSupplyBOnline && s.mccbChargerB,
        incorrectActionHint: 'Charger 1B must be fully online at 234V before interconnecting buses.',
      },
      {
        stepNumber: 2,
        objective: 'Interconnect DC Bus 1 and Bus 2 via Bus Tie MCCB 125A.',
        requiredAction: 'Close DC Bus Tie MCCB 125A.',
        expectedIndication: 'DC Bus 1 and Bus 2 operate in parallel (Equalized 234V DC).',
        targetComponentKey: 'mccbBusTie',
        isCompleted: (s) => s.mccbBusTie,
        incorrectActionHint: 'Close Bus Tie MCCB to interconnect Bus 1 & 2 before shutting down Charger 1A.',
      },
      {
        stepNumber: 3,
        objective: 'Isolate Charger 1A for maintenance.',
        requiredAction: 'Open Charger 1A Output MCCB 100A.',
        expectedIndication: 'Charger 1B smoothly picks up total station load demand across Bus 1 & 2.',
        targetComponentKey: 'mccbChargerA',
        isCompleted: (s) => !s.mccbChargerA,
        incorrectActionHint: 'Open Charger 1A output MCCB. Charger 1B now feeds the entire station via Bus Tie.',
      },
    ],
  },
  {
    id: 'bus-tie-ops',
    title: '4. DC Bus-Tie Interconnection',
    category: 'NORMAL_OPS',
    estimatedTime: '2 Mins',
    description: 'Paralleling DC Bus 1 & Bus 2 using DC Bus Tie MCCB 125A for single-charger dual-bus operation.',
    steps: [
      {
        stepNumber: 1,
        objective: 'Verify Bus Tie Isolator MCB Tie A is CLOSED.',
        requiredAction: 'Close Bus Tie Isolator A.',
        expectedIndication: 'Isolator blade closed.',
        targetComponentKey: 'mcbTieA',
        isCompleted: (s) => s.mcbTieA,
        incorrectActionHint: 'Close MCB Tie A isolator switch first.',
      },
      {
        stepNumber: 2,
        objective: 'Close DC Bus Tie MCCB 125A.',
        requiredAction: 'Close DC Bus Tie MCCB 125A.',
        expectedIndication: 'Bus 1 & Bus 2 voltages equalize. Amber interlocked indicator activates.',
        targetComponentKey: 'mccbBusTie',
        isCompleted: (s) => s.mccbBusTie,
        incorrectActionHint: 'Close main Bus Tie MCCB to interconnect both DC buses.',
      },
    ],
  },
  {
    id: 'ac-blackout',
    title: '5. AC Blackout & Emergency Battery Backup',
    category: 'EMERGENCY',
    estimatedTime: '3 Mins',
    description: 'Respond to total substation utility blackout and manage battery discharge backup mode.',
    steps: [
      {
        stepNumber: 1,
        objective: 'Simulate AC Utility Blackout.',
        requiredAction: 'Trip AC Supply A to 0V.',
        expectedIndication: 'AC Voltmeter reads 0V. Undervoltage Relay 27 trips.',
        targetComponentKey: 'acIncomerA',
        isCompleted: (s) => !s.acSupplyAOnline,
        incorrectActionHint: 'Turn off AC Supply A incomer to simulate utility loss.',
      },
      {
        stepNumber: 2,
        objective: 'Verify Battery Bank 1 automatically supports DC Bus 1.',
        requiredAction: 'Confirm Battery 1 MCCB 160A is CLOSED.',
        expectedIndication: 'DC Bus 1 stays energized at 220V DC. Battery Ammeter shows -25A discharge.',
        targetComponentKey: 'mccbBattery1_160A',
        isCompleted: (s) => s.mccbBattery1_160A,
        incorrectActionHint: 'Ensure Battery 1 MCCB is closed to maintain unbroken DC power to protection relays.',
      },
    ],
  },
];

export const InteractiveSOPDrillManager: React.FC<InteractiveSOPDrillManagerProps> = ({
  state,
  readouts,
  onToggleBreaker,
  onSetTargetHighlight,
}) => {
  const [selectedDrillId, setSelectedDrillId] = useState<string | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [mistakesCount, setMistakesCount] = useState<number>(0);
  const [mistakeLogs, setMistakeLogs] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'SUCCESS' | 'ERROR' } | null>(null);

  const activeDrill = SOP_DRILLS.find((d) => d.id === selectedDrillId);
  const currentStep = activeDrill ? activeDrill.steps[currentStepIdx] : null;

  // HIGHLIGHT TARGET SLD COMPONENT
  useEffect(() => {
    if (currentStep && onSetTargetHighlight) {
      onSetTargetHighlight(currentStep.targetComponentKey);
    } else if (onSetTargetHighlight) {
      onSetTargetHighlight(undefined);
    }
  }, [currentStep, onSetTargetHighlight]);

  // LISTEN TO STATE MUTATIONS & VERIFY STEP COMPLETION
  useEffect(() => {
    if (!currentStep || isCompleted) return;

    if (currentStep.isCompleted(state)) {
      setFeedbackMsg({
        text: `✓ Step ${currentStep.stepNumber} Completed! ${currentStep.expectedIndication}`,
        type: 'SUCCESS',
      });

      if (currentStepIdx + 1 < activeDrill!.steps.length) {
        setTimeout(() => {
          setCurrentStepIdx((prev) => prev + 1);
          setFeedbackMsg(null);
        }, 1200);
      } else {
        setIsCompleted(true);
      }
    }
  }, [state, currentStep, currentStepIdx, activeDrill, isCompleted]);

  const handleStartDrill = (drillId: string) => {
    setSelectedDrillId(drillId);
    setCurrentStepIdx(0);
    setMistakesCount(0);
    setMistakeLogs([]);
    setIsCompleted(false);
    setFeedbackMsg(null);
  };

  const handleResetDrill = () => {
    setCurrentStepIdx(0);
    setMistakesCount(0);
    setMistakeLogs([]);
    setIsCompleted(false);
    setFeedbackMsg(null);
  };

  const score = Math.max(0, 100 - mistakesCount * 10);

  return (
    <div className="flex flex-col gap-4 font-mono text-xs text-slate-100 select-none">
      
      {/* DRILL MANAGER HEADER */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-950 border border-blue-500/50 rounded-xl text-blue-400">
            <BookOpen className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white tracking-wider flex items-center gap-2">
              INTERACTIVE SOP TRAINING DRILLS
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Step-by-Step Substation Operating Procedures with SLD Canvas Component Highlighting
            </p>
          </div>
        </div>

        {selectedDrillId && (
          <button
            onClick={() => setSelectedDrillId(null)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
          >
            ← Select Another SOP
          </button>
        )}
      </div>

      {/* DRILL SELECTOR BUTTONS GRID (CLEAN ZERO-OVERFLOW UI) */}
      {!selectedDrillId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SOP_DRILLS.map((drill) => (
            <button
              key={drill.id}
              onClick={() => handleStartDrill(drill.id)}
              className="p-4 rounded-xl bg-[#0d1424] hover:bg-[#161f32] border border-[#1e293b] hover:border-blue-500 text-left transition-all cursor-pointer shadow-md flex flex-col justify-between gap-3 group"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                  {drill.category}
                </span>
                <span className="text-[10px] text-slate-400 font-sans">{drill.estimatedTime}</span>
              </div>

              <div>
                <h4 className="font-bold text-xs text-white group-hover:text-blue-400 transition-colors">
                  {drill.title}
                </h4>
                <p className="text-[11px] text-slate-400 font-sans mt-1 line-clamp-2 leading-relaxed">
                  {drill.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-blue-400 font-bold">
                <span>{drill.steps.length} Steps Exercise</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Start Drill <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ACTIVE SOP DRILL INTERACTIVE STEP CARD */}
      {selectedDrillId && activeDrill && !isCompleted && currentStep && (
        <div className="bg-[#0d1424] border border-blue-500/60 rounded-xl p-5 shadow-2xl flex flex-col gap-4">
          
          {/* STEP HEADER BAR */}
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                {activeDrill.title}
              </span>
              <h4 className="text-sm font-extrabold text-white">
                STEP {currentStep.stepNumber} OF {activeDrill.steps.length}
              </h4>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-950 border border-emerald-500/50 text-emerald-300">
                SCORE: {score}%
              </span>

              <button
                onClick={handleResetDrill}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Restart Drill"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* FEEDBACK NOTIFICATION BANNER */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-sans animate-fade-in ${
                feedbackMsg.type === 'SUCCESS'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-500 text-rose-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* STEP CONTENT DETAIL CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-sans text-xs">
            <div className="bg-[#070b14] p-3.5 rounded-xl border border-slate-800 flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-sky-400 font-mono uppercase tracking-wider flex items-center gap-1">
                🎯 OBJECTIVE
              </span>
              <p className="text-slate-200 leading-relaxed">{currentStep.objective}</p>
            </div>

            <div className="bg-[#070b14] p-3.5 rounded-xl border border-amber-500/40 flex flex-col gap-1.5 shadow-md">
              <span className="font-bold text-[10px] text-amber-400 font-mono uppercase tracking-wider flex items-center gap-1">
                ⚡ REQUIRED ACTION (SLD HIGHLIGHTED)
              </span>
              <p className="text-amber-200 font-bold leading-relaxed">{currentStep.requiredAction}</p>
            </div>

            <div className="bg-[#070b14] p-3.5 rounded-xl border border-emerald-500/40 flex flex-col gap-1.5">
              <span className="font-bold text-[10px] text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1">
                👁️ EXPECTED INDICATION
              </span>
              <p className="text-slate-200 leading-relaxed">{currentStep.expectedIndication}</p>
            </div>
          </div>

          {/* SLD HIGHLIGHT GUIDANCE BANNER */}
          <div className="bg-[#070b14] p-3 rounded-xl border border-blue-500/30 flex items-center justify-between text-xs text-blue-300 font-mono">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              Target SLD Component: <strong>[{currentStep.targetComponentKey}]</strong> is flashing on the SLD canvas.
            </span>
            <span className="text-[10px] text-slate-400">Operate component directly on SLD to advance step.</span>
          </div>

        </div>
      )}

      {/* COMPLETED DRILL SCORE & SUMMARY REPORT CARD */}
      {isCompleted && activeDrill && (
        <div className="bg-[#0d1424] border-2 border-emerald-500 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-950 border border-emerald-500/50 rounded-xl text-emerald-400 text-xl">
                🏆
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">SOP DRILL COMPLETED SUCCESSFULLY</h3>
                <p className="text-xs text-slate-400 font-sans">{activeDrill.title}</p>
              </div>
            </div>

            <span className="text-lg font-black px-4 py-1.5 rounded-xl bg-emerald-950 border border-emerald-400 text-emerald-300">
              FINAL SCORE: {score}%
            </span>
          </div>

          <div className="bg-[#070b14] p-4 rounded-xl border border-slate-800 flex flex-col gap-3 font-sans">
            <span className="font-bold text-slate-200 text-xs font-mono">SUBSTATION OPERATOR EVALUATION REPORT:</span>
            <p className="text-slate-300 leading-relaxed">
              {score >= 90
                ? 'EXCELLENT PERFORMANCE! You completed the substation operating procedure in exact accordance with IEEE 946 / IEC 62485 safety standards.'
                : 'SATISFACTORY COMPLETION. Review interlock rules to prevent unnecessary breaker operations during live switching.'}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleResetDrill}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
            >
              Restart Drill
            </button>
            <button
              onClick={() => setSelectedDrillId(null)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer shadow-md"
            >
              Select Another SOP
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
