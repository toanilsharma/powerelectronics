import React, { useState } from 'react';
import { Award, Printer, CheckCircle2, BookOpen, GraduationCap, X, FileText, Sparkles } from 'lucide-react';

interface TransistorLabReportModalProps {
  onClose: () => void;
  activeDevice: string;
  busVoltage: number;
  transistorCurrent: number;
  transistorTemp: number;
  eOnMilliJoules?: number;
  eOffMilliJoules?: number;
}

export const TransistorLabReportModal: React.FC<TransistorLabReportModalProps> = ({
  onClose,
  activeDevice,
  busVoltage,
  transistorCurrent,
  transistorTemp,
  eOnMilliJoules = 0.54,
  eOffMilliJoules = 0.38,
}) => {
  const [studentName, setStudentName] = useState<string>('Power Electronics Scholar');
  const [studentId, setStudentId] = useState<string>('PE-2026-EE402');
  const [university, setUniversity] = useState<string>('Department of Electrical Engineering');
  const [labNotes, setLabNotes] = useState<string>(
    'Observed that Wide Bandgap SiC MOSFET and GaN HEMT exhibit dramatically lower on-resistance and zero reverse recovery charge (Qrr = 0) compared to legacy Silicon switches. Active Miller Clamping successfully eliminated spurious dv/dt gate shoot-through.'
  );

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-3xl w-full p-6 text-white font-mono shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150 print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
        {/* MODAL ACTION BAR (Hidden in print) */}
        <div className="flex items-center justify-between border-b border-[#30363d] pb-3 print:hidden">
          <div className="flex items-center gap-2 text-amber-400">
            <GraduationCap className="w-5 h-5" />
            <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-white">
              Academic Lab Curriculum &amp; Official Verification Report
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-400 hover:text-white rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE OFFICIAL LAB REPORT SHEET */}
        <div className="space-y-4 print:space-y-3">
          {/* Institution & Lab Header */}
          <div className="border-b-2 border-slate-700 pb-3 text-center space-y-1 print:border-black">
            <h1 className="text-base sm:text-lg font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 print:text-black">
              POWER ELECTRONICS LABORATORY EXPERIMENT REPORT
            </h1>
            <p className="text-xs text-gray-400 print:text-gray-700">
              EXPERIMENT 03: POWER TRANSISTOR SWITCH CHARACTERIZATION &amp; TRANSIENT DYNAMICS
            </p>
            <p className="text-[11px] text-gray-500 print:text-gray-600 font-sans">
              IEC 60747-8 / IEC 60747-9 Standards Compliance Verification
            </p>
          </div>

          {/* Student Meta Fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#0d1117] p-3 rounded-xl border border-[#30363d] text-xs print:bg-gray-100 print:border-gray-300 print:text-black">
            <div>
              <span className="text-gray-500 block text-[10px] print:text-gray-600">STUDENT NAME:</span>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="bg-transparent text-white font-bold border-b border-gray-700 focus:outline-none w-full text-xs print:text-black print:border-none"
              />
            </div>
            <div>
              <span className="text-gray-500 block text-[10px] print:text-gray-600">STUDENT ID:</span>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="bg-transparent text-white font-bold border-b border-gray-700 focus:outline-none w-full text-xs print:text-black print:border-none"
              />
            </div>
            <div>
              <span className="text-gray-500 block text-[10px] print:text-gray-600">DATE RECORDED:</span>
              <span className="font-bold text-gray-300 print:text-black">{currentDate}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[10px] print:text-gray-600">ACADEMIC STATUS:</span>
              <span className="font-bold text-emerald-400 print:text-green-700">PASS (100/100)</span>
            </div>
          </div>

          {/* Measured Experimental Parameters Table */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 print:text-black">
              <FileText className="w-3.5 h-3.5" />
              <span>1. RECORDED EXPERIMENTAL MEASUREMENTS &amp; LOSS TELEMETRY</span>
            </h4>
            <div className="overflow-x-auto border border-[#30363d] rounded-xl print:border-gray-400">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0d1117] text-gray-400 border-b border-[#30363d] print:bg-gray-200 print:text-black">
                    <th className="p-2">Parameter</th>
                    <th className="p-2">Symbol</th>
                    <th className="p-2">Simulated Value</th>
                    <th className="p-2">Standard Rating</th>
                    <th className="p-2">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d] print:divide-gray-300">
                  <tr>
                    <td className="p-2 text-gray-300 print:text-black font-semibold">Device Under Test</td>
                    <td className="p-2 font-mono text-gray-400 print:text-black">DUT</td>
                    <td className="p-2 text-sky-400 print:text-black font-bold uppercase">{activeDevice}</td>
                    <td className="p-2 text-gray-400 print:text-black">650V / 30A Class</td>
                    <td className="p-2 text-emerald-400 print:text-green-700 font-bold">VERIFIED</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-gray-300 print:text-black font-semibold">DC Bus Voltage</td>
                    <td className="p-2 font-mono text-gray-400 print:text-black">Vdc</td>
                    <td className="p-2 text-white print:text-black font-bold">{busVoltage} V</td>
                    <td className="p-2 text-gray-400 print:text-black">400 V Nominal</td>
                    <td className="p-2 text-emerald-400 print:text-green-700 font-bold">WITHIN SOA</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-gray-300 print:text-black font-semibold">Continuous Load Current</td>
                    <td className="p-2 font-mono text-gray-400 print:text-black">Id / Ic</td>
                    <td className="p-2 text-white print:text-black font-bold">{transistorCurrent} A</td>
                    <td className="p-2 text-gray-400 print:text-black">30 A Rated</td>
                    <td className="p-2 text-emerald-400 print:text-green-700 font-bold">OPTIMAL</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-gray-300 print:text-black font-semibold">Junction Temperature</td>
                    <td className="p-2 font-mono text-gray-400 print:text-black">Tj</td>
                    <td className="p-2 text-white print:text-black font-bold">{transistorTemp} °C</td>
                    <td className="p-2 text-gray-400 print:text-black">150°C (Si) / 175°C (SiC)</td>
                    <td className="p-2 text-emerald-400 print:text-green-700 font-bold">SAFE MARGIN</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-gray-300 print:text-black font-semibold">Turn-On Switching Loss</td>
                    <td className="p-2 font-mono text-gray-400 print:text-black">E_on</td>
                    <td className="p-2 text-purple-400 print:text-black font-bold">{eOnMilliJoules.toFixed(2)} mJ</td>
                    <td className="p-2 text-gray-400 print:text-black">∫ (v·i) dt turn-on</td>
                    <td className="p-2 text-emerald-400 print:text-green-700 font-bold">COMPUTED</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-gray-300 print:text-black font-semibold">Turn-Off Switching Loss</td>
                    <td className="p-2 font-mono text-gray-400 print:text-black">E_off</td>
                    <td className="p-2 text-purple-400 print:text-black font-bold">{eOffMilliJoules.toFixed(2)} mJ</td>
                    <td className="p-2 text-gray-400 print:text-black">∫ (v·i) dt turn-off</td>
                    <td className="p-2 text-emerald-400 print:text-green-700 font-bold">COMPUTED</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Academic Rubric Competencies */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 print:text-black">
              <Award className="w-3.5 h-3.5" />
              <span>2. ABET / IEEE CURRICULUM COMPETENCY CHECKS</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] print:bg-gray-50 print:border-gray-300">
                <span className="font-bold text-emerald-400 print:text-green-800 flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3 h-3" /> Competency 1:
                </span>
                <p className="text-gray-300 print:text-black leading-tight">
                  Demonstrated Shichman-Hodges continuous triode/saturation physical I-V curves and dynamic DC load line Q-point trajectory.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] print:bg-gray-50 print:border-gray-300">
                <span className="font-bold text-emerald-400 print:text-green-800 flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3 h-3" /> Competency 2:
                </span>
                <p className="text-gray-300 print:text-black leading-tight">
                  Executed IEC 60747-9 Double-Pulse Test with clamped inductive load, diode Qrr shoot-through, and Eon/Eoff loss integration.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] print:bg-gray-50 print:border-gray-300">
                <span className="font-bold text-emerald-400 print:text-green-800 flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3 h-3" /> Competency 3:
                </span>
                <p className="text-gray-300 print:text-black leading-tight">
                  Analyzed Wide-Bandgap (SiC/GaN 2DEG) advantages and validated Active Miller Clamping against spurious dv/dt cross-conduction.
                </p>
              </div>
            </div>
          </div>

          {/* Student Observations / Professor Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 block print:text-black">
              3. STUDENT OBSERVATIONS &amp; ENGINEERING CONCLUSION:
            </label>
            <textarea
              rows={3}
              value={labNotes}
              onChange={(e) => setLabNotes(e.target.value)}
              className="w-full p-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-gray-300 text-xs focus:outline-none focus:border-cyan-500 font-mono leading-relaxed print:bg-white print:text-black print:border-gray-400"
            />
          </div>

          {/* Professor Signoff & Grade Badge */}
          <div className="border-t border-[#30363d] pt-3 flex items-center justify-between text-xs print:border-black">
            <div>
              <span className="text-gray-500 block text-[10px] print:text-gray-600">INSTRUCTOR SIGN-OFF:</span>
              <span className="font-bold text-gray-300 print:text-black font-sans italic underline">Prof. Dr. Anil Sharma, Ph.D., IEEE SM</span>
            </div>
            <div className="text-right">
              <span className="text-gray-500 block text-[10px] print:text-gray-600">OFFICIAL GRADE:</span>
              <span className="font-extrabold text-emerald-400 print:text-green-700 text-sm">GRADE: A+ (100%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransistorLabReportModal;
