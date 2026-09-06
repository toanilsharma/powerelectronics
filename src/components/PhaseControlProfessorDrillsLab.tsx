import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  RotateCcw,
  Zap,
  Play,
  Pause,
  Info,
  Activity,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Timer,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Layers,
  Search,
  Download,
  Printer
} from 'lucide-react';

interface PhaseControlProfessorDrillsLabProps {
  className?: string;
  onClose?: () => void;
}

interface MysteryDrill {
  id: string;
  title: string;
  symptom: string;
  vDcReadout: string;
  rippleFreq: string;
  scopeClue: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hints: string[];
}

const MYSTERY_DRILLS: MysteryDrill[] = [
  {
    id: 'd1',
    title: 'Mystery Case 1: The Vibrating Transformer',
    symptom: 'A 3-phase 6-pulse controlled drive is humming loudly at 50Hz and the upstream transformer is overheating, even though load current is well below rated capacity.',
    vDcReadout: '468 V DC (Nominal 560V)',
    rippleFreq: '50 Hz & 100 Hz Dominant',
    scopeClue: 'DC output has 5 consecutive pulses followed by a 60 deg flatline dent every cycle.',
    options: [
      'SCR 3 gate pulse is missing/open, causing 5-pulse operation and transformer DC core saturation.',
      'AC line voltage has dropped by 20% due to utility brownout.',
      'The load inductor has short-circuited.',
      'The thyristors are firing in reverse phase sequence (C-B-A).'
    ],
    correctIndex: 0,
    explanation: 'When one thyristor fails to fire, the converter operates as a 5-pulse converter. The missing pulse creates a net DC current bias on that phase, driving the supply transformer into deep magnetic core saturation!',
    hints: [
      'Notice the 5 pulses per cycle on the oscilloscope.',
      'Check if one phase current lacks its positive half-cycle.',
      'A net DC bias current drives magnetic steel into saturation.'
    ]
  },
  {
    id: 'd2',
    title: 'Mystery Case 2: The Inverter Breaker Blast',
    symptom: 'An electric mine hoist motor regenerating into the 415V AC grid suddenly trips the main high-speed DC circuit breaker with a blinding flash as firing angle alpha approaches 165 deg.',
    vDcReadout: 'Collapses to 0V (Instantaneous surge > 1200A)',
    rippleFreq: 'Waveform inversion collapse',
    scopeClue: 'Outgoing thyristor fails to turn off before anode swings positive at 180 deg.',
    options: [
      'The motor has developed a mechanical bearing lockup.',
      'Catastrophic commutation failure occurred because extinction angle gamma < omega*tq.',
      'AC supply frequency increased from 50Hz to 60Hz.',
      'The freewheeling diode failed in reverse breakdown.'
    ],
    correctIndex: 1,
    explanation: 'In line-commutated inverters, firing angle alpha cannot exceed 180 - mu - gamma_min. If margin angle gamma < omega*tq, the outgoing SCR does not de-ionize in time, causing an AC line + DC Back-EMF simultaneous short circuit!',
    hints: [
      'Look at the extinction margin angle gamma = 180 - (alpha + mu).',
      'The thyristor requires turn-off time t_q to regain forward blocking capability.',
      'Commutation failure in inverter mode creates a dead short circuit.'
    ]
  },
  {
    id: 'd3',
    title: 'Mystery Case 3: The 30-Degree Vanishing Act',
    symptom: 'An engineer installs a second 6-pulse bridge fed by a Delta secondary winding alongside the existing Star-fed bridge. Suddenly, the 5th and 7th harmonic filters become completely unloaded.',
    vDcReadout: 'Smooth 12-Pulse DC with 720 Hz ripple',
    rippleFreq: '720 Hz (12 * f)',
    scopeClue: 'Primary AC current transforms from a stepped quasi-square wave into a 12-step staircase.',
    options: [
      'The filters have blown their tuning inductors.',
      'Harmonic traps short-circuited the 5th and 7th currents.',
      'The 30 deg phase shift across the Star-Delta transformer canceled the 5th and 7th harmonics in the primary.',
      'The load current became purely capacitive.'
    ],
    correctIndex: 2,
    explanation: 'In a 12-pulse converter with Y-Y and Y-Delta secondaries, the 30 deg transformer phase shift causes 5th and 7th harmonic currents to be 180 deg out of phase in the primary winding, producing complete destructive vector cancellation!',
    hints: [
      'Recall the phase displacement of nth harmonic: n * 30 deg.',
      '5 * 30 deg = 150 deg; plus 180 deg delta shift = 330 deg (anti-phase!).',
      'This is the classic 12-pulse harmonic cancellation mechanism.'
    ]
  },
  {
    id: 'd4',
    title: 'Mystery Case 4: The Floating Pedestal',
    symptom: 'A battery charger operates at light load with alpha = 60 deg. The professor asks students why the output DC voltage never drops below +48V, even when AC phase voltage swings down to -80V.',
    vDcReadout: '+48V during current gaps',
    rippleFreq: 'Discontinuous Current (DCM)',
    scopeClue: 'Current io(t) hits 0A at beta < pi + alpha; terminal voltage clamps at vo = E until next firing pulse.',
    options: [
      'A snubber capacitor is holding the charge.',
      'The circuit is in Discontinuous Conduction Mode (DCM), and the battery Back-EMF E floats the terminals when SCRs turn off.',
      'A freewheeling diode is conducting throughout the cycle.',
      'The thyristors have broken down in forward conduction.'
    ],
    correctIndex: 1,
    explanation: 'In DCM with an R-L-E load, when inductor current falls to zero at extinction angle beta, all thyristors turn OFF. With zero current and zero resistor drop, the terminal voltage floats strictly at the battery Back-EMF vo = E!',
    hints: [
      'Check the extinction angle beta relative to pi + alpha.',
      'When all SCRs are open, what voltage source remains connected to the terminals?',
      'The load is an active battery with Back-EMF E.'
    ]
  },
  {
    id: 'd5',
    title: 'Mystery Case 5: The Rolling Mill Reversal Stall',
    symptom: 'A reversible rolling mill dual converter experiences torque flatlines and jerkiness during rapid speed reversals across zero RPM. The chief engineer demands sub-millisecond dynamic response.',
    vDcReadout: 'Zero-current deadband of 10 ms observed',
    rippleFreq: 'Discontinuous at zero crossover',
    scopeClue: 'Converter 1 is fully blocked before Converter 2 is gated after zero-current detection.',
    options: [
      'Increase the motor field current.',
      'Switch from Non-Circulating Mode to Circulating Current Mode (alpha1 + alpha2 = 180 deg) with a circulating reactor Lc.',
      'Replace the thyristors with slow recovery diodes.',
      'Add a series DC resistor to limit inrush.'
    ],
    correctIndex: 1,
    explanation: 'In Non-Circulating mode, a mandatory zero-current dead-band (5-10ms) is required to prevent bridge-to-bridge short circuits. Circulating Current Mode with alpha1 + alpha2 = 180 deg and reactor Lc eliminates the dead-band entirely for seamless reversal!',
    hints: [
      'Notice the 10ms pause around zero current.',
      'Which control mode fires both Converter 1 and Converter 2 simultaneously?',
      'alpha1 + alpha2 = 180 deg with a circulating current reactor Lc.'
    ]
  }
];

