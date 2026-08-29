import React, { useState, useEffect, useRef } from 'react';
import { MathLatex, MathText } from './MathLatex';
import {
  CheckCircle2,
  Zap,
  Play,
  Pause,
  Sliders,
  BookOpen,
  Activity,
  Cpu,
  Award,
  Info,
  Layers,
  Sparkles,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  BarChart2,
  Bell
} from 'lucide-react';
import { AlarmsAndAlertsModal } from './AlarmsAndAlertsModal';
import { AlarmEntry } from '../types/batteryCharger';

export type FoundationTopic = 'diode' | 'rectifiers' | 'transistor' | 'scr' | 'controlled' | 'pwm';

interface TopicMeta {
  id: FoundationTopic;
  title: string;
  badgeText: string;
  shortDesc: string;
  formula: string;
  standard: string;
  icon: string;
  colorHex: string;
  activeBg: string;
  inactiveBg: string;
  badgeBg: string;
  textHex: string;
}

const TOPICS: TopicMeta[] = [
  {
    id: 'diode',
    title: '1. Diode & PN Physics',
    badgeText: 'PN Junction & trr',
    shortDesc: 'Depletion layer barrier, forward/reverse bias, exponential V-I relationship, and Zener breakdown.',
    formula: 'I_D = I_s \\left( e^{\\frac{V_D}{\\eta V_T}} - 1 \\right)',
    standard: 'IEC 60747-2',
    icon: '⚡',
    colorHex: '#39c5cf',
    activeBg: 'bg-[#161b22] border-[#39c5cf]',
    inactiveBg: 'bg-[#161b22] border-[#30363d]',
    badgeBg: 'bg-[#39c5cf]/15 text-[#39c5cf] border-[#39c5cf]/40',
    textHex: 'text-[#39c5cf]'
  },
  {
    id: 'rectifiers',
    title: '2. Rectifier Circuits',
    badgeText: 'Uncontrolled Conv.',
    shortDesc: 'Half-wave, Full-wave Center-tap, 1-Phase Bridge, and 3-Phase 6-Diode uncontrolled rectifiers.',
    formula: 'V_{dc} = \\frac{2 V_m}{\\pi} \\approx 0.636 V_m \\quad (1\\phi \\text{ Bridge})',
    standard: 'IEC 60146-1-1',
    icon: '🌊',
    colorHex: '#58a6ff',
    activeBg: 'bg-[#161b22] border-[#58a6ff]',
    inactiveBg: 'bg-[#161b22] border-[#30363d]',
    badgeBg: 'bg-[#58a6ff]/15 text-[#58a6ff] border-[#58a6ff]/40',
    textHex: 'text-[#58a6ff]'
  },
  {
    id: 'transistor',
    title: '3. Transistor Switch',
    badgeText: 'BJT • MOSFET • IGBT',
    shortDesc: 'BJT saturation, Power MOSFET R_ds(on) dynamics, IGBT tail current, and inductive load flyback protection.',
    formula: 'P_{sw} = \\frac{1}{2} V_{dc} I_{load} f_{sw} (t_r + t_f)',
    standard: 'IEEE Std 1547',
    icon: '🔀',
    colorHex: '#e3b341',
    activeBg: 'bg-[#161b22] border-[#e3b341]',
    inactiveBg: 'bg-[#161b22] border-[#30363d]',
    badgeBg: 'bg-[#e3b341]/15 text-[#e3b341] border-[#e3b341]/40',
    textHex: 'text-[#e3b341]'
  },
  {
    id: 'scr',
    title: '4. SCR Thyristor',
    badgeText: 'PNPN Gate Latch',
    shortDesc: 'PNPN 4-layer structure, Gate pulse triggering, Latching current (I_L), and Holding current (I_H).',
    formula: 'I_A \\ge I_L \\; \\text{(Latch)}, \\quad I_A \\le I_H \\; \\text{(Turn OFF)}',
    standard: 'IEEE C37.90',
    icon: '🔥',
    colorHex: '#3fb950',
    activeBg: 'bg-[#161b22] border-[#3fb950]',
    inactiveBg: 'bg-[#161b22] border-[#30363d]',
    badgeBg: 'bg-[#3fb950]/15 text-[#3fb950] border-[#3fb950]/40',
    textHex: 'text-[#3fb950]'
  },
  {
    id: 'controlled',
    title: '5. Phase Control',
    badgeText: 'Controlled Rectifier',
    shortDesc: 'Single-phase & 3-phase 6-Pulse SCR bridge rectifiers with firing angle (α) delay control.',
    formula: 'V_{dc}(\\alpha) = \\frac{3\\sqrt{2}}{\\pi} V_{LL} \\cos\\alpha \\quad (3\\phi \\text{ 6-Pulse})',
    standard: 'IEEE Std 519',
    icon: '🎛️',
    colorHex: '#bc8cff',
    activeBg: 'bg-[#161b22] border-[#bc8cff]',
    inactiveBg: 'bg-[#161b22] border-[#30363d]',
    badgeBg: 'bg-[#bc8cff]/15 text-[#bc8cff] border-[#bc8cff]/40',
    textHex: 'text-[#bc8cff]'
  },
  {
    id: 'pwm',
    title: '6. Pulse Width Modulation',
    badgeText: 'Carrier Modulation',
    shortDesc: 'Single-Phase Half-Bridge SPWM Inverter: Fundamental RMS AC voltage V1(rms) is linearly controlled by modulation index Ma (for Ma ≤ 1.0) with carrier frequency fc and dead-time t_dead.',
    formula: 'V_{1(rms)} = M_a \\cdot \\frac{V_{dc}}{2\\sqrt{2}} \\quad (f_{out} = f_1, \\; f_{sw} = f_c)',
    standard: 'IEC 61800-9 / IEEE 519',
    icon: '⚡',
    colorHex: '#f472b6',
    activeBg: 'bg-[#161b22] border-[#f472b6]',
    inactiveBg: 'bg-[#161b22] border-[#30363d]',
    badgeBg: 'bg-[#f472b6]/15 text-[#f472b6] border-[#f472b6]/40',
    textHex: 'text-[#f472b6]'
  }
];

interface PowerSimFoundationLabProps {
  onNavigateToCharger?: () => void;
  onNavigateToOverview?: () => void;
}

export const PowerSimFoundationLab: React.FC<PowerSimFoundationLabProps> = ({ onNavigateToCharger, onNavigateToOverview }) => {
  const [activeTopic, setActiveTopic] = useState<FoundationTopic | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'controls' | 'circuit' | 'scope'>('controls');
  const [completedTopics, setCompletedTopics] = useState<Record<FoundationTopic, boolean>>({
    diode: false,
    rectifiers: false,
    transistor: false,
    scr: false,
    controlled: false,
    pwm: false,
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeSpeed, setTimeSpeed] = useState<number>(1.0); // 1.0 = Realtime, 0.5 = Slow, 0.25 = Super Slow, 0.1 = Ultra Slow
  const [time, setTime] = useState<number>(0);

  // --- TOPIC 1: DIODE LAB STATES ---
  const [diodeAcVac, setDiodeAcVac] = useState<number>(12); // 0-12V AC Source 50Hz
  const [diodeBias, setDiodeBias] = useState<number>(0.0); // Bias -5V to +1V
  const [diodeLoad, setDiodeLoad] = useState<number>(100); // Load Resistor 10R - 1000R (100R default)
  const [diodeFault, setDiodeFault] = useState<'none' | 'short' | 'open' | 'leaky'>('none');
  const [diodeType, setDiodeType] = useState<'standard' | 'fast' | 'schottky'>('standard');
  const [diodeTemp, setDiodeTemp] = useState<number>(25); // Junction Temp Tj (25°C - 150°C)
  const [diodeFrequency, setDiodeFrequency] = useState<number>(10); // kHz switching frequency

  // --- TOPIC 2: RECTIFIER STATES ---
  const [rectifierType, setRectifierType] = useState<'half' | 'center_tap' | 'full_bridge' | 'three_phase'>('full_bridge');
  const [rectifierLoadType, setRectifierLoadType] = useState<'R' | 'RL' | 'RC'>('RC');
  const [filterCapacitance, setFilterCapacitance] = useState<number>(1000); // uF
  const [filterInductance, setFilterInductance] = useState<number>(100); // mH
  const [rectifierLoad, setRectifierLoad] = useState<number>(50); // Ohms
  const [rectifierVac, setRectifierVac] = useState<number>(110); // VRMS

  // --- TOPIC 3: TRANSISTOR SWITCH STATES ---
  const [transistorType, setTransistorType] = useState<'bjt' | 'mosfet' | 'igbt'>('mosfet');
  const [transistorSubView, setTransistorSubView] = useState<'junction' | 'schematic'>('junction');
  const [gateMode, setGateMode] = useState<'manual' | 'pwm'>('manual');
  const [pwmFreq, setPwmFreq] = useState<number>(10); // kHz
  const [pwmDuty, setPwmDuty] = useState<number>(50); // %
  const [hasFlyback, setHasFlyback] = useState<boolean>(true);
  const [isInductiveLoad, setIsInductiveLoad] = useState<boolean>(false);
  const [gateDriveOn, setGateDriveOn] = useState<boolean>(true);
  const [transistorFault, setTransistorFault] = useState<'none' | 'gate_open'>('none');
  const [transistorTemp, setTransistorTemp] = useState<number>(25); // Tj (25°C - 150°C)
  const [showMillerPlateau, setShowMillerPlateau] = useState<boolean>(true);
  const [transistorCurrent, setTransistorCurrent] = useState<number>(15); // Amps load
  const [busVoltage, setBusVoltage] = useState<number>(400); // Volts DC bus
  const [showCurrentFlow, setShowCurrentFlow] = useState<boolean>(true);
  const [currentVectorMode, setCurrentVectorMode] = useState<'electron' | 'conventional'>('electron');
  const [showMillerModal, setShowMillerModal] = useState<boolean>(false);
  const [activePhysicsHotspot, setActivePhysicsHotspot] = useState<string | null>(null);

  // Derived helper states
  const isPwmMode = gateMode === 'pwm';
  const gateVoltage = gateDriveOn ? (transistorType === 'igbt' ? 15.0 : 10.0) : 0.0;

  // --- TOPIC 4: SCR THYRISTOR STATES ---
  const [scrGatePulse, setScrGatePulse] = useState<boolean>(false);
  const [scrAnodeVin, setScrAnodeVin] = useState<number>(120); // V AC RMS
  const [scrLoadRes, setScrLoadRes] = useState<number>(30); // Ohms
  const [scrLatched, setScrLatched] = useState<boolean>(true);
  const [scrFiringAlpha, setScrFiringAlpha] = useState<number>(45); // Deg (0 - 180)
  const [scrGateCurrent, setScrGateCurrent] = useState<number>(85); // mA (10 - 100)
  const [scrFault, setScrFault] = useState<'none' | 'gate_open' | 'scr_short' | 'dv_dt'>('none');
  const [scrTemp, setScrTemp] = useState<number>(25); // Tj (25°C - 125°C)
  const [scrSnubber, setScrSnubber] = useState<boolean>(true); // Snubber protection
  const [scrCommutationTime, setScrCommutationTime] = useState<number>(40); // t_q in us
  const [activeScrExp, setActiveScrExp] = useState<number>(1);
  const [scrExpPrediction, setScrExpPrediction] = useState<string>('');

  // --- TOPIC 5: CONTROLLED RECTIFIERS STATES ---
  const [ctrlRectType, setCtrlRectType] = useState<'1ph_half' | '1ph_full' | '3ph_6pulse'>('3ph_6pulse');
  const [firingAngle, setFiringAngle] = useState<number>(60); // Deg
  const [ctrlLoadType, setCtrlLoadType] = useState<'r' | 'rl' | 'rle'>('rl');
  const [ctrlHasFwd, setCtrlHasFwd] = useState<boolean>(true);
  const [commutationLc, setCommutationLc] = useState<number>(1.5); // Transformer Leakage Inductance L_c in mH
  const [batteryEbat, setBatteryEbat] = useState<number>(48); // Battery Back-EMF in Volts for RLE
  const [ctrlLoadCurrent, setCtrlLoadCurrent] = useState<number>(20); // DC Load Current Idc in A
  const [showHarmonicSpectrum, setShowHarmonicSpectrum] = useState<boolean>(true);
  const [showPhasorDiagram, setShowPhasorDiagram] = useState<boolean>(true);

  // --- TOPIC 6: PULSE WIDTH MODULATION (PWM) STATES ---
  const [pwmModulationType, setPwmModulationType] = useState<'spwm' | 'svpwm' | 'bipolar' | 'unipolar'>('spwm');
  const [pwmMa, setPwmMa] = useState<number>(0.85); // Modulation Index Ma (0.1 to 1.25)
  const [pwmMf, setPwmMf] = useState<number>(21); // Frequency Ratio Mf = fc/f1 (9 to 99)
  const [pwmF1, setPwmF1] = useState<number>(50); // Fundamental Ref Freq f1 in Hz
  const [pwmFc, setPwmFc] = useState<number>(5000); // Carrier Freq fc in Hz
  const [pwmDeadTime, setPwmDeadTime] = useState<number>(1.5); // Dead time t_dead in us
  const [pwmScopeChannel, setPwmScopeChannel] = useState<'all' | 'ref_carrier' | 'gates' | 'vsw' | 'vout' | 'iout'>('all');
  const [pwmSimModelMode, setPwmSimModelMode] = useState<'practical' | 'ideal'>('practical');

  // --- DOMAIN 5: INTERNATIONAL SLD STANDARDS (IEC 60617 / IEEE 315) ---
  const [sldMode, setSldMode] = useState<'schematic' | 'iec60617'>('schematic');
  const [selectedSldSymbol, setSelectedSldSymbol] = useState<string | null>(null);
  const [voltsPerDiv, setVoltsPerDiv] = useState<number>(1.0);
  const [timePerDiv, setTimePerDiv] = useState<number>(1.0);
  const [showChannelA, setShowChannelA] = useState<boolean>(true);
  const [showChannelB, setShowChannelB] = useState<boolean>(true);
  const [showFftMode, setShowFftMode] = useState<boolean>(false);
  const [fuseBlown, setFuseBlown] = useState<boolean>(false);
  const [heatsinkRth, setHeatsinkRth] = useState<number>(1.2); // °C/W heatsink thermal resistance
  const [ambientTemp, setAmbientTemp] = useState<number>(30); // Ambient temp °C

  // --- DEDICATED FULLSCREEN SIMULATION ZONE & GUIDED ASSISTANT ---
  const [isSimulationZoneMode, setIsSimulationZoneMode] = useState<boolean>(false);
  const [simZoneStep, setSimZoneStep] = useState<number>(1);

  const getStepGuide = (topic: FoundationTopic, step: number) => {
    switch (topic) {
      case 'transistor':
        switch (step) {
          case 1:
            return {
              title: 'Step 1: Select Power Transistor Technology',
              desc: 'Choose BJT (NPN Current-Controlled), Power MOSFET (Voltage-Controlled), or IGBT (High-Power Density Hybrid).',
              hint: 'Click BJT, MOSFET, or IGBT button.'
            };
          case 2:
            return {
              title: 'Step 2: Set Operating DC Bus Voltage & Load Current',
              desc: 'Adjust DC Bus Voltage Vdc (12V–600V) and Load Current Ic/Id (0.1A–30A) to establish circuit Q-Point.',
              hint: 'Move DC Bus Voltage and Load Current sliders.'
            };
          case 3:
            return {
              title: 'Step 3: Trigger Base / Gate Drive Signal',
              desc: 'Press & hold "TRIGGER DRIVE" or select PWM Mode to trigger high-frequency switching.',
              hint: 'Press TRIGGER DRIVE button or select PWM Mode.'
            };
          case 4:
            return {
              title: 'Step 4: Inspect Carrier Drift & Output Characteristic Curve',
              desc: 'Observe electron (e-) and hole (h+) drift in 2D Junction and Q-Point transition into Saturation.',
              hint: 'Toggle between 2D Junction and IEC Schematic views.'
            };
          case 5:
            return {
              title: 'Step 5: Analyze Power Losses & Test Fault Injection',
              desc: 'Observe Conduction (Pcond) vs Switching (Psw) losses and test Gate Open Fault behavior.',
              hint: 'Click GATE OPEN FAULT button.'
            };
          default:
            return { title: 'Step 1: Setup Circuit', desc: 'Initialize transistor switch parameters.', hint: 'Adjust controls.' };
        }
      case 'scr':
        switch (step) {
          case 1:
            return {
              title: 'Step 1: Set AC Source Voltage & Load Resistance',
              desc: 'Adjust AC supply RMS voltage (Vac = 120V) and Load Resistance (Rl = 30Ω).',
              hint: 'Move AC Voltage and Load Resistance sliders.'
            };
          case 2:
            return {
              title: 'Step 2: Inject Gate Pulse or Set Firing Angle (α)',
              desc: 'Click "PULSE SCR GATE" or sweep Firing Angle α (0°–180°) to trigger PNPN gate latching.',
              hint: 'Click PULSE SCR GATE or adjust Firing Angle slider.'
            };
          case 3:
            return {
              title: 'Step 3: Observe Latching (IL) vs Holding Current (IH)',
              desc: 'Verify SCR stays latched ON even after Gate pulse drops to zero until current drops below IH = 50mA.',
              hint: 'Watch 4-layer PNPN carrier depletion collapse.'
            };
          case 4:
            return {
              title: 'Step 4: Analyze Anode Waveforms on Oscilloscope',
              desc: 'Examine Anode Voltage (Va) and Anode Current (Ia) switching transients on the scope.',
              hint: 'Inspect Channel A and Channel B waveforms.'
            };
          case 5:
            return {
              title: 'Step 5: Test dv/dt Fault & Snubber Dampening',
              desc: 'Simulate rapid voltage rise dv/dt false turn-on and toggle RC Snubber protection network.',
              hint: 'Click dv/dt FAULT or toggle Snubber Protection.'
            };
          default:
            return { title: 'Step 1: Setup SCR', desc: 'Initialize SCR parameters.', hint: 'Adjust sliders.' };
        }
      case 'diode':
        switch (step) {
          case 1:
            return {
              title: 'Step 1: Select Diode Semiconductor Tech',
              desc: 'Choose Standard PN (1N5408), Fast Recovery (MUR460), or Schottky Barrier (MBR20100).',
              hint: 'Select a diode technology type.'
            };
          case 2:
            return {
              title: 'Step 2: Apply Bias Voltage & Set Junction Temp',
              desc: 'Adjust Bias Voltage from Reverse (-5V) to Forward (+1V) and set Junction Temp Tj.',
              hint: 'Use the DC Bias slider.'
            };
          case 3:
            return {
              title: 'Step 3: Observe Recombination & Depletion Region',
              desc: 'Watch depletion layer collapse under forward bias (Vf > 0.7V) and electron-hole recombination.',
              hint: 'Inspect the 2D junction stage.'
            };
          case 4:
            return {
              title: 'Step 4: Measure Reverse Recovery Time (trr)',
              desc: 'Increase AC switching frequency to observe reverse recovery charge Qrr and Irm peak current.',
              hint: 'Adjust switching frequency slider.'
            };
          case 5:
            return {
              title: 'Step 5: Inject Faults (Short / Open / Leaky)',
              desc: 'Test junction short circuit, open circuit, or reverse leakage breakdown.',
              hint: 'Click Diode Short or Diode Open.'
            };
          default:
            return { title: 'Step 1: Diode Physics', desc: 'Set up diode bias.', hint: 'Use sliders.' };
        }
      case 'rectifiers':
        switch (step) {
          case 1:
            return {
              title: 'Step 1: Select Rectifier Topology',
              desc: 'Choose Half-Wave, Center-Tap, 1-Phase Bridge, or 3-Phase 6-Diode Bridge.',
              hint: 'Click a rectifier topology button.'
            };
          case 2:
            return {
              title: 'Step 2: Configure Output Load Filter',
              desc: 'Switch between Pure Resistive (R), Inductive (RL), and Capacitor Filtered (RC).',
              hint: 'Select R, RL, or RC filter type.'
            };
          case 3:
            return {
              title: 'Step 3: Adjust AC Supply Voltage & Capacitance',
              desc: 'Set AC Input RMS voltage (Vac) and Filter Capacitance (C in µF).',
              hint: 'Use Vac and Filter Capacitance sliders.'
            };
          case 4:
            return {
              title: 'Step 4: Measure DC Output & Ripple Voltage',
              desc: 'Observe rectified output Vdc = 0.636 * Vm and AC ripple voltage Vr(rms) on scope.',
              hint: 'Examine oscilloscope waveforms.'
            };
          case 5:
            return {
              title: 'Step 5: Inspect Diode Conduction Sequencing',
              desc: 'Observe alternating diode pair conduction (D1-D4 vs D2-D3) in 100% IEC 60617 schematic.',
              hint: 'Toggle between Schematic and 2D Junction view.'
            };
          default:
            return { title: 'Step 1: Rectifiers', desc: 'Select topology.', hint: 'Click button.' };
        }
      case 'controlled':
        switch (step) {
          case 1:
            return {
              title: 'Step 1: Select Controlled Converter Topology',
              desc: 'Select 1-Phase Half-Controlled, 1-Phase Full Bridge, or 3-Phase 6-Pulse SCR Converter.',
              hint: 'Click topology button.'
            };
          case 2:
            return {
              title: 'Step 2: Adjust Firing Angle Delay (α)',
              desc: 'Sweep firing angle α from 0° to 180° to control output DC voltage: Vdc(α) = Vdc0 * cos(α).',
              hint: 'Move Firing Angle α slider.'
            };
          case 3:
            return {
              title: 'Step 3: Select Load Type (R, RL, or Battery RLE)',
              desc: 'Observe continuous vs discontinuous current mode with inductive load and Back-EMF battery.',
              hint: 'Select R, RL, or RLE load type.'
            };
          case 4:
            return {
              title: 'Step 4: Observe Commutation Overlap Angle (γ)',
              desc: 'Increase transformer leakage inductance Lc to view source commutation overlap.',
              hint: 'Adjust Source Inductance Lc slider.'
            };
          case 5:
            return {
              title: 'Step 5: Analyze Harmonic Spectrum & Inverter Mode',
              desc: 'Sweep α > 90° under RLE load to observe regenerative inverter operation.',
              hint: 'Increase α past 90° and view Harmonic Spectrum.'
            };
          default:
            return { title: 'Step 1: Phase Control', desc: 'Select converter type.', hint: 'Click button.' };
        }
    }
  };

  // Animation Loop with Slow Motion Speed Multiplier
  const requestRef = useRef<number | null>(null);
  useEffect(() => {
    let lastTime = performance.now();
    const animate = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTime) / 1000;
        setTime((prev) => prev + delta * 2 * timeSpeed);
      }
      lastTime = now;
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, timeSpeed]);

  // Handle Mark as Completed
  const toggleTopicCompletion = (topic: FoundationTopic) => {
    setCompletedTopics((prev) => ({
      ...prev,
      [topic]: !prev[topic]
    }));
  };

  const completedCount = Object.values(completedTopics).filter(Boolean).length;
  const progressPct = (completedCount / 5) * 100;

  // Render Canvas Waveforms & IV Curves
  const ivCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Draw IV Curve or Characteristic plot based on activeTopic
    const canvas = ivCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Axes
    const zeroX = w * 0.4;
    const zeroY = h * 0.7;

    ctx.strokeStyle = '#484f58';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(w, zeroY); // V axis
    ctx.moveTo(zeroX, 0);
    ctx.lineTo(zeroX, h); // I axis
    ctx.stroke();

    ctx.fillStyle = '#8b949e';
    ctx.font = '10px monospace';
    ctx.fillText('V', w - 15, zeroY - 5);
    ctx.fillText('I', zeroX + 5, 12);

    if (activeTopic === 'diode') {
      // Temperature dependent forward drop: Vf(Tj) = Vf25 - 2.1mV/°C * (Tj - 25)
      const baseKnee = diodeType === 'schottky' ? 0.38 : diodeType === 'fast' ? 1.05 : 0.70;
      const kneeV = Math.max(0.1, baseKnee - 0.0021 * (diodeTemp - 25));

      // Draw Diode Exponential IV Curve
      ctx.strokeStyle = diodeType === 'schottky' ? '#3fb950' : diodeType === 'fast' ? '#39c5cf' : '#e3b341';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      
      for (let px = 0; px < w; px++) {
        const v = (px - zeroX) / 25; // Scale: 25px = 1V
        let i = 0;

        if (diodeFault === 'short') {
          i = v * 50; // Linear resistor line through origin
        } else if (diodeFault === 'open') {
          i = 0; // Flat line
        } else if (diodeFault === 'leaky' && v < 0) {
          i = v * 10 * (1 + (diodeTemp - 25) * 0.02); // Leakage increases with temp
        } else if (v > 0) {
          // Exponential forward curve
          i = 0.001 * (Math.exp(v / (kneeV * 0.35)) - 1);
        } else {
          // Reverse leakage current doubling every 10°C rise
          const leakFactor = Math.pow(2, (diodeTemp - 25) / 10);
          i = -0.005 * leakFactor;
        }

        const py = zeroY - i * 15;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Operating Point Marker calculation
      const instantVin = Math.sin(time * 5) * (diodeAcVac * Math.SQRT2) + diodeBias;
      let currentVDd = instantVin;
      let currentIDd = 0;

      if (diodeFault === 'short') {
        currentVDd = 0;
        currentIDd = instantVin / diodeLoad;
      } else if (diodeFault === 'open') {
        currentVDd = instantVin;
        currentIDd = 0;
      } else if (instantVin > kneeV) {
        currentVDd = kneeV + (instantVin - kneeV) * 0.03;
        currentIDd = (instantVin - kneeV) / diodeLoad;
      } else if (instantVin < 0 && diodeFault === 'leaky') {
        currentVDd = instantVin;
        currentIDd = instantVin / (diodeLoad + 200); // Leakage current
      } else {
        currentVDd = instantVin;
        currentIDd = 0;
      }

      const opX = zeroX + currentVDd * 25;
      const opY = zeroY - currentIDd * 15;

      ctx.fillStyle = '#f85149';
      ctx.beginPath();
      ctx.arc(Math.max(10, Math.min(w - 10, opX)), Math.max(10, Math.min(h - 10, opY)), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`Q-Point (${diodeType.toUpperCase()}, Tj=${diodeTemp}°C): (${currentVDd.toFixed(2)}V, ${(currentIDd * 1000).toFixed(1)}mA)`, Math.min(w - 220, Math.max(10, opX + 10)), Math.max(20, Math.min(h - 15, opY - 10)));

    } else if (activeTopic === 'rectifiers' || activeTopic === 'controlled') {
      // Draw Transfer Curve Vdc vs Load or Alpha
      ctx.strokeStyle = '#58a6ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      if (activeTopic === 'controlled') {
        // Vdc vs Alpha curve: Vdc(alpha) = Vdc0 * cos(alpha)
        const vdc0 = ctrlRectType === '3ph_6pulse' ? (3 * Math.sqrt(2) / Math.PI) * 415 : (2 * Math.sqrt(2) / Math.PI) * 230;
        for (let px = 0; px < w; px++) {
          const deg = (px / w) * 180;
          const rad = (deg * Math.PI) / 180;
          const vdcVal = vdc0 * Math.cos(rad);
          const py = zeroY - (vdcVal / vdc0) * (h * 0.4);
          if (px === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Operating point marker for current firing angle
        const curX = (firingAngle / 180) * w;
        const curRad = (firingAngle * Math.PI) / 180;
        const curVdc = vdc0 * Math.cos(curRad);
        const curY = zeroY - (curVdc / vdc0) * (h * 0.4);

        ctx.fillStyle = '#f85149';
        ctx.beginPath();
        ctx.arc(curX, curY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`α=${firingAngle}°, Vdc=${curVdc.toFixed(1)}V`, Math.min(w - 120, curX + 8), curY - 8);
      } else {
        // Rectifier Ripple Factor vs Filter Parameter Curve
        const isCap = rectifierLoadType === 'RC';
        const baseRipple = rectifierType === 'three_phase' ? 4.2 : rectifierType === 'half' ? 121 : 48;

        for (let px = 0; px < w; px++) {
          const param = isCap ? (px / w) * 2000 : (px / w) * 500;
          const ripPct = isCap
            ? baseRipple / (1 + param * 0.003)
            : baseRipple / (1 + param * 0.01);
          const py = h - 20 - (ripPct / 130) * (h - 40);
          if (px === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        const curVal = isCap ? filterCapacitance : filterInductance;
        const curX = isCap ? (filterCapacitance / 2000) * w : (filterInductance / 500) * w;
        const ripPct = isCap
          ? baseRipple / (1 + filterCapacitance * 0.003)
          : baseRipple / (1 + filterInductance * 0.01);
        const curY = h - 20 - (ripPct / 130) * (h - 40);

        ctx.fillStyle = '#f85149';
        ctx.beginPath();
        ctx.arc(Math.max(10, Math.min(w - 10, curX)), Math.max(10, Math.min(h - 10, curY)), 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${isCap ? `C=${filterCapacitance}uF` : `L=${filterInductance}mH`}, Ripple=${ripPct.toFixed(1)}%`, Math.min(w - 160, Math.max(10, curX + 8)), Math.max(20, curY - 8));
      }

    } else if (activeTopic === 'transistor') {
      if (transistorType === 'bjt') {
        // Draw BJT Output Characteristics (Ic vs Vce for family of Ib curves)
        const baseCurrents = [20, 40, 60, 80, 100]; // Ib in mA
        const icLoadVal = transistorCurrent > 5 ? 5 : transistorCurrent;
        
        baseCurrents.forEach((ib) => {
          ctx.strokeStyle = ib === 100 ? '#3fb950' : '#484f58';
          ctx.lineWidth = ib === 100 ? 2 : 1;
          ctx.beginPath();
          for (let px = zeroX; px < w; px++) {
            const vce = (px - zeroX) / 12; // 12px per Volt
            // Saturation steep rise then flat Active region (Ic = hFE * Ib, hFE=50)
            const icActive = (ib / 1000) * 50; // hFE = 50 -> 20mA gives 1A, 100mA gives 5A
            const icSatSlope = vce * 12; // steep knee in saturation
            const ic = Math.min(icActive, icSatSlope);
            const py = zeroY - ic * 22;
            if (px === zeroX) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();

          // Curve label
          ctx.fillStyle = '#8b949e';
          ctx.font = '8px monospace';
          ctx.fillText(`Ib=${ib}mA`, w - 45, zeroY - (ib / 1000 * 50) * 22 - 2);
        });

        // Highlight Regions on Canvas
        ctx.fillStyle = 'rgba(63, 185, 80, 0.12)';
        ctx.fillRect(zeroX, 15, 25, zeroY - 25); // Saturation region box
        ctx.fillStyle = '#3fb950';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('SAT', zeroX + 3, 28);

        ctx.fillStyle = '#8b949e';
        ctx.font = '9px monospace';
        ctx.fillText('ACTIVE REGION (Ic = β·Ib)', zeroX + 45, 30);
        ctx.fillText('CUTOFF (Ib=0)', zeroX + 50, zeroY - 5);

        // Active Operating Q-Point
        const isCon = gateDriveOn && transistorFault !== 'gate_open';
        const curVce = isCon ? Math.min(1.2, Math.max(0.2, 0.3 + ((icLoadVal - 0.1) / 4.9) * 0.5)) : busVoltage;
        const curIc = isCon ? icLoadVal : 0;
        const opX = zeroX + Math.min(curVce, 24) * 12;
        const opY = zeroY - curIc * 22;

        ctx.fillStyle = '#f85149';
        ctx.beginPath();
        ctx.arc(Math.min(w - 15, Math.max(15, opX)), Math.max(15, Math.min(h - 15, opY)), 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(
          isCon ? `SAT: Vce=${curVce.toFixed(2)}V, Ic=${curIc.toFixed(1)}A` : `CUTOFF: Vce=${curVce.toFixed(1)}V, Ic=0A`,
          Math.min(w - 170, Math.max(10, opX - 30)),
          Math.max(20, opY - 10)
        );
      } else {
        // Draw MOSFET / IGBT Output Characteristics (Id vs Vds curves)
        const gateVoltages = [2, 4, 6, 8, 10];
        gateVoltages.forEach((vg) => {
          ctx.strokeStyle = vg === 8 ? '#d2a8ff' : '#484f58';
          ctx.lineWidth = vg === 8 ? 2 : 1;
          ctx.beginPath();
          for (let px = zeroX; px < w; px++) {
            const vds = (px - zeroX) / 15;
            // Saturation & Ohmic region model
            const id = Math.min(vg * 1.8, vds * vg * 0.4);
            const py = zeroY - id * 8;
            if (px === zeroX) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        });

        // Active Q-Point
        const curVds = gateDriveOn ? 0.8 : 24;
        const curId = gateDriveOn ? 12 : 0;
        const opX = zeroX + curVds * 15;
        const opY = zeroY - curId * 8;

        ctx.fillStyle = '#f85149';
        ctx.beginPath();
        ctx.arc(opX, opY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(gateDriveOn ? `ON State (Vds=0.8V, Id=12A)` : `OFF State (Vds=24V, Id=0A)`, Math.min(w - 150, opX + 10), opY - 10);
      }

    } else if (activeTopic === 'scr') {
      // Draw SCR Anode V-I Curve
      ctx.strokeStyle = '#e3b341';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      const isFired = scrFault === 'scr_short' || scrFault === 'dv_dt' || (scrFault !== 'gate_open' && scrLatched);

      // Forward blocking up to V_BO, then latching, then reverse breakdown
      for (let px = 0; px < w; px++) {
        const v = (px - zeroX) / 1.5; // Scale: 1.5px = 1V
        let i = 0;
        if (v < -150) {
          i = -Math.pow(-v - 150, 2) * 0.05;
        } else if (isFired && v > 1.2) {
          i = (v - 1.2) * 0.8;
        } else if (v > 200) {
          i = (v - 200) * 0.5; // Breakover V_BO
        } else {
          i = 0.01;
        }
        const py = zeroY - i * 1.2;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Latching & Holding thresholds
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#3fb950';
      ctx.beginPath();
      ctx.moveTo(zeroX, zeroY - 24);
      ctx.lineTo(w, zeroY - 24); // I_L = 80mA
      ctx.stroke();

      ctx.strokeStyle = '#f85149';
      ctx.beginPath();
      ctx.moveTo(zeroX, zeroY - 15);
      ctx.lineTo(w, zeroY - 15); // I_H = 50mA
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#3fb950';
      ctx.font = '9px monospace';
      ctx.fillText('Il = 80mA (Latching)', w - 100, zeroY - 27);
      ctx.fillStyle = '#f85149';
      ctx.fillText('Ih = 50mA (Holding)', w - 95, zeroY - 18);

      // Current Operating state point
      const curV = isFired ? 1.4 : scrAnodeVin;
      const curI = isFired ? scrAnodeVin / scrLoadRes : 0;
      const opX = zeroX + curV * 1.5;
      const opY = zeroY - curI * 1.2;

      ctx.fillStyle = scrFault !== 'none' ? '#da3633' : '#3fb950';
      ctx.beginPath();
      ctx.arc(Math.min(w - 15, Math.max(15, opX)), Math.max(10, Math.min(h - 10, opY)), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      
      let stateTxt = `LATCHED ON: V_AK=1.4V, I_A=${curI.toFixed(1)}A`;
      if (!isFired) stateTxt = `BLOCKING: V_AK=${scrAnodeVin}V, I_A=0A`;
      if (scrFault === 'gate_open') stateTxt = `GATE OPEN: No Firing, Vdc=0V`;
      if (scrFault === 'scr_short') stateTxt = `SCR SHORT: Continuous ON`;
      if (scrFault === 'dv_dt') stateTxt = `dv/dt SPIKE: False Firing`;

      ctx.fillText(stateTxt, Math.min(w - 180, Math.max(10, opX - 50)), Math.max(20, opY - 10));
    }
  }, [
    activeTopic,
    diodeAcVac,
    diodeBias,
    diodeLoad,
    diodeFault,
    rectifierType,
    filterCapacitance,
    transistorType,
    gateDriveOn,
    scrLatched,
    scrAnodeVin,
    scrLoadRes,
    scrFiringAlpha,
    scrGateCurrent,
    scrFault,
    firingAngle,
    ctrlRectType
  ]);

  // Waveform Scope Canvas Effect
  useEffect(() => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const midY = h / 2;
    const vScale = (h * 0.35) * voltsPerDiv;
    const timeScale = 0.05 / timePerDiv;

    // Channel 1: Input AC Waveform(s)
    if (activeTopic === 'rectifiers' && rectifierType === 'three_phase') {
      // 3-Phase AC Inputs: Phase A (Red), Phase B (Blue), Phase C (Yellow)
      for (let phase = 0; phase < 3; phase++) {
        ctx.strokeStyle = phase === 0 ? '#f85149' : phase === 1 ? '#58a6ff' : '#e3b341';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const phaseOffset = (phase * 2 * Math.PI) / 3;
        for (let x = 0; x < w; x++) {
          const tVal = time * 3 + x * timeScale;
          const vPhase = Math.sin(tVal - phaseOffset) * vScale;
          const py = midY - vPhase;
          if (x === 0) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        }
        ctx.stroke();
      }
    } else if (activeTopic === 'rectifiers' && rectifierType === 'center_tap') {
      // Center-tapped 2-phase AC: Vac1 (Blue), Vac2 Inverted (Light Blue)
      ctx.strokeStyle = '#58a6ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const tVal = time * 3 + x * timeScale;
        const py = midY - Math.sin(tVal) * vScale;
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();

      ctx.strokeStyle = '#79c0ff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const tVal = time * 3 + x * timeScale;
        const py = midY - (-Math.sin(tVal)) * vScale;
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Single phase AC input (Blue)
      ctx.strokeStyle = '#58a6ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const tVal = time * 3 + x * timeScale;
        const vAcPeak = (diodeAcVac * Math.SQRT2);
        const vInMag = activeTopic === 'diode'
          ? Math.sin(tVal) * vAcPeak + diodeBias
          : Math.sin(tVal) * 12;
        const py = activeTopic === 'diode' ? midY - (vInMag / 20) * (vScale * 1.14) : midY - Math.sin(tVal) * vScale;
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();
    }

    // Channel 2: Output / Load Waveform Vout(t) (Green/Cyan/Amber)
    if (activeTopic === 'rectifiers') {
      // Raw pulsating DC reference line (Dashed Amber)
      ctx.strokeStyle = '#d29922';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const tVal = time * 3 + x * timeScale;
        let vRaw = 0;
        if (rectifierType === 'half') {
          vRaw = Math.max(0, Math.sin(tVal));
        } else if (rectifierType === 'center_tap' || rectifierType === 'full_bridge') {
          vRaw = Math.abs(Math.sin(tVal));
        } else if (rectifierType === 'three_phase') {
          const vA = Math.sin(tVal);
          const vB = Math.sin(tVal - (2 * Math.PI) / 3);
          const vC = Math.sin(tVal + (2 * Math.PI) / 3);
          vRaw = Math.max(
            Math.abs(vA - vB),
            Math.abs(vB - vC),
            Math.abs(vC - vA)
          ) / Math.sqrt(3);
        }
        const py = midY - vRaw * vScale;
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Filtered Output Waveform (Green for RC, Cyan for RL, Amber for R)
      ctx.strokeStyle = rectifierLoadType === 'RL' ? '#39c5cf' : rectifierLoadType === 'RC' ? '#3fb950' : '#e3b341';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const tVal = time * 3 + x * timeScale;
        let vRaw = 0;
        if (rectifierType === 'half') {
          vRaw = Math.max(0, Math.sin(tVal));
        } else if (rectifierType === 'center_tap' || rectifierType === 'full_bridge') {
          vRaw = Math.abs(Math.sin(tVal));
        } else if (rectifierType === 'three_phase') {
          const vA = Math.sin(tVal);
          const vB = Math.sin(tVal - (2 * Math.PI) / 3);
          const vC = Math.sin(tVal + (2 * Math.PI) / 3);
          vRaw = Math.max(
            Math.abs(vA - vB),
            Math.abs(vB - vC),
            Math.abs(vC - vA)
          ) / Math.sqrt(3);
        }

        let vout = vRaw;
        if (rectifierLoadType === 'RC' && filterCapacitance > 0) {
          const baseRip = rectifierType === 'three_phase' ? 0.042 : rectifierType === 'half' ? 1.21 : 0.48;
          const filterCoeff = 1 / (1 + (filterCapacitance / 200) * (rectifierLoad / 50));
          const effectiveMin = 1 - baseRip * filterCoeff;
          vout = Math.max(vRaw, effectiveMin);
        } else if (rectifierLoadType === 'RL' && filterInductance > 0) {
          const indCoeff = 1 / (1 + (filterInductance / 50));
          const avgVal = rectifierType === 'three_phase' ? 0.95 : rectifierType === 'half' ? 0.318 : 0.636;
          vout = avgVal + (vRaw - avgVal) * indCoeff;
        }

        const py = midY - vout * vScale;
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();
    } else {
      ctx.strokeStyle = activeTopic === 'scr' || activeTopic === 'controlled' ? '#e3b341' : '#3fb950';
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      for (let x = 0; x < w; x++) {
        const tVal = time * 3 + x * timeScale;
        let vout = 0;

        if (activeTopic === 'diode') {
          const vAcPeak = (diodeAcVac * Math.SQRT2);
          const vinInstant = Math.sin(tVal) * vAcPeak + diodeBias;
          const phasePos = (tVal % (Math.PI * 2));

          if (diodeFault === 'short') {
            vout = vinInstant;
          } else if (diodeFault === 'open') {
            vout = 0;
          } else if (diodeFault === 'leaky') {
            vout = vinInstant > 0.7 ? vinInstant - 0.7 : vinInstant * 0.25;
          } else {
            // Normal Diode Conduction + Reverse Recovery Irr Spike at phasePos = PI
            if (vinInstant > 0.7) {
              vout = vinInstant - 0.7;
            } else if (phasePos >= Math.PI && phasePos <= Math.PI + 0.4) {
              // Reverse Recovery Current Spike (I_rm * exp(-t/tau))
              const trrMagnitude = diodeType === 'standard' ? 0.8 : diodeType === 'fast' ? 0.25 : 0.03;
              const dt = phasePos - Math.PI;
              const irrSpike = -trrMagnitude * Math.sin(dt * (Math.PI / 0.4)) * Math.exp(-dt * 5);
              vout = irrSpike * vAcPeak;
            } else {
              vout = 0;
            }
          }
          const py = midY - (vout / 20) * (vScale * 1.14);
          if (x === 0) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        } else if (activeTopic === 'transistor') {
          const pwmPeriod = Math.PI * 2 / (pwmFreq * 0.2);
          const cyclePos = (tVal % pwmPeriod) / pwmPeriod;
          
          if (gateMode === 'pwm') {
            // Render Drain Current / Vds waveform with Miller Effect transition step
            if (showMillerPlateau && (cyclePos < 0.08 || (cyclePos > (pwmDuty / 100) && cyclePos < (pwmDuty / 100) + 0.08))) {
              // Miller Plateau Step level
              vout = vScale * 0.51;
            } else if (cyclePos < (pwmDuty / 100)) {
              vout = vScale; // ON state
            } else {
              vout = 0; // OFF state
            }
          } else {
            vout = gateDriveOn && transistorFault !== 'gate_open' ? vScale : 0;
          }
          const py = midY - vout;
          if (x === 0) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        } else if (activeTopic === 'scr') {
          const radAlpha = (scrFiringAlpha * Math.PI) / 180;
          const phasePos = tVal % (Math.PI * 2);

          if (scrFault === 'gate_open') {
            vout = 0;
          } else if (scrFault === 'scr_short') {
            vout = Math.max(0, Math.sin(phasePos)) * vScale;
          } else if (scrFault === 'dv_dt') {
            // False triggering at alpha = 0° due to dv/dt spike
            vout = Math.max(0, Math.sin(phasePos)) * vScale;
          } else {
            // Normal SCR Firing
            if (phasePos >= radAlpha && phasePos <= Math.PI) {
              vout = Math.sin(phasePos) * vScale;
            } else {
              vout = 0;
            }
          }

          const py = midY - vout;
          if (x === 0) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        } else if (activeTopic === 'controlled') {
          const radAlpha = (firingAngle * Math.PI) / 180;
          const phasePos = (tVal % (Math.PI * 2));
          const wL = 2 * Math.PI * 50 * (commutationLc / 1000);
          const vLLpeak = 415 * Math.SQRT2;
          const cosAlpha = Math.cos(radAlpha);
          const cosAlphaMu = cosAlpha - (2 * wL * ctrlLoadCurrent) / (vLLpeak || 1);
          const muRad = Math.max(0, Math.acos(Math.min(1, Math.max(-1, cosAlphaMu))) - radAlpha);

          if (ctrlRectType === '3ph_6pulse') {
            // 3-Phase 6-Pulse line-to-line envelope with Commutation Overlap Notch
            const pulsePeriod = Math.PI / 3; // 60 degrees
            const posInPulse = (phasePos % pulsePeriod);
            const isCommutating = posInPulse < muRad;

            // Ideal 6-pulse line-to-line sinusoidal header
            let vLine = Math.sin((phasePos % pulsePeriod) + Math.PI / 3 + radAlpha) * vScale;

            if (isCommutating) {
              // Commutation Notch: Average of incoming and outgoing phase voltage
              vLine = vLine * 0.82; // Voltage drop during commutation interval
            }

            if (ctrlLoadType === 'rle') {
              const vBatNorm = (batteryEbat / 415) * vScale;
              vout = Math.max(vLine, vBatNorm); // DCM Battery voltage clamping
            } else if (ctrlLoadType === 'rl' && !ctrlHasFwd) {
              vout = vLine; // Allows negative voltage absorption
            } else {
              vout = Math.max(0, vLine);
            }
          } else {
            // 1-Phase Controlled Bridge
            if (phasePos >= radAlpha && phasePos <= Math.PI) {
              vout = Math.sin(phasePos) * vScale;
            } else if (phasePos >= Math.PI + radAlpha && phasePos <= Math.PI * 2) {
              vout = Math.abs(Math.sin(phasePos)) * vScale;
            } else {
              vout = ctrlLoadType === 'rl' && !ctrlHasFwd ? Math.sin(phasePos) * vScale : 0;
            }

            if (ctrlLoadType === 'rle') {
              const vBatNorm = (batteryEbat / 120) * vScale;
              if (vout < vBatNorm) vout = vBatNorm; // DCM Battery clamping
            }
          }

          const py = midY - vout;
          if (x === 0) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        } else if (activeTopic === 'pwm') {
          // Physics-Based SPWM Inverter Waveform Generation Logic
          const omega1 = 2 * Math.PI * (pwmF1 * 0.15);
          const vDcHalf = busVoltage / 2;
          
          // Reference Sine vRef(t) with Overmodulation Saturation
          const vRefUnclipped = Math.sin(tVal * omega1) * pwmMa;
          const vRef = Math.min(1.0, Math.max(-1.0, vRefUnclipped));

          // Triangle Carrier vTri(t) at frequency fc
          const carrierPeriodRad = (2 * Math.PI) / Math.max(5, (pwmFc / pwmF1) * 0.15);
          const phaseInCarrier = (tVal % carrierPeriodRad) / carrierPeriodRad;
          const vCarrier = phaseInCarrier < 0.5 ? (4 * phaseInCarrier - 1) : (3 - 4 * phaseInCarrier);

          // Dead-Time Insertion Logic (G1, G2)
          const carrierPeriodSec = 1 / Math.max(10, pwmFc);
          const deadTimeSec = (pwmDeadTime || 0) * 1e-6;
          const isDeadTimeActive = (tVal * pwmFc % 1) < (deadTimeSec * pwmFc);

          const g1Raw = vRef >= vCarrier;
          const g1 = !isDeadTimeActive && g1Raw;
          const g2 = !isDeadTimeActive && !g1Raw;

          // Switching Node Voltage Vsw
          let vSw = 0;
          if (g1) vSw = vDcHalf;
          else if (g2) vSw = -vDcHalf;
          else vSw = 0;

          // Filtered fundamental output voltage VOUT with Genuine Overmodulation Physics
          const v1RmsCalc = pwmMa <= 1.0 
            ? (pwmMa * vDcHalf) / Math.SQRT2 
            : (vDcHalf / Math.SQRT2) * (1.0 + 0.273 * (1 - Math.exp(-3.5 * (pwmMa - 1.0))));
          
          const vOutSin = Math.sin(tVal * omega1) * (v1RmsCalc * Math.SQRT2);
          const loadR = Math.max(1, rectifierLoad || 20);
          const iL = vOutSin / loadR;

          // Selectable Scope Waveform Channel
          if (pwmScopeChannel === 'ref_carrier') {
            vout = vRef * vScale * 0.6;
          } else if (pwmScopeChannel === 'gates') {
            vout = (g1 ? 1 : g2 ? -1 : 0) * vScale * 0.8;
          } else if (pwmScopeChannel === 'vsw') {
            vout = (vSw / (vDcHalf || 1)) * vScale * 0.8;
          } else if (pwmScopeChannel === 'vout') {
            vout = (vOutSin / (vDcHalf || 1)) * vScale * 0.8;
          } else if (pwmScopeChannel === 'iout') {
            vout = (iL / 10) * vScale * 0.8;
          } else {
            vout = ((vSw / (vDcHalf || 1)) * 0.45 + (vOutSin / (vDcHalf || 1)) * 0.55) * vScale * 0.8;
          }

          const py = midY - vout;
          if (x === 0) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        }
      }
      ctx.stroke();

      // Telemetry Overlay: Chopped Waveform & Slow Motion Badges
      if (activeTopic === 'scr' || activeTopic === 'controlled') {
        const alphaDeg = activeTopic === 'scr' ? scrFiringAlpha : firingAngle;
        ctx.fillStyle = alphaDeg > 0 ? '#f59e0b' : '#3fb950';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`✂️ CHOPPED WAVEFORM: α=${alphaDeg}°, Conduction=${180 - alphaDeg}°`, 10, 18);
      } else if (activeTopic === 'pwm') {
        const vDcHalf = busVoltage / 2;
        const isOvermod = pwmMa > 1.0;
        const v1Rms = !isOvermod
          ? (pwmMa * vDcHalf) / Math.SQRT2
          : (vDcHalf / Math.SQRT2) * (1.0 + 0.273 * (1 - Math.exp(-3.5 * (pwmMa - 1.0))));

        ctx.fillStyle = isOvermod ? '#f59e0b' : '#f472b6';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(
          `⚡ SPWM INVERTER: Ma=${pwmMa.toFixed(2)} ${isOvermod ? '⚠️ OVERMODULATION' : '(Linear)'} | V1(rms)=${v1Rms.toFixed(1)}V | fc=${pwmFc}Hz | t_dead=${pwmDeadTime.toFixed(1)}µs`,
          10,
          18
        );
      }
      if (timeSpeed < 1.0) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`🐢 SLOW MOTION: ${timeSpeed}x`, w - 120, 18);
      }

      // Live Synchronized Phase Needle Line & Conduction Bands Overlay
      const cursorX = (time * 80) % w;
      const currentPhaseRad = ((time * 3) + cursorX * 0.05) % (Math.PI * 2);
      const currentPhaseDeg = Math.round((currentPhaseRad * 180) / Math.PI);

      // Draw Conduction Bands along bottom of Canvas (y = h - 18 to h)
      ctx.fillStyle = '#161b22';
      ctx.fillRect(0, h - 22, w, 22);
      ctx.strokeStyle = '#30363d';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, h - 22, w, 22);

      // Conduction bands text & color coding
      for (let x = 0; x < w; x += 60) {
        const tValBand = time * 3 + x * 0.05;
        const phasePosRad = (tValBand % (Math.PI * 2));
        const phasePosDeg = (phasePosRad * 180) / Math.PI;

        let bandText = '';
        let bandColor = '#238636';

        if (activeTopic === 'rectifiers') {
          if (rectifierType === 'half') {
            const isOn = phasePosRad < Math.PI;
            bandText = isOn ? 'D1 ON' : 'D1 OFF (REV)';
            bandColor = isOn ? '#238636' : '#da3633';
          } else if (rectifierType === 'center_tap' || rectifierType === 'full_bridge') {
            const isPosHalf = phasePosRad < Math.PI;
            bandText = isPosHalf ? (rectifierType === 'center_tap' ? 'D1 ON' : 'D1+D2 ON') : (rectifierType === 'center_tap' ? 'D2 ON' : 'D3+D4 ON');
            bandColor = isPosHalf ? '#238636' : '#1f6beb';
          } else if (rectifierType === 'three_phase') {
            const seq3p = Math.floor((phasePosDeg / 60) % 6);
            const pairs3p = ['D1+D6', 'D1+D2', 'D3+D2', 'D3+D4', 'D5+D4', 'D5+D6'];
            bandText = pairs3p[seq3p] || 'D1+D6';
            bandColor = seq3p % 2 === 0 ? '#238636' : '#1f6beb';
          }
        } else if (activeTopic === 'controlled' || activeTopic === 'scr') {
          const alphaDeg = activeTopic === 'scr' ? scrFiringAlpha : firingAngle;
          const alphaRad = (alphaDeg * Math.PI) / 180;
          if (phasePosRad < alphaRad) {
            bandText = `α CHOP [0-${alphaDeg}°]`;
            bandColor = '#da3633';
          } else if (phasePosRad <= Math.PI) {
            bandText = 'FIRING CONDUCTING';
            bandColor = '#238636';
          } else {
            bandText = 'NATURAL COMMUTATION';
            bandColor = '#8957e5';
          }
        } else if (activeTopic === 'pwm') {
          const carrierPeriodSec = 1 / Math.max(10, pwmFc);
          const tMod = (time % carrierPeriodSec) / carrierPeriodSec;
          const deadTimeSec = (pwmDeadTime || 0) * 1e-6;
          const isDeadTimeActive = (tMod < deadTimeSec * pwmFc) || ((1 - tMod) < deadTimeSec * pwmFc);

          if (isDeadTimeActive) {
            bandText = `t_dead GAP (${pwmDeadTime.toFixed(1)}µs)`;
            bandColor = pwmDeadTime === 0 ? '#da3633' : '#f59e0b';
          } else {
            const omega1 = 2 * Math.PI * pwmF1;
            const instantRef = Math.sin(omega1 * time) * pwmMa;
            const instantCarrier = tMod < 0.5 ? (4 * tMod - 1) : (3 - 4 * tMod);
            const q1On = instantRef >= instantCarrier;

            bandText = q1On ? 'Q1 HIGH-SIDE' : 'Q2 LOW-SIDE';
            bandColor = q1On ? '#238636' : '#1f6beb';
          }
        }

        if (bandText) {
          ctx.fillStyle = bandColor + '40';
          ctx.fillRect(x, h - 21, 58, 20);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(bandText, x + 3, h - 8);
        }
      }

      // Vertical Glowing Needle Line at cursorX
      ctx.strokeStyle = '#3fb950';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, h - 22);
      ctx.stroke();
      ctx.setLineDash([]);

      // Needle glowing head
      ctx.fillStyle = '#3fb950';
      ctx.beginPath();
      ctx.arc(cursorX, h - 22, 4, 0, Math.PI * 2);
      ctx.fill();

      // Top Sync Readout Badge
      ctx.fillStyle = 'rgba(13, 17, 23, 0.85)';
      ctx.fillRect(8, 6, 320, 22);
      ctx.strokeStyle = '#30363d';
      ctx.strokeRect(8, 6, 320, 22);
      ctx.fillStyle = '#3fb950';
      ctx.font = 'bold 10px monospace';
      
      let activeDevStr = 'D1 Active';
      if (activeTopic === 'rectifiers') {
        if (rectifierType === 'half') activeDevStr = currentPhaseRad < Math.PI ? 'D1: CONDUCTING (VF=0.7V)' : 'D1: REVERSE BLOCKING';
        else if (rectifierType === 'center_tap') activeDevStr = currentPhaseRad < Math.PI ? 'D1: CONDUCTING | D2: OFF' : 'D2: CONDUCTING | D1: OFF';
        else if (rectifierType === 'full_bridge') activeDevStr = currentPhaseRad < Math.PI ? 'D1+D2: CONDUCTING | D3+D4: OFF' : 'D3+D4: CONDUCTING | D1+D2: OFF';
        else if (rectifierType === 'three_phase') {
          const s = Math.floor((currentPhaseDeg / 60) % 6);
          const p = ['D1+D6', 'D1+D2', 'D3+D2', 'D3+D4', 'D5+D4', 'D5+D6'];
          activeDevStr = `Pair ${p[s]} CONDUCTING`;
        }
      } else if (activeTopic === 'controlled' || activeTopic === 'scr') {
        const a = activeTopic === 'scr' ? scrFiringAlpha : firingAngle;
        activeDevStr = currentPhaseDeg < a ? `CHOPPED (0V, α=${a}°)` : `FIRING ACTIVE (ON)`;
      }

      ctx.fillText(`θ = ${currentPhaseDeg}° | ${activeDevStr}`, 14, 21);

      // Shaded area under Vout for SCR showing Vdc
      if (activeTopic === 'scr' && scrFault !== 'gate_open') {
        ctx.fillStyle = 'rgba(227, 179, 65, 0.25)';
        ctx.beginPath();
        ctx.moveTo(0, midY);
        for (let x = 0; x < w; x++) {
          const tVal = time * 3 + x * 0.05;
          const radAlpha = (scrFiringAlpha * Math.PI) / 180;
          const phasePos = tVal % (Math.PI * 2);
          let vout = 0;
          if (scrFault === 'scr_short' || scrFault === 'dv_dt') {
            vout = Math.max(0, Math.sin(phasePos)) * (h * 0.35);
          } else if (phasePos >= radAlpha && phasePos <= Math.PI) {
            vout = Math.sin(phasePos) * (h * 0.35);
          }
          ctx.lineTo(x, midY - vout);
        }
        ctx.lineTo(w, midY);
        ctx.closePath();
        ctx.fill();

        // Overlay Gate Pulse Spikes (Pink/Red)
        if (scrFault !== 'gate_open') {
          ctx.strokeStyle = '#f778ba';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let x = 0; x < w; x++) {
            const tVal = time * 3 + x * 0.05;
            const radAlpha = (scrFiringAlpha * Math.PI) / 180;
            const phasePos = tVal % (Math.PI * 2);
            // Pulse spike at radAlpha
            const isPulse = Math.abs(phasePos - radAlpha) < 0.08 || scrGatePulse;
            const pulseHeight = isPulse ? (scrGateCurrent / 100) * (h * 0.3) : 0;
            const py = midY - pulseHeight;
            if (x === 0) ctx.moveTo(x, py);
            else ctx.lineTo(x, py);
          }
          ctx.stroke();
        }

        // Live text label on scope canvas
        const calculatedVdc = scrFault === 'scr_short'
          ? (0.45 * scrAnodeVin)
          : (0.45 * scrAnodeVin * (1 + Math.cos((scrFiringAlpha * Math.PI) / 180)) / 2);
        ctx.fillStyle = '#e3b341';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`Shaded Area = Vdc (${calculatedVdc.toFixed(1)}V)`, 10, midY + (h * 0.4));
        ctx.fillStyle = '#f778ba';
        ctx.fillText(`Gate Ig Pulse (${scrGateCurrent}mA)`, w - 140, 20);
      }
    }
  }, [
    time,
    activeTopic,
    diodeAcVac,
    diodeBias,
    diodeLoad,
    diodeFault,
    rectifierType,
    rectifierLoadType,
    filterCapacitance,
    filterInductance,
    rectifierLoad,
    rectifierVac,
    pwmFreq,
    pwmDuty,
    scrLatched,
    scrAnodeVin,
    scrFiringAlpha,
    scrGateCurrent,
    scrFault,
    scrGatePulse,
    firingAngle,
    ctrlLoadType,
    ctrlHasFwd,
    voltsPerDiv,
    timePerDiv,
    showChannelA,
    showChannelB,
    showFftMode,
    fuseBlown
  ]);

  const activeMeta = TOPICS.find((t) => t.id === activeTopic) || TOPICS[0];

  const [showAlarmsModal, setShowAlarmsModal] = useState<boolean>(false);
  const [labAlarmLog, setLabAlarmLog] = useState<AlarmEntry[]>([
    {
      id: 'lab-init-1',
      time: new Date().toLocaleTimeString(),
      level: 'INFO',
      message: 'PowerElectronics Foundation Lab Initialized. Standards IEC 60747-2 & IEC 60146-1-1 active.',
    },
  ]);

  if (isSimulationZoneMode) {
    const activeMeta = TOPICS.find((t) => t.id === activeTopic) || TOPICS[0];
    const currentGuide = getStepGuide(activeTopic, simZoneStep);

    return (
      <div className="fixed inset-0 z-50 bg-[#0d1117] text-[#c9d1d9] font-mono flex flex-col h-screen overflow-y-auto select-none p-3 md:p-5">
        {/* TOP SIMULATION ZONE HEADER BAR */}
        <div className="bg-[#161b22] border-2 border-[#30363d] rounded-2xl p-3 md:p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <button
              onClick={() => setIsSimulationZoneMode(false)}
              className="px-4 py-2.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-white border-2 border-[#58a6ff] hover:border-[#79c0ff] text-xs font-bold font-mono flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
            >
              <ArrowRight className="w-4 h-4 rotate-180 text-[#58a6ff]" />
              <span className="font-extrabold tracking-wide">← EXIT SIMULATION ZONE (BACK TO LAB)</span>
            </button>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs font-bold text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3fb950] animate-ping" />
              <span>SIMULATION ZONE ACTIVE • 60 FPS</span>
            </div>
          </div>

          {/* TOPIC SELECTOR TABS INSIDE SIMULATION ZONE */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto p-1 bg-[#0d1117] border border-[#30363d] rounded-xl">
            {TOPICS.map((t) => {
              const isActive = activeTopic === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTopic(t.id);
                    setSimZoneStep(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#1f6beb] text-white shadow-lg border border-[#58a6ff]'
                      : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.badgeText}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTopic === 'transistor') {
                  setGateDriveOn(true);
                  setTransistorFault('none');
                  setBusVoltage(400);
                  setTransistorCurrent(15);
                  setPwmFreq(10);
                  setPwmDuty(50);
                } else if (activeTopic === 'scr') {
                  setScrGatePulse(false);
                  setScrFiringAlpha(45);
                  setScrFault('none');
                  setScrAnodeVin(120);
                }
                setSimZoneStep(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-xs font-bold text-[#c9d1d9] border border-[#30363d] flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET CIRCUIT</span>
            </button>
          </div>
        </div>

        {/* GUIDED NEXT-STEP ASSISTANT HUD */}
        <div className="mt-3 bg-gradient-to-r from-[#161b22] via-[#0d1117] to-[#161b22] border-2 border-[#58a6ff]/60 rounded-2xl p-3 md:p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2.5 bg-[#1f6beb]/20 border border-[#58a6ff] rounded-xl text-[#58a6ff] font-extrabold text-sm shrink-0">
              STEP {simZoneStep} / 5
            </div>
            <div>
              <div className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>{currentGuide.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#e3b341]/20 border border-[#e3b341] text-[#e3b341]">
                  INTERACTIVE GUIDE
                </span>
              </div>
              <div className="text-xs text-[#c9d1d9] mt-0.5">{currentGuide.desc}</div>
              <div className="text-xs text-[#3fb950] font-bold mt-0.5 flex items-center gap-1">
                <span>💡 Action:</span>
                <span>{currentGuide.hint}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5 mr-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSimZoneStep(s)}
                  className={`w-3.5 h-3.5 rounded-full transition-all cursor-pointer ${
                    simZoneStep === s
                      ? 'bg-[#58a6ff] ring-2 ring-white scale-125'
                      : simZoneStep > s
                      ? 'bg-[#3fb950]'
                      : 'bg-[#30363d]'
                  }`}
                  title={`Step ${s}`}
                />
              ))}
            </div>

            <button
              onClick={() => setSimZoneStep((prev) => Math.max(1, prev - 1))}
              disabled={simZoneStep === 1}
              className="px-3 py-1.5 rounded-lg bg-[#21262d] disabled:opacity-40 text-xs font-bold text-white border border-[#30363d] cursor-pointer"
            >
              ← Prev Step
            </button>
            <button
              onClick={() => setSimZoneStep((prev) => Math.min(5, prev + 1))}
              disabled={simZoneStep === 5}
              className="px-3.5 py-1.5 rounded-lg bg-[#1f6beb] hover:bg-[#388bfd] disabled:opacity-40 text-xs font-bold text-white border border-[#58a6ff] cursor-pointer flex items-center gap-1 shadow-md"
            >
              <span>Next Step →</span>
            </button>
          </div>
        </div>

        {/* PURE INTERACTIVE SIMULATOR WORKSPACE */}
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          {/* LEFT COLUMN: PURE CIRCUIT CONTROLS */}
          <div className="lg:col-span-3 bg-[#161b22] border border-[#30363d] p-4 rounded-2xl flex flex-col gap-4 shadow-xl">
            <div className="text-xs font-extrabold text-white uppercase tracking-wider border-b border-[#21262d] pb-2 flex justify-between items-center">
              <span>🎛️ PURE CIRCUIT CONTROLS</span>
              <span className="text-[10px] text-[#58a6ff]">{activeMeta.title}</span>
            </div>

            {/* RENDER CONTROLS SPECIFIC TO ACTIVE TOPIC */}
            {activeTopic === 'transistor' && (
              <div className="flex flex-col gap-3 text-xs">
                <div className={simZoneStep === 1 ? 'p-2.5 rounded-xl bg-[#1f6beb]/15 border-2 border-[#58a6ff] shadow-md' : ''}>
                  <label className="text-white block mb-1 font-bold">1. DEVICE TYPE:</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'bjt', label: 'BJT' },
                      { id: 'mosfet', label: 'MOSFET' },
                      { id: 'igbt', label: 'IGBT' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTransistorType(t.id as any);
                          if (simZoneStep === 1) setSimZoneStep(2);
                        }}
                        className={`py-1.5 rounded text-center text-xs font-extrabold uppercase transition-all cursor-pointer ${
                          transistorType === t.id
                            ? 'bg-[#8957e5] text-white border border-[#d2a8ff]'
                            : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d] hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={simZoneStep === 2 ? 'p-2.5 rounded-xl bg-[#1f6beb]/15 border-2 border-[#58a6ff] shadow-md' : ''}>
                  <div className="flex justify-between text-white font-bold mb-1">
                    <span>DC BUS VOLTAGE (Vdc):</span>
                    <span className="text-[#58a6ff]">{busVoltage} V</span>
                  </div>
                  <input
                    type="range"
                    min={transistorType === 'bjt' ? "12" : "100"}
                    max={transistorType === 'bjt' ? "24" : "600"}
                    step={transistorType === 'bjt' ? "1" : "25"}
                    value={busVoltage}
                    onChange={(e) => {
                      setBusVoltage(parseInt(e.target.value));
                      if (simZoneStep === 2) setSimZoneStep(3);
                    }}
                    className="w-full accent-[#58a6ff] h-2"
                  />

                  <div className="flex justify-between text-white font-bold mb-1 mt-2">
                    <span>LOAD CURRENT ({transistorType === 'bjt' ? 'Ic Load' : 'Id / Ic'}):</span>
                    <span className="text-[#e3b341]">
                      {transistorType === 'bjt' ? (transistorCurrent > 5 ? 5 : transistorCurrent).toFixed(1) : transistorCurrent} A
                    </span>
                  </div>
                  <input
                    type="range"
                    min={transistorType === 'bjt' ? "0.1" : "1"}
                    max={transistorType === 'bjt' ? "5.0" : "30"}
                    step={transistorType === 'bjt' ? "0.1" : "1"}
                    value={transistorType === 'bjt' && transistorCurrent > 5 ? 5 : transistorCurrent}
                    onChange={(e) => setTransistorCurrent(parseFloat(e.target.value))}
                    className="w-full accent-[#e3b341] h-2"
                  />
                </div>

                <div className={simZoneStep === 3 ? 'p-2.5 rounded-xl bg-[#1f6beb]/15 border-2 border-[#58a6ff] shadow-md' : ''}>
                  <label className="text-white block mb-1 font-bold">2. GATE / BASE DRIVE TRIGGER:</label>
                  <button
                    onMouseDown={() => { if (gateMode === 'manual') setGateDriveOn(true); }}
                    onMouseUp={() => { if (gateMode === 'manual') setGateDriveOn(false); }}
                    onClick={() => {
                      if (gateMode === 'manual') setGateDriveOn(!gateDriveOn);
                      if (simZoneStep === 3) setSimZoneStep(4);
                    }}
                    className={`w-full py-2.5 px-2 rounded-xl text-xs font-mono font-extrabold uppercase transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 border ${
                      transistorFault === 'gate_open'
                        ? 'bg-[#da3633] text-white border-[#f85149]'
                        : gateDriveOn
                        ? 'bg-[#238636] text-white border-[#3fb950] animate-pulse'
                        : 'bg-[#21262d] text-[#c9d1d9] border-[#30363d] hover:border-[#58a6ff]'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-yellow-300" />
                    <span>{gateDriveOn ? 'DRIVE HIGH [ON]' : 'PUSH / CLICK TO TRIGGER DRIVE [OFF]'}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-1 mt-2">
                    <button
                      onClick={() => setGateMode('manual')}
                      className={`py-1 rounded text-xs font-bold cursor-pointer ${
                        gateMode === 'manual' ? 'bg-[#1f6beb] text-white' : 'bg-[#0d1117] text-[#c9d1d9]'
                      }`}
                    >
                      MANUAL
                    </button>
                    <button
                      onClick={() => setGateMode('pwm')}
                      className={`py-1 rounded text-xs font-bold cursor-pointer ${
                        gateMode === 'pwm' ? 'bg-[#8957e5] text-white' : 'bg-[#0d1117] text-[#c9d1d9]'
                      }`}
                    >
                      PWM MODE
                    </button>
                  </div>
                </div>

                <div className={simZoneStep === 5 ? 'p-2.5 rounded-xl bg-[#1f6beb]/15 border-2 border-[#58a6ff] shadow-md' : ''}>
                  <label className="text-[#f85149] block mb-1 font-bold">3. FAULT TEST:</label>
                  <button
                    onClick={() => setTransistorFault(transistorFault === 'none' ? 'gate_open' : 'none')}
                    className={`w-full py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                      transistorFault === 'gate_open'
                        ? 'bg-[#da3633] text-white border border-[#f85149]'
                        : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d]'
                    }`}
                  >
                    {transistorFault === 'gate_open' ? '⚠️ GATE OPEN FAULT (ACTIVE)' : 'INJECT GATE OPEN FAULT'}
                  </button>
                </div>
              </div>
            )}

            {activeTopic === 'scr' && (
              <div className="flex flex-col gap-3 text-xs">
                <div className={simZoneStep === 1 ? 'p-2.5 rounded-xl bg-[#1f6beb]/15 border-2 border-[#58a6ff] shadow-md' : ''}>
                  <div className="flex justify-between text-white font-bold mb-1">
                    <span>AC SUPPLY VOLTAGE:</span>
                    <span className="text-[#58a6ff]">{scrAnodeVin} V RMS</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="240"
                    step="6"
                    value={scrAnodeVin}
                    onChange={(e) => setScrAnodeVin(parseInt(e.target.value))}
                    className="w-full accent-[#58a6ff] h-2"
                  />

                  <div className="flex justify-between text-white font-bold mb-1 mt-2">
                    <span>LOAD RESISTANCE:</span>
                    <span className="text-[#e3b341]">{scrLoadRes} Ω</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={scrLoadRes}
                    onChange={(e) => setScrLoadRes(parseInt(e.target.value))}
                    className="w-full accent-[#e3b341] h-2"
                  />
                </div>

                <div className={simZoneStep === 2 ? 'p-2.5 rounded-xl bg-[#1f6beb]/15 border-2 border-[#58a6ff] shadow-md' : ''}>
                  <label className="text-white block mb-1 font-bold">2. GATE TRIGGER CONTROL:</label>
                  <button
                    onMouseDown={() => {
                      setScrGatePulse(true);
                      setScrLatched(true);
                      if (simZoneStep === 2) setSimZoneStep(3);
                    }}
                    onMouseUp={() => setScrGatePulse(false)}
                    onClick={() => {
                      setScrLatched(!scrLatched);
                      if (simZoneStep === 2) setSimZoneStep(3);
                    }}
                    className={`w-full py-2.5 px-2 rounded-xl text-xs font-mono font-extrabold uppercase transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 border ${
                      scrLatched
                        ? 'bg-[#238636] text-white border-[#3fb950] animate-pulse'
                        : 'bg-[#21262d] text-[#c9d1d9] border-[#30363d]'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-yellow-300" />
                    <span>{scrLatched ? 'SCR LATCHED ON' : 'PULSE SCR GATE [CLICK TO LATCH]'}</span>
                  </button>

                  <div className="flex justify-between text-white font-bold mb-1 mt-2">
                    <span>FIRING ANGLE (α):</span>
                    <span className="text-[#3fb950]">{scrFiringAlpha}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    step="5"
                    value={scrFiringAlpha}
                    onChange={(e) => setScrFiringAlpha(parseInt(e.target.value))}
                    className="w-full accent-[#3fb950] h-2"
                  />
                </div>

                <div className={simZoneStep === 5 ? 'p-2.5 rounded-xl bg-[#1f6beb]/15 border-2 border-[#58a6ff] shadow-md' : ''}>
                  <label className="text-[#f85149] block mb-1 font-bold">3. FAULT & PROTECTION:</label>
                  <button
                    onClick={() => setScrFault(scrFault === 'none' ? 'dv_dt' : 'none')}
                    className={`w-full py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                      scrFault === 'dv_dt'
                        ? 'bg-[#da3633] text-white border border-[#f85149]'
                        : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d]'
                    }`}
                  >
                    {scrFault === 'dv_dt' ? '⚠️ dv/dt FAULT ACTIVE' : 'INJECT dv/dt FAULT'}
                  </button>
                  <button
                    onClick={() => setScrSnubber(!scrSnubber)}
                    className={`w-full py-1.5 mt-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                      scrSnubber ? 'bg-[#238636] text-white' : 'bg-[#21262d] text-[#c9d1d9]'
                    }`}
                  >
                    SNUBBER PROTECTION: {scrSnubber ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              </div>
            )}

            {(activeTopic === 'diode' || activeTopic === 'rectifiers' || activeTopic === 'controlled') && (
              <div className="text-xs text-[#8b949e] font-mono">
                Interactive parameters active for {activeMeta.title}. Adjust sliders to observe real-time response.
              </div>
            )}
          </div>

          {/* MIDDLE COLUMN: PURE VISUAL SIMULATOR STAGE */}
          <div className="lg:col-span-6 bg-[#161b22] border border-[#30363d] p-4 rounded-2xl flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#58a6ff]" />
                <span>REAL-TIME SIMULATOR STAGE</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTransistorSubView('junction')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    transistorSubView === 'junction' ? 'bg-[#1f6beb] text-white shadow-md' : 'bg-[#0d1117] text-[#8b949e] hover:text-white'
                  }`}
                >
                  2D CARRIER PHYSICS
                </button>
                <button
                  onClick={() => setTransistorSubView('schematic')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    transistorSubView === 'schematic' ? 'bg-[#238636] text-white shadow-md' : 'bg-[#0d1117] text-[#8b949e] hover:text-white'
                  }`}
                >
                  100% IEC 60617 / IEEE 315 SLD SCHEME
                </button>
              </div>
            </div>

            {/* PURE CANVAS / SVG VISUAL STAGE */}
            <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden relative p-2 min-h-[300px] flex flex-col items-center justify-center">
              {activeTopic === 'controlled' && (
                <div className="w-full bg-[#161b22] border border-[#bc8cff]/50 rounded-lg p-2.5 mb-2 font-mono text-[11px] text-white shadow-md flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-[#bc8cff] uppercase tracking-wider flex items-center gap-1">
                      ⚡ SYSTEM HEADER:
                    </span>
                    <span className="bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d] text-[#c9d1d9]">
                      V<sub>LL</sub> = <b className="text-white">415V RMS</b>
                    </span>
                    <span className="bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d] text-[#c9d1d9]">
                      f = <b className="text-white">50Hz</b> (ω=314.16 rad/s)
                    </span>
                    <span className="bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d] text-[#c9d1d9]">
                      V<sub>dc0</sub> = 1.35 × V<sub>LL</sub> = <b className="text-[#3fb950]">560.4V</b>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-[#0d1117] px-2 py-0.5 rounded border border-[#58a6ff]/40 text-[#58a6ff] font-bold">
                      Formula: V<sub>dc</sub> = V<sub>dc0</sub>·cosα - ΔV
                    </span>
                    <span className="bg-[#0d1117] px-2 py-0.5 rounded border border-[#e3b341]/40 text-[#e3b341]">
                      ΔV = (3/π)ωL<sub>c</sub>I<sub>dc</sub> = <b>{((3 / Math.PI) * 2 * Math.PI * 50 * (commutationLc / 1000) * ctrlLoadCurrent).toFixed(1)}V</b>
                    </span>
                    <span className="bg-[#238636]/30 border border-[#3fb950] px-2.5 py-0.5 rounded text-[#3fb950] font-extrabold text-xs">
                      V<sub>dc</sub> = {(((3 * Math.sqrt(2) / Math.PI) * 415) * Math.cos((firingAngle * Math.PI) / 180) - ((3 / Math.PI) * 2 * Math.PI * 50 * (commutationLc / 1000) * ctrlLoadCurrent)).toFixed(1)}V
                    </span>
                  </div>
                </div>
              )}
              <svg viewBox="0 0 500 280" className="w-full h-auto max-h-[340px]">
                {activeTopic === 'transistor' ? (
                  transistorSubView === 'junction' ? (
                    <g transform="translate(0, 15)">
                      <rect x="150" y="50" width="200" height="180" fill="#161b22" stroke="#30363d" strokeWidth="2" rx="8" />
                      <text x="250" y="30" textAnchor="middle" fill="#58a6ff" fontSize="11" fontWeight="bold">
                        {transistorType.toUpperCase()} SEMICONDUCTOR JUNCTION CARRIER DRIFT
                      </text>

                      <rect x="160" y="60" width="180" height="40" fill="#1f6beb" fillOpacity={0.3} stroke="#1f6beb" strokeWidth="1" />
                      <text x="250" y="85" textAnchor="middle" fill="#58a6ff" fontSize="10" fontWeight="bold">Collector (N-type)</text>

                      <rect x="160" y="100" width="180" height="50" fill="#8957e5" fillOpacity={0.3} stroke="#8957e5" strokeWidth="1" />
                      <text x="250" y="130" textAnchor="middle" fill="#d2a8ff" fontSize="10" fontWeight="bold">Base P-Layer (W_b = 2.5µm)</text>

                      <rect x="160" y="150" width="180" height="70" fill="#3fb950" fillOpacity={0.3} stroke="#3fb950" strokeWidth="1" />
                      <text x="250" y="190" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="bold">Emitter (Heavy N+)</text>

                      {gateDriveOn && transistorFault !== 'gate_open' && (
                        <g>
                          {[0, 0.25, 0.5, 0.75].map((offset, i) => {
                            const p = (time * 1.5 + offset) % 1;
                            return (
                              <circle key={i} cx={210 + (i % 2) * 40} cy={55 + p * 160} r="3.5" fill="#58a6ff" />
                            );
                          })}
                          {[0, 0.5].map((offset, i) => {
                            const p = (time * 2 + offset) % 1;
                            return (
                              <circle key={i} cx={50 + p * 110} cy="125" r="3.5" fill="#f85149" />
                            );
                          })}
                        </g>
                      )}
                    </g>
                  ) : (
                    <g transform="translate(0, 15)">
                    {/* --- EDUCATIONAL IEC 60617 / IEC 61082-1 SLD SCHEMATIC VIEW --- */}
                    {(() => {
                      const isConduction = gateDriveOn && transistorFault !== 'gate_open';
                      const isGateFault = transistorFault === 'gate_open';
                      const vSupply = 12.0;
                      const currentVal = isConduction ? (transistorCurrent > 0 ? transistorCurrent : 1.0) : 0.0;

                      let vSwitch = 12.0;
                      let vDrive = 0.0;
                      let rGateText = '10 Ω';
                      let deviceName = 'Power MOSFET (N-Channel)';
                      let vSwitchLabel = 'VDS';
                      let vDriveLabel = 'VGS';
                      let term1 = 'Drain (D)';
                      let term2 = 'Gate (G)';
                      let term3 = 'Source (S)';

                      if (transistorType === 'mosfet') {
                        deviceName = 'Power MOSFET (N-Channel Enhancement)';
                        vSwitchLabel = 'VDS';
                        vDriveLabel = 'VGS';
                        rGateText = '10 Ω';
                        vSwitch = isConduction ? 0.15 : 12.0;
                        vDrive = isConduction ? (gateVoltage > 0 ? gateVoltage : 10.0) : 0.0;
                        term1 = 'Drain (D)';
                        term2 = 'Gate (G)';
                        term3 = 'Source (S)';
                      } else if (transistorType === 'bjt') {
                        deviceName = 'NPN Transistor (BJT)';
                        vSwitchLabel = 'VCE';
                        vDriveLabel = 'VBE';
                        rGateText = '1.0 kΩ';
                        vSwitch = isConduction ? 0.30 : 12.0;
                        vDrive = isConduction ? 0.70 : 0.0;
                        term1 = 'Collector (C)';
                        term2 = 'Base (B)';
                        term3 = 'Emitter (E)';
                      } else if (transistorType === 'igbt') {
                        deviceName = 'N-Channel IGBT';
                        vSwitchLabel = 'VCE';
                        vDriveLabel = 'VGE';
                        rGateText = '10 Ω';
                        vSwitch = isConduction ? 1.50 : 12.0;
                        vDrive = isConduction ? (gateVoltage > 0 ? gateVoltage : 15.0) : 0.0;
                        term1 = 'Collector (C)';
                        term2 = 'Gate (G)';
                        term3 = 'Emitter (E)';
                      }

                      const vLoad = isConduction ? (vSupply - vSwitch).toFixed(2) : '0.00';

                      return (
                        <g transform="scale(0.92) translate(20, 5)">
                          {/* 1. SCHEMATIC HEADER BANNER */}
                          <text x="250" y="20" textAnchor="middle" fill="#d2a8ff" fontSize="11" fontFamily="monospace" fontWeight="bold">
                            EDUCATIONAL IEC 60617 / IEC 61082-1 SCHEMATIC — 12V DC SWITCHING CIRCUIT
                          </text>

                          <text x="250" y="35" textAnchor="middle" fill={isGateFault ? '#f85149' : isConduction ? '#3fb950' : '#8b949e'} fontSize="10" fontFamily="monospace" fontWeight="bold">
                            Q1: {deviceName} [{isGateFault ? '🚨 GATE OPEN FAULT' : isPwmMode ? `⚡ PWM SWITCHING (${pwmDuty}% DUTY)` : isConduction ? '✓ CONDUCTION (ON)' : 'OFF (CUTOFF)'}]
                          </text>

                          {/* 2. ORTHOGONAL CONDUCTOR WIRES (IEC 61082-1) */}
                          <path
                            d="M 50 115 L 50 60 L 420 60"
                            stroke={isConduction ? '#3fb950' : '#58a6ff'}
                            strokeWidth={isConduction ? '3' : '2.5'}
                            fill="none"
                          />
                          
                          <circle cx="50" cy="60" r="3.5" fill="#58a6ff" />
                          <circle cx="340" cy="60" r="3.5" fill={isConduction ? '#3fb950' : '#58a6ff'} />
                          <circle cx="420" cy="60" r="3.5" fill={isConduction ? '#3fb950' : '#58a6ff'} />

                          <path
                            d="M 340 115 L 340 150 L 250 150 L 250 162"
                            stroke={isConduction ? '#3fb950' : '#484f58'}
                            strokeWidth={isConduction ? '3' : '2.5'}
                            fill="none"
                          />

                          <path
                            d="M 420 115 L 420 150 L 340 150"
                            stroke={isConduction ? '#3fb950' : '#484f58'}
                            strokeWidth={isConduction ? '3' : '2.5'}
                            fill="none"
                          />
                          <circle cx="340" cy="150" r="3.5" fill={isConduction ? '#3fb950' : '#484f58'} />
                          <circle cx="420" cy="150" r="3.5" fill={isConduction ? '#3fb950' : '#484f58'} />

                          <path
                            d="M 250 218 L 250 240 L 50 240 L 50 145"
                            stroke={isConduction ? '#3fb950' : '#8b949e'}
                            strokeWidth={isConduction ? '3' : '2.5'}
                            fill="none"
                          />
                          <circle cx="250" cy="240" r="3.5" fill="#8b949e" />
                          <circle cx="50" cy="240" r="3.5" fill="#8b949e" />

                          {/* 3. V1 — 12 V DC POWER SUPPLY */}
                          <g transform="translate(50, 130)">
                            <circle cx="0" cy="0" r="15" fill="#161b22" stroke="#58a6ff" strokeWidth="2" />
                            <text x="0" y="-4" textAnchor="middle" fill="#f85149" fontSize="10" fontFamily="monospace" fontWeight="bold">+</text>
                            <text x="0" y="8" textAnchor="middle" fill="#58a6ff" fontSize="10" fontFamily="monospace" fontWeight="bold">−</text>
                            <text x="-25" y="-2" textAnchor="end" fill="#58a6ff" fontSize="9" fontFamily="monospace" fontWeight="bold">V1</text>
                            <text x="-25" y="10" textAnchor="end" fill="#8b949e" fontSize="8" fontFamily="monospace">12 V DC</text>
                          </g>
                          <text x="50" y="52" textAnchor="middle" fill="#f85149" fontSize="8" fontFamily="monospace" fontWeight="bold">+12V</text>
                          <text x="50" y="253" textAnchor="middle" fill="#58a6ff" fontSize="8" fontFamily="monospace" fontWeight="bold">0V / GND</text>

                          {/* 4. GATE DRIVER U1 & RESISTOR R1 */}
                          <g transform="translate(90, 190)">
                            <rect x="-24" y="-16" width="48" height="32" fill="#161b22" stroke={isGateFault ? '#f85149' : isConduction ? '#3fb950' : '#30363d'} strokeWidth="1.5" rx="4" />
                            <text x="0" y="-3" textAnchor="middle" fill="#58a6ff" fontSize="8" fontFamily="monospace" fontWeight="bold">U1 DRIVE</text>
                            <text x="0" y="9" textAnchor="middle" fill={isConduction ? '#3fb950' : '#8b949e'} fontSize="8" fontFamily="monospace">
                              {isPwmMode ? `PWM ${pwmDuty}%` : isConduction ? 'HIGH' : 'LOW'}
                            </text>
                          </g>

                          <line x1="114" y1="190" x2="135" y2="190" stroke={isGateFault ? '#f85149' : isConduction ? '#3fb950' : '#484f58'} strokeWidth="2" />

                          <g transform="translate(150, 190)">
                            <rect x="-15" y="-8" width="30" height="16" fill="#161b22" stroke="#d2a8ff" strokeWidth="1.5" rx="2" />
                            <text x="0" y="3" textAnchor="middle" fill="#d2a8ff" fontSize="8" fontFamily="monospace" fontWeight="bold">R1</text>
                            <text x="0" y="-12" textAnchor="middle" fill="#e3b341" fontSize="8" fontFamily="monospace">{rGateText}</text>
                          </g>

                          <line
                            x1="165"
                            y1="190"
                            x2="222"
                            y2="190"
                            stroke={isGateFault ? '#f85149' : isConduction ? '#3fb950' : '#484f58'}
                            strokeWidth="2"
                            strokeDasharray={isGateFault ? '3 3' : 'none'}
                          />

                          {isGateFault && (
                            <g transform="translate(193, 190)">
                              <circle cx="0" cy="0" r="7" fill="#da3633" />
                              <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">✕</text>
                            </g>
                          )}

                          {/* 5. LOAD (RL) & FREEWHEEL DIODE (D1) */}
                          <g transform="translate(340, 88)">
                            <circle
                              cx="0"
                              cy="0"
                              r="16"
                              fill={isConduction ? '#f59e0b' : '#161b22'}
                              stroke={isConduction ? '#fbbf24' : '#484f58'}
                              strokeWidth="2"
                            />
                            <path
                              d="M -7 5 L -3 -4 L 0 3 L 3 -4 L 7 5"
                              fill="none"
                              stroke={isConduction ? '#ffffff' : '#8b949e'}
                              strokeWidth="1.5"
                            />
                            {isConduction && (
                              <g stroke="#fbbf24" strokeWidth="1.5">
                                <line x1="-22" y1="0" x2="-18" y2="0" />
                                <line x1="18" y1="0" x2="22" y2="0" />
                                <line x1="0" y1="-22" x2="0" y2="-18" />
                                <line x1="-15" y1="-15" x2="-12" y2="-12" />
                                <line x1="15" y1="-15" x2="12" y2="-12" />
                              </g>
                            )}
                            <text x="-24" y="-3" textAnchor="end" fill="#fbbf24" fontSize="9" fontFamily="monospace" fontWeight="bold">RL</text>
                            <text x="-24" y="9" textAnchor="end" fill="#8b949e" fontSize="8" fontFamily="monospace">12V 12Ω</text>
                            <text x="24" y="3" textAnchor="start" fill={isConduction ? '#3fb950' : '#8b949e'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                              V_load = {vLoad}V
                            </text>
                          </g>

                          <g transform="translate(420, 88)">
                            <line x1="-10" y1="-10" x2="10" y2="-10" stroke="#e3b341" strokeWidth="2" />
                            <polygon points="0,-10 -10,10 10,10" fill="#161b22" stroke="#e3b341" strokeWidth="1.5" />
                            <line x1="0" y1="-10" x2="0" y2="-28" stroke={isConduction ? '#3fb950' : '#58a6ff'} strokeWidth="2" />
                            <line x1="0" y1="10" x2="0" y2="27" stroke={isConduction ? '#3fb950' : '#484f58'} strokeWidth="2" />
                            <text x="14" y="-2" textAnchor="start" fill="#e3b341" fontSize="8" fontFamily="monospace" fontWeight="bold">D1 (FWD)</text>
                            <text x="14" y="9" textAnchor="start" fill="#8b949e" fontSize="7" fontFamily="monospace">Freewheel</text>
                          </g>

                          {/* 6. AMMETER SENSOR A1 */}
                          <g transform="translate(295, 150)">
                            <circle cx="0" cy="0" r="10" fill="#161b22" stroke="#58a6ff" strokeWidth="1.5" />
                            <text x="0" y="3" textAnchor="middle" fill="#58a6ff" fontSize="9" fontFamily="monospace" fontWeight="bold">A1</text>
                            <text x="0" y="-13" textAnchor="middle" fill={isConduction ? '#3fb950' : '#8b949e'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                              I = {currentVal.toFixed(1)} A
                            </text>
                          </g>

                          {/* 7. STANDARDIZED IEC 60617 TRANSISTOR SYMBOL Q1 */}
                          <g transform="translate(250, 190)">
                            <circle
                              cx="0"
                              cy="0"
                              r="24"
                              fill="#161b22"
                              stroke={isGateFault ? '#f85149' : isConduction ? '#3fb950' : '#8957e5'}
                              strokeWidth="2"
                            />

                            {transistorType === 'mosfet' && (
                              <g>
                                <line x1="-12" y1="-14" x2="-12" y2="14" stroke="#ffffff" strokeWidth="2.5" />
                                <line x1="-6" y1="-14" x2="-6" y2="-6" stroke="#ffffff" strokeWidth="2.5" />
                                <line x1="-6" y1="-3" x2="-6" y2="3" stroke="#ffffff" strokeWidth="2.5" />
                                <line x1="-6" y1="6" x2="-6" y2="14" stroke="#ffffff" strokeWidth="2.5" />
                                <line x1="-6" y1="-10" x2="8" y2="-10" stroke="#58a6ff" strokeWidth="2" />
                                <line x1="8" y1="-10" x2="8" y2="-24" stroke="#58a6ff" strokeWidth="2" />
                                <line x1="-6" y1="10" x2="8" y2="10" stroke="#3fb950" strokeWidth="2" />
                                <line x1="8" y1="10" x2="8" y2="24" stroke="#3fb950" strokeWidth="2" />
                                <line x1="-6" y1="0" x2="8" y2="0" stroke="#ffffff" strokeWidth="2" />
                                <line x1="8" y1="0" x2="8" y2="10" stroke="#ffffff" strokeWidth="2" />
                                <polygon points="-6,0 2,-4 2,4" fill="#3fb950" />
                                <line x1="-24" y1="0" x2="-12" y2="0" stroke="#d2a8ff" strokeWidth="2" />
                              </g>
                            )}

                            {transistorType === 'bjt' && (
                              <g>
                                <line x1="-8" y1="-14" x2="-8" y2="14" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                                <line x1="-24" y1="0" x2="-8" y2="0" stroke="#d2a8ff" strokeWidth="2" />
                                <line x1="-8" y1="-8" x2="10" y2="-18" stroke="#58a6ff" strokeWidth="2" />
                                <line x1="10" y1="-18" x2="10" y2="-24" stroke="#58a6ff" strokeWidth="2" />
                                <line x1="-8" y1="8" x2="10" y2="18" stroke="#3fb950" strokeWidth="2" />
                                <line x1="10" y1="18" x2="10" y2="24" stroke="#3fb950" strokeWidth="2" />
                                <polygon points="10,18 0,11 4,21" fill="#3fb950" />
                              </g>
                            )}

                            {transistorType === 'igbt' && (
                              <g>
                                <line x1="-12" y1="-14" x2="-12" y2="14" stroke="#ffffff" strokeWidth="2.5" />
                                <line x1="-6" y1="-14" x2="-6" y2="14" stroke="#ffffff" strokeWidth="2.5" />
                                <line x1="-24" y1="0" x2="-12" y2="0" stroke="#d2a8ff" strokeWidth="2" />
                                <line x1="-6" y1="-8" x2="10" y2="-18" stroke="#58a6ff" strokeWidth="2" />
                                <line x1="10" y1="-18" x2="10" y2="-24" stroke="#58a6ff" strokeWidth="2" />
                                <line x1="-6" y1="8" x2="10" y2="18" stroke="#3fb950" strokeWidth="2" />
                                <line x1="10" y1="18" x2="10" y2="24" stroke="#3fb950" strokeWidth="2" />
                                <polygon points="10,18 0,11 4,21" fill="#3fb950" />
                              </g>
                            )}

                            <text x="14" y="-18" fill="#58a6ff" fontSize="8" fontFamily="monospace" fontWeight="bold">{term1[0]}</text>
                            <text x="-24" y="-8" fill="#d2a8ff" fontSize="8" fontFamily="monospace" fontWeight="bold">{term2[0]}</text>
                            <text x="14" y="22" fill="#3fb950" fontSize="8" fontFamily="monospace" fontWeight="bold">{term3[0]}</text>
                            <text x="32" y="3" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">Q1</text>

                            <text x="0" y="36" textAnchor="middle" fill={isGateFault ? '#f85149' : isConduction ? '#3fb950' : '#8b949e'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                              {isGateFault ? 'OPEN' : isConduction ? `SAT (${vSwitchLabel}=${vSwitch}V)` : `CUTOFF (${vSwitchLabel}=12V)`}
                            </text>
                          </g>

                          {/* 8. VOLTMETER PROBES (VGS/VBE & VDS/VCE) */}
                          <g transform="translate(195, 222)">
                            <rect x="-24" y="-8" width="48" height="16" fill="#161b22" stroke="#d2a8ff" strokeWidth="1" rx="3" />
                            <text x="0" y="3" textAnchor="middle" fill="#d2a8ff" fontSize="7" fontFamily="monospace" fontWeight="bold">
                              {vDriveLabel} = {vDrive.toFixed(1)}V
                            </text>
                          </g>

                          <g transform="translate(305, 190)">
                            <rect x="-26" y="-8" width="52" height="16" fill="#161b22" stroke="#e3b341" strokeWidth="1" rx="3" />
                            <text x="0" y="3" textAnchor="middle" fill="#e3b341" fontSize="7" fontFamily="monospace" fontWeight="bold">
                              {vSwitchLabel} = {vSwitch.toFixed(2)}V
                            </text>
                          </g>

                          {/* 9. GROUND / 0V RETURN SYMBOL */}
                          <g transform="translate(250, 245)">
                            <line x1="-14" y1="0" x2="14" y2="0" stroke="#8b949e" strokeWidth="2.5" />
                            <line x1="-9" y1="4" x2="9" y2="4" stroke="#8b949e" strokeWidth="2" />
                            <line x1="-4" y1="8" x2="4" y2="8" stroke="#8b949e" strokeWidth="1.5" />
                            <text x="0" y="18" textAnchor="middle" fill="#8b949e" fontSize="7" fontFamily="monospace">0V / GND</text>
                          </g>

                          {/* 10. ANIMATED CURRENT FLOW DOTS WHEN ON */}
                          {isConduction && (
                            <g>
                              {[0, 0.2, 0.4, 0.6, 0.8].map((offset, i) => {
                                const p = (time * 1.2 + offset) % 1;
                                let cx = 50;
                                let cy = 60;
                                if (p < 0.3) {
                                  cx = 50 + (p / 0.3) * 290;
                                  cy = 60;
                                } else if (p < 0.5) {
                                  const p2 = (p - 0.3) / 0.2;
                                  if (p2 < 0.6) {
                                    cx = 340;
                                    cy = 60 + (p2 / 0.6) * 90;
                                  } else {
                                    cx = 340 - ((p2 - 0.6) / 0.4) * 90;
                                    cy = 150;
                                  }
                                } else if (p < 0.8) {
                                  const p3 = (p - 0.5) / 0.3;
                                  cx = 250;
                                  cy = 150 + p3 * 90;
                                } else {
                                  const p4 = (p - 0.8) / 0.2;
                                  if (p4 < 0.7) {
                                    cx = 250 - (p4 / 0.7) * 200;
                                    cy = 240;
                                  } else {
                                    cx = 50;
                                    cy = 240 - ((p4 - 0.7) / 0.3) * 110;
                                  }
                                }
                                return <circle key={i} cx={cx} cy={cy} r="3" fill="#3fb950" />;
                              })}

                              <g fill="#3fb950" opacity="0.8">
                                <polygon points="180,60 174,56 174,64" />
                                <polygon points="340,138 336,132 344,132" />
                                <polygon points="250,228 246,222 254,222" />
                              </g>
                            </g>
                          )}

                          {/* 11. EDUCATIONAL ANNOTATION BADGES */}
                          <g opacity="0.85">
                            <text x="50" y="158" textAnchor="middle" fill="#58a6ff" fontSize="7" fontFamily="monospace">① DC Source</text>
                            <text x="90" y="215" textAnchor="middle" fill="#58a6ff" fontSize="7" fontFamily="monospace">② Drive Unit</text>
                            <text x="250" y="263" textAnchor="middle" fill="#3fb950" fontSize="7" fontFamily="monospace">③ Switch Q1</text>
                            <text x="340" y="48" textAnchor="middle" fill="#fbbf24" fontSize="7" fontFamily="monospace">④ Load RL</text>
                            <text x="420" y="48" textAnchor="middle" fill="#e3b341" fontSize="7" fontFamily="monospace">⑤ FWD D1</text>
                          </g>
                        </g>
                      );
                    })()}</g>
                  )
                ) : activeTopic === 'scr' ? (
                  transistorSubView === 'junction' ? (
                    <g transform="translate(0, 10)">
                      <rect x="140" y="45" width="220" height="195" fill="#161b22" stroke="#3fb950" strokeWidth="2" rx="8" />
                      <text x="250" y="25" textAnchor="middle" fill="#3fb950" fontSize="11" fontWeight="bold">
                        SCR PNPN 4-LAYER JUNCTION CARRIER LATCHING (IEC 60747)
                      </text>

                      <rect x="150" y="55" width="200" height="40" fill="#1f6beb" fillOpacity={0.3} stroke="#1f6beb" strokeWidth="1" />
                      <text x="250" y="78" textAnchor="middle" fill="#58a6ff" fontSize="10" fontWeight="bold">P1 Layer (Anode Junction J1)</text>

                      <rect x="150" y="95" width="200" height="45" fill="#da3633" fillOpacity={0.25} stroke="#da3633" strokeWidth="1" />
                      <text x="250" y="122" textAnchor="middle" fill="#f85149" fontSize="10" fontWeight="bold">N1 Layer (Reverse Blocking J2 Barrier)</text>

                      <rect x="150" y="140" width="200" height="45" fill="#8957e5" fillOpacity={0.3} stroke="#8957e5" strokeWidth="1" />
                      <text x="250" y="167" textAnchor="middle" fill="#d2a8ff" fontSize="10" fontWeight="bold">P2 Gate Layer (Ig Injection J3)</text>

                      <rect x="150" y="185" width="200" height="45" fill="#3fb950" fillOpacity={0.3} stroke="#3fb950" strokeWidth="1" />
                      <text x="250" y="212" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="bold">N2 Layer (Cathode Emitter)</text>

                      {/* Gate Injection Arrow */}
                      <path d="M 80 162 L 145 162" stroke="#f778ba" strokeWidth="3" markerEnd="url(#arrow)" />
                      <text x="75" y="155" textAnchor="end" fill="#f778ba" fontSize="10" fontWeight="bold">Gate Ig ({scrGateCurrent}mA)</text>

                      {/* Carrier Injection Flow Animation when latched */}
                      {scrLatched && scrFault !== 'gate_open' && (
                        <g>
                          {[0, 0.2, 0.4, 0.6, 0.8].map((offset, i) => {
                            const p = (time * 2 + offset) % 1;
                            return (
                              <circle key={i} cx={180 + (i % 3) * 35} cy={55 + p * 165} r="4" fill="#3fb950" className="animate-pulse" />
                            );
                          })}
                        </g>
                      )}
                    </g>
                  ) : (
                    /* 100% IEC 60617 / IEEE Std 315 SCR CHOPPER SINGLE LINE DIAGRAM (SLD) */
                    <g transform="translate(0, 5)">
                      <text x="250" y="20" textAnchor="middle" fill="#3fb950" fontSize="11" fontWeight="bold">
                        IEC 60617 / IEEE 315 STANDARD SCR THYRISTOR SLD & SCHEMATIC
                      </text>

                      {/* AC/DC Source Circle */}
                      <circle cx="60" cy="130" r="20" fill="#161b22" stroke="#58a6ff" strokeWidth="2" />
                      <path d="M 50 130 Q 55 120 60 130 T 70 130" fill="none" stroke="#58a6ff" strokeWidth="2" />
                      <text x="60" y="165" textAnchor="middle" fill="#58a6ff" fontSize="9" fontWeight="bold">AC Source {scrAnodeVin}V</text>

                      {/* Semiconductor Fuse F1 */}
                      <rect x="105" y="122" width="30" height="16" fill="#161b22" stroke="#30363d" strokeWidth="1.5" />
                      <line x1="100" y1="130" x2="140" y2="130" stroke="#3fb950" strokeWidth="2" />
                      <text x="120" y="115" textAnchor="middle" fill="#8b949e" fontSize="8" fontWeight="bold">Fuse F1</text>

                      {/* Bus Line to SCR Anode */}
                      <line x1="140" y1="130" x2="190" y2="130" stroke={scrLatched ? '#3fb950' : '#58a6ff'} strokeWidth="2.5" />

                      {/* IEC 60617 THYRISTOR SYMBOL V1 */}
                      <g transform="translate(190, 105)">
                        {/* Anode Triangle */}
                        <polygon points="0,10 0,40 30,25" fill={scrLatched && scrFault !== 'gate_open' ? '#3fb950' : '#161b22'} stroke="#3fb950" strokeWidth="2.5" />
                        {/* Cathode Vertical Line */}
                        <line x1="30" y1="8" x2="30" y2="42" stroke="#3fb950" strokeWidth="3" />
                        {/* Gate Angled Terminal Line */}
                        <line x1="15" y1="33" x2="28" y2="48" stroke="#f778ba" strokeWidth="2.5" />
                        <circle cx="28" cy="48" r="2.5" fill="#f778ba" />
                        <text x="15" y="0" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="bold">SCR T1</text>
                      </g>

                      {/* Gate Pulse Generator Unit G1 */}
                      <rect x="180" y="175" width="50" height="25" fill="#161b22" stroke="#f778ba" strokeWidth="1.5" rx="4" />
                      <line x1="218" y1="153" x2="218" y2="175" stroke="#f778ba" strokeWidth="2" strokeDasharray="3,3" />
                      <text x="205" y="191" textAnchor="middle" fill="#f778ba" fontSize="8" fontWeight="bold">Gate Pulse α={scrFiringAlpha}°</text>

                      {/* Snubber Circuit (Rs, Cs) in Parallel across SCR */}
                      {scrSnubber && (
                        <g>
                          <line x1="175" y1="130" x2="175" y2="70" stroke="#39c5cf" strokeWidth="1.5" />
                          <line x1="175" y1="70" x2="200" y2="70" stroke="#39c5cf" strokeWidth="1.5" />
                          {/* Snubber Resistor Rs */}
                          <rect x="200" y="64" width="20" height="12" fill="#161b22" stroke="#39c5cf" strokeWidth="1.5" />
                          <text x="210" y="58" textAnchor="middle" fill="#39c5cf" fontSize="8">Rs 10Ω</text>
                          <line x1="220" y1="70" x2="235" y2="70" stroke="#39c5cf" strokeWidth="1.5" />
                          {/* Snubber Capacitor Cs */}
                          <line x1="235" y1="62" x2="235" y2="78" stroke="#39c5cf" strokeWidth="2" />
                          <line x1="240" y1="62" x2="240" y2="78" stroke="#39c5cf" strokeWidth="2" />
                          <text x="238" y="58" textAnchor="middle" fill="#39c5cf" fontSize="8">Cs 0.1µF</text>
                          <line x1="240" y1="70" x2="260" y2="70" stroke="#39c5cf" strokeWidth="1.5" />
                          <line x1="260" y1="70" x2="260" y2="130" stroke="#39c5cf" strokeWidth="1.5" />
                        </g>
                      )}

                      {/* Cathode Bus Line to Load */}
                      <line x1="223" y1="130" x2="330" y2="130" stroke={scrLatched ? '#3fb950' : '#30363d'} strokeWidth="2.5" />

                      {/* Freewheeling Diode Dfw */}
                      <g transform="translate(330, 130)">
                        <line x1="0" y1="0" x2="0" y2="30" stroke="#e3b341" strokeWidth="1.5" />
                        <polygon points="-12,30 12,30 0,50" fill="#161b22" stroke="#e3b341" strokeWidth="1.5" />
                        <line x1="-12" y1="50" x2="12" y2="50" stroke="#e3b341" strokeWidth="2" />
                        <line x1="0" y1="50" x2="0" y2="80" stroke="#e3b341" strokeWidth="1.5" />
                        <text x="22" y="42" fill="#e3b341" fontSize="8" fontWeight="bold">D_fw</text>
                      </g>

                      {/* Load Resistor R_L & Inductor L_L */}
                      <g transform="translate(410, 90)">
                        <line x1="0" y1="40" x2="-80" y2="40" stroke={scrLatched ? '#3fb950' : '#30363d'} strokeWidth="2.5" />
                        {/* Resistor RL */}
                        <rect x="0" y="32" width="40" height="16" fill="#161b22" stroke="#e3b341" strokeWidth="2" />
                        <text x="20" y="24" textAnchor="middle" fill="#e3b341" fontSize="9" fontWeight="bold">RL {scrLoadRes}Ω</text>
                        {/* Inductor LL */}
                        <path d="M 40 40 Q 48 25 56 40 Q 64 25 72 40 Q 80 25 88 40" fill="none" stroke="#39c5cf" strokeWidth="2.5" />
                        <text x="64" y="24" textAnchor="middle" fill="#39c5cf" fontSize="9" fontWeight="bold">Load LL</text>
                        <line x1="88" y1="40" x2="110" y2="40" stroke="#30363d" strokeWidth="2" />
                        <line x1="110" y1="40" x2="110" y2="120" stroke="#30363d" strokeWidth="2" />
                        {/* Return Line to Source */}
                        <line x1="110" y1="120" x2="-350" y2="120" stroke="#30363d" strokeWidth="2" />
                        <line x1="-350" y1="120" x2="-350" y2="40" stroke="#30363d" strokeWidth="2" />
                      </g>

                      {/* Live Animated Current Flow Dots */}
                      {scrLatched && scrFault !== 'gate_open' && (
                        <g>
                          {[0, 0.2, 0.4, 0.6, 0.8].map((offset, i) => {
                            const p = (time * 2 + offset) % 1;
                            const pathX = 60 + p * 380;
                            return (
                              <circle key={i} cx={pathX} cy="130" r="3.5" fill="#3fb950" className="shadow-lg shadow-emerald-400" />
                            );
                          })}
                        </g>
                      )}
                    </g>
                  )
                ) : activeTopic === 'controlled' ? (
                  /* TOPIC 5: PHASE CONTROLLED RECTIFIERS (1-PHASE & 3-PHASE SLD SCHEMES) */
                  transistorSubView === 'junction' ? (
                    <g transform="translate(0, 10)">
                      <rect x="130" y="45" width="240" height="195" fill="#161b22" stroke="#8957e5" strokeWidth="2" rx="8" />
                      <text x="250" y="25" textAnchor="middle" fill="#d2a8ff" fontSize="11" fontWeight="bold">
                        PHASE CONTROL TIMING &amp; CONDUCTION OVERLAP μ (IEC 60146)
                      </text>
                      <text x="250" y="70" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                        Firing Delay Angle α = {firingAngle}° ({((firingAngle / 180) * 10).toFixed(2)} ms)
                      </text>
                      <text x="250" y="100" textAnchor="middle" fill="#e3b341" fontSize="10" fontWeight="bold">
                        Commutation Overlap μ = {Math.max(0, Math.acos(Math.max(-1, Math.min(1, Math.cos((firingAngle * Math.PI) / 180) - (2 * 2 * Math.PI * 50 * (commutationLc / 1000) * ctrlLoadCurrent) / (415 * Math.SQRT2)))) * (180 / Math.PI) - firingAngle).toFixed(1)}°
                      </text>

                      <rect x="150" y="125" width="200" height="35" fill="#238636" fillOpacity={0.3} stroke="#3fb950" strokeWidth="1" />
                      <text x="250" y="147" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="bold">
                        Conduction Angle γ = {Math.max(0, 180 - firingAngle)}°
                      </text>

                      <rect x="150" y="170" width="200" height="35" fill="#1f6beb" fillOpacity={0.3} stroke="#58a6ff" strokeWidth="1" />
                      <text x="250" y="192" textAnchor="middle" fill="#58a6ff" fontSize="10" fontWeight="bold">
                        Commutation Notch Drop ΔVdc = {((3 / Math.PI) * 2 * Math.PI * 50 * (commutationLc / 1000) * ctrlLoadCurrent).toFixed(1)} V
                      </text>
                    </g>
                  ) : (
                    /* 100% IEC 60617 / IEEE 315 PHASE CONTROLLED RECTIFIER SINGLE LINE DIAGRAM (SLD) */
                    <g transform="translate(0, 5)">
                      <text x="250" y="18" textAnchor="middle" fill="#58a6ff" fontSize="11" fontWeight="bold">
                        100% IEC 60617 / IEEE 315 SLD SCHEME: {ctrlRectType.toUpperCase().replace('_', ' ')}
                      </text>

                      {ctrlRectType === '3ph_6pulse' ? (
                        /* 3-PHASE 6-PULSE SCR BRIDGE RECTIFIER SLD SCHEME */
                        <g>
                          {/* 3-Phase AC Feeder Lines (Phase A: Red, Phase B: Blue, Phase C: Yellow) */}
                          {['Phase A (Red)', 'Phase B (Blue)', 'Phase C (Yellow)'].map((p, idx) => {
                            const yPos = 65 + idx * 35;
                            const pColor = idx === 0 ? '#f85149' : idx === 1 ? '#58a6ff' : '#e3b341';
                            return (
                              <g key={idx}>
                                <line x1="30" y1={yPos} x2="90" y2={yPos} stroke={pColor} strokeWidth="2.5" />
                                <text x="25" y={yPos + 3} textAnchor="end" fill={pColor} fontSize="8" fontWeight="bold">{p.split(' ')[0]}</text>
                                {/* Commutation Leakage Inductance Lc */}
                                <path d={`M 90 ${yPos} Q 98 ${yPos - 12} 106 ${yPos} Q 114 ${yPos - 12} 122 ${yPos}`} fill="none" stroke={pColor} strokeWidth="2" />
                              </g>
                            );
                          })}
                          <text x="106" y="165" textAnchor="middle" fill="#58a6ff" fontSize="8" fontWeight="bold">Lc {commutationLc}mH</text>

                          {/* 3-Phase 6-Pulse SCR Bridge (T1..T6 in standard 6-pulse bridge configuration) */}
                          <g transform="translate(160, 45)">
                            <rect x="0" y="0" width="170" height="135" fill="#161b22" stroke="#30363d" strokeWidth="1.5" rx="6" />
                            <text x="85" y="15" textAnchor="middle" fill="#d2a8ff" fontSize="9" fontWeight="bold">6-PULSE SCR BRIDGE</text>

                            {/* Upper Thyristors T1, T3, T5 */}
                            {[1, 3, 5].map((tNum, i) => (
                              <g key={tNum} transform={`translate(${20 + i * 50}, 30)`}>
                                <polygon points="0,5 0,25 20,15" fill="#161b22" stroke="#3fb950" strokeWidth="2" />
                                <line x1="20" y1="3" x2="20" y2="27" stroke="#3fb950" strokeWidth="2" />
                                <text x="10" y="-2" textAnchor="middle" fill="#3fb950" fontSize="8" fontWeight="bold">T{tNum}</text>
                              </g>
                            ))}

                            {/* Lower Thyristors T4, T6, T2 */}
                            {[4, 6, 2].map((tNum, i) => (
                              <g key={tNum} transform={`translate(${20 + i * 50}, 85)`}>
                                <polygon points="0,5 0,25 20,15" fill="#161b22" stroke="#3fb950" strokeWidth="2" />
                                <line x1="20" y1="3" x2="20" y2="27" stroke="#3fb950" strokeWidth="2" />
                                <text x="10" y="38" textAnchor="middle" fill="#3fb950" fontSize="8" fontWeight="bold">T{tNum}</text>
                              </g>
                            ))}
                          </g>

                          {/* Gate Firing Controller Unit */}
                          <rect x="175" y="195" width="140" height="28" fill="#161b22" stroke="#f778ba" strokeWidth="1.5" rx="4" />
                          <text x="245" y="212" textAnchor="middle" fill="#f778ba" fontSize="9" fontWeight="bold">
                            6-Pulse Firing Unit (α = {firingAngle}°)
                          </text>

                          {/* DC Bus Filter & Load */}
                          <g transform="translate(340, 65)">
                            <line x1="0" y1="35" x2="30" y2="35" stroke="#3fb950" strokeWidth="2.5" />
                            {/* Filter Inductor Ldc */}
                            <path d="M 30 35 Q 38 20 46 35 Q 54 20 62 35 Q 70 20 78 35" fill="none" stroke="#39c5cf" strokeWidth="2.5" />
                            <text x="54" y="18" textAnchor="middle" fill="#39c5cf" fontSize="8" fontWeight="bold">Ldc</text>

                            <line x1="78" y1="35" x2="110" y2="35" stroke="#3fb950" strokeWidth="2.5" />
                            {/* Load Resistor RL */}
                            <rect x="110" y="27" width="35" height="16" fill="#161b22" stroke="#e3b341" strokeWidth="2" />
                            <text x="127" y="20" textAnchor="middle" fill="#e3b341" fontSize="8" fontWeight="bold">Load Idc={ctrlLoadCurrent}A</text>

                            {/* Battery Ebat for RLE Load */}
                            {ctrlLoadType === 'rle' && (
                              <g transform="translate(110, 60)">
                                <line x1="0" y1="0" x2="35" y2="0" stroke="#f85149" strokeWidth="2" />
                                <line x1="10" y1="-10" x2="10" y2="10" stroke="#f85149" strokeWidth="2.5" />
                                <line x1="20" y1="-5" x2="20" y2="5" stroke="#f85149" strokeWidth="1.5" />
                                <text x="17" y="20" textAnchor="middle" fill="#f85149" fontSize="8" fontWeight="bold">Ebat {batteryEbat}V</text>
                              </g>
                            )}
                          </g>

                          {/* Live Animated Conduction Path Dots */}
                          <g>
                            {[0, 0.25, 0.5, 0.75].map((offset, i) => {
                              const p = (time * 2 + offset) % 1;
                              return (
                                <circle key={i} cx={130 + p * 230} cy="100" r="3.5" fill="#3fb950" className="animate-pulse" />
                              );
                            })}
                          </g>
                        </g>
                      ) : (
                        /* 1-PHASE FULL BRIDGE SCR RECTIFIER SLD SCHEMATIC */
                        <g transform="translate(30, 20)">
                          {/* AC Transformer Input */}
                          <circle cx="50" cy="90" r="18" fill="#161b22" stroke="#58a6ff" strokeWidth="2" />
                          <circle cx="75" cy="90" r="18" fill="#161b22" stroke="#58a6ff" strokeWidth="2" />
                          <text x="62" y="125" textAnchor="middle" fill="#58a6ff" fontSize="9" fontWeight="bold">AC Source</text>

                          {/* 4-SCR Full Bridge Formation */}
                          <g transform="translate(140, 30)">
                            <polygon points="20,10 20,30 40,20" fill="#161b22" stroke="#3fb950" strokeWidth="2" />
                            <line x1="40" y1="8" x2="40" y2="32" stroke="#3fb950" strokeWidth="2" />
                            <text x="30" y="0" textAnchor="middle" fill="#3fb950" fontSize="8" fontWeight="bold">T1</text>

                            <polygon points="120,10 120,30 140,20" fill="#161b22" stroke="#3fb950" strokeWidth="2" />
                            <line x1="140" y1="8" x2="140" y2="32" stroke="#3fb950" strokeWidth="2" />
                            <text x="130" y="0" textAnchor="middle" fill="#3fb950" fontSize="8" fontWeight="bold">T2</text>

                            <polygon points="20,90 20,110 40,100" fill="#161b22" stroke="#3fb950" strokeWidth="2" />
                            <line x1="40" y1="88" x2="40" y2="112" stroke="#3fb950" strokeWidth="2" />
                            <text x="30" y="125" textAnchor="middle" fill="#3fb950" fontSize="8" fontWeight="bold">T3</text>

                            <polygon points="120,90 120,110 140,100" fill="#161b22" stroke="#3fb950" strokeWidth="2" />
                            <line x1="140" y1="88" x2="140" y2="112" stroke="#3fb950" strokeWidth="2" />
                            <text x="130" y="125" textAnchor="middle" fill="#3fb950" fontSize="8" fontWeight="bold">T4</text>
                          </g>

                          {/* Gate Firing Circuit α */}
                          <rect x="170" y="175" width="100" height="24" fill="#161b22" stroke="#f778ba" strokeWidth="1.5" rx="4" />
                          <text x="220" y="191" textAnchor="middle" fill="#f778ba" fontSize="8" fontWeight="bold">Gate Firing α={firingAngle}°</text>

                          {/* Filter & Load */}
                          <g transform="translate(320, 60)">
                            <line x1="0" y1="30" x2="25" y2="30" stroke="#3fb950" strokeWidth="2.5" />
                            <rect x="25" y="22" width="35" height="16" fill="#161b22" stroke="#e3b341" strokeWidth="2" />
                            <text x="42" y="15" textAnchor="middle" fill="#e3b341" fontSize="8" fontWeight="bold">RL Load</text>
                          </g>
                        </g>
                      )}
                    </g>
                  )
                ) : activeTopic === 'pwm' ? (
                  /* TOPIC 6: PULSE WIDTH MODULATION (PWM) SVG STAGE */
                  transistorSubView === 'junction' ? (
                    <g transform="translate(0, 10)">
                      <rect x="50" y="30" width="400" height="210" fill="#161b22" stroke="#f472b6" strokeWidth="2" rx="8" />
                      <text x="250" y="22" textAnchor="middle" fill="#f472b6" fontSize="11" fontWeight="bold">
                        CARRIER MODULATION &amp; COMPARATOR STAGE ({pwmModulationType.toUpperCase()})
                      </text>

                      {/* Reference Sine Wave Overlay */}
                      <path d="M 60 90 Q 160 30 250 90 T 440 90" fill="none" stroke="#e3b341" strokeWidth="2.5" />
                      <text x="75" y="55" fill="#e3b341" fontSize="9" fontWeight="bold">Reference Vref (f1={pwmF1}Hz, Ma={pwmMa.toFixed(2)})</text>

                      {/* Carrier Triangle Wave Overlay */}
                      <path d="M 60 120 L 95 50 L 130 120 L 165 50 L 200 120 L 235 50 L 270 120 L 305 50 L 340 120 L 375 50 L 410 120" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                      <text x="360" y="55" fill="#38bdf8" fontSize="9" fontWeight="bold">Carrier Vtri (fc={pwmFc}Hz)</text>

                      {/* Resulting PWM Pulses */}
                      <g transform="translate(0, 70)">
                        <line x1="60" y1="120" x2="440" y2="120" stroke="#30363d" strokeWidth="1" />
                        <path d="M 60 120 L 60 80 L 140 80 L 140 120 L 200 120 L 200 80 L 280 80 L 280 120 L 350 120 L 350 80 L 440 80" fill="none" stroke="#3fb950" strokeWidth="3" />
                        <text x="250" y="140" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="bold">PWM Pulse Output Vout (Dead-time={pwmDeadTime}µs)</text>
                      </g>
                    </g>
                  ) : (
                    /* IEC 60617-STYLE HALF-BRIDGE SPWM INVERTER SCHEMATIC */
                    (() => {
                      const vDcTotal = busVoltage;
                      const vDcHalf = vDcTotal / 2; // Split DC Bus (+200V / -200V)
                      const v1Rms = (pwmMa * vDcHalf) / Math.SQRT2; // Half-bridge V1(rms) = 120.2V for Ma=0.85, Vdc=400V
                      const loadR = Math.max(1, rectifierLoad || 20);
                      const i1Rms = v1Rms / loadR;
                      const pOut = (v1Rms * v1Rms) / loadR;

                      const omega1 = 2 * Math.PI * pwmF1;
                      const instantRef = Math.sin(omega1 * time) * pwmMa;
                      const carrierPeriod = 1 / Math.max(10, pwmFc);
                      const tMod = time % carrierPeriod;
                      const carrierNorm = tMod / carrierPeriod;
                      const instantCarrier = carrierNorm < 0.5 ? (4 * carrierNorm - 1) : (3 - 4 * carrierNorm);

                      const deadTimeSec = (pwmDeadTime || 0) * 1e-6;
                      const isDeadTimeActive = (tMod < deadTimeSec * pwmFc * carrierPeriod) || ((carrierPeriod - tMod) < deadTimeSec * pwmFc * carrierPeriod);
                      const isShootThroughRisk = pwmDeadTime === 0;

                      const q1On = !isDeadTimeActive && (instantRef >= instantCarrier);
                      const q2On = !isDeadTimeActive && !q1On;
                      const d1Conduction = isDeadTimeActive && (instantRef > 0);
                      const d2Conduction = isDeadTimeActive && (instantRef < 0);

                      const vSwInstant = q1On ? vDcHalf : q2On ? -vDcHalf : 0;
                      const pDot = (time * 1.5) % 1;

                      return (
                        <g>
                          {/* 1. TITLE & METADATA HEADER */}
                          <text x="250" y="18" textAnchor="middle" fill="#f472b6" fontSize="12" fontFamily="monospace" fontWeight="bold">
                            IEC 60617-Style Half-Bridge SPWM Inverter ({pwmModulationType.toUpperCase()})
                          </text>
                          <text x="250" y="32" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                            V1(rms) = {v1Rms.toFixed(1)}V | Ma = {pwmMa.toFixed(2)} ({pwmMa > 1.0 ? 'Overmod' : 'Linear'}) | fc = {pwmFc}Hz (Mf={(pwmFc/pwmF1).toFixed(0)}) | f1 = {pwmF1}Hz | t_dead = {pwmDeadTime.toFixed(1)}µs
                          </text>

                          {/* 2. DC BUS RAILS & CONTINUOUS NEUTRAL BUS N */}
                          <line x1="30" y1="50" x2="230" y2="50" stroke="#ef4444" strokeWidth="2.5" />
                          <text x="32" y="44" fill="#ef4444" fontSize="9" fontFamily="monospace" fontWeight="bold">+VDC (+{vDcHalf.toFixed(0)}V)</text>

                          <line x1="30" y1="250" x2="230" y2="250" stroke="#38bdf8" strokeWidth="2.5" />
                          <text x="32" y="262" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">-VDC (-{vDcHalf.toFixed(0)}V)</text>

                          <line x1="30" y1="150" x2="460" y2="150" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 3" />
                          <text x="32" y="144" fill="#06b6d4" fontSize="9" fontFamily="monospace" fontWeight="bold">N / DC MIDPOINT (0.0V NEUTRAL RETURN)</text>

                          {/* 3. DC LINK CAPACITORS C1 & C2 */}
                          <line x1="80" y1="50" x2="80" y2="92" stroke="#ef4444" strokeWidth="2" />
                          <line x1="68" y1="92" x2="92" y2="92" stroke="#38bdf8" strokeWidth="3" />
                          <line x1="68" y1="100" x2="92" y2="100" stroke="#38bdf8" strokeWidth="3" />
                          <line x1="80" y1="100" x2="80" y2="150" stroke="#06b6d4" strokeWidth="2" />
                          <text x="40" y="97" textAnchor="end" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">C1 1000µF</text>
                          <text x="40" y="107" textAnchor="end" fill="#94a3b8" fontSize="8" fontFamily="monospace">Vc1={vDcHalf.toFixed(0)}V</text>

                          <line x1="80" y1="150" x2="80" y2="198" stroke="#06b6d4" strokeWidth="2" />
                          <line x1="68" y1="198" x2="92" y2="198" stroke="#38bdf8" strokeWidth="3" />
                          <line x1="68" y1="206" x2="92" y2="206" stroke="#38bdf8" strokeWidth="3" />
                          <line x1="80" y1="206" x2="80" y2="250" stroke="#38bdf8" strokeWidth="2" />
                          <text x="40" y="203" textAnchor="end" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">C2 1000µF</text>
                          <text x="40" y="213" textAnchor="end" fill="#94a3b8" fontSize="8" fontFamily="monospace">Vc2={vDcHalf.toFixed(0)}V</text>

                          <circle cx="80" cy="150" r="4" fill="#0d1117" stroke="#06b6d4" strokeWidth="2" />

                          {/* 4. SPWM GATE DRIVER BLOCK */}
                          <g transform="translate(115, 125)">
                            <rect x="0" y="0" width="75" height="50" fill="#161b22" stroke={isDeadTimeActive ? '#f59e0b' : '#f472b6'} strokeWidth="2" rx="6" />
                            <text x="37" y="15" textAnchor="middle" fill="#f472b6" fontSize="9" fontFamily="monospace" fontWeight="bold">SPWM DRIVER</text>
                            
                            <text x="37" y="28" textAnchor="middle" fill={q1On ? '#22c55e' : '#94a3b8'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                              G1: {q1On ? 'HIGH (1)' : 'LOW (0)'}
                            </text>
                            <text x="37" y="38" textAnchor="middle" fill={q2On ? '#22c55e' : '#94a3b8'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                              G2: {q2On ? 'HIGH (1)' : 'LOW (0)'}
                            </text>

                            {isDeadTimeActive && (
                              <text x="37" y="47" textAnchor="middle" fill="#f59e0b" fontSize="7" fontFamily="monospace" fontWeight="bold">
                                t_dead GAP
                              </text>
                            )}
                            {isShootThroughRisk && (
                              <text x="37" y="47" textAnchor="middle" fill="#ef4444" fontSize="7" fontFamily="monospace" fontWeight="bold">
                                ⚠️ 0µs RISK!
                              </text>
                            )}
                          </g>

                          <path d="M 190 135 L 210 135 L 210 80 L 220 80" fill="none" stroke={q1On ? '#22c55e' : '#64748b'} strokeWidth="1.5" strokeDasharray="3 2" />
                          <path d="M 190 165 L 210 165 L 210 220 L 220 220" fill="none" stroke={q2On ? '#22c55e' : '#64748b'} strokeWidth="1.5" strokeDasharray="3 2" />
                          <text x="202" y="76" fill={q1On ? '#22c55e' : '#64748b'} fontSize="8" fontFamily="monospace" fontWeight="bold">G1</text>
                          <text x="202" y="228" fill={q2On ? '#22c55e' : '#64748b'} fontSize="8" fontFamily="monospace" fontWeight="bold">G2</text>

                          {/* 5. HALF-BRIDGE SWITCHING LEG (Q1, D1, Q2, D2) */}
                          <g transform="translate(220, 55)">
                            <rect x="0" y="0" width="45" height="50" fill={q1On ? '#15803d' : '#161b22'} stroke={q1On ? '#22c55e' : '#475569'} strokeWidth="2" rx="5" />
                            <text x="22" y="24" textAnchor="middle" fill={q1On ? '#ffffff' : '#e2e8f0'} fontSize="11" fontFamily="monospace" fontWeight="bold">Q1</text>
                            <text x="22" y="38" textAnchor="middle" fill={q1On ? '#4ade80' : '#64748b'} fontSize="7" fontFamily="monospace" fontWeight="bold">HIGH-SIDE</text>
                          </g>
                          <line x1="242" y1="50" x2="242" y2="55" stroke={q1On ? '#22c55e' : '#ef4444'} strokeWidth="2.5" />

                          <g transform="translate(272, 55)">
                            <line x1="12" y1="0" x2="12" y2="50" stroke={d1Conduction ? '#f59e0b' : '#475569'} strokeWidth="2" />
                            <polygon points="4,32 20,32 12,18" fill={d1Conduction ? '#b45309' : '#161b22'} stroke={d1Conduction ? '#f59e0b' : '#64748b'} strokeWidth="1.5" />
                            <line x1="4" y1="18" x2="20" y2="18" stroke={d1Conduction ? '#f59e0b' : '#64748b'} strokeWidth="2" />
                            <text x="24" y="28" fill={d1Conduction ? '#f59e0b' : '#64748b'} fontSize="8" fontFamily="monospace" fontWeight="bold">D1</text>
                          </g>
                          <line x1="284" y1="50" x2="284" y2="55" stroke={d1Conduction ? '#f59e0b' : '#ef4444'} strokeWidth="2" />
                          <line x1="284" y1="105" x2="284" y2="150" stroke={d1Conduction ? '#f59e0b' : '#475569'} strokeWidth="2" />

                          <g transform="translate(220, 195)">
                            <rect x="0" y="0" width="45" height="50" fill={q2On ? '#15803d' : '#161b22'} stroke={q2On ? '#22c55e' : '#475569'} strokeWidth="2" rx="5" />
                            <text x="22" y="24" textAnchor="middle" fill={q2On ? '#ffffff' : '#e2e8f0'} fontSize="11" fontFamily="monospace" fontWeight="bold">Q2</text>
                            <text x="22" y="38" textAnchor="middle" fill={q2On ? '#4ade80' : '#64748b'} fontSize="7" fontFamily="monospace" fontWeight="bold">LOW-SIDE</text>
                          </g>
                          <line x1="242" y1="245" x2="242" y2="250" stroke={q2On ? '#22c55e' : '#38bdf8'} strokeWidth="2.5" />

                          <g transform="translate(272, 195)">
                            <line x1="12" y1="0" x2="12" y2="50" stroke={d2Conduction ? '#f59e0b' : '#475569'} strokeWidth="2" />
                            <polygon points="4,32 20,32 12,18" fill={d2Conduction ? '#b45309' : '#161b22'} stroke={d2Conduction ? '#f59e0b' : '#64748b'} strokeWidth="1.5" />
                            <line x1="4" y1="18" x2="20" y2="18" stroke={d2Conduction ? '#f59e0b' : '#64748b'} strokeWidth="2" />
                            <text x="24" y="28" fill={d2Conduction ? '#f59e0b' : '#64748b'} fontSize="8" fontFamily="monospace" fontWeight="bold">D2</text>
                          </g>
                          <line x1="284" y1="150" x2="284" y2="195" stroke={d2Conduction ? '#f59e0b' : '#475569'} strokeWidth="2" />
                          <line x1="284" y1="245" x2="284" y2="250" stroke={d2Conduction ? '#f59e0b' : '#38bdf8'} strokeWidth="2" />

                          {/* 6. SWITCHING NODE VSW / JUNCTION */}
                          <line x1="242" y1="105" x2="242" y2="195" stroke={q1On || q2On ? '#22c55e' : '#475569'} strokeWidth="2.5" />
                          <circle cx="242" cy="150" r="4.5" fill="#0d1117" stroke="#22c55e" strokeWidth="2" />
                          
                          <g transform="translate(242, 150)">
                            <rect x="-42" y="-22" width="84" height="15" fill="#0d1117" stroke="#22c55e" strokeWidth="1" rx="3" />
                            <text x="0" y="-11" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="monospace" fontWeight="bold">VSW NODE</text>
                            <rect x="-42" y="7" width="84" height="15" fill="#0d1117" stroke="#38bdf8" strokeWidth="1" rx="3" />
                            <text x="0" y="18" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                              {vSwInstant > 0 ? `+${vSwInstant.toFixed(0)}V` : vSwInstant < 0 ? `${vSwInstant.toFixed(0)}V` : '0V (t_dead)'}
                            </text>
                          </g>

                          {/* 7. OUTPUT LC FILTER (Lf, Cf) & AC LOAD WITH UNAMBIGUOUS NEUTRAL RETURN */}
                          <path d="M 242 150 L 242 90 L 295 90" fill="none" stroke="#22c55e" strokeWidth="2.5" />

                          <g transform="translate(295, 90)">
                            <path d="M 0 0 Q 8 -14 16 0 Q 24 -14 32 0 Q 40 -14 48 0" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                            <text x="24" y="-16" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">Lf = 1.2 mH</text>
                            <text x="24" y="-6" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">IL={i1Rms.toFixed(1)}A</text>
                          </g>

                          <line x1="343" y1="90" x2="440" y2="90" stroke="#22c55e" strokeWidth="2.5" />
                          <circle cx="380" cy="90" r="4" fill="#0d1117" stroke="#22c55e" strokeWidth="2" />
                          <text x="380" y="80" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="monospace" fontWeight="bold">VOUT LINE</text>

                          <g transform="translate(380, 90)">
                            <line x1="0" y1="0" x2="0" y2="20" stroke="#22c55e" strokeWidth="2" />
                            <line x1="-12" y1="20" x2="12" y2="20" stroke="#38bdf8" strokeWidth="3" />
                            <line x1="-12" y1="28" x2="12" y2="28" stroke="#38bdf8" strokeWidth="3" />
                            <line x1="0" y1="28" x2="0" y2="60" stroke="#06b6d4" strokeWidth="2" />
                            <text x="16" y="22" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">Cf = 10 µF</text>
                            <text x="16" y="32" fill="#94a3b8" fontSize="7" fontFamily="monospace">VC={v1Rms.toFixed(1)}V</text>
                          </g>
                          <circle cx="380" cy="150" r="3.5" fill="#0d1117" stroke="#06b6d4" strokeWidth="2" />

                          <g transform="translate(440, 90)">
                            <line x1="0" y1="0" x2="0" y2="12" stroke="#22c55e" strokeWidth="2.5" />
                            <circle cx="0" cy="30" r="18" fill="#161b22" stroke="#eab308" strokeWidth="2" />
                            <path d="M -9 30 Q -4.5 22 0 30 T 9 30" fill="none" stroke="#eab308" strokeWidth="2" />
                            <text x="24" y="28" fill="#eab308" fontSize="8" fontFamily="monospace" fontWeight="bold">AC LOAD</text>
                            <line x1="0" y1="48" x2="0" y2="60" stroke="#06b6d4" strokeWidth="2.5" />
                            
                            <g transform="translate(0, 85)">
                              <rect x="-42" y="-12" width="84" height="26" fill="#0d1117" stroke="#eab308" strokeWidth="1" rx="4" />
                              <text x="0" y="-2" textAnchor="middle" fill="#eab308" fontSize="8" fontFamily="monospace" fontWeight="bold">V1(rms) = {v1Rms.toFixed(1)}V</text>
                              <text x="0" y="9" textAnchor="middle" fill="#4ade80" fontSize="7" fontFamily="monospace">IOUT = {i1Rms.toFixed(1)}A | {pOut.toFixed(0)}W</text>
                            </g>
                          </g>
                          <circle cx="440" cy="150" r="3.5" fill="#0d1117" stroke="#06b6d4" strokeWidth="2" />

                          {/* 8. ANIMATED CURRENT FLOW DOTS */}
                          {q1On && (
                            <g>
                              <circle cx={30 + pDot * 212} cy="50" r="3.5" fill="#4ade80" className="shadow-lg shadow-emerald-400" />
                              <circle cx={242} cy={50 + pDot * 40} r="3.5" fill="#4ade80" />
                              <circle cx={242 + pDot * 138} cy="90" r="3.5" fill="#4ade80" />
                              <circle cx={440} cy={90 + pDot * 60} r="3.5" fill="#4ade80" />
                              <circle cx={440 - pDot * 360} cy="150" r="3.5" fill="#4ade80" />
                            </g>
                          )}
                          {q2On && (
                            <g>
                              <circle cx={80 + pDot * 360} cy="150" r="3.5" fill="#4ade80" />
                              <circle cx={440} cy={150 - pDot * 60} r="3.5" fill="#4ade80" />
                              <circle cx={440 - pDot * 198} cy="90" r="3.5" fill="#4ade80" />
                              <circle cx={242} cy={90 + pDot * 105} r="3.5" fill="#4ade80" />
                              <circle cx={242 - pDot * 212} cy="250" r="3.5" fill="#4ade80" />
                            </g>
                          )}
                          {d1Conduction && (
                            <g>
                              <circle cx={284} cy={150 - pDot * 95} r="3.5" fill="#f59e0b" />
                              <circle cx={284 - pDot * 204} cy="50" r="3.5" fill="#f59e0b" />
                            </g>
                          )}
                          {d2Conduction && (
                            <g>
                              <circle cx={284} cy={250 - pDot * 95} r="3.5" fill="#f59e0b" />
                              <circle cx={284 - pDot * 204} cy="150" r="3.5" fill="#f59e0b" />
                            </g>
                          )}

                          {/* 9. COMPACT LEGEND BOX */}
                          <g transform="translate(315, 266)">
                            <rect x="0" y="0" width="170" height="46" fill="#0d1117" stroke="#334155" strokeWidth="1" rx="4" opacity="0.95" />
                            <text x="85" y="10" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">SCHEMATIC LEGEND</text>
                            <text x="8" y="21" fill="#cbd5e1" fontSize="7" fontFamily="monospace">Q1/Q2: PWM Switches</text>
                            <text x="92" y="21" fill="#cbd5e1" fontSize="7" fontFamily="monospace">Lf: Filter Inductor</text>
                            <text x="8" y="31" fill="#cbd5e1" fontSize="7" fontFamily="monospace">D1/D2: Freewheel Diodes</text>
                            <text x="92" y="31" fill="#cbd5e1" fontSize="7" fontFamily="monospace">Cf: Filter Capacitor</text>
                            <text x="8" y="41" fill="#cbd5e1" fontSize="7" fontFamily="monospace">VSW: Switching Node</text>
                            <text x="92" y="41" fill="#cbd5e1" fontSize="7" fontFamily="monospace">N: Neutral Midpoint</text>
                          </g>
                        </g>
                      );
                    })()
                  )
                ) : (
                  <g transform="translate(0, 15)">
                    <text x="250" y="140" textAnchor="middle" fill="#58a6ff" fontSize="12" fontWeight="bold">
                      IEC 60617 POWER ELECTRONICS STAGE
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* REAL-TIME IV / OUTPUT CHARACTERISTICS PLOT */}
            <div className="bg-[#0d1117] border border-[#30363d] p-2 rounded-xl">
              <div className="text-[11px] font-bold text-[#8b949e] mb-1 flex justify-between">
                <span>V-I OUTPUT CHARACTERISTIC CURVE & Q-POINT</span>
                <span className="text-[#3fb950]">{gateDriveOn ? 'OPERATING IN SATURATION' : 'CUTOFF STATE'}</span>
              </div>
              <canvas ref={ivCanvasRef} width={460} height={130} className="w-full h-[120px] rounded" />
            </div>
          </div>

          {/* RIGHT COLUMN: INSTRUMENTS, OSCILLOSCOPE & LOSSES */}
          <div className="lg:col-span-3 bg-[#161b22] border border-[#30363d] p-4 rounded-2xl flex flex-col gap-3 shadow-xl">
            <div className="text-xs font-extrabold text-white uppercase tracking-wider border-b border-[#21262d] pb-2 flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-sky-400">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                <span>DIGITAL STORAGE OSCILLOSCOPE</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold">
                LIVE DSO 100%
              </span>
            </div>

            {/* Scope Guidance Banner */}
            <div className="bg-[#0a0e14]/90 border border-emerald-500/50 p-2.5 rounded-xl text-[11px] leading-relaxed text-emerald-200 shadow-sm flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-white">💡 Digital Scope Controls:</span> Click <strong className="text-emerald-300 font-extrabold">VOLTS/DIV</strong> to zoom vertical voltage height &amp; <strong className="text-sky-300 font-extrabold">TIMEBASE</strong> to zoom horizontal sweep speed!
              </div>
            </div>

            {/* Oscilloscope Hardware Control Dashboard */}
            <div className="flex flex-col gap-2.5 bg-[#0a0e14] border-2 border-[#1e293b] p-3 rounded-2xl shadow-2xl font-mono text-xs">
              <div className="text-xs font-black text-white uppercase tracking-wide flex items-center justify-between border-b border-[#1e293b] pb-2">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>🎛️ OSCILLOSCOPE SCALE CONTROLS</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/40">
                  INTERACTIVE DSO
                </span>
              </div>

              {/* Auto Scale & Export CSV Action Toolbar */}
              <div className="flex items-center justify-between bg-[#141a24] p-2 rounded-xl border border-purple-500/40 gap-2 flex-wrap">
                <span className="text-xs text-purple-300 font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block shadow-sm shadow-purple-400" />
                  <span>UTILITIES:</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setVoltsPerDiv(1.0);
                      setTimePerDiv(1.0);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#1f6beb]/30 text-[#58a6ff] border border-[#1f6beb] hover:bg-[#1f6beb] hover:text-white transition-all cursor-pointer shadow flex items-center gap-1.5"
                    title="Auto scale scope vertical & horizontal base to 1.0x"
                  >
                    🎯 Auto Scale
                  </button>
                  <button
                    onClick={() => {
                      const vdc0 = (3 * Math.sqrt(2) / Math.PI) * 415;
                      const radAlpha = (firingAngle * Math.PI) / 180;
                      const omega = 2 * Math.PI * 50;
                      const deltaVdc = (3 / Math.PI) * omega * (commutationLc / 1000) * ctrlLoadCurrent;
                      const vdc = vdc0 * Math.cos(radAlpha) - deltaVdc;
                      const cosArg = Math.max(-1, Math.min(1, Math.cos(radAlpha) - (2 * omega * (commutationLc / 1000) * ctrlLoadCurrent) / (415 * Math.SQRT2)));
                      const muDeg = Math.max(0, (Math.acos(cosArg) - radAlpha) * (180 / Math.PI));
                      const dpf = Math.cos(radAlpha + (muDeg * Math.PI / 180) / 2);
                      const totalPf = 0.955 * dpf;
                      const idAvg = ctrlLoadCurrent / 3;
                      const idRms = ctrlLoadCurrent / Math.sqrt(3);
                      const pLossScr = 1.1 * idAvg + 0.002 * Math.pow(idRms, 2) + 0.05;
                      const tj = 25 + pLossScr * 3.92;

                      let csv = 'Timestamp,Firing_Angle_alpha_deg,Commutation_Lc_mH,Load_Current_Idc_A,Output_Voltage_Vdc_V,Commutation_Drop_DeltaV_V,Overlap_Angle_mu_deg,Displacement_PF_DPF,Total_PF,THD_Percent,Junction_Temp_degC\n';
                      csv += `${new Date().toISOString()},${firingAngle},${commutationLc},${ctrlLoadCurrent},${vdc.toFixed(2)},${deltaVdc.toFixed(2)},${muDeg.toFixed(2)},${dpf.toFixed(3)},${totalPf.toFixed(3)},31.1,${tj.toFixed(1)}\n`;

                      const link = document.createElement('a');
                      link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
                      link.download = `foundation_phase_control_telemetry_alpha_${firingAngle}deg.csv`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#238636]/30 text-[#3fb950] border border-[#238636] hover:bg-[#238636] hover:text-white transition-all cursor-pointer shadow flex items-center gap-1.5"
                    title="Export telemetry data as CSV file"
                  >
                    📄 Export CSV Data
                  </button>
                </div>
              </div>

              {/* Volts/Div Control Row */}
              <div className="flex items-center justify-between bg-[#141a24] p-2 rounded-xl border border-emerald-500/40">
                <span className="text-xs text-emerald-300 font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-400" />
                  <span>VOLTS / DIV:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { val: 0.5, label: '0.5x' },
                    { val: 1.0, label: '1.0x (Norm)' },
                    { val: 2.0, label: '2.0x' }
                  ].map((v) => (
                    <button
                      key={v.val}
                      onClick={() => setVoltsPerDiv(v.val)}
                      className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer min-h-[36px] ${
                        voltsPerDiv === v.val
                          ? 'bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/40 border-2 border-white scale-105'
                          : 'bg-[#1e293b] text-emerald-200 border-2 border-emerald-500/40 hover:text-white hover:bg-emerald-950 hover:border-emerald-300'
                      }`}
                      title={`Set Vertical Scale Volts/Div to ${v.label}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timebase Control Row */}
              <div className="flex items-center justify-between bg-[#141a24] p-2 rounded-xl border border-sky-500/40">
                <span className="text-xs text-sky-300 font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block shadow-sm shadow-sky-400" />
                  <span>TIMEBASE:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { val: 0.5, label: '0.5x' },
                    { val: 1.0, label: '1.0x (Norm)' },
                    { val: 2.0, label: '2.0x' }
                  ].map((tb) => (
                    <button
                      key={tb.val}
                      onClick={() => setTimePerDiv(tb.val)}
                      className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer min-h-[36px] ${
                        timePerDiv === tb.val
                          ? 'bg-sky-400 text-slate-950 font-black shadow-lg shadow-sky-500/40 border-2 border-white scale-105'
                          : 'bg-[#1e293b] text-sky-200 border-2 border-sky-500/40 hover:text-white hover:bg-sky-950 hover:border-sky-300'
                      }`}
                      title={`Set Horizontal Sweep Timebase to ${tb.label}`}
                    >
                      {tb.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slow Motion Control Row */}
              <div className="flex items-center justify-between bg-[#141a24] p-2 rounded-xl border border-amber-500/40">
                <span className="text-xs text-amber-300 font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span>🐢</span> <span>SLOW MO:</span>
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { speed: 1.0, label: '1.0x' },
                    { speed: 0.5, label: '0.5x' },
                    { speed: 0.25, label: '0.25x' },
                    { speed: 0.1, label: '0.1x' }
                  ].map((s) => (
                    <button
                      key={s.speed}
                      onClick={() => setTimeSpeed(s.speed)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-black transition-all cursor-pointer min-h-[34px] ${
                        timeSpeed === s.speed
                          ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/40 border-2 border-white scale-105'
                          : 'bg-[#1e293b] text-amber-200 border border-amber-500/40 hover:text-white hover:bg-amber-950'
                      }`}
                      title={`Set Simulation Speed to ${s.label}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] p-2 rounded-xl">
              <canvas ref={scopeCanvasRef} width={300} height={150} className="w-full h-[150px] rounded" />
            </div>

            {/* LOSS BREAKDOWN */}
            <div className="bg-[#0d1117] border border-[#8957e5]/50 rounded-xl p-3 text-xs font-mono">
              <div className="text-[#d2a8ff] font-extrabold uppercase flex justify-between mb-1">
                <span>LOSS BREAKDOWN:</span>
                <span className={transistorTemp > 130 ? 'text-[#f85149]' : 'text-[#3fb950]'}>
                  {transistorTemp > 130 ? '⚠️ OVERHEAT' : 'OK'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[#c9d1d9] text-[11px]">
                <div>Pcond: <span className="text-[#e3b341] font-bold">{(Math.pow(transistorCurrent, 2) * 0.05 * (pwmDuty / 100)).toFixed(2)} W</span></div>
                <div>Psw: <span className="text-[#58a6ff] font-bold">{(0.5 * busVoltage * transistorCurrent * 40e-9 * pwmFreq * 1000).toFixed(2)} W</span></div>
                <div className="col-span-2 border-t border-[#30363d] pt-1">
                  Ptotal: <span className="text-[#f85149] font-bold">{(Math.pow(transistorCurrent, 2) * 0.05 * (pwmDuty / 100) + 0.5 * busVoltage * transistorCurrent * 40e-9 * pwmFreq * 1000).toFixed(2)} W</span>
                </div>
              </div>
            </div>

            {/* JUNCTION PHYSICS SUMMARY */}
            <div className="bg-[#0d1117] border border-[#30363d] p-3 rounded-xl text-[11px] text-[#c9d1d9] leading-relaxed">
              <div className="text-[#58a6ff] font-bold uppercase mb-1">Working Principle Physics:</div>
              {activeTopic === 'transistor' ? (
                <span>
                  Gate voltage {gateDriveOn ? 'Vgs=10V creates N-channel in P-substrate' : 'below threshold Vth (Vgs=0V)'}.
                  Current flows with low resistance Rds(on)=0.05Ω in Saturation mode.
                </span>
              ) : (
                <span>
                  Gate pulse Ig excites P2 gate layer, collapsing reverse depletion region J2 and latching PNPN structure ON.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-[#0a0e14] text-[#c9d1d9] font-sans flex flex-col gap-3 p-2 sm:p-3 md:p-4 rounded-2xl border border-[#1e293b] shadow-2xl select-none relative">
      {/* 1. COMPACT INTEGRATED TOP BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141a24] border border-[#1e293b] rounded-xl p-3 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToOverview && onNavigateToOverview()}
            className="px-3 py-1.5 rounded-lg border border-[#1e293b] hover:border-slate-500 hover:text-white text-xs font-semibold bg-transparent text-slate-300 transition-all cursor-pointer min-h-[36px]"
          >
            ← Overview
          </button>
          <div>
            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
              Suite Overview / Foundation Lab
            </div>
            <h2 className="text-base font-extrabold text-white tracking-tight">
              Power Electronics Principles
            </h2>
          </div>
        </div>

        {/* Integrated Progress, Slow Motion & Engine Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Progress Badge */}
          <div className="h-9 px-3 flex items-center gap-2 bg-[#0a0e14] border border-[#1e293b] rounded-xl text-xs font-mono">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400 font-bold hidden sm:inline">Progress:</span>
            <span className={completedCount === 5 ? 'text-[#10b981] font-bold' : 'text-sky-400 font-bold'}>
              {completedCount}/5 ({progressPct.toFixed(0)}%)
            </span>
          </div>

          {/* DSO QUICK CONTROLS: Volts/Div & Timebase */}
          <div className="hidden xl:flex h-9 items-center gap-1 bg-[#0a0e14] border border-emerald-500/50 px-2 rounded-xl font-mono text-xs shadow-md">
            <span className="text-[11px] font-black text-emerald-300 px-1">V/DIV:</span>
            {[
              { val: 0.5, label: '0.5x' },
              { val: 1.0, label: '1.0x' },
              { val: 2.0, label: '2.0x' }
            ].map((v) => (
              <button
                key={v.val}
                onClick={() => setVoltsPerDiv(v.val)}
                className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  voltsPerDiv === v.val
                    ? 'bg-emerald-400 text-slate-950 font-black shadow-sm'
                    : 'text-emerald-300 hover:text-white hover:bg-emerald-950/60'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="hidden xl:flex h-9 items-center gap-1 bg-[#0a0e14] border border-sky-500/50 px-2 rounded-xl font-mono text-xs shadow-md">
            <span className="text-[11px] font-black text-sky-300 px-1">TIMEBASE:</span>
            {[
              { val: 0.5, label: '0.5x' },
              { val: 1.0, label: '1.0x' },
              { val: 2.0, label: '2.0x' }
            ].map((tb) => (
              <button
                key={tb.val}
                onClick={() => setTimePerDiv(tb.val)}
                className={`px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  timePerDiv === tb.val
                    ? 'bg-sky-400 text-slate-950 font-black shadow-sm'
                    : 'text-sky-300 hover:text-white hover:bg-sky-950/60'
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>

          {/* SLOW MOTION SPEED SELECTOR BUTTONS */}
          <div className="h-9 px-2 flex items-center gap-1 bg-[#0a0e14] border border-[#1e293b] rounded-xl font-mono">
            <span className="text-[10px] text-slate-400 font-bold px-1 hidden md:inline">SPEED:</span>
            {[
              { speed: 1.0, label: '1.0x' },
              { speed: 0.5, label: '0.5x Slow' },
              { speed: 0.25, label: '0.25x' },
              { speed: 0.1, label: '0.1x' }
            ].map((s) => (
              <button
                key={s.speed}
                onClick={() => setTimeSpeed(s.speed)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  timeSpeed === s.speed
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={`Set Simulation Speed to ${s.label}`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isPlaying
                ? 'bg-[#10b981] text-slate-950 hover:bg-[#059669]'
                : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
            }`}
          >
            {isPlaying ? '⏸ Pause Engine' : '▶ Resume Engine'}
          </button>
        </div>
      </div>

      <AlarmsAndAlertsModal
        isOpen={showAlarmsModal}
        onClose={() => setShowAlarmsModal(false)}
        alarmLog={labAlarmLog}
        onClearLog={() => setLabAlarmLog([])}
        moduleName="PowerElectronics Foundation Lab"
      />

      {/* 2. TOPIC SELECTOR TABS & MOBILE NAV */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none snap-x snap-mandatory flex-1">
          {TOPICS.map((t) => {
            const isActive = activeTopic === t.id;
            const isDone = completedTopics[t.id];

            return (
              <button
                key={t.id}
                onClick={() => setActiveTopic(activeTopic === t.id ? null : t.id)}
                className={`snap-start shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-all text-xs cursor-pointer min-h-[36px] ${
                  isActive
                    ? 'bg-[#10b981] text-slate-950 border-[#10b981] font-bold shadow-md'
                    : isDone
                    ? 'bg-[#141a24] border-[#10b981]/40 text-slate-200 hover:border-[#10b981]'
                    : 'bg-[#141a24] border-[#1e293b] text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
              >
                <span className="text-sm shrink-0">{t.icon}</span>
                <span className="font-semibold truncate">{t.title.replace(/^\d+\.\s*/, '')}</span>
                {isDone && <span className="text-emerald-500 font-bold text-xs shrink-0">✔</span>}
              </button>
            );
          })}
        </div>

        {/* Mobile View Segment Tabs (<1024px) */}
        {activeTopic && (
          <div className="flex lg:hidden items-center gap-1 bg-[#141a24] border border-[#1e293b] p-1 rounded-xl shrink-0">
            {(['controls', 'schematic', 'scope'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveMobileTab(tab)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold capitalize transition-all cursor-pointer ${
                  activeMobileTab === tab
                    ? 'bg-[#10b981] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MAIN CONTENT 3-COLUMN GRID LAYOUT */}
      {activeTopic ? (
        <div className="flex flex-col gap-3">
          {/* WORKSHOP CONTROL BANNER */}
          <div className="flex items-center justify-between bg-[#161b22] border-l-4 border border-[#30363d] rounded-xl px-3 py-2 shadow-sm transition-all duration-300" style={{ borderLeftColor: activeMeta.colorHex }}>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-[11px] font-mono text-[#8b949e] uppercase tracking-wider font-extrabold">Active Workshop:</span>
              <span className="text-xs font-mono font-extrabold text-white flex items-center gap-1.5">
                <span>{activeMeta.icon}</span>
                <span style={{ color: activeMeta.colorHex }}>{activeMeta.title}</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f6beb]/10 border border-[#1f6beb]/30 text-[#58a6ff] font-bold">
                Interactive Simulator Active
              </span>
            </div>
            <button
              onClick={() => setActiveTopic(null)}
              className="px-3 py-1 rounded-lg bg-[#21262d] hover:bg-red-950 border border-[#30363d] hover:border-red-500 text-[11px] font-mono font-extrabold text-[#c9d1d9] hover:text-red-200 transition-all cursor-pointer flex items-center gap-1"
            >
              <span>✕ Close</span>
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 items-start w-full">
            {/* COLUMN 1 (LEFT): CONTROLS & THEORY */}
            <div className={`${activeMobileTab === 'controls' ? 'flex' : 'hidden lg:flex'} flex-col gap-3 bg-[#141a24] border border-[#1e293b] p-3.5 rounded-2xl shadow-xl border-t-4 w-full lg:w-[300px] xl:w-[320px] lg:shrink-0 lg:overflow-y-auto lg:h-[calc(100vh-210px)] lg:max-h-[740px] scrollbar-none`} style={{ borderTopColor: activeMeta.colorHex }}>
              <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 bg-[#0a0e14] p-2 rounded-t-xl -mx-3.5 -mt-3.5 mb-1 border-l-4" style={{ borderLeftColor: activeMeta.colorHex }}>
                <h3 className="text-xs font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4" style={{ color: activeMeta.colorHex }} />
                  <span>Circuit Controls</span>
                </h3>
                <button
                  onClick={() => toggleTopicCompletion(activeTopic)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                    completedTopics[activeTopic]
                      ? 'bg-[#238636] text-white border-[#3fb950]'
                      : 'bg-[#21262d] text-[#c9d1d9] border-[#30363d] hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{completedTopics[activeTopic] ? 'Done' : 'Mark Done'}</span>
                </button>
              </div>

              {/* Interactive Controls Guidance Banner */}
              <div className="bg-[#0a0e14]/90 border border-sky-500/40 p-2.5 rounded-xl text-[11px] leading-relaxed text-sky-200 shadow-sm flex items-start gap-2">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-white">💡 Hover for Instant Physics Notes:</span> Hover over (or tap) any slider below to reveal a floating physics popover explaining what happens when values change!
                </div>
              </div>

              {/* TOPIC 1 CONTROLS */}
              {activeTopic === 'diode' && (
                <div className="flex flex-col gap-4 text-xs font-mono">
                  {/* Diode Technology Type Selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                      1. Diode Technology & Type:
                    </label>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { id: 'standard', label: '1N5408 (PN)', trr: '2000ns' },
                        { id: 'fast', label: 'MUR460 (Fast)', trr: '50ns' },
                        { id: 'schottky', label: 'MBR20100 (Schottky)', trr: '10ns' }
                      ].map((dt) => (
                        <button
                          key={dt.id}
                          onClick={() => setDiodeType(dt.id as any)}
                          className={`w-full px-3 py-2 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            diodeType === dt.id
                              ? 'border-[#10b981] bg-[#1e293b]/60 text-[#10b981] font-bold'
                              : 'bg-[#0a0e14] text-slate-300 border-[#1e293b] hover:text-white hover:border-slate-500'
                          }`}
                        >
                          <span className="font-bold">{dt.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">trr={dt.trr}</span>
                        </button>
                      ))}
                    </div>
                  </div>

              {/* Redesigned Sliders with Floating Hover Physics Popovers */}
              {/* Junction Temp (Tj) */}
              <div className="relative group flex flex-col gap-2 min-h-[48px] justify-center p-2 rounded-xl border border-transparent hover:border-amber-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Junction Temp (Tj):</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-100 font-bold font-mono">{diodeTemp} °C</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDiodeTemp(Math.max(25, diodeTemp - 5))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center select-none active:scale-90 transition-all cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="25"
                    max="150"
                    step="5"
                    value={diodeTemp}
                    onChange={(e) => setDiodeTemp(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-[#10b981]"
                  />
                  <button
                    onClick={() => setDiodeTemp(Math.min(150, diodeTemp + 5))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center select-none active:scale-90 transition-all cursor-pointer"
                  >
                    +
                  </button>
                </div>
                {/* FLOATING HOVER POPOVER */}
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-amber-300 text-[10px] font-sans p-2 rounded-xl border border-amber-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Higher Tj reduces forward drop Vf (-2.1mV/°C), increasing leakage &amp; thermal dissipation.
                </div>
              </div>

              {/* Switching Frequency */}
              <div className="relative group flex flex-col gap-2 min-h-[48px] justify-center p-2 rounded-xl border border-transparent hover:border-sky-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Switching Freq (F_sw):</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-100 font-bold font-mono">{diodeFrequency} kHz</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDiodeFrequency(Math.max(1, diodeFrequency - 5))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center select-none active:scale-90 transition-all cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="5"
                    value={diodeFrequency}
                    onChange={(e) => setDiodeFrequency(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-[#10b981]"
                  />
                  <button
                    onClick={() => setDiodeFrequency(Math.min(100, diodeFrequency + 5))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center select-none active:scale-90 transition-all cursor-pointer"
                  >
                    +
                  </button>
                </div>
                {/* FLOATING HOVER POPOVER */}
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-sky-300 text-[10px] font-sans p-2 rounded-xl border border-sky-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Higher f_sw increases reverse recovery transition losses (Psw ∝ f_sw) &amp; switching heat.
                </div>
              </div>

              {/* AC Source Voltage */}
              <div className="relative group flex flex-col gap-2 min-h-[48px] justify-center p-2 rounded-xl border border-transparent hover:border-emerald-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">AC Source Voltage:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-100 font-bold font-mono">{diodeAcVac} V RMS</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDiodeAcVac(Math.max(0, diodeAcVac - 0.5))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center select-none active:scale-90 transition-all cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="0.5"
                    value={diodeAcVac}
                    onChange={(e) => setDiodeAcVac(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-[#10b981]"
                  />
                  <button
                    onClick={() => setDiodeAcVac(Math.min(12, diodeAcVac + 0.5))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center select-none active:scale-90 transition-all cursor-pointer"
                  >
                    +
                  </button>
                </div>
                {/* FLOATING HOVER POPOVER */}
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-emerald-300 text-[10px] font-sans p-2 rounded-xl border border-emerald-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Higher Vac increases peak forward current &amp; elevates Peak Inverse Voltage (PIV) reverse stress.
                </div>
              </div>

              {/* DC Bias Voltage */}
              <div className="relative group flex flex-col gap-2 min-h-[48px] justify-center p-2 rounded-xl border border-transparent hover:border-indigo-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">DC Bias Voltage:</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-100 font-bold font-mono">
                    {diodeBias > 0 ? `+${diodeBias.toFixed(1)}` : diodeBias.toFixed(1)} V
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDiodeBias(Math.max(-5.0, Number((diodeBias - 0.1).toFixed(1))))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center select-none active:scale-90 transition-all cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="-5.0"
                    max="1.0"
                    step="0.1"
                    value={diodeBias}
                    onChange={(e) => setDiodeBias(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-[#10b981]"
                  />
                  <button
                    onClick={() => setDiodeBias(Math.min(1.0, Number((diodeBias + 0.1).toFixed(1))))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center select-none active:scale-90 transition-all cursor-pointer"
                  >
                    +
                  </button>
                </div>
                {/* FLOATING HOVER POPOVER */}
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-indigo-300 text-[10px] font-sans p-2 rounded-xl border border-indigo-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Positive bias shifts PN junction into conduction; negative bias expands depletion layer width.
                </div>
              </div>

              {/* Load Resistor */}
              <div className="relative group flex flex-col gap-2 min-h-[48px] justify-center p-2 rounded-xl border border-transparent hover:border-amber-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Load Resistor (Rl):</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-100 font-bold font-mono">{diodeLoad} Ω</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDiodeLoad(Math.max(10, diodeLoad - 10))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center select-none active:scale-90 transition-all cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={diodeLoad}
                    onChange={(e) => setDiodeLoad(Number(e.target.value))}
                    className="flex-1 h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-[#10b981]"
                  />
                  <button
                    onClick={() => setDiodeLoad(Math.min(1000, diodeLoad + 10))}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold flex items-center justify-center select-none active:scale-90 transition-all cursor-pointer"
                  >
                    +
                  </button>
                </div>
                {/* FLOATING HOVER POPOVER */}
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-amber-300 text-[10px] font-sans p-2 rounded-xl border border-amber-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Decreasing Rl draws higher load current IL, increasing diode conduction loss (Pcond = Vf × IL).
                </div>
              </div>

              {/* Fault Injection */}
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                  Fault Injection:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'short', label: 'Short' },
                    { id: 'open', label: 'Open' },
                    { id: 'leaky', label: 'Leaky' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setDiodeFault(f.id as any)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                        diodeFault === f.id
                          ? f.id === 'none'
                            ? 'bg-[#10b981] text-slate-950 font-extrabold border border-emerald-450'
                            : 'bg-red-500 text-slate-950 font-extrabold border border-red-400'
                          : 'bg-[#141a24] text-slate-355 border border-[#1e293b] hover:text-white hover:border-slate-500'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TOPIC 2 CONTROLS */}
          {activeTopic === 'rectifiers' && (
            <div className="flex flex-col gap-4 text-xs sm:text-sm font-mono">
              <div>
                <label className="text-xs sm:text-sm text-white block mb-1.5 uppercase font-bold tracking-wide">1. RECTIFIER TOPOLOGY:</label>
                <div className="flex flex-col gap-1.5">
                  {[
                    { id: 'half', label: '1-Phase Half Wave (1 Diode)' },
                    { id: 'center_tap', label: '1-Phase Center Tapped (2 Diodes)' },
                    { id: 'full_bridge', label: '1-Phase Bridge (4 Diodes)' },
                    { id: 'three_phase', label: '3-Phase 6-Pulse Diode (6 Diodes)' }
                  ].map((rt) => (
                    <button
                      key={rt.id}
                      onClick={() => setRectifierType(rt.id as any)}
                      className={`py-2 px-3 rounded-lg text-left text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        rectifierType === rt.id
                          ? 'bg-[#1f6beb] text-white border-2 border-[#58a6ff] shadow-md'
                          : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d] hover:text-white'
                      }`}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm text-white block mb-1.5 uppercase font-bold tracking-wide">2. LOAD FILTER TYPE:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'R', label: 'R (Resistive)' },
                    { id: 'RL', label: 'RL (Inductive)' },
                    { id: 'RC', label: 'RC (Filtered)' }
                  ].map((lt) => (
                    <button
                      key={lt.id}
                      onClick={() => setRectifierLoadType(lt.id as any)}
                      className={`py-2 px-2 rounded-lg text-center text-xs font-bold transition-all cursor-pointer ${
                        rectifierLoadType === lt.id
                          ? 'bg-[#238636] text-white border-2 border-[#3fb950] shadow-sm'
                          : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d] hover:text-white'
                      }`}
                    >
                      {lt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative group p-2 rounded-xl border border-transparent hover:border-sky-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>AC SOURCE VOLTAGE (Vac):</span>
                  <span className="text-white font-extrabold text-sm">{rectifierVac} V RMS</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="415"
                  step="5"
                  value={rectifierVac}
                  onChange={(e) => setRectifierVac(parseInt(e.target.value))}
                  className="w-full accent-[#58a6ff] h-2 cursor-pointer"
                />
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-sky-300 text-[10px] font-sans p-2 rounded-xl border border-sky-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Higher Vac scales peak DC output Vdc = 1.414 × Vac &amp; increases diode PIV requirements.
                </div>
              </div>

              <div className="relative group p-2 rounded-xl border border-transparent hover:border-amber-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>LOAD RESISTANCE (Rl):</span>
                  <span className="text-white font-extrabold text-sm">{rectifierLoad} Ω</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="5"
                  value={rectifierLoad}
                  onChange={(e) => setRectifierLoad(parseInt(e.target.value))}
                  className="w-full accent-[#58a6ff] h-2 cursor-pointer"
                />
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-amber-300 text-[10px] font-sans p-2 rounded-xl border border-amber-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Decreasing Rl draws higher load current, increasing voltage ripple (ΔVout) in capacitor filters.
                </div>
              </div>

              {rectifierLoadType === 'RC' && (
                <div className="relative group p-2 rounded-xl border border-transparent hover:border-emerald-500/40 hover:bg-[#0d1117]/80 transition-all">
                  <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                    <span>CAPACITOR FILTER (C):</span>
                    <span className="text-[#3fb950] font-extrabold text-sm">{filterCapacitance} µF</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="50"
                    value={filterCapacitance}
                    onChange={(e) => setFilterCapacitance(parseInt(e.target.value))}
                    className="w-full accent-[#3fb950] h-2 cursor-pointer"
                  />
                  <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-emerald-300 text-[10px] font-sans p-2 rounded-xl border border-emerald-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                    💡 <strong>Hover Physics:</strong> Higher C reduces output ripple (ΔVout = Idc / (f_rip × C)), smoothing output into pure DC.
                  </div>
                </div>
              )}

              {rectifierLoadType === 'RL' && (
                <div className="relative group p-2 rounded-xl border border-transparent hover:border-cyan-500/40 hover:bg-[#0d1117]/80 transition-all">
                  <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                    <span>SMOOTHING INDUCTOR (L):</span>
                    <span className="text-[#39c5cf] font-extrabold text-sm">{filterInductance} mH</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="10"
                    value={filterInductance}
                    onChange={(e) => setFilterInductance(parseInt(e.target.value))}
                    className="w-full accent-[#39c5cf] h-2 cursor-pointer"
                  />
                  <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-cyan-300 text-[10px] font-sans p-2 rounded-xl border border-cyan-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                    💡 <strong>Hover Physics:</strong> Higher L smooths load current Idc, maintaining continuous current mode (CCM) &amp; lowering THD.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TOPIC 3 CONTROLS (TRANSISTOR SWITCH) */}
          {activeTopic === 'transistor' && (
            <div className="flex flex-col gap-4 text-xs sm:text-sm font-mono">
              <div>
                <label className="text-xs sm:text-sm text-white block mb-1.5 uppercase font-bold tracking-wide">1. TRANSISTOR DEVICE TYPE:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'bjt', label: 'BJT (NPN)' },
                    { id: 'mosfet', label: 'MOSFET' },
                    { id: 'igbt', label: 'IGBT' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTransistorType(t.id as any)}
                      className={`py-2 px-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                        transistorType === t.id
                          ? 'bg-[#8957e5] text-white border-2 border-[#d2a8ff] shadow-md'
                          : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d] hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* OPERATING CONDITIONS: Vbus, Id, Tj */}
              <div className="relative group p-2 rounded-xl border border-transparent hover:border-sky-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>DC BUS VOLTAGE (Vdc):</span>
                  <span className="text-white font-extrabold text-sm">{busVoltage} V</span>
                </div>
                <input
                  type="range"
                  min={transistorType === 'bjt' ? "12" : "100"}
                  max={transistorType === 'bjt' ? "24" : "600"}
                  step={transistorType === 'bjt' ? "1" : "25"}
                  value={busVoltage}
                  onChange={(e) => setBusVoltage(parseInt(e.target.value))}
                  className="w-full accent-[#58a6ff] h-2 cursor-pointer"
                />
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-sky-300 text-[10px] font-sans p-2 rounded-xl border border-sky-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Higher Vdc scales switching losses Psw = 0.5 × Vdc × Iload × fsw × (tr+tf) &amp; voltage stress.
                </div>
              </div>

              <div className="relative group p-2 rounded-xl border border-transparent hover:border-amber-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>LOAD CURRENT ({transistorType === 'bjt' ? 'Ic Load' : 'Id / Ic'}):</span>
                  <span className="text-white font-extrabold text-sm">
                    {transistorType === 'bjt' ? (transistorCurrent > 5 ? 5 : transistorCurrent).toFixed(1) : transistorCurrent} A
                  </span>
                </div>
                <input
                  type="range"
                  min={transistorType === 'bjt' ? "0.1" : "1"}
                  max={transistorType === 'bjt' ? "5.0" : "30"}
                  step={transistorType === 'bjt' ? "0.1" : "1"}
                  value={transistorType === 'bjt' && transistorCurrent > 5 ? 5 : transistorCurrent}
                  onChange={(e) => setTransistorCurrent(parseFloat(e.target.value))}
                  className="w-full accent-[#e3b341] h-2 cursor-pointer"
                />
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-amber-300 text-[10px] font-sans p-2 rounded-xl border border-amber-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Higher load current increases conduction loss Pcond = I_rms² × Rds(on), shifting Q-point.
                </div>
              </div>

              <div className="relative group p-2 rounded-xl border border-transparent hover:border-emerald-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>JUNCTION TEMP (Tj):</span>
                  <span className={`font-extrabold text-sm ${transistorTemp > 130 ? 'text-[#f85149]' : transistorTemp > 90 ? 'text-[#e3b341]' : 'text-[#3fb950]'}`}>
                    {transistorTemp} °C
                  </span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="150"
                  step="5"
                  value={transistorTemp}
                  onChange={(e) => setTransistorTemp(parseInt(e.target.value))}
                  className="w-full accent-[#3fb950] h-2 cursor-pointer"
                />
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-emerald-300 text-[10px] font-sans p-2 rounded-xl border border-emerald-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Higher Tj increases Rds(on) by +0.65%/°C, elevating conduction losses &amp; thermal risk.
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm text-white block mb-1.5 uppercase font-bold tracking-wide">2. GATE / BASE DRIVE TRIGGER:</label>
                <button
                  onMouseDown={() => { if (gateMode === 'manual') setGateDriveOn(true); }}
                  onMouseUp={() => { if (gateMode === 'manual') setGateDriveOn(false); }}
                  onClick={() => setGateDriveOn(!gateDriveOn)}
                  className={`w-full py-2.5 px-3 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                    transistorFault === 'gate_open'
                      ? 'bg-[#da3633]/20 border border-[#da3633] text-[#f85149] cursor-not-allowed'
                      : gateDriveOn
                      ? 'bg-[#238636] border-2 border-[#3fb950] text-white shadow-[#238636]/30'
                      : 'bg-[#21262d] border border-[#30363d] text-[#c9d1d9] hover:text-white'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${gateDriveOn && transistorFault !== 'gate_open' ? 'bg-[#3fb950] animate-pulse' : 'bg-[#da3633]'}`} />
                  {transistorFault === 'gate_open'
                    ? '⚠️ GATE DRIVE OPEN (FAULT)'
                    : gateDriveOn
                    ? transistorType === 'bjt'
                      ? `BASE DRIVE: HIGH (Ib = ${((transistorCurrent > 5 ? 5 : transistorCurrent) / 50 * 1000).toFixed(0)} mA, Vbe = 0.7V) [ON]`
                      : 'GATE SIGNAL: HIGH (10V / 100mA) [ON]'
                    : 'PUSH / CLICK TO TRIGGER DRIVE [OFF]'}
                </button>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs sm:text-sm text-white uppercase font-bold tracking-wide">3. DRIVE MODE & PWM SETTINGS:</label>
                  {transistorType !== 'bjt' && (
                    <button
                      onClick={() => setShowMillerPlateau(!showMillerPlateau)}
                      className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${
                        showMillerPlateau ? 'bg-[#8957e5] text-white' : 'bg-[#21262d] text-[#c9d1d9]'
                      }`}
                    >
                      MILLER STEP: {showMillerPlateau ? 'ON' : 'OFF'}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'manual', label: 'Manual Push Button' },
                    { id: 'pwm', label: 'PWM Generator Mode' }
                  ].map((gm) => (
                    <button
                      key={gm.id}
                      onClick={() => {
                        setGateMode(gm.id as any);
                        if (gm.id === 'manual') setGateDriveOn(true);
                      }}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        gateMode === gm.id
                          ? 'bg-[#1f6beb] text-white border-2 border-[#58a6ff]'
                          : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d]'
                      }`}
                    >
                      {gm.label}
                    </button>
                  ))}
                </div>
              </div>

              {gateMode === 'pwm' && (
                <>
                  <div className="relative group p-2 rounded-xl border border-transparent hover:border-purple-500/40 hover:bg-[#0d1117]/80 transition-all">
                    <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                      <span>PWM FREQUENCY (f_sw):</span>
                      <span className="text-white font-extrabold text-sm">
                        {transistorType === 'bjt' ? `${pwmFreq > 2 ? 2 : pwmFreq} kHz (Max 2kHz)` : `${pwmFreq} kHz`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={transistorType === 'bjt' ? "0.1" : "1"}
                      max={transistorType === 'bjt' ? "2.0" : "50"}
                      step={transistorType === 'bjt' ? "0.1" : "1"}
                      value={transistorType === 'bjt' && pwmFreq > 2 ? 2 : pwmFreq}
                      onChange={(e) => setPwmFreq(parseFloat(e.target.value))}
                      className="w-full accent-[#8957e5] h-2 cursor-pointer"
                    />
                    <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-purple-300 text-[10px] font-sans p-2 rounded-xl border border-purple-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                      💡 <strong>Hover Physics:</strong> Higher f_sw enables smaller output filters, but linearly increases semiconductor switching losses.
                    </div>
                  </div>

                  <div className="relative group p-2 rounded-xl border border-transparent hover:border-purple-500/40 hover:bg-[#0d1117]/80 transition-all">
                    <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                      <span>DUTY CYCLE (D):</span>
                      <span className="text-white font-extrabold text-sm">{pwmDuty} %</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={pwmDuty}
                      onChange={(e) => setPwmDuty(parseInt(e.target.value))}
                      className="w-full accent-[#8957e5] h-2 cursor-pointer"
                    />
                    <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-purple-300 text-[10px] font-sans p-2 rounded-xl border border-purple-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                      💡 <strong>Hover Physics:</strong> Higher duty cycle increases average output voltage Vavg = D × Vdc &amp; overall conduction time.
                    </div>
                  </div>
                </>
              )}

              {/* LOSS BREAKDOWN & THERMAL STATUS */}
              {(() => {
                const icVal = transistorType === 'bjt' && transistorCurrent > 5 ? 5 : transistorCurrent;
                const duty = gateMode === 'pwm' ? pwmDuty / 100 : (gateDriveOn ? 1.0 : 0.0);
                const ibVal = icVal / 50; // hFE = 50
                const vbe = 0.7; // Vbe = 0.7V
                const vceSat = Math.min(1.2, Math.max(0.2, 0.3 + ((icVal - 0.1) / 4.9) * 0.5)); // 0.3V @ 1A, 0.8V @ 5A
                
                const pCondBjt = vceSat * icVal * duty;
                const pBaseBjt = vbe * ibVal * duty;
                const pTotalBjt = pCondBjt + pBaseBjt;

                const rdsOnMos = 0.05 * (1 + 0.0065 * (transistorTemp - 25));
                const pCondMos = Math.pow(icVal, 2) * rdsOnMos * duty;
                const pSwMos = 0.5 * busVoltage * icVal * 40e-9 * (pwmFreq * 1000);
                const pTotalMos = pCondMos + pSwMos;

                return (
                  <div className="bg-[#0d1117] border border-[#8957e5]/50 rounded-xl p-3 flex flex-col gap-1.5 text-xs font-mono">
                    <div className="text-[#d2a8ff] font-extrabold uppercase tracking-wider flex justify-between text-xs sm:text-sm">
                      <span>SEMICONDUCTOR LOSSES ({transistorType.toUpperCase()}):</span>
                      <span className={transistorTemp > 130 ? 'text-[#f85149] font-bold' : 'text-[#3fb950]'}>
                        {transistorTemp > 130 ? '⚠️ THERMAL DANGER' : 'THERMAL OK'}
                      </span>
                    </div>
                    {transistorType === 'bjt' ? (
                      <div className="grid grid-cols-2 gap-2 text-[#c9d1d9] mt-0.5">
                        <div>Vce(sat)@Tj: <span className="text-[#3fb950] font-bold">{vceSat.toFixed(2)} V</span></div>
                        <div>Ib Drive: <span className="text-[#58a6ff] font-bold">{(ibVal * 1000).toFixed(1)} mA</span></div>
                        <div>Pcond: <span className="text-[#e3b341] font-bold">{pCondBjt.toFixed(2)} W</span></div>
                        <div>Pbase: <span className="text-[#d2a8ff] font-bold">{pBaseBjt.toFixed(2)} W</span></div>
                        <div className="col-span-2 border-t border-[#30363d] pt-1">Ptotal: <span className="text-[#f85149] font-bold">{pTotalBjt.toFixed(2)} W</span></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-[#c9d1d9] mt-0.5">
                        <div>Rds(on)@Tj: <span className="text-[#3fb950] font-bold">{rdsOnMos.toFixed(3)} Ω</span></div>
                        <div>Pcond: <span className="text-[#e3b341] font-bold">{pCondMos.toFixed(2)} W</span></div>
                        <div>Psw (@{pwmFreq}kHz): <span className="text-[#58a6ff] font-bold">{pSwMos.toFixed(2)} W</span></div>
                        <div>Ptotal: <span className="text-[#f85149] font-bold">{pTotalMos.toFixed(2)} W</span></div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <label className="text-xs sm:text-sm text-white block mb-1.5 uppercase font-bold tracking-wide">4. FAULT INJECTION Test:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTransistorFault('none')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      transistorFault === 'none'
                        ? 'bg-[#238636] text-white border-2 border-[#3fb950]'
                        : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d]'
                    }`}
                  >
                    Normal (Healthy)
                  </button>
                  <button
                    onClick={() => setTransistorFault('gate_open')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      transistorFault === 'gate_open'
                        ? 'bg-[#da3633] text-white border-2 border-[#f85149]'
                        : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d]'
                    }`}
                  >
                    ⚠️ Gate Drive Open
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TOPIC 4 CONTROLS */}
          {activeTopic === 'scr' && (
            <div className="flex flex-col gap-4 text-xs sm:text-sm font-mono">
              {/* FIRING ANGLE ALPHA SLIDER */}
              <div className="relative group p-2 rounded-xl border border-transparent hover:border-amber-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>FIRING ANGLE (α):</span>
                  <span className="text-white font-extrabold text-sm">{scrFiringAlpha}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  step="1"
                  value={scrFiringAlpha}
                  onChange={(e) => setScrFiringAlpha(parseInt(e.target.value))}
                  className="w-full accent-[#e3b341] h-2 cursor-pointer"
                />
                <div className="text-xs text-[#e3b341] font-bold mt-1 flex justify-between">
                  <span>α = 0° [Full ON]</span>
                  <span>90° [Half]</span>
                  <span>180° [OFF]</span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-amber-300 text-[10px] font-sans p-2 rounded-xl border border-amber-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Increasing α delays gate trigger pulse, chopping output wave &amp; reducing Vdc = (Vm/π)(1 + cos α).
                </div>
              </div>

              {/* GATE CURRENT SLIDER */}
              <div className="relative group p-2 rounded-xl border border-transparent hover:border-pink-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>GATE CURRENT (Ig):</span>
                  <span className="text-white font-extrabold text-sm">{scrGateCurrent} mA</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="1"
                  value={scrGateCurrent}
                  onChange={(e) => setScrGateCurrent(parseInt(e.target.value))}
                  className="w-full accent-[#f778ba] h-2 cursor-pointer"
                />
                <div className="text-xs text-[#c9d1d9] mt-0.5">
                  Gate Threshold: <span className="text-[#3fb950] font-bold">Ig,t = 20 mA</span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-pink-300 text-[10px] font-sans p-2 rounded-xl border border-pink-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Higher gate current accelerates PNPN carrier injection, ensuring fast turn-on above latching threshold IL.
                </div>
              </div>

              {/* JUNCTION TEMP & HOLDING / LATCHING DYNAMICS */}
              <div className="relative group p-2 rounded-xl border border-transparent hover:border-emerald-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>JUNCTION TEMP (Tj):</span>
                  <span className="text-[#3fb950] font-extrabold text-sm">{scrTemp} °C</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="125"
                  step="5"
                  value={scrTemp}
                  onChange={(e) => setScrTemp(parseInt(e.target.value))}
                  className="w-full accent-[#3fb950] h-2 cursor-pointer"
                />
                <div className="text-xs text-[#c9d1d9] mt-1 flex justify-between">
                  <span>I_Latching(Tj): <b className="text-[#e3b341]">{(80 * Math.exp(-0.005 * (scrTemp - 25))).toFixed(1)} mA</b></span>
                  <span>I_Holding(Tj): <b className="text-[#3fb950]">{(50 * Math.exp(-0.005 * (scrTemp - 25))).toFixed(1)} mA</b></span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-emerald-300 text-[10px] font-sans p-2 rounded-xl border border-emerald-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Higher Tj lowers required gate trigger current (Igt) &amp; latching current (IL), but lowers blocking voltage.
                </div>
              </div>

              {/* CIRCUIT COMMUTATION TIME t_q */}
              <div className="relative group p-2 rounded-xl border border-transparent hover:border-sky-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>CIRCUIT COMMUTATION TIME (t_q):</span>
                  <span className={scrCommutationTime < 30 ? 'text-[#f85149] font-extrabold text-sm' : 'text-[#58a6ff] font-extrabold text-sm'}>
                    {scrCommutationTime} µs
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={scrCommutationTime}
                  onChange={(e) => setScrCommutationTime(parseInt(e.target.value))}
                  className="w-full accent-[#58a6ff] h-2 cursor-pointer"
                />
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-sky-300 text-[10px] font-sans p-2 rounded-xl border border-sky-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> If t_q &lt; t_off (30µs), the thyristor fails to turn OFF, causing a commutation failure fault!
                </div>
                {scrCommutationTime < 30 && (
                  <div className="text-xs text-[#f85149] font-bold mt-1 bg-[#da3633]/20 p-2 rounded-lg border border-[#f85149]">
                    ⚠️ COMMUTATION FAILURE! t_q ({scrCommutationTime}µs) &lt; t_off (30µs). SCR fails to turn OFF!
                  </div>
                )}
              </div>

              {/* SNUBBER PROTECTION TOGGLE */}
              <div className="flex items-center justify-between border-t border-[#21262d] pt-2.5">
                <div>
                  <span className="text-xs text-white font-bold block">RC SNUBBER FILTER:</span>
                  <span className="text-xs text-[#8b949e]">Rs=47Ω, Cs=0.1µF (Limits dv/dt)</span>
                </div>
                <button
                  onClick={() => setScrSnubber(!scrSnubber)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scrSnubber
                      ? 'bg-[#238636] text-white border border-[#3fb950]'
                      : 'bg-[#da3633] text-white border border-[#f85149]'
                  }`}
                >
                  {scrSnubber ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* TRIGGER & UNLATCH BUTTONS */}
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => {
                    setScrGatePulse(true);
                    setScrLatched(true);
                    setTimeout(() => setScrGatePulse(false), 400);
                  }}
                  className="w-full py-2.5 px-3 bg-[#e3b341] text-black font-extrabold rounded-lg shadow-lg hover:bg-[#f2cc60] flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>INJECT GATE TRIGGER PULSE ({scrGateCurrent}mA)</span>
                </button>

                <button
                  onClick={() => setScrLatched(false)}
                  className="w-full py-2 bg-[#21262d] text-[#f85149] border border-[#da3633] font-extrabold rounded-lg hover:bg-[#da3633]/20 text-xs sm:text-sm cursor-pointer"
                >
                  UN-LATCH SCR (COMMUTATION: CURRENT &lt; Ih = 50mA)
                </button>
              </div>

              {/* LIVE FORMULA DISPLAY */}
              <div className="bg-[#0d1117] border border-[#e3b341]/50 rounded-xl p-3 flex flex-col gap-1">
                <span className="text-xs font-bold text-[#e3b341] uppercase tracking-wider">LIVE HALF-WAVE CONTROLLED FORMULA:</span>
                <p className="text-xs sm:text-sm text-white font-mono font-bold">
                  Vdc = 0.45 × Vac × (1 + cos(α)) / 2
                </p>
                <p className="text-xs text-[#3fb950] font-mono">
                  = 0.45 × {scrAnodeVin}V × (1 + cos({scrFiringAlpha}°)) / 2 ={' '}
                  <span className="text-white font-extrabold text-sm">
                    {scrFault === 'gate_open'
                      ? '0.0 V (Gate Open)'
                      : scrFault === 'scr_short'
                      ? `${(0.45 * scrAnodeVin).toFixed(1)} V (Shorted)`
                      : `${(0.45 * scrAnodeVin * (1 + Math.cos((scrFiringAlpha * Math.PI) / 180)) / 2).toFixed(1)} V`}
                  </span>
                </p>
              </div>

              {/* FAULT INJECTION SELECTOR */}
              <div>
                <label className="text-xs sm:text-sm text-white block mb-1.5 uppercase font-bold tracking-wide">FAULT INJECTION TEST:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setScrFault('none')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold cursor-pointer ${
                      scrFault === 'none'
                        ? 'bg-[#238636] text-white border-2 border-[#3fb950]'
                        : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d]'
                    }`}
                  >
                    Normal (Healthy)
                  </button>
                  <button
                    onClick={() => setScrFault('gate_open')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold cursor-pointer ${
                      scrFault === 'gate_open'
                        ? 'bg-[#da3633] text-white border-2 border-[#f85149]'
                        : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d]'
                    }`}
                  >
                    ⚠️ Gate Open [Vdc=0]
                  </button>
                  <button
                    onClick={() => setScrFault('scr_short')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold cursor-pointer ${
                      scrFault === 'scr_short'
                        ? 'bg-[#da3633] text-white border-2 border-[#f85149]'
                        : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d]'
                    }`}
                  >
                    ⚠️ SCR Short [Always ON]
                  </button>
                  <button
                    onClick={() => setScrFault('dv_dt')}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold cursor-pointer ${
                      scrFault === 'dv_dt'
                        ? 'bg-[#e3b341] text-black border-2 border-[#f2cc60]'
                        : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d]'
                    }`}
                  >
                    ⚠️ dv/dt Spike [False ON]
                  </button>
                </div>
              </div>

              {/* ANODE VOLTAGE & LOAD RESISTANCE */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-xs text-white mb-1 font-semibold">
                    <span>ANODE Vac:</span>
                    <span className="text-white font-bold">{scrAnodeVin} V</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="250"
                    step="5"
                    value={scrAnodeVin}
                    onChange={(e) => setScrAnodeVin(parseInt(e.target.value))}
                    className="w-full accent-[#e3b341] h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-white mb-1 font-semibold">
                    <span>LOAD Rl:</span>
                    <span className="text-white font-bold">{scrLoadRes} Ω</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={scrLoadRes}
                    onChange={(e) => setScrLoadRes(parseInt(e.target.value))}
                    className="w-full accent-[#e3b341] h-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TOPIC 5 CONTROLS */}
          {activeTopic === 'controlled' && (
            <div className="flex flex-col gap-4 text-xs sm:text-sm font-mono">
              <div>
                <label className="text-xs sm:text-sm text-white block mb-1.5 uppercase font-bold tracking-wide">RECTIFIER TOPOLOGY:</label>
                <select
                  value={ctrlRectType}
                  onChange={(e) => setCtrlRectType(e.target.value as any)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white font-mono text-xs sm:text-sm focus:border-[#58a6ff] outline-none font-bold"
                >
                  <option value="1ph_half">1-Phase Half-Wave SCR</option>
                  <option value="1ph_full">1-Phase Full-Bridge SCR</option>
                  <option value="3ph_6pulse">3-Phase 6-Pulse SCR Bridge</option>
                </select>
              </div>

              <div className="relative group p-2 rounded-xl border border-transparent hover:border-emerald-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>FIRING ANGLE (α):</span>
                  <span className="text-white font-extrabold text-sm">{firingAngle}° ({((firingAngle / 180) * 10).toFixed(2)} ms delay)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="170"
                  step="1"
                  value={firingAngle}
                  onChange={(e) => setFiringAngle(parseInt(e.target.value))}
                  className="w-full accent-[#3fb950] h-2 cursor-pointer"
                />
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-emerald-300 text-[10px] font-sans p-2 rounded-xl border border-emerald-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Increasing α chops AC waveform, reducing Vdc = (2Vm/π)cos α &amp; lowering DPF power factor.
                </div>
              </div>

              {/* TRANSFORMER COMMUTATION INDUCTANCE Lc & OVERLAP MU */}
              <div className="relative group p-2 rounded-xl border border-transparent hover:border-sky-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>COMMUTATION LEAKAGE INDUCTANCE (Lc):</span>
                  <span className="text-[#58a6ff] font-extrabold text-sm">{commutationLc} mH</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={commutationLc}
                  onChange={(e) => setCommutationLc(parseFloat(e.target.value))}
                  className="w-full accent-[#58a6ff] h-2 cursor-pointer"
                />
                <div className="text-xs text-[#c9d1d9] mt-1 flex justify-between">
                  <span>Overlap Angle μ: <b className="text-[#e3b341]">
                    {Math.max(0, Math.acos(Math.max(-1, Math.min(1, Math.cos((firingAngle * Math.PI) / 180) - (2 * 2 * Math.PI * 50 * (commutationLc / 1000) * ctrlLoadCurrent) / (415 * Math.SQRT2)))) * (180 / Math.PI) - firingAngle).toFixed(1)}°
                  </b></span>
                  <span>Commutation Drop ΔVdc: <b className="text-[#f85149]">
                    {((3 / Math.PI) * 2 * Math.PI * 50 * (commutationLc / 1000) * ctrlLoadCurrent).toFixed(1)} V
                  </b></span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-sky-300 text-[10px] font-sans p-2 rounded-xl border border-sky-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Higher leakage inductance Lc increases overlap angle μ, causing a voltage notch during phase overlap.
                </div>
              </div>

              {/* LOAD CURRENT Idc */}
              <div className="relative group p-2 rounded-xl border border-transparent hover:border-amber-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>LOAD CURRENT (Idc):</span>
                  <span className="text-white font-extrabold text-sm">{ctrlLoadCurrent} A</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={ctrlLoadCurrent}
                  onChange={(e) => setCtrlLoadCurrent(parseInt(e.target.value))}
                  className="w-full accent-[#e3b341] h-2 cursor-pointer"
                />
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-amber-300 text-[10px] font-sans p-2 rounded-xl border border-amber-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Higher load current increases commutation drop ΔVdc = (3/π)ω Lc Idc &amp; broadens overlap angle μ.
                </div>
              </div>

              {/* LOAD TYPE R / RL / RLE */}
              <div>
                <label className="text-xs sm:text-sm text-white block mb-1.5 uppercase font-bold tracking-wide">LOAD TYPE & CONDUCTION MODE:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['r', 'rl', 'rle'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setCtrlLoadType(l)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                        ctrlLoadType === l
                          ? 'bg-[#238636] text-white border-2 border-[#3fb950]'
                          : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d]'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* RLE BATTERY BACK-EMF SLIDER & DCM/CCM BADGE & CONTINUOUS CHECK */}
              {ctrlLoadType === 'rle' && (
                <div className="bg-[#0d1117] border border-[#3fb950]/50 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs sm:text-sm text-white font-semibold">
                    <span>BACK-EMF LOAD (E):</span>
                    <span className="text-[#3fb950] font-extrabold text-sm">{batteryEbat} V DC</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="1"
                    value={batteryEbat}
                    onChange={(e) => setBatteryEbat(parseInt(e.target.value))}
                    className="w-full accent-[#3fb950] h-2 cursor-pointer"
                  />
                  {(() => {
                    const vdc0 = (3 * Math.sqrt(2) / Math.PI) * 415;
                    const radAlpha = (firingAngle * Math.PI) / 180;
                    const deltaVdc = (3 / Math.PI) * (2 * Math.PI * 50) * (commutationLc / 1000) * ctrlLoadCurrent;
                    const liveVdc = Math.max(0, vdc0 * Math.cos(radAlpha) - deltaVdc);
                    const rLoad = liveVdc > batteryEbat ? ((liveVdc - batteryEbat) / ctrlLoadCurrent) : 0;
                    return (
                      <div className="flex flex-col gap-1 text-[11px] font-mono pt-1.5 border-t border-[#21262d]">
                        <div className="flex justify-between text-[#c9d1d9]">
                          <span>Continuous Check:</span>
                          <span className="font-bold text-[#58a6ff]">V<sub>dc</sub> = E + I<sub>d</sub>·R</span>
                        </div>
                        <div className="text-[10px] text-[#8b949e]">
                          {liveVdc.toFixed(1)}V = {batteryEbat}V + {ctrlLoadCurrent}A × {rLoad.toFixed(2)}Ω
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-[#8b949e] font-bold">Conduction:</span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            liveVdc > batteryEbat
                              ? 'bg-[#238636]/20 text-[#3fb950] border border-[#3fb950]'
                              : 'bg-[#e3b341]/20 text-[#e3b341] border border-[#e3b341]'
                          }`}>
                            {liveVdc > batteryEbat ? '✔ CCM (Continuous Mode Vdc > E)' : '⚡ DCM (Discontinuous / Blocked Vdc <= E)'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* HARMONICS & POWER FACTOR ENGINEERING CARD (IEC 61000-3-12 & IEEE 519-2022) */}
              <div className="bg-[#0d1117] border border-[#8957e5]/50 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-[#d2a8ff] uppercase tracking-wider">HARMONICS & POWER FACTOR (IEC 61000-3-12):</span>
                    <div className="relative group cursor-pointer text-[#8957e5] font-bold text-xs">
                      ℹ️
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 absolute left-0 bottom-full mb-1 w-64 bg-[#161b22] text-[#c9d1d9] text-[10px] font-sans p-2 rounded-lg border border-[#8957e5] shadow-2xl z-40 leading-tight">
                        <strong>Standard Tooltip:</strong> IEC 61000-3-2 governs equipment ≤16A per phase. Since Idc=20A (&gt;16A and ≤75A per phase), IEC 61000-3-12 applies for harmonic limits.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHarmonicSpectrum(!showHarmonicSpectrum)}
                    className="text-xs text-[#58a6ff] hover:underline font-bold cursor-pointer"
                  >
                    {showHarmonicSpectrum ? 'Hide Spectrum' : 'Show Spectrum'}
                  </button>
                </div>

                {(() => {
                  const radAlpha = (firingAngle * Math.PI) / 180;
                  const omega = 2 * Math.PI * 50;
                  const cosArg = Math.max(-1, Math.min(1, Math.cos(radAlpha) - (2 * omega * (commutationLc / 1000) * ctrlLoadCurrent) / (415 * Math.SQRT2)));
                  const muRad = Math.acos(cosArg) - radAlpha;
                  const muDeg = Math.max(0, muRad * (180 / Math.PI));
                  const liveDpf = Math.cos(radAlpha + muRad / 2);
                  const vthd = (4.2 + 0.15 * commutationLc * (ctrlLoadCurrent / 10));
                  const isPass = vthd < 8.0;

                  return (
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-[#c9d1d9] mt-0.5">
                        <div>Line Current THD_i: <b className="text-[#f85149]">{ctrlRectType === '3ph_6pulse' ? '31.1 %' : '48.3 %'}</b></div>
                        <div>Displacement PF (DPF): <b className="text-[#3fb950]">{liveDpf.toFixed(3)}</b></div>
                        <div>Total Demand Dist. (TDD): <b className="text-[#e3b341]">{(31.1 * (ctrlLoadCurrent / 50)).toFixed(1)} %</b></div>
                        <div>Total Power Factor (PF): <b className="text-[#58a6ff]">{(0.955 * liveDpf).toFixed(3)}</b></div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] bg-[#161b22] p-1.5 rounded border border-[#21262d]">
                        <span className="text-[#8b949e]">IEEE 519-2022 Voltage THD limit (&lt;8.0%):</span>
                        <span className={`px-2 py-0.5 rounded font-extrabold ${isPass ? 'bg-[#238636]/30 text-[#3fb950] border border-[#3fb950]' : 'bg-[#da3633]/30 text-[#f85149] border border-[#f85149]'}`}>
                          {isPass ? `✔ PASS (${vthd.toFixed(2)}% < 8.0%)` : `✖ FAIL (${vthd.toFixed(2)}% >= 8.0%)`}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* HARMONIC ORDER BAR GRAPH PER IEEE 519 */}
                {showHarmonicSpectrum && (
                  <div className="mt-2 pt-2 border-t border-[#21262d] flex flex-col gap-1.5">
                    <span className="text-[10px] text-[#8b949e] font-bold">INDIVIDUAL HARMONIC ORDERS (h = 6k ± 1):</span>
                    <div className="grid grid-cols-5 gap-1 items-end h-[65px] bg-[#161b22] p-1.5 rounded border border-[#21262d]">
                      {[
                        { h: 'H1 (50Hz)', pct: 100, color: 'bg-[#3fb950]' },
                        { h: 'H5 (250Hz)', pct: 18.5, color: 'bg-[#39c5cf]' },
                        { h: 'H7 (350Hz)', pct: 12.1, color: 'bg-[#e3b341]' },
                        { h: 'H11 (550Hz)', pct: 7.2, color: 'bg-[#d2a8ff]' },
                        { h: 'H13 (650Hz)', pct: 5.8, color: 'bg-[#f778ba]' }
                      ].map((item) => (
                        <div key={item.h} className="flex flex-col items-center gap-1 h-full justify-end">
                          <span className="text-[8px] text-[#c9d1d9] font-bold">{item.pct}%</span>
                          <div
                            className={`w-full rounded-t ${item.color} transition-all duration-300`}
                            style={{ height: `${(item.pct / 100) * 40}px` }}
                          />
                          <span className="text-[8px] text-[#8b949e] truncate w-full text-center font-bold">{item.h.split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* LINK TO MAIN CHARGER CALLOUT */}
              <div className="mt-2 p-3 bg-gradient-to-r from-[#1f6beb]/15 via-[#238636]/15 to-[#e3b341]/15 border border-[#58a6ff]/50 rounded-lg flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#58a6ff]">
                  <Sparkles className="w-3.5 h-3.5 text-[#e3b341]" />
                  <span>LEARNING CONTINUITY: COMPONENT TO SYSTEM</span>
                </div>
                <p className="text-[10px] text-[#c9d1d9] leading-tight">
                  You have mastered Module 5! Now apply these 6x SCR thyristor firing &amp; harmonics principles inside the full industrial charger system.
                </p>
                <button
                  onClick={() => onNavigateToCharger && onNavigateToCharger()}
                  className="w-full py-2 px-3 bg-[#238636] hover:bg-[#2ea043] text-white font-mono text-xs font-bold rounded border border-[#3fb950] shadow flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Now Open PowerElectronics Lab - Single 6-Pulse Thyristor Charger [6x SCR]</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TOPIC 6 CONTROLS: PULSE WIDTH MODULATION (PWM) */}
          {activeTopic === 'pwm' && (
            <div className="flex flex-col gap-4 text-xs sm:text-sm font-mono">
              {/* MODULATION TYPE SELECTOR */}
              <div>
                <label className="text-xs sm:text-sm text-white block mb-1.5 uppercase font-bold tracking-wide">PWM MODULATION TECHNIQUE:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'spwm', label: 'Sinusoidal PWM (SPWM)', disabled: false },
                    { id: 'bipolar', label: 'Bipolar 2-Level SPWM', disabled: false },
                    { id: 'svpwm', label: 'Space Vector (SVPWM)', disabled: false },
                    { id: 'unipolar', label: 'Unipolar 3-Level (Full-Bridge Only)', disabled: true }
                  ].map((m) => (
                    <button
                      key={m.id}
                      disabled={m.disabled}
                      onClick={() => !m.disabled && setPwmModulationType(m.id as any)}
                      title={m.disabled ? 'Unipolar 3-Level SPWM requires a 4-switch Full-Bridge topology. This Half-Bridge inverter operates strictly as a 2-Level SPWM topology.' : ''}
                      className={`py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                        m.disabled
                          ? 'bg-[#161b22]/50 text-slate-500 border border-[#30363d]/50 cursor-not-allowed opacity-60'
                          : pwmModulationType === m.id
                          ? 'bg-[#f472b6] text-slate-950 border-2 border-white shadow-md cursor-pointer'
                          : 'bg-[#0d1117] text-[#c9d1d9] border border-[#30363d] hover:border-[#f472b6] cursor-pointer'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* MODULATION INDEX Ma SLIDER */}
              <div className="relative group p-2 rounded-xl border border-transparent hover:border-pink-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>MODULATION INDEX (Ma = Vref / Vtri):</span>
                  <span className={`font-extrabold text-sm ${pwmMa > 1.0 ? 'text-amber-400' : 'text-pink-300'}`}>
                    {pwmMa.toFixed(2)} {pwmMa > 1.0 ? '(Overmodulation)' : '(Linear)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="1.25"
                  step="0.05"
                  value={pwmMa}
                  onChange={(e) => setPwmMa(parseFloat(e.target.value))}
                  className="w-full accent-[#f472b6] h-2 cursor-pointer"
                />
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-pink-300 text-[10px] font-sans p-2 rounded-xl border border-pink-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Ma &gt; 1.0 enters Overmodulation zone, boosting fundamental AC output voltage but creating 5th &amp; 7th harmonic distortion.
                </div>
              </div>

              {/* CARRIER FREQUENCY fc SLIDER */}
              <div className="relative group p-2 rounded-xl border border-transparent hover:border-sky-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>CARRIER FREQUENCY (fc):</span>
                  <span className="text-sky-300 font-extrabold text-sm">{pwmFc} Hz (Mf = {(pwmFc / pwmF1).toFixed(0)})</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="20000"
                  step="500"
                  value={pwmFc}
                  onChange={(e) => setPwmFc(parseInt(e.target.value))}
                  className="w-full accent-[#38bdf8] h-2 cursor-pointer"
                />
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-sky-300 text-[10px] font-sans p-2 rounded-xl border border-sky-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Higher fc shifts switching harmonics to higher frequencies, allowing smaller output filter components at higher switching loss.
                </div>
              </div>

              {/* FUNDAMENTAL FREQUENCY f1 SLIDER */}
              <div className="relative group p-2 rounded-xl border border-transparent hover:border-emerald-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>FUNDAMENTAL FREQUENCY (f1):</span>
                  <span className="text-emerald-300 font-extrabold text-sm">{pwmF1} Hz</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={pwmF1}
                  onChange={(e) => setPwmF1(parseInt(e.target.value))}
                  className="w-full accent-[#3fb950] h-2 cursor-pointer"
                />
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-emerald-300 text-[10px] font-sans p-2 rounded-xl border border-emerald-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Adjusts fundamental reference frequency f1 for variable frequency V/f AC speed drives.
                </div>
              </div>

              {/* DEAD TIME t_dead SLIDER & PROTECTION ALERT */}
              <div className="relative group p-2 rounded-xl border border-transparent hover:border-amber-500/40 hover:bg-[#0d1117]/80 transition-all">
                <div className="flex justify-between text-xs sm:text-sm text-white font-semibold mb-1">
                  <span>DEAD-TIME INSERTION (t_dead):</span>
                  <span className={`font-extrabold text-sm ${pwmDeadTime === 0 ? 'text-red-400 animate-pulse' : 'text-amber-300'}`}>
                    {pwmDeadTime.toFixed(1)} µs {pwmDeadTime === 0 ? '⚠️ SHOOT-THROUGH RISK' : ''}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="5.0"
                  step="0.1"
                  value={pwmDeadTime}
                  onChange={(e) => setPwmDeadTime(parseFloat(e.target.value))}
                  className="w-full accent-[#f59e0b] h-2 cursor-pointer"
                />
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 left-0 right-0 bg-[#0d1117] text-amber-300 text-[10px] font-sans p-2 rounded-xl border border-amber-500/60 shadow-2xl z-30 leading-tight backdrop-blur-md">
                  💡 <strong>Hover Physics:</strong> Dead-time prevents upper and lower leg switches from turning on simultaneously, preventing DC bus short-circuits.
                </div>
              </div>

              {/* PWM LAB EXPERIMENT PRESETS BAR & RESET BUTTON */}
              <div className="bg-[#0d1117] border border-[#f472b6]/40 rounded-xl p-2 flex flex-col gap-1.5 font-mono">
                <div className="flex justify-between items-center text-[11px] font-bold text-pink-300 uppercase tracking-wider">
                  <span>PWM EXPERIMENT LAB PRESETS:</span>
                  <button
                    onClick={() => {
                      setPwmMa(0.85);
                      setPwmFc(5000);
                      setPwmF1(50);
                      setPwmDeadTime(1.5);
                      setPwmScopeChannel('all');
                      setPwmSimModelMode('practical');
                      setBusVoltage(400);
                      setRectifierLoad(20);
                    }}
                    className="px-2 py-0.5 rounded bg-[#161b22] hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-[9px] font-bold cursor-pointer transition-all flex items-center gap-1"
                  >
                    ↺ Reset Experiment
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <button
                    onClick={() => setPwmMa(pwmMa === 0.35 ? 0.95 : 0.35)}
                    className="p-1.5 rounded bg-[#161b22] border border-[#30363d] hover:border-pink-400 text-slate-200 text-left cursor-pointer transition-all"
                  >
                    🧪 <strong>1. Ma Effect:</strong> {pwmMa < 0.5 ? 'Ma=0.35 (Low V1)' : 'Ma=0.95 (High V1)'}
                  </button>
                  <button
                    onClick={() => setPwmFc(pwmFc === 2000 ? 12000 : 2000)}
                    className="p-1.5 rounded bg-[#161b22] border border-[#30363d] hover:border-sky-400 text-slate-200 text-left cursor-pointer transition-all"
                  >
                    🧪 <strong>2. fc Effect:</strong> {pwmFc < 5000 ? 'fc=2kHz (High Rip)' : 'fc=12kHz (Low Rip)'}
                  </button>
                  <button
                    onClick={() => setPwmDeadTime(pwmDeadTime === 0.0 ? 2.5 : 0.0)}
                    className="p-1.5 rounded bg-[#161b22] border border-[#30363d] hover:border-amber-400 text-slate-200 text-left cursor-pointer transition-all"
                  >
                    🧪 <strong>3. Dead-Time:</strong> {pwmDeadTime === 0.0 ? '0.0µs Risk!' : '2.5µs Safe'}
                  </button>
                  <button
                    onClick={() => setPwmMa(pwmMa === 1.18 ? 0.85 : 1.18)}
                    className="p-1.5 rounded bg-[#161b22] border border-[#30363d] hover:border-red-400 text-slate-200 text-left cursor-pointer transition-all"
                  >
                    🧪 <strong>4. Overmod Zone:</strong> {pwmMa > 1.0 ? 'Ma=1.18 Sat' : 'Ma=0.85 Lin'}
                  </button>
                </div>

                {/* IDEAL VS PRACTICAL SIMULATION MODE TOGGLE */}
                <div className="mt-1 pt-1.5 border-t border-[#21262d] flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-bold">SIMULATION MODEL MODE:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPwmSimModelMode('ideal')}
                      className={`px-2 py-0.5 rounded font-bold text-[9px] transition-all cursor-pointer ${
                        pwmSimModelMode === 'ideal' ? 'bg-[#3fb950] text-slate-950 shadow-sm' : 'bg-[#161b22] text-[#8b949e] border border-[#30363d]'
                      }`}
                    >
                      IDEAL (0 Loss)
                    </button>
                    <button
                      onClick={() => setPwmSimModelMode('practical')}
                      className={`px-2 py-0.5 rounded font-bold text-[9px] transition-all cursor-pointer ${
                        pwmSimModelMode === 'practical' ? 'bg-[#f472b6] text-slate-950 shadow-sm' : 'bg-[#161b22] text-[#8b949e] border border-[#30363d]'
                      }`}
                    >
                      PRACTICAL (Losses + Tj)
                    </button>
                  </div>
                </div>
              </div>

              {/* DSO OSCILLOSCOPE CHANNEL SELECTOR */}
              <div className="bg-[#0d1117] border border-[#38bdf8]/40 rounded-xl p-2 flex flex-col gap-1.5 font-mono">
                <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider flex justify-between">
                  <span>DSO WAVEFORM SELECTOR:</span>
                  <span className="text-emerald-400 font-extrabold">{pwmScopeChannel.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'all', label: 'All Channels' },
                    { id: 'ref_carrier', label: 'Vref & Vtri' },
                    { id: 'gates', label: 'Gates G1/G2' },
                    { id: 'vsw', label: 'VSW Node' },
                    { id: 'vout', label: 'VOUT Sine' },
                    { id: 'iout', label: 'IL Current' }
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setPwmScopeChannel(ch.id as any)}
                      className={`py-1 px-1 rounded text-[10px] font-bold transition-all ${
                        pwmScopeChannel === ch.id
                          ? 'bg-[#38bdf8] text-slate-950 shadow-sm'
                          : 'bg-[#161b22] text-[#8b949e] hover:text-white border border-[#21262d]'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* PWM HARMONIC SPECTRUM & TELEMETRY CARD */}
              <div className="bg-[#0d1117] border border-[#f472b6]/50 rounded-xl p-3 flex flex-col gap-2 font-mono text-xs">
                <div className="text-pink-300 font-extrabold uppercase tracking-wider flex justify-between text-xs">
                  <span>PWM TELEMETRY &amp; SPECTRUM:</span>
                  <span className={pwmMa > 1.0 ? 'text-amber-400 font-bold animate-pulse' : 'text-emerald-400 font-bold'}>
                    {pwmMa > 1.0 ? '⚠️ OVERMODULATION' : 'IEC 61800-9 OK'}
                  </span>
                </div>

                {(() => {
                  const vDcHalf = busVoltage / 2;
                  const isOvermod = pwmMa > 1.0;
                  const v1RmsCalc = !isOvermod
                    ? (pwmMa * vDcHalf) / Math.SQRT2
                    : (vDcHalf / Math.SQRT2) * (1.0 + 0.273 * (1 - Math.exp(-3.5 * (pwmMa - 1.0))));
                  
                  const loadR = Math.max(1, rectifierLoad || 20);
                  const i1RmsCalc = v1RmsCalc / loadR;
                  const pOutCalc = (v1RmsCalc * v1RmsCalc) / loadR;

                  // 1. Filter Cutoff Frequency: fc_filter = 1 / (2π √(Lf × Cf))
                  const Lf = 1.2e-3;
                  const Cf = 10e-6;
                  const fcFilter = 1 / (2 * Math.PI * Math.sqrt(Lf * Cf));

                  // 2. DC-Link Midpoint Imbalance & Capacitor Voltages
                  const Ctotal = 2000e-6;
                  const deltaVn = (i1RmsCalc * Math.SQRT2) / (2 * Math.PI * Math.max(10, pwmF1) * Ctotal);
                  const vC1 = vDcHalf + deltaVn;
                  const vC2 = vDcHalf - deltaVn;
                  const dcImbalancePct = (Math.abs(vC1 - vC2) / busVoltage) * 100;

                  // 3. THD & Ripple Voltage Calculation
                  const thdPct = !isOvermod
                    ? (48.3 / Math.max(0.1, pwmMa))
                    : 48.3 + 35 * (pwmMa - 1.0);
                  
                  const vOutTotalRms = v1RmsCalc * Math.sqrt(1 + Math.pow(thdPct / 100, 2));

                  // Dominant Harmonics
                  const mf = Math.round(pwmFc / pwmF1);
                  const hDominant = isOvermod
                    ? `3rd, 5th, 7th & ${mf - 2}th, ${mf + 2}th`
                    : `${mf - 2}th, ${mf + 2}th, 2mf±1`;

                  // 4. Semiconductor Losses & Thermal Model
                  const rDsOn = 0.04;
                  const vF0 = 1.2;
                  const eOnEoffSec = 0.0004;

                  const pCondQ = Math.pow(i1RmsCalc / Math.SQRT2, 2) * rDsOn;
                  const pSwQ = (eOnEoffSec * pwmFc * (busVoltage / 400) * (i1RmsCalc / 10));
                  const pLossQ = pCondQ + pSwQ;

                  const pCondD = (i1RmsCalc / Math.PI) * vF0 + Math.pow(i1RmsCalc / 2, 2) * 0.02;
                  const pLossTotal = 2 * (pLossQ + pCondD);

                  const rThJA = 1.2;
                  const tAmbient = 35;
                  const tJunction = tAmbient + pLossTotal * rThJA;
                  const tJunctionMax = 150;
                  const thermalMargin = tJunctionMax - tJunction;

                  // Inverter Efficiency
                  const pIn = pOutCalc + pLossTotal;
                  const efficiencyPct = pIn > 0 ? (pOutCalc / pIn) * 100 : 99.0;

                  // 5. Active Alarms & Protections Check
                  const hasOvercurrent = i1RmsCalc > 25.0;
                  const hasOvervoltage = busVoltage > 500;
                  const hasOvertemp = tJunction > 125;
                  const hasImbalance = dcImbalancePct > 10.0;
                  const hasShootThrough = pwmDeadTime === 0.0;

                  return (
                    <div className="flex flex-col gap-2">
                      {/* TELEMETRY READOUT GRID */}
                      <div className="grid grid-cols-2 gap-2 text-slate-200 text-[11px]">
                        <div>Fundamental V1(rms): <span className={isOvermod ? 'text-amber-300 font-bold' : 'text-emerald-400 font-bold'}>{v1RmsCalc.toFixed(1)} V</span></div>
                        <div>Total Output Vout(rms): <span className="text-sky-300 font-bold">{vOutTotalRms.toFixed(1)} V</span></div>
                        <div>Output Current (I1): <span className="text-emerald-300 font-bold">{i1RmsCalc.toFixed(1)} A</span></div>
                        <div>Active Power (Pout): <span className="text-yellow-300 font-bold">{pOutCalc.toFixed(0)} W</span></div>
                        <div>Voltage THD (THDv): <span className={isOvermod ? 'text-red-400 font-bold' : 'text-amber-300 font-bold'}>{thdPct.toFixed(1)} %</span></div>
                        <div>Dominant Harmonics: <span className="text-pink-300 font-bold">{hDominant}</span></div>
                      </div>

                      {/* LC FILTER & FREQUENCY COMPARISON CARD */}
                      <div className="p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-[10px] flex flex-col gap-1">
                        <div className="text-sky-300 font-bold flex justify-between">
                          <span>LC FILTER CUTOFF (fc_filter):</span>
                          <span className="text-emerald-400 font-extrabold">{fcFilter.toFixed(0)} Hz</span>
                        </div>
                        <div className="text-slate-400 text-[9px]">
                          Formula: <code className="text-amber-300">1 / (2π √(Lf × Cf))</code> (Lf=1.2mH, Cf=10µF)
                        </div>
                        <div className="text-slate-300 font-bold text-[9px] mt-0.5 border-t border-[#21262d] pt-1 flex justify-between">
                          <span>FREQ RATIO:</span>
                          <span className="text-purple-300">f1 ({pwmF1}Hz) &lt;&lt; fc_filter ({fcFilter.toFixed(0)}Hz) &lt;&lt; fc ({pwmFc}Hz)</span>
                        </div>
                      </div>

                      {/* DC-LINK MIDPOINT IMPALANCE & CAPACITOR VOLTAGES */}
                      <div className="p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-[10px] flex flex-col gap-1">
                        <div className="text-cyan-300 font-bold flex justify-between">
                          <span>DC-LINK CAPACITORS &amp; IMPALANCE:</span>
                          <span className={hasImbalance ? 'text-red-400 font-extrabold animate-pulse' : 'text-emerald-400 font-bold'}>
                            {dcImbalancePct.toFixed(1)}% {hasImbalance ? '⚠️ IMPALANCE' : 'OK'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[#c9d1d9] text-[9.5px]">
                          <div>VC1 (Top 1000µF): <b className="text-emerald-300">{vC1.toFixed(1)} V</b></div>
                          <div>VC2 (Bot 1000µF): <b className="text-sky-300">{vC2.toFixed(1)} V</b></div>
                        </div>
                      </div>

                      {/* LOSSES, THERMAL MODEL & EFFICIENCY */}
                      <div className="p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-[10px] flex flex-col gap-1">
                        <div className="text-pink-300 font-bold flex justify-between">
                          <span>LOSSES &amp; THERMAL MODEL (Tj):</span>
                          <span className="text-emerald-400 font-extrabold">EFFICIENCY: {efficiencyPct.toFixed(1)} %</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[#c9d1d9] text-[9.5px]">
                          <div>Q1+Q2 Switch Loss: <b className="text-amber-300">{(2 * pLossQ).toFixed(1)} W</b></div>
                          <div>D1+D2 Diode Loss: <b className="text-amber-300">{(2 * pCondD).toFixed(1)} W</b></div>
                          <div>Total Loss (Ploss): <b className="text-red-400">{(pLossTotal).toFixed(1)} W</b></div>
                          <div>Junction Temp (Tj): <b className={hasOvertemp ? 'text-red-400 font-extrabold' : 'text-emerald-300'}>{tJunction.toFixed(1)} °C</b></div>
                        </div>
                        <div className="text-slate-400 text-[9px] border-t border-[#21262d] pt-1 flex justify-between">
                          <span>Thermal Margin to Tj_max (150°C):</span>
                          <span className={thermalMargin < 25 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>{thermalMargin.toFixed(1)} °C</span>
                        </div>
                      </div>

                      {/* ALARMS & PROTECTION WARNING BADGES */}
                      {(hasShootThrough || hasOvercurrent || hasOvervoltage || hasOvertemp || hasImbalance) && (
                        <div className="p-2 rounded-lg bg-[#da3633]/20 border border-[#f85149] text-[10px] font-bold text-red-300 flex flex-col gap-1 animate-pulse">
                          <div className="uppercase tracking-wider text-red-400">⚠️ ACTIVE PROTECTION ALARMS:</div>
                          <ul className="list-disc list-inside text-[9px] font-sans font-semibold text-red-200">
                            {hasShootThrough && <li>SHOOT-THROUGH RISK: Dead-time t_dead is 0.0 µs!</li>}
                            {hasOvercurrent && <li>OVERCURRENT: Load Current ({i1RmsCalc.toFixed(1)}A) exceeds 25A rating!</li>}
                            {hasOvervoltage && <li>OVERVOLTAGE: DC Bus Voltage ({busVoltage}V) exceeds 500V max limit!</li>}
                            {hasOvertemp && <li>OVERTEMPERATURE: Junction Temp Tj ({tJunction.toFixed(1)}°C) exceeds 125°C threshold!</li>}
                            {hasImbalance && <li>DC MIDPOINT IMPALANCE: Capacitor Voltage difference exceeds 10%!</li>}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* INTERACTIVE GRAPH: V1(rms) VS MODULATION INDEX Ma */}
                <div className="mt-2 pt-2 border-t border-[#21262d] flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] text-[#8b949e] font-bold">
                    <span>V1(rms) vs MODULATION INDEX (Ma):</span>
                    <span className={pwmMa > 1.0 ? 'text-amber-400 font-extrabold' : 'text-emerald-400'}>
                      {pwmMa > 1.0 ? 'OVERMOD' : 'LINEAR'}
                    </span>
                  </div>

                  <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-1.5 relative h-[95px] w-full">
                    <svg viewBox="0 0 280 80" className="w-full h-full">
                      {/* Grid Lines & Boundaries */}
                      <line x1="30" y1="10" x2="30" y2="65" stroke="#30363d" strokeWidth="1" />
                      <line x1="30" y1="65" x2="260" y2="65" stroke="#30363d" strokeWidth="1" />

                      {/* Ma = 1.0 Boundary Line (X = 30 + (1.0 / 1.25) * 230 = 214) */}
                      <line x1="214" y1="10" x2="214" y2="65" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 2" />
                      <text x="214" y="74" textAnchor="middle" fill="#f59e0b" fontSize="7" fontFamily="monospace">Ma=1.0</text>

                      {/* Axes Labels */}
                      <text x="14" y="40" fill="#94a3b8" fontSize="7" fontFamily="monospace" transform="rotate(-90 14 40)" textAnchor="middle">V1(rms) [V]</text>
                      <text x="145" y="76" fill="#94a3b8" fontSize="7" fontFamily="monospace" textAnchor="middle">Modulation Index (Ma)</text>

                      {/* Linear Region Curve (0 <= Ma <= 1.0): Green */}
                      <path d="M 30 65 L 214 26" fill="none" stroke="#22c55e" strokeWidth="2" />

                      {/* Overmodulation Curve (1.0 < Ma <= 1.25): Amber Saturating Path */}
                      <path d="M 214 26 C 230 20, 245 16, 260 14" fill="none" stroke="#f59e0b" strokeWidth="2" />

                      {/* Square Wave Saturation Limit (Y = 14) */}
                      <line x1="30" y1="14" x2="260" y2="14" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
                      <text x="255" y="11" textAnchor="end" fill="#ef4444" fontSize="6" fontFamily="monospace">Square Wave Limit (4/π × V1_linear)</text>

                      {/* Live Operating Point Dot */}
                      {(() => {
                        const vDcHalf = busVoltage / 2;
                        const dotX = 30 + Math.min(1.25, Math.max(0, pwmMa)) * (230 / 1.25);
                        const v1RmsCurrent = pwmMa <= 1.0
                          ? (pwmMa * vDcHalf) / Math.SQRT2
                          : (vDcHalf / Math.SQRT2) * (1.0 + 0.273 * (1 - Math.exp(-3.5 * (pwmMa - 1.0))));
                        const vMaxRef = (vDcHalf / Math.SQRT2) * 1.35;
                        const dotY = 65 - (v1RmsCurrent / vMaxRef) * 52;

                        return (
                          <g>
                            <circle cx={dotX} cy={dotY} r="4" fill={pwmMa > 1.0 ? '#f59e0b' : '#22c55e'} className="animate-ping opacity-75" />
                            <circle cx={dotX} cy={dotY} r="4" fill={pwmMa > 1.0 ? '#f59e0b' : '#22c55e'} stroke="#ffffff" strokeWidth="1.5" />
                            <rect x={Math.min(195, dotX - 25)} y={Math.max(12, dotY - 18)} width="50" height="14" fill="#0d1117" stroke={pwmMa > 1.0 ? '#f59e0b' : '#22c55e'} strokeWidth="1" rx="3" />
                            <text x={Math.min(195, dotX - 25) + 25} y={Math.max(12, dotY - 18) + 10} textAnchor="middle" fill="#ffffff" fontSize="7" fontFamily="monospace" fontWeight="bold">
                              {v1RmsCurrent.toFixed(1)}V
                            </text>
                          </g>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* THEORY FORMULA CARD */}
          <div className="mt-2 bg-[#0d1117] border border-[#30363d] p-3 rounded-lg flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#e3b341] font-mono">
              <BookOpen className="w-3.5 h-3.5" />
              <span>THEORY & GOVERNING FORMULA</span>
            </div>
            <div className="text-sm bg-[#161b22] p-2 rounded border border-[#21262d] overflow-x-auto text-center font-bold">
              <MathLatex tex={activeMeta.formula} block={true} />
            </div>
            <p className="text-[11px] text-[#8b949e] leading-relaxed">
              {activeMeta.shortDesc}
            </p>
          </div>
        </div>

        {/* COLUMN 2 (CENTER 5 COLS): INTERACTIVE CIRCUIT SCHEMATIC & IEC 60617 SLD */}
        <div className={`${(activeMobileTab === 'schematic' || activeMobileTab === 'circuit') ? 'flex' : 'hidden lg:flex'} flex-col gap-2.5 bg-[#141a24] border border-[#1e293b] p-3 rounded-2xl shadow-xl border-t-4 border-t-[#10b981] flex-1 w-full min-w-0 lg:h-[calc(100vh-210px)] lg:max-h-[740px] overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 bg-[#0a0e14] p-2 rounded-t-xl -mx-3 -mt-3 mb-1 border-l-4 border-l-[#10b981]">
            <h3 className="text-xs sm:text-sm font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#10b981]" />
              <span>SECTION 3: SCHEMATIC &amp; SLD CANVAS</span>
            </h3>
            <div className="flex items-center gap-2">
              {/* OPERATING STATUS SYSTEM BADGE */}
              {activeTopic === 'pwm' && (() => {
                const isShootThrough = pwmDeadTime === 0.0;
                const isOvercurrent = (pwmMa * (busVoltage / 2) / Math.SQRT2 / Math.max(1, rectifierLoad)) > 25.0;
                const isOvervoltage = busVoltage > 500;
                const isOvermod = pwmMa > 1.0;
                const isWarning = isOvermod || pwmDeadTime < 0.5;

                if (isShootThrough || isOvercurrent || isOvervoltage) {
                  return (
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500 font-extrabold text-[9.5px] animate-pulse">
                      🔴 FAULT / ALARM
                    </span>
                  );
                } else if (isOvermod) {
                  return (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500 font-extrabold text-[9.5px] animate-pulse">
                      🟠 OVERMODULATION
                    </span>
                  );
                } else if (isWarning) {
                  return (
                    <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500 font-extrabold text-[9.5px]">
                      🟡 WARNING
                    </span>
                  );
                } else {
                  return (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500 font-extrabold text-[9.5px]">
                      🟢 NORMAL (LINEAR)
                    </span>
                  );
                }
              })()}

              {/* SLD VIEW MODE TOGGLE */}
              <button
                onClick={() => setSldMode(sldMode === 'schematic' ? 'iec60617' : 'schematic')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer min-h-[32px] ${
                  sldMode === 'iec60617'
                    ? 'bg-[#10b981] text-slate-950 border-2 border-emerald-450 shadow-md shadow-emerald-950/20'
                    : 'bg-[#0a0e14] text-[#c9d1d9] border-[#1e293b] hover:text-white'
                }`}
              >
                {sldMode === 'iec60617' ? '✔ IEC 60617 SLD' : 'SCHEMATIC'}
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 rounded-lg bg-[#0a0e14] text-white border border-[#1e293b] hover:bg-slate-800 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer min-h-[32px]"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-[#10b981]" />}
                <span>{isPlaying ? 'PAUSE' : 'RESUME'}</span>
              </button>
            </div>
          </div>

          {/* SPWM SIGNAL CHAIN TRACKER BAR */}
          {activeTopic === 'pwm' && (
            <div className="w-full bg-[#0a0e14] border border-[#1e293b] rounded-xl p-1.5 flex items-center justify-between gap-1 font-mono text-[9px] overflow-x-auto">
              <span className="text-[#8b949e] font-bold shrink-0">SIGNAL CHAIN:</span>
              {[
                { step: 1, name: 'vref Sine', icon: '〰️' },
                { step: 2, name: 'vtri Carrier', icon: '🔺' },
                { step: 3, name: 'PWM Compare', icon: '⚖️' },
                { step: 4, name: 't_dead Driver', icon: '⏱️' },
                { step: 5, name: 'Q1/Q2 Legs', icon: '⚡' },
                { step: 6, name: 'VSW Node', icon: '📍' },
                { step: 7, name: 'LC Filter', icon: '🌀' },
                { step: 8, name: 'VOUT Load', icon: '💡' }
              ].map((st, idx) => (
                <React.Fragment key={st.step}>
                  <div className="flex items-center gap-1 bg-[#161b22] px-2 py-0.5 rounded border border-[#30363d] text-emerald-300 font-semibold shrink-0 shadow-sm hover:border-[#10b981] transition-all">
                    <span>{st.icon}</span>
                    <span>{st.step}. {st.name}</span>
                  </div>
                  {idx < 7 && <span className="text-slate-600 font-extrabold shrink-0">→</span>}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* SVG SCHEMATIC CONTAINER */}
          <div className="w-full flex-1 bg-[#0f141e] border border-[#1e293b] rounded-2xl p-4 relative flex items-center justify-center overflow-hidden min-h-[350px]">
            <svg viewBox="0 0 500 320" className="w-full h-full max-h-[360px]">
              <defs>
                {/* Glow filters */}
                <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* BACKGROUND GRID */}
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
              </pattern>
              <rect width="500" height="320" fill="url(#grid)" />

              {/* DOMAIN 5: IEC 60617 / IEEE 315 STANDARDIZED SINGLE LINE DIAGRAM (SLD) VIEW */}
              {sldMode === 'iec60617' ? (
                <g>
                  <text x="250" y="22" textAnchor="middle" fill="#58a6ff" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    IEC 60617 / IEEE 315 STANDARDIZED SINGLE-LINE DIAGRAM (SLD)
                  </text>

                  {/* 100% CONTINUOUS MAIN POWER BUSBAR LINE - ZERO BREAKS */}
                  <line x1="20" y1="60" x2="480" y2="60" stroke={fuseBlown ? '#f85149' : '#3fb950'} strokeWidth="3" strokeDasharray={fuseBlown ? '6 4' : 'none'} />

                  {/* ANIMATED ELECTRON / CURRENT FLOW DOTS ALONG CONTINUOUS BUSBAR */}
                  {isPlaying && !fuseBlown && (
                    <g>
                      <circle cx={(20 + (time * 120) % 460)} cy="60" r="3.5" fill="#58a6ff" />
                      <circle cx={(20 + ((time + 0.33) * 120) % 460)} cy="60" r="3.5" fill="#3fb950" />
                      <circle cx={(20 + ((time + 0.66) * 120) % 460)} cy="60" r="3.5" fill="#e3b341" />
                    </g>
                  )}

                  {/* 1. AC Grid Supply Symbol (IEC 60617-2) */}
                  <g transform="translate(40, 60)" className="cursor-pointer" onClick={() => setSelectedSldSymbol('grid_supply')}>
                    <circle cx="0" cy="0" r="18" fill="#161b22" stroke="#58a6ff" strokeWidth="2.5" />
                    <path d="M -7 0 Q -3.5 -7 0 0 T 7 0" fill="none" stroke="#58a6ff" strokeWidth="2" />
                    <text x="0" y="32" textAnchor="middle" fill="#58a6ff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      {activeTopic === 'controlled' || (activeTopic === 'rectifiers' && rectifierType === 'three_phase') ? 'G1 415V 3~' : 'G1 230V 1~'}
                    </text>
                  </g>

                  {/* 2. IEC Semiconductor Fuse F1 Symbol (IEC 60269-4 / IEC 60617-7) */}
                  <g transform="translate(105, 60)" className="cursor-pointer" onClick={() => { setSelectedSldSymbol('fuse'); setFuseBlown(!fuseBlown); }}>
                    <rect x="-15" y="-9" width="30" height="18" fill={fuseBlown ? '#da3633' : '#161b22'} stroke={fuseBlown ? '#f85149' : '#e3b341'} strokeWidth="2" rx="2" />
                    <line x1="-22" y1="0" x2="22" y2="0" stroke={fuseBlown ? '#f85149' : '#e3b341'} strokeWidth="2" />
                    <text x="0" y="-14" textAnchor="middle" fill={fuseBlown ? '#f85149' : '#e3b341'} fontSize="9" fontFamily="monospace" fontWeight="bold">
                      F1 {fuseBlown ? 'TRIPPED' : '100A I²t'}
                    </text>
                  </g>

                  {/* 3. IEC Circuit Breaker / Disconnector Q1 Symbol (IEC 60617-7) */}
                  <g transform="translate(170, 60)" className="cursor-pointer" onClick={() => setSelectedSldSymbol('breaker')}>
                    <rect x="-12" y="-12" width="24" height="24" fill="#161b22" stroke="#3fb950" strokeWidth="2" rx="3" />
                    <line x1="-8" y1="8" x2="8" y2="-8" stroke="#3fb950" strokeWidth="2" />
                    <text x="0" y="-16" textAnchor="middle" fill="#3fb950" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      Q1 BREAKER
                    </text>
                  </g>

                  {/* 4. IEC Isolation Transformer T1 Symbol (IEC 60617-6) */}
                  <g transform="translate(235, 60)" className="cursor-pointer" onClick={() => setSelectedSldSymbol('transformer')}>
                    <circle cx="-8" cy="0" r="13" fill="#161b22" stroke="#3fb950" strokeWidth="2" />
                    <circle cx="8" cy="0" r="13" fill="#161b22" stroke="#3fb950" strokeWidth="2" />
                    <text x="0" y="-18" textAnchor="middle" fill="#3fb950" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      T1 Dyn11
                    </text>
                  </g>

                  {/* 5. IEC Power Converter Symbol (IEC 60617-6/7 - Topic Responsive) */}
                  <g transform="translate(320, 60)" className="cursor-pointer" onClick={() => setSelectedSldSymbol('converter')}>
                    <rect x="-30" y="-28" width="60" height="56" fill="#161b22" stroke="#d2a8ff" strokeWidth="2.5" rx="5" />
                    <line x1="-30" y1="28" x2="30" y2="-28" stroke="#d2a8ff" strokeWidth="1.5" />
                    {/* Topic-specific IEC Symbol Overlay inside Converter Block */}
                    {activeTopic === 'diode' ? (
                      <g transform="translate(-2, -2)">
                        <polygon points="-8,-8 -8,8 8,0" fill="#3fb950" stroke="#3fb950" strokeWidth="1.5" />
                        <line x1="8" y1="-8" x2="8" y2="8" stroke="#3fb950" strokeWidth="2" />
                      </g>
                    ) : activeTopic === 'scr' || activeTopic === 'controlled' ? (
                      <g transform="translate(-2, -2)">
                        <polygon points="-8,-8 -8,8 8,0" fill="#3fb950" stroke="#3fb950" strokeWidth="1.5" />
                        <line x1="8" y1="-8" x2="8" y2="8" stroke="#3fb950" strokeWidth="2" />
                        <line x1="0" y1="0" x2="6" y2="-10" stroke="#e3b341" strokeWidth="1.5" />
                      </g>
                    ) : activeTopic === 'transistor' ? (
                      <g transform="translate(-2, -2)">
                        <line x1="-6" y1="-8" x2="-6" y2="8" stroke="#e3b341" strokeWidth="2" />
                        <line x1="-2" y1="-8" x2="6" y2="-8" stroke="#e3b341" strokeWidth="1.5" />
                        <line x1="-2" y1="8" x2="6" y2="8" stroke="#e3b341" strokeWidth="1.5" />
                        <line x1="-2" y1="0" x2="6" y2="0" stroke="#e3b341" strokeWidth="1.5" />
                      </g>
                    ) : (
                      <g transform="translate(-2, -2)">
                        <path d="M -8 -4 Q -4 -8 0 -4 T 8 -4" fill="none" stroke="#58a6ff" strokeWidth="1.5" />
                        <line x1="-8" y1="4" x2="8" y2="4" stroke="#3fb950" strokeWidth="1.5" />
                      </g>
                    )}
                    <text x="0" y="42" textAnchor="middle" fill="#d2a8ff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      {activeTopic === 'diode' ? 'IEC DIODE' : activeTopic === 'scr' || activeTopic === 'controlled' ? 'IEC THYRISTOR' : `IEC ${transistorType.toUpperCase()}`}
                    </text>
                  </g>

                  {/* 6. IEC Filter Inductor L1 (IEC 60617-4) */}
                  <g transform="translate(395, 60)" className="cursor-pointer" onClick={() => setSelectedSldSymbol('filter')}>
                    <path d="M -15 0 Q -10 -10 -5 0 Q 0 -10 5 0 Q 10 -10 15 0" fill="none" stroke="#39c5cf" strokeWidth="2.5" />
                    <text x="0" y="-14" textAnchor="middle" fill="#39c5cf" fontSize="9" fontFamily="monospace" fontWeight="bold">L1 1.5mH</text>
                  </g>

                  {/* 7. IEC Load / Battery Symbol (IEC 60617-3) */}
                  <g transform="translate(455, 60)" className="cursor-pointer" onClick={() => setSelectedSldSymbol('load')}>
                    <rect x="-14" y="-18" width="28" height="36" fill="#161b22" stroke="#e3b341" strokeWidth="2" rx="3" />
                    <text x="0" y="4" textAnchor="middle" fill="#e3b341" fontSize="9" fontFamily="monospace" fontWeight="bold">LOAD</text>
                    <text x="0" y="30" textAnchor="middle" fill="#e3b341" fontSize="8" fontFamily="monospace">
                      {activeTopic === 'controlled' && ctrlLoadType === 'rle' ? `E ${batteryEbat}V` : 'R_load'}
                    </text>
                  </g>

                  {/* 8. IEC Standard Ground GND (IEC 60617-2) */}
                  <g transform="translate(455, 105)">
                    <line x1="0" y1="0" x2="0" y2="12" stroke="#8b949e" strokeWidth="2" />
                    <line x1="-10" y1="12" x2="10" y2="12" stroke="#8b949e" strokeWidth="2" />
                    <line x1="-6" y1="16" x2="6" y2="16" stroke="#8b949e" strokeWidth="1.5" />
                    <line x1="-3" y1="20" x2="3" y2="20" stroke="#8b949e" strokeWidth="1" />
                    <text x="0" y="31" textAnchor="middle" fill="#8b949e" fontSize="8" fontFamily="monospace">GND</text>
                  </g>

                  {/* INTERACTIVE IEC STANDARDS INSPECTOR OVERLAY PANEL */}
                  <g transform="translate(20, 140)">
                    <rect x="0" y="0" width="460" height="155" fill="#0d1117" stroke="#58a6ff" strokeWidth="1.5" rx="8" />
                    <text x="15" y="24" fill="#58a6ff" fontSize="11" fontFamily="monospace" fontWeight="bold">
                      IEC 60617 / IEEE 315 STANDARDS & SCHEMATIC INSPECTOR
                    </text>
                    <line x1="15" y1="32" x2="445" y2="32" stroke="#21262d" strokeWidth="1" />

                    {selectedSldSymbol === 'fuse' ? (
                      <g>
                        <text x="15" y="52" fill="#e3b341" fontSize="10" fontFamily="monospace" fontWeight="bold">COMPONENT: High-Speed Semiconductor Protection Fuse (F1)</text>
                        <text x="15" y="68" fill="#c9d1d9" fontSize="9" fontFamily="monospace">Standard: IEC 60269-4 / IEEE 315 Section 4.2</text>
                        <text x="15" y="84" fill="#c9d1d9" fontSize="9" fontFamily="monospace">Rating: 100A RMS, 1000V AC/DC, Melting I²t = 500 A²s</text>
                        <text x="15" y="100" fill="#3fb950" fontSize="9" fontFamily="monospace">Function: Ultra-fast clearance of short-circuit faults before semiconductor melting.</text>
                        <text x="15" y="125" fill="#f85149" fontSize="9" fontFamily="monospace" fontWeight="bold">Status: {fuseBlown ? '⚠️ TRIPPED (Open Circuit) - Click symbol to reset' : '✔ Normal Conduction (Click symbol to trip)'}</text>
                      </g>
                    ) : selectedSldSymbol === 'breaker' ? (
                      <g>
                        <text x="15" y="52" fill="#3fb950" fontSize="10" fontFamily="monospace" fontWeight="bold">COMPONENT: Air Circuit Breaker / Disconnector (Q1)</text>
                        <text x="15" y="68" fill="#c9d1d9" fontSize="9" fontFamily="monospace">Standard: IEC 60947-2 / IEEE C37.13</text>
                        <text x="15" y="84" fill="#c9d1d9" fontSize="9" fontFamily="monospace">Rating: 630A frame, Icu = 50kA short-circuit breaking capacity</text>
                        <text x="15" y="100" fill="#3fb950" fontSize="9" fontFamily="monospace">Function: Primary isolation switch for safe maintenance and overcurrent protection.</text>
                        <text x="15" y="125" fill="#58a6ff" fontSize="9" fontFamily="monospace" fontWeight="bold">Status: CLOSED (Full busbar power continuity intact)</text>
                      </g>
                    ) : selectedSldSymbol === 'transformer' ? (
                      <g>
                        <text x="15" y="52" fill="#3fb950" fontSize="10" fontFamily="monospace" fontWeight="bold">COMPONENT: Isolation Transformer (T1)</text>
                        <text x="15" y="68" fill="#c9d1d9" fontSize="9" fontFamily="monospace">Standard: IEC 60076 / Vector Group Dyn11</text>
                        <text x="15" y="84" fill="#c9d1d9" fontSize="9" fontFamily="monospace">Ratio: 415V Delta / 415V Wye + Neutral, Leakage L_c = {commutationLc} mH</text>
                        <text x="15" y="100" fill="#3fb950" fontSize="9" fontFamily="monospace">Function: Galvanic isolation &amp; suppression of grid common-mode harmonics.</text>
                        <text x="15" y="125" fill="#e3b341" fontSize="9" fontFamily="monospace" fontWeight="bold">Commutation Overlap μ: {Math.max(0, Math.acos(Math.max(-1, Math.min(1, Math.cos((firingAngle * Math.PI) / 180) - (2 * 2 * Math.PI * 50 * (commutationLc / 1000) * ctrlLoadCurrent) / (415 * Math.SQRT2)))) * (180 / Math.PI) - firingAngle).toFixed(1)}°</text>
                      </g>
                    ) : selectedSldSymbol === 'converter' ? (
                      <g>
                        <text x="15" y="52" fill="#d2a8ff" fontSize="10" fontFamily="monospace" fontWeight="bold">COMPONENT: Power Semiconductor Converter Bridge</text>
                        <text x="15" y="68" fill="#c9d1d9" fontSize="9" fontFamily="monospace">Standard: IEC 60747-6 (Thyristors) / IEC 60747-8 (MOSFETs/IGBTs)</text>
                        <text x="15" y="84" fill="#c9d1d9" fontSize="9" fontFamily="monospace">Active Topology: {activeTopic === 'diode' ? 'Uncontrolled Diode' : activeTopic === 'scr' || activeTopic === 'controlled' ? 'Controlled SCR Thyristor' : transistorType.toUpperCase()}</text>
                        <text x="15" y="100" fill="#3fb950" fontSize="9" fontFamily="monospace">Efficiency: 98.4% | Thermal Resistance R_th(j-a) = {heatsinkRth} °C/W</text>
                        <text x="15" y="125" fill="#58a6ff" fontSize="9" fontFamily="monospace" fontWeight="bold">Operating Junction Temp T_j = {(ambientTemp + 3.2 * heatsinkRth).toFixed(1)} °C</text>
                      </g>
                    ) : (
                      <g>
                        <text x="15" y="52" fill="#58a6ff" fontSize="10" fontFamily="monospace" fontWeight="bold">IEC 60617 / IEEE 315 STANDARDIZED SLD OVERVIEW</text>
                        <text x="15" y="68" fill="#c9d1d9" fontSize="9" fontFamily="monospace">Click any symbol above (Grid, Fuse, Breaker, Transformer, Converter, Filter, Load)</text>
                        <text x="15" y="84" fill="#c9d1d9" fontSize="9" fontFamily="monospace">to inspect compliance standards, rating equations, and live parameters.</text>
                        <text x="15" y="105" fill="#e3b341" fontSize="9" fontFamily="monospace">System Frequency: 50.0 Hz | Power Factor: {(0.955 * Math.cos((firingAngle * Math.PI) / 180)).toFixed(3)}</text>
                        <text x="15" y="125" fill="#3fb950" fontSize="9" fontFamily="monospace" fontWeight="bold">✔ Complete Power Continuity Verified: No broken wiring connections</text>
                      </g>
                    )}
                  </g>
                </g>
              ) : (
                /* EXISTING SCHEMATIC VIEW */
                <g>
                  {activeTopic === 'diode' && (
                <g>
                  {/* Voltage Source Left (AC Source + DC Bias) */}
                  <g transform="translate(60, 160)">
                    <circle cx="0" cy="0" r="26" fill="#161b22" stroke="#58a6ff" strokeWidth="2" />
                    <path d="M -12 0 Q -6 -12 0 0 T 12 0" fill="none" stroke="#58a6ff" strokeWidth="2" />
                    <text x="0" y="38" textAnchor="middle" fill="#58a6ff" fontSize="11" fontFamily="monospace" fontWeight="bold">
                      {diodeAcVac}V AC 50Hz
                    </text>
                    <text x="0" y="50" textAnchor="middle" fill="#e3b341" fontSize="10" fontFamily="monospace">
                      Bias: {diodeBias > 0 ? `+${diodeBias.toFixed(1)}` : diodeBias.toFixed(1)}V
                    </text>
                  </g>

                  {/* Top Wire */}
                  <path d="M 60 134 L 60 80 L 220 80" fill="none" stroke="#484f58" strokeWidth="3" />

                  {/* Diode Symbol 1N5408 (Center) */}
                  <g transform="translate(250, 80)">
                    {/* Anode to Cathode Triangle */}
                    <polygon
                      points="-16,-16 -16,16 16,0"
                      fill={diodeFault === 'short' ? '#da3633' : diodeFault === 'open' ? '#21262d' : (diodeAcVac > 0 || diodeBias > 0.7) ? '#238636' : '#161b22'}
                      stroke={diodeFault === 'short' ? '#f85149' : diodeFault === 'open' ? '#da3633' : '#3fb950'}
                      strokeWidth="2.5"
                      filter={diodeFault !== 'open' ? 'url(#glow-green)' : undefined}
                    />
                    <line x1="16" y1="-16" x2="16" y2="16" stroke={diodeFault === 'short' ? '#f85149' : '#3fb950'} strokeWidth="3" />
                    <text x="0" y="-22" textAnchor="middle" fill="#ffffff" fontSize="12" fontFamily="monospace" fontWeight="bold">
                      1N5408
                    </text>
                    {diodeFault !== 'none' && (
                      <text x="0" y="28" textAnchor="middle" fill="#f85149" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        [{diodeFault.toUpperCase()}]
                      </text>
                    )}
                  </g>

                  <path d="M 280 80 L 440 80 L 440 130" fill="none" stroke="#484f58" strokeWidth="3" />

                  {/* Resistor Load Right */}
                  <g transform="translate(440, 160)">
                    <rect x="-12" y="-25" width="24" height="50" fill="#161b22" stroke="#e3b341" strokeWidth="2" />
                    <text x="22" y="5" fill="#e3b341" fontSize="11" fontFamily="monospace">
                      Rl={diodeLoad}Ω
                    </text>
                  </g>

                  {/* Bottom Return Wire and GND */}
                  <path d="M 440 190 L 440 240 L 250 240 M 250 240 L 60 240 L 60 186" fill="none" stroke="#484f58" strokeWidth="3" />
                  <g transform="translate(250, 240)">
                    <line x1="0" y1="0" x2="0" y2="15" stroke="#484f58" strokeWidth="3" />
                    <line x1="-15" y1="15" x2="15" y2="15" stroke="#58a6ff" strokeWidth="3" />
                    <line x1="-10" y1="20" x2="10" y2="20" stroke="#58a6ff" strokeWidth="2" />
                    <line x1="-5" y1="25" x2="5" y2="25" stroke="#58a6ff" strokeWidth="1" />
                    <text x="0" y="38" textAnchor="middle" fill="#8b949e" fontSize="9" fontFamily="monospace">GND</text>
                  </g>

                  {/* PN Junction Semiconductor Layer Representation in Center Bottom */}
                  {(() => {
                    const instantV = Math.sin(time * 5) * (diodeAcVac * Math.SQRT2) + diodeBias;
                    const isForward = instantV > 0.6 && diodeFault !== 'open';
                    const depWidth = diodeFault === 'short' ? 2 : isForward ? 4 : Math.min(45, 18 + Math.abs(instantV) * 4);

                    return (
                      <g transform="translate(180, 155)">
                        {/* P-Type Region */}
                        <rect x="0" y="0" width="70" height="42" fill="#1f6beb" opacity="0.4" stroke="#58a6ff" strokeWidth="1" rx="4" />
                        <text x="35" y="25" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">P-Type</text>

                        {/* Depletion Region Layer */}
                        <rect
                          x="70"
                          y="0"
                          width={depWidth}
                          height="42"
                          fill={diodeFault === 'short' ? '#f85149' : diodeFault === 'leaky' ? '#d29922' : '#e3b341'}
                          opacity={diodeFault === 'short' ? 0.9 : 0.6}
                          stroke="#e3b341"
                        />

                        {/* N-Type Region */}
                        <rect
                          x={70 + depWidth}
                          y="0"
                          width="70"
                          height="42"
                          fill="#8957e5"
                          opacity="0.4"
                          stroke="#d2a8ff"
                          strokeWidth="1"
                          rx="4"
                        />
                        <text
                          x={70 + depWidth + 35}
                          y="25"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                        >
                          N-Type
                        </text>

                        <text x="70" y="-6" textAnchor="middle" fill="#e3b341" fontSize="10" fontFamily="monospace" fontWeight="bold">
                          Depletion Width: {depWidth.toFixed(0)}nm ({isForward ? 'FORWARD - THIN' : 'REVERSE - THICK'})
                        </text>

                        {diodeFault === 'short' && (
                          <text x="70" y="55" textAnchor="middle" fill="#f85149" fontSize="10" fontFamily="monospace" fontWeight="bold">
                            ⚠️ FUSE BLOWN / DIODE SHORT
                          </text>
                        )}
                      </g>
                    );
                  })()}

                  {/* Animated Current Dots */}
                  {(Math.sin(time * 5) * (diodeAcVac * Math.SQRT2) + diodeBias > 0.6 || diodeFault === 'short') && diodeFault !== 'open' && (() => {
                    const p1 = (time * 0.8) % 1;
                    const p2 = (time * 0.8 + 0.5) % 1;
                    return (
                      <g>
                        <circle cx={60 + p1 * 380} cy="80" r="4" fill="#3fb950" />
                        <circle cx={60 + p2 * 380} cy="80" r="4" fill="#3fb950" />
                        <circle cx="440" cy={80 + p1 * 110} r="4" fill="#3fb950" />
                        <circle cx={440 - p1 * 380} cy="240" r="4" fill="#3fb950" />
                      </g>
                    );
                  })()}
                </g>
              )}

              {activeTopic === 'rectifiers' && (
                <g>
                  <text x="250" y="22" textAnchor="middle" fill="#58a6ff" fontSize="13" fontFamily="monospace" fontWeight="bold">
                    {rectifierType === 'half'
                      ? '1-PHASE HALF-WAVE RECTIFIER (1 LIVE DIODE)'
                      : rectifierType === 'center_tap'
                      ? '1-PHASE CENTER-TAPPED RECTIFIER (2 LIVE DIODES)'
                      : rectifierType === 'full_bridge'
                      ? '1-PHASE GRAETZ BRIDGE RECTIFIER (4 LIVE DIODES)'
                      : '3-PHASE 6-PULSE DIODE BRIDGE (6 LIVE DIODES)'}
                  </text>

                  {/* SCHEMATIC BY TOPOLOGY WITH PHYSICAL DIODES & COMPLETE CLOSED LOOP WIRING */}
                  {(() => {
                    const radTime = (time * 3) % (Math.PI * 2);
                    const degTime = Math.round((radTime * 180) / Math.PI);
                    const isPosHalf = Math.sin(radTime) >= 0;

                    if (rectifierType === 'half') {
                      const isD1On = isPosHalf;
                      return (
                        <g>
                          {/* AC Vin Source */}
                          <g transform="translate(50, 140)">
                            <circle cx="0" cy="0" r="20" fill="#161b22" stroke="#ef4444" strokeWidth="2.5" />
                            <path d="M -8 0 Q -4 -7 0 0 T 8 0" fill="none" stroke="#ef4444" strokeWidth="2.5" />
                            <text x="-32" y="4" fill="#ef4444" fontSize="13" fontFamily="monospace" fontWeight="bold">Vin</text>
                            <text x="0" y="34" textAnchor="middle" fill="#58a6ff" fontSize="10" fontFamily="monospace">{rectifierVac}V AC</text>
                            <text x="0" y="-26" textAnchor="middle" fill="#3fb950" fontSize="10" fontFamily="monospace">θ={degTime}°</text>
                          </g>

                          {/* Top Wire from Vin to Anode of D1 */}
                          <path
                            d="M 50 120 L 50 75 L 180 75"
                            stroke={isD1On ? '#3fb950' : '#ef4444'}
                            strokeWidth="2.5"
                            fill="none"
                          />

                          {/* Live Diode D1 */}
                          <g transform="translate(200, 75)">
                            <polygon
                              points="-11,-13 -11,13 11,0"
                              fill={isD1On ? '#238636' : '#161b22'}
                              stroke={isD1On ? '#3fb950' : '#f59e0b'}
                              strokeWidth="2.5"
                            />
                            <line x1="11" y1="-13" x2="11" y2="13" stroke={isD1On ? '#3fb950' : '#f59e0b'} strokeWidth="3" />
                            <text x="0" y="-20" textAnchor="middle" fill={isD1On ? '#3fb950' : '#f59e0b'} fontSize="12" fontFamily="monospace" fontWeight="bold">
                              D1: {isD1On ? 'ON (VF=0.7V)' : 'OFF (VR=-Vm)'}
                            </text>
                          </g>

                          {/* Wire from Cathode of D1 to Vout / Load (360, 75) */}
                          <path d="M 211 75 L 360 75" stroke={isD1On ? '#3fb950' : '#484f58'} strokeWidth="2.5" fill="none" />
                          <text x="305" y="65" fill="#3fb950" fontSize="12" fontFamily="monospace" fontWeight="bold">Vout</text>

                          {/* Bottom DC- Return Wire from Load (360, 205) back to Vin (50, 160) */}
                          <path d="M 360 205 L 50 205 L 50 160" stroke={isD1On ? '#3fb950' : '#484f58'} strokeWidth="2.5" fill="none" />

                          {/* Junction Node Dots */}
                          <circle cx="50" cy="75" r="4" fill="#0d1117" stroke="#e6edf3" strokeWidth="2" />
                          <circle cx="50" cy="205" r="4" fill="#0d1117" stroke="#e6edf3" strokeWidth="2" />

                          {/* Animated Complete Closed Loop Electron Flow */}
                          {isD1On && (() => {
                            const p1 = (time * 0.8) % 1;
                            const p2 = (time * 0.8 + 0.5) % 1;
                            return (
                              <g>
                                {/* Top wire flow */}
                                <circle cx={50 + p1 * 130} cy="75" r="4" fill="#3fb950" />
                                <circle cx={211 + p2 * 149} cy="75" r="4" fill="#3fb950" />
                                {/* Bottom return flow back to source */}
                                <circle cx={360 - p1 * 310} cy="205" r="4" fill="#3fb950" />
                              </g>
                            );
                          })()}
                        </g>
                      );
                    }

                    if (rectifierType === 'center_tap') {
                      const d1On = isPosHalf;
                      const d2On = !isPosHalf;

                      return (
                        <g>
                          {/* AC Vin Primary Source */}
                          <g transform="translate(35, 140)">
                            <circle cx="0" cy="0" r="18" fill="#161b22" stroke="#ef4444" strokeWidth="2.5" />
                            <path d="M -7 0 Q -3.5 -6 0 0 T 7 0" fill="none" stroke="#ef4444" strokeWidth="2.5" />
                            <text x="-28" y="4" fill="#ef4444" fontSize="12" fontFamily="monospace" fontWeight="bold">Vin</text>
                            <text x="0" y="32" textAnchor="middle" fill="#58a6ff" fontSize="10" fontFamily="monospace">{rectifierVac}V AC</text>
                          </g>

                          {/* Primary Winding Coils (Inductor loops from Y=85 to Y=195) */}
                          <path
                            d="M 35 122 L 35 85 Q 52 85 52 98 Q 52 111 35 111 Q 52 111 52 124 Q 52 137 35 137 Q 52 137 52 150 Q 52 163 35 163 Q 52 163 52 176 Q 52 189 35 189 L 35 158"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="2.5"
                          />

                          {/* Parallel Iron Core Lines */}
                          <line x1="68" y1="75" x2="68" y2="205" stroke="#8b949e" strokeWidth="2" />
                          <line x1="73" y1="75" x2="73" y2="205" stroke="#8b949e" strokeWidth="2" />

                          {/* Secondary Winding Coils (Top: 75 to 140, Bottom: 140 to 205) */}
                          {/* Top Secondary Coil */}
                          <path
                            d="M 105 75 Q 88 75 88 88 Q 88 101 105 101 Q 88 101 88 114 Q 88 127 105 127 Q 88 127 88 140 L 105 140"
                            fill="none"
                            stroke={d1On ? '#3fb950' : '#58a6ff'}
                            strokeWidth="2.5"
                          />
                          {/* Bottom Secondary Coil */}
                          <path
                            d="M 105 140 Q 88 140 88 153 Q 88 166 105 166 Q 88 166 88 179 Q 88 192 105 192 Q 88 192 88 205 L 105 205"
                            fill="none"
                            stroke={d2On ? '#3fb950' : '#58a6ff'}
                            strokeWidth="2.5"
                          />
                          <text x="70" y="65" fill="#58a6ff" fontSize="10" fontFamily="monospace">vs1</text>
                          <text x="70" y="220" fill="#58a6ff" fontSize="10" fontFamily="monospace">vs2</text>

                          {/* Center Tap Wire from (105, 140) -> RIGHT to (135, 140) -> DOWN to (135, 205) -> Load Return (360, 205) */}
                          <path d="M 105 140 L 135 140 L 135 235 L 330 235 L 330 205 L 360 205" stroke="#3fb950" strokeWidth="2.5" fill="none" />
                          <text x="140" y="132" fill="#3fb950" fontSize="10" fontFamily="monospace" fontWeight="bold">CT (GND Return)</text>

                          {/* Wires from Secondary Terminals to Diodes D1 & D2 */}
                          <path d="M 105 75 L 170 75" stroke={d1On ? '#3fb950' : '#58a6ff'} strokeWidth="2.5" fill="none" />
                          <path d="M 105 205 L 170 205" stroke={d2On ? '#3fb950' : '#58a6ff'} strokeWidth="2.5" fill="none" />

                          {/* Diode D1 (Top) */}
                          <g transform="translate(185, 75)">
                            <polygon points="-11,-13 -11,13 11,0" fill={d1On ? '#238636' : '#161b22'} stroke={d1On ? '#3fb950' : '#f59e0b'} strokeWidth="2.5" />
                            <line x1="11" y1="-13" x2="11" y2="13" stroke={d1On ? '#3fb950' : '#f59e0b'} strokeWidth="3" />
                            <text x="0" y="-18" textAnchor="middle" fill={d1On ? '#3fb950' : '#f59e0b'} fontSize="11" fontFamily="monospace" fontWeight="bold">
                              D1: {d1On ? 'ON (VF=0.7V)' : 'OFF'}
                            </text>
                          </g>

                          {/* Diode D2 (Bottom) */}
                          <g transform="translate(185, 205)">
                            <polygon points="-11,-13 -11,13 11,0" fill={d2On ? '#238636' : '#161b22'} stroke={d2On ? '#3fb950' : '#f59e0b'} strokeWidth="2.5" />
                            <line x1="11" y1="-13" x2="11" y2="13" stroke={d2On ? '#3fb950' : '#f59e0b'} strokeWidth="3" />
                            <text x="0" y="26" textAnchor="middle" fill={d2On ? '#3fb950' : '#f59e0b'} fontSize="11" fontFamily="monospace" fontWeight="bold">
                              D2: {d2On ? 'ON (VF=0.7V)' : 'OFF'}
                            </text>
                          </g>

                          {/* Common Cathode Junction Connection */}
                          {/* D1 Cathode (196, 75) -> RIGHT to (270, 75) */}
                          <path d="M 196 75 L 270 75" stroke={d1On ? '#3fb950' : '#484f58'} strokeWidth="2.5" fill="none" />
                          {/* D2 Cathode (196, 205) -> RIGHT to (270, 205) -> UP to (270, 75) */}
                          <path d="M 196 205 L 270 205 L 270 75" stroke={d2On ? '#3fb950' : '#484f58'} strokeWidth="2.5" fill="none" />
                          
                          {/* Common Cathode to Vout / Load (360, 75) */}
                          <path d="M 270 75 L 360 75" stroke={d1On || d2On ? '#3fb950' : '#484f58'} strokeWidth="2.5" fill="none" />
                          <text x="290" y="65" fill="#3fb950" fontSize="12" fontFamily="monospace" fontWeight="bold">Vout</text>

                          {/* Junction Node Dots */}
                          <circle cx="105" cy="75" r="4" fill="#0d1117" stroke="#e6edf3" strokeWidth="2" />
                          <circle cx="105" cy="205" r="4" fill="#0d1117" stroke="#e6edf3" strokeWidth="2" />
                          <circle cx="105" cy="140" r="4" fill="#0d1117" stroke="#e6edf3" strokeWidth="2" />
                          <circle cx="270" cy="75" r="4.5" fill="#0d1117" stroke="#e6edf3" strokeWidth="2" />

                          {/* Animated Current Loop */}
                          {d1On && (() => {
                            const p = (time * 0.8) % 1;
                            return (
                              <g>
                                <circle cx={105 + p * 80} cy="75" r="4" fill="#3fb950" />
                                <circle cx={196 + p * 164} cy="75" r="4" fill="#3fb950" />
                                <circle cx={330 - p * 195} cy="235" r="4" fill="#3fb950" />
                              </g>
                            );
                          })()}
                          {d2On && (() => {
                            const p = (time * 0.8) % 1;
                            return (
                              <g>
                                <circle cx={105 + p * 80} cy="205" r="4" fill="#3fb950" />
                                <circle cx="270" cy={205 - p * 130} r="4" fill="#3fb950" />
                                <circle cx={270 + p * 90} cy="75" r="4" fill="#3fb950" />
                                <circle cx={330 - p * 195} cy="235" r="4" fill="#3fb950" />
                              </g>
                            );
                          })()}
                        </g>
                      );
                    }

                    if (rectifierType === 'full_bridge') {
                      // Classic 1-Phase Graetz Bridge SLD Diagram (Exact Match to Textbook Schematic)
                      const d1d2On = isPosHalf; // D1 & D2 conduct on positive cycle
                      const d3d4On = !isPosHalf; // D3 & D4 conduct on negative cycle

                      return (
                        <g>
                          {/* Vin AC Source Circle on the Left */}
                          <g transform="translate(50, 120)">
                            <circle cx="0" cy="0" r="20" fill="#161b22" stroke="#ef4444" strokeWidth="2.5" />
                            <path d="M -8 0 Q -4 -7 0 0 T 8 0" fill="none" stroke="#ef4444" strokeWidth="2.5" />
                            <text x="-32" y="4" fill="#ef4444" fontSize="13" fontFamily="monospace" fontWeight="bold">Vin</text>
                            <text x="0" y="34" textAnchor="middle" fill="#58a6ff" fontSize="10" fontFamily="monospace">{rectifierVac}V AC</text>
                            <text x="0" y="-26" textAnchor="middle" fill="#3fb950" fontSize="10" fontFamily="monospace">θ={degTime}°</text>
                          </g>

                          {/* Top Wire from Vin to Top Vertex (230, 50) */}
                          <path
                            d="M 50 100 L 50 40 L 230 40 L 230 50"
                            stroke={d1d2On ? '#3fb950' : '#ef4444'}
                            strokeWidth="2.5"
                            fill="none"
                          />
                          {/* Bottom Wire from Vin to Bottom Vertex (230, 200) */}
                          <path
                            d="M 50 140 L 50 200 L 230 200"
                            stroke={d3d4On ? '#3fb950' : '#ef4444'}
                            strokeWidth="2.5"
                            fill="none"
                          />

                          {/* DIAMOND BRIDGE 4 ARMS (WIRES) */}
                          {/* Top-Left Arm: Left Vertex (160,125) to Top Vertex (230,50) */}
                          <path d="M 160 125 L 230 50" stroke={d3d4On ? '#3fb950' : '#484f58'} strokeWidth="2.5" fill="none" />
                          {/* Top-Right Arm: Top Vertex (230,50) to Right Vertex (300,125) */}
                          <path d="M 230 50 L 300 125" stroke={d1d2On ? '#3fb950' : '#484f58'} strokeWidth="2.5" fill="none" />
                          {/* Bottom-Left Arm: Bottom Vertex (230,200) to Left Vertex (160,125) */}
                          <path d="M 230 200 L 160 125" stroke={d1d2On ? '#3fb950' : '#484f58'} strokeWidth="2.5" fill="none" />
                          {/* Bottom-Right Arm: Bottom Vertex (230,200) to Right Vertex (300,125) */}
                          <path d="M 230 200 L 300 125" stroke={d3d4On ? '#3fb950' : '#484f58'} strokeWidth="2.5" fill="none" />

                          {/* 4 DIODES PLACED ON THE DIAMOND ARMS (Exact Textbook Orientation) */}
                          {/* D1 (Top-Right Arm): Anode at Top Vertex (230,50), Cathode at Right Vertex (300,125) */}
                          <g transform="translate(265, 87.5) rotate(45)">
                            <polygon points="-9,-11 -9,11 9,0" fill={d1d2On ? '#238636' : '#161b22'} stroke={d1d2On ? '#3fb950' : '#f59e0b'} strokeWidth="2.5" />
                            <line x1="9" y1="-11" x2="9" y2="11" stroke={d1d2On ? '#3fb950' : '#f59e0b'} strokeWidth="3" />
                          </g>
                          <text x="280" y="72" fill={d1d2On ? '#3fb950' : '#f59e0b'} fontSize="12" fontFamily="monospace" fontWeight="bold">D1</text>

                          {/* D3 (Top-Left Arm): Anode at Left Vertex (160,125), Cathode at Top Vertex (230,50) */}
                          <g transform="translate(195, 87.5) rotate(-45)">
                            <polygon points="-9,-11 -9,11 9,0" fill={d3d4On ? '#238636' : '#161b22'} stroke={d3d4On ? '#3fb950' : '#f59e0b'} strokeWidth="2.5" />
                            <line x1="9" y1="-11" x2="9" y2="11" stroke={d3d4On ? '#3fb950' : '#f59e0b'} strokeWidth="3" />
                          </g>
                          <text x="175" y="72" fill={d3d4On ? '#3fb950' : '#f59e0b'} fontSize="12" fontFamily="monospace" fontWeight="bold">D3</text>

                          {/* D2 (Bottom-Left Arm): Anode at Bottom Vertex (230,200), Cathode at Left Vertex (160,125) */}
                          <g transform="translate(195, 162.5) rotate(225)">
                            <polygon points="-9,-11 -9,11 9,0" fill={d1d2On ? '#238636' : '#161b22'} stroke={d1d2On ? '#3fb950' : '#f59e0b'} strokeWidth="2.5" />
                            <line x1="9" y1="-11" x2="9" y2="11" stroke={d1d2On ? '#3fb950' : '#f59e0b'} strokeWidth="3" />
                          </g>
                          <text x="175" y="185" fill={d1d2On ? '#3fb950' : '#f59e0b'} fontSize="12" fontFamily="monospace" fontWeight="bold">D2</text>

                          {/* D4 (Bottom-Right Arm): Anode at Bottom Vertex (230,200), Cathode at Right Vertex (300,125) */}
                          <g transform="translate(265, 162.5) rotate(-45)">
                            <polygon points="-9,-11 -9,11 9,0" fill={d3d4On ? '#238636' : '#161b22'} stroke={d3d4On ? '#3fb950' : '#f59e0b'} strokeWidth="2.5" />
                            <line x1="9" y1="-11" x2="9" y2="11" stroke={d3d4On ? '#3fb950' : '#f59e0b'} strokeWidth="3" />
                          </g>
                          <text x="280" y="185" fill={d3d4On ? '#3fb950' : '#f59e0b'} fontSize="12" fontFamily="monospace" fontWeight="bold">D4</text>

                          {/* 4 JUNCTION NODE DOTS (Matching Textbook Schematic) */}
                          <circle cx="230" cy="50" r="4.5" fill="#0d1117" stroke="#e6edf3" strokeWidth="2" />
                          <circle cx="300" cy="125" r="4.5" fill="#0d1117" stroke="#e6edf3" strokeWidth="2" />
                          <circle cx="230" cy="200" r="4.5" fill="#0d1117" stroke="#e6edf3" strokeWidth="2" />
                          <circle cx="160" cy="125" r="4.5" fill="#0d1117" stroke="#e6edf3" strokeWidth="2" />

                          {/* OUTPUT CONNECTIONS TO Vout AND LOAD SECTION */}
                          {/* Right Vertex (300, 125) -> Vout Wire -> Load DC+ Bus (360, 75) */}
                          <path d="M 300 125 L 330 125 L 330 75 L 360 75" stroke="#3fb950" strokeWidth="2.5" fill="none" />
                          <text x="305" y="115" fill="#3fb950" fontSize="12" fontFamily="monospace" fontWeight="bold">Vout</text>

                          {/* DC- Return Wire from Load (360, 205) -> LEFT -> UP to Left Vertex (160, 125) */}
                          <path
                            d="M 360 205 L 330 205 L 330 235 L 160 235 L 160 125"
                            stroke="#3fb950"
                            strokeWidth="2.5"
                            fill="none"
                          />

                          {/* ACTIVE CLOSED-LOOP CURRENT FLOW ANIMATION */}
                          {(() => {
                            const p = (time * 0.8) % 1;
                            const p2 = (time * 0.8 + 0.4) % 1;
                            
                            // Parametric Vout path: Right Vertex (300,125) -> (330,125) -> (330,75) -> Load (360,75)
                            const getVoutPos = (progress: number) => {
                              if (progress < 0.25) return { x: 300 + (progress / 0.25) * 30, y: 125 };
                              if (progress < 0.75) return { x: 330, y: 125 - ((progress - 0.25) / 0.5) * 50 };
                              return { x: 330 + ((progress - 0.75) / 0.25) * 30, y: 75 };
                            };

                            // Parametric Return path: Load (360,205) -> (330,205) -> (330,235) -> (160,235) -> Left Vertex (160,125)
                            const getReturnPos = (progress: number) => {
                              if (progress < 0.15) return { x: 360 - (progress / 0.15) * 30, y: 205 };
                              if (progress < 0.3) return { x: 330, y: 205 + ((progress - 0.15) / 0.15) * 30 };
                              if (progress < 0.8) return { x: 330 - ((progress - 0.3) / 0.5) * 170, y: 235 };
                              return { x: 160, y: 235 - ((progress - 0.8) / 0.2) * 110 };
                            };

                            const voutPos = getVoutPos(p);
                            const returnPos = getReturnPos(p);

                            return d1d2On ? (
                              <g>
                                {/* Vin (+) -> Top Wire -> Top Vertex (230, 50) */}
                                <circle cx={50 + p * 180} cy="40" r="4" fill="#3fb950" />
                                {/* Top Vertex (230, 50) -> D1 -> Right Vertex (300, 125) */}
                                <circle cx={230 + p * 70} cy={50 + p * 75} r="4" fill="#3fb950" />
                                {/* Right Vertex -> Vout -> Load */}
                                <circle cx={voutPos.x} cy={voutPos.y} r="4" fill="#3fb950" />
                                {/* Load -> Return Line -> Left Vertex (160, 125) */}
                                <circle cx={returnPos.x} cy={returnPos.y} r="4" fill="#3fb950" />
                                {/* Left Vertex (160, 125) -> D2 -> Bottom Vertex (230, 200) */}
                                <circle cx={160 + p2 * 70} cy={125 + p2 * 75} r="4" fill="#3fb950" />
                              </g>
                            ) : (
                              <g>
                                {/* Vin (-) -> Bottom Wire -> Bottom Vertex (230, 200) */}
                                <circle cx={50 + p * 180} cy="200" r="4" fill="#3fb950" />
                                {/* Bottom Vertex (230, 200) -> D4 -> Right Vertex (300, 125) */}
                                <circle cx={230 + p * 70} cy={200 - p * 75} r="4" fill="#3fb950" />
                                {/* Right Vertex -> Vout -> Load */}
                                <circle cx={voutPos.x} cy={voutPos.y} r="4" fill="#3fb950" />
                                {/* Load -> Return Line -> Left Vertex (160, 125) */}
                                <circle cx={returnPos.x} cy={returnPos.y} r="4" fill="#3fb950" />
                                {/* Left Vertex (160, 125) -> D3 -> Top Vertex (230, 50) */}
                                <circle cx={160 + p2 * 70} cy={125 - p2 * 75} r="4" fill="#3fb950" />
                              </g>
                            );
                          })()}
                        </g>
                      );
                    }

                    // 3-Phase 6-Pulse Diode Bridge (6 Physical Diodes D1 - D6)
                    const seq3p = Math.floor((degTime / 60) % 6);
                    const pairs3p = [
                      { p: 'D1 + D6 (Vab)', top: 0, bot: 1 }, // Vab
                      { p: 'D1 + D2 (Vac)', top: 0, bot: 2 }, // Vac
                      { p: 'D3 + D2 (Vbc)', top: 1, bot: 2 }, // Vbc
                      { p: 'D3 + D4 (Vba)', top: 1, bot: 0 }, // Vba
                      { p: 'D5 + D4 (Vca)', top: 2, bot: 0 }, // Vca
                      { p: 'D5 + D6 (Vcb)', top: 2, bot: 1 }, // Vcb
                    ];
                    const active3p = pairs3p[seq3p] || pairs3p[0];

                    // Legs X positions: Leg A = 150, Leg B = 220, Leg C = 290
                    const legXs = [150, 220, 290];

                    return (
                      <g>
                        {/* 3-Phase Neutral Line and Ground Symbol (Left Side) */}
                        <path d="M 18 100 L 18 180 M 18 180 L 18 208" stroke="#8b949e" strokeWidth="2" fill="none" />
                        {/* Ground Symbol ⏚ */}
                        <g transform="translate(18, 208)">
                          <line x1="-12" y1="0" x2="12" y2="0" stroke="#8b949e" strokeWidth="2.5" />
                          <line x1="-8" y1="4" x2="8" y2="4" stroke="#8b949e" strokeWidth="2" />
                          <line x1="-4" y1="8" x2="4" y2="8" stroke="#8b949e" strokeWidth="1.5" />
                        </g>

                        {/* Wires connecting Ground Neutral Line to Left of Va, Vb, Vc */}
                        <path d="M 18 100 L 26 100" stroke="#8b949e" strokeWidth="2" fill="none" />
                        <path d="M 18 140 L 26 140" stroke="#8b949e" strokeWidth="2" fill="none" />
                        <path d="M 18 180 L 26 180" stroke="#8b949e" strokeWidth="2" fill="none" />

                        {/* 3 Phase AC Voltage Sources Va, Vb, Vc */}
                        {/* Va Source (Top: Y=100) */}
                        <g transform="translate(38, 100)">
                          <circle cx="0" cy="0" r="12" fill="#161b22" stroke="#f85149" strokeWidth="2" />
                          <path d="M -5 0 Q -2.5 -4 0 0 T 5 0" fill="none" stroke="#f85149" strokeWidth="2" />
                          <text x="0" y="-16" textAnchor="middle" fill="#f85149" fontSize="11" fontFamily="monospace" fontWeight="bold">Va</text>
                        </g>

                        {/* Vb Source (Middle: Y=140) */}
                        <g transform="translate(38, 140)">
                          <circle cx="0" cy="0" r="12" fill="#161b22" stroke="#58a6ff" strokeWidth="2" />
                          <path d="M -5 0 Q -2.5 -4 0 0 T 5 0" fill="none" stroke="#58a6ff" strokeWidth="2" />
                          <text x="-20" y="4" fill="#58a6ff" fontSize="11" fontFamily="monospace" fontWeight="bold">Vb</text>
                        </g>

                        {/* Vc Source (Bottom: Y=180) */}
                        <g transform="translate(38, 180)">
                          <circle cx="0" cy="0" r="12" fill="#161b22" stroke="#e3b341" strokeWidth="2" />
                          <path d="M -5 0 Q -2.5 -4 0 0 T 5 0" fill="none" stroke="#e3b341" strokeWidth="2" />
                          <text x="0" y="24" textAnchor="middle" fill="#e3b341" fontSize="11" fontFamily="monospace" fontWeight="bold">Vc</text>
                        </g>

                        {/* Top DC+ Bus Rail (Y=65) -> Load (360, 75 via drop) */}
                        <path d="M 150 65 L 330 65 L 330 75 L 360 75" stroke="#3fb950" strokeWidth="2.5" fill="none" />
                        <text x="305" y="58" fill="#3fb950" fontSize="12" fontFamily="monospace" fontWeight="bold">Vout</text>

                        {/* Bottom DC- Bus Rail (Y=215) -> Load (360, 205 via rise) */}
                        <path d="M 150 215 L 330 215 L 330 205 L 360 205" stroke="#3fb950" strokeWidth="2.5" fill="none" />

                        {/* Straight Horizontal Phase Input Wires from Va, Vb, Vc directly to Leg 1, Leg 2, Leg 3 */}
                        {/* Phase A (f85149): Straight from Va (50, 100) -> Leg 1 (150, 100) */}
                        <path d="M 50 100 L 150 100" stroke="#f85149" strokeWidth="2" fill="none" />
                        {/* Phase B (58a6ff): Straight from Vb (50, 140) -> Leg 2 (220, 140) */}
                        <path d="M 50 140 L 220 140" stroke="#58a6ff" strokeWidth="2" fill="none" />
                        {/* Phase C (e3b341): Straight from Vc (50, 180) -> Leg 3 (290, 180) */}
                        <path d="M 50 180 L 290 180" stroke="#e3b341" strokeWidth="2" fill="none" />

                        {/* 3 Legs with Vertical Diodes */}
                        {[
                          { col: 0, x: 150, midY: 100, topName: 'D1', botName: 'D4', label: 'Leg A' },
                          { col: 1, x: 220, midY: 140, topName: 'D3', botName: 'D6', label: 'Leg B' },
                          { col: 2, x: 290, midY: 180, topName: 'D5', botName: 'D2', label: 'Leg C' },
                        ].map((leg) => {
                          const isTopOn = active3p.top === leg.col;
                          const isBotOn = active3p.bot === leg.col;

                          return (
                            <g key={leg.col}>
                              {/* Leg Vertical Wire from Top Rail (Y=65) to Bottom Rail (Y=215) */}
                              <path d={`M ${leg.x} 65 L ${leg.x} ${leg.midY}`} stroke={isTopOn ? '#3fb950' : '#484f58'} strokeWidth="2.5" fill="none" />
                              <path d={`M ${leg.x} ${leg.midY} L ${leg.x} 215`} stroke={isBotOn ? '#3fb950' : '#484f58'} strokeWidth="2.5" fill="none" />

                              {/* Top Diode (Pointing UP: Anode at bottom, Cathode at top) at Y=80 */}
                              <g transform={`translate(${leg.x}, 82)`}>
                                <polygon
                                  points="-9,9 9,9 0,-9"
                                  fill={isTopOn ? '#238636' : '#161b22'}
                                  stroke={isTopOn ? '#3fb950' : '#f59e0b'}
                                  strokeWidth="2.5"
                                />
                                <line x1="-9" y1="-9" x2="9" y2="-9" stroke={isTopOn ? '#3fb950' : '#f59e0b'} strokeWidth="3" />
                                <text x="14" y="3" fill={isTopOn ? '#3fb950' : '#f59e0b'} fontSize="11" fontFamily="monospace" fontWeight="bold">
                                  {leg.topName}
                                </text>
                              </g>

                              {/* Bottom Diode (Pointing UP: Anode at bottom, Cathode at top) at Y=198 */}
                              <g transform={`translate(${leg.x}, 198)`}>
                                <polygon
                                  points="-9,9 9,9 0,-9"
                                  fill={isBotOn ? '#238636' : '#161b22'}
                                  stroke={isBotOn ? '#3fb950' : '#f59e0b'}
                                  strokeWidth="2.5"
                                />
                                <line x1="-9" y1="-9" x2="9" y2="-9" stroke={isBotOn ? '#3fb950' : '#f59e0b'} strokeWidth="3" />
                                <text x="14" y="3" fill={isBotOn ? '#3fb950' : '#f59e0b'} fontSize="11" fontFamily="monospace" fontWeight="bold">
                                  {leg.botName}
                                </text>
                              </g>

                              {/* Junction Node Dots */}
                              <circle cx={leg.x} cy="65" r="4" fill="#0d1117" stroke="#e6edf3" strokeWidth="2" />
                              <circle cx={leg.x} cy={leg.midY} r="4.5" fill="#0d1117" stroke="#e6edf3" strokeWidth="2" />
                              <circle cx={leg.x} cy="215" r="4" fill="#0d1117" stroke="#e6edf3" strokeWidth="2" />
                            </g>
                          );
                        })}

                        {/* Active Conducting Pair Banner */}
                        <g transform="translate(130, 230)">
                          <rect x="0" y="0" width="180" height="22" fill="#0d1117" stroke="#3fb950" strokeWidth="1.5" rx="4" />
                          <text x="90" y="15" textAnchor="middle" fill="#3fb950" fontSize="11" fontFamily="monospace" fontWeight="bold">
                            Active: {active3p.p}
                          </text>
                        </g>

                        {/* Animated Current Flow Dots */}
                        {/* Top Rail Flow to Load */}
                        <circle cx={(legXs[active3p.top] + (time * 80) % (330 - legXs[active3p.top]))} cy="65" r="4" fill="#3fb950" />
                        {/* Up through active top diode */}
                        <circle cx={legXs[active3p.top]} cy={(100 - (time * 40) % 35)} r="4" fill="#3fb950" />
                        {/* Return Bottom Rail Flow from Load */}
                        <circle cx={(330 - (time * 80) % (330 - legXs[active3p.bot]))} cy="215" r="4" fill="#3fb950" />
                        {/* Up through active bottom diode */}
                        <circle cx={legXs[active3p.bot]} cy={(215 - (time * 40) % 35)} r="4" fill="#3fb950" />
                      </g>
                    );
                  })()}

                  {/* LOAD SECTION (DYNAMIC R / RL / RC SCHEMATIC SEAMLESSLY CONNECTED TO BRIDGE OUTPUT) */}
                  <g transform="translate(360, 0)">
                    {/* Top Bus Bar Line from Bridge output (360, 75) to Load (440, 75) */}
                    {rectifierLoadType === 'RL' ? (
                      <g>
                        <path d="M 0 75 L 20 75" stroke="#3fb950" strokeWidth="2.5" fill="none" />
                        {/* Series Inductor L */}
                        <path d="M 20 75 Q 27 60 35 75 Q 42 60 50 75 Q 57 60 65 75" fill="none" stroke="#39c5cf" strokeWidth="3" />
                        <text x="42" y="55" textAnchor="middle" fill="#39c5cf" fontSize="10" fontFamily="monospace">L={filterInductance}mH</text>
                        <path d="M 65 75 L 80 75 L 80 115" stroke="#3fb950" strokeWidth="2.5" fill="none" />
                      </g>
                    ) : (
                      <path d="M 0 75 L 80 75 L 80 115" stroke="#3fb950" strokeWidth="2.5" fill="none" />
                    )}

                    {/* Bottom Return Bus Bar Line from Load (440, 205) back to Bridge (360, 205) */}
                    <path d="M 0 205 L 80 205 L 80 165" stroke="#3fb950" strokeWidth="2.5" fill="none" />

                    {/* Capacitor C in Parallel at X = 40 (360+40 = 400) if RC Filter */}
                    {rectifierLoadType === 'RC' && filterCapacitance > 0 && (
                      <g>
                        {/* Wire from Top Bus down to Capacitor */}
                        <path d="M 40 75 L 40 125" stroke="#3fb950" strokeWidth="2.5" fill="none" />
                        {/* Capacitor Plates */}
                        <line x1="28" y1="125" x2="52" y2="125" stroke="#3fb950" strokeWidth="3" />
                        <line x1="28" y1="135" x2="52" y2="135" stroke="#3fb950" strokeWidth="3" />
                        {/* Wire from Capacitor bottom to Bottom Return Bus */}
                        <path d="M 40 135 L 40 205" stroke="#3fb950" strokeWidth="2.5" fill="none" />
                        {/* Junction Node Dots */}
                        <circle cx="40" cy="75" r="3.5" fill="#3fb950" />
                        <circle cx="40" cy="205" r="3.5" fill="#3fb950" />
                        <text x="56" y="133" fill="#3fb950" fontSize="10" fontFamily="monospace">{filterCapacitance}µF</text>
                      </g>
                    )}

                    {/* Load Resistor RL at X = 80 (360+80 = 440) */}
                    <g transform="translate(80, 140)">
                      <rect x="-10" y="-25" width="20" height="50" fill="#161b22" stroke="#3fb950" strokeWidth="2.5" rx="3" />
                      <text x="16" y="5" fill="#e3b341" fontSize="11" fontFamily="monospace" fontWeight="bold">RL={rectifierLoad}Ω</text>
                    </g>

                    {/* Animated Current Dot down through Load Resistor */}
                    <circle cx="80" cy={(75 + (time * 50) % 130)} r="3.5" fill="#3fb950" />
                  </g>
                </g>
              )}

              {activeTopic === 'transistor' && (
                <g>
                  {/* CANVAS TOP VIEW TOGGLE HEADER (Junction Physics vs Circuit SLD) */}
                  <g transform="translate(15, 10)">
                    {/* Junction View Tab Button */}
                    <g className="cursor-pointer" onClick={() => setTransistorSubView('junction')}>
                      <rect
                        x="0"
                        y="0"
                        width="230"
                        height="24"
                        fill={transistorSubView === 'junction' ? '#8957e5' : '#161b22'}
                        stroke={transistorSubView === 'junction' ? '#d2a8ff' : '#30363d'}
                        strokeWidth="1.5"
                        rx="5"
                      />
                      <text x="115" y="16" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        🔬 SEMICONDUCTOR JUNCTION PHYSICS
                      </text>
                    </g>
                    {/* Circuit SLD View Tab Button */}
                    <g className="cursor-pointer" onClick={() => setTransistorSubView('schematic')}>
                      <rect
                        x="240"
                        y="0"
                        width="230"
                        height="24"
                        fill={transistorSubView === 'schematic' ? '#8957e5' : '#161b22'}
                        stroke={transistorSubView === 'schematic' ? '#d2a8ff' : '#30363d'}
                        strokeWidth="1.5"
                        rx="5"
                      />
                      <text x="355" y="16" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        ⚡ 12V DC SLD SCHEMATIC
                      </text>
                    </g>
                  </g>

                  {transistorSubView === 'junction' ? (
                    <g transform="translate(0, 15)">
                      {/* --- 1. BJT PHYSICAL SEMICONDUCTOR JUNCTION DIAGRAM --- */}
                      {transistorType === 'bjt' && (
                        <g>
                          <text x="250" y="32" textAnchor="middle" fill="#d2a8ff" fontSize="11" fontFamily="monospace" fontWeight="bold">
                            NPN BJT INTERNAL PN JUNCTIONS &amp; DEPLETION WIDTH DYNAMICS
                          </text>

                          {/* Outer Substrate Canvas Frame */}
                          <rect x="50" y="45" width="400" height="225" fill="#0d1117" stroke="#8957e5" strokeWidth="2" rx="8" />

                          {/* Top N+ Heavy Emitter Region */}
                          <rect x="150" y="55" width="200" height="38" fill="#1f6beb" opacity="0.35" stroke="#58a6ff" strokeWidth="1.5" rx="4" />
                          <text x="250" y="77" textAnchor="middle" fill="#58a6ff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                            N+ Heavy Emitter (n = 10¹⁹/cm³)
                          </text>

                          {/* Emitter Terminal Contact (E) */}
                          <path d="M 250 45 L 250 55" stroke="#58a6ff" strokeWidth="3" />
                          <circle cx="250" cy="45" r="4" fill="#58a6ff" />
                          <text x="250" y="40" textAnchor="middle" fill="#58a6ff" fontSize="10" fontFamily="monospace" fontWeight="bold">EMITTER (E)</text>

                          {/* Emitter-Base Junction (J_EB) & Dynamic Depletion Layer */}
                          {(() => {
                            const isEBOn = gateDriveOn && transistorFault !== 'gate_open';
                            const depWidthEB = isEBOn ? 3 : 16;
                            return (
                              <g>
                                <rect
                                  x="150"
                                  y={93 - depWidthEB / 2}
                                  width="200"
                                  height={depWidthEB}
                                  fill={isEBOn ? '#3fb950' : '#e3b341'}
                                  opacity={isEBOn ? 0.95 : 0.6}
                                  filter={isEBOn ? 'url(#glow-green)' : undefined}
                                />
                                <line x1="150" y1="93" x2="350" y2="93" stroke={isEBOn ? '#3fb950' : '#e3b341'} strokeWidth="1.5" strokeDasharray="3 3" />
                                <text x="360" y="96" fill={isEBOn ? '#3fb950' : '#e3b341'} fontSize="9" fontFamily="monospace" fontWeight="bold">
                                  J_EB: {isEBOn ? 'Forward Biased (Vbe=0.7V) -> Narrow Depletion' : 'Cutoff (Wide Depletion Layer)'}
                                </text>
                              </g>
                            );
                          })()}

                          {/* P Thin Base Region */}
                          <rect x="110" y="97" width="280" height="36" fill="#da3633" opacity="0.35" stroke="#f85149" strokeWidth="1.5" rx="4" />
                          <text x="250" y="119" textAnchor="middle" fill="#f85149" fontSize="10" fontFamily="monospace" fontWeight="bold">
                            P Base Region (W_Base ≈ 1.0 µm)
                          </text>

                          {/* Base Terminal (B) Wire Input */}
                          <path d="M 50 115 L 110 115" stroke={gateDriveOn && transistorFault !== 'gate_open' ? '#3fb950' : '#8b949e'} strokeWidth="3" />
                          <circle cx="50" cy="115" r="4" fill="#f85149" />
                          <text x="65" y="108" fill="#f85149" fontSize="9" fontFamily="monospace" fontWeight="bold">
                            BASE (B): {gateDriveOn && transistorFault !== 'gate_open' ? 'Ib = 100mA' : 'Ib = 0mA'}
                          </text>

                          {/* Collector-Base Junction (J_CB) & Depletion Region */}
                          {(() => {
                            const isCBOn = gateDriveOn && transistorFault !== 'gate_open';
                            const depWidthCB = isCBOn ? 22 : 40;
                            return (
                              <g>
                                <rect
                                  x="90"
                                  y={133}
                                  width="320"
                                  height={depWidthCB}
                                  fill="#bb8009"
                                  opacity="0.35"
                                  stroke="#e3b341"
                                  strokeWidth="1"
                                />
                                <line x1="90" y1="133" x2="410" y2="133" stroke="#e3b341" strokeWidth="1.5" strokeDasharray="3 3" />
                                <text x="360" y="146" fill="#e3b341" fontSize="9" fontFamily="monospace" fontWeight="bold">
                                  J_CB: Reverse Biased (Vcb={isCBOn ? '11.3V' : '12V'})
                                </text>
                                {/* Electric Field Vectors in J_CB Depletion Region */}
                                <g stroke="#e3b341" strokeWidth="1.5" opacity="0.7">
                                  <line x1="180" y1="136" x2="180" y2="150" />
                                  <polygon points="180,152 177,147 183,147" fill="#e3b341" />
                                  <line x1="280" y1="136" x2="280" y2="150" />
                                  <polygon points="280,152 277,147 283,147" fill="#e3b341" />
                                </g>
                              </g>
                            );
                          })()}

                          {/* N- Collector Drift Layer */}
                          <rect x="90" y="176" width="320" height="50" fill="#388bfd" opacity="0.15" stroke="#58a6ff" strokeWidth="1.5" rx="4" />
                          <text x="250" y="205" textAnchor="middle" fill="#58a6ff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                            N- Collector Drift Layer (Voltage Blocking Region)
                          </text>

                          {/* N+ Collector Substrate & Collector Terminal (C) */}
                          <rect x="90" y="226" width="320" height="25" fill="#1f6beb" opacity="0.5" stroke="#58a6ff" strokeWidth="1" />
                          <text x="250" y="242" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                            N+ Collector Heavy Substrate
                          </text>
                          <path d="M 250 251 L 250 270" stroke="#58a6ff" strokeWidth="3" />
                          <circle cx="250" cy="270" r="4" fill="#58a6ff" />
                          <text x="250" y="280" textAnchor="middle" fill="#58a6ff" fontSize="10" fontFamily="monospace" fontWeight="bold">COLLECTOR (C)</text>

                          {/* Carrier Motion Animations when ON */}
                          {gateDriveOn && transistorFault !== 'gate_open' && (
                            <g>
                              {/* Electrons e- injected from Emitter down through Base to Collector */}
                              {[0, 0.25, 0.5, 0.75].map((offset, i) => {
                                const p = (time * 1.5 + offset) % 1;
                                return (
                                  <g key={i}>
                                    <circle cx={210 + (i % 2) * 40} cy={55 + p * 180} r="3.5" fill="#58a6ff" />
                                    <circle cx={250} cy={55 + ((p + 0.12) % 1) * 180} r="3" fill="#39c5cf" />
                                  </g>
                                );
                              })}
                              {/* Holes h+ injected into Base from left terminal */}
                              {[0, 0.5].map((offset, i) => {
                                const p = (time * 2 + offset) % 1;
                                return (
                                  <circle key={i} cx={50 + p * 60} cy="115" r="3.5" fill="#f85149" />
                                );
                              })}
                            </g>
                          )}
                        </g>
                      )}

                      {/* --- 2. MOSFET PHYSICAL SEMICONDUCTOR JUNCTION DIAGRAM --- */}
                      {transistorType === 'mosfet' && (
                        <g>
                          {/* Title Banner */}
                          <text x="250" y="24" textAnchor="middle" fill="#d2a8ff" fontSize="11" fontFamily="monospace" fontWeight="bold">
                            POWER MOSFET (VDMOS) INSULATED GATE &amp; N-CHANNEL INVERSION PHYSICS
                          </text>

                          {(() => {
                            const isMOSOn = gateDriveOn && transistorFault !== 'gate_open';
                            const isAvalanche = busVoltage > 500 || transistorTemp > 130;
                            const vgsVal = isMOSOn ? (gateVoltage > 0 ? gateVoltage : 10.0) : 0.0;
                            const vdsVal = isMOSOn ? 0.15 : 12.0;
                            const vthVal = 3.5;
                            const currentVal = isMOSOn ? (transistorCurrent > 0 ? transistorCurrent : 1.0) : 0.0;

                            return (
                              <g>
                                {/* 1. SWITCHING TRANSITION STAGE INDICATOR BAR */}
                                <g transform="translate(50, 32)">
                                  <rect x="0" y="0" width="400" height="16" fill="#161b22" stroke="#30363d" strokeWidth="1" rx="4" />
                                  
                                  {/* Stage 1: OFF */}
                                  <rect
                                    x="2"
                                    y="2"
                                    width="130"
                                    height="12"
                                    fill={!isMOSOn ? '#8957e5' : '#0d1117'}
                                    rx="3"
                                  />
                                  <text x="67" y="11" textAnchor="middle" fill={!isMOSOn ? '#ffffff' : '#8b949e'} fontSize="7" fontFamily="monospace" fontWeight="bold">
                                    1. OFF (Vds=12V, Id=0A)
                                  </text>

                                  {/* Stage 2: TRANSITION */}
                                  <rect
                                    x="135"
                                    y="2"
                                    width="130"
                                    height="12"
                                    fill={isPwmMode ? '#d97706' : '#0d1117'}
                                    rx="3"
                                  />
                                  <text x="200" y="11" textAnchor="middle" fill={isPwmMode ? '#ffffff' : '#8b949e'} fontSize="7" fontFamily="monospace" fontWeight="bold">
                                    2. TRANSITION (V*I Overlap Loss)
                                  </text>

                                  {/* Stage 3: ON */}
                                  <rect
                                    x="268"
                                    y="2"
                                    width="130"
                                    height="12"
                                    fill={isMOSOn && !isPwmMode ? '#238636' : '#0d1117'}
                                    rx="3"
                                  />
                                  <text x="333" y="11" textAnchor="middle" fill={isMOSOn && !isPwmMode ? '#ffffff' : '#8b949e'} fontSize="7" fontFamily="monospace" fontWeight="bold">
                                    3. ON (Low Vds=0.15V, Channel Formed)
                                  </text>
                                </g>

                                {/* Outer Frame */}
                                <rect x="50" y="52" width="400" height="218" fill="#0d1117" stroke="#8957e5" strokeWidth="2" rx="8" />

                                {/* Interactive Hotspot: GATE (Poly-Si) */}
                                <g className="cursor-pointer" onClick={() => setActivePhysicsHotspot('gate')}>
                                  <rect x="170" y="60" width="160" height="20" fill="#8957e5" opacity="0.8" stroke="#d2a8ff" strokeWidth="1.5" rx="3" />
                                  <text x="250" y="74" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                                    GATE (N+ Poly-Si) ℹ️
                                  </text>
                                  <path d="M 250 52 L 250 60" stroke="#d2a8ff" strokeWidth="2.5" />
                                  <circle cx="250" cy="52" r="3.5" fill="#d2a8ff" />
                                </g>

                                {/* Interactive Hotspot: SiO2 Gate Oxide */}
                                <g className="cursor-pointer" onClick={() => setActivePhysicsHotspot('oxide')}>
                                  <rect x="165" y="80" width="170" height="9" fill="#f59e0b" opacity="0.85" stroke="#fbbf24" strokeWidth="1" />
                                  <text x="250" y="87" textAnchor="middle" fill="#000000" fontSize="7" fontFamily="monospace" fontWeight="bold">
                                    SiO₂ Gate Oxide (t_ox = 50nm Insulator) ℹ️
                                  </text>
                                </g>

                                {/* Left & Right N+ Source Regions */}
                                <g className="cursor-pointer" onClick={() => setActivePhysicsHotspot('source')}>
                                  <rect x="90" y="80" width="65" height="26" fill="#1f6beb" opacity="0.4" stroke="#58a6ff" strokeWidth="1.5" />
                                  <text x="122" y="96" textAnchor="middle" fill="#58a6ff" fontSize="8" fontFamily="monospace" fontWeight="bold">N+ Source ℹ️</text>

                                  <rect x="345" y="80" width="65" height="26" fill="#1f6beb" opacity="0.4" stroke="#58a6ff" strokeWidth="1.5" />
                                  <text x="377" y="96" textAnchor="middle" fill="#58a6ff" fontSize="8" fontFamily="monospace" fontWeight="bold">N+ Source ℹ️</text>
                                </g>

                                {/* Source Metal Connections (S) */}
                                <path d="M 80 52 L 80 80 M 80 66 L 122 66 L 122 80 M 80 66 L 420 66 L 420 80 M 420 66 L 377 66 L 377 80" stroke="#3fb950" strokeWidth="2" fill="none" />
                                <circle cx="80" cy="52" r="3.5" fill="#3fb950" />
                                <text x="80" y="47" textAnchor="middle" fill="#3fb950" fontSize="9" fontFamily="monospace" fontWeight="bold">SOURCE (S)</text>

                                {/* P-Body Regions (Left & Right) */}
                                <g className="cursor-pointer" onClick={() => setActivePhysicsHotspot('pbody')}>
                                  <rect x="75" y="106" width="95" height="48" fill="#da3633" opacity="0.35" stroke="#f85149" strokeWidth="1" />
                                  <text x="110" y="132" textAnchor="middle" fill="#f85149" fontSize="8" fontFamily="monospace" fontWeight="bold">P-Body ℹ️</text>

                                  <rect x="330" y="106" width="95" height="48" fill="#da3633" opacity="0.35" stroke="#f85149" strokeWidth="1" />
                                  <text x="380" y="132" textAnchor="middle" fill="#f85149" fontSize="8" fontFamily="monospace" fontWeight="bold">P-Body ℹ️</text>
                                </g>

                                {/* 2. INTRINSIC BODY DIODE (P-Body to N- Drift) */}
                                <g className="cursor-pointer" onClick={() => setActivePhysicsHotspot('body_diode')}>
                                  {/* Left Body Diode Symbol */}
                                  <g transform="translate(148, 138)">
                                    <line x1="0" y1="12" x2="0" y2="-10" stroke="#e3b341" strokeWidth="1.5" />
                                    <polygon points="0,-6 -6,6 6,6" fill="#da3633" stroke="#e3b341" strokeWidth="1" />
                                    <line x1="-6" y1="-6" x2="6" y2="-6" stroke="#e3b341" strokeWidth="1.5" />
                                  </g>
                                  {/* Right Body Diode Symbol */}
                                  <g transform="translate(348, 138)">
                                    <line x1="0" y1="12" x2="0" y2="-10" stroke="#e3b341" strokeWidth="1.5" />
                                    <polygon points="0,-6 -6,6 6,6" fill="#da3633" stroke="#e3b341" strokeWidth="1" />
                                    <line x1="-6" y1="-6" x2="6" y2="-6" stroke="#e3b341" strokeWidth="1.5" />
                                  </g>
                                  <text x="250" y="146" textAnchor="middle" fill="#e3b341" fontSize="7" fontFamily="monospace" fontWeight="bold">
                                    ⚡ INTRINSIC BODY DIODE (P-Body → N- Drift) ℹ️
                                  </text>
                                </g>

                                {/* 3. DYNAMIC ON/OFF INVERSION CHANNEL */}
                                <g className="cursor-pointer" onClick={() => setActivePhysicsHotspot('channel')}>
                                  {isMOSOn ? (
                                    <g>
                                      {/* Glowing N-Inversion Channel Layers */}
                                      <rect x="155" y="89" width="20" height="18" fill="#39c5cf" opacity="0.95" filter="url(#glow-green)" />
                                      <rect x="325" y="89" width="20" height="18" fill="#39c5cf" opacity="0.95" filter="url(#glow-green)" />
                                      <text x="250" y="103" textAnchor="middle" fill="#39c5cf" fontSize="8" fontFamily="monospace" fontWeight="bold">
                                        ✔ ON / INVERSION CHANNEL FORMED (Vgs={vgsVal.toFixed(1)}V &gt; Vth) ℹ️
                                      </text>
                                      {/* Electrostatic Gate Field Lines */}
                                      <g stroke="#d2a8ff" strokeWidth="1" opacity="0.8">
                                        <line x1="200" y1="70" x2="200" y2="88" />
                                        <line x1="250" y1="70" x2="250" y2="88" />
                                        <line x1="300" y1="70" x2="300" y2="88" />
                                      </g>
                                    </g>
                                  ) : (
                                    <g>
                                      {/* Non-conductive OFF Depletion Region */}
                                      <rect x="165" y="106" width="170" height="28" fill="#e3b341" opacity="0.3" stroke="#e3b341" strokeDasharray="3 3" />
                                      <text x="250" y="123" textAnchor="middle" fill="#e3b341" fontSize="8" fontFamily="monospace" fontWeight="bold">
                                        OFF / CHANNEL NOT FORMED (Vgs={vgsVal.toFixed(1)}V &lt; Vth) ℹ️
                                      </text>
                                    </g>
                                  )}
                                </g>

                                {/* 4. N- DRIFT LAYER & AVALANCHE HIGHLIGHT */}
                                <g className="cursor-pointer" onClick={() => setActivePhysicsHotspot('drift')}>
                                  <rect
                                    x="75"
                                    y="154"
                                    width="350"
                                    height="65"
                                    fill={isAvalanche ? '#7f1d1d' : '#388bfd'}
                                    opacity={isAvalanche ? 0.45 : 0.15}
                                    stroke={isAvalanche ? '#ef4444' : '#58a6ff'}
                                    strokeWidth={isAvalanche ? 2.5 : 1.5}
                                    rx="4"
                                  />
                                  <text x="250" y="180" textAnchor="middle" fill={isAvalanche ? '#f85149' : '#58a6ff'} fontSize="9" fontFamily="monospace" fontWeight="bold">
                                    {isAvalanche
                                      ? '🚨 AVALANCHE / HIGH VDS STRESS (Drift Region Reverse Breakdown!) ℹ️'
                                      : 'N- Drift Layer (Voltage Blocking Region) ℹ️'}
                                  </text>
                                </g>

                                {/* 5. N+ DRAIN SUBSTRATE & DRAIN TERMINAL (D) */}
                                <g className="cursor-pointer" onClick={() => setActivePhysicsHotspot('drain')}>
                                  <rect x="75" y="219" width="350" height="22" fill="#1f6beb" opacity="0.5" stroke="#58a6ff" strokeWidth="1" />
                                  <text x="250" y="234" textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" fontWeight="bold">
                                    N+ Drain Heavy Substrate Layer ℹ️
                                  </text>
                                  <path d="M 250 241 L 250 258" stroke="#58a6ff" strokeWidth="2.5" />
                                  <circle cx="250" cy="258" r="3.5" fill="#58a6ff" />
                                  <text x="250" y="267" textAnchor="middle" fill="#58a6ff" fontSize="9" fontFamily="monospace" fontWeight="bold">DRAIN (D)</text>
                                </g>

                                {/* 6. CURRENT FLOW OVERLAY (ELECTRON VS CONVENTIONAL CURRENT) */}
                                {showCurrentFlow && isMOSOn && (
                                  <g>
                                    {currentVectorMode === 'electron' ? (
                                      /* Electron Flow (e-): Source -> Channel -> Drift -> Drain (DOWNWARDS) */
                                      <g>
                                        {[0, 0.25, 0.5, 0.75].map((offset, i) => {
                                          const p = (time * 1.5 + offset) % 1;
                                          return (
                                            <g key={i}>
                                              <circle cx="122" cy={80 + p * 140} r="2.5" fill="#39c5cf" />
                                              <circle cx="377" cy={80 + p * 140} r="2.5" fill="#39c5cf" />
                                              <circle cx={170 + p * 160} cy="180" r="2.5" fill="#39c5cf" />
                                            </g>
                                          );
                                        })}
                                        <g fill="#39c5cf" opacity="0.8">
                                          <polygon points="122,200 119,193 125,193" />
                                          <polygon points="377,200 374,193 380,193" />
                                        </g>
                                        <text x="250" y="196" textAnchor="middle" fill="#39c5cf" fontSize="7" fontFamily="monospace">
                                          e- Electron Flow: Source → Channel → Drift → Drain (↓)
                                        </text>
                                      </g>
                                    ) : (
                                      /* Conventional Current (Id): Drain -> Drift -> Channel -> Source (UPWARDS) */
                                      <g>
                                        {[0, 0.25, 0.5, 0.75].map((offset, i) => {
                                          const p = (time * 1.5 + offset) % 1;
                                          return (
                                            <g key={i}>
                                              <circle cx="122" cy={220 - p * 140} r="2.5" fill="#fbbf24" />
                                              <circle cx="377" cy={220 - p * 140} r="2.5" fill="#fbbf24" />
                                              <circle cx={330 - p * 160} cy="180" r="2.5" fill="#fbbf24" />
                                            </g>
                                          );
                                        })}
                                        <g fill="#fbbf24" opacity="0.8">
                                          <polygon points="122,80 119,87 125,87" />
                                          <polygon points="377,80 374,87 380,87" />
                                        </g>
                                        <text x="250" y="196" textAnchor="middle" fill="#fbbf24" fontSize="7" fontFamily="monospace">
                                          Id Conventional Current: Drain → Drift → Channel → Source (↑)
                                        </text>
                                      </g>
                                    )}
                                  </g>
                                )}

                                {/* 7. DYNAMIC MEASUREMENT LABELS (VGS, VDS, VTH) */}
                                <g transform="translate(175, 45)">
                                  <rect x="-30" y="-8" width="60" height="14" fill="#161b22" stroke="#d2a8ff" strokeWidth="1" rx="3" />
                                  <text x="0" y="2" textAnchor="middle" fill="#d2a8ff" fontSize="7" fontFamily="monospace" fontWeight="bold">
                                    VGS={vgsVal.toFixed(1)}V
                                  </text>
                                </g>

                                <g transform="translate(325, 45)">
                                  <rect x="-30" y="-8" width="60" height="14" fill="#161b22" stroke="#fbbf24" strokeWidth="1" rx="3" />
                                  <text x="0" y="2" textAnchor="middle" fill="#fbbf24" fontSize="7" fontFamily="monospace" fontWeight="bold">
                                    VTH={vthVal.toFixed(1)}V
                                  </text>
                                </g>

                                <g transform="translate(425, 230)">
                                  <rect x="-30" y="-8" width="60" height="14" fill="#161b22" stroke="#e3b341" strokeWidth="1" rx="3" />
                                  <text x="0" y="2" textAnchor="middle" fill="#e3b341" fontSize="7" fontFamily="monospace" fontWeight="bold">
                                    VDS={vdsVal.toFixed(2)}V
                                  </text>
                                </g>

                                {/* 8. KEY DEVICE PARAMETERS OVERLAY BOX */}
                                <g transform="translate(56, 175)">
                                  <rect x="0" y="0" width="135" height="42" fill="#161b22" fillOpacity="0.9" stroke="#30363d" strokeWidth="1" rx="4" />
                                  <text x="67" y="10" textAnchor="middle" fill="#d2a8ff" fontSize="7" fontFamily="monospace" fontWeight="bold">
                                    KEY DEVICE PARAMETERS
                                  </text>
                                  <text x="8" y="20" fill="#8b949e" fontSize="6.5" fontFamily="monospace">
                                    VGS(th)=3.5V | RDS(on)=0.05Ω
                                  </text>
                                  <text x="8" y="28" fill="#8b949e" fontSize="6.5" fontFamily="monospace">
                                    VDS(max)=600V | ID(max)=30A
                                  </text>
                                  <text x="8" y="36" fill="#58a6ff" fontSize="6" fontFamily="monospace">
                                    [Simulated vs Rated Specs]
                                  </text>
                                </g>
                              </g>
                            );
                          })()}
                        </g>
                      )}

                      {/* --- 3. IGBT PHYSICAL SEMICONDUCTOR JUNCTION DIAGRAM --- */}
                      {transistorType === 'igbt' && (
                        <g>
                          <text x="250" y="32" textAnchor="middle" fill="#d2a8ff" fontSize="11" fontFamily="monospace" fontWeight="bold">
                            IGBT DUAL-CARRIER INJECTION &amp; CONDUCTIVITY MODULATION PHYSICS
                          </text>

                          {/* Outer Frame */}
                          <rect x="50" y="45" width="400" height="225" fill="#0d1117" stroke="#8957e5" strokeWidth="2" rx="8" />

                          {/* Poly-Silicon Gate Terminal Block */}
                          <rect x="170" y="55" width="160" height="20" fill="#8957e5" opacity="0.8" stroke="#d2a8ff" strokeWidth="1.5" rx="3" />
                          <text x="250" y="69" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                            GATE (N+ Poly-Si)
                          </text>
                          <path d="M 250 45 L 250 55" stroke="#d2a8ff" strokeWidth="3" />
                          <circle cx="250" cy="45" r="4" fill="#d2a8ff" />
                          <text x="250" y="40" textAnchor="middle" fill="#d2a8ff" fontSize="10" fontFamily="monospace" fontWeight="bold">GATE (G)</text>

                          {/* SiO2 Gate Oxide Layer */}
                          <rect x="165" y="75" width="170" height="8" fill="#f59e0b" opacity="0.85" stroke="#fbbf24" strokeWidth="1" />

                          {/* Left & Right N+ Emitter Regions */}
                          <rect x="90" y="75" width="65" height="25" fill="#1f6beb" opacity="0.4" stroke="#58a6ff" strokeWidth="1.5" />
                          <text x="122" y="91" textAnchor="middle" fill="#58a6ff" fontSize="9" fontFamily="monospace" fontWeight="bold">N+ Emitter</text>

                          <rect x="345" y="75" width="65" height="25" fill="#1f6beb" opacity="0.4" stroke="#58a6ff" strokeWidth="1.5" />
                          <text x="377" y="91" textAnchor="middle" fill="#58a6ff" fontSize="9" fontFamily="monospace" fontWeight="bold">N+ Emitter</text>

                          {/* P-Body Regions */}
                          <rect x="75" y="100" width="95" height="45" fill="#da3633" opacity="0.35" stroke="#f85149" strokeWidth="1" />
                          <text x="120" y="125" textAnchor="middle" fill="#f85149" fontSize="9" fontFamily="monospace" fontWeight="bold">P-Body Region</text>

                          <rect x="330" y="100" width="95" height="45" fill="#da3633" opacity="0.35" stroke="#f85149" strokeWidth="1" />
                          <text x="380" y="125" textAnchor="middle" fill="#f85149" fontSize="9" fontFamily="monospace" fontWeight="bold">P-Body Region</text>

                          {/* N- Drift Layer with Conductivity Modulation */}
                          {(() => {
                            const isIGBTOn = gateDriveOn && transistorFault !== 'gate_open';
                            return (
                              <g>
                                <rect x="75" y="145" width="350" height="75" fill={isIGBTOn ? '#238636' : '#388bfd'} opacity={isIGBTOn ? 0.25 : 0.15} stroke={isIGBTOn ? '#3fb950' : '#58a6ff'} strokeWidth="1.5" rx="4" />
                                <text x="250" y="175" textAnchor="middle" fill={isIGBTOn ? '#3fb950' : '#58a6ff'} fontSize="10" fontFamily="monospace" fontWeight="bold">
                                  {isIGBTOn ? '⚡ CONDUCTIVITY MODULATED DRIFT LAYER (High Hole + Electron Density)' : 'N- Drift Layer (High Voltage Blocking Region)'}
                                </text>
                              </g>
                            );
                          })()}

                          {/* CRITICAL DIFFERENCE: P+ Collector Anode Injector Substrate Layer */}
                          <rect x="75" y="220" width="350" height="30" fill="#f85149" opacity="0.65" stroke="#da3633" strokeWidth="2" />
                          <text x="250" y="238" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace" fontWeight="bold">
                            P+ COLLECTOR / ANODE INJECTOR SUBSTRATE (Key IGBT Feature!)
                          </text>

                          {/* Collector Terminal (C) */}
                          <path d="M 250 250 L 250 270" stroke="#f85149" strokeWidth="3" />
                          <circle cx="250" cy="270" r="4" fill="#f85149" />
                          <text x="250" y="280" textAnchor="middle" fill="#f85149" fontSize="10" fontFamily="monospace" fontWeight="bold">COLLECTOR / ANODE (C)</text>

                          {/* Dual Carrier Injection Animations when ON */}
                          {gateDriveOn && transistorFault !== 'gate_open' && (
                            <g>
                              {/* Hole (h+) injection UPWARDS from P+ Collector Substrate */}
                              <circle cx="180" cy={(220 - (time * 40) % 70)} r="3.5" fill="#f85149" />
                              <circle cx="250" cy={(220 - ((time + 0.3) * 40) % 70)} r="3.5" fill="#f85149" />
                              <circle cx="320" cy={(220 - ((time + 0.6) * 40) % 70)} r="3.5" fill="#f85149" />

                              {/* Electron (e-) flow DOWNWARDS from Gate N-Channel */}
                              <circle cx="150" cy={(100 + (time * 50) % 110)} r="3" fill="#39c5cf" />
                              <circle cx="350" cy={(100 + (time * 50) % 110)} r="3" fill="#39c5cf" />
                            </g>
                          )}
                        </g>
                      )}
                    </g>
                  ) : (
                    <g transform="translate(0, 10)">
                    {/* --- EDUCATIONAL IEC 60617 / IEC 61082-1 SLD SCHEMATIC VIEW --- */}
                    {(() => {
                      const isConduction = gateDriveOn && transistorFault !== 'gate_open';
                      const isGateFault = transistorFault === 'gate_open';
                      const vSupply = 12.0;
                      const currentVal = isConduction ? (transistorCurrent > 0 ? transistorCurrent : 1.0) : 0.0;

                      let vSwitch = 12.0;
                      let vDrive = 0.0;
                      let rGateText = '10 Ω';
                      let deviceName = 'Power MOSFET (N-Channel)';
                      let vSwitchLabel = 'VDS';
                      let vDriveLabel = 'VGS';
                      let term1 = 'Drain (D)';
                      let term2 = 'Gate (G)';
                      let term3 = 'Source (S)';

                      if (transistorType === 'mosfet') {
                        deviceName = 'Power MOSFET (N-Channel Enhancement)';
                        vSwitchLabel = 'VDS';
                        vDriveLabel = 'VGS';
                        rGateText = '10 Ω';
                        vSwitch = isConduction ? 0.15 : 12.0;
                        vDrive = isConduction ? (gateVoltage > 0 ? gateVoltage : 10.0) : 0.0;
                        term1 = 'Drain (D)';
                        term2 = 'Gate (G)';
                        term3 = 'Source (S)';
                      } else if (transistorType === 'bjt') {
                        deviceName = 'NPN Transistor (BJT)';
                        vSwitchLabel = 'VCE';
                        vDriveLabel = 'VBE';
                        rGateText = '1.0 kΩ';
                        vSwitch = isConduction ? 0.30 : 12.0;
                        vDrive = isConduction ? 0.70 : 0.0;
                        term1 = 'Collector (C)';
                        term2 = 'Base (B)';
                        term3 = 'Emitter (E)';
                      } else if (transistorType === 'igbt') {
                        deviceName = 'N-Channel IGBT';
                        vSwitchLabel = 'VCE';
                        vDriveLabel = 'VGE';
                        rGateText = '10 Ω';
                        vSwitch = isConduction ? 1.50 : 12.0;
                        vDrive = isConduction ? (gateVoltage > 0 ? gateVoltage : 15.0) : 0.0;
                        term1 = 'Collector (C)';
                        term2 = 'Gate (G)';
                        term3 = 'Emitter (E)';
                      }

                      const vLoad = isConduction ? (vSupply - vSwitch).toFixed(2) : '0.00';

                      return (
                        <g transform="translate(0, 0)">
                          {/* 1. SCHEMATIC HEADER BANNER */}
                          <text x="250" y="20" textAnchor="middle" fill="#d2a8ff" fontSize="11" fontFamily="monospace" fontWeight="bold">
                            EDUCATIONAL IEC 60617 / IEC 61082-1 SCHEMATIC — 12V DC SWITCHING CIRCUIT
                          </text>

                          <text x="250" y="35" textAnchor="middle" fill={isGateFault ? '#f85149' : isConduction ? '#3fb950' : '#8b949e'} fontSize="10" fontFamily="monospace" fontWeight="bold">
                            Q1: {deviceName} [{isGateFault ? '🚨 GATE OPEN FAULT' : isPwmMode ? `⚡ PWM SWITCHING (${pwmDuty}% DUTY @ ${pwmFreq}Hz)` : isConduction ? '✓ CONDUCTION (ON)' : 'OFF (CUTOFF)'}]
                          </text>

                          {/* 2. ORTHOGONAL CONDUCTOR WIRES (IEC 61082-1) */}
                          {/* Top +12V Rail: Supply (50, 60) -> Load (340, 60) -> FWD Cathode (420, 60) */}
                          <path
                            d="M 50 115 L 50 60 L 420 60"
                            stroke={isConduction ? '#3fb950' : '#58a6ff'}
                            strokeWidth={isConduction ? '3' : '2.5'}
                            fill="none"
                          />
                          
                          {/* Electrical Junction Nodes */}
                          <circle cx="50" cy="60" r="3.5" fill="#58a6ff" />
                          <circle cx="340" cy="60" r="3.5" fill={isConduction ? '#3fb950' : '#58a6ff'} />
                          <circle cx="420" cy="60" r="3.5" fill={isConduction ? '#3fb950' : '#58a6ff'} />

                          {/* Wire from Load (340, 115) -> Ammeter A1 (340, 135) -> Node (340, 150) -> Switch (250, 150) */}
                          <path
                            d="M 340 115 L 340 150 L 250 150 L 250 162"
                            stroke={isConduction ? '#3fb950' : '#484f58'}
                            strokeWidth={isConduction ? '3' : '2.5'}
                            fill="none"
                          />

                          {/* Wire from FWD Anode (420, 115) -> Node (420, 150) -> Node (340, 150) */}
                          <path
                            d="M 420 115 L 420 150 L 340 150"
                            stroke={isConduction ? '#3fb950' : '#484f58'}
                            strokeWidth={isConduction ? '3' : '2.5'}
                            fill="none"
                          />
                          <circle cx="340" cy="150" r="3.5" fill={isConduction ? '#3fb950' : '#484f58'} />
                          <circle cx="420" cy="150" r="3.5" fill={isConduction ? '#3fb950' : '#484f58'} />

                          {/* Return Wire from Switch Source (250, 218) -> Ground Rail (250, 240) -> Supply Return (50, 240) */}
                          <path
                            d="M 250 218 L 250 240 L 50 240 L 50 145"
                            stroke={isConduction ? '#3fb950' : '#8b949e'}
                            strokeWidth={isConduction ? '3' : '2.5'}
                            fill="none"
                          />
                          <circle cx="250" cy="240" r="3.5" fill="#8b949e" />
                          <circle cx="50" cy="240" r="3.5" fill="#8b949e" />

                          {/* 3. V1 — 12 V DC POWER SUPPLY */}
                          <g transform="translate(50, 130)">
                            <circle cx="0" cy="0" r="15" fill="#161b22" stroke="#58a6ff" strokeWidth="2" />
                            <text x="0" y="-4" textAnchor="middle" fill="#f85149" fontSize="10" fontFamily="monospace" fontWeight="bold">+</text>
                            <text x="0" y="8" textAnchor="middle" fill="#58a6ff" fontSize="10" fontFamily="monospace" fontWeight="bold">−</text>
                            <text x="-25" y="-2" textAnchor="end" fill="#58a6ff" fontSize="9" fontFamily="monospace" fontWeight="bold">V1</text>
                            <text x="-25" y="10" textAnchor="end" fill="#8b949e" fontSize="8" fontFamily="monospace">12 V DC</text>
                          </g>
                          <text x="50" y="52" textAnchor="middle" fill="#f85149" fontSize="8" fontFamily="monospace" fontWeight="bold">+12V</text>
                          <text x="50" y="253" textAnchor="middle" fill="#58a6ff" fontSize="8" fontFamily="monospace" fontWeight="bold">0V / GND</text>

                          {/* 4. GATE DRIVER U1 & RESISTOR R1 */}
                          {/* Driver Block U1 */}
                          <g transform="translate(90, 190)">
                            <rect x="-24" y="-16" width="48" height="32" fill="#161b22" stroke={isGateFault ? '#f85149' : isConduction ? '#3fb950' : '#30363d'} strokeWidth="1.5" rx="4" />
                            <text x="0" y="-3" textAnchor="middle" fill="#58a6ff" fontSize="8" fontFamily="monospace" fontWeight="bold">U1 DRIVE</text>
                            <text x="0" y="9" textAnchor="middle" fill={isConduction ? '#3fb950' : '#8b949e'} fontSize="8" fontFamily="monospace">
                              {isPwmMode ? `PWM ${pwmDuty}%` : isConduction ? 'HIGH' : 'LOW'}
                            </text>
                          </g>

                          {/* Conductor from Driver U1 -> Resistor R1 */}
                          <line x1="114" y1="190" x2="135" y2="190" stroke={isGateFault ? '#f85149' : isConduction ? '#3fb950' : '#484f58'} strokeWidth="2" />

                          {/* Gate/Base Resistor R1 */}
                          <g transform="translate(150, 190)">
                            <rect x="-15" y="-8" width="30" height="16" fill="#161b22" stroke="#d2a8ff" strokeWidth="1.5" rx="2" />
                            <text x="0" y="3" textAnchor="middle" fill="#d2a8ff" fontSize="8" fontFamily="monospace" fontWeight="bold">R1</text>
                            <text x="0" y="-12" textAnchor="middle" fill="#e3b341" fontSize="8" fontFamily="monospace">{rGateText}</text>
                          </g>

                          {/* Conductor from Resistor R1 -> Gate Terminal */}
                          <line
                            x1="165"
                            y1="190"
                            x2="222"
                            y2="190"
                            stroke={isGateFault ? '#f85149' : isConduction ? '#3fb950' : '#484f58'}
                            strokeWidth="2"
                            strokeDasharray={isGateFault ? '3 3' : 'none'}
                          />

                          {/* Open Gate Fault Indicator */}
                          {isGateFault && (
                            <g transform="translate(193, 190)">
                              <circle cx="0" cy="0" r="7" fill="#da3633" />
                              <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">✕</text>
                            </g>
                          )}

                          {/* 5. LOAD (RL) & FREEWHEEL DIODE (D1) */}
                          {/* Load RL (Lamp / Resistor) */}
                          <g transform="translate(340, 88)">
                            <circle
                              cx="0"
                              cy="0"
                              r="16"
                              fill={isConduction ? '#f59e0b' : '#161b22'}
                              stroke={isConduction ? '#fbbf24' : '#484f58'}
                              strokeWidth="2"
                            />
                            <path
                              d="M -7 5 L -3 -4 L 0 3 L 3 -4 L 7 5"
                              fill="none"
                              stroke={isConduction ? '#ffffff' : '#8b949e'}
                              strokeWidth="1.5"
                            />
                            {isConduction && (
                              <g stroke="#fbbf24" strokeWidth="1.5">
                                <line x1="-22" y1="0" x2="-18" y2="0" />
                                <line x1="18" y1="0" x2="22" y2="0" />
                                <line x1="0" y1="-22" x2="0" y2="-18" />
                                <line x1="-15" y1="-15" x2="-12" y2="-12" />
                                <line x1="15" y1="-15" x2="12" y2="-12" />
                              </g>
                            )}
                            <text x="-24" y="-3" textAnchor="end" fill="#fbbf24" fontSize="9" fontFamily="monospace" fontWeight="bold">RL</text>
                            <text x="-24" y="9" textAnchor="end" fill="#8b949e" fontSize="8" fontFamily="monospace">12V 12Ω</text>
                            <text x="24" y="3" textAnchor="start" fill={isConduction ? '#3fb950' : '#8b949e'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                              V_load = {vLoad}V
                            </text>
                          </g>

                          {/* Freewheel Diode D1 (In parallel across Load) */}
                          <g transform="translate(420, 88)">
                            {/* Cathode Top Line */}
                            <line x1="-10" y1="-10" x2="10" y2="-10" stroke="#e3b341" strokeWidth="2" />
                            {/* Anode Triangle pointing UP */}
                            <polygon points="0,-10 -10,10 10,10" fill="#161b22" stroke="#e3b341" strokeWidth="1.5" />
                            <line x1="0" y1="-10" x2="0" y2="-28" stroke={isConduction ? '#3fb950' : '#58a6ff'} strokeWidth="2" />
                            <line x1="0" y1="10" x2="0" y2="27" stroke={isConduction ? '#3fb950' : '#484f58'} strokeWidth="2" />
                            <text x="14" y="-2" textAnchor="start" fill="#e3b341" fontSize="8" fontFamily="monospace" fontWeight="bold">D1 (FWD)</text>
                            <text x="14" y="9" textAnchor="start" fill="#8b949e" fontSize="7" fontFamily="monospace">Freewheel</text>
                          </g>

                          {/* 6. AMMETER SENSOR A1 */}
                          <g transform="translate(295, 150)">
                            <circle cx="0" cy="0" r="10" fill="#161b22" stroke="#58a6ff" strokeWidth="1.5" />
                            <text x="0" y="3" textAnchor="middle" fill="#58a6ff" fontSize="9" fontFamily="monospace" fontWeight="bold">A1</text>
                            <text x="0" y="-13" textAnchor="middle" fill={isConduction ? '#3fb950' : '#8b949e'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                              I = {currentVal.toFixed(1)} A
                            </text>
                          </g>

                          {/* 7. STANDARDIZED IEC 60617 TRANSISTOR SYMBOL Q1 */}
                          <g transform="translate(250, 190)">
                            {/* Outer Circle (IEC Standard) */}
                            <circle
                              cx="0"
                              cy="0"
                              r="24"
                              fill="#161b22"
                              stroke={isGateFault ? '#f85149' : isConduction ? '#3fb950' : '#8957e5'}
                              strokeWidth="2"
                            />

                            {/* Dynamic Symbol per transistorType */}
                            {transistorType === 'mosfet' && (
                              <g>
                                {/* Insulated Gate Line */}
                                <line x1="-12" y1="-14" x2="-12" y2="14" stroke="#ffffff" strokeWidth="2.5" />
                                
                                {/* 3 Broken Channel Segments */}
                                <line x1="-6" y1="-14" x2="-6" y2="-6" stroke="#ffffff" strokeWidth="2.5" />
                                <line x1="-6" y1="-3" x2="-6" y2="3" stroke="#ffffff" strokeWidth="2.5" />
                                <line x1="-6" y1="6" x2="-6" y2="14" stroke="#ffffff" strokeWidth="2.5" />

                                {/* Drain (Top) Line */}
                                <line x1="-6" y1="-10" x2="8" y2="-10" stroke="#58a6ff" strokeWidth="2" />
                                <line x1="8" y1="-10" x2="8" y2="-24" stroke="#58a6ff" strokeWidth="2" />

                                {/* Source (Bottom) Line */}
                                <line x1="-6" y1="10" x2="8" y2="10" stroke="#3fb950" strokeWidth="2" />
                                <line x1="8" y1="10" x2="8" y2="24" stroke="#3fb950" strokeWidth="2" />

                                {/* Body Middle Line & Inward N-Channel Arrow */}
                                <line x1="-6" y1="0" x2="8" y2="0" stroke="#ffffff" strokeWidth="2" />
                                <line x1="8" y1="0" x2="8" y2="10" stroke="#ffffff" strokeWidth="2" />
                                <polygon points="-6,0 2,-4 2,4" fill="#3fb950" />

                                {/* Gate Pin Line */}
                                <line x1="-24" y1="0" x2="-12" y2="0" stroke="#d2a8ff" strokeWidth="2" />
                              </g>
                            )}

                            {transistorType === 'bjt' && (
                              <g>
                                {/* Base Vertical Bar */}
                                <line x1="-8" y1="-14" x2="-8" y2="14" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />

                                {/* Base Pin Line */}
                                <line x1="-24" y1="0" x2="-8" y2="0" stroke="#d2a8ff" strokeWidth="2" />

                                {/* Collector Line (Top) */}
                                <line x1="-8" y1="-8" x2="10" y2="-18" stroke="#58a6ff" strokeWidth="2" />
                                <line x1="10" y1="-18" x2="10" y2="-24" stroke="#58a6ff" strokeWidth="2" />

                                {/* Emitter Line (Bottom) */}
                                <line x1="-8" y1="8" x2="10" y2="18" stroke="#3fb950" strokeWidth="2" />
                                <line x1="10" y1="18" x2="10" y2="24" stroke="#3fb950" strokeWidth="2" />

                                {/* NPN Outward Emitter Arrow */}
                                <polygon points="10,18 0,11 4,21" fill="#3fb950" />
                              </g>
                            )}

                            {transistorType === 'igbt' && (
                              <g>
                                {/* Insulated Gate Line */}
                                <line x1="-12" y1="-14" x2="-12" y2="14" stroke="#ffffff" strokeWidth="2.5" />
                                {/* Collector/Base Plate Line */}
                                <line x1="-6" y1="-14" x2="-6" y2="14" stroke="#ffffff" strokeWidth="2.5" />

                                {/* Gate Pin Line */}
                                <line x1="-24" y1="0" x2="-12" y2="0" stroke="#d2a8ff" strokeWidth="2" />

                                {/* Collector Line (Top) */}
                                <line x1="-6" y1="-8" x2="10" y2="-18" stroke="#58a6ff" strokeWidth="2" />
                                <line x1="10" y1="-18" x2="10" y2="-24" stroke="#58a6ff" strokeWidth="2" />

                                {/* Emitter Line (Bottom) */}
                                <line x1="-6" y1="8" x2="10" y2="18" stroke="#3fb950" strokeWidth="2" />
                                <line x1="10" y1="18" x2="10" y2="24" stroke="#3fb950" strokeWidth="2" />

                                {/* Outward Arrow on Emitter Line */}
                                <polygon points="10,18 0,11 4,21" fill="#3fb950" />
                              </g>
                            )}

                            {/* Terminal Labels */}
                            <text x="14" y="-18" fill="#58a6ff" fontSize="8" fontFamily="monospace" fontWeight="bold">{term1[0]}</text>
                            <text x="-24" y="-8" fill="#d2a8ff" fontSize="8" fontFamily="monospace" fontWeight="bold">{term2[0]}</text>
                            <text x="14" y="22" fill="#3fb950" fontSize="8" fontFamily="monospace" fontWeight="bold">{term3[0]}</text>

                            {/* Designator Text */}
                            <text x="32" y="3" fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">Q1</text>

                            {/* Status Text */}
                            <text x="0" y="36" textAnchor="middle" fill={isGateFault ? '#f85149' : isConduction ? '#3fb950' : '#8b949e'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                              {isGateFault ? 'OPEN' : isConduction ? `SAT (${vSwitchLabel}=${vSwitch}V)` : `CUTOFF (${vSwitchLabel}=12V)`}
                            </text>
                          </g>

                          {/* 8. VOLTMETER PROBES (VGS/VBE & VDS/VCE) */}
                          {/* Voltmeter Probe V_Drive (Gate-Source / Base-Emitter) */}
                          <g transform="translate(195, 222)">
                            <rect x="-24" y="-8" width="48" height="16" fill="#161b22" stroke="#d2a8ff" strokeWidth="1" rx="3" />
                            <text x="0" y="3" textAnchor="middle" fill="#d2a8ff" fontSize="7" fontFamily="monospace" fontWeight="bold">
                              {vDriveLabel} = {vDrive.toFixed(1)}V
                            </text>
                          </g>

                          {/* Voltmeter Probe V_Switch (Drain-Source / Collector-Emitter) */}
                          <g transform="translate(305, 190)">
                            <rect x="-26" y="-8" width="52" height="16" fill="#161b22" stroke="#e3b341" strokeWidth="1" rx="3" />
                            <text x="0" y="3" textAnchor="middle" fill="#e3b341" fontSize="7" fontFamily="monospace" fontWeight="bold">
                              {vSwitchLabel} = {vSwitch.toFixed(2)}V
                            </text>
                          </g>

                          {/* 9. GROUND / 0V RETURN SYMBOL */}
                          <g transform="translate(250, 245)">
                            <line x1="-14" y1="0" x2="14" y2="0" stroke="#8b949e" strokeWidth="2.5" />
                            <line x1="-9" y1="4" x2="9" y2="4" stroke="#8b949e" strokeWidth="2" />
                            <line x1="-4" y1="8" x2="4" y2="8" stroke="#8b949e" strokeWidth="1.5" />
                            <text x="0" y="18" textAnchor="middle" fill="#8b949e" fontSize="7" fontFamily="monospace">0V / GND</text>
                          </g>

                          {/* 10. ANIMATED CURRENT FLOW DOTS WHEN ON */}
                          {isConduction && (
                            <g>
                              {/* Loop: +12V Rail -> Load -> Ammeter -> Q1 -> Ground -> Source */}
                              {[0, 0.2, 0.4, 0.6, 0.8].map((offset, i) => {
                                const p = (time * 1.2 + offset) % 1;
                                let cx = 50;
                                let cy = 60;
                                if (p < 0.3) {
                                  cx = 50 + (p / 0.3) * 290;
                                  cy = 60;
                                } else if (p < 0.5) {
                                  const p2 = (p - 0.3) / 0.2;
                                  if (p2 < 0.6) {
                                    cx = 340;
                                    cy = 60 + (p2 / 0.6) * 90;
                                  } else {
                                    cx = 340 - ((p2 - 0.6) / 0.4) * 90;
                                    cy = 150;
                                  }
                                } else if (p < 0.8) {
                                  const p3 = (p - 0.5) / 0.3;
                                  cx = 250;
                                  cy = 150 + p3 * 90;
                                } else {
                                  const p4 = (p - 0.8) / 0.2;
                                  if (p4 < 0.7) {
                                    cx = 250 - (p4 / 0.7) * 200;
                                    cy = 240;
                                  } else {
                                    cx = 50;
                                    cy = 240 - ((p4 - 0.7) / 0.3) * 110;
                                  }
                                }
                                return <circle key={i} cx={cx} cy={cy} r="3" fill="#3fb950" />;
                              })}

                              {/* Current direction indicator arrows */}
                              <g fill="#3fb950" opacity="0.8">
                                <polygon points="180,60 174,56 174,64" />
                                <polygon points="340,138 336,132 344,132" />
                                <polygon points="250,228 246,222 254,222" />
                              </g>
                            </g>
                          )}

                          {/* 11. EDUCATIONAL ANNOTATION BADGES */}
                          <g opacity="0.85">
                            <text x="50" y="158" textAnchor="middle" fill="#58a6ff" fontSize="7" fontFamily="monospace">① DC Source</text>
                            <text x="90" y="215" textAnchor="middle" fill="#58a6ff" fontSize="7" fontFamily="monospace">② Drive Unit</text>
                            <text x="250" y="263" textAnchor="middle" fill="#3fb950" fontSize="7" fontFamily="monospace">③ Switch Q1</text>
                            <text x="340" y="48" textAnchor="middle" fill="#fbbf24" fontSize="7" fontFamily="monospace">④ Load RL</text>
                            <text x="420" y="48" textAnchor="middle" fill="#e3b341" fontSize="7" fontFamily="monospace">⑤ FWD D1</text>
                          </g>
                        </g>
                      );
                    })()}
                  </g>
                )}
            </g>
          )}

              {activeTopic === 'scr' && (() => {
                const isTriggered = scrGatePulse || scrGateCurrent >= 35;
                const isConducting = scrFault === 'scr_short' || scrFault === 'dv_dt' || (scrFault !== 'gate_open' && scrLatched);
                const anodeCurrent = isConducting ? Math.max(0, (scrAnodeVin * 1.414 - 1.4) / Math.max(1, scrLoadRes)) : 0;
                const vakVal = isConducting ? 1.40 : (scrAnodeVin * 1.414);
                const holdingCurrent = 0.040; // 40mA

                let activeStateIndex = 0; // 0: Forward Blocking, 1: Gate Triggered, 2: Forward Conduction, 3: Current < IH, 4: OFF
                let activeStateTitle = "FORWARD BLOCKING";
                let activeStateDesc = "SCR is forward biased (VAK > 0), but gate trigger has not initiated conduction (IG < Igt).";

                if (scrFault === 'gate_open') {
                  activeStateIndex = 4;
                  activeStateTitle = "OFF (GATE OPEN FAULT)";
                  activeStateDesc = "Gate control line is open-circuited. Trigger pulses cannot reach the SCR gate terminal.";
                } else if (isConducting && anodeCurrent >= holdingCurrent) {
                  activeStateIndex = 2;
                  activeStateTitle = "FORWARD CONDUCTION";
                  activeStateDesc = "SCR has latched ON (IA > IL) and anode current IA remains above holding current IH (40mA).";
                } else if (isConducting && anodeCurrent < holdingCurrent) {
                  activeStateIndex = 3;
                  activeStateTitle = "CURRENT BELOW HOLDING CURRENT";
                  activeStateDesc = "Anode current IA has fallen below holding current IH (40mA), causing SCR to cease conduction.";
                } else if (!isConducting && isTriggered) {
                  activeStateIndex = 1;
                  activeStateTitle = "GATE TRIGGERED";
                  activeStateDesc = "Gate current IG >= 35mA has reached trigger threshold, initiating PNPN carrier injection.";
                } else {
                  activeStateIndex = 0;
                  activeStateTitle = "FORWARD BLOCKING";
                  activeStateDesc = "SCR is forward biased (VAK > 0), but gate trigger has not initiated conduction (IG < Igt).";
                }

                return (
                  <g>
                    {/* Header Banner */}
                    <text x="250" y="20" textAnchor="middle" fill="#e3b341" fontSize="11" fontFamily="monospace" fontWeight="bold">
                      EDUCATIONAL SCR THYRISTOR CIRCUIT (IEC-Style Schematic)
                    </text>

                    {/* 1. SCR OPERATING-STATE FLOW INDICATOR BAR */}
                    <g transform="translate(20, 28)">
                      <rect x="0" y="0" width="460" height="28" fill="#161b22" stroke="#30363d" strokeWidth="1" rx="5" />
                      
                      {/* State 0: FORWARD BLOCKING */}
                      <rect x="3" y="3" width="88" height="14" fill={activeStateIndex === 0 ? '#d97706' : '#0d1117'} rx="3" />
                      <text x="47" y="13" textAnchor="middle" fill={activeStateIndex === 0 ? '#ffffff' : '#8b949e'} fontSize="6.5" fontFamily="monospace" fontWeight="bold">1. FWD BLOCKING</text>

                      {/* State 1: GATE TRIGGERED */}
                      <rect x="94" y="3" width="88" height="14" fill={activeStateIndex === 1 ? '#2563eb' : '#0d1117'} rx="3" />
                      <text x="138" y="13" textAnchor="middle" fill={activeStateIndex === 1 ? '#ffffff' : '#8b949e'} fontSize="6.5" fontFamily="monospace" fontWeight="bold">2. TRIGGERED</text>

                      {/* State 2: FORWARD CONDUCTION */}
                      <rect x="185" y="3" width="88" height="14" fill={activeStateIndex === 2 ? '#238636' : '#0d1117'} rx="3" />
                      <text x="229" y="13" textAnchor="middle" fill={activeStateIndex === 2 ? '#ffffff' : '#8b949e'} fontSize="6.5" fontFamily="monospace" fontWeight="bold">3. CONDUCTION</text>

                      {/* State 3: CURRENT < IH */}
                      <rect x="276" y="3" width="88" height="14" fill={activeStateIndex === 3 ? '#da3633' : '#0d1117'} rx="3" />
                      <text x="320" y="13" textAnchor="middle" fill={activeStateIndex === 3 ? '#ffffff' : '#8b949e'} fontSize="6.5" fontFamily="monospace" fontWeight="bold">4. IA &lt; IH (TURN-OFF)</text>

                      {/* State 4: OFF */}
                      <rect x="367" y="3" width="88" height="14" fill={activeStateIndex === 4 ? '#6e7681' : '#0d1117'} rx="3" />
                      <text x="411" y="13" textAnchor="middle" fill={activeStateIndex === 4 ? '#ffffff' : '#8b949e'} fontSize="6.5" fontFamily="monospace" fontWeight="bold">5. OFF</text>

                      {/* Active State Description */}
                      <text x="230" y="24" textAnchor="middle" fill="#d2a8ff" fontSize="7" fontFamily="monospace">
                        State: {activeStateTitle} — {activeStateDesc}
                      </text>
                    </g>

                    {/* SCR Symbol (Anode at X=210, Cathode at X=250) */}
                    <g transform="translate(230, 135)">
                      <polygon points="-20,-20 -20,20 20,0" fill={isConducting ? '#238636' : '#161b22'} stroke={isConducting ? '#3fb950' : '#e3b341'} strokeWidth="3" />
                      <line x1="20" y1="-20" x2="20" y2="20" stroke={isConducting ? '#3fb950' : '#e3b341'} strokeWidth="3" />
                      {/* Gate Pin */}
                      <line x1="-5" y1="12" x2="-25" y2="30" stroke={scrGatePulse ? '#f85149' : '#e3b341'} strokeWidth="3" />
                      <text x="-35" y="42" fill="#f85149" fontSize="10" fontFamily="monospace" fontWeight="bold">Gate (Ig)</text>
                      <text x="0" y="-28" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="monospace">SCR 25A</text>
                    </g>

                    {/* Power Source Circle at (80, 135) */}
                    <circle cx="80" cy="135" r="20" fill="#161b22" stroke="#58a6ff" strokeWidth="2.5" />
                    <text x="80" y="139" textAnchor="middle" fill="#58a6ff" fontSize="10" fontFamily="monospace" fontWeight="bold">{scrAnodeVin}V</text>
                    <text x="80" y="110" textAnchor="middle" fill="#8b949e" fontSize="8" fontFamily="monospace">AC Source</text>

                    {/* Forward Conductors */}
                    <path d="M 100 135 L 210 135" stroke={isConducting ? '#3fb950' : '#58a6ff'} strokeWidth="3" fill="none" />
                    <path d="M 250 135 L 370 135 L 370 190" stroke={isConducting ? '#3fb950' : '#484f58'} strokeWidth="3" fill="none" />

                    {/* Junction Nodes */}
                    <circle cx="100" cy="135" r="3.5" fill="#58a6ff" />
                    <circle cx="210" cy="135" r="3.5" fill={isConducting ? '#3fb950' : '#58a6ff'} />
                    <circle cx="250" cy="135" r="3.5" fill={isConducting ? '#3fb950' : '#484f58'} />
                    <circle cx="370" cy="135" r="3.5" fill={isConducting ? '#3fb950' : '#484f58'} />

                    {/* Load Resistor Rl (355, 190 to 385, 250) */}
                    <rect x="355" y="190" width="30" height="55" fill="#161b22" stroke={isConducting ? '#3fb950' : '#e3b341'} strokeWidth="2.5" rx="4" />
                    <text x="370" y="222" textAnchor="middle" fill={isConducting ? '#3fb950' : '#e3b341'} fontSize="10" fontFamily="monospace" fontWeight="bold">Rl={scrLoadRes}Ω</text>

                    {/* Return Loop Conductor */}
                    <path d="M 370 245 L 370 270 L 80 270 L 80 155" stroke={isConducting ? '#3fb950' : '#484f58'} strokeWidth="3" fill="none" />
                    <circle cx="370" cy="245" r="3.5" fill={isConducting ? '#3fb950' : '#484f58'} />
                    <circle cx="370" cy="270" r="3.5" fill={isConducting ? '#3fb950' : '#484f58'} />
                    <circle cx="80" cy="270" r="3.5" fill={isConducting ? '#3fb950' : '#484f58'} />
                    <circle cx="80" cy="155" r="3.5" fill={isConducting ? '#3fb950' : '#484f58'} />

                    {/* 2. ELECTRICAL MEASUREMENT MARKERS */}
                    {/* VAK Probe */}
                    <g transform="translate(230, 80)">
                      <rect x="-35" y="-8" width="70" height="15" fill="#161b22" stroke="#e3b341" strokeWidth="1" rx="3" />
                      <text x="0" y="3" textAnchor="middle" fill="#e3b341" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                        VAK = {vakVal.toFixed(1)}V
                      </text>
                    </g>

                    {/* IA Probe */}
                    <g transform="translate(155, 120)">
                      <rect x="-30" y="-8" width="60" height="15" fill="#161b22" stroke="#3fb950" strokeWidth="1" rx="3" />
                      <text x="0" y="3" textAnchor="middle" fill="#3fb950" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                        IA = {anodeCurrent.toFixed(2)}A
                      </text>
                    </g>

                    {/* IG Probe */}
                    <g transform="translate(195, 175)">
                      <rect x="-28" y="-8" width="56" height="15" fill="#161b22" stroke="#f85149" strokeWidth="1" rx="3" />
                      <text x="0" y="3" textAnchor="middle" fill="#f85149" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                        IG = {scrGateCurrent}mA
                      </text>
                    </g>

                    {/* IL Probe */}
                    <g transform="translate(415, 220)">
                      <rect x="-28" y="-8" width="56" height="15" fill="#161b22" stroke="#58a6ff" strokeWidth="1" rx="3" />
                      <text x="0" y="3" textAnchor="middle" fill="#58a6ff" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                        IL = {anodeCurrent.toFixed(2)}A
                      </text>
                    </g>

                    {/* VTM Probe */}
                    <g transform="translate(285, 155)">
                      <rect x="-28" y="-8" width="56" height="15" fill="#161b22" stroke="#d2a8ff" strokeWidth="1" rx="3" />
                      <text x="0" y="3" textAnchor="middle" fill="#d2a8ff" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                        VTM = 1.40V
                      </text>
                    </g>

                    {/* Animated Current Dots */}
                    {isConducting && (
                      <g>
                        <circle cx={(100 + (time * 70) % 110)} cy="135" r="3.5" fill="#3fb950" />
                        <circle cx="370" cy={(135 + (time * 60) % 55)} r="3.5" fill="#3fb950" />
                        <circle cx={(370 - (time * 70) % 290)} cy="270" r="3.5" fill="#3fb950" />
                      </g>
                    )}
                  </g>
                );
              })()}

              {activeTopic === 'controlled' && (
                <g>
                  <text x="250" y="25" textAnchor="middle" fill="#3fb950" fontSize="13" fontFamily="monospace" fontWeight="bold">
                    3-PHASE 6-PULSE SCR BRIDGE RECTIFIER & VECTOR PHASOR
                  </text>

                  {/* Active Firing SCR Leg Calculation */}
                  {(() => {
                    const seqIndex = Math.floor((time * 2) % 6);
                    const seqPairs = [
                      { pair: 'T1 - T6', vline: 'Vab (Van - Vbn)', top: 0, bot: 2 },
                      { pair: 'T1 - T2', vline: 'Vac (Van - Vcn)', top: 0, bot: 0 },
                      { pair: 'T3 - T2', vline: 'Vbc (Vbn - Vcn)', top: 1, bot: 0 },
                      { pair: 'T3 - T4', vline: 'Vba (Vbn - Van)', top: 1, bot: 1 },
                      { pair: 'T5 - T4', vline: 'Vca (Vcn - Van)', top: 2, bot: 1 },
                      { pair: 'T5 - T6', vline: 'Vcb (Vcn - Vbn)', top: 2, bot: 2 },
                    ];
                    const activeSeq = seqPairs[seqIndex];

                    return (
                      <g>
                        {/* ABC 3-Phase Vector Phasor Diagram (Left) */}
                        <g transform="translate(60, 140)">
                          <circle cx="0" cy="0" r="32" fill="#161b22" stroke="#30363d" strokeWidth="1.5" />
                          <circle cx="0" cy="0" r="2" fill="#ffffff" />
                          
                          {/* Phase A (Red, 0 deg = UP) */}
                          <line x1="0" y1="0" x2="0" y2="-28" stroke="#f85149" strokeWidth="2.5" />
                          <text x="0" y="-32" textAnchor="middle" fill="#f85149" fontSize="9" fontFamily="monospace" fontWeight="bold">Va</text>

                          {/* Phase B (Blue, -120 deg = DOWN LEFT) */}
                          <line x1="0" y1="0" x2="-24" y2="14" stroke="#58a6ff" strokeWidth="2.5" />
                          <text x="-28" y="22" textAnchor="middle" fill="#58a6ff" fontSize="9" fontFamily="monospace" fontWeight="bold">Vb</text>

                          {/* Phase C (Yellow, +120 deg = DOWN RIGHT) */}
                          <line x1="0" y1="0" x2="24" y2="14" stroke="#e3b341" strokeWidth="2.5" />
                          <text x="28" y="22" textAnchor="middle" fill="#e3b341" fontSize="9" fontFamily="monospace" fontWeight="bold">Vc</text>

                          {/* Rotating Conduction Vector */}
                          <line
                            x1="0"
                            y1="0"
                            x2={28 * Math.cos((time * 2) - Math.PI / 2)}
                            y2={28 * Math.sin((time * 2) - Math.PI / 2)}
                            stroke="#3fb950"
                            strokeWidth="3"
                          />
                          <text x="0" y="44" textAnchor="middle" fill="#3fb950" fontSize="9" fontFamily="monospace" fontWeight="bold">ABC PHASOR</text>
                        </g>

                        {/* 3-Phase AC Input Wires (Va=Red, Vb=Blue, Vc=Yellow) to SCR Legs */}
                        <path d="M 100 82.5 L 200 82.5" stroke="#f85149" strokeWidth="2.5" fill="none" />
                        <path d="M 100 105 L 285 105" stroke="#58a6ff" strokeWidth="2.5" fill="none" />
                        <path d="M 100 127.5 L 370 127.5" stroke="#e3b341" strokeWidth="2.5" fill="none" />
                        <circle cx="200" cy="82.5" r="3.5" fill="#f85149" />
                        <circle cx="285" cy="105" r="3.5" fill="#58a6ff" />
                        <circle cx="370" cy="127.5" r="3.5" fill="#e3b341" />

                        {/* Top DC+ Bus Rail (Y=50, X=170 to X=430) */}
                        <line x1="170" y1="50" x2="430" y2="50" stroke="#3fb950" strokeWidth="2.5" />
                        <circle cx="200" cy="50" r="3.5" fill="#3fb950" />
                        <circle cx="285" cy="50" r="3.5" fill="#3fb950" />
                        <circle cx="370" cy="50" r="3.5" fill="#3fb950" />

                        {/* Bottom DC- Bus Rail (Y=200, X=170 to X=430) */}
                        <line x1="170" y1="200" x2="430" y2="200" stroke="#3fb950" strokeWidth="2.5" />
                        <circle cx="200" cy="200" r="3.5" fill="#3fb950" />
                        <circle cx="285" cy="200" r="3.5" fill="#3fb950" />
                        <circle cx="370" cy="200" r="3.5" fill="#3fb950" />

                        {/* 6 SCRs Grid (Center) */}
                        <g transform="translate(170, 60)">
                          {[0, 1, 2].map((col) => {
                            const isTopActive = activeSeq.top === col;
                            const isBotActive = activeSeq.bot === col;
                            return (
                              <g key={col} transform={`translate(${col * 85}, 0)`}>
                                {/* Top SCR vertical connection to Top DC+ Rail */}
                                <line x1="30" y1="-10" x2="30" y2="0" stroke={isTopActive ? '#3fb950' : '#30363d'} strokeWidth="2" />
                                {/* Top SCR */}
                                <rect
                                  x="0"
                                  y="0"
                                  width="60"
                                  height="45"
                                  fill={isTopActive ? '#238636' : '#161b22'}
                                  stroke={isTopActive ? '#3fb950' : '#30363d'}
                                  strokeWidth={isTopActive ? '3' : '1.5'}
                                  rx="5"
                                />
                                <text x="30" y="26" textAnchor="middle" fill={isTopActive ? '#ffffff' : '#8b949e'} fontSize="11" fontFamily="monospace" fontWeight="bold">
                                  T{col + 1}
                                </text>

                                {/* Bottom SCR */}
                                <rect
                                  x="0"
                                  y="90"
                                  width="60"
                                  height="45"
                                  fill={isBotActive ? '#238636' : '#161b22'}
                                  stroke={isBotActive ? '#3fb950' : '#30363d'}
                                  strokeWidth={isBotActive ? '3' : '1.5'}
                                  rx="5"
                                />
                                <text x="30" y="116" textAnchor="middle" fill={isBotActive ? '#ffffff' : '#8b949e'} fontSize="11" fontFamily="monospace" fontWeight="bold">
                                  T{col + 4}
                                </text>
                                {/* Bottom SCR vertical connection to Bottom DC- Rail */}
                                <line x1="30" y1="135" x2="30" y2="140" stroke={isBotActive ? '#3fb950' : '#30363d'} strokeWidth="2" />
                              </g>
                            );
                          })}
                        </g>

                        {/* Dynamic Active Leg & Conduction Vector Badge */}
                        <g transform="translate(140, 220)">
                          <rect x="0" y="0" width="280" height="42" fill="#0d1117" stroke="#3fb950" strokeWidth="1.5" rx="6" />
                          <text x="140" y="18" textAnchor="middle" fill="#3fb950" fontSize="11" fontFamily="monospace" fontWeight="bold">
                            Active Pair: {activeSeq.pair} ({activeSeq.vline})
                          </text>
                          <text x="140" y="32" textAnchor="middle" fill="#8b949e" fontSize="9" fontFamily="monospace">
                            Firing Angle α = {firingAngle}° ({((firingAngle / 180) * 10).toFixed(2)} ms delay)
                          </text>
                        </g>

                        {/* Animated Current Flow Dots */}
                        <circle cx={(170 + (time * 80) % 260)} cy="50" r="4" fill="#3fb950" />
                        <circle cx={(430 - (time * 80) % 260)} cy="200" r="4" fill="#3fb950" />
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* TOPIC 6: PULSE WIDTH MODULATION (PWM) INVERTER SCHEMATIC */}
              {activeTopic === 'pwm' && (() => {
                const vDcTotal = busVoltage;
                const vDcHalf = vDcTotal / 2; // Split DC Bus (+200V / -200V)
                const v1Rms = (pwmMa * vDcHalf) / Math.SQRT2; // Half-bridge V1(rms) = 120.2V for Ma=0.85, Vdc=400V
                const loadR = Math.max(1, rectifierLoad || 20);
                const i1Rms = v1Rms / loadR;
                const pOut = (v1Rms * v1Rms) / loadR;

                const omega1 = 2 * Math.PI * pwmF1;
                const instantRef = Math.sin(omega1 * time) * pwmMa;
                const carrierPeriod = 1 / Math.max(10, pwmFc);
                const tMod = time % carrierPeriod;
                const carrierNorm = tMod / carrierPeriod;
                const instantCarrier = carrierNorm < 0.5 ? (4 * carrierNorm - 1) : (3 - 4 * carrierNorm);

                const deadTimeSec = (pwmDeadTime || 0) * 1e-6;
                const isDeadTimeActive = (tMod < deadTimeSec * pwmFc * carrierPeriod) || ((carrierPeriod - tMod) < deadTimeSec * pwmFc * carrierPeriod);
                const isShootThroughRisk = pwmDeadTime === 0;

                const q1On = !isDeadTimeActive && (instantRef >= instantCarrier);
                const q2On = !isDeadTimeActive && !q1On;
                const d1Conduction = isDeadTimeActive && (instantRef > 0);
                const d2Conduction = isDeadTimeActive && (instantRef < 0);

                const vSwInstant = q1On ? vDcHalf : q2On ? -vDcHalf : 0;
                const pDot = (time * 1.5) % 1;

                return (
                  <g>
                    {/* 1. TITLE & METADATA HEADER */}
                    <text x="250" y="18" textAnchor="middle" fill="#f472b6" fontSize="12" fontFamily="monospace" fontWeight="bold">
                      IEC 60617-Style Half-Bridge SPWM Inverter ({pwmModulationType.toUpperCase()})
                    </text>
                    <text x="250" y="32" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      V1(rms) = {v1Rms.toFixed(1)}V | Ma = {pwmMa.toFixed(2)} ({pwmMa > 1.0 ? 'Overmod' : 'Linear'}) | fc = {pwmFc}Hz (Mf={(pwmFc/pwmF1).toFixed(0)}) | f1 = {pwmF1}Hz | t_dead = {pwmDeadTime.toFixed(1)}µs
                    </text>

                    {/* 2. DC BUS RAILS & CONTINUOUS NEUTRAL BUS N */}
                    {/* +VDC Top Bus Rail (X=30 to X=284) */}
                    <line x1="30" y1="50" x2="284" y2="50" stroke="#ef4444" strokeWidth="2.5" />
                    <text x="32" y="42" fill="#ef4444" fontSize="9" fontFamily="monospace" fontWeight="bold">+VDC (+{vDcHalf.toFixed(0)}V)</text>
                    <circle cx="80" cy="50" r="3.5" fill="#ef4444" />
                    <circle cx="242" cy="50" r="3.5" fill="#ef4444" />
                    <circle cx="284" cy="50" r="3.5" fill="#ef4444" />

                    {/* -VDC Bottom Bus Rail (X=30 to X=284) */}
                    <line x1="30" y1="250" x2="284" y2="250" stroke="#38bdf8" strokeWidth="2.5" />
                    <text x="32" y="262" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">-VDC (-{vDcHalf.toFixed(0)}V)</text>
                    <circle cx="80" cy="250" r="3.5" fill="#38bdf8" />
                    <circle cx="242" cy="250" r="3.5" fill="#38bdf8" />
                    <circle cx="284" cy="250" r="3.5" fill="#38bdf8" />

                    {/* N / DC MIDPOINT Neutral Bus Rail (UNBROKEN X=30 to X=460) */}
                    <line x1="30" y1="150" x2="460" y2="150" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 3" />
                    <text x="32" y="144" fill="#06b6d4" fontSize="9" fontFamily="monospace" fontWeight="bold">N / DC MIDPOINT (0.0V NEUTRAL RETURN)</text>
                    <circle cx="80" cy="150" r="3.5" fill="#06b6d4" />
                    <circle cx="395" cy="150" r="3.5" fill="#06b6d4" />
                    <circle cx="445" cy="150" r="3.5" fill="#06b6d4" />

                    {/* 3. DC LINK CAPACITORS C1 & C2 */}
                    <line x1="80" y1="50" x2="80" y2="92" stroke="#ef4444" strokeWidth="2" />
                    <line x1="68" y1="92" x2="92" y2="92" stroke="#38bdf8" strokeWidth="3" />
                    <line x1="68" y1="100" x2="92" y2="100" stroke="#38bdf8" strokeWidth="3" />
                    <line x1="80" y1="100" x2="80" y2="150" stroke="#06b6d4" strokeWidth="2" />
                    <text x="40" y="94" textAnchor="end" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">C1 1000µF</text>
                    <text x="40" y="104" textAnchor="end" fill="#94a3b8" fontSize="8" fontFamily="monospace">Vc1={vDcHalf.toFixed(0)}V</text>

                    <line x1="80" y1="150" x2="80" y2="198" stroke="#06b6d4" strokeWidth="2" />
                    <line x1="68" y1="198" x2="92" y2="198" stroke="#38bdf8" strokeWidth="3" />
                    <line x1="68" y1="206" x2="92" y2="206" stroke="#38bdf8" strokeWidth="3" />
                    <line x1="80" y1="206" x2="80" y2="250" stroke="#38bdf8" strokeWidth="2" />
                    <text x="40" y="200" textAnchor="end" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold">C2 1000µF</text>
                    <text x="40" y="210" textAnchor="end" fill="#94a3b8" fontSize="8" fontFamily="monospace">Vc2={vDcHalf.toFixed(0)}V</text>

                    {/* 4. SPWM GATE DRIVER BLOCK (Placed below Neutral rail at Y=175 to avoid breaking N line) */}
                    <g transform="translate(110, 175)">
                      <rect x="0" y="0" width="80" height="48" fill="#161b22" stroke={isDeadTimeActive ? '#f59e0b' : '#f472b6'} strokeWidth="2" rx="6" />
                      <text x="40" y="14" textAnchor="middle" fill="#f472b6" fontSize="9" fontFamily="monospace" fontWeight="bold">SPWM DRIVER</text>
                      
                      <text x="40" y="27" textAnchor="middle" fill={q1On ? '#22c55e' : '#94a3b8'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                        G1: {q1On ? 'HIGH (1)' : 'LOW (0)'}
                      </text>
                      <text x="40" y="37" textAnchor="middle" fill={q2On ? '#22c55e' : '#94a3b8'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                        G2: {q2On ? 'HIGH (1)' : 'LOW (0)'}
                      </text>

                      {isDeadTimeActive && (
                        <text x="40" y="45" textAnchor="middle" fill="#f59e0b" fontSize="7" fontFamily="monospace" fontWeight="bold">
                          t_dead GAP
                        </text>
                      )}
                      {isShootThroughRisk && (
                        <text x="40" y="45" textAnchor="middle" fill="#ef4444" fontSize="7" fontFamily="monospace" fontWeight="bold">
                          ⚠️ 0µs RISK!
                        </text>
                      )}
                    </g>

                    {/* Gate Control Drive Lines to Q1 & Q2 */}
                    <path d="M 190 185 L 210 185 L 210 80 L 220 80" fill="none" stroke={q1On ? '#22c55e' : '#64748b'} strokeWidth="1.5" strokeDasharray="3 2" />
                    <path d="M 190 205 L 210 205 L 210 220 L 220 220" fill="none" stroke={q2On ? '#22c55e' : '#64748b'} strokeWidth="1.5" strokeDasharray="3 2" />
                    <text x="202" y="76" fill={q1On ? '#22c55e' : '#64748b'} fontSize="8" fontFamily="monospace" fontWeight="bold">G1</text>
                    <text x="202" y="228" fill={q2On ? '#22c55e' : '#64748b'} fontSize="8" fontFamily="monospace" fontWeight="bold">G2</text>

                    {/* 5. HALF-BRIDGE SWITCHING LEG (Q1, D1, Q2, D2) */}
                    {/* Q1 High-Side Transistor */}
                    <line x1="242" y1="50" x2="242" y2="55" stroke={q1On ? '#22c55e' : '#ef4444'} strokeWidth="2.5" />
                    <g transform="translate(220, 55)">
                      <rect x="0" y="0" width="45" height="50" fill={q1On ? '#15803d' : '#161b22'} stroke={q1On ? '#22c55e' : '#475569'} strokeWidth="2" rx="5" />
                      <text x="22" y="24" textAnchor="middle" fill={q1On ? '#ffffff' : '#e2e8f0'} fontSize="11" fontFamily="monospace" fontWeight="bold">Q1</text>
                      <text x="22" y="38" textAnchor="middle" fill={q1On ? '#4ade80' : '#64748b'} fontSize="7" fontFamily="monospace" fontWeight="bold">HIGH-SIDE</text>
                    </g>
                    <line x1="242" y1="105" x2="242" y2="150" stroke={q1On ? '#22c55e' : '#475569'} strokeWidth="2.5" />

                    {/* D1 High-Side Freewheeling Diode */}
                    <line x1="284" y1="50" x2="284" y2="55" stroke={d1Conduction ? '#f59e0b' : '#ef4444'} strokeWidth="2" />
                    <g transform="translate(272, 55)">
                      <line x1="12" y1="0" x2="12" y2="50" stroke={d1Conduction ? '#f59e0b' : '#475569'} strokeWidth="2" />
                      <polygon points="4,32 20,32 12,18" fill={d1Conduction ? '#b45309' : '#161b22'} stroke={d1Conduction ? '#f59e0b' : '#64748b'} strokeWidth="1.5" />
                      <line x1="4" y1="18" x2="20" y2="18" stroke={d1Conduction ? '#f59e0b' : '#64748b'} strokeWidth="2" />
                      <text x="24" y="28" fill={d1Conduction ? '#f59e0b' : '#64748b'} fontSize="8" fontFamily="monospace" fontWeight="bold">D1</text>
                    </g>
                    <line x1="284" y1="105" x2="284" y2="150" stroke={d1Conduction ? '#f59e0b' : '#475569'} strokeWidth="2" />

                    {/* Q2 Low-Side Transistor */}
                    <line x1="242" y1="150" x2="242" y2="195" stroke={q2On ? '#22c55e' : '#475569'} strokeWidth="2.5" />
                    <g transform="translate(220, 195)">
                      <rect x="0" y="0" width="45" height="50" fill={q2On ? '#15803d' : '#161b22'} stroke={q2On ? '#22c55e' : '#475569'} strokeWidth="2" rx="5" />
                      <text x="22" y="24" textAnchor="middle" fill={q2On ? '#ffffff' : '#e2e8f0'} fontSize="11" fontFamily="monospace" fontWeight="bold">Q2</text>
                      <text x="22" y="38" textAnchor="middle" fill={q2On ? '#4ade80' : '#64748b'} fontSize="7" fontFamily="monospace" fontWeight="bold">LOW-SIDE</text>
                    </g>
                    <line x1="242" y1="245" x2="242" y2="250" stroke={q2On ? '#22c55e' : '#38bdf8'} strokeWidth="2.5" />

                    {/* D2 Low-Side Freewheeling Diode */}
                    <line x1="284" y1="150" x2="284" y2="195" stroke={d2Conduction ? '#f59e0b' : '#475569'} strokeWidth="2" />
                    <g transform="translate(272, 195)">
                      <line x1="12" y1="0" x2="12" y2="50" stroke={d2Conduction ? '#f59e0b' : '#475569'} strokeWidth="2" />
                      <polygon points="4,32 20,32 12,18" fill={d2Conduction ? '#b45309' : '#161b22'} stroke={d2Conduction ? '#f59e0b' : '#64748b'} strokeWidth="1.5" />
                      <line x1="4" y1="18" x2="20" y2="18" stroke={d2Conduction ? '#f59e0b' : '#64748b'} strokeWidth="2" />
                      <text x="24" y="28" fill={d2Conduction ? '#f59e0b' : '#64748b'} fontSize="8" fontFamily="monospace" fontWeight="bold">D2</text>
                    </g>
                    <line x1="284" y1="245" x2="284" y2="250" stroke={d2Conduction ? '#f59e0b' : '#38bdf8'} strokeWidth="2" />

                    {/* 6. SWITCHING NODE VSW & AC OUTPUT BUS */}
                    {/* Horizontal connection between Q1/Q2 leg and D1/D2 leg at Y=150 */}
                    <line x1="242" y1="150" x2="284" y2="150" stroke="#22c55e" strokeWidth="2.5" />
                    <circle cx="242" cy="150" r="3.5" fill="#0d1117" stroke="#22c55e" strokeWidth="2" />
                    <circle cx="284" cy="150" r="3.5" fill="#0d1117" stroke="#22c55e" strokeWidth="2" />
                    
                    <g transform="translate(242, 150)">
                      <rect x="-42" y="-22" width="84" height="15" fill="#0d1117" stroke="#22c55e" strokeWidth="1" rx="3" />
                      <text x="0" y="-11" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="monospace" fontWeight="bold">VSW NODE</text>
                      <rect x="-42" y="7" width="84" height="15" fill="#0d1117" stroke="#38bdf8" strokeWidth="1" rx="3" />
                      <text x="0" y="18" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                        {vSwInstant > 0 ? `+${vSwInstant.toFixed(0)}V` : vSwInstant < 0 ? `${vSwInstant.toFixed(0)}V` : '0V (t_dead)'}
                      </text>
                    </g>

                    {/* 7. OUTPUT LC FILTER (Lf, Cf) & AC LOAD */}
                    {/* Unbroken VSW Line to Filter Inductor Lf */}
                    <line x1="284" y1="150" x2="310" y2="150" stroke="#22c55e" strokeWidth="2.5" />

                    {/* Inductor Lf Coils along Y=150 line */}
                    <g transform="translate(310, 150)">
                      <path d="M 0 0 Q 8 -14 16 0 Q 24 -14 32 0 Q 40 -14 48 0" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                      <text x="24" y="-16" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">Lf = 1.2 mH</text>
                      <text x="24" y="-6" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">IL={i1Rms.toFixed(1)}A</text>
                    </g>

                    {/* Unbroken VOUT Line from Lf to Cf & AC Load */}
                    <line x1="358" y1="150" x2="445" y2="150" stroke="#22c55e" strokeWidth="2.5" />
                    <circle cx="395" cy="150" r="3.5" fill="#0d1117" stroke="#22c55e" strokeWidth="2" />
                    <text x="375" y="140" textAnchor="middle" fill="#22c55e" fontSize="8" fontFamily="monospace" fontWeight="bold">VOUT LINE</text>

                    {/* Filter Capacitor Cf (Connected between VOUT Line Y=150 and Neutral Y=150) */}
                    <g transform="translate(395, 90)">
                      <line x1="0" y1="0" x2="0" y2="20" stroke="#06b6d4" strokeWidth="2" />
                      <line x1="-12" y1="20" x2="12" y2="20" stroke="#38bdf8" strokeWidth="3" />
                      <line x1="-12" y1="28" x2="12" y2="28" stroke="#38bdf8" strokeWidth="3" />
                      <line x1="0" y1="28" x2="0" y2="60" stroke="#22c55e" strokeWidth="2" />
                      <text x="16" y="22" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">Cf = 10 µF</text>
                      <text x="16" y="32" fill="#94a3b8" fontSize="7" fontFamily="monospace">VC={v1Rms.toFixed(1)}V</text>
                    </g>

                    {/* AC Load Circle */}
                    <g transform="translate(445, 90)">
                      <line x1="0" y1="0" x2="0" y2="12" stroke="#06b6d4" strokeWidth="2.5" />
                      <circle cx="0" cy="30" r="18" fill="#161b22" stroke="#eab308" strokeWidth="2" />
                      <path d="M -9 30 Q -4.5 22 0 30 T 9 30" fill="none" stroke="#eab308" strokeWidth="2" />
                      <text x="24" y="28" fill="#eab308" fontSize="8" fontFamily="monospace" fontWeight="bold">AC LOAD</text>
                      <line x1="0" y1="48" x2="0" y2="60" stroke="#22c55e" strokeWidth="2.5" />
                      
                      <g transform="translate(0, 85)">
                        <rect x="-42" y="-12" width="84" height="26" fill="#0d1117" stroke="#eab308" strokeWidth="1" rx="4" />
                        <text x="0" y="-2" textAnchor="middle" fill="#eab308" fontSize="8" fontFamily="monospace" fontWeight="bold">V1(rms) = {v1Rms.toFixed(1)}V</text>
                        <text x="0" y="9" textAnchor="middle" fill="#4ade80" fontSize="7" fontFamily="monospace">IOUT = {i1Rms.toFixed(1)}A | {pOut.toFixed(0)}W</text>
                      </g>
                    </g>
                    <circle cx="445" cy="150" r="3.5" fill="#0d1117" stroke="#06b6d4" strokeWidth="2" />

                    {/* 8. ANIMATED CURRENT FLOW DOTS ALONG CLOSED LOOP PATHS */}
                    {q1On && (
                      <g>
                        <circle cx={30 + pDot * 212} cy="50" r="3.5" fill="#4ade80" className="shadow-lg shadow-emerald-400" />
                        <circle cx={242} cy={50 + pDot * 40} r="3.5" fill="#4ade80" />
                        <circle cx={242 + pDot * 138} cy="90" r="3.5" fill="#4ade80" />
                        <circle cx={440} cy={90 + pDot * 60} r="3.5" fill="#4ade80" />
                        <circle cx={440 - pDot * 360} cy="150" r="3.5" fill="#4ade80" />
                      </g>
                    )}
                    {q2On && (
                      <g>
                        <circle cx={80 + pDot * 360} cy="150" r="3.5" fill="#4ade80" />
                        <circle cx={440} cy={150 - pDot * 60} r="3.5" fill="#4ade80" />
                        <circle cx={440 - pDot * 198} cy="90" r="3.5" fill="#4ade80" />
                        <circle cx={242} cy={90 + pDot * 105} r="3.5" fill="#4ade80" />
                        <circle cx={242 - pDot * 212} cy="250" r="3.5" fill="#4ade80" />
                      </g>
                    )}
                    {d1Conduction && (
                      <g>
                        <circle cx={284} cy={150 - pDot * 95} r="3.5" fill="#f59e0b" />
                        <circle cx={284 - pDot * 204} cy="50" r="3.5" fill="#f59e0b" />
                      </g>
                    )}
                    {d2Conduction && (
                      <g>
                        <circle cx={284} cy={250 - pDot * 95} r="3.5" fill="#f59e0b" />
                        <circle cx={284 - pDot * 204} cy="150" r="3.5" fill="#f59e0b" />
                      </g>
                    )}

                    {/* 9. COMPACT LEGEND BOX */}
                    <g transform="translate(315, 266)">
                      <rect x="0" y="0" width="170" height="46" fill="#0d1117" stroke="#334155" strokeWidth="1" rx="4" opacity="0.95" />
                      <text x="85" y="10" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">SCHEMATIC LEGEND</text>
                      <text x="8" y="21" fill="#cbd5e1" fontSize="7" fontFamily="monospace">Q1/Q2: PWM Switches</text>
                      <text x="92" y="21" fill="#cbd5e1" fontSize="7" fontFamily="monospace">Lf: Filter Inductor</text>
                      <text x="8" y="31" fill="#cbd5e1" fontSize="7" fontFamily="monospace">D1/D2: Freewheel Diodes</text>
                      <text x="92" y="31" fill="#cbd5e1" fontSize="7" fontFamily="monospace">Cf: Filter Capacitor</text>
                      <text x="8" y="41" fill="#cbd5e1" fontSize="7" fontFamily="monospace">VSW: Switching Node</text>
                      <text x="92" y="41" fill="#cbd5e1" fontSize="7" fontFamily="monospace">N: Neutral Midpoint</text>
                    </g>
                  </g>
                );
              })()}
            </g>
          )}
        </svg>

        {/* --- MOSFET JUNCTION PHYSICS OVERLAY TOOLBAR --- */}
        {activeTopic === 'transistor' && transistorType === 'mosfet' && transistorSubView === 'junction' && (
          <div className="absolute top-2 right-2 z-20 flex flex-wrap gap-1.5 font-mono text-[10px]">
            <button
              onClick={() => setShowCurrentFlow(!showCurrentFlow)}
              className={`px-2 py-1 rounded border font-bold transition-all shadow-md ${
                showCurrentFlow ? 'bg-[#238636] border-[#3fb950] text-white' : 'bg-[#21262d] border-[#30363d] text-[#8b949e]'
              }`}
            >
              ⚡ Flow Overlay: {showCurrentFlow ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={() => setCurrentVectorMode(currentVectorMode === 'electron' ? 'conventional' : 'electron')}
              className="px-2 py-1 rounded border border-[#58a6ff] bg-[#161b22] text-[#58a6ff] font-bold hover:bg-[#1f6beb]/20 shadow-md transition-all"
            >
              ⇄ Vector: {currentVectorMode === 'electron' ? 'Electron (e-)' : 'Conventional (Id)'}
            </button>

            <button
              onClick={() => setShowMillerModal(true)}
              className="px-2 py-1 rounded border border-[#d2a8ff] bg-[#161b22] text-[#d2a8ff] font-bold hover:bg-[#8957e5]/20 shadow-md transition-all"
            >
              ⚡ Miller Plateau Info
            </button>
          </div>
        )}

        {/* --- MOSFET PHYSICS INTERACTIVE HOTSPOT MODAL --- */}
        {activePhysicsHotspot && (() => {
          const info = (() => {
            switch (activePhysicsHotspot) {
              case 'gate':
                return {
                  title: 'Gate Terminal (N+ Poly-Si)',
                  what: 'Heavily doped polysilicon control electrode insulated from substrate by silicon dioxide (SiO2).',
                  does: 'Receives gate control voltage VGS to establish an electrostatic field across the gate oxide.',
                  matter: 'Controls channel formation with zero DC gate current (extremely high input impedance).'
                };
              case 'oxide':
                return {
                  title: 'SiO2 Gate Dielectric Oxide',
                  what: 'Thin insulating layer (~50 nm) of silicon dioxide between gate electrode and semiconductor substrate.',
                  does: 'Prevents DC gate current while allowing electrostatic field penetration into the P-body region.',
                  matter: 'Determines gate oxide voltage rating (VGS_max = ±20V) and input capacitance (Ciss).'
                };
              case 'source':
                return {
                  title: 'N+ Source Regions',
                  what: 'Heavily doped N-type semiconductor regions connected to the source metal terminal.',
                  does: 'Supplies majority charge carriers (electrons) into the inversion channel when turned ON.',
                  matter: 'Provides low-ohmic contact for source current and forms top boundary of channel.'
                };
              case 'pbody':
                return {
                  title: 'P-Body Region',
                  what: 'P-type doped semiconductor region situated between N+ source and N- drift region.',
                  does: 'Inverts into an N-channel directly under the oxide when gate voltage VGS exceeds VTH.',
                  matter: 'Determines threshold voltage VTH and houses the intrinsic body diode.'
                };
              case 'channel':
                return {
                  title: 'N-Inversion Channel',
                  what: 'Electron-rich conductive channel formed in P-body surface directly under gate oxide.',
                  does: 'Connects N+ source to N- drift region, allowing electrons to flow from source to drain.',
                  matter: 'Primary determinant of ON-state resistance RDS(on) and channel conduction losses.'
                };
              case 'drift':
                return {
                  title: 'N- Drift Layer',
                  what: 'Lightly doped N-type epitaxial region supporting high OFF-state electric fields.',
                  does: 'Blocks high drain-source voltage VDS during OFF-state cutoff mode.',
                  matter: 'Determines voltage rating VDSS. Thicker/lighter drift layer = higher VDSS but higher RDS(on).'
                };
              case 'drain':
                return {
                  title: 'N+ Drain Substrate',
                  what: 'Heavily doped N+ substrate at the bottom of VDMOS structure connected to drain terminal.',
                  does: 'Collects electrons flowing down through N- drift layer and passes them to drain metal.',
                  matter: 'Provides mechanical substrate support and low-resistance drain connection.'
                };
              case 'body_diode':
                return {
                  title: 'Intrinsic Body Diode',
                  what: 'PN junction diode formed by P-body region and N- drift region in every power MOSFET.',
                  does: 'Conducts reverse current from Source (Anode) to Drain (Cathode) when VDS falls below zero.',
                  matter: 'Acts as an inherent freewheeling diode in inductive switching bridges and half-bridges.'
                };
              default:
                return {
                  title: 'MOSFET Structure',
                  what: 'Vertical Diffused Metal-Oxide Semiconductor (VDMOS).',
                  does: 'High-speed semiconductor power switch.',
                  matter: 'Essential for power converters and inverters.'
                };
            }
          })();

          return (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex items-center justify-center p-4">
              <div className="bg-[#161b22] border border-[#8957e5] rounded-xl max-w-md w-full p-4 font-mono shadow-2xl space-y-3 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
                  <h4 className="text-xs font-bold text-[#d2a8ff] flex items-center gap-2">
                    <span>🔬</span> {info.title}
                  </h4>
                  <button onClick={() => setActivePhysicsHotspot(null)} className="text-[#8b949e] hover:text-white text-xs px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] rounded transition-all">
                    ✕ Close
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-[#0d1117] p-2.5 rounded border border-[#30363d]">
                    <span className="text-[#58a6ff] font-bold block mb-1">1. What is it?</span>
                    <p className="text-gray-300 text-[11px] leading-relaxed">{info.what}</p>
                  </div>
                  <div className="bg-[#0d1117] p-2.5 rounded border border-[#30363d]">
                    <span className="text-[#3fb950] font-bold block mb-1">2. What does it do?</span>
                    <p className="text-gray-300 text-[11px] leading-relaxed">{info.does}</p>
                  </div>
                  <div className="bg-[#0d1117] p-2.5 rounded border border-[#30363d]">
                    <span className="text-[#e3b341] font-bold block mb-1">3. Why does it matter in a Power MOSFET?</span>
                    <p className="text-gray-300 text-[11px] leading-relaxed">{info.matter}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* --- MILLER PLATEAU EDUCATIONAL MODAL --- */}
        {showMillerModal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex items-center justify-center p-4">
            <div className="bg-[#161b22] border border-[#d2a8ff] rounded-xl max-w-lg w-full p-4 font-mono shadow-2xl space-y-3 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
                <h4 className="text-xs font-bold text-[#d2a8ff] flex items-center gap-2">
                  <span>⚡</span> MILLER EFFECT &amp; MILLER PLATEAU PHYSICS
                </h4>
                <button onClick={() => setShowMillerModal(false)} className="text-[#8b949e] hover:text-white text-xs px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] rounded transition-all">
                  ✕ Close
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="bg-[#0d1117] p-3 rounded border border-[#30363d] space-y-2">
                  <span className="text-[#e3b341] font-bold block border-b border-[#21262d] pb-1">Conceptual Waveform &amp; Gate Charge Stages:</span>
                  <div className="space-y-1.5 text-[11px] text-gray-300">
                    <p><strong className="text-[#58a6ff]">1. Gate Charge (t₀ → t₁):</strong> VGS rises from 0V to VTH=3.5V charging Cgs. VDS remains high (12V) and ID = 0A.</p>
                    <p><strong className="text-[#e3b341]">2. Miller Plateau (t₁ → t₂):</strong> VGS pauses at Vgp while VDS falls rapidly from 12V to 0.15V. All gate drive current charges reverse transfer capacitance Crss (Cgd).</p>
                    <p><strong className="text-[#3fb950]">3. Full Conduction (t₂ → t₃):</strong> VGS continues rising to VGS(drive) = 10.0V, achieving minimum ON-state resistance RDS(on) = 0.05Ω.</p>
                  </div>
                </div>

                <div className="bg-[#0d1117] p-3 rounded border border-[#da3633]/50 text-[11px] text-gray-300">
                  <span className="text-[#f85149] font-bold block mb-1">Switching Loss &amp; Thermal Impact:</span>
                  During the Miller plateau interval (t₁ → t₂), simultaneous high VDS and high ID produce peak switching power loss (P_sw = f_sw × E_sw). Faster gate drivers shorten the Miller plateau to minimize heating.
                </div>

                <p className="text-[10px] text-[#8b949e] italic text-center">
                  Note: This is an educational conceptual visualization connected to simulator switching loss calculations.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- SCR EDUCATIONAL LEARNING PANELS (Requirements 3, 4, 5) --- */}
      {activeTopic === 'scr' && (() => {
        const isTriggered = scrGatePulse || scrGateCurrent >= 35;
        const isConducting = scrFault === 'scr_short' || scrFault === 'dv_dt' || (scrFault !== 'gate_open' && scrLatched);
        const anodeCurrent = isConducting ? Math.max(0, (scrAnodeVin * 1.414 - 1.4) / Math.max(1, scrLoadRes)) : 0;
        const vPeak = scrAnodeVin * Math.SQRT2;
        const vdcAvg = (vPeak / Math.PI) * (1 + Math.cos((scrFiringAlpha * Math.PI) / 180));
        const condAngle = 180 - scrFiringAlpha;
        const holdingCurrent = 0.040; // 40mA
        const latchingCurrent = 0.080; // 80mA

        const isExp1Passed = activeScrExp === 1 && scrGateCurrent >= 35 && isConducting;
        const isExp2Passed = activeScrExp === 2 && (scrFiringAlpha === 30 || scrFiringAlpha === 60 || scrFiringAlpha === 90);
        const isExp3Passed = activeScrExp === 3 && scrLoadRes >= 4200 && !isConducting;
        const isExp4Passed = activeScrExp === 4 && latchingCurrent === 0.080 && holdingCurrent === 0.040;
        const isExp5Passed = activeScrExp === 5 && scrCommutationTime === 40;

        const isCurrentExpPassed =
          (activeScrExp === 1 && isExp1Passed) ||
          (activeScrExp === 2 && isExp2Passed) ||
          (activeScrExp === 3 && isExp3Passed) ||
          (activeScrExp === 4 && isExp4Passed) ||
          (activeScrExp === 5 && isExp5Passed);

        return (
          <div className="space-y-3 font-mono">
            {/* 3. CAUSE -> EFFECT LEARNING PANEL (Requirement 3) */}
            <div className="bg-[#0d1117] border border-[#e3b341]/60 rounded-xl p-3.5 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#e3b341]">
                <div className="flex items-center gap-2">
                  <span>⚡</span>
                  <span className="uppercase tracking-wider">CAUSE → EFFECT: FIRING ANGLE (α) &amp; OUTPUT CONTROL</span>
                </div>
                <span className="text-[10px] text-[#8b949e] font-normal">
                  Topology Math: Vdc = (Vm / π) × (1 + cos α)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                {/* Cause */}
                <div className="bg-[#161b22] p-2.5 rounded border border-[#30363d]">
                  <span className="text-[#58a6ff] font-bold block mb-1">1. Firing Angle Setting (α)</span>
                  <p className="text-[#ffffff] text-sm font-bold">α = {scrFiringAlpha}°</p>
                  <p className="text-[10px] text-[#8b949e] mt-1">
                    Gate trigger pulse delay after AC zero-crossing.
                  </p>
                </div>

                {/* Intermediate Effect */}
                <div className="bg-[#161b22] p-2.5 rounded border border-[#30363d]">
                  <span className="text-[#d2a8ff] font-bold block mb-1">2. Conduction Interval (θ)</span>
                  <p className="text-[#ffffff] text-sm font-bold">θ = 180° − α = {condAngle}°</p>
                  <p className="text-[10px] text-[#8b949e] mt-1">
                    Duration per half-cycle during which SCR carries load current.
                  </p>
                </div>

                {/* Final Output Effect */}
                <div className="bg-[#161b22] p-2.5 rounded border border-[#3fb950]">
                  <span className="text-[#3fb950] font-bold block mb-1">3. Average Output (Vdc)</span>
                  <p className="text-[#3fb950] text-sm font-bold">Vdc = {vdcAvg.toFixed(1)} V DC</p>
                  <p className="text-[10px] text-[#8b949e] mt-1">
                    {scrFiringAlpha > 90
                      ? 'High α → Short conduction → Low Vdc output.'
                      : 'Low α → Long conduction → High Vdc output.'}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. TURN-OFF / COMMUTATION EXPERIMENT PANEL (Requirement 4) */}
            <div className="bg-[#0d1117] border border-[#f85149]/50 rounded-xl p-3.5 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#f85149]">
                <div className="flex items-center gap-2">
                  <span>🛡️</span>
                  <span className="uppercase tracking-wider">How Does an SCR Turn OFF? (Commutation Physics)</span>
                </div>
                <span className="text-[10px] text-[#8b949e] font-normal">
                  Holding Current Ih = 40mA | Commutation tq = {scrCommutationTime}µs
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="bg-[#161b22] p-2 rounded border border-[#30363d]">
                  <span className="text-[#8b949e] text-[9px] block">GATE PULSE:</span>
                  <b className={scrGatePulse ? 'text-[#3fb950]' : 'text-[#8b949e]'}>
                    {scrGatePulse ? 'HIGH (1)' : 'LOW (0)'}
                  </b>
                </div>

                <div className="bg-[#161b22] p-2 rounded border border-[#30363d]">
                  <span className="text-[#8b949e] text-[9px] block">SCR STATE:</span>
                  <b className={isConducting ? 'text-[#3fb950]' : 'text-[#f85149]'}>
                    {isConducting ? 'LATCHED ON' : 'BLOCKING OFF'}
                  </b>
                </div>

                <div className="bg-[#161b22] p-2 rounded border border-[#30363d]">
                  <span className="text-[#8b949e] text-[9px] block">ANODE CURRENT (IA):</span>
                  <b className="text-white">{anodeCurrent.toFixed(3)} A</b>
                </div>

                <div className="bg-[#161b22] p-2 rounded border border-[#30363d]">
                  <span className="text-[#8b949e] text-[9px] block">HOLDING CURRENT (IH):</span>
                  <b className="text-[#e3b341]">0.040 A (40mA)</b>
                </div>

                <div className="bg-[#161b22] p-2 rounded border border-[#30363d]">
                  <span className="text-[#8b949e] text-[9px] block">TURN-OFF CONDITION:</span>
                  <b className={anodeCurrent < 0.040 || !isConducting ? 'text-[#3fb950]' : 'text-[#f85149]'}>
                    {anodeCurrent < 0.040 || !isConducting ? '✔ MET (IA < IH)' : '✕ NOT MET (IA > IH)'}
                  </b>
                </div>
              </div>

              <p className="text-[11px] text-gray-300 leading-relaxed bg-[#161b22] p-2.5 rounded border border-[#30363d]">
                💡 <strong>Key Takeaway:</strong> Removing the gate pulse does <u>NOT</u> turn off a conducting SCR!
                The SCR remains latched ON as long as anode current IA exceeds holding current IH (40mA).
                Turn-off occurs only when IA falls below IH or when reverse voltage is applied during the circuit commutation time (tq = 40µs).
              </p>
            </div>

            {/* 5. VIRTUAL LAB EXPERIMENT MODE (Requirement 5) */}
            <div className="bg-[#0d1117] border border-[#58a6ff]/50 rounded-xl p-3.5 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363d] pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#58a6ff]">
                  <span>🔬</span>
                  <span className="uppercase tracking-wider">VIRTUAL LAB EXPERIMENTS: PREDICT → ADJUST → OBSERVE</span>
                </div>
                {isCurrentExpPassed && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#238636] text-white animate-pulse">
                    ✔ EXPERIMENT {activeScrExp} COMPLETED CORRECTLY!
                  </span>
                )}
              </div>

              {/* Experiment Selector Tabs */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  { id: 1, label: 'Exp 1: Min Trigger Current (Igt)' },
                  { id: 2, label: 'Exp 2: Firing Angle (α) vs Vdc' },
                  { id: 3, label: 'Exp 3: Load Reduction Turn-OFF' },
                  { id: 4, label: 'Exp 4: Latching (Il) vs Holding (Ih)' },
                  { id: 5, label: 'Exp 5: Commutation Time (tq)' },
                ].map((exp) => (
                  <button
                    key={exp.id}
                    onClick={() => setActiveScrExp(exp.id)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                      activeScrExp === exp.id
                        ? 'bg-[#1f6beb] border-[#58a6ff] text-white shadow-md'
                        : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-white'
                    }`}
                  >
                    {exp.label}
                  </button>
                ))}
              </div>

              {/* Active Experiment Detail Card */}
              <div className="bg-[#161b22] p-3 rounded-xl border border-[#30363d] space-y-2.5 text-xs">
                {activeScrExp === 1 && (
                  <div className="space-y-1.5">
                    <span className="text-[#58a6ff] font-bold block">Experiment 1: Find Minimum Gate Current (Igt)</span>
                    <p className="text-gray-300 text-[11px]">
                      <strong>Objective:</strong> Adjust the Gate Current IG slider up from 10mA to find the minimum threshold current required to trigger PNPN latching.
                    </p>
                    <div className="bg-[#0d1117] p-2 rounded text-[10px] text-gray-300 space-y-1">
                      <p>• Current Gate Setting: <strong className="text-white">{scrGateCurrent} mA</strong> (Required Igt = 35 mA)</p>
                      <p>• Result: {scrGateCurrent >= 35 ? <span className="text-[#3fb950] font-bold">✔ Trigger threshold reached! SCR latched ON.</span> : <span className="text-[#f85149]">✕ Below trigger threshold (IG &lt; 35mA). SCR remains in Forward Blocking.</span>}</p>
                    </div>
                  </div>
                )}

                {activeScrExp === 2 && (
                  <div className="space-y-1.5">
                    <span className="text-[#58a6ff] font-bold block">Experiment 2: Firing Angle (α) Control &amp; Vdc Output</span>
                    <p className="text-gray-300 text-[11px]">
                      <strong>Objective:</strong> Change firing angle α slider (15° to 135°) and observe the inverse relationship with average DC output voltage Vdc.
                    </p>
                    <div className="bg-[#0d1117] p-2 rounded text-[10px] text-gray-300 space-y-1">
                      <p>• Current Firing Angle: <strong className="text-white">α = {scrFiringAlpha}°</strong></p>
                      <p>• Average Output Vdc: <strong className="text-[#3fb950]">Vdc = {vdcAvg.toFixed(1)} V</strong></p>
                    </div>
                  </div>
                )}

                {activeScrExp === 3 && (
                  <div className="space-y-1.5">
                    <span className="text-[#58a6ff] font-bold block">Experiment 3: Anode Current Reduction Below Holding Current (Ih)</span>
                    <p className="text-gray-300 text-[11px]">
                      <strong>Objective:</strong> Increase Load Resistance Rl to reduce Anode Current IA below Holding Current Ih (40mA) and observe SCR turn-OFF.
                    </p>
                    <div className="bg-[#0d1117] p-2 rounded text-[10px] text-gray-300 space-y-1">
                      <p>• Current Load Resistance: <strong className="text-white">Rl = {scrLoadRes} Ω</strong> | IA = <strong className="text-white">{anodeCurrent.toFixed(3)} A</strong></p>
                      <p>• Result: {anodeCurrent < 0.040 ? <span className="text-[#3fb950] font-bold">✔ Anode current fell below IH (40mA)! SCR successfully un-latched and turned OFF.</span> : <span className="text-[#e3b341]">IA ({anodeCurrent.toFixed(2)}A) &gt; IH (0.04A). SCR remains conducting. Increase Rl &gt; 4200Ω.</span>}</p>
                    </div>
                  </div>
                )}

                {activeScrExp === 4 && (
                  <div className="space-y-1.5">
                    <span className="text-[#58a6ff] font-bold block">Experiment 4: Latching Current (Il) vs Holding Current (Ih)</span>
                    <p className="text-gray-300 text-[11px]">
                      <strong>Objective:</strong> Understand the difference between Latching Current (Il = 80mA) required during turn-ON to sustain latching, and Holding Current (Ih = 40mA) required to maintain ON-state.
                    </p>
                    <div className="bg-[#0d1117] p-2 rounded text-[10px] text-gray-300 space-y-1">
                      <p>• Latching Current Il: <strong className="text-[#3fb950]">80 mA (0.080 A)</strong> — Minimum current needed at turn-ON pulse end.</p>
                      <p>• Holding Current Ih: <strong className="text-[#e3b341]">40 mA (0.040 A)</strong> — Minimum current needed to maintain ON state.</p>
                    </div>
                  </div>
                )}

                {activeScrExp === 5 && (
                  <div className="space-y-1.5">
                    <span className="text-[#58a6ff] font-bold block">Experiment 5: Circuit Commutation Time (tq)</span>
                    <p className="text-gray-300 text-[11px]">
                      <strong>Objective:</strong> Observe how forced or natural commutation reduces anode current to zero and applies reverse voltage for duration t &ge; tq (40µs) to allow minority carrier recombination.
                    </p>
                    <div className="bg-[#0d1117] p-2 rounded text-[10px] text-gray-300 space-y-1">
                      <p>• Specified Commutation Time: <strong className="text-white">tq = {scrCommutationTime} µs</strong></p>
                      <p>• Recombination Status: <span className="text-[#3fb950] font-bold">✔ Minority carriers cleared from internal junctions J1, J2, J3.</span></p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

          {/* LIVE DIODE & SEMICONDUCTOR FIRING LOGIC INSPECTOR */}
          <div className="bg-[#0d1117] border border-[#3fb950]/50 rounded-xl p-3.5 flex flex-col gap-2.5 font-mono shadow-xl">
            <div className="flex items-center justify-between text-xs font-extrabold text-[#3fb950]">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#e3b341] animate-pulse" />
                <span className="uppercase tracking-wider">LIVE DIODE & SEMICONDUCTOR FIRING LOGIC INSPECTOR</span>
              </div>
              <span className="text-[10px] text-[#8b949e] font-normal">Real Physics & Science Telemetry</span>
            </div>

            {/* LIVE DIODES BREAKDOWN GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {(() => {
                const radTime = (time * 3) % (Math.PI * 2);
                const degTime = Math.round((radTime * 180) / Math.PI);
                const isPos = Math.sin(radTime) >= 0;

                let diodesList: Array<{
                  tag: string;
                  anode: string;
                  cathode: string;
                  bias: string;
                  isConducting: boolean;
                  physics: string;
                }> = [];

                if (activeTopic === 'diode') {
                  const vAnode = Math.sin(time * 3) * (diodeAcVac * Math.SQRT2) + diodeBias;
                  const isCon = vAnode > 0.7 && diodeFault !== 'open';
                  diodesList = [
                    {
                      tag: 'D1 Main Power Diode',
                      anode: `${vAnode.toFixed(1)} V`,
                      cathode: `${isCon ? (vAnode - 0.7).toFixed(1) : '0.0'} V`,
                      bias: vAnode > 0.7 ? 'Forward Biased' : 'Reverse Biased',
                      isConducting: isCon,
                      physics: isCon
                        ? 'P-N Depletion region collapsed. Forward current flows with 0.7V junction drop.'
                        : `Reverse voltage applied. Depletion layer widened. Blocking reverse leakage.`,
                    },
                  ];
                } else if (activeTopic === 'rectifiers') {
                  if (rectifierType === 'half') {
                    diodesList = [
                      {
                        tag: 'D1 Half-Wave Diode',
                        anode: `${(Math.sin(radTime) * rectifierVac * Math.SQRT2).toFixed(1)} V`,
                        cathode: isPos ? `${(Math.sin(radTime) * rectifierVac * Math.SQRT2 - 0.7).toFixed(1)} V` : '0.0 V',
                        bias: isPos ? 'Forward Biased' : 'Reverse Biased',
                        isConducting: isPos,
                        physics: isPos
                          ? 'AC Phase 0°-180°: Positive half-cycle conducts to load.'
                          : 'AC Phase 180°-360°: Negative half-cycle clipped to 0V (Reverse Blocked).',
                      },
                    ];
                  } else if (rectifierType === 'center_tap') {
                    diodesList = [
                      {
                        tag: 'D1 Top Secondary Diode',
                        anode: `${(Math.sin(radTime) * rectifierVac * Math.SQRT2).toFixed(1)} V`,
                        cathode: isPos ? `${(Math.sin(radTime) * rectifierVac * Math.SQRT2 - 0.7).toFixed(1)} V` : '0.0 V',
                        bias: isPos ? 'Forward Biased' : 'Reverse Biased',
                        isConducting: isPos,
                        physics: isPos ? 'Conducts during positive half-cycle.' : 'Blocked during negative half-cycle (PIV = 2*Vm).',
                      },
                      {
                        tag: 'D2 Bottom Secondary Diode',
                        anode: `${(-Math.sin(radTime) * rectifierVac * Math.SQRT2).toFixed(1)} V`,
                        cathode: !isPos ? `${(-Math.sin(radTime) * rectifierVac * Math.SQRT2 - 0.7).toFixed(1)} V` : '0.0 V',
                        bias: !isPos ? 'Forward Biased' : 'Reverse Biased',
                        isConducting: !isPos,
                        physics: !isPos ? 'Conducts inverted negative half-cycle.' : 'Blocked during positive half-cycle.',
                      },
                    ];
                  } else if (rectifierType === 'full_bridge') {
                    diodesList = [
                      { tag: 'D1 Top-Left Diode', anode: 'AC Line', cathode: 'DC+ Bus', bias: isPos ? 'Forward' : 'Reverse', isConducting: isPos, physics: isPos ? 'Conducts positive half-cycle with D2' : 'Reverse blocked (PIV = Vm)' },
                      { tag: 'D2 Bot-Right Diode', anode: 'DC- Bus', cathode: 'AC Neutral', bias: isPos ? 'Forward' : 'Reverse', isConducting: isPos, physics: isPos ? 'Returns load current with D1' : 'Reverse blocked' },
                      { tag: 'D3 Top-Right Diode', anode: 'AC Neutral', cathode: 'DC+ Bus', bias: !isPos ? 'Forward' : 'Reverse', isConducting: !isPos, physics: !isPos ? 'Conducts negative half-cycle with D4' : 'Reverse blocked' },
                      { tag: 'D4 Bot-Left Diode', anode: 'DC- Bus', cathode: 'AC Line', bias: !isPos ? 'Forward' : 'Reverse', isConducting: !isPos, physics: !isPos ? 'Returns load current with D3' : 'Reverse blocked' },
                    ];
                  } else if (rectifierType === 'three_phase') {
                    const seq = Math.floor((degTime / 60) % 6);
                    const pairs = [
                      { top: 0, bot: 1 }, { top: 0, bot: 2 }, { top: 1, bot: 2 },
                      { top: 1, bot: 0 }, { top: 2, bot: 0 }, { top: 2, bot: 1 },
                    ];
                    const activePair = pairs[seq] || pairs[0];

                    diodesList = [
                      { tag: 'D1 (Phase A Top)', anode: 'Va', cathode: 'DC+', bias: activePair.top === 0 ? 'Forward' : 'Reverse', isConducting: activePair.top === 0, physics: activePair.top === 0 ? 'Highest positive voltage phase A' : 'Reverse blocked' },
                      { tag: 'D3 (Phase B Top)', anode: 'Vb', cathode: 'DC+', bias: activePair.top === 1 ? 'Forward' : 'Reverse', isConducting: activePair.top === 1, physics: activePair.top === 1 ? 'Highest positive voltage phase B' : 'Reverse blocked' },
                      { tag: 'D5 (Phase C Top)', anode: 'Vc', cathode: 'DC+', bias: activePair.top === 2 ? 'Forward' : 'Reverse', isConducting: activePair.top === 2, physics: activePair.top === 2 ? 'Highest positive voltage phase C' : 'Reverse blocked' },
                      { tag: 'D4 (Phase A Bot)', anode: 'DC-', cathode: 'Va', bias: activePair.bot === 0 ? 'Forward' : 'Reverse', isConducting: activePair.bot === 0, physics: activePair.bot === 0 ? 'Lowest negative voltage phase A' : 'Reverse blocked' },
                      { tag: 'D6 (Phase B Bot)', anode: 'DC-', cathode: 'Vb', bias: activePair.bot === 1 ? 'Forward' : 'Reverse', isConducting: activePair.bot === 1, physics: activePair.bot === 1 ? 'Lowest negative voltage phase B' : 'Reverse blocked' },
                      { tag: 'D2 (Phase C Bot)', anode: 'DC-', cathode: 'Vc', bias: activePair.bot === 2 ? 'Forward' : 'Reverse', isConducting: activePair.bot === 2, physics: activePair.bot === 2 ? 'Lowest negative voltage phase C' : 'Reverse blocked' },
                    ];
                  }
                } else if (activeTopic === 'transistor') {
                  const isCon = gateDriveOn && transistorFault !== 'gate_open';
                  const icVal = transistorType === 'bjt' && transistorCurrent > 5 ? 5 : transistorCurrent;
                  const ibVal = icVal / 50;
                  const vceSat = Math.min(1.2, Math.max(0.2, 0.3 + ((icVal - 0.1) / 4.9) * 0.5));
                  
                  if (transistorType === 'bjt') {
                    diodesList = [
                      {
                        tag: 'Q1 Power BJT NPN Switch',
                        anode: isCon ? `Ib = ${(ibVal * 1000).toFixed(0)} mA (Vbe = 0.70V)` : 'Ib = 0 mA (Vbe = 0.0V)',
                        cathode: isCon ? `Vce(sat) = ${vceSat.toFixed(2)} V` : `Vce = ${busVoltage.toFixed(1)} V`,
                        bias: isCon ? 'SATURATION MODE (ON)' : 'CUTOFF MODE (OFF)',
                        isConducting: isCon,
                        physics: isCon
                          ? `J_BE forward biased (Vbe=0.7V). High Base drive Ib=${(ibVal * 1000).toFixed(0)}mA forces transistor into Saturation. Collector current Ic=${icVal.toFixed(1)}A flows with low Vce(sat)=${vceSat.toFixed(2)}V.`
                          : `Base drive signal OFF (Ib=0mA). Transistor in Cutoff. Blocked DC rail voltage Vce=${busVoltage.toFixed(1)}V with zero load current.`,
                      },
                    ];
                  } else {
                    diodesList = [
                      {
                        tag: `${transistorType.toUpperCase()} Power Semiconductor`,
                        anode: isCon ? 'Vgs/Vge = 10.0 V (Drive ON)' : 'Vgs/Vge = 0.0 V (Drive OFF)',
                        cathode: isCon ? `Vds/Vce = ${transistorType === 'mosfet' ? '0.15 V' : '1.50 V'}` : `Vds/Vce = ${busVoltage.toFixed(1)} V`,
                        bias: isCon ? 'ON State (Conduction)' : 'OFF State (Blocking)',
                        isConducting: isCon,
                        physics: isCon
                          ? `Insulated Gate voltage > Vth creates channel. High current Ic=${icVal.toFixed(1)}A conducts with minimal voltage drop.`
                          : `Gate voltage below threshold Vth. Zero channel formed. Full bus voltage ${busVoltage.toFixed(1)}V blocked.`,
                      },
                    ];
                  }
                } else if (activeTopic === 'scr' || activeTopic === 'controlled') {
                  const alpha = activeTopic === 'scr' ? scrFiringAlpha : firingAngle;
                  const isFired = degTime >= alpha && degTime <= 180;
                  diodesList = [
                    {
                      tag: 'SCR Thyristor 1',
                      anode: 'Anode Vin',
                      cathode: 'Load Vout',
                      bias: isFired ? 'Fired & Conducting' : 'Forward Blocking',
                      isConducting: isFired,
                      physics: isFired
                        ? `Gate pulse injected at α=${alpha}° → SCR latched ON → V_AK=1.4V drop.`
                        : `Phase angle θ=${degTime}° < α=${alpha}° → SCR holds forward blocking state until fired.`,
                    },
                  ];
                }

                return diodesList.map((d, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border transition-all flex flex-col gap-1 ${
                      d.isConducting
                        ? 'bg-[#238636]/15 border-[#3fb950] text-[#3fb950]'
                        : 'bg-[#161b22] border-[#30363d] text-[#c9d1d9]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-white">{d.tag}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                          d.isConducting ? 'bg-[#238636] text-white' : 'bg-[#da3633]/20 text-[#f85149] border border-[#f85149]'
                        }`}
                      >
                        {d.isConducting ? '✔ CONDUCTING' : '✕ BLOCKING'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-[#8b949e]">
                      <div>Anode: <b className="text-white">{d.anode}</b></div>
                      <div>Cathode: <b className="text-white">{d.cathode}</b></div>
                    </div>
                    <p className="text-[10px] text-[#8b949e] leading-tight mt-0.5 border-t border-[#21262d] pt-1">
                      {d.physics}
                    </p>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* RECTIFIER COMPARISON TABLE & SELECTED BRIDGE THEORY / FORMULAS (TOPIC 2) */}
          {activeTopic === 'rectifiers' && (
            <div className="flex flex-col gap-3">
              {/* COMPARISON MATRIX TABLE */}
              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex flex-col gap-2 font-mono">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#58a6ff]">
                  <span className="uppercase tracking-wider">UNCONTROLLED RECTIFIERS COMPARISON MATRIX:</span>
                  <span className="text-[10px] text-[#8b949e]">Click row to select topology</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#30363d] text-[#8b949e]">
                        <th className="py-1.5 px-2 font-semibold">Topology</th>
                        <th className="py-1.5 px-2 font-semibold">No. Diodes</th>
                        <th className="py-1.5 px-2 font-semibold">Ripple Freq</th>
                        <th className="py-1.5 px-2 font-semibold">Ripple Factor</th>
                        <th className="py-1.5 px-2 font-semibold">PIV</th>
                        <th className="py-1.5 px-2 font-semibold">TUF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { id: 'half', name: '1-Phase Half Wave', diodes: '1 Diode', freq: 'fs (50 Hz)', ripple: '121%', piv: 'Vm', tuf: '0.286' },
                        { id: 'center_tap', name: '1-Phase Center Tapped', diodes: '2 Diodes', freq: '2fs (100 Hz)', ripple: '48%', piv: '2Vm', tuf: '0.693' },
                        { id: 'full_bridge', name: '1-Phase Bridge (Graetz)', diodes: '4 Diodes', freq: '2fs (100 Hz)', ripple: '48%', piv: 'Vm', tuf: '0.812' },
                        { id: 'three_phase', name: '3-Phase 6-Pulse Diode', diodes: '6 Diodes', freq: '6fs (300 Hz)', ripple: '4.2%', piv: 'VLL_peak', tuf: '0.955' },
                      ].map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => setRectifierType(row.id as any)}
                          className={`cursor-pointer transition-colors border-b border-[#21262d] ${
                            rectifierType === row.id
                              ? 'bg-[#1f6beb]/20 text-white font-bold border-l-4 border-l-[#58a6ff]'
                              : 'text-[#c9d1d9] hover:bg-[#161b22]'
                          }`}
                        >
                          <td className="py-1.5 px-2">{row.name}</td>
                          <td className="py-1.5 px-2 text-[#e3b341]">{row.diodes}</td>
                          <td className="py-1.5 px-2 text-[#58a6ff]">{row.freq}</td>
                          <td className={`py-1.5 px-2 ${row.id === 'three_phase' ? 'text-[#3fb950]' : row.id === 'half' ? 'text-[#f85149]' : 'text-[#e3b341]'}`}>
                            {row.ripple}
                          </td>
                          <td className="py-1.5 px-2 text-[#c9d1d9]">{row.piv}</td>
                          <td className="py-1.5 px-2 text-[#3fb950]">{row.tuf}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DYNAMIC THEORY & GOVERNING FORMULAS CARD FOR SELECTED BRIDGE */}
              {(() => {
                const Vrms = rectifierVac;
                const Rl = rectifierLoad;
                let title = '';
                let theoryText = '';
                let formulas: Array<{ label: string; expr: string; value: string; desc: string }> = [];
                let designNotes: string[] = [];

                if (rectifierType === 'half') {
                  const Vm = Math.SQRT2 * Vrms;
                  const VdcIdeal = Vm / Math.PI;
                  const VdcReal = Math.max(0, VdcIdeal - 0.7);
                  const VrmsOut = Vm / 2;
                  const Idc = VdcReal / Rl;
                  const PIV = Vm;
                  title = '1-PHASE HALF-WAVE RECTIFIER (1 DIODE TOPOLOGY)';
                  theoryText =
                    'Converts single-phase AC input into pulsating DC using 1 diode. The diode conducts only during the positive half-cycle (0 ≤ ωt ≤ π). During the negative half-cycle (π ≤ ωt ≤ 2π), the diode is reverse biased and blocks current flow, producing zero output voltage.';
                  formulas = [
                    {
                      label: 'Average DC Output Voltage (Vdc)',
                      expr: 'Vdc = Vm / π = (√2 × Vrms) / π',
                      value: `${VdcReal.toFixed(2)} V (Ideal: ${VdcIdeal.toFixed(2)} V)`,
                      desc: 'DC component evaluated over full 2π period minus 0.7V diode drop.',
                    },
                    {
                      label: 'RMS Output Voltage (Vrms_out)',
                      expr: 'Vrms_out = Vm / 2 = (√2 × Vrms) / 2',
                      value: `${VrmsOut.toFixed(2)} V`,
                      desc: 'Effective heating value of pulsating output waveform.',
                    },
                    {
                      label: 'Peak Inverse Voltage (PIV)',
                      expr: 'PIV = Vm = √2 × Vrms',
                      value: `${PIV.toFixed(2)} V`,
                      desc: 'Maximum reverse voltage applied across diode during negative half-cycle.',
                    },
                    {
                      label: 'Ripple Factor (RF)',
                      expr: 'RF = √((Vrms_out / Vdc)² - 1) = √((π/2)² - 1)',
                      value: '1.211 (121.1% AC ripple content)',
                      desc: 'Extremely high AC ripple requires large C filter for smoothing.',
                    },
                    {
                      label: 'Form Factor (FF) & TUF',
                      expr: 'FF = Vrms_out / Vdc = 1.571 | TUF = 0.286',
                      value: 'FF = 1.57 | TUF = 28.6%',
                      desc: 'Low transformer utilization due to DC core saturation risk.',
                    },
                  ];
                  designNotes = [
                    'Disadvantage: High ripple factor (121%) and low efficiency (40.6%).',
                    'DC magnetization risk in transformer core due to unidirectional current pulses.',
                    'Primarily used only in low-cost, minimal-power auxiliary electronics.',
                  ];
                } else if (rectifierType === 'center_tap') {
                  const Vm = Math.SQRT2 * Vrms;
                  const VdcIdeal = (2 * Vm) / Math.PI;
                  const VdcReal = Math.max(0, VdcIdeal - 0.7);
                  const VrmsOut = Vm / Math.SQRT2;
                  const Idc = VdcReal / Rl;
                  const PIV = 2 * Vm;
                  title = '1-PHASE CENTER-TAPPED FULL-WAVE RECTIFIER (2 DIODE TOPOLOGY)';
                  theoryText =
                    'Converts both positive and negative half-cycles of single-phase AC using 2 diodes and a center-tapped transformer. D1 conducts during 0 ≤ ωt ≤ π; D2 conducts during π ≤ ωt ≤ 2π with phase inverted by secondary winding tap.';
                  formulas = [
                    {
                      label: 'Average DC Output Voltage (Vdc)',
                      expr: 'Vdc = (2 × Vm) / π = (2√2 × Vrms) / π',
                      value: `${VdcReal.toFixed(2)} V (Ideal: ${VdcIdeal.toFixed(2)} V)`,
                      desc: 'Twice the DC output of half-wave rectifier for same secondary voltage.',
                    },
                    {
                      label: 'RMS Output Voltage (Vrms_out)',
                      expr: 'Vrms_out = Vm / √2 = Vrms',
                      value: `${VrmsOut.toFixed(2)} V`,
                      desc: 'RMS voltage equal to secondary half-winding RMS voltage.',
                    },
                    {
                      label: 'Peak Inverse Voltage (PIV)',
                      expr: 'PIV = 2 × Vm = 2√2 × Vrms',
                      value: `${PIV.toFixed(2)} V (CRITICAL DESIGN LIMIT)`,
                      desc: 'Diodes must withstand 2× peak voltage due to center-tap geometry!',
                    },
                    {
                      label: 'Ripple Factor (RF) & Frequency',
                      expr: 'RF = √((π / 2√2)² - 1) = 0.482 | fripple = 2 × fs',
                      value: '48.2% ripple | 100 Hz output frequency',
                      desc: 'Easier to filter than half-wave due to double pulse rate.',
                    },
                    {
                      label: 'Form Factor (FF) & TUF',
                      expr: 'FF = 1.111 | TUF = 0.693',
                      value: 'FF = 1.11 | TUF = 69.3%',
                      desc: 'Higher transformer utilization than half-wave; no core DC saturation.',
                    },
                  ];
                  designNotes = [
                    'Requires custom center-tapped transformer (adds weight and manufacturing cost).',
                    'Diodes require 2× PIV rating compared to bridge rectifier.',
                    'Ideal for low-voltage output power supplies where single 0.7V diode drop matters.',
                  ];
                } else if (rectifierType === 'full_bridge') {
                  const Vm = Math.SQRT2 * Vrms;
                  const VdcIdeal = (2 * Vm) / Math.PI;
                  const VdcReal = Math.max(0, VdcIdeal - 1.4);
                  const VrmsOut = Vm / Math.SQRT2;
                  const Idc = VdcReal / Rl;
                  const PIV = Vm;
                  title = '1-PHASE GRAETZ FULL-BRIDGE RECTIFIER (4 DIODE TOPOLOGY)';
                  theoryText =
                    'Standard full-wave bridge topology using 4 diodes. During positive half-cycle, D1 and D2 conduct in series. During negative half-cycle, D3 and D4 conduct. Does NOT require a center-tapped transformer and halves the required diode PIV rating.';
                  formulas = [
                    {
                      label: 'Average DC Output Voltage (Vdc)',
                      expr: 'Vdc = (2 × Vm) / π - 2V_F = (2√2 × Vrms) / π - 1.4V',
                      value: `${VdcReal.toFixed(2)} V (Ideal: ${VdcIdeal.toFixed(2)} V)`,
                      desc: 'Accounts for 2 conduction diode drops (2 × 0.7V = 1.4V).',
                    },
                    {
                      label: 'RMS Output Voltage (Vrms_out)',
                      expr: 'Vrms_out = Vm / √2 = Vrms',
                      value: `${VrmsOut.toFixed(2)} V`,
                      desc: 'Full-wave output RMS voltage.',
                    },
                    {
                      label: 'Peak Inverse Voltage (PIV)',
                      expr: 'PIV = Vm = √2 × Vrms',
                      value: `${PIV.toFixed(2)} V (50% of Center-Tap PIV!)`,
                      desc: 'Each diode only withstands 1× Vm peak reverse voltage.',
                    },
                    {
                      label: 'Ripple Factor (RF) & Frequency',
                      expr: 'RF = 0.482 (48.2%) | fripple = 2 × fs = 100 Hz',
                      value: '48.2% ripple | 100 Hz output frequency',
                      desc: 'Ripple frequency is twice input line frequency.',
                    },
                    {
                      label: 'Form Factor (FF) & TUF',
                      expr: 'FF = 1.111 | TUF = 0.812 (81.2%)',
                      value: 'FF = 1.11 | TUF = 81.2%',
                      desc: 'Highest transformer utilization among 1-phase rectifiers.',
                    },
                  ];
                  designNotes = [
                    'Industry standard topology for single-phase power supplies and motor drives.',
                    'Only 1× Vm PIV required per diode simplifies semiconductor selection.',
                    'Two diode forward drops (1.4V total) slightly reduce low-voltage efficiency.',
                  ];
                } else if (rectifierType === 'three_phase') {
                  const VLL = Vrms;
                  const VmLL = Math.SQRT2 * VLL;
                  const VphRms = VLL / Math.sqrt(3);
                  const VmPh = Math.SQRT2 * VphRms;
                  const VdcIdeal = (3 * VmLL) / Math.PI;
                  const VdcReal = Math.max(0, VdcIdeal - 1.4);
                  const VrmsOut = VmLL * Math.sqrt(0.5 + (3 * Math.sqrt(3)) / (4 * Math.PI));
                  const Idc = VdcReal / Rl;
                  const PIV = VmLL;
                  title = '3-PHASE 6-PULSE DIODE BRIDGE RECTIFIER (6 DIODE TOPOLOGY)';
                  theoryText =
                    'Converts 3-phase AC input into continuous DC with 6 pulses per AC cycle. At any instant, 2 diodes conduct simultaneously: 1 top diode connected to highest positive phase voltage and 1 bottom diode connected to lowest negative phase voltage. Commutation occurs every 60°.';
                  formulas = [
                    {
                      label: 'Average DC Output Voltage (Vdc)',
                      expr: 'Vdc = (3 × Vm,LL) / π = (3√2 × VLL) / π ≈ 1.35 × VLL',
                      value: `${VdcReal.toFixed(2)} V (Ideal: ${VdcIdeal.toFixed(2)} V)`,
                      desc: 'Extremely high DC conversion efficiency (1.35 × Line-to-Line RMS).',
                    },
                    {
                      label: 'RMS Output Voltage (Vrms_out)',
                      expr: 'Vrms_out = Vm,LL × √(0.5 + 3√3 / 4π) ≈ 1.3516 × VLL',
                      value: `${VrmsOut.toFixed(2)} V`,
                      desc: 'RMS voltage very close to DC average voltage.',
                    },
                    {
                      label: 'Peak Inverse Voltage (PIV)',
                      expr: 'PIV = Vm,LL = √2 × VLL = √6 × Vph',
                      value: `${PIV.toFixed(2)} V`,
                      desc: 'Peak line-to-line voltage across non-conducting diodes.',
                    },
                    {
                      label: 'Ripple Factor (RF) & Frequency',
                      expr: 'RF = √((Vrms_out / Vdc)² - 1) ≈ 0.042 (4.2%) | fripple = 6 × fs',
                      value: '4.2% LOW RIPPLE | 300 Hz output frequency',
                      desc: 'Ultra-low natural ripple often requires minimal or no output filter capacitor!',
                    },
                    {
                      label: 'Form Factor (FF) & TUF',
                      expr: 'FF = 1.0009 | TUF = 0.955 (95.5%)',
                      value: 'FF = 1.0009 | TUF = 95.5%',
                      desc: 'Near-unity Form Factor indicates almost pure DC waveform.',
                    },
                  ];
                  designNotes = [
                    'Standard topology for industrial VFD motor drives, EV fast chargers, and DC microgrids.',
                    'Low 4.2% ripple dramatically reduces DC link filter capacitor size.',
                    'Each diode conducts for 120° per AC period with 60° commutation intervals.',
                  ];
                }

                return (
                  <div className="bg-[#0d1117] border border-[#58a6ff]/50 rounded-xl p-3.5 flex flex-col gap-3 font-mono shadow-xl">
                    <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-xs font-bold text-[#58a6ff]">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#58a6ff]" />
                        <span className="uppercase tracking-wider">GOVERNING FORMULAS &amp; ACADEMIC THEORY</span>
                      </div>
                      <span className="text-[10px] text-[#3fb950] font-extrabold bg-[#238636]/20 px-2 py-0.5 rounded border border-[#3fb950]/40">
                        {title}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#c9d1d9] leading-relaxed bg-[#161b22] p-2.5 rounded-lg border border-[#30363d]">
                      {theoryText}
                    </p>

                    {/* FORMULA & COMPUTED PARAMETERS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {formulas.map((f, idx) => (
                        <div key={idx} className="bg-[#161b22] border border-[#21262d] p-2.5 rounded-lg flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[10px] text-[#8b949e]">
                            <span className="font-bold text-white">{f.label}</span>
                          </div>
                          <div className="text-[11px] text-[#e3b341] font-bold bg-[#0d1117] px-2 py-1 rounded border border-[#30363d]">
                            {f.expr}
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#8b949e]">Evaluated:</span>
                            <span className="text-[#3fb950] font-extrabold">{f.value}</span>
                          </div>
                          <p className="text-[9.5px] text-[#8b949e] leading-tight border-t border-[#21262d] pt-1">
                            {f.desc}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* TOPOLOGY DESIGN & ENGINEERING NOTES */}
                    <div className="bg-[#161b22] border border-[#e3b341]/30 p-2.5 rounded-lg flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-[#e3b341] uppercase flex items-center gap-1">
                        💡 Key Engineering Trade-offs &amp; Design Criteria:
                      </span>
                      <ul className="list-disc list-inside text-[10px] text-[#c9d1d9] space-y-0.5">
                        {designNotes.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TRANSISTOR SWITCH COMPARISON TABLE & THEORY (MODULE 3) */}
          {activeTopic === 'transistor' && (
            <div className="flex flex-col gap-3">
              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 flex flex-col gap-2 font-mono">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#8957e5]">
                  <span className="uppercase tracking-wider">TRANSISTOR SWITCH TECHNOLOGY COMPARISON MATRIX:</span>
                  <span className="text-[10px] text-[#8b949e]">Click row to select device</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#30363d] text-[#8b949e]">
                        <th className="py-1.5 px-2 font-semibold">Device</th>
                        <th className="py-1.5 px-2 font-semibold">Control Type</th>
                        <th className="py-1.5 px-2 font-semibold">Drive Requirement</th>
                        <th className="py-1.5 px-2 font-semibold">Vsat / Vds(on)</th>
                        <th className="py-1.5 px-2 font-semibold">Switching Speed</th>
                        <th className="py-1.5 px-2 font-semibold">Application in Battery Chargers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          id: 'bjt',
                          name: 'BJT (NPN)',
                          control: 'Current Controlled',
                          drive: '100mA Base Current (Ib)',
                          vsat: '0.30V (Vce_sat)',
                          speed: 'Slow (<20 kHz)',
                          app: 'Legacy low power supplies & linear regulators'
                        },
                        {
                          id: 'mosfet',
                          name: 'Power MOSFET',
                          control: 'Voltage Controlled',
                          drive: '10V Gate Voltage (Vgs)',
                          vsat: '0.15V (Vds_on)',
                          speed: 'Ultra-Fast (>100 kHz)',
                          app: 'High efficiency SMPS & USB-C fast chargers (<600V)'
                        },
                        {
                          id: 'igbt',
                          name: 'IGBT',
                          control: 'Voltage Controlled',
                          drive: '10V Gate Voltage (Vge)',
                          vsat: '1.50V (Vce_sat)',
                          speed: 'Medium-High (20-100 kHz)',
                          app: 'Modern high-power EV chargers (>600V) replacing old SCRs'
                        }
                      ].map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => setTransistorType(row.id as any)}
                          className={`cursor-pointer transition-colors border-b border-[#21262d] ${
                            transistorType === row.id
                              ? 'bg-[#8957e5]/20 text-white font-bold border-l-4 border-l-[#8957e5]'
                              : 'text-[#c9d1d9] hover:bg-[#161b22]'
                          }`}
                        >
                          <td className="py-1.5 px-2 text-[#d2a8ff] font-bold">{row.name}</td>
                          <td className="py-1.5 px-2 text-[#58a6ff]">{row.control}</td>
                          <td className="py-1.5 px-2 text-[#e3b341]">{row.drive}</td>
                          <td className="py-1.5 px-2 text-[#3fb950] font-bold">{row.vsat}</td>
                          <td className="py-1.5 px-2 text-[#d2a8ff]">{row.speed}</td>
                          <td className="py-1.5 px-2 text-[#8b949e]">{row.app}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DYNAMIC TRANSISTOR THEORY & FORMULAS CARD */}
              <div className="bg-[#0d1117] border border-[#8957e5]/50 rounded-xl p-3.5 flex flex-col gap-2.5 font-mono shadow-xl">
                <div className="flex items-center justify-between border-b border-[#21262d] pb-2 text-xs font-bold text-[#d2a8ff]">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#d2a8ff]" />
                    <span className="uppercase tracking-wider">TRANSISTOR GOVERNING FORMULAS: {transistorType.toUpperCase()}</span>
                  </div>
                  <span className="text-[10px] text-[#e3b341] font-extrabold bg-[#e3b341]/10 px-2 py-0.5 rounded border border-[#e3b341]/30">
                    {transistorType === 'bjt' ? 'Current Driven' : 'Voltage Driven'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px]">
                  <div className="bg-[#161b22] p-2 rounded border border-[#30363d]">
                    <div className="text-[#8b949e] font-bold">Conduction Loss:</div>
                    <div className="text-[#3fb950] font-bold text-[11px] my-0.5">
                      {transistorType === 'mosfet' ? 'P_cond = I_d² × R_ds(on)' : 'P_cond = V_ce(sat) × I_c'}
                    </div>
                    <p className="text-[#8b949e] text-[9px]">
                      {transistorType === 'mosfet' ? 'Dominated by RDS(on) resistance at high current.' : 'Fixed collector voltage drop in saturation mode.'}
                    </p>
                  </div>
                  <div className="bg-[#161b22] p-2 rounded border border-[#30363d]">
                    <div className="text-[#8b949e] font-bold">Switching Loss:</div>
                    <div className="text-[#d2a8ff] font-bold text-[11px] my-0.5">
                      P_sw = 0.5 × V_dc × I_load × (t_on + t_off) × f_sw
                    </div>
                    <p className="text-[#8b949e] text-[9px]">
                      Proportional to switching frequency and overlap duration.
                    </p>
                  </div>
                  <div className="bg-[#161b22] p-2 rounded border border-[#30363d]">
                    <div className="text-[#8b949e] font-bold">Thermal Junction Temp:</div>
                    <div className="text-[#e3b341] font-bold text-[11px] my-0.5">
                      T_j = T_ambient + P_total × R_th(j-a)
                    </div>
                    <p className="text-[#8b949e] text-[9px]">
                      Determines heatsink design requirement to prevent thermal runaway.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLUMN 3 (RIGHT 3.5 COLS): OSCILLOSCOPE WAVEFORMS + DYNAMIC IV CURVE */}
        <div className={`${activeMobileTab === 'scope' ? 'flex' : 'hidden lg:flex'} flex-col gap-3 bg-[#141a24] border border-[#1e293b] p-3.5 rounded-2xl shadow-xl border-t-4 border-t-[#8957e5] w-full lg:w-[330px] xl:w-[360px] lg:shrink-0 lg:h-[calc(100vh-210px)] lg:max-h-[740px] lg:overflow-y-auto scrollbar-none`}>
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2 bg-[#0a0e14] p-2 rounded-t-xl -mx-3.5 -mt-3.5 mb-1 border-l-4 border-l-[#8957e5]">
            <h3 className="text-xs sm:text-sm font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#d2a8ff]" />
              <span>Scope & Live Telemetry</span>
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[#d2a8ff] uppercase tracking-wider">Real-Time DSP</span>
          </div>

          {/* DYNAMIC IV CHARACTERISTIC CANVAS */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#8b949e]">
              <span>CHARACTERISTIC IV / TRANSFER PLOT:</span>
              <span className="text-[#58a6ff]">
                {activeTopic === 'diode'
                  ? 'I_D vs V_D (Exponential)'
                  : activeTopic === 'transistor'
                  ? 'I_D vs V_DS (MOSFET Q-Point)'
                  : activeTopic === 'scr'
                  ? 'V-I Latching Curve'
                  : 'Vdc vs Firing Angle α'}
              </span>
            </div>
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-2">
              <canvas ref={ivCanvasRef} width={340} height={150} className="w-full h-[150px] block" />
            </div>
          </div>

          {/* LIVE DUAL CHANNEL OSCILLOSCOPE & CONTROLS TOOLBAR */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#8b949e]">
              <span>OSCILLOSCOPE WAVEFORMS:</span>
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  onClick={() => setShowChannelA(!showChannelA)}
                  className={`px-1.5 py-0.5 rounded font-bold border transition-all ${
                    showChannelA ? 'bg-[#1f6beb]/20 text-[#58a6ff] border-[#1f6beb]' : 'bg-[#161b22] text-[#484f58] border-[#30363d]'
                  }`}
                >
                  ● CH1 Vin
                </button>
                <button
                  onClick={() => setShowChannelB(!showChannelB)}
                  className={`px-1.5 py-0.5 rounded font-bold border transition-all ${
                    showChannelB ? 'bg-[#238636]/20 text-[#3fb950] border-[#238636]' : 'bg-[#161b22] text-[#484f58] border-[#30363d]'
                  }`}
                >
                  ● CH2 Vout
                </button>
                <button
                  onClick={() => setShowFftMode(!showFftMode)}
                  className={`px-1.5 py-0.5 rounded font-bold border transition-all ${
                    showFftMode ? 'bg-[#8957e5]/20 text-[#d2a8ff] border-[#8957e5]' : 'bg-[#161b22] text-[#8b949e] border-[#30363d]'
                  }`}
                >
                  FFT
                </button>
              </div>
            </div>

            {/* Scope Scale Toolbar */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-1.5 flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-1.5 text-[#8b949e]">
                <span>Volts/Div:</span>
                {[0.5, 1.0, 2.0].map((v) => (
                  <button
                    key={v}
                    onClick={() => setVoltsPerDiv(v)}
                    className={`px-1.5 py-0.5 rounded ${voltsPerDiv === v ? 'bg-[#30363d] text-white font-bold' : 'text-[#8b949e]'}`}
                  >
                    {v}x
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[#8b949e]">
                <span>Timebase:</span>
                {[0.5, 1.0, 2.0].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimePerDiv(t)}
                    className={`px-1.5 py-0.5 rounded ${timePerDiv === t ? 'bg-[#30363d] text-white font-bold' : 'text-[#8b949e]'}`}
                  >
                    {t}x
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-2 relative">
              {fuseBlown && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-3 text-center border border-[#f85149] rounded-xl gap-2">
                  <span className="text-xs font-mono font-bold text-[#f85149] uppercase animate-pulse">
                    ⚠️ HIGH-SPEED SEMICONDUCTOR FUSE TRIPPED (I²t OVERLOAD)
                  </span>
                  <span className="text-[10px] text-[#c9d1d9]">
                    Current surge exceeded 500 A²s I²t rating. Circuit safely isolated.
                  </span>
                  <button
                    onClick={() => {
                      setFuseBlown(false);
                      setDiodeFault('none');
                      setTransistorFault('none');
                      setScrFault('none');
                    }}
                    className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] text-white font-mono text-xs font-bold rounded border border-[#3fb950] transition-all"
                  >
                    RESET FUSE &amp; CLEAR FAULT
                  </button>
                </div>
              )}
              <canvas ref={scopeCanvasRef} width={340} height={140} className="w-full h-[140px] block" />
            </div>
          </div>

          {/* THERMAL HEATSINK & PROTECTION BAR */}
          {(() => {
            let tj = ambientTemp;
            let pLossScr = 0;
            let pBridgeTotal = 0;

            if (activeTopic === 'controlled') {
              const idAvg = ctrlLoadCurrent / 3;
              const idRms = ctrlLoadCurrent / Math.sqrt(3);
              const pCond = 1.1 * idAvg + 0.002 * Math.pow(idRms, 2);
              pLossScr = pCond + 0.05; // 7.65W per SCR at 20A
              pBridgeTotal = 6 * pCond; // 45.6W total bridge loss
              tj = 25 + pLossScr * 3.92; // 55.0°C at 20A
            } else {
              tj = ambientTemp + (activeTopic === 'transistor' ? 1.5 : 3.2) * heatsinkRth;
            }

            return (
              <div className="bg-[#0d1117] border border-[#e3b341]/40 rounded-xl p-2.5 flex flex-col gap-1.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#e3b341] uppercase tracking-wider">
                    THERMAL MODEL &amp; HEATSINK DISSIPATION:
                  </span>
                  <span className={`text-[10px] font-bold ${tj > 125 ? 'text-[#f85149]' : 'text-[#3fb950]'}`}>
                    T_j = {tj.toFixed(1)}°C (Max 150°C)
                  </span>
                </div>
                {activeTopic === 'controlled' ? (
                  <div className="flex flex-col gap-1 text-[10px] text-[#8b949e] border-t border-[#21262d] pt-1 mt-0.5">
                    <div className="flex justify-between">
                      <span>Formula: <b>P_loss = Vto·Id_avg + rT·Id_rms² + Esw·fsw</b></span>
                      <span className="text-[#3fb950] font-bold">Vto=1.1V, rT=2mΩ</span>
                    </div>
                    <div className="flex justify-between text-[#c9d1d9]">
                      <span>Id_avg={ (ctrlLoadCurrent/3).toFixed(2) }A | Id_rms={ (ctrlLoadCurrent/Math.sqrt(3)).toFixed(2) }A</span>
                      <span>P_loss/SCR = <b>{pLossScr.toFixed(2)} W</b> (Bridge Total: <b>{pBridgeTotal.toFixed(1)} W</b>)</span>
                    </div>
                    <div className="text-[#e3b341] font-bold">
                      T_j = T_a (25°C) + P_loss · R_th(3.92°C/W) = 25°C + {(pLossScr * 3.92).toFixed(1)}°C = {tj.toFixed(1)}°C
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-[#8b949e]">
                    <div>R_th(j-a): <b className="text-white">{heatsinkRth} °C/W</b></div>
                    <div>Ambient T_a: <b className="text-white">{ambientTemp} °C</b></div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* AUTOMATED METRICS READOUTS TABLE */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="bg-[#161b22] p-2 rounded border border-[#21262d]">
              <div className="text-[10px] text-[#8b949e]">OUTPUT Vdc (AVG):</div>
              <div className={`text-sm font-bold ${fuseBlown ? 'text-[#f85149]' : 'text-[#3fb950]'}`}>
                {fuseBlown ? '0.0 V' : activeTopic === 'diode'
                  ? (diodeFault === 'short' ? '0.00 V' : diodeFault === 'open' ? `${(diodeAcVac * Math.SQRT2).toFixed(1)} V` : `${(diodeAcVac * 0.45).toFixed(1)} V`)
                  : activeTopic === 'rectifiers'
                  ? `${(rectifierVac * (rectifierType === 'half' ? 0.45 : rectifierType === 'three_phase' ? 1.35 : 0.90)).toFixed(1)} V`
                  : activeTopic === 'transistor'
                  ? (!gateDriveOn || transistorFault === 'gate_open' ? '0.00 V' : `${(busVoltage * (pwmDuty / 100)).toFixed(1)} V`)
                  : activeTopic === 'scr'
                  ? `${Math.max(0, (0.45 * scrAnodeVin * (1 + Math.cos((scrFiringAlpha * Math.PI) / 180)) / 2) - 1.4).toFixed(1)} V`
                  : (() => {
                      const aRad = (firingAngle * Math.PI) / 180;
                      if (ctrlRectType === '1ph_half') {
                        return `${Math.max(0, (0.45 * 230 / 2) * (1 + Math.cos(aRad)) - 1.4).toFixed(1)} V`;
                      } else if (ctrlRectType === '1ph_full') {
                        return `${Math.max(0, (0.90 * 230) * Math.cos(aRad) - 2.8).toFixed(1)} V`;
                      } else {
                        const vdcIdeal = (3 * Math.SQRT2 / Math.PI) * 415 * Math.cos(aRad);
                        const deltaVcomm = (3 * (2 * Math.PI * 50) * (commutationLc / 1000) * ctrlLoadCurrent) / Math.PI;
                        return `${Math.max(0, vdcIdeal - deltaVcomm - 2.8).toFixed(1)} V`;
                      }
                    })()}
              </div>
            </div>

            <div className="bg-[#161b22] p-2 rounded border border-[#21262d]">
              <div className="text-[10px] text-[#8b949e]">FORM FACTOR (FF):</div>
              <div className="text-sm font-bold text-[#58a6ff]">
                {activeTopic === 'rectifiers'
                  ? (rectifierType === 'half' ? '1.57' : rectifierType === 'three_phase' ? '1.00' : '1.11')
                  : activeTopic === 'controlled'
                  ? (ctrlRectType === '3ph_6pulse' ? '1.00' : '1.11')
                  : '1.11'}
              </div>
            </div>

            <div className="bg-[#161b22] p-2 rounded border border-[#21262d]">
              <div className="text-[10px] text-[#8b949e]">RIPPLE FACTOR (RF):</div>
              <div className={`text-sm font-bold ${
                activeTopic === 'rectifiers' && rectifierType === 'half' ? 'text-[#f85149]' : 'text-[#e3b341]'
              }`}>
                {activeTopic === 'rectifiers'
                  ? (rectifierType === 'half' ? '121 %' : rectifierType === 'three_phase' ? '4.2 %' : '48.2 %')
                  : activeTopic === 'controlled'
                  ? (ctrlRectType === '3ph_6pulse' ? '4.2 %' : '48.2 %')
                  : '48.2 %'}
              </div>
            </div>

            <div className="bg-[#161b22] p-2 rounded border border-[#21262d]">
              <div className="text-[10px] text-[#8b949e]">FUSE / STATUS:</div>
              <div className={`text-sm font-bold ${fuseBlown ? 'text-[#f85149]' : 'text-[#3fb950]'}`}>
                {fuseBlown ? 'BLOWN' : 'OK (100A)'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LEARNING TEXT & MULTIMETER TROUBLESHOOTING BANNER */}
      <div className="bg-[#161b22] border border-[#1f6beb]/40 rounded-xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1f6beb]/20 border border-[#1f6beb] flex items-center justify-center text-[#58a6ff] text-lg font-bold shrink-0">
            💡
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-[#58a6ff] uppercase tracking-wider">
              {activeTopic === 'diode'
                ? 'PRACTICAL TESTING & MULTIMETER DIAGNOSTICS:'
                : activeTopic === 'rectifiers'
                ? 'KEY RECTIFIER INSIGHT:'
                : activeTopic === 'transistor'
                ? 'MOSFET / IGBT SWITCHING INSIGHT:'
                : activeTopic === 'scr'
                ? 'THYRISTOR PLANT INSIGHT & TROUBLESHOOTING:'
                : 'CONTROLLED RECTIFICATION INSIGHT:'}
            </span>
            <p className="text-xs text-[#c9d1d9] font-sans leading-relaxed">
              {activeTopic === 'diode' ? (
                <>
                  &quot;Diode is a one-way valve. Check with multimeter diode mode:{' '}
                  <span className="font-mono font-bold text-[#3fb950]">0.4 - 0.7V</span> forward,{' '}
                  <span className="font-mono font-bold text-[#e3b341]">OL</span> reverse.&quot;
                </>
              ) : activeTopic === 'rectifiers' ? (
                rectifierType === 'half' ? (
                  <span className="font-mono font-bold text-[#f85149]">
                    &quot;Ripple 121%, never used in industry &gt;100W&quot;
                  </span>
                ) : rectifierType === 'center_tap' ? (
                  <span className="font-mono font-bold text-[#e3b341]">
                    &quot;Ripple 48%, requires center-tapped transformer (PIV=2Vm), used in low voltage dual rail supplies&quot;
                  </span>
                ) : rectifierType === 'full_bridge' ? (
                  <span className="font-mono font-bold text-[#e3b341]">
                    &quot;Ripple 48%, used in single phase control supply&quot;
                  </span>
                ) : (
                  <span className="font-mono font-bold text-[#3fb950]">
                    &quot;Ripple 4.2%, base for industrial battery charger, but uncontrolled&quot;
                  </span>
                )
              ) : activeTopic === 'transistor' ? (
                transistorType === 'bjt' ? (
                  <>
                    &quot;BJT requires ~100mA base current drive (current-controlled). Higher base drive losses and slow switching limit efficiency in modern chargers.&quot;
                  </>
                ) : transistorType === 'mosfet' ? (
                  <>
                    &quot;Power MOSFET is voltage-controlled (needs 10V Vgs). Ultra-fast switching (&gt;100kHz) and low Vds(on)=0.15V make it the top choice for modern USB-C &amp; SMPS chargers (&lt;600V).&quot;
                  </>
                ) : (
                  <>
                    &quot;IGBT combines MOSFET voltage gate drive with BJT high power density. Standard in modern high-power EV fast chargers (&gt;600V), completely replacing heavy legacy SCR chargers.&quot;
                  </>
                )
              ) : activeTopic === 'scr' ? (
                <>
                  &quot;In plant: If SCR fails short, fuse blows. If gate wire open, missing pulse in gate waveform T1-T6 screen. Holding Current Ih = 50mA, Latching Current Il = 80mA.&quot;
                </>
              ) : (
                <>
                  &quot;Vdc output is directly controlled by firing angle α: Vdc = Vdc0 × cos(α). At α &gt; 90° with inductive load, charger enters Inverter (Regenerative) mode.&quot;
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] bg-[#0d1117] px-3 py-2 rounded-lg border border-[#30363d] shrink-0 text-[#8b949e]">
          <ShieldCheck className="w-4 h-4 text-[#3fb950]" />
          <span>Educational Power Semiconductor Models (IEC 60747-2 Reference)</span>
        </div>
      </div>
    </div>
  ) : (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 my-3 items-stretch">
      {TOPICS.map((topic) => {
        const isDone = completedTopics[topic.id];
        return (
          <button
            key={topic.id}
            onClick={() => setActiveTopic(topic.id)}
            className="group relative flex flex-col justify-between text-left p-4.5 md:p-5 rounded-2xl border-2 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 overflow-hidden cursor-pointer w-full h-[210px]"
            style={{
              backgroundColor: `${topic.colorHex}0f`,
              borderColor: `${topic.colorHex}40`
            }}
          >
            {/* Top Glowing Accent Strip */}
            <div
              className="absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 group-hover:h-2"
              style={{ backgroundColor: topic.colorHex }}
            />

            {/* Subtle Background Radial Light Overlay */}
            <div
              className="absolute -right-10 -bottom-10 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-25 group-hover:opacity-50 transition-opacity"
              style={{ backgroundColor: topic.colorHex }}
            />

            <div>
              {/* Top Row: Icon Box, Standard Badge, Completion Badge */}
              <div className="flex items-center justify-between gap-2 mb-2.5 pt-0.5">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl border shadow-inner transition-transform group-hover:scale-110 shrink-0"
                  style={{
                    backgroundColor: `${topic.colorHex}22`,
                    borderColor: `${topic.colorHex}60`
                  }}
                >
                  <span>{topic.icon}</span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0a0e14]/90 border border-slate-700/60 text-slate-200">
                    {topic.standard}
                  </span>
                  {isDone && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500 text-emerald-400">
                      ✔ DONE
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Badge */}
              <div className="flex flex-col gap-1 mb-2">
                <span
                  className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded w-fit border"
                  style={{
                    backgroundColor: `${topic.colorHex}20`,
                    borderColor: `${topic.colorHex}50`,
                    color: topic.colorHex
                  }}
                >
                  {topic.badgeText}
                </span>
                <h3 className="text-base md:text-lg font-black text-white group-hover:text-blue-300 transition-colors leading-tight tracking-tight mt-0.5 line-clamp-1">
                  {topic.title}
                </h3>
              </div>

              {/* Short Description */}
              <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-2">
                {topic.shortDesc}
              </p>
            </div>

            {/* Bottom Action Footer */}
            <div className="pt-2.5 border-t border-slate-700/50 flex items-center justify-between mt-auto w-full">
              <span className="text-xs font-mono font-bold text-slate-200 group-hover:text-white transition-colors flex items-center gap-1.5">
                <span>Launch Section</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" style={{ color: topic.colorHex }} />
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0a0e14]/90 border border-slate-700/60 text-slate-300 font-bold group-hover:border-slate-500">
                Interactive Lab
              </span>
            </div>
          </button>
        );
      })}
    </div>
  )}

      {/* 5. FIXED BOTTOM TAB BAR FOR MOBILE */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a0e14]/90 backdrop-blur-md border-t border-[#1e293b] flex items-center justify-around z-40 select-none">
        <button
          onClick={() => setActiveMobileTab('controls')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[44px] transition-all cursor-pointer ${
            activeMobileTab === 'controls' ? 'text-[#10b981] font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-5 h-5" />
          <span className="text-[10px]">Controls</span>
        </button>

        <button
          onClick={() => setActiveMobileTab('circuit')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[44px] transition-all cursor-pointer ${
            activeMobileTab === 'circuit' ? 'text-[#10b981] font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-5 h-5" />
          <span className="text-[10px]">Circuit</span>
        </button>

        <button
          onClick={() => setActiveMobileTab('scope')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[44px] transition-all cursor-pointer ${
            activeMobileTab === 'scope' ? 'text-[#10b981] font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px]">Scope</span>
        </button>
      </div>
    </div>
  );
};
