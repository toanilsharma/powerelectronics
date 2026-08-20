import React from 'react';
import { SpotlightTour } from './shared/SpotlightTour';
import { TourStepSpec } from '../engine/types';

export interface SoftStarterTourStep {
  id: string;
  stepIndex: number;
  title: string;
  subtitle: string;
  badge: string;
  targetElementId: string;
  content: string;
  presetNote: string;
}

export const SOFT_STARTER_TOUR_STEPS: SoftStarterTourStep[] = [
  {
    id: 'step-1-dol',
    stepIndex: 0,
    title: '1. The Direct-On-Line (DOL) Problem',
    subtitle: '6–8× FLA Inrush Current & Mechanical Torque Shock',
    badge: 'STEP 1 OF 8 • DOL INRUSH',
    targetElementId: 'ss-strip-chart',
    content: 'Direct-On-Line (DOL) starting applies 100% full line voltage instantaneously. This creates a severe 6–8× FLA inrush current peak (over 1600A for 160kW motor), causing supply busbar voltage dips and brutal mechanical torque shock on motor shafts, couplings, and pump impellers.',
    presetNote: 'Preset Applied: Direct-On-Line (DOL) Start Mode (100% V, 1s Ramp, 1600A Inrush Surge).',
  },
  {
    id: 'step-2-thyristor',
    stepIndex: 1,
    title: '2. The Thyristor Switch & Phase Control',
    subtitle: 'Antiparallel SCR Pairs & Firing Angle α Chopping',
    badge: 'STEP 2 OF 8 • SCR FIRING',
    targetElementId: 'ss-scope',
    content: 'A solid-state soft starter uses antiparallel SCR thyristor pairs in each phase to chop the 3-phase AC voltage waveform. By gradually reducing gate firing angle α from 180° down to 0°, the RMS voltage applied to motor windings increases smoothly without mechanical shock.',
    presetNote: 'Preset Applied: Voltage Ramp Mode (Slow-Mo ×100 Firing Angle Scope Enabled).',
  },
  {
    id: 'step-3-voltage-ramp',
    stepIndex: 2,
    title: '3. Voltage Ramp & the V² Law',
    subtitle: 'Torque Te ∝ (V/100)² Voltage Reduction',
    badge: 'STEP 3 OF 8 • V² TORQUE LAW',
    targetElementId: 'ss-controls',
    content: 'Motor developed torque is proportional to the square of voltage (Te ∝ V²). Reducing initial voltage to 40% reduces starting torque to 16% of DOL torque, eliminating mechanical jerk while ensuring sufficient breakaway torque.',
    presetNote: 'Preset Applied: Initial Voltage V_start = 40% (Breakaway Torque = 16%).',
  },
  {
    id: 'step-4-ramp-vs-accel',
    stepIndex: 3,
    title: '4. Ramp Time ≠ Accel Time',
    subtitle: 'High Inertia Load Accelerating Beyond Voltage Ramp',
    badge: 'STEP 4 OF 8 • RAMP VS ACCEL',
    targetElementId: 'ss-torque-curve',
    content: 'Ramp time is the duration over which SCR firing angles step down. However, actual motor acceleration time depends on total load inertia (J). High inertia loads like Boiler Fans continue accelerating long after voltage reaches 100%.',
    presetNote: 'Preset Applied: Boiler ID Fan (High Inertia J = 3.5 kg·m², 25s Ramp).',
  },
  {
    id: 'step-5-stall-risk',
    stepIndex: 4,
    title: '5. Stall Risk & Current Limit Coordination',
    subtitle: 'Motor Developed Torque < Load Demand Torque Stall',
    badge: 'STEP 5 OF 8 • STALL RISK',
    targetElementId: 'ss-sld',
    content: 'If the Current Limit (I_limit) is set too low (e.g. 200% FLA), the motor developed torque may fall below the load demand curve during acceleration. The motor stalls at ~60% speed and trips on Relay 49 Class 10 thermal overload.',
    presetNote: 'Preset Applied: Incline Conveyor with Low I_limit = 200% (Stall Risk Active).',
  },
  {
    id: 'step-6-bypass-scr-heat',
    stepIndex: 5,
    title: '6. Bypass Contactor KM1 & SCR Conduction Losses',
    subtitle: 'Eliminating 3× 2× 1.2V SCR Heat Dissipation in RUN State',
    badge: 'STEP 6 OF 8 • BYPASS KM1',
    targetElementId: 'ss-water-hammer',
    content: 'Once the motor reaches full speed, bypass contactor KM1 closes to bypass the SCR thyristors. This eliminates 1.2V conduction losses across the SCRs, saving ~2.2kW of continuous heat generation during normal operation.',
    presetNote: 'Preset Applied: Bypass KM1 Closed (0W SCR Conduction Loss).',
  },
  {
    id: 'step-7-thermal-memory',
    stepIndex: 6,
    title: '7. Thermal Memory & Cooldown Lockout',
    subtitle: 'IEC 60947-4-2 Repeated Start Protection',
    badge: 'STEP 7 OF 8 • THERMAL MEMORY',
    targetElementId: 'ss-thermal-gauge',
    content: 'Repeated motor starts build up thermal memory in stator windings. The soft starter enforces cooldown lockouts and limits starts-per-hour to prevent thermal breakdown of motor insulation.',
    presetNote: 'Preset Applied: Thermal Overload Gauge (Class 10 / 20 / 30 IEC Curves).',
  },
  {
    id: 'step-8-state-machine',
    stepIndex: 7,
    title: '8. Annunciator State Machine & Operational Flow',
    subtitle: 'STOPPED ➔ STARTING ➔ RUNNING(SCR) ➔ BYPASSED ➔ STOPPING ➔ TRIPPED',
    badge: 'STEP 8 OF 8 • DCS STATE MACHINE',
    targetElementId: 'ss-state-lamps',
    content: 'The 6-lamp annunciator panel at the top of the workstation shows live operational states with smooth cross-fade transitions and clear plain-English status explanations.',
    presetNote: 'Preset Applied: State Machine Annunciator Active.',
  },
];

export interface SoftStarterGuidedTourProps {
  isActive: boolean;
  currentStepIndex?: number;
  onNextStep?: () => void;
  onPrevStep?: () => void;
  onEndTour: () => void;
}

export const SoftStarterGuidedTour: React.FC<SoftStarterGuidedTourProps> = ({
  isActive,
  onEndTour,
}) => {
  const mappedSteps: TourStepSpec[] = SOFT_STARTER_TOUR_STEPS.map((s) => ({
    id: s.id,
    title: s.title,
    targetId: `#${s.targetElementId}`,
    description: s.content,
    teachingPoint: s.presetNote,
  }));

  return (
    <SpotlightTour
      steps={mappedSteps}
      isOpen={isActive}
      onClose={onEndTour}
    />
  );
};
