import React, { useState } from 'react';
import {
  GraduationCap,
  Award,
  CheckCircle2,
  XCircle,
  Download,
  BookOpen,
  RotateCcw,
  Maximize2,
  HelpCircle,
  FileText,
  Sliders,
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';
import jsPDF from 'jspdf';
import { MathLatex } from './MathLatex';

interface PWMProfessorClassroomDrillsLabProps {
  className?: string;
  onClose?: () => void;
}

interface SocraticDrill {
  id: number;
  title: string;
  topic: string;
  question: string;
  options: { label: string; text: string; correct: boolean }[];
  explanation: string;
  formula: string;
}

const SOCRATIC_DRILLS: SocraticDrill[] = [
  {
    id: 1,
    title: 'Drill 1: Modulation Index (Ma) & Fundamental AC Voltage Synthesis',
    topic: 'Linear Half-Bridge vs Full-Bridge SPWM',
    question:
      'A single-phase half-bridge SPWM inverter is supplied from a DC bus voltage of Vdc = 400 V. What is the fundamental RMS AC output voltage V1(rms) when operating in the linear modulation range at Ma = 0.85, and what would it be if converted to a full-bridge H-bridge topology?',
    options: [
      { label: 'A', text: 'Half-Bridge: V1(rms) = 120.2 V; Full-Bridge: V1(rms) = 240.4 V', correct: true },
      { label: 'B', text: 'Half-Bridge: V1(rms) = 170.0 V; Full-Bridge: V1(rms) = 340.0 V', correct: false },
      { label: 'C', text: 'Half-Bridge: V1(rms) = 85.0 V; Full-Bridge: V1(rms) = 170.0 V', correct: false },
      { label: 'D', text: 'Half-Bridge: V1(rms) = 200.0 V; Full-Bridge: V1(rms) = 400.0 V', correct: false },
    ],
    formula: 'V_{1(rms),\\text{Half}} = M_a \\cdot \\frac{V_{dc}}{2\\sqrt{2}} = 0.85 \\cdot \\frac{400}{2\\sqrt{2}} = 120.2\\,\\text{V}; \\quad V_{1(rms),\\text{Full}} = 2 \\times V_{1(rms),\\text{Half}} = 240.4\\,\\text{V}',
    explanation:
      'In a half-bridge inverter with a split DC supply, each switch connects the output node to either +Vdc/2 or -Vdc/2. The peak fundamental AC output voltage is V1(peak) = Ma * (Vdc/2). Dividing by √2 gives V1(rms) = 0.85 * 200 / 1.4142 = 120.2 V. A full-bridge inverter applies +Vdc to -Vdc across the load, exactly doubling the output voltage to 240.4 V RMS.',
  },
  {
    id: 2,
    title: 'Drill 2: Carrier Ratio (mf) & Odd Harmonic Symmetry Rules',
    topic: 'Harmonic Spectrum & Quarter-Wave Symmetry',
    question:
      'Why is the frequency modulation ratio mf = fc / f1 strictly chosen to be an ODD integer in synchronous SPWM inverter control (e.g., mf = 21, 33, 45 rather than mf = 20 or 32)?',
    options: [
      { label: 'A', text: 'To maximize the peak AC voltage gain beyond the DC bus rail potential.', correct: false },
      { label: 'B', text: 'To enforce odd quarter-wave and half-wave symmetry f(t) = -f(t + T/2), mathematically eliminating all even harmonics (h = 2, 4, 6...) from the output spectrum.', correct: true },
      { label: 'C', text: 'To prevent anti-parallel body diode reverse recovery current.', correct: false },
      { label: 'D', text: 'To reduce the required dead-time blanking interval to zero.', correct: false },
    ],
    formula: 'f\\left(t + \\frac{T}{2}\\right) = -f(t) \\iff m_f \\in \\{3, 5, 7, 9, 11, ...\\} \\implies a_n = 0, \\; b_{2k} = 0 \\; (\\forall k \\in \\mathbb{N})',
    explanation:
      'When mf is an odd integer, the positive and negative half-cycles of the synthesized PWM waveform possess identical pulse distributions of opposite sign. This half-wave symmetry mathematically eliminates all even harmonic components (2nd, 4th, 6th...) from the Fourier series expansion, drastically simplifying the output LC filter design.',
  },
  {
    id: 3,
    title: 'Drill 3: Dead-Time Blanking Gap & Zero-Crossing Voltage Drop',
    topic: 'Shoot-Through Immunity & Crossover Distortion',
    question:
      'An inverter switching at fc = 10 kHz has a dead-time blanking interval of t_dead = 2.0 µs on each half-bridge leg supplied by Vdc = 400 V. What is the fundamental average voltage error (loss) ΔV caused by dead-time, and what happens if t_dead is set to 0.0 µs with MOSFET turn-off time toff = 350 ns?',
    options: [
      { label: 'A', text: 'ΔV = 0 V; at t_dead = 0.0 µs, switching efficiency rises to 100%.', correct: false },
      { label: 'B', text: 'ΔV = 16.0 V average error; at t_dead = 0.0 µs, concurrent conduction causes catastrophic shoot-through cross-shorting the DC bus.', correct: true },
      { label: 'C', text: 'ΔV = 80.0 V average error; at t_dead = 0.0 µs, the inverter automatically transitions into unipolar mode.', correct: false },
      { label: 'D', text: 'ΔV = 4.0 V average error; at t_dead = 0.0 µs, the LC filter capacitor resonates.', correct: false },
    ],
    formula: '\\Delta V = 4 f_c t_{\\text{dead}} V_{dc} = 4 \\times 10^4 \\times (2.0 \\times 10^{-6}) \\times 400 = 32.0\\,\\text{V} \\quad (\\text{Half-bridge: } \\Delta V = 16.0\\,\\text{V})',
    explanation:
      'During dead-time, both switches are turned OFF and inductor current freewheels through the anti-parallel diodes. The terminal voltage is clamped by the direction of load current rather than the gate control, producing an opposing voltage error ΔV = sign(iL) * fc * t_dead * Vdc. If t_dead = 0 µs, the turning-on switch conducts while the turning-off switch has not fully cleared its stored charge (toff = 350 ns), creating a direct low-impedance short-circuit (shoot-through) across the 400V DC rail that destroys the switches.',
  },
  {
    id: 4,
    title: 'Drill 4: Overmodulation Onset (Ma > 1.0) & Six-Step Square-Wave Limit',
    topic: 'Non-Linear Modulation Saturation',
    question:
      'As the amplitude modulation index Ma is increased from 1.0 to 3.24 and beyond in a full-bridge inverter (Vdc = 400 V), how do the output voltage and harmonic spectrum behave?',
    options: [
      { label: 'A', text: 'The output voltage increases linearly without bounds and THD decreases to 0%.', correct: false },
      { label: 'B', text: 'Pulse-dropping occurs near sine peaks; the fundamental voltage non-linearly saturates at the square-wave limit V1(rms) = (4/π) * (Vdc/√2) ≈ 360.1 V while prominent 3rd, 5th, and 7th harmonics emerge.', correct: true },
      { label: 'C', text: 'Carrier sidebands shift from fc to 10 * fc while fundamental voltage drops to zero.', correct: false },
      { label: 'D', text: 'The DC link capacitor charges to twice the supply voltage due to resonance.', correct: false },
    ],
    formula: 'V_{1(rms),\\text{max}} = \\frac{4}{\\pi} \\frac{V_{dc}}{\\sqrt{2}} = \\frac{4}{\\pi} \\times \\frac{400}{1.4142} \\approx 360.13\\,\\text{V} \\quad (M_a \\ge 3.24)',
    explanation:
      'For Ma > 1.0 (overmodulation), the reference sine waveform exceeds the triangle carrier peak near the 90° and 270° points. The comparator stops toggling and the switches remain continuously ON (pulse-dropping). As Ma increases past 3.24, all PWM pulses disappear and the inverter switches strictly once per half-cycle (Six-Step / Square-Wave Mode), yielding the theoretical maximum fundamental voltage (4/π) * Vdc / √2 = 360.1 V with substantial low-frequency harmonic distortion (THD ≈ 48.3%).',
  },
  {
    id: 5,
    title: 'Drill 5: LC Output Filter Attenuation & Harmonic Compliance (IEEE 519)',
    topic: 'Low-Pass Filter Cutoff & Ripple Suppression',
    question:
      'An inverter operates at fundamental f1 = 50 Hz with carrier frequency fc = 10 kHz. If the LC low-pass filter uses choke inductance L = 2.0 mH and capacitor C = 20 µF, what is the cutoff frequency f0, and does it satisfy the standard rule of thumb for effective carrier suppression without phase lag?',
    options: [
      { label: 'A', text: 'f0 = 795.8 Hz; Satisfies 10·f1 (500 Hz) < f0 < 0.2·fc (2000 Hz), providing ~44 dB carrier attenuation with THD < 5%.', correct: true },
      { label: 'B', text: 'f0 = 25.0 Hz; Cutoff is below fundamental frequency, attenuating the desired 50 Hz power.', correct: false },
      { label: 'C', text: 'f0 = 5000 Hz; Cutoff is too close to carrier, allowing high ripple current to reach the load.', correct: false },
      { label: 'D', text: 'f0 = 12.5 kHz; Cutoff is above carrier frequency, providing zero ripple attenuation.', correct: false },
    ],
    formula: 'f_0 = \\frac{1}{2\\pi \\sqrt{L C}} = \\frac{1}{2\\pi \\sqrt{2.0 \\times 10^{-3} \\times 20 \\times 10^{-6}}} = \\frac{1}{2\\pi \\times 2.0 \\times 10^{-4}} = 795.77\\,\\text{Hz}',
    explanation:
      'The cutoff frequency is f0 = 1 / (2π√(LC)) = 795.8 Hz. To prevent excessive phase shift and voltage drop at fundamental frequency while strongly suppressing switching harmonics at fc, standard power electronics design guidelines stipulate: 10 * f1 ≤ f0 ≤ 0.2 * fc. Here, 500 Hz < 795.8 Hz < 2000 Hz is perfectly satisfied. The 2nd-order filter provides -40 dB/decade attenuation, yielding an attenuation factor of (fc / f0)^2 = (10000 / 795.8)^2 ≈ 158 (44 dB), easily meeting IEEE 519 THD < 5% limits.',
  },
];

export const PWMProfessorClassroomDrillsLab: React.FC<PWMProfessorClassroomDrillsLabProps> = ({
  className = '',
  onClose,
}) => {
  // UI Display Mode
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);

  // Student credentials for PDF
  const [studentName, setStudentName] = useState<string>('Power Electronics Engineering Student');
  const [studentId, setStudentId] = useState<string>('EE-2026-PWM-058');
  const [universityName, setUniversityName] = useState<string>('IEEE / IEC Accredited Power Systems Academy');

  // Selected Answers: drillId -> optionIndex
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});

  // Active Drill Tab
  const [activeDrillId, setActiveDrillId] = useState<number>(1);

  // Score Calculation
  const totalDrills = SOCRATIC_DRILLS.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = Object.entries(selectedAnswers).filter(([drillId, optIdx]) => {
    const drill = SOCRATIC_DRILLS.find((d) => d.id === Number(drillId));
    return drill ? drill.options[Number(optIdx)]?.correct : false;
  }).length;

  const scorePct = Math.round((correctCount / totalDrills) * 100);

  // Handle answer selection
  const handleSelectOption = (drillId: number, optIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [drillId]: optIdx }));
    setShowExplanation((prev) => ({ ...prev, [drillId]: true }));
  };

  // Generate and Download PDF Report
  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleString();

    // Top Header Banner
    doc.setFillColor(15, 23, 42); // Dark Slate
    doc.rect(0, 0, 210, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('POWER ELECTRONICS LABORATORY CERTIFICATE', 14, 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Pulse Width Modulation (PWM) & Inverter Synthesis Master Drills', 14, 24);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`IEEE 519 / IEC 61800-9 Benchmarked Evaluation • Certified: ${now}`, 14, 32);

    // Student Credentials Box
    doc.setFillColor(241, 245, 249);
    doc.rect(14, 48, 182, 28, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, 48, 182, 28, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('STUDENT EVALUATION SUMMARY & CERTIFICATION', 18, 56);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Candidate:   ${studentName}`, 18, 64);
    doc.text(`Student ID:  ${studentId}`, 18, 70);
    doc.text(`Institution: ${universityName}`, 105, 64);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Final Score: ${correctCount} / ${totalDrills} (${scorePct}%) - ${
        scorePct >= 80 ? 'DISTINCTION' : scorePct >= 60 ? 'PASSED' : 'NEEDS REVIEW'
      }`,
      105,
      70
    );

    // Questions and Answers Section
    let currentY = 84;
    SOCRATIC_DRILLS.forEach((drill) => {
      if (currentY > 235) {
        doc.addPage();
        currentY = 20;
      }

      const userOptIdx = selectedAnswers[drill.id];
      const isAnswered = userOptIdx !== undefined;
      const isCorrect = isAnswered && drill.options[userOptIdx]?.correct;

      // Question Title Banner
      doc.setFillColor(isCorrect ? 240 : isAnswered ? 254 : 248, isCorrect ? 253 : 242, isCorrect ? 244 : 242);
      doc.rect(14, currentY, 182, 8, 'F');
      doc.setTextColor(isCorrect ? 22 : isAnswered ? 185 : 71, isCorrect ? 101 : 28, isCorrect ? 52 : 28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(
        `${drill.title} [${drill.topic}] - ${isCorrect ? 'CORRECT' : isAnswered ? 'INCORRECT' : 'NOT ANSWERED'}`,
        16,
        currentY + 6
      );
      currentY += 12;

      // Question Text
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      const splitQ = doc.splitTextToSize(drill.question, 180);
      doc.text(splitQ, 14, currentY);
      currentY += splitQ.length * 4.5 + 2;

      // Student vs Correct Solution
      const userText = isAnswered ? `${drill.options[userOptIdx]?.label}: ${drill.options[userOptIdx]?.text}` : 'No answer submitted';
      const correctText = `${drill.options.find((o) => o.correct)?.label}: ${drill.options.find((o) => o.correct)?.text}`;

      doc.setFont('helvetica', 'bold');
      doc.text(`Student Selection: ${userText}`, 14, currentY);
      currentY += 5;
      doc.setTextColor(22, 101, 52);
      doc.text(`Correct Solution:  ${correctText}`, 14, currentY);
      currentY += 5;

      // Derivation & Theory
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'italic');
      const splitExpl = doc.splitTextToSize(`Analytical Derivation: ${drill.explanation}`, 180);
      doc.text(splitExpl, 14, currentY);
      currentY += splitExpl.length * 4.2 + 8;
    });

    doc.save(`PWM_Inverter_Lab_Certification_${studentId}.pdf`);
  };

  const activeDrill = SOCRATIC_DRILLS.find((d) => d.id === activeDrillId) || SOCRATIC_DRILLS[0];
  const activeUserOpt = selectedAnswers[activeDrill.id];
  const isCurrentAnswered = activeUserOpt !== undefined;
  const isCurrentCorrect = isCurrentAnswered && activeDrill.options[activeUserOpt]?.correct;

  return (
    <div
      className={`w-full rounded-2xl border transition-all duration-300 p-4 md:p-6 font-mono ${
        isPresentationMode
          ? 'bg-slate-950 text-slate-100 border-pink-500 shadow-2xl scale-[1.01]'
          : 'bg-[#0d1117] text-[#c9d1d9] border-[#30363d] shadow-xl'
      } ${className}`}
    >
      {/* TOP HEADER CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500 flex items-center justify-center text-pink-400">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-extrabold text-white flex items-center gap-2">
              <span>PROFESSOR CLASSROOM DRILLED LAB: PWM &amp; INVERTER DYNAMICS</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                IEEE 519 • IEC 61800-9
              </span>
            </h2>
            <p className="text-xs text-[#8b949e]">
              Rigorous Socratic Drills: Carrier Modulation, Dead-Time Distortion, Overmodulation &amp; LC Filter Synthesis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* PRESENTATION MODE TOGGLE */}
          <button
            onClick={() => setIsPresentationMode(!isPresentationMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              isPresentationMode
                ? 'bg-pink-500 text-slate-950 border-pink-400 shadow-lg shadow-pink-500/20 font-black'
                : 'bg-[#161b22] text-[#c9d1d9] border-[#30363d] hover:border-pink-500'
            }`}
            title="High-contrast projector mode for lecture halls"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{isPresentationMode ? 'PROJECTOR MODE ACTIVE' : 'PROJECTOR MODE'}</span>
          </button>

          {/* DOWNLOAD CERTIFICATE PDF */}
          <button
            onClick={handleDownloadPdf}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Download Official IEEE/IEC Accredited Laboratory Certificate PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CERTIFICATE (PDF)</span>
          </button>

          {/* RESET ALL DRILLS */}
          <button
            onClick={() => {
              setSelectedAnswers({});
              setShowExplanation({});
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#161b22] text-[#8b949e] hover:text-white border border-[#30363d] hover:border-amber-400 transition-all flex items-center gap-1 cursor-pointer"
            title="Reset all answer choices"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* STUDENT PROFILE & SCORE BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 bg-[#161b22] border border-[#30363d] rounded-xl p-3 mb-4 text-xs">
        <div>
          <label className="text-[10px] text-[#8b949e] uppercase font-bold block mb-1">CANDIDATE NAME:</label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full bg-[#0d1117] text-white border border-[#30363d] rounded px-2 py-1 text-xs focus:border-pink-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#8b949e] uppercase font-bold block mb-1">STUDENT ID / ROLL NO:</label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full bg-[#0d1117] text-white border border-[#30363d] rounded px-2 py-1 text-xs focus:border-pink-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#8b949e] uppercase font-bold block mb-1">UNIVERSITY / INSTITUTION:</label>
          <input
            type="text"
            value={universityName}
            onChange={(e) => setUniversityName(e.target.value)}
            className="w-full bg-[#0d1117] text-white border border-[#30363d] rounded px-2 py-1 text-xs focus:border-pink-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col justify-between bg-[#0d1117] border border-[#30363d] rounded p-2">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-[#8b949e]">DRILL MASTERY PROGRESS:</span>
            <span className={scorePct >= 80 ? 'text-emerald-400' : scorePct >= 50 ? 'text-amber-400' : 'text-pink-400'}>
              {correctCount} / {totalDrills} ({scorePct}%)
            </span>
          </div>
          <div className="w-full bg-[#21262d] h-2 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-500 ${
                scorePct >= 80 ? 'bg-emerald-500' : scorePct >= 50 ? 'bg-amber-500' : 'bg-pink-500'
              }`}
              style={{ width: `${(answeredCount / totalDrills) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* DRILL NAVIGATOR TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 border-b border-[#21262d]">
        {SOCRATIC_DRILLS.map((d) => {
          const userOpt = selectedAnswers[d.id];
          const isDone = userOpt !== undefined;
          const isOk = isDone && d.options[userOpt]?.correct;
          const isActive = d.id === activeDrillId;

          return (
            <button
              key={d.id}
              onClick={() => setActiveDrillId(d.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer border ${
                isActive
                  ? 'bg-pink-500 text-slate-950 border-white shadow-md'
                  : 'bg-[#161b22] text-[#c9d1d9] border-[#30363d] hover:border-pink-400'
              }`}
            >
              <span>{isOk ? '✅' : isDone ? '❌' : '⚡'}</span>
              <span>Drill #{d.id}</span>
              <span className="text-[10px] opacity-75 hidden sm:inline">[{d.topic.split(' ')[0]}]</span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE DRILL CARD */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 md:p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363d] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-extrabold text-xs border border-pink-500/40">
              DRILL {activeDrill.id} OF {totalDrills}
            </span>
            <span className="text-xs text-[#8b949e] font-semibold">{activeDrill.topic}</span>
          </div>

          {isCurrentAnswered && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold flex items-center gap-1 border ${
                isCurrentCorrect
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                  : 'bg-red-500/20 text-red-300 border-red-500'
              }`}
            >
              {isCurrentCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {isCurrentCorrect ? 'CORRECT SOLUTION' : 'INCORRECT CHOICE'}
            </span>
          )}
        </div>

        {/* QUESTION STEM */}
        <div>
          <h3 className="text-sm md:text-base font-bold text-white mb-2 leading-snug">
            {activeDrill.title}
          </h3>
          <p className="text-xs md:text-sm text-[#c9d1d9] leading-relaxed bg-[#0d1117] p-3.5 rounded-lg border border-[#30363d]">
            {activeDrill.question}
          </p>
        </div>

        {/* MULTIPLE CHOICE OPTIONS */}
        <div className="flex flex-col gap-2">
          {activeDrill.options.map((opt, idx) => {
            const isSelected = activeUserOpt === idx;
            const showResult = isCurrentAnswered;

            let btnStyle = 'bg-[#0d1117] border-[#30363d] text-[#c9d1d9] hover:border-pink-500 hover:text-white';
            if (showResult) {
              if (opt.correct) {
                btnStyle = 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-bold';
              } else if (isSelected && !opt.correct) {
                btnStyle = 'bg-red-950/40 border-red-500 text-red-200';
              } else {
                btnStyle = 'bg-[#0d1117]/60 border-[#21262d] text-slate-500 opacity-60';
              }
            } else if (isSelected) {
              btnStyle = 'bg-pink-950/40 border-pink-500 text-white font-bold';
            }

            return (
              <button
                key={opt.label}
                onClick={() => handleSelectOption(activeDrill.id, idx)}
                className={`p-3 rounded-lg border text-left text-xs md:text-sm transition-all flex items-start gap-3 cursor-pointer ${btnStyle}`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                    isSelected
                      ? 'bg-pink-500 text-slate-950 border-white'
                      : 'bg-[#161b22] text-[#8b949e] border-[#30363d]'
                  }`}
                >
                  {opt.label}
                </span>
                <span className="leading-snug pt-0.5">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* DERIVATION & EXPLANATION PANEL */}
        {showExplanation[activeDrill.id] && (
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3 mt-2 shadow-inner">
            <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-xs font-bold text-[#58a6ff]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-pink-400" />
                PROFESSOR ANALYTICAL DERIVATION &amp; IEC 61800-9 PHYSICS:
              </span>
              <span className="text-[10px] text-[#8b949e]">Mathematical Proof</span>
            </div>

            {/* KATEX FORMULA BLOCK */}
            <MathLatex tex={activeDrill.formula} block={true} className="border-pink-500/40" />

            <p className="text-xs text-[#c9d1d9] leading-relaxed bg-[#161b22] p-3 rounded-lg border border-[#21262d]">
              {activeDrill.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
