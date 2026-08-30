import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Battery,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Award,
  Flame,
  ArrowRight,
  RotateCcw,
  Sun,
  Tv,
  Car,
  Radio,
} from 'lucide-react';

interface ScenarioPreset {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  standards: string;
  description: string;
  topology: string;
  Vin: number;
  duty: number;
  fsw: number;
  inductanceuH: number;
  capacitanceuF: number;
  loadR: number;
  highlightText: string;
}

interface FaultQuizQuestion {
  id: string;
  symptom: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  scopeEvidence: string;
  faultKey: string;
}

interface DCDCScenarioAndFaultTrainerProps {
  setTopology: (top: string) => void;
  setVin: (v: number) => void;
  setDuty: (d: number) => void;
  setFsw: (f: number) => void;
  setInductanceuH: (l: number) => void;
  setCapacitanceuF: (c: number) => void;
  setLoadR: (r: number) => void;
  setActiveFault: (fault: string | null) => void;
}

export const DCDCScenarioAndFaultTrainer: React.FC<DCDCScenarioAndFaultTrainerProps> = ({
  setTopology,
  setVin,
  setDuty,
  setFsw,
  setInductanceuH,
  setCapacitanceuF,
  setLoadR,
  setActiveFault,
}) => {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'faultTrainer'>('scenarios');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  // Fault Quiz State
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // 1. ONE-CLICK INDUSTRIAL SCENARIO PRESETS
  const SCENARIOS: ScenarioPreset[] = [
    {
      id: 'battery-charger',
      name: 'Station Battery Charger',
      category: 'IEEE 946 Compliance',
      icon: <Battery className="w-4 h-4 text-emerald-400" />,
      standards: 'IEEE 946 / IEC 62040-3',
      description: '48V DC station battery bus supplying float (54V) & equalize (58V) charging modes.',
      topology: 'buck',
      Vin: 110,
      duty: 48,
      fsw: 50000,
      inductanceuH: 250,
      capacitanceuF: 1000,
      loadR: 8,
      highlightText: 'Float 54V → Equalize 58V DC transition response.',
    },
    {
      id: 'ups-dc-bus',
      name: 'UPS DC Bus Ride-Through',
      category: 'IEC 62040-3 Standard',
      icon: <Tv className="w-4 h-4 text-cyan-400" />,
      standards: 'IEC 62040-3 Class 1',
      description: 'Simulates input AC outage event with bulk capacitor hold-up ride-through.',
      topology: 'buck',
      Vin: 48,
      duty: 40,
      fsw: 100000,
      inductanceuH: 180,
      capacitanceuF: 1500,
      loadR: 10,
      highlightText: 'Holdup capacitor keeps Vout strictly within ±1% limits.',
    },
    {
      id: 'telecom-power',
      name: 'Telecom 48V → 12V High Power',
      category: 'High Current 80A',
      icon: <Radio className="w-4 h-4 text-purple-400" />,
      standards: 'ETSI EN 300 132',
      description: 'High-density 48V to 12V step-down for 5G cellular base station equipment.',
      topology: 'buck',
      Vin: 48,
      duty: 25,
      fsw: 150000,
      inductanceuH: 50,
      capacitanceuF: 2000,
      loadR: 2,
      highlightText: 'SiC MOSFET synchronous rectification yields η > 95%.',
    },
    {
      id: 'ev-auxiliary',
      name: 'EV Aux 400V → 12V Step-Down',
      category: 'Automotive ISO 26262',
      icon: <Car className="w-4 h-4 text-rose-400" />,
      standards: 'ISO 26262 ASIL-D',
      description: '400V traction battery down to 12V auxiliary system (extreme low duty D ≈ 3%).',
      topology: 'buck',
      Vin: 400,
      duty: 3,
      fsw: 200000,
      inductanceuH: 500,
      capacitanceuF: 470,
      loadR: 50,
      highlightText: 'Low duty cycle D=3% risks DCM mode at light loads.',
    },
    {
      id: 'pv-boost',
      name: 'PV Solar Boost MPPT',
      category: 'Renewables IEC 61727',
      icon: <Sun className="w-4 h-4 text-amber-400" />,
      standards: 'IEC 61727 MPPT',
      description: 'Boost topology stepping 48V solar array up to 120V DC grid bus.',
      topology: 'boost',
      Vin: 48,
      duty: 60,
      fsw: 60000,
      inductanceuH: 300,
      capacitanceuF: 800,
      loadR: 15,
      highlightText: 'MPPT duty sweep dynamically maximizes power harvest.',
    },
  ];

  // 2. FAULT TRAINER QUIZ QUESTIONS
  const QUIZ_QUESTIONS: FaultQuizQuestion[] = [
    {
      id: 'q1-esr',
      symptom: 'Symptom: Output voltage ripple ΔVout slowly grows over 6 months from 15mV to 180mV while switching frequency is constant.',
      options: [
        'A) MOSFET Gate Driver Overheating',
        'B) Output Filter Capacitor ESR Degradation / Aging',
        'C) Inductor Core Winding Short',
        'D) Input Voltage Surge',
      ],
      correctAnswer: 1,
      explanation: 'Aluminum electrolytic filter capacitors undergo electrolyte drying over time, increasing ESR (Equivalent Series Resistance). Since ΔVout = ΔIL/(8fC) + ΔIL·ESR, higher ESR directly increases output voltage ripple!',
      scopeEvidence: 'CH4 Vout scope shows high-frequency spikes riding on output DC.',
      faultKey: 'C_ESR_HIGH',
    },
    {
      id: 'q2-saturation',
      symptom: 'Symptom: Inductor current IL sawtooth spikes non-linearly near peak Ton, causing high audible choke whine and MOSFET overcurrent trips.',
      options: [
        'A) Inductor Magnetic Core Saturation',
        'B) Freewheel Diode Reverse Recovery Failure',
        'C) Feedback Loop Compensation Lag',
        'D) Low Duty Cycle Operation',
      ],
      correctAnswer: 0,
      explanation: 'When peak current exceeds core saturation threshold (B > Bsat), permeability µ drop causes inductance L to collapse rapidly (L → L/2), making di/dt = V/L shoot up exponentially!',
      scopeEvidence: 'CH3 IL scope displays upward exponential current spiking at peak.',
      faultKey: 'L_SAT',
    },
    {
      id: 'q3-gate-driver',
      symptom: 'Symptom: Output voltage drops to 0V instantly, gate signal remains flat 0V, input current drops to standby zero.',
      options: [
        'A) Capacitor Short Circuit',
        'B) MOSFET Gate Driver / Switch Open Circuit Failure',
        'C) High Load Current Demand',
        'D) DCM Boundary Transition',
      ],
      correctAnswer: 1,
      explanation: 'A gate driver IC failure or open MOSFET gate prevents S1 from turning ON, cutting off power transfer completely.',
      scopeEvidence: 'CH1 Gate PWM scope line is flat 0V; CH2 Vsw is 0V.',
      faultKey: 'S1_OPEN',
    },
    {
      id: 'q4-diode-short',
      symptom: 'Symptom: Input breaker 52-Q1 trips instantly on closure, freewheel diode heats up rapidly, 0V output.',
      options: [
        'A) Open Feedback Resistor',
        'B) Shorted Freewheel Diode (D1 Short)',
        'C) High Inductance Value',
        'D) Low Switching Frequency',
      ],
      correctAnswer: 1,
      explanation: 'A shorted freewheel diode creates a direct short-circuit path between Vin and GND whenever S1 turns ON, causing massive shoot-through current that trips upstream protection breakers!',
      scopeEvidence: 'CH2 Vsw is shorted to 0V; trip fault alarm triggered.',
      faultKey: 'S1_SHORT',
    },
    {
      id: 'q5-open-loop',
      symptom: 'Symptom: Output voltage runs away uncontrollably to 80V+, triggering Over-Voltage Protection (OVP) trip.',
      options: [
        'A) Feedback Loop Sense Resistor Open Circuit',
        'B) Capacitor ESR Decrease',
        'C) Light Load Operation',
        'D) High Switching Frequency',
      ],
      correctAnswer: 0,
      explanation: 'An open feedback voltage divider prevents the PWM controller from sensing Vout. The controller assumes 0V and ramps Duty D to 90% max, sending Vout into runaway OVP trip!',
      scopeEvidence: 'CH1 Duty PWM goes to 90% max; Vout spikes above limits.',
      faultKey: 'S1_SHORT',
    },
    {
      id: 'q6-dcm-instability',
      symptom: 'Symptom: Converter displays low-frequency output oscillation when load demand drops to 5% light load.',
      options: [
        'A) High Temperature Shutdown',
        'B) DCM Mode Control Loop Compensation Instability',
        'C) Battery Internal Resistance',
        'D) Soft Start Timeout',
      ],
      correctAnswer: 1,
      explanation: 'In DCM mode, the converter transfer function gain changes from 1st-order to non-linear 2nd-order. Without DCM feedforward compensation, control loops suffer phase margin loss and oscillate!',
      scopeEvidence: 'CH3 IL touches 0A; CH4 Vout displays low-frequency envelope ripple.',
      faultKey: 'L_SAT',
    },
  ];

  const handleApplyScenario = (sc: ScenarioPreset) => {
    setSelectedScenarioId(sc.id);
    setTopology(sc.topology);
    setVin(sc.Vin);
    setDuty(sc.duty);
    setFsw(sc.fsw);
    setInductanceuH(sc.inductanceuH);
    setCapacitanceuF(sc.capacitanceuF);
    setLoadR(sc.loadR);
    setActiveFault(null);
  };

  const handleAnswerQuestion = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const q = QUIZ_QUESTIONS[currentQuizIndex];
    if (index === q.correctAnswer) {
      const newScore = score + 100 + streak * 20;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setActiveFault(q.faultKey);
    } else {
      setStreak(0);
    }
  };

  const handleNextQuestion = () => {
    setIsAnswered(false);
    setSelectedOption(null);
    setActiveFault(null);
    setCurrentQuizIndex((prev) => (prev + 1) % QUIZ_QUESTIONS.length);
  };

  const currentQ = QUIZ_QUESTIONS[currentQuizIndex];

  return (
    <div className="w-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-3.5 shadow-2xl flex flex-col gap-3 font-mono text-xs select-none">
      {/* HEADER & TAB SWITCHER */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="font-extrabold text-white text-xs sm:text-sm tracking-wide">
            ONE-CLICK SCENARIO CARDS &amp; FAULT TRAINER QUIZ
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0b1220] border border-[#1e293b] rounded-xl p-1">
          <button
            type="button"
            onClick={() => setActiveTab('scenarios')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'scenarios'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Scenario Cards (5)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('faultTrainer')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'faultTrainer'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎯 Fault Quiz Trainer
          </button>
        </div>
      </div>

      {/* TAB 1: ONE-CLICK INDUSTRIAL SCENARIO CARDS */}
      {activeTab === 'scenarios' && (
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {SCENARIOS.map((sc) => {
              const isSelected = selectedScenarioId === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleApplyScenario(sc)}
                  className={`p-3 rounded-xl border-2 text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/80 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-[1.02]'
                      : 'bg-[#030712] border-[#1e293b] hover:border-slate-600 hover:bg-[#0b1220]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-black text-white text-xs">
                      {sc.icon}
                      {sc.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-cyan-300 border border-blue-800 font-bold">
                      {sc.category}
                    </span>
                  </div>

                  <p className="text-slate-300 text-[11px] font-sans leading-tight">
                    {sc.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-[#1e293b] text-[10px] font-bold">
                    <span className="text-emerald-400">
                      Vin={sc.Vin}V • D={sc.duty}% • f={(sc.fsw / 1000).toFixed(0)}kHz
                    </span>
                    <span className="text-amber-300 flex items-center gap-0.5">
                      Apply Scenario <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: FAULT TRAINER QUIZ */}
      {activeTab === 'faultTrainer' && (
        <div className="flex flex-col gap-3">
          {/* SCORE & STREAK TRACKER */}
          <div className="flex items-center justify-between p-2.5 bg-[#030712] border-2 border-rose-950 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-white text-xs flex items-center gap-1">
                <Award className="w-4 h-4 text-amber-400" />
                Score: <span className="text-amber-400 text-sm font-black">{score} pts</span>
              </span>
              <span className="font-extrabold text-slate-300 text-xs flex items-center gap-1">
                <Flame className="w-4 h-4 text-rose-500 animate-bounce" />
                Streak: <span className="text-rose-400 text-sm font-black">{streak} 🔥</span>
              </span>
            </div>

            <span className="text-[10px] text-slate-400 font-bold">
              Question {currentQuizIndex + 1} of {QUIZ_QUESTIONS.length}
            </span>
          </div>

          {/* QUIZ CARD */}
          <div className="p-3.5 bg-[#030712] border-2 border-[#1e293b] rounded-xl flex flex-col gap-3">
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-200 font-sans text-xs leading-relaxed font-bold">
              <ShieldAlert className="w-4 h-4 text-rose-400 inline mr-1.5" />
              {currentQ.symptom}
            </div>

            {/* OPTIONS GRID */}
            <div className="flex flex-col gap-2">
              {currentQ.options.map((opt, idx) => {
                let btnStyle = 'bg-[#0b1220] border-[#1e293b] text-slate-200 hover:border-slate-500';

                if (isAnswered) {
                  if (idx === currentQ.correctAnswer) {
                    btnStyle = 'bg-emerald-950 border-emerald-500 text-emerald-200 font-bold';
                  } else if (selectedOption === idx) {
                    btnStyle = 'bg-rose-950 border-rose-500 text-rose-200';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAnswerQuestion(idx)}
                    disabled={isAnswered}
                    className={`w-full p-2.5 rounded-xl border text-left font-mono text-xs transition-all cursor-pointer flex items-center justify-between min-h-[40px] ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {isAnswered && idx === currentQ.correctAnswer && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {isAnswered && selectedOption === idx && idx !== currentQ.correctAnswer && (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* EXPLANATION & SCOPE EVIDENCE REVEAL */}
            {isAnswered && (
              <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-700 flex flex-col gap-1.5 text-xs">
                <span className="text-cyan-300 font-extrabold flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  Engineering Analysis &amp; Scope Evidence:
                </span>
                <p className="text-slate-200 font-sans text-xs leading-relaxed">
                  {currentQ.explanation}
                </p>
                <span className="text-amber-300 font-mono text-[11px] font-bold">
                  🔍 Scope Evidence Revealed: {currentQ.scopeEvidence}
                </span>

                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="mt-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs self-end cursor-pointer flex items-center gap-1.5"
                >
                  <span>Next Challenge</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DCDCScenarioAndFaultTrainer;
