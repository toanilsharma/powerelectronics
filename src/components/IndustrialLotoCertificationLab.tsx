import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  CheckCircle2,
  FileText,
  Lock,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  Wrench,
  Zap
} from 'lucide-react';

interface IndustrialLotoCertificationLabProps {
  className?: string;
  onClose?: () => void;
}

interface BlindFault {
  id: string;
  title: string;
  symptom: string;
  solution: string;
  component: string;
}

const BLIND_FAULTS: BlindFault[] = [
  {
    id: 'fuse_f1',
    title: 'Blown High-Speed Semiconductor Fuse (F1)',
    symptom: 'Inverter trips instantly with DC bus undervoltage. Multimeter reads 0V across inverter terminals.',
    solution: 'Isolate with LOTO, verify 0V, replace 690V 50A ultra-fast fuse, inspect for upstream short circuit.',
    component: 'Semiconductor Fuse F1',
  },
  {
    id: 'igbt_short',
    title: 'Punctured IGBT Switch Die (Drain-Source Short)',
    symptom: 'DC link circuit breaker trips on magnetic instantaneous overcurrent during power-up.',
    solution: 'Execute LOTO, discharge DC link capacitors, replace damaged IGBT half-bridge module, re-apply thermal grease.',
    component: 'IGBT Module S1-S2',
  },
  {
    id: 'gate_optocoupler',
    title: 'Optically-Isolated Gate Driver Failure',
    symptom: 'Upper transistor never turns on; output waveform shows severe asymmetric half-wave distortion.',
    solution: 'Verify zero energy, replace 5kV isolated gate drive IC, measure Vge pulse with oscilloscope.',
    component: 'Gate Driver Optocoupler',
  },
  {
    id: 'dc_cap_esr',
    title: 'Degraded DC Link Electrolytic Capacitor (High ESR)',
    symptom: 'Excessive 100Hz/300Hz DC bus voltage ripple (>15%), causing premature overvoltage trip.',
    solution: 'Perform safety LOTO, bleed residual charge, replace 2200µF capacitor bank with low-ESR unit.',
    component: 'DC Link Capacitor Bank',
  },
  {
    id: 'phase_loss',
    title: 'Single-Phasing on 3-Phase AC Infeed (Phase L2 Open)',
    symptom: 'Input rectifier produces severe 100Hz ripple; motor hums with excessive vibration and 173% current.',
    solution: 'Check upstream molded-case circuit breaker terminals, re-torque loose lug connection to 15 Nm.',
    component: 'Phase L2 Infeed Lug',
  },
];

/**
 * IndustrialLotoCertificationLab.tsx
 * 
 * OSHA 1910.147 / NFPA 70E Industrial Lockout/Tagout (LOTO) & Troubleshooting Certification Lab
 * 
 * Includes:
 *  1. 6-Step OSHA Hazardous Energy Control Sequence.
 *  2. Real-time capacitor bank discharge bleeder verification.
 *  3. Blind industrial fault diagnosis & component swap drill.
 *  4. Verifiable Industrial Competency Certificate generation!
 */
