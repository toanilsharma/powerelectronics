import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import {
  PowerQualityEngine,
  LoadType,
  HarmonicComponent,
  IEEE519ComplianceResult,
  APFSimulationResult,
} from '../utils/PowerQualityEngine';

/**
 * Predefined Industrial Scenario Presets
 */
export interface ScenarioPreset {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  loadType: LoadType;
  fundamentalAmp: number;    // I1 (A)
  maxDemandIl: number;       // IL (A)
  shortCircuitIsc: number;   // kA
  frequencyHz: number;
  apfEnabled: boolean;
  apfEfficiency: number;     // %
  passiveFilterEnabled: boolean;
  passiveTunedFreq: 5 | 7 | 11;
  notes: string;
}

export const PREDEFINED_SCENARIOS: ScenarioPreset[] = [
  {
    id: 'cement-plant',
    name: 'Cement Plant',
    category: 'Heavy Industrial',
    icon: '🏭',
    description: '6-Pulse Heavy Industrial Kiln Drive, High Inductance, Weak Utility Grid.',
    loadType: '6-Pulse',
    fundamentalAmp: 950,
    maxDemandIl: 1200,
    shortCircuitIsc: 12, // 12kA (Weak Grid: Isc/IL = 10)
    frequencyHz: 50,
    apfEnabled: false,
    apfEfficiency: 100,
    passiveFilterEnabled: false,
    passiveTunedFreq: 5,
    notes: 'Severe 5th & 7th harmonics exceed IEEE 519 TDD limit (5.0%).',
  },
  {
    id: 'data-center',
    name: 'Data Center',
    category: 'IT Infrastructure',
    icon: '💻',
    description: 'High-density SMPS Server Racks, High Triplen Harmonics (3rd, 9th, 15th), Neutral Overload Risk.',
    loadType: 'SMPS',
    fundamentalAmp: 450,
    maxDemandIl: 500,
    shortCircuitIsc: 20, // 20kA
    frequencyHz: 50,
    apfEnabled: false,
    apfEfficiency: 100,
    passiveFilterEnabled: false,
    passiveTunedFreq: 5,
    notes: '3rd triplen harmonic causes massive neutral conductor current sum.',
  },
  {
    id: 'office-building',
    name: 'Office Building',
    category: 'Commercial',
    icon: '🏢',
    description: 'Mixed Commercial Load: Linear HVAC & Chiller Motors + Non-Linear LED & PC Power Supplies.',
    loadType: 'VFD',
    fundamentalAmp: 250,
    maxDemandIl: 300,
    shortCircuitIsc: 35, // 35kA
    frequencyHz: 50,
    apfEnabled: false,
    apfEfficiency: 100,
    passiveFilterEnabled: false,
    passiveTunedFreq: 5,
    notes: 'Moderate VFD distortion. Easily mitigated with passive or active filters.',
  },
  {
    id: 'marine-vessel',
    name: 'Marine Vessel',
    category: 'Maritime Propulsion',
    icon: '🚢',
    description: '12-Pulse Propulsion Converter on Isolated Shipboard Diesel Generator Grid.',
    loadType: '12-Pulse',
    fundamentalAmp: 1200,
    maxDemandIl: 1500,
    shortCircuitIsc: 15, // 15kA (Weak Generator Supply)
    frequencyHz: 60,
    apfEnabled: false,
    apfEfficiency: 100,
    passiveFilterEnabled: false,
    passiveTunedFreq: 5,
    notes: '12-Pulse phase shift cancels 5th & 7th harmonics; 11th & 13th remain.',
  },
  {
    id: 'ideal-clean-grid',
    name: 'Ideal Clean Grid',
    category: 'Mitigated Standard',
    icon: '🛡️',
    description: 'Fully Mitigated System with Active Power Filter (APF) Active.',
    loadType: '6-Pulse',
    fundamentalAmp: 200,
    maxDemandIl: 250,
    shortCircuitIsc: 50,
    frequencyHz: 50,
    apfEnabled: true,
    apfEfficiency: 100,
    passiveFilterEnabled: false,
    passiveTunedFreq: 5,
    notes: '100% compliant IEEE 519-2022 sinusoidal source current.',
  },
];

/**
 * Step-by-Step Guided Tour Step Definition
 */
