import React, { useState, useEffect } from 'react';
import { MathLatex } from './MathLatex';
import { InteractiveSOPWizard, SOPStepItem } from './InteractiveSOPWizard';
import { Play, CheckCircle2, Sliders, Cpu, Gauge, Zap, BarChart2, Info } from 'lucide-react';

interface BatteryChargerControlsAndSOPProps {
  firingAngle: number;
  setFiringAngle: (angle: number) => void;
  voltageIn: number;
  loadPct: number;
  setLoadPct: (pct: number) => void;
  q1Closed: boolean;
  setQ1Closed: (closed: boolean) => void;
  q2Closed: boolean;
  setQ2Closed: (closed: boolean) => void;
  q3Closed: boolean;
  setQ3Closed: (closed: boolean) => void;
  isRunning: boolean;
  soc: number;
  hasLcFilter?: boolean;
  setHasLcFilter?: (filter: boolean) => void;
}

/**
 * Calculates battery charger efficiency based on firing angle alpha and load factor demand.
 * Formula:
 *   efficiency = (Vdc * Idc) / (sqrt(3) * Vac * Iac) * 100
 * Simulation Curve vs Alpha:
 *   Alpha = 0°  => 92.0%
 *   Alpha = 30° => 89.0%
 *   Alpha = 60° => 84.0%
 *   Alpha = 70° => 80.0%
 * Load Factor Adjustment:
 *   eff -= (1 - loadDemand) * 5%
 */
export function calculateChargerEfficiency(alpha: number, loadPct: number, q1Closed: boolean = true): number {
  if (!q1Closed || alpha > 90) return 0.0;

  const loadDemand = Math.max(0, Math.min(100, loadPct)) / 100;
  let baseEff = 92.0;

  if (alpha <= 0) {
    baseEff = 92.0;
  } else if (alpha <= 30) {
    baseEff = 92.0 - (alpha / 30.0) * (92.0 - 89.0);
  } else if (alpha <= 60) {
    baseEff = 89.0 - ((alpha - 30.0) / 30.0) * (89.0 - 84.0);
  } else if (alpha <= 70) {
    baseEff = 84.0 - ((alpha - 60.0) / 10.0) * (84.0 - 80.0);
  } else {
    baseEff = Math.max(0, 80.0 - ((alpha - 70.0) / 20.0) * 50.0);
  }

  const loadPenalty = (1 - loadDemand) * 5.0;
  const finalEff = Math.max(0, Math.min(98.5, baseEff - loadPenalty));
  return parseFloat(finalEff.toFixed(1));
}

interface SOPStep {
  id: number;
  title: string;
}

const SOP_STEPS: SOPStep[] = [
  { id: 1, title: 'Verify PTW (Permit to Work) is issued and valid' },
  { id: 2, title: 'Confirm LOTO removed from incoming breaker Q1' },
  { id: 3, title: 'Megger test: DC bus to earth > 1 MΩ' },
  { id: 4, title: 'Set firing angle to 180° (maximum)' },
  { id: 5, title: 'Close incoming breaker Q1' },
  { id: 6, title: 'Initiate Walk-In Soft Start' },
  { id: 7, title: 'Verify Vdc = 110V ± 1% at DC bus' },
  { id: 8, title: 'Close battery breaker Q2' },
  { id: 9, title: 'Verify charging current < 0.25C (50A for 200Ah)' },
  { id: 10, title: 'Set charge mode to FLOAT' },
  { id: 11, title: 'Record all parameters in log sheet' },
  { id: 12, title: 'Close PTW, notify control room' },
];