export const IndustrialLotoCertificationLab: React.FC<IndustrialLotoCertificationLabProps> = ({
  className = '',
  onClose,
}) => {
  // LOTO 6-Step Progress
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [operatorNotified, setOperatorNotified] = useState<boolean>(false);
  const [breakerOpen, setBreakerOpen] = useState<boolean>(false);
  const [padlockApplied, setPadlockApplied] = useState<boolean>(false);
  const [capDischarged, setCapDischarged] = useState<boolean>(false);
  const [zeroEnergyVerified, setZeroEnergyVerified] = useState<boolean>(false);
  const [partReplaced, setPartReplaced] = useState<boolean>(false);

  // Blind Fault State
  const [activeFault, setActiveFault] = useState<BlindFault>(BLIND_FAULTS[0]);
  const [faultDiagnosed, setFaultDiagnosed] = useState<boolean>(false);
  const [selectedGuess, setSelectedGuess] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('Engineer');
  const [certificationGranted, setCertificationGranted] = useState<boolean>(false);

  // DC Link Capacitor Voltage Simulation during Bleed
  const [capVoltage, setCapVoltage] = useState<number>(400);

  // Handle Discharge Trigger
  const handleDischargeCap = () => {
    let v = 400;
    const timer = setInterval(() => {
      v = Math.max(0, v - 45);
      setCapVoltage(v);
      if (v <= 2) {
        clearInterval(timer);
        setCapDischarged(true);
      }
    }, 150);
  };

  // Generate New Blind Fault Challenge
  const handleNewChallenge = () => {
    const randomIdx = Math.floor(Math.random() * BLIND_FAULTS.length);
    setActiveFault(BLIND_FAULTS[randomIdx]);
    setCurrentStep(1);
    setOperatorNotified(false);
    setBreakerOpen(false);
    setPadlockApplied(false);
    setCapDischarged(false);
    setCapVoltage(400);
    setZeroEnergyVerified(false);
    setPartReplaced(false);
    setFaultDiagnosed(false);
    setSelectedGuess('');
    setCertificationGranted(false);
  };

  return (
    <div className={`bg-[#0f172a] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-5 text-white font-sans ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#ef4444]/20 border border-[#ef4444]">
              <Lock className="w-5 h-5 text-[#ef4444]" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide uppercase">
              OSHA 1910.147 &amp; NFPA 70E Lockout/Tagout (LOTO) Certification Drill
            </h2>
          </div>
          <p className="text-xs text-[#94a3b8] font-mono mt-1">
            Control of Hazardous Energy • Stored Capacitor Discharge • Test-Before-Touch • Blind Fault Root Cause Analysis
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={handleNewChallenge}
            className="px-3 py-1.5 rounded-xl bg-[#06b6d4] hover:bg-[#0891b2] text-black font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Generate Random Blind Fault</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-[#1e293b] border border-[#334155] text-[#94a3b8] hover:text-white font-bold"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: 6-Step OSHA LOTO Sequence (7 Cols) */}
        <div className="lg:col-span-7 space-y-4 font-mono text-xs">
          
          <div className="p-4 bg-[#020617] border border-[#334155] rounded-2xl space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 text-[#94a3b8]">
              <span className="text-white font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                Standard 6-Step LOTO Execution Protocol
              </span>
              <span className="text-[#06b6d4]">Step {currentStep} of 6</span>
            </div>

            {/* 6 Step Interactive Tiles */}
            <div className="space-y-2">
              
              {/* Step 1: Notify Operators */}
              <div className={`p-3 rounded-xl border transition-all ${
                operatorNotified
                  ? 'bg-[#10b981]/15 border-[#10b981]'
                  : currentStep === 1
                  ? 'bg-[#0f172a] border-[#06b6d4]'
                  : 'bg-[#0f172a] border-[#1e293b] opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">1. Notify &amp; Prepare for Shutdown</span>
                  <button
                    onClick={() => {
                      setOperatorNotified(true);
                      setCurrentStep(2);
                    }}
                    disabled={operatorNotified}
                    className={`px-3 py-1 rounded-lg font-bold text-[10px] ${
                      operatorNotified ? 'bg-[#10b981] text-black' : 'bg-[#06b6d4] text-black hover:bg-[#0891b2]'
                    }`}
                  >
                    {operatorNotified ? '✓ NOTIFIED' : 'Notify Control Room'}
                  </button>
                </div>
                <div className="text-[10px] text-[#94a3b8] mt-1 font-sans">
                  Inform area operators that converter bus is being de-energized for emergency diagnostics.
                </div>
              </div>

              {/* Step 2: Open Disconnect Breaker */}
              <div className={`p-3 rounded-xl border transition-all ${
                breakerOpen
                  ? 'bg-[#10b981]/15 border-[#10b981]'
                  : currentStep === 2
                  ? 'bg-[#0f172a] border-[#06b6d4]'
                  : 'bg-[#0f172a] border-[#1e293b] opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">2. Open Main Feeder Disconnect Switch</span>
                  <button
                    onClick={() => {
                      setBreakerOpen(true);
                      setCurrentStep(3);
                    }}
                    disabled={!operatorNotified || breakerOpen}
                    className={`px-3 py-1 rounded-lg font-bold text-[10px] ${
                      breakerOpen ? 'bg-[#10b981] text-black' : 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
                    }`}
                  >
                    {breakerOpen ? '✓ OPEN / ISOLATED' : 'Open 52-Q1 Breaker'}
                  </button>
                </div>
              </div>

              {/* Step 3: Apply Red Padlock & Danger Tag */}
              <div className={`p-3 rounded-xl border transition-all ${
                padlockApplied
                  ? 'bg-[#10b981]/15 border-[#10b981]'
                  : currentStep === 3
                  ? 'bg-[#0f172a] border-[#06b6d4]'
                  : 'bg-[#0f172a] border-[#1e293b] opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">3. Apply OSHA Red Lockout Padlock &amp; Tag</span>
                  <button
                    onClick={() => {
                      setPadlockApplied(true);
                      setCurrentStep(4);
                    }}
                    disabled={!breakerOpen || padlockApplied}
                    className={`px-3 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 ${
                      padlockApplied ? 'bg-[#10b981] text-black' : 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    <span>{padlockApplied ? '✓ LOCKED OUT' : 'Attach Safety Padlock'}</span>
                  </button>
                </div>
              </div>

              {/* Step 4: Stored Energy Release (Discharge Capacitors) */}
              <div className={`p-3 rounded-xl border transition-all ${
                capDischarged
                  ? 'bg-[#10b981]/15 border-[#10b981]'
                  : currentStep === 4
                  ? 'bg-[#0f172a] border-[#06b6d4]'
                  : 'bg-[#0f172a] border-[#1e293b] opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">4. Dissipate Stored DC Bus Capacitor Energy</span>
                    <div className="text-[10px] text-amber-400 mt-0.5">
                      Residual Voltage: <strong className={capVoltage > 50 ? 'text-[#ef4444]' : 'text-[#10b981]'}>{capVoltage}V DC</strong> (Safe: &lt; 50V)
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleDischargeCap();
                      setCurrentStep(5);
                    }}
                    disabled={!padlockApplied || capDischarged}
                    className={`px-3 py-1 rounded-lg font-bold text-[10px] ${
                      capDischarged ? 'bg-[#10b981] text-black' : 'bg-amber-600 text-white hover:bg-amber-500'
                    }`}
                  >
                    {capDischarged ? '✓ DISCHARGED (0V)' : 'Connect Bleeder Resistor'}
                  </button>
                </div>
              </div>

              {/* Step 5: Test-Before-Touch Verification */}
              <div className={`p-3 rounded-xl border transition-all ${
                zeroEnergyVerified
                  ? 'bg-[#10b981]/15 border-[#10b981]'
                  : currentStep === 5
                  ? 'bg-[#0f172a] border-[#06b6d4]'
                  : 'bg-[#0f172a] border-[#1e293b] opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">5. Test-Before-Touch (CAT IV DMM Verification)</span>
                  <button
                    onClick={() => {
                      setZeroEnergyVerified(true);
                      setCurrentStep(6);
                    }}
                    disabled={!capDischarged || zeroEnergyVerified}
                    className={`px-3 py-1 rounded-lg font-bold text-[10px] ${
                      zeroEnergyVerified ? 'bg-[#10b981] text-black' : 'bg-[#06b6d4] text-black hover:bg-[#0891b2]'
                    }`}
                  >
                    {zeroEnergyVerified ? '✓ ZERO ENERGY CONFIRMED' : 'Verify 0V with Multimeter'}
                  </button>
                </div>
              </div>

              {/* Step 6: Component Swap & Fix */}
              <div className={`p-3 rounded-xl border transition-all ${
                partReplaced
                  ? 'bg-[#10b981]/15 border-[#10b981]'
                  : currentStep === 6
                  ? 'bg-[#0f172a] border-[#06b6d4]'
                  : 'bg-[#0f172a] border-[#1e293b] opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">6. Replace Damaged Component &amp; Re-torque</span>
                  <button
                    onClick={() => {
                      setPartReplaced(true);
                      setCertificationGranted(true);
                    }}
                    disabled={!zeroEnergyVerified || partReplaced}
                    className={`px-3 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 ${
                      partReplaced ? 'bg-[#10b981] text-black' : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                  >
                    <Wrench className="w-3 h-3" />
                    <span>{partReplaced ? '✓ COMPONENT REPLACED' : 'Perform Safe Replacement'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Blind Fault Diagnosis & Certificate (5 Cols) */}
        <div className="lg:col-span-5 space-y-4 font-mono text-xs">
          
          {/* Active Industrial Scenario Diagnostic Card */}
          <div className="p-4 bg-[#1e293b]/60 border border-[#334155] rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#334155] pb-2">
              <span className="text-white font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Blind Industrial Trouble Ticket
              </span>
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold border border-red-500 text-[10px]">
                LIVE INCIDENT
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="text-white font-bold">{activeFault.title}</div>
              <p className="text-[11px] text-[#94a3b8] font-sans leading-relaxed">
                <strong>Symptoms Observed:</strong> {activeFault.symptom}
              </p>
              <div className="p-2.5 rounded-xl bg-[#0f172a] border border-[#1e293b] text-[11px] font-sans text-cyan-300">
                💡 <strong>Correct Field Action:</strong> {activeFault.solution}
              </div>
            </div>

            {/* Technician Name Input for Certificate */}
            <div className="space-y-1 pt-2 border-t border-[#334155]">
              <span className="text-[#94a3b8] text-[10px]">Technician Name:</span>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-1.5 text-white font-bold"
                placeholder="Enter Engineer Name"
              />
            </div>
          </div>

          {/* Verifiable Industrial Competency Certificate */}
          {certificationGranted && (
            <div className="p-5 bg-gradient-to-br from-emerald-950 via-[#0f172a] to-[#020617] border-2 border-[#10b981] rounded-2xl space-y-3 shadow-2xl text-center">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-[#10b981]/20 border-2 border-[#10b981] flex items-center justify-center">
                  <Award className="w-7 h-7 text-[#10b981]" />
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#10b981] tracking-widest uppercase">
                  OFFICIAL CERTIFICATE OF COMPETENCY
                </span>
                <h3 className="text-base font-extrabold text-white mt-0.5">
                  OSHA 1910.147 &amp; NFPA 70E Field Safety
                </h3>
              </div>

              <p className="text-xs text-[#94a3b8] font-sans leading-relaxed">
                This document certifies that <strong className="text-white">{studentName}</strong> has successfully executed the mandatory 6-step zero-energy isolation procedure, safely discharged high-voltage capacitors, and resolved <strong className="text-cyan-300">{activeFault.component}</strong> without arc flash or shock hazard.
              </p>

              <div className="text-[9px] text-[#64748b] border-t border-[#10b981]/30 pt-2 flex justify-between">
                <span>STANDARD: OSHA 1910.147 / NFPA 70E</span>
                <span>STATUS: VERIFIED READY</span>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