export const PhaseControlProfessorDrillsLab: React.FC<PhaseControlProfessorDrillsLabProps> = ({
  className = '',
  onClose,
}) => {
  const [currentDrillIndex, setCurrentDrillIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [hintTier, setHintTier] = useState<number>(0);
  const [completedDrills, setCompletedDrills] = useState<Set<string>>(new Set());
  const [studentName, setStudentName] = useState<string>('Power Systems Scholar');
  const [showCertificate, setShowCertificate] = useState<boolean>(false);

  const activeDrill = MYSTERY_DRILLS[currentDrillIndex];

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswerSubmitted) return;
    setIsAnswerSubmitted(true);

    const isCorrect = selectedOption === activeDrill.correctIndex;
    if (isCorrect) {
      const hintPenalty = hintTier * 10;
      const pointsEarned = Math.max(50, 100 - hintPenalty);
      setScore((s) => s + pointsEarned);
      setStreak((st) => st + 1);
      setCompletedDrills((prev) => new Set(prev).add(activeDrill.id));
    } else {
      setStreak(0);
    }
  };

  const handleNextDrill = () => {
    if (currentDrillIndex < MYSTERY_DRILLS.length - 1) {
      setCurrentDrillIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      setHintTier(0);
    } else {
      setShowCertificate(true);
    }
  };

  const handleRestart = () => {
    setCurrentDrillIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setStreak(0);
    setHintTier(0);
    setCompletedDrills(new Set());
    setShowCertificate(false);
  };

  return (
    <div className={`flex flex-col bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-2xl overflow-hidden ${className}`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/40 rounded-lg text-amber-400 shadow-lg shadow-amber-950/30">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black tracking-wide text-white uppercase">
                Professor Classroom Drills &amp; Mystery Troubleshooting Arena
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full">
                IEEE &bull; NCEES PE Standard
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive Diagnostic Scenarios &bull; Root-Cause Analysis &bull; Certified Power Electronics Mastery
            </p>
          </div>
        </div>

        {/* Score & Streak */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg font-mono text-xs">
            <span className="text-slate-400">Score:</span>
            <span className="text-amber-400 font-bold text-sm">{score} pts</span>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg font-mono text-xs">
            <span className="text-slate-400">Streak:</span>
            <span className="text-emerald-400 font-bold text-sm">{streak} &times;</span>
          </div>

          <button
            onClick={handleRestart}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Restart Drills"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      {!showCertificate ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-6">
          {/* Left Column: Mystery Scenario & Telemetry */}
          <div className="lg:col-span-6 flex flex-col space-y-4">
            {/* Scenario Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                  Scenario {currentDrillIndex + 1} of {MYSTERY_DRILLS.length}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Case ID: {activeDrill.id.toUpperCase()}
                </span>
              </div>

              <h3 className="text-lg font-black text-white">{activeDrill.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                {activeDrill.symptom}
              </p>
            </div>

            {/* Virtual Instruments Telemetry Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Virtual Test Bench Instruments Readout
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">DC Multimeter (V_dc)</div>
                  <div className="text-base font-bold text-amber-400">{activeDrill.vDcReadout}</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Ripple Frequency</div>
                  <div className="text-base font-bold text-purple-400">{activeDrill.rippleFreq}</div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs">
                <div className="text-[10px] text-slate-400 uppercase mb-1">Oscilloscope Visual Signature:</div>
                <div className="text-cyan-300">{activeDrill.scopeClue}</div>
              </div>
            </div>

            {/* Hint Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase text-slate-300">Professor Hints:</span>
                </div>
                {hintTier < activeDrill.hints.length && !isAnswerSubmitted && (
                  <button
                    onClick={() => setHintTier((h) => Math.min(activeDrill.hints.length, h + 1))}
                    className="text-[11px] font-mono font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Reveal Hint {hintTier + 1} (-10 pts)
                  </button>
                )}
              </div>

              {hintTier === 0 ? (
                <div className="text-[11px] text-slate-500 italic">
                  No hints unlocked yet. Click &apos;Reveal Hint&apos; if stuck!
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activeDrill.hints.slice(0, hintTier).map((hint, hIdx) => (
                    <div key={hIdx} className="text-xs text-amber-300/90 font-mono bg-amber-950/20 p-2 rounded border border-amber-500/20">
                      &bull; Hint {hIdx + 1}: {hint}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Multiple Choice Diagnosis Arena */}
          <div className="lg:col-span-6 flex flex-col space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Identify Root Cause &amp; Prescribe Correct Engineering Remedy:
              </h4>

              {/* Options list */}
              <div className="space-y-2.5">
                {activeDrill.options.map((opt, optIdx) => {
                  const isSelected = selectedOption === optIdx;
                  let borderClass = 'border-slate-800 hover:border-slate-700 bg-slate-950';

                  if (isAnswerSubmitted) {
                    if (optIdx === activeDrill.correctIndex) {
                      borderClass = 'border-emerald-500 bg-emerald-950/30 text-emerald-200';
                    } else if (isSelected) {
                      borderClass = 'border-rose-500 bg-rose-950/30 text-rose-200';
                    }
                  } else if (isSelected) {
                    borderClass = 'border-amber-500 bg-amber-950/20 text-white';
                  }

                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-start space-x-3 ${borderClass}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </div>
                      <div className="text-xs leading-relaxed font-sans">{opt}</div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {!isAnswerSubmitted ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null}
                    className={`w-full py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-lg ${
                      selectedOption !== null
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Submit Diagnosis
                  </button>
                ) : (
                  <div className="space-y-3">
                    {/* Result alert */}
                    <div
                      className={`p-3 rounded-lg border text-xs leading-relaxed ${
                        selectedOption === activeDrill.correctIndex
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                          : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-bold mb-1">
                        {selectedOption === activeDrill.correctIndex ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>EXCELLENT DIAGNOSIS! Correct answer.</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-400" />
                            <span>INCORRECT DIAGNOSIS</span>
                          </>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-slate-300">
                        {activeDrill.explanation}
                      </div>
                    </div>

                    <button
                      onClick={handleNextDrill}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 cursor-pointer transition-transform active:scale-95"
                    >
                      <span>
                        {currentDrillIndex < MYSTERY_DRILLS.length - 1
                          ? 'Proceed to Next Case'
                          : 'View Mastery Certificate'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Certificate of Mastery View */
        <div className="p-8 flex flex-col items-center justify-center">
          <div className="w-full max-w-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-4 border-amber-500/60 rounded-2xl p-8 shadow-2xl relative overflow-hidden text-center space-y-6">
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
              <div className="text-xs font-mono font-bold tracking-widest uppercase text-amber-400">
                Official Certification of Achievement
              </div>
              <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase text-white tracking-wide">
                Certificate of Engineering Mastery
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Phase-Controlled Rectifiers &bull; Industrial Drives &bull; IEEE 519 Power Quality
              </p>
            </div>

            <div className="py-4 border-y border-slate-800 space-y-2">
              <div className="text-xs text-slate-400">This certifies that</div>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="text-xl font-black text-amber-300 bg-transparent text-center border-b border-amber-500/40 focus:outline-none focus:border-amber-400 font-serif"
              />
              <div className="text-xs text-slate-400 pt-2">
                has demonstrated laboratory diagnosis mastery, solving advanced thyristor commutation failure, 12-pulse harmonic vector cancellation, CCM/DCM boundary analysis, and asymmetrical fault scenarios.
              </div>
            </div>

            <div className="flex justify-between items-center px-8 font-mono text-xs">
              <div className="text-left">
                <div className="text-slate-500 text-[10px]">TOTAL SCORE:</div>
                <div className="text-lg font-bold text-emerald-400">{score} Points</div>
              </div>
              <div className="text-center">
                <div className="text-slate-500 text-[10px]">DATE:</div>
                <div className="text-white">{new Date().toLocaleDateString()}</div>
              </div>
              <div className="text-right">
                <div className="text-slate-500 text-[10px]">VERIFICATION:</div>
                <div className="text-amber-400 font-bold">VERIFIED PE LAB</div>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-4 pt-4">
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Certificate</span>
              </button>
              <button
                onClick={handleRestart}
                className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake Drills</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
