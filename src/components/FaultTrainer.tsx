import React, { useState, useEffect } from 'react';
import { SoftStarterParams, SoftStarterFaults } from '../types/softStarter';
import { Target, Trophy, Clock, CheckCircle2, XCircle, Wrench, RefreshCw, AlertTriangle, Zap, ShieldAlert, Sparkles, HelpCircle, X } from 'lucide-react';

export interface FaultCase {
  id: string;
  title: string;
  category: string;
  symptom: string;
  correctAnswerId: string;
  options: { id: string; label: string }[];
  evidence: string;
  physicsExplanation: string;
  applyFault: (
    setParams: React.Dispatch<React.SetStateAction<SoftStarterParams>>,
    setFaults: React.Dispatch<React.SetStateAction<SoftStarterFaults>>,
    onStart: () => void
  ) => void;
  applyFix: (
    setParams: React.Dispatch<React.SetStateAction<SoftStarterParams>>,
    setFaults: React.Dispatch<React.SetStateAction<SoftStarterFaults>>,
    onStart: () => void
  ) => void;
}

export const FAULT_CASES: FaultCase[] = [
  {
    id: 'breakaway-voltage-low',
    title: 'Case #1: Motor Hums at 0 RPM',
    category: 'Voltage Ramp & Breakaway',
    symptom: 'Motor hums loudly upon START, remains stuck at 0 RPM, and draws high current (340A) without accelerating.',
    correctAnswerId: 'opt-vstart-low',
    options: [
      { id: 'opt-vstart-low', label: 'V_start set below breakaway torque requirement (Te ∝ V² < Tstiction).' },
      { id: 'opt-phase-loss', label: 'Loss of phase B incoming power line.' },
      { id: 'opt-bearing-seizure', label: 'Mechanical bearing seizure in pump impeller.' },
      { id: 'opt-freq-sag', label: 'Supply grid frequency sag below 45 Hz.' },
    ],
    evidence: 'Te readout = 9% rated torque at V_start = 30%. Static breakaway torque demand = 16%.',
    physicsExplanation: 'Electromagnetic torque scales as (V/100)². At 30% voltage, motor produces only 0.30² = 9% torque, which is insufficient to overcome static friction stiction.',
    applyFault: (setParams, setFaults, onStart) => {
      setParams((prev) => ({ ...prev, initialVoltagePct: 20, startMode: 'VOLTAGE_RAMP' }));
      onStart();
    },
    applyFix: (setParams, setFaults, onStart) => {
      setParams((prev) => ({ ...prev, initialVoltagePct: 45 }));
      onStart();
    },
  },
  {
    id: 'current-limit-too-low',
    title: 'Case #2: Stall & Trip at 60% Speed',
    category: 'Current Limit & Stall',
    symptom: 'Motor accelerates smoothly up to ~60% speed (880 RPM), then speed stops rising and motor trips on Class 10 overload.',
    correctAnswerId: 'opt-ilimit-low',
    options: [
      { id: 'opt-ilimit-low', label: 'Current limit I_limit set too low for load torque demand (Te < Tl at 60% speed).' },
      { id: 'opt-scr-short', label: 'Shorted SCR thyristor junction failure.' },
      { id: 'opt-ramp-long', label: 'Ramp time setting is excessively long.' },
      { id: 'opt-grid-impedance', label: 'Utility supply grid impedance too high.' },
    ],
    evidence: 'Current clamped at 180% FLA. Developed motor torque Te = 45% = Load demand Tl at 60% N. Acceleration dω/dt = 0.',
    physicsExplanation: 'Clamping current to 180% FLA limits motor torque. If developed torque equals load demand before reaching rated speed, motor stalls and accumulates thermal capacity.',
    applyFault: (setParams, setFaults, onStart) => {
      setParams((prev) => ({ ...prev, currentLimitPct: 180, loadType: 'CONVEYOR', startMode: 'CURRENT_LIMIT' }));
      onStart();
    },
    applyFix: (setParams, setFaults, onStart) => {
      setParams((prev) => ({ ...prev, currentLimitPct: 300 }));
      onStart();
    },
  },
  {
    id: 'fan-ramp-shorter-than-accel',
    title: 'Case #3: High-Inertia Fan Thermal Trip',
    category: 'Inertia & Ramp Coordination',
    symptom: 'Industrial ID Fan voltage ramp completes to 100% fine, but motor trips on thermal overload during prolonged acceleration.',
    correctAnswerId: 'opt-inertia-mismatch',
    options: [
      { id: 'opt-inertia-mismatch', label: 'High-inertia fan load (J) requires more acceleration time than set voltage ramp time (tRamp < tAccel).' },
      { id: 'opt-contactor-bounce', label: 'AC-3 bypass contactor contact bounce.' },
      { id: 'opt-overvoltage', label: 'Supply bus transient overvoltage sag.' },
      { id: 'opt-insulation', label: 'Motor winding insulation breakdown.' },
    ],
    evidence: 'Voltage ramp time = 8s. Actual fan acceleration time = 24s. Motor current remained near 350% FLA for 20s.',
    physicsExplanation: 'Controller voltage ramp time is NOT motor acceleration time! Mechanical acceleration dω/dt = (Te - Tl)/J depends heavily on rotor inertia J.',
    applyFault: (setParams, setFaults, onStart) => {
      setParams((prev) => ({ ...prev, rampTimeSec: 8, loadType: 'COMPRESSOR', currentLimitPct: 300 }));
      onStart();
    },
    applyFix: (setParams, setFaults, onStart) => {
      setParams((prev) => ({ ...prev, rampTimeSec: 25, currentLimitPct: 350 }));
      onStart();
    },
  },
  {
    id: 'relay50-nuisance-trip',
    title: 'Case #4: Instantaneous Trip at Start',
    category: 'Protection Coordination',
    symptom: 'Motor trips instantaneously (TRIP-50) the exact millisecond the START button is pressed.',
    correctAnswerId: 'opt-relay50-low',
    options: [
      { id: 'opt-relay50-low', label: 'Protection Relay 50 instantaneous pickup set below motor starting inrush current.' },
      { id: 'opt-overfreq', label: 'Utility grid overfrequency fault.' },
      { id: 'opt-ground-leak', label: 'Ground fault current leak in motor terminal box.' },
      { id: 'opt-thermal-lockout', label: 'Thermal memory lockout active.' },
    ],
    evidence: 'Relay 50 pickup set to 250% FLA. Starting current peak = 350% FLA.',
    physicsExplanation: 'Instantaneous overcurrent relay 50 must be coordinated above max expected soft start current limit to prevent nuisance tripping during motor start.',
    applyFault: (setParams, setFaults, onStart) => {
      setParams((prev) => ({ ...prev, currentLimitPct: 350 }));
      setFaults((prev) => ({ ...prev, overcurrent: true }));
      onStart();
    },
    applyFix: (setParams, setFaults, onStart) => {
      setParams((prev) => ({ ...prev, currentLimitPct: 300 }));
      setFaults((prev) => ({ ...prev, overcurrent: false }));
      onStart();
    },
  },
  {
    id: 'water-hammer-zero-stop',
    title: 'Case #5: Hydraulic Water Hammer Banging',
    category: 'Soft Stop & Fluid Dynamics',
    symptom: 'Pump discharge pipe bangs violently on STOP, triggering a high pressure surge alarm (>100m H₂O).',
    correctAnswerId: 'opt-tstop-zero',
    options: [
      { id: 'opt-tstop-zero', label: 'Soft stop ramp time t_stop = 0s (abrupt coast stop causing Joukowsky water hammer).' },
      { id: 'opt-cavitation', label: 'Pump impeller blade cavitation erosion.' },
      { id: 'opt-suction-closed', label: 'Pump suction valve closed.' },
      { id: 'opt-imbalance', label: 'Motor 3-phase current imbalance.' },
    ],
    evidence: 'Surge Head ΔH = +92m H₂O peak on stop. Soft stop time t_stop = 0.0s.',
    physicsExplanation: 'Abrupt fluid velocity change Δv creates Joukowsky pressure surge ΔH = (c·Δv)/g. Gradual soft stop (15–20s) eliminates hydraulic shock.',
    applyFault: (setParams, setFaults, onStart) => {
      setParams((prev) => ({ ...prev, softStopTimeSec: 0, loadType: 'CENTRIFUGAL_PUMP' }));
      onStart();
    },
    applyFix: (setParams, setFaults, onStart) => {
      setParams((prev) => ({ ...prev, softStopTimeSec: 20 }));
      onStart();
    },
  },
  {
    id: 'weak-grid-voltage-dip',
    title: 'Case #6: Plant Lighting Flicker & Sag',
    category: 'Power Quality & Grid Sag',
    symptom: 'Plant facility lighting sags and flickers severely whenever the 160kW motor starts.',
    correctAnswerId: 'opt-weak-grid',
    options: [
      { id: 'opt-weak-grid', label: 'Low short-circuit capacity (Isc = 6× FLA weak grid) with current limit set too high.' },
      { id: 'opt-triplen', label: 'High neutral conductor triplen harmonic current.' },
      { id: 'opt-phase-unbalance', label: 'Unbalanced incoming utility phase voltages.' },
      { id: 'opt-transformer-sat', label: 'Transformer core magnetic saturation.' },
    ],
    evidence: 'Bus voltage sag = 18.5% dip. Utility short-circuit ratio Isc/FLA = 6.0.',
    physicsExplanation: 'Voltage dip % = (I_start / I_sc) * 100%. Capping current limit on weak generator grids prevents severe voltage sags.',
    applyFault: (setParams, setFaults, onStart) => {
      setParams((prev) => ({ ...prev, currentLimitPct: 450 }));
      onStart();
    },
    applyFix: (setParams, setFaults, onStart) => {
      setParams((prev) => ({ ...prev, currentLimitPct: 250 }));
      onStart();
    },
  },
  {
    id: 'km1-bypass-failed',
    title: 'Case #7: SCR Overheat During Running',
    category: 'Bypass Contactor Failure',
    symptom: 'SCR heatsink temperature alarm triggers after 5 minutes of steady-state running while motor current is normal.',
    correctAnswerId: 'opt-km1-open',
    options: [
      { id: 'opt-km1-open', label: 'Bypass contactor KM1 failed to close at top of ramp, forcing continuous SCR conduction losses (~2 kW).' },
      { id: 'opt-room-temp', label: 'High ambient electrical room temperature.' },
      { id: 'opt-overload-shaft', label: 'Overloaded motor shaft.' },
      { id: 'opt-bearing-fail', label: 'Motor drive end bearing breakdown.' },
    ],
    evidence: 'Motor speed = 1480 RPM (100% N), KM1 Bypass = OPEN, SCR Heat Loss = 2160 W.',
    physicsExplanation: 'SCR forward voltage drop (~1.2V per SCR) dissipates heat continuously if bypass contactor KM1 fails to close at full speed.',
    applyFault: (setParams, setFaults, onStart) => {
      setParams((prev) => ({ ...prev, loadType: 'CENTRIFUGAL_PUMP' }));
      setFaults((prev) => ({ ...prev, startTimeout: true }));
      onStart();
    },
    applyFix: (setParams, setFaults, onStart) => {
      setParams((prev) => ({ ...prev, loadType: 'CENTRIFUGAL_PUMP' }));
      setFaults((prev) => ({ ...prev, startTimeout: false }));
      onStart();
    },
  },
];

