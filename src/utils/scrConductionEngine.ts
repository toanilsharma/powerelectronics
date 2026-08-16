import { ActiveFaults, BridgeConductionState, SCRDeviceState, SCRId } from '../types/batteryCharger';

export interface ConductionEngineParams {
  electricalAngleDeg: number; // Current theta in [0, 360)
  firingAngleDeg: number;     // Firing angle alpha in degrees [0, 180]
  sourceInductanceMh?: number;// Source leakage inductance Ls in mH (default 0.8mH)
  voltageIn?: number;          // Line voltage VLL RMS (default 415V)
  loadCurrentA?: number;       // DC load current Idc (default 50A)
  q1Closed?: boolean;          // Main AC incoming breaker
  isRunning?: boolean;         // Simulator run state
  activeFaults?: ActiveFaults; // Injected fault flags
}

/**
 * Calculates the exact instantaneous electrical state of a 3-Phase 6-Pulse SCR Bridge Rectifier.
 * Authoritative source of truth for SLD graphics, Oscilloscope Waveforms, Gate Pulse Timelines, and Telemetry.
 */
export function calculateSCRConductionState(params: ConductionEngineParams): BridgeConductionState {
  const {
    electricalAngleDeg,
    firingAngleDeg,
    sourceInductanceMh = 0.8,
    voltageIn = 415,
    loadCurrentA = 50,
    q1Closed = true,
    isRunning = true,
    activeFaults,
  } = params;

  // Normalize angle theta to [0, 360)
  const theta = ((electricalAngleDeg % 360) + 360) % 360;
  const alpha = Math.max(0, Math.min(170, firingAngleDeg));

  // Determine if AC power & gate controls are operational
  const lostPhasesCount =
    (activeFaults?.acPhaseLossL1 ? 1 : 0) +
    (activeFaults?.acPhaseLossL2 ? 1 : 0) +
    (activeFaults?.acPhaseLossL3 ? 1 : 0);

  const isControlActive = q1Closed && isRunning && !activeFaults?.controlFuseBlown && lostPhasesCount < 2;

  // 1. Calculate Commutation Overlap Angle (mu)
  // cos(alpha + mu) = cos(alpha) - (2 * omega * Ls * Idc) / (sqrt(2) * VLL)
  let muDeg = 0;
  if (isControlActive && loadCurrentA > 0 && sourceInductanceMh > 0) {
    const omega = 2 * Math.PI * 50; // 50 Hz system
    const Ls = sourceInductanceMh * 1e-3;
    const vPeakLine = Math.SQRT2 * voltageIn;
    const term = (2 * omega * Ls * loadCurrentA) / Math.max(1, vPeakLine);
    const cosAlpha = Math.cos((alpha * Math.PI) / 180);
    const cosAlphaPlusMu = Math.max(-1, Math.min(1, cosAlpha - term));
    const alphaPlusMuDeg = (Math.acos(cosAlphaPlusMu) * 180) / Math.PI;
    muDeg = Math.max(0, Math.min(55, alphaPlusMuDeg - alpha));
  }

  // Initial SCR state map (all OFF by default)
  const scrStates: Record<SCRId, SCRDeviceState> = {
    T1: 'OFF',
    T2: 'OFF',
    T3: 'OFF',
    T4: 'OFF',
    T5: 'OFF',
    T6: 'OFF',
  };

  const activeGateSCRs: SCRId[] = [];
  const conductingSCRs: SCRId[] = [];

  if (!isControlActive) {
    // System powered off or tripped by blown fuse / AC loss
    return {
      electricalAngleDeg: theta,
      firingAngleDeg: alpha,
      overlapAngleDeg: 0,
      conductingSCRs: [],
      activeGateSCRs: [],
      isCommutating: false,
      outgoingSCR: null,
      incomingSCR: null,
      scrStates,
      activePhaseA: 'OFF',
      activePhaseB: 'OFF',
      activePhaseC: 'OFF',
      instantaneousLineVoltageName: 'OFF',
      instantaneousVdc: 0,
      statusText: q1Closed ? 'GATE CONTROL FUSE BLOWN (0V)' : 'MAIN BREAKER 52-Q1 OPEN',
    };
  }

  // 2. Identify Firing Pulse Window & Commutation Intervals
  // Natural commutation angles (alpha = 0°):
  // T1: 30°, T2: 90°, T3: 150°, T4: 210°, T5: 270°, T6: 330°
  const firingPoints: { id: SCRId; angle: number }[] = [
    { id: 'T1', angle: (30 + alpha) % 360 },
    { id: 'T2', angle: (90 + alpha) % 360 },
    { id: 'T3', angle: (150 + alpha) % 360 },
    { id: 'T4', angle: (210 + alpha) % 360 },
    { id: 'T5', angle: (270 + alpha) % 360 },
    { id: 'T6', angle: (330 + alpha) % 360 },
  ];

  // Gate pulse width = 20° duration
  firingPoints.forEach(({ id, angle }) => {
    let diff = (theta - angle + 360) % 360;
    if (diff <= 20) {
      activeGateSCRs.push(id);
    }
  });

  // Shift angle theta relative to natural firing offset (alpha + 30°)
  // Normalized angle thetaShift in [0, 360)
  const thetaShift = ((theta - (30 + alpha)) % 360 + 360) % 360;

  // Determine base 60° interval:
  // Interval 0 (0°..60°): T1 & T6 (Vab)
  // Interval 1 (60°..120°): T1 & T2 (Vac)
  // Interval 2 (120°..180°): T3 & T2 (Vbc)
  // Interval 3 (180°..240°): T3 & T4 (Vba)
  // Interval 4 (240°..300°): T5 & T4 (Vca)
  // Interval 5 (300°..360°): T5 & T6 (Vcb)
  const intervalIndex = Math.floor(thetaShift / 60) % 6;
  const angleInInterval = thetaShift % 60; // Offset inside 60° window

  // Natural pair for interval:
  const intervalPairs: { top: SCRId; bot: SCRId; line: string }[] = [
    { top: 'T1', bot: 'T6', line: 'Vab' },
    { top: 'T1', bot: 'T2', line: 'Vac' },
    { top: 'T3', bot: 'T2', line: 'Vbc' },
    { top: 'T3', bot: 'T4', line: 'Vba' },
    { top: 'T5', bot: 'T4', line: 'Vca' },
    { top: 'T5', bot: 'T6', line: 'Vcb' },
  ];

  const currentPair = intervalPairs[intervalIndex];
  const prevPair = intervalPairs[(intervalIndex + 5) % 6];

  let isCommutating = false;
  let outgoingSCR: SCRId | null = null;
  let incomingSCR: SCRId | null = null;
  let lineVoltageName = currentPair.line;

  // Check if we are inside commutation overlap window mu at start of interval
  if (angleInInterval < muDeg) {
    isCommutating = true;
    if (currentPair.top !== prevPair.top) {
      // Commutation on top rail (e.g. T5 -> T1 or T1 -> T3 or T3 -> T5)
      outgoingSCR = prevPair.top;
      incomingSCR = currentPair.top;
      conductingSCRs.push(prevPair.top, currentPair.top, currentPair.bot);
    } else {
      // Commutation on bottom rail (e.g. T6 -> T2 or T2 -> T4 or T4 -> T6)
      outgoingSCR = prevPair.bot;
      incomingSCR = currentPair.bot;
      conductingSCRs.push(currentPair.top, prevPair.bot, currentPair.bot);
    }
  } else {
    // Normal 2-SCR conduction
    conductingSCRs.push(currentPair.top, currentPair.bot);
  }

  // Handle injected Fault: SCR T3 Open
  if (activeFaults?.scrT3Open) {
    const idx = conductingSCRs.indexOf('T3');
    if (idx !== -1) {
      conductingSCRs.splice(idx, 1);
    }
  }

  // Set SCR states
  // Active conducting SCRs -> 'CONDUCTING' or 'COMMUTATING'
  // Gate pulse active SCRs -> 'GATE_PULSE' (if not conducting)
  // All other SCRs -> 'REVERSE_BIASED' or 'OFF'
  const allSCRs: SCRId[] = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
  allSCRs.forEach((id) => {
    if (conductingSCRs.includes(id)) {
      if (isCommutating && (id === outgoingSCR || id === incomingSCR)) {
        scrStates[id] = 'COMMUTATING';
      } else {
        scrStates[id] = 'CONDUCTING';
      }
    } else if (activeGateSCRs.includes(id)) {
      scrStates[id] = 'GATE_PULSE';
    } else {
      // Reverse biased or OFF based on AC phase polarity
      scrStates[id] = 'REVERSE_BIASED';
    }
  });

  // Calculate instantaneous Vdc(theta)
  const rad = (theta * Math.PI) / 180;
  const vPeak = Math.SQRT2 * (voltageIn / Math.sqrt(3)); // Peak phase voltage
  const va = vPeak * Math.sin(rad);
  const vb = vPeak * Math.sin(rad - (2 * Math.PI) / 3);
  const vc = vPeak * Math.sin(rad - (4 * Math.PI) / 3);

  let instantaneousVdc = 0;
  if (conductingSCRs.length >= 2) {
    let topV = 0;
    let botV = 0;

    if (conductingSCRs.includes('T1')) topV = va;
    else if (conductingSCRs.includes('T3')) topV = vb;
    else if (conductingSCRs.includes('T5')) topV = vc;

    if (conductingSCRs.includes('T4')) botV = va;
    else if (conductingSCRs.includes('T6')) botV = vb;
    else if (conductingSCRs.includes('T2')) botV = vc;

    if (isCommutating) {
      // Average voltage during 3-SCR overlap
      if (outgoingSCR === 'T1' || incomingSCR === 'T1' || outgoingSCR === 'T3' || incomingSCR === 'T3' || outgoingSCR === 'T5' || incomingSCR === 'T5') {
        // Top rail overlap
        if (conductingSCRs.includes('T1') && conductingSCRs.includes('T3')) topV = (va + vb) / 2;
        else if (conductingSCRs.includes('T3') && conductingSCRs.includes('T5')) topV = (vb + vc) / 2;
        else if (conductingSCRs.includes('T5') && conductingSCRs.includes('T1')) topV = (vc + va) / 2;
      } else {
        // Bottom rail overlap
        if (conductingSCRs.includes('T4') && conductingSCRs.includes('T6')) botV = (va + vb) / 2;
        else if (conductingSCRs.includes('T6') && conductingSCRs.includes('T2')) botV = (vb + vc) / 2;
        else if (conductingSCRs.includes('T2') && conductingSCRs.includes('T4')) botV = (vc + va) / 2;
      }
    }

    instantaneousVdc = Math.max(0, topV - botV);
  }

  // Compute Phase Line Active States for AC Line Flow Dots
  let activePhaseA: 'POS' | 'NEG' | 'COMMUTATING' | 'OFF' = 'OFF';
  let activePhaseB: 'POS' | 'NEG' | 'COMMUTATING' | 'OFF' = 'OFF';
  let activePhaseC: 'POS' | 'NEG' | 'COMMUTATING' | 'OFF' = 'OFF';

  if (conductingSCRs.includes('T1')) activePhaseA = 'POS';
  else if (conductingSCRs.includes('T4')) activePhaseA = 'NEG';

  if (conductingSCRs.includes('T3')) activePhaseB = 'POS';
  else if (conductingSCRs.includes('T6')) activePhaseB = 'NEG';

  if (conductingSCRs.includes('T5')) activePhaseC = 'POS';
  else if (conductingSCRs.includes('T2')) activePhaseC = 'NEG';

  if (isCommutating) {
    if (outgoingSCR === 'T1' || incomingSCR === 'T1' || outgoingSCR === 'T4' || incomingSCR === 'T4') activePhaseA = 'COMMUTATING';
    if (outgoingSCR === 'T3' || incomingSCR === 'T3' || outgoingSCR === 'T6' || incomingSCR === 'T6') activePhaseB = 'COMMUTATING';
    if (outgoingSCR === 'T5' || incomingSCR === 'T5' || outgoingSCR === 'T2' || incomingSCR === 'T2') activePhaseC = 'COMMUTATING';
  }

  // Build Status String
  let statusText = '';
  if (isCommutating && outgoingSCR && incomingSCR) {
    statusText = `COMMUTATION OVERLAP: ${outgoingSCR} → ${incomingSCR} (μ = ${muDeg.toFixed(1)}°)`;
  } else if (conductingSCRs.length > 0) {
    statusText = `${conductingSCRs.sort().join(' + ')} CONDUCTING (${lineVoltageName})`;
  } else {
    statusText = 'NO CONDUCTION (BLOCKED)';
  }

  return {
    electricalAngleDeg: theta,
    firingAngleDeg: alpha,
    overlapAngleDeg: muDeg,
    conductingSCRs,
    activeGateSCRs,
    isCommutating,
    outgoingSCR,
    incomingSCR,
    scrStates,
    activePhaseA,
    activePhaseB,
    activePhaseC,
    instantaneousLineVoltageName: lineVoltageName,
    instantaneousVdc,
    statusText,
  };
}