export interface TourStep {
  id: string;
  stepIndex: number;
  title: string;
  subtitle: string;
  targetElementId: string;
  content: string;
  badge: string;
  actionSetup?: () => void;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    stepIndex: 1,
    title: '1. Clean Fundamental Grid Waveform',
    subtitle: 'The Ideal Reference',
    targetElementId: 'scope-target',
    content: 'Observe the pure 50Hz/60Hz green sinusoidal source current waveform. Under linear resistive loads, current remains perfectly in phase with zero harmonic distortion.',
    badge: 'STEP 1 / 5',
  },
  {
    id: 'the-problem',
    stepIndex: 2,
    title: '2. The Problem — Non-Linear Converters',
    subtitle: 'Harmonic Current Generation',
    targetElementId: 'source-selector-target',
    content: 'Non-linear semiconductor loads (like 6-Pulse SCR rectifiers and VFDs) draw pulsed current. Switching generates 5th (250Hz), 7th (350Hz), and higher order harmonics that distort the sine wave into a double-hump shape!',
    badge: 'STEP 2 / 5',
  },
  {
    id: 'the-limit',
    stepIndex: 3,
    title: '3. The IEEE 519-2022 Limit Violation',
    subtitle: 'Audit Table & TDD Spike',
    targetElementId: 'ieee-table-target',
    content: 'Total Demand Distortion (TDD) spikes past the IEEE 519-2022 limit (5.0%), turning the audit table RED! Unchecked harmonics cause transformer overheating, breaker nuisance trips, and capacitor resonant destruction.',
    badge: 'STEP 3 / 5',
  },
  {
    id: 'passive-fix',
    stepIndex: 4,
    title: '4. The Passive Fix — LC Trap Filter',
    subtitle: 'Tuned Shunt Filtering',
    targetElementId: 'solution-panel-target',
    content: 'Enabling a Passive LC Filter tuned to the 5th harmonic creates a low-impedance trap path. Notice the 5th harmonic magnitude drop on the FFT spectrum analyzer!',
    badge: 'STEP 4 / 5',
  },
  {
    id: 'active-fix',
    stepIndex: 5,
    title: '5. The Active Fix — Active Power Filter (APF)',
    subtitle: 'Real-Time Anti-Phase Cancellation',
    targetElementId: 'solution-panel-target',
    content: 'Activating the Active Power Filter (APF) injects equal and opposite anti-phase harmonic currents in real-time. All harmonic orders flatten to zero, and source current returns to a clean GREEN sine wave with 100% IEEE 519 PASS!',
    badge: 'STEP 5 / 5',
  },
];

/**
 * Context Interface
 */
interface PowerQualityContextType {
  // Inputs & Simulation States
  selectedLoadType: LoadType;
  setSelectedLoadType: (type: LoadType) => void;
  fundamentalAmp: number;
  setFundamentalAmp: (val: number) => void;
  maxDemandIl: number;
  setMaxDemandIl: (val: number) => void;
  shortCircuitIsc: number;
  setShortCircuitIsc: (val: number) => void;
  frequencyHz: number;
  setFrequencyHz: (freq: number) => void;

  // Filter States
  apfEnabled: boolean;
  setApfEnabled: (enabled: boolean) => void;
  apfEfficiency: number;
  setApfEfficiency: (eff: number) => void;
  passiveFilterEnabled: boolean;
  setPassiveFilterEnabled: (enabled: boolean) => void;
  passiveTunedFreq: 5 | 7 | 11;
  setPassiveTunedFreq: (freq: 5 | 7 | 11) => void;

  // Preset Handler
  activeScenarioId: string | null;
  loadScenarioPreset: (scenarioId: string) => void;

  // Tour / Learning Mode States
  isTourActive: boolean;
  currentTourStepIndex: number;
  currentTourStep: TourStep;
  startTour: () => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  endTour: () => void;

  // Calculated Physics Outputs
  loadSpectrum: HarmonicComponent[];
  apfSimResult: APFSimulationResult;
  activeCompliance: IEEE519ComplianceResult;
  isCompliant: boolean;
  kFactor: number;
}

const PowerQualityContext = createContext<PowerQualityContextType | undefined>(undefined);