export const BatteryChargerControlsAndSOP: React.FC<BatteryChargerControlsAndSOPProps> = ({
  firingAngle,
  setFiringAngle,
  voltageIn,
  loadPct,
  setLoadPct,
  q1Closed,
  setQ1Closed,
  q2Closed,
  setQ2Closed,
  q3Closed,
  setQ3Closed,
  isRunning,
  soc,
  hasLcFilter = true,
  setHasLcFilter,
}) => {
  // Control Panel States
  const [activeControlTab, setActiveControlTab] = useState<'BASIC' | 'EXPERT'>('BASIC');
  const [chargeMode, setChargeMode] = useState<'FLOAT' | 'BOOST' | 'EQUALIZE'>('FLOAT');
  const [isWalkingIn, setIsWalkingIn] = useState<boolean>(false);
  const [walkInProgress, setWalkInProgress] = useState<number>(0);
  const [flashCompleted, setFlashCompleted] = useState<boolean>(false);
  const [boostTimeRemaining, setBoostTimeRemaining] = useState<number>(28800); // 8 hours in seconds

  // SOP Panel States
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isSopCompleted, setIsSopCompleted] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Timed 8-Hour Boost Mode Countdown Handler
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (chargeMode === 'BOOST') {
      interval = setInterval(() => {
        setBoostTimeRemaining((prev) => {
          if (prev <= 1) {
            setChargeMode('FLOAT');
            setFiringAngle(67); // Auto return to Float setpoint
            return 28800;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setBoostTimeRemaining(28800);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [chargeMode, setFiringAngle]);

  const formatHours = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const sopWizardSteps: SOPStepItem[] = [
    {
      id: 1,
      title: '1. Verify PTW (Permit to Work) is issued and valid',
      description: 'Ensure safety clearances and electrical work permit SOP-BC-001 are signed off by the Shift Charge Engineer.',
      actionLabel: 'Confirm PTW Validated',
    },
    {
      id: 2,
      title: '2. Confirm LOTO removed from incoming breaker Q1',
      description: 'Verify lockout-tagout hardware is removed from 415V AC incoming feeder breaker Q1.',
      actionLabel: 'Confirm LOTO Cleared',
    },
    {
      id: 3,
      title: '3. Megger test: DC bus to earth > 1 MΩ',
      description: 'Perform insulation resistance measurement on 110V DC output bus bars.',
      actionLabel: 'Confirm Megger > 1 MΩ',
    },
    {
      id: 4,
      title: '4. Set firing angle to 180° (maximum / zero output)',
      description: 'Set thyristor SCR firing angle α = 180° for safe initial energization without surge.',
      actionLabel: 'Set α = 180° & Confirm',
      onExecute: () => setFiringAngle(180),
    },
    {
      id: 5,
      title: '5. Close incoming breaker Q1',
      description: 'Close AC incoming circuit breaker Q1 to energize 3-phase rectifier transformer primary.',
      actionLabel: 'Close Breaker Q1 & Confirm',
      onExecute: () => setQ1Closed(true),
    },
    {
      id: 6,
      title: '6. Initiate Walk-In Soft Start',
      description: 'Trigger automated 10-second SCR phase walk-in from 180° down to target operating angle.',
      actionLabel: 'Start Walk-In Ramp',
      onExecute: () => startWalkIn(),
    },
    {
      id: 7,
      title: '7. Verify Vdc = 110V ± 1% at DC bus',
      description: 'Check precision digital multimeter reading at output terminals (109V–124V DC).',
      actionLabel: 'Confirm Vdc Nominal',
    },
    {
      id: 8,
      title: '8. Close battery breaker Q2',
      description: 'Connect 110V Lead-Acid battery bank string (55x2V VRLA) to charger DC output bus via Q2.',
      actionLabel: 'Close Breaker Q2 & Confirm',
      onExecute: () => setQ2Closed(true),
    },
    {
      id: 9,
      title: '9. Verify charging current < 0.25C',
      description: 'Confirm current limiter clamps charging current below 25A float limit for battery longevity.',
      actionLabel: 'Confirm Current Limit OK',
    },
    {
      id: 10,
      title: '10. Set charge mode to FLOAT',
      description: 'Lock charger into regulated FLOAT charging mode (122.65V / 2.23V per cell).',
      actionLabel: 'Select FLOAT & Confirm',
      onExecute: () => {
        setChargeMode('FLOAT');
        setFiringAngle(30);
      },
    },
    {
      id: 11,
      title: '11. Record all parameters in log sheet',
      description: 'Document Vin, Vdc, Idc, frequency, and SCR thermal readings into substation database.',
      actionLabel: 'Record Parameters',
    },
    {
      id: 12,
      title: '12. Close PTW, notify control room',
      description: 'Hand over completed PTW permit to Shift Engineer and inform CCR that Battery Charger is ONLINE.',
      actionLabel: 'Notify CCR & Complete SOP',
    },
  ];

  // Calculate dynamic Vdc
  const rad = (firingAngle * Math.PI) / 180;
  const calculatedVdc = q1Closed && firingAngle <= 90
    ? Math.max(0, 122.65 * (voltageIn / 415) * (Math.cos(rad) / Math.cos((67 * Math.PI) / 180)))
    : 0;

  // Dynamic Charger Operational Mode State Evaluation
  let activeModeBadge = 'MODE: FLOAT';
  let activeModeClass = 'bg-[#0e4429] text-[#3fb950] border border-[#238636]';
  let activeModeDetail = 'CV Mode: Float Target 122.65V (2.23V/cell Constant Voltage)';

  if (!q1Closed) {
    activeModeBadge = 'MODE: DE-ENERGIZED';
    activeModeClass = 'bg-[#21262d] text-[#8b949e] border border-[#30363d]';
    activeModeDetail = 'Charger De-energized - AC Incoming Breaker 52-Q1 Open';
  } else if (firingAngle > 90) {
    activeModeBadge = 'MODE: LOW V / TRIP';
    activeModeClass = 'bg-[#490202] text-[#f85149] border border-[#da3633] animate-pulse';
    activeModeDetail = `α = ${firingAngle}° > 90° | DC Undervoltage Relay 27 Triggered (< 99V)`;
  } else if (calculatedVdc < 122.6 && loadPct > 50) {
    activeModeBadge = 'MODE: CURRENT LIMIT';
    activeModeClass = 'bg-[#382300] text-[#f2cc60] border border-[#d29922]';
    activeModeDetail = 'CC Mode: Current Limit 110% Active (110A Max Output Demand)';
  } else if (chargeMode === 'BOOST') {
    activeModeBadge = 'MODE: BOOST';
    activeModeClass = 'bg-[#0d3880] text-[#58a6ff] border border-[#1f6beb]';
    activeModeDetail = `CV Mode: Boost Target 132.0V | Timed 8h Auto-Return (${formatHours(boostTimeRemaining)} left)`;
  } else if (chargeMode === 'EQUALIZE') {
    activeModeBadge = 'MODE: EQUALIZE';
    activeModeClass = 'bg-[#3c1e70] text-[#d2a8ff] border border-[#8957e5]';
    activeModeDetail = 'CV Mode: Equalize Target 137.5V (Cell Balancing)';
  }

  // 1. Walk-In Soft Start Animation Handler (10 Seconds)
  const startWalkIn = () => {
    if (isWalkingIn) return;
    setIsWalkingIn(true);
    setWalkInProgress(0);
    setFlashCompleted(false);

    // Make sure Q1 is closed
    setQ1Closed(true);

    const startAngle = 120;
    const targetAngle = 67; // target angle for ~122.65V Float
    const durationMs = 10000;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / durationMs) * 100);
      setWalkInProgress(Math.round(progress));

      const currentAngle = Math.round(startAngle - (startAngle - targetAngle) * (progress / 100));
      setFiringAngle(currentAngle);

      if (progress >= 100) {
        clearInterval(interval);
        setIsWalkingIn(false);
        setFlashCompleted(true);
        setTimeout(() => setFlashCompleted(false), 2500);
      }
    }, 50);
  };

  // 2. Charge Mode Selector Handler
  const handleModeSelect = (mode: 'FLOAT' | 'BOOST' | 'EQUALIZE') => {
    setChargeMode(mode);
    if (mode === 'FLOAT') {
      setFiringAngle(67); // 220V Nom Float (67°)
    } else if (mode === 'BOOST') {
      setFiringAngle(25); // Boost mode (25°)
    } else if (mode === 'EQUALIZE') {
      setFiringAngle(15); // Equalize mode (15°)
    }
  };

  // 3. Load Step Toggle Handler
  const isLoadOn = loadPct > 30;
  const toggleLoad = () => {
    if (isLoadOn) {
      setLoadPct(5);
    } else {
      setLoadPct(85);
    }
  };

  return (
    <div className="relative w-full bg-[#161b22] border border-[#30363d] rounded-lg p-4 grid grid-cols-1 lg:grid-cols-2 gap-6 select-none">
      {/* WARNING TOAST OVERLAY */}
      {toastMessage && (
        <div className="absolute top-3 right-4 z-50 bg-[#382300] border-2 border-[#d29922] text-[#f2cc60] text-xs font-bold font-mono px-4 py-2.5 rounded-md shadow-2xl animate-bounce flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= LEFT SIDE: CONTROL PANEL ================= */}
      <div className="flex flex-col gap-4 border-r-0 lg:border-r border-[#30363d] pr-0 lg:pr-6">
        <div className="flex items-center justify-between pb-2 border-b border-[#21262d]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveControlTab('BASIC')}
              className={`px-3 py-1 rounded text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
                activeControlTab === 'BASIC'
                  ? 'bg-[#238636] text-white shadow-sm'
                  : 'bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Basic Controls
            </button>
            <button
              onClick={() => setActiveControlTab('EXPERT')}
              className={`px-3 py-1 rounded text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
                activeControlTab === 'EXPERT'
                  ? 'bg-[#1f6beb] text-white shadow-sm'
                  : 'bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              Expert Tab
            </button>
          </div>
          <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded ${activeModeClass}`}>
            {activeModeBadge}
          </span>
        </div>

        {activeControlTab === 'BASIC' ? (
          <>
            {/* 1. FIRING ANGLE SLIDER */}
            <div className="flex flex-col gap-1.5 bg-[#0d1117] border border-[#30363d] rounded-md p-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#c9d1d9] font-medium">SCR Firing Angle (α)</span>
                <span className="font-mono text-[#3fb950] font-bold text-sm bg-[#000000] px-2 py-0.5 border border-[#30363d] rounded">
                  α = {firingAngle}°
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="1"
                value={firingAngle}
                disabled={isWalkingIn}
                onChange={(e) => setFiringAngle(Number(e.target.value))}
                className="w-full h-2 bg-[#30363d] rounded-lg appearance-none cursor-pointer accent-[#58a6ff] disabled:opacity-50"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8b949e] px-1">
                <span>0° [568V Peak]</span>
                <span>25° [Boost]</span>
                <span>67° [220V Nom Float]</span>
                <span>90° [Low V]</span>
                <span>120° [Off]</span>
              </div>
            </div>

            {/* 2. CHARGE MODE SELECTOR */}
            <div className="flex flex-col gap-2 bg-[#0d1117] border border-[#30363d] rounded-md p-3">
              <div className="flex justify-between items-center text-xs text-[#c9d1d9]">
                <span className="font-medium">Charge Mode Selector</span>
                <span className="text-[10px] font-mono text-[#3fb950]">
                  {chargeMode === 'FLOAT' && 'Target: 122.65V (2.23V/cell)'}
                  {chargeMode === 'BOOST' && 'Target: 132.0V (2.40V/cell)'}
                  {chargeMode === 'EQUALIZE' && 'Target: 137.5V (2.50V/cell)'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['FLOAT', 'BOOST', 'EQUALIZE'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => handleModeSelect(m)}
                    className={`py-1.5 rounded-full text-xs font-bold font-mono transition-all ${
                      chargeMode === m
                        ? 'bg-[#238636] text-white shadow-[0_0_8px_#238636]'
                        : 'bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#30363d]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="mt-1 pt-2 border-t border-[#21262d] flex justify-between items-center text-[10px] font-mono">
                <span className="text-[#8b949e]">{activeModeDetail}</span>
                {chargeMode === 'BOOST' && (
                  <button
                    onClick={() => setBoostTimeRemaining(3)}
                    className="px-2 py-0.5 bg-[#1f6beb]/20 border border-[#1f6beb]/40 text-[#58a6ff] hover:bg-[#1f6beb]/40 rounded font-bold transition-all"
                  >
                    ⏩ Fast 8h Expire
                  </button>
                )}
              </div>
            </div>

            {/* 3. LC FILTER CONTROL (L1 + C1) */}
            <div className="flex justify-between items-center bg-[#0d1117] border border-[#30363d] rounded-md p-3">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#c9d1d9] font-mono">LC Filter (L1 2.5mH + C1 4700μF)</span>
                <span className="text-[10px] text-[#8b949e] font-mono">
                  {hasLcFilter
                    ? 'LC Filter ACTIVE: THDi ~10-14%, Ripple ~1.5-3.0%'
                    : 'FILTER BYPASSED: THDi 28-32% (Plain 6-Pulse), Ripple 8-12%'}
                </span>
              </div>
              {setHasLcFilter && (
                <button
                  onClick={() => setHasLcFilter(!hasLcFilter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all border ${
                    hasLcFilter
                      ? 'bg-[#238636] border-[#3fb950] text-white shadow-[0_0_8px_#238636]'
                      : 'bg-[#da3633] border-[#f85149] text-white shadow-[0_0_8px_#da3633]'
                  }`}
                >
                  {hasLcFilter ? 'ACTIVE' : 'BYPASSED'}
                </button>
              )}
            </div>

            {/* 4. WALK-IN SOFT START & LOAD STEP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* WALK-IN START */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={startWalkIn}
                  disabled={isWalkingIn}
                  className={`w-full py-3 px-4 rounded-md font-bold text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    isWalkingIn
                      ? 'bg-[#d29922] text-[#0d1117] cursor-not-allowed animate-pulse'
                      : flashCompleted
                      ? 'bg-[#3fb950] text-[#0d1117] shadow-[0_0_12px_#3fb950]'
                      : 'bg-[#238636] hover:bg-[#2ea043] text-white shadow-md'
                  }`}
                >
                  {isWalkingIn ? '⏳ WALKING IN...' : '▶ WALK-IN START'}
                </button>
                {isWalkingIn && (
                  <div className="text-[10px] font-mono text-[#3fb950] text-center mt-1">
                    Walk-in: {walkInProgress}% | Vdc: {calculatedVdc.toFixed(0)}V
                  </div>
                )}
              </div>

              {/* LOAD STEP BUTTON */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={toggleLoad}
                  className={`w-full py-3 px-4 rounded-md font-bold text-xs font-mono transition-all border ${
                    isLoadOn
                      ? 'bg-[#da3633] border-[#f85149] text-white shadow-[0_0_10px_#f85149]'
                      : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]'
                  }`}
                >
                  {isLoadOn ? '⚡ LOAD: ON (50A)' : '⚪ LOAD: OFF'}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* EXPERT TAB VIEW */
          <div className="flex flex-col gap-3">
            {(() => {
              const effVal = calculateChargerEfficiency(firingAngle, loadPct, q1Closed);
              const calculatedIdc = q1Closed ? (calculatedVdc / 110) * (loadPct / 100) * 50 : 0;
              const pDcKw = (calculatedVdc * calculatedIdc) / 1000;
              const pAcKw = effVal > 0 ? pDcKw / (effVal / 100) : 0;
              const pLossKw = pAcKw - pDcKw;
              const cosAlpha = Math.cos((firingAngle * Math.PI) / 180);
              const iAcA = pAcKw > 0 ? (pAcKw * 1000) / (Math.sqrt(3) * voltageIn * Math.max(0.1, Math.abs(cosAlpha))) : 0;

              return (
                <div className="flex flex-col gap-3">
                  {/* PROMINENT EFFICIENCY GAUGE CARD */}
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3.5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-[#58a6ff]" />
                        <span className="text-xs font-bold text-[#c9d1d9] font-mono uppercase tracking-wider">
                          SYSTEM EFFICIENCY ANALYZER (η)
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        effVal >= 88 ? 'bg-[#1b4721] text-[#3fb950] border-[#238636]' :
                        effVal >= 80 ? 'bg-[#382300] text-[#d29922] border-[#9e6a03]' :
                        'bg-[#4c1d1d] text-[#f85149] border-[#da3633]'
                      }`}>
                        {effVal >= 88 ? 'OPTIMAL (FLOAT NOMINAL)' : effVal >= 80 ? 'DERATED (PHASE ANGLE DELAY)' : 'OFFLINE / CUTOFF'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-[#000000] border border-[#21262d] rounded-md p-3">
                      <div className="flex flex-col justify-center items-center sm:items-start border-b sm:border-b-0 sm:border-r border-[#21262d] pb-2 sm:pb-0 pr-0 sm:pr-3">
                        <span className="text-[10px] text-[#8b949e] font-mono font-semibold uppercase">Calculated Efficiency</span>
                        <span className="text-3xl font-black font-mono text-[#58a6ff] mt-0.5">
                          {effVal.toFixed(1)} %
                        </span>
                        <span className="text-[9px] text-[#8b949e] font-mono mt-0.5">
                          α = {firingAngle}° | Load Demand = {loadPct}%
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 text-[10px] font-mono text-[#c9d1d9]">
                        <div className="flex justify-between items-center">
                          <span className="text-[#8b949e]">Formula:</span>
                          <span className="text-[#3fb950] font-bold">
                            <MathLatex tex="\eta = \frac{V_{dc} \cdot I_{dc}}{\sqrt{3} \cdot V_{ac} \cdot I_{ac}}" />
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8b949e]">P_dc Output:</span>
                          <span className="text-[#c9d1d9]">{pDcKw.toFixed(2)} kW</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8b949e]">P_ac Input:</span>
                          <span className="text-[#c9d1d9]">{pAcKw.toFixed(2)} kW</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8b949e]">Heat Loss:</span>
                          <span className="text-[#f85149]">{pLossKw.toFixed(2)} kW</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* EFFICIENCY CURVE BENCHMARK MATRIX */}
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-[#c9d1d9] font-mono flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-[#58a6ff]" />
                      SIMULATION CURVE BENCHMARKS vs FIRING ANGLE (α)
                    </span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] font-mono border-collapse">
                        <thead>
                          <tr className="border-b border-[#30363d] text-[#8b949e]">
                            <th className="py-1 px-1.5">FIRING ANGLE (α)</th>
                            <th className="py-1 px-1.5">BASE EFF.</th>
                            <th className="py-1 px-1.5">LOAD PENALTY</th>
                            <th className="py-1 px-1.5">NET EFF.</th>
                            <th className="py-1 px-1.5">STATE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#21262d]">
                          {[
                            { angle: 0, base: 92, label: '0° Max SCR Output' },
                            { angle: 30, base: 89, label: '30° Float Mode' },
                            { angle: 60, base: 84, label: '60° Derated Angle' },
                            { angle: 70, base: 80, label: '70° High Phase Loss' },
                          ].map((item) => {
                            const isNearCurrent = Math.abs(firingAngle - item.angle) <= 3;
                            const penalty = (1 - loadPct / 100) * 5;
                            const net = Math.max(0, item.base - penalty);
                            return (
                              <tr key={item.angle} className={isNearCurrent ? 'bg-[#1c2128] text-[#3fb950] font-bold' : 'text-[#c9d1d9]'}>
                                <td className="py-1 px-1.5">{item.angle}°</td>
                                <td className="py-1 px-1.5">{item.base.toFixed(1)}%</td>
                                <td className="py-1 px-1.5 text-[#f85149]">-{penalty.toFixed(1)}%</td>
                                <td className="py-1 px-1.5 font-bold text-[#58a6ff]">{net.toFixed(1)}%</td>
                                <td className="py-1 px-1.5 text-[9px] text-[#8b949e]">{item.label}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* TEST ANGLE PRESETS */}
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-[#c9d1d9] font-mono flex items-center justify-between">
                      <span>QUICK TEST PRESETS (FIRING ANGLE α)</span>
                      <span className="text-[9px] text-[#8b949e]">Click to verify</span>
                    </span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { angle: 0, label: '0° (92%)' },
                        { angle: 30, label: '30° (89%)' },
                        { angle: 60, label: '60° (84%)' },
                        { angle: 70, label: '70° (80%)' },
                        { angle: 69, label: '69° (79.7%)' },
                      ].map((preset) => (
                        <button
                          key={preset.angle}
                          onClick={() => setFiringAngle(preset.angle)}
                          className={`py-1.5 px-1 rounded text-[10px] font-mono font-bold transition-all border ${
                            firingAngle === preset.angle
                              ? 'bg-[#1f6beb] border-[#58a6ff] text-white shadow-sm'
                              : 'bg-[#21262d] border-[#30363d] text-[#8b949e] hover:text-white hover:bg-[#30363d]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ================= RIGHT SIDE: SOP PANEL EMBEDDED ON SAME SCREEN ================= */}
      <InteractiveSOPWizard
        sopId="SOP-BC-001"
        title="Battery Charger Safe Energization Procedure"
        standard="SOP-BC-001 IEEE 1188 & IEC 62485-2 Referenced - VRLA Safe Energization"
        steps={sopWizardSteps}
      />
    </div>
  );
};