interface FaultTrainerProps {
  isOpen: boolean;
  onClose: () => void;
  setParams: React.Dispatch<React.SetStateAction<SoftStarterParams>>;
  setFaults: React.Dispatch<React.SetStateAction<SoftStarterFaults>>;
  onStartDemo: () => void;
}

export const FaultTrainer: React.FC<FaultTrainerProps> = ({
  isOpen,
  onClose,
  setParams,
  setFaults,
  onStartDemo,
}) => {
  const [currentCaseIndex, setCurrentCaseIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Gamification Stats
  const [score, setScore] = useState<number>(0);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [correctAttempts, setCorrectAttempts] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);

  // Timed Mode State
  const [isTimedMode, setIsTimedMode] = useState<boolean>(false);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(60);

  const activeCase = FAULT_CASES[currentCaseIndex] || FAULT_CASES[0];

  // Timer Effect
  useEffect(() => {
    if (!isOpen || !isTimedMode || timeLeftSec <= 0) return;
    const timer = setInterval(() => {
      setTimeLeftSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isTimedMode, timeLeftSec]);

  // Launch New Random Fault
  const handleNewFault = () => {
    let nextIndex = Math.floor(Math.random() * FAULT_CASES.length);
    if (nextIndex === currentCaseIndex) {
      nextIndex = (currentCaseIndex + 1) % FAULT_CASES.length;
    }
    setCurrentCaseIndex(nextIndex);
    setSelectedOptionId(null);
    setIsAnswerSubmitted(false);
    setIsCorrect(null);

    const nextCase = FAULT_CASES[nextIndex];
    nextCase.applyFault(setParams, setFaults, onStartDemo);
  };

  // Submit Answer
  const handleSubmitAnswer = () => {
    if (!selectedOptionId || isAnswerSubmitted) return;

    const correct = selectedOptionId === activeCase.correctAnswerId;
    setIsAnswerSubmitted(true);
    setIsCorrect(correct);
    setTotalAttempts((prev) => prev + 1);

    if (correct) {
      setCorrectAttempts((prev) => prev + 1);
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setScore((prev) => prev + 100 + newStreak * 25);
    } else {
      setCurrentStreak(0);
    }
  };

  // Auto-Fix & Test Run
  const handleAutoFix = () => {
    activeCase.applyFix(setParams, setFaults, onStartDemo);
  };

  if (!isOpen) return null;

  const accuracyPct = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-mono select-none">
      <div className="bg-[#0d1117] border border-cyan-500/40 rounded-2xl max-w-3xl w-full p-5 shadow-[0_10px_40px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.3)] space-y-4 text-xs">
        
        {/* Header Bar & Scoreboard */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#21262d] pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>🎯 FAULT TRAINER: CHALLENGE MODE</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-extrabold">
                  {activeCase.category}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Observe motor symptoms, diagnose root causes & verify fixes.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-white transition-colors p-1 self-end sm:self-auto"
            title="Exit Challenge Mode"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score & Timed Mode Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#161b22] border border-[#30363d] p-3 rounded-xl text-center">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">SCORE</span>
            <span className="text-base font-extrabold text-cyan-400">{score} PTS</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">ACCURACY</span>
            <span className="text-base font-extrabold text-emerald-400">{accuracyPct}%</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">STREAK</span>
            <span className="text-base font-extrabold text-amber-400">{currentStreak} 🔥</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">BEST STREAK</span>
            <span className="text-base font-extrabold text-purple-400">{bestStreak} 🏆</span>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5">
            <button
              onClick={() => {
                setIsTimedMode(!isTimedMode);
                setTimeLeftSec(60);
              }}
              className={`w-full py-1.5 px-2 rounded-lg border font-bold text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                isTimedMode
                  ? 'bg-red-500/20 border-red-400 text-red-300 shadow-[0_0_10px_#ef4444]'
                  : 'bg-[#0d1117] border-[#30363d] text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isTimedMode ? `${timeLeftSec}s Left` : 'Timed 60s'}</span>
            </button>
          </div>
        </div>

        {/* Live Symptom Log Box */}
        <div className="bg-[#161b22] border border-amber-500/40 rounded-xl p-3.5 space-y-1.5 shadow-md">
          <div className="flex items-center justify-between text-amber-400 font-bold text-[11px]">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>LIVE OBSERVED SYMPTOM REPORT</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">Active Challenge #{currentCaseIndex + 1}</span>
          </div>
          <p className="text-sm font-bold text-white leading-relaxed font-sans">
            {activeCase.symptom}
          </p>
        </div>

        {/* Multiple Choice Diagnostic Options */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Select Diagnostic Root Cause:</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {activeCase.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              let borderStyle = 'border-[#30363d] bg-[#161b22] hover:border-cyan-400';

              if (isAnswerSubmitted) {
                if (opt.id === activeCase.correctAnswerId) {
                  borderStyle = 'border-emerald-400 bg-emerald-950/60 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.4)]';
                } else if (isSelected) {
                  borderStyle = 'border-red-500 bg-red-950/60 text-red-300 font-bold shadow-[0_0_12px_rgba(239,68,68,0.4)]';
                } else {
                  borderStyle = 'border-[#30363d] bg-[#161b22] opacity-50';
                }
              } else if (isSelected) {
                borderStyle = 'border-cyan-400 bg-cyan-950/50 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]';
              }

              return (
                <button
                  key={opt.id}
                  disabled={isAnswerSubmitted}
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`p-3 rounded-xl border text-left font-sans text-xs transition-all cursor-pointer flex items-center justify-between gap-3 ${borderStyle}`}
                >
                  <span>{opt.label}</span>
                  {isAnswerSubmitted && opt.id === activeCase.correctAnswerId && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  {isAnswerSubmitted && isSelected && opt.id !== activeCase.correctAnswerId && (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Answer Submission / Evidence Results Box */}
        {isAnswerSubmitted ? (
          <div className="space-y-3 pt-2 border-t border-[#21262d]">
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              isCorrect ? 'bg-emerald-950/60 border-emerald-400 text-emerald-300' : 'bg-red-950/60 border-red-500 text-red-300'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm font-sans">
                {isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                <span>{isCorrect ? 'Correct Diagnosis! (+100 PTS)' : 'Incorrect Diagnosis!'}</span>
              </div>

              <button
                onClick={handleAutoFix}
                className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs shadow-[0_0_12px_rgba(6,182,212,0.5)] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Auto-Fix &amp; Test Run</span>
              </button>
            </div>

            {/* Evidence & Physics Explanation Box */}
            <div className="bg-[#161b22] border border-cyan-500/30 p-3.5 rounded-xl space-y-1.5 text-xs font-sans">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>CHART EVIDENCE &amp; PHYSICS EXPLANATION:</span>
              </div>
              <div className="text-amber-300 font-mono text-[11px] bg-[#0d1117] p-2 rounded border border-[#30363d]">
                {activeCase.evidence}
              </div>
              <p className="text-slate-300 leading-relaxed pt-1">
                {activeCase.physicsExplanation}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-end pt-2 border-t border-[#21262d]">
            <button
              disabled={!selectedOptionId}
              onClick={handleSubmitAnswer}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
                selectedOptionId
                  ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)] active:scale-95'
                  : 'bg-[#161b22] border border-[#30363d] text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>Submit Diagnosis</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Footer Navigation Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-[#21262d]">
          <button
            onClick={handleNewFault}
            className="px-4 py-2 rounded-xl border border-[#30363d] bg-[#161b22] hover:border-cyan-400 text-xs font-bold text-cyan-400 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>New Fault Challenge 🎲</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            Close Trainer
          </button>
        </div>

      </div>
    </div>
  );
};

export default FaultTrainer;