export const PowerQualityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Simulation Inputs
  const [selectedLoadType, setSelectedLoadType] = useState<LoadType>('6-Pulse');
  const [fundamentalAmp, setFundamentalAmp] = useState<number>(100);
  const [maxDemandIl, setMaxDemandIl] = useState<number>(100);
  const [shortCircuitIsc, setShortCircuitIsc] = useState<number>(1.0); // kA
  const [frequencyHz, setFrequencyHz] = useState<number>(50);

  // Filter States
  const [apfEnabled, setApfEnabled] = useState<boolean>(false);
  const [apfEfficiency, setApfEfficiency] = useState<number>(100);
  const [passiveFilterEnabled, setPassiveFilterEnabled] = useState<boolean>(false);
  const [passiveTunedFreq, setPassiveTunedFreq] = useState<5 | 7 | 11>(5);

  // Preset Tracking
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  // Tour States
  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const [currentTourStepIndex, setCurrentTourStepIndex] = useState<number>(0);

  // Calculated Short Circuit Current in Amps
  const iscAmps = useMemo(() => shortCircuitIsc * 1000, [shortCircuitIsc]);

  // Raw Spectrum
  const rawLoadSpectrum = useMemo(() => {
    return PowerQualityEngine.getHarmonicSpectrum(selectedLoadType, fundamentalAmp);
  }, [selectedLoadType, fundamentalAmp]);

  // Spectrum with Passive Filter
  const loadSpectrum = useMemo(() => {
    if (!passiveFilterEnabled) return rawLoadSpectrum;

    return rawLoadSpectrum.map((comp) => {
      if (comp.order === passiveTunedFreq) {
        return { ...comp, magnitude: comp.magnitude * 0.2 };
      }
      return { ...comp };
    });
  }, [rawLoadSpectrum, passiveFilterEnabled, passiveTunedFreq]);

  // APF Simulation
  const apfSimResult: APFSimulationResult = useMemo(() => {
    return PowerQualityEngine.simulateAPF({
      harmonics: loadSpectrum,
      isc: iscAmps,
      il: maxDemandIl,
      apfEnabled,
      compensationEfficiency: apfEfficiency / 100,
    });
  }, [loadSpectrum, iscAmps, maxDemandIl, apfEnabled, apfEfficiency]);

  const activeCompliance = apfEnabled ? apfSimResult.sourceCompliance : apfSimResult.loadCompliance;
  const isCompliant = activeCompliance.isCompliant;
  const kFactor = apfEnabled ? apfSimResult.sourceKFactor : apfSimResult.loadKFactor;

  // Preset Loader with Animated State Transitions
  const loadScenarioPreset = (scenarioId: string) => {
    const preset = PREDEFINED_SCENARIOS.find((s) => s.id === scenarioId);
    if (!preset) return;

    setActiveScenarioId(preset.id);

    // Apply Preset Parameters
    setSelectedLoadType(preset.loadType);
    setFundamentalAmp(preset.fundamentalAmp);
    setMaxDemandIl(preset.maxDemandIl);
    setShortCircuitIsc(preset.shortCircuitIsc);
    setFrequencyHz(preset.frequencyHz);
    setApfEnabled(preset.apfEnabled);
    setApfEfficiency(preset.apfEfficiency);
    setPassiveFilterEnabled(preset.passiveFilterEnabled);
    setPassiveTunedFreq(preset.passiveTunedFreq);
  };

  // Tour Step Handlers & Automated Action Setups
  const applyTourStepActions = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: // Welcome - Clean Grid
        setSelectedLoadType('VFD');
        setFundamentalAmp(200);
        setMaxDemandIl(250);
        setShortCircuitIsc(50);
        setApfEnabled(true);
        setPassiveFilterEnabled(false);
        break;

      case 1: // The Problem - 6-Pulse Spike
        setSelectedLoadType('6-Pulse');
        setFundamentalAmp(600);
        setMaxDemandIl(800);
        setShortCircuitIsc(10);
        setApfEnabled(false);
        setPassiveFilterEnabled(false);
        break;

      case 2: // The Limit - IEEE Audit Red
        setSelectedLoadType('6-Pulse');
        setFundamentalAmp(800);
        setMaxDemandIl(1000);
        setShortCircuitIsc(12);
        setApfEnabled(false);
        setPassiveFilterEnabled(false);
        break;

      case 3: // Passive Fix
        setSelectedLoadType('6-Pulse');
        setFundamentalAmp(800);
        setMaxDemandIl(1000);
        setShortCircuitIsc(12);
        setApfEnabled(false);
        setPassiveFilterEnabled(true);
        setPassiveTunedFreq(5);
        break;

      case 4: // Active Fix - APF 100%
        setSelectedLoadType('6-Pulse');
        setFundamentalAmp(800);
        setMaxDemandIl(1000);
        setShortCircuitIsc(12);
        setApfEnabled(true);
        setApfEfficiency(100);
        setPassiveFilterEnabled(false);
        break;
    }
  };

  const startTour = () => {
    setIsTourActive(true);
    setCurrentTourStepIndex(0);
    applyTourStepActions(0);
  };

  const nextTourStep = () => {
    if (currentTourStepIndex < TOUR_STEPS.length - 1) {
      const nextIdx = currentTourStepIndex + 1;
      setCurrentTourStepIndex(nextIdx);
      applyTourStepActions(nextIdx);
    } else {
      endTour();
    }
  };

  const prevTourStep = () => {
    if (currentTourStepIndex > 0) {
      const prevIdx = currentTourStepIndex - 1;
      setCurrentTourStepIndex(prevIdx);
      applyTourStepActions(prevIdx);
    }
  };

  const endTour = () => {
    setIsTourActive(false);
  };

  const value = {
    selectedLoadType,
    setSelectedLoadType,
    fundamentalAmp,
    setFundamentalAmp,
    maxDemandIl,
    setMaxDemandIl,
    shortCircuitIsc,
    setShortCircuitIsc,
    frequencyHz,
    setFrequencyHz,
    apfEnabled,
    setApfEnabled,
    apfEfficiency,
    setApfEfficiency,
    passiveFilterEnabled,
    setPassiveFilterEnabled,
    passiveTunedFreq,
    setPassiveTunedFreq,
    activeScenarioId,
    loadScenarioPreset,
    isTourActive,
    currentTourStepIndex,
    currentTourStep: TOUR_STEPS[currentTourStepIndex],
    startTour,
    nextTourStep,
    prevTourStep,
    endTour,
    loadSpectrum,
    apfSimResult,
    activeCompliance,
    isCompliant,
    kFactor,
  };

  return <PowerQualityContext.Provider value={value}>{children}</PowerQualityContext.Provider>;
};

export const usePowerQuality = () => {
  const context = useContext(PowerQualityContext);
  if (!context) {
    throw new Error('usePowerQuality must be used within a PowerQualityProvider');
  }
  return context;
};
