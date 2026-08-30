import React, { useMemo } from 'react';
import { SpotlightTour } from './shared/SpotlightTour';
import { TourStepSpec } from '../engine/types';

interface DCDCTourOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  setTopology: (top: string) => void;
  setVin: (v: number) => void;
  setDuty: (d: number) => void;
  setFsw: (f: number) => void;
  setInductanceuH: (l: number) => void;
  setCapacitanceuF: (c: number) => void;
  setLoadR: (r: number) => void;
  setActiveFault: (fault: string | null) => void;
}

export const DCDCTourOverlay: React.FC<DCDCTourOverlayProps> = ({
  isOpen,
  onClose,
  setTopology,
  setVin,
  setDuty,
  setFsw,
  setInductanceuH,
  setCapacitanceuF,
  setLoadR,
  setActiveFault,
}) => {
  const steps: TourStepSpec[] = useMemo(
    () => [
      {
        id: 'why-dcdc',
        title: '1. Why DC-DC Converters in Substation Systems?',
        targetId: '#dc-header-title',
        description:
          'In electrical substations, a 48V DC station battery bus is stepped down to 19.2V DC to supply sensitive auxiliary loads, protection relays, and control panels (IEEE 946 / IEC 62040-3).',
        teachingPoint:
          'Linear regulators waste power as heat (η < 40%), while switching DC-DC converters achieve > 90% efficiency!',
        presetAction: () => {
          setTopology('buck');
          setVin(48);
          setDuty(40);
          setLoadR(10);
          setActiveFault(null);
        },
      },
      {
        id: 'meet-buck',
        title: '2. Meet the Power Components of the Buck Converter',
        targetId: '#dc-animated-sld',
        description:
          'The Buck converter consists of 4 primary components: High-Side MOSFET S1, Freewheel Diode D1, Power Inductor L, and Filter Capacitor C.',
        teachingPoint:
          'S1 chops input DC into high-frequency PWM pulses; D1 provides a recirculation path during switch OFF time; L & C smooth pulses into pure DC.',
      },
      {
        id: 'duty-cycle',
        title: '3. Duty Cycle Control (Vout = D · Vin)',
        targetId: '#dc-[#dc-duty-slider]',
        description:
          'The Duty Cycle D is the ratio of switch ON time to total switching period Tsw (D = Ton / Tsw). Output voltage is directly proportional to D.',
        teachingPoint: 'At Vin = 48V and Duty D = 40%, ideal Vout = 48V × 0.40 = 19.2V DC!',
        presetAction: () => {
          setDuty(40);
        },
      },
      {
        id: 'two-phases',
        title: '4. Two-State Switching & Scope Cursor Synchronization',
        targetId: '#dc-scope-strip',
        description:
          'Observe the time-dilated switching animation (dilated ×25,000). Phase 1 (S1 ON): Energy is stored in the Inductor magnetic field. Phase 2 (S1 OFF): Stored energy releases through Freewheel Diode D1.',
        teachingPoint:
          'The vertical laser cursor on the CRT scope strip moves in real-time synchronization with the SLD circuit conduction paths!',
      },
      {
        id: 'ripple-filter',
        title: '5. Inductor Current Ripple ΔIL & Output Voltage Ripple ΔVout',
        targetId: '#dc-scope-strip',
        description:
          'Inductor L limits peak-to-peak current ripple (ΔIL = 1.28A). Capacitor C filters voltage ripple (ΔVout = 19.61mV total with 10mΩ ESR).',
        teachingPoint:
          'Increasing inductance L (180µH) or switching frequency fsw (50kHz) shrinks ripple for clean DC power!',
        presetAction: () => {
          setInductanceuH(180);
          setCapacitanceuF(470);
          setFsw(50000);
        },
      },
      {
        id: 'ccm-dcm',
        title: '6. Continuous (CCM) vs Discontinuous (DCM) Conduction Mode',
        targetId: '#dc-[#dc-load-slider]',
        description:
          'In Continuous Conduction Mode (CCM), inductor current never touches 0A. Dropping load current below critical boundary (Iout_crit = ΔIL / 2 = 0.64A) enters DCM mode.',
        teachingPoint:
          'In DCM mode, inductor current touches zero each cycle, producing non-linear output voltage conversion ratios!',
        presetAction: () => {
          setLoadR(100); // Enters DCM mode (Iout ~ 0.29A < 0.64A)
        },
      },
      {
        id: 'losses-sankey',
        title: '7. Power Flow Sankey & Loss Breakdown',
        targetId: '#dc-sankey-panel',
        description:
          'Input Power Pin splits into Useful Output Power Pout plus 5 loss branches: MOSFET Conduction, Switching, Diode Forward, Inductor Core & DCR, and Capacitor ESR.',
        teachingPoint:
          'System efficiency η = Pout / (Pout + ΣPloss). SiC MOSFETs reduce switching losses by 60% vs legacy Silicon!',
        presetAction: () => {
          setLoadR(10); // Return to nominal load
        },
      },
      {
        id: 'soft-start',
        title: '8. Walk-In Soft Start Duty Ramp',
        targetId: '#dc-[#dc-soft-start-btn]',
        description:
          'Starting a converter instantly at 40% duty causes massive inrush current spikes. Soft start ramps duty from 10% to 40% over 10 seconds.',
        teachingPoint:
          'Controlled duty ramping protects station batteries and prevents nuisance circuit breaker tripping.',
      },
      {
        id: 'topologies',
        title: '9. Topology Morphing (Boost & SEPIC Converters)',
        targetId: '#dc-[#dc-topology-control]',
        description:
          'The simulator morphs between Buck (Step-Down), Boost (Step-Up 24V→48V for solar MPPT), Buck-Boost (Inverting -24V), and SEPIC (Non-Inverting 48V).',
        teachingPoint:
          'Boost steps up voltage when battery is discharged; SEPIC maintains stable output regardless of whether Vin is higher or lower than Vout!',
        presetAction: () => {
          setTopology('boost');
          setVin(24);
          setDuty(50);
        },
      },
      {
        id: 'protection',
        title: '10. Protection Relays & Fault Injection Laboratory',
        targetId: '#dc-[#dc-fault-lab]',
        description:
          'Test scenarios including S1 MOSFET Open/Short, Diode Open, Core Saturation, and High ESR degradation with interlock trips.',
        teachingPoint:
          'Congratulations! You have completed the Industrial DC-DC Converter Laboratory Tour.',
        presetAction: () => {
          setTopology('buck');
          setVin(48);
          setDuty(40);
          setLoadR(10);
        },
      },
    ],
    [
      setTopology,
      setVin,
      setDuty,
      setFsw,
      setInductanceuH,
      setCapacitanceuF,
      setLoadR,
      setActiveFault,
    ]
  );

  return <SpotlightTour steps={steps} isOpen={isOpen} onClose={onClose} />;
};
