import React, { useEffect, useRef, useState } from 'react';
import { ActiveFaults } from '../types/batteryCharger';
import { 
  Activity, 
  Pause, 
  Play, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Zap,
  Maximize2,
  Info,
  Sliders,
  AlertTriangle,
  FileText,
  Layers,
  Sparkles,
  CheckCircle2,
  ListFilter
} from 'lucide-react';

interface BatteryChargerWaveformsProps {
  voltageIn?: number;
  loadPct?: number;
  firingAngle?: number; // in degrees, e.g. 67
  sourceInductanceMh?: number;
  q1Closed?: boolean;
  q2Closed?: boolean;
  q3Closed?: boolean;
  isRunning?: boolean;
  soc?: number;
  activeFaults?: ActiveFaults;
  hasLcFilter?: boolean;
  compact?: boolean;
}

interface EventLogEntry {
  id: string;
  time: string;
  type: 'INFO' | 'WARNING' | 'FAULT';
  message: string;
}

export const BatteryChargerWaveforms: React.FC<BatteryChargerWaveformsProps> = ({
  voltageIn = 415,
  loadPct = 85,
  firingAngle = 67,
  sourceInductanceMh = 0.8,
  q1Closed = true,
  q2Closed = true,
  q3Closed = true,
  isRunning = true,
  soc = 87,
  activeFaults,
  hasLcFilter = true,
  compact = false,
}) => {
  // Oscilloscope Canvas References
  const canvasOscRef = useRef<HTMLCanvasElement | null>(null);
  const canvasDcRef = useRef<HTMLCanvasElement | null>(null);
  const canvasBatRef = useRef<HTMLCanvasElement | null>(null);
  const canvasGateRef = useRef<HTMLCanvasElement | null>(null);

  // Active Tab inside Right Panel: 'waveforms' | 'gate' | 'measurements' | 'events'
  const [activeTab, setActiveTab] = useState<'waveforms' | 'gate' | 'measurements' | 'events'>('waveforms');

  // DSO Interactive State
  const [timebaseMs, setTimebaseMs] = useState<number>(5); // 2ms, 5ms, 10ms, 20ms per division
  const [voltsPerDiv, setVoltsPerDiv] = useState<number>(100); // 50V, 100V, 200V per division
  const [signalMode, setSignalMode] = useState<'PHASE_NEUTRAL' | 'LINE_LINE'>('PHASE_NEUTRAL');
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [panOffset, setPanOffset] = useState<number>(0);

  // Channel Visibility Checkboxes
  const [channels, setChannels] = useState({
    acInput: true,  // 3-Phase AC Input (Va, Vb, Vc)
    dcVoltage: true,// DC Output Voltage Vdc
    dcCurrent: true,// DC Load Current Idc
    battery: true,  // Battery Vbat & Ibat
    gatePulses: true// SCR Gate Pulses T1-T6
  });

  const toggleChannel = (ch: keyof typeof channels) => {
    setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));
  };

  // Event Log State
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString(),
      type: 'INFO',
      message: 'Digital Storage Oscilloscope initialized. 50Hz AC Phase Synchronized.'
    }
  ]);

  // Log active faults dynamically
  useEffect(() => {
    const time = new Date().toLocaleTimeString();
    if (activeFaults?.scrT3Open) {
      setEventLog((prev) => [{ id: `f-${Date.now()}`, time, type: 'FAULT', message: 'SCR T3 (Phase B Top) Open Circuit Fault Detected' }, ...prev.slice(0, 15)]);
    }
    if (activeFaults?.acPhaseLossL2) {
      setEventLog((prev) => [{ id: `f-${Date.now()}`, time, type: 'FAULT', message: 'AC Input Phase L2 Voltage Loss Detected' }, ...prev.slice(0, 15)]);
    }
    if (activeFaults?.dcOvervoltage) {
      setEventLog((prev) => [{ id: `f-${Date.now()}`, time, type: 'FAULT', message: 'DC Bus Output Overvoltage Runaway (>145V)' }, ...prev.slice(0, 15)]);
    }
    if (activeFaults?.controlFuseBlown) {
      setEventLog((prev) => [{ id: `f-${Date.now()}`, time, type: 'FAULT', message: 'Control Power Transformer Fuse Blown - Gating Lost' }, ...prev.slice(0, 15)]);
    }
  }, [activeFaults]);

  // Telemetry state calculated from physics
  const [readouts, setReadouts] = useState({
    vAcRms: 415.0,
    vAcPeak: 586.9,
    vdc: 122.6,
    idc: 42.5,
    iLoad: 42.5,
    vBat: 122.6,
    iBat: 7.5,
    rippleV: 0.45,
    ripplePct: 0.36,
    thdi: 14.5,
    overlapMu: 4.2,
    cellV: 2.23,
    freq: 50.0,
  });

  const fadeFactorRef = useRef<number>(q1Closed ? 1 : 0);
  const animTimeRef = useRef<number>(0);

  // 1. Digital Readouts Physics Loop
  useEffect(() => {
    if (!isRunning && !isFrozen) return;

    const interval = setInterval(() => {
      let targetVdc = 0;
      if (activeFaults?.dcOvervoltage) {
        targetVdc = 145.0;
      } else if (activeFaults?.controlFuseBlown) {
        targetVdc = q2Closed ? (1.85 + (soc / 100) * 0.38) * 55 : 0;
      } else if (activeFaults?.equalizeForgotten) {
        targetVdc = 137.5;
      } else if (q1Closed && isRunning) {
        const rad = (firingAngle * Math.PI) / 180;
        targetVdc = 122.65 * (voltageIn / 415) * (Math.cos(rad) / Math.cos((67 * Math.PI) / 180));
        if (activeFaults?.scrT3Open) targetVdc *= 0.75;
        if (activeFaults?.acPhaseLossL2) targetVdc *= 0.80;
      } else if (q2Closed) {
        let vCellFromSoc = 2.10;
        if (soc <= 0) vCellFromSoc = 1.85;
        else if (soc <= 25) vCellFromSoc = 1.85 + (soc / 250);
        else if (soc <= 50) vCellFromSoc = 1.95 + ((soc - 25) / 500);
        else if (soc <= 75) vCellFromSoc = 2.00 + ((soc - 50) / 250);
        else vCellFromSoc = 2.10 + ((soc - 75) / 192.3);
        targetVdc = vCellFromSoc * 55;
      }

      if (activeFaults?.looseTerminal && q3Closed && loadPct > 0) {
        targetVdc = Math.max(85, targetVdc - 26.5);
      }

      let targetIdc = 0;
      if (q3Closed && targetVdc > 50) {
        targetIdc = (targetVdc / 110) * (loadPct / 100) * 50;
        if (activeFaults?.controlFuseBlown) targetIdc = 0;
        if (activeFaults?.roomFanFail) targetIdc = Math.min(targetIdc, 25.0);
      }

      const targetIBat = q2Closed
        ? q1Closed && isRunning
          ? Math.max(0, 50 - targetIdc)
          : q3Closed
          ? -targetIdc
          : 0
        : 0;

      let calculatedRippleV = 0.45;
      if (q1Closed && isRunning && !activeFaults?.controlFuseBlown) {
        if (activeFaults?.filterCapOpen || !hasLcFilter) {
          calculatedRippleV = 4.85 + (loadPct / 100) * 1.2;
        } else if (activeFaults?.scrT3Open) {
          calculatedRippleV = 8.5;
        } else if (activeFaults?.acPhaseLossL2) {
          calculatedRippleV = 14.2;
        } else {
          calculatedRippleV = 0.45 + (loadPct / 100) * 0.4;
        }
      }

      const calculatedRipplePct = targetVdc > 0 ? (calculatedRippleV / targetVdc) * 100 : 0;

      let calculatedThdi = 0.5;
      if (q1Closed && isRunning && !activeFaults?.controlFuseBlown) {
        const baseTHD = 28.0;
        const alphaPenalty = 0.15 * firingAngle;
        const filterReduction = hasLcFilter ? 18.0 : 0;
        calculatedThdi = Math.min(35.0, Math.max(4.0, baseTHD + alphaPenalty - filterReduction));
      }

      // Commutation Overlap Angle mu calculation
      const radAlpha = (firingAngle * Math.PI) / 180;
      const omega = 2 * Math.PI * 50;
      const cosAlphaPlusMu = Math.cos(radAlpha) - (2 * omega * (sourceInductanceMh / 1000) * targetIdc) / (Math.SQRT2 * voltageIn);
      const alphaPlusMu = Math.acos(Math.max(-1, Math.min(1, cosAlphaPlusMu)));
      const muDeg = Math.max(0, ((alphaPlusMu * 180) / Math.PI) - firingAngle);

      const vCell = targetVdc > 0 ? targetVdc / 55 : 0;
      const noise = () => (Math.random() - 0.5) * 0.12;

      setReadouts({
        vAcRms: parseFloat((voltageIn + noise() * 0.5).toFixed(1)),
        vAcPeak: parseFloat((voltageIn * Math.SQRT2 + noise() * 0.8).toFixed(1)),
        vdc: Math.max(0, parseFloat((targetVdc + noise() * 0.6).toFixed(1))),
        idc: Math.max(0, parseFloat((targetIdc + noise() * 0.3).toFixed(1))),
        iLoad: Math.max(0, parseFloat((targetIdc + noise() * 0.3).toFixed(1))),
        vBat: Math.max(0, parseFloat((targetVdc + noise() * 0.5).toFixed(1))),
        iBat: parseFloat((targetIBat + noise() * 0.3).toFixed(1)),
        rippleV: Math.max(0.1, parseFloat((calculatedRippleV + noise() * 0.03).toFixed(2))),
        ripplePct: Math.max(0.1, parseFloat((calculatedRipplePct + noise() * 0.03).toFixed(2))),
        thdi: Math.max(0.1, parseFloat((calculatedThdi + noise() * 0.05).toFixed(1))),
        overlapMu: parseFloat((muDeg + noise() * 0.05).toFixed(1)),
        cellV: Math.max(0, parseFloat((vCell + noise() * 0.003).toFixed(2))),
        freq: parseFloat((50.0 + noise() * 0.02).toFixed(2)),
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, isFrozen, q1Closed, q2Closed, q3Closed, voltageIn, loadPct, firingAngle, sourceInductanceMh, soc, activeFaults, hasLcFilter]);

  // Generate Dynamic "What Changed?" Explanation String
  const getWhatChangedExplanation = (): { title: string; desc: string; type: 'fault' | 'warning' | 'info' } => {
    if (activeFaults?.scrT3Open) {
      return {
        title: '🚨 FAULT INJECTED: Thyristor SCR T3 Open Circuit',
        desc: 'Phase B top SCR failure opens leg T3. DC output voltage drops ~25% with 150Hz asymmetrical ripple dip every 6.67ms.',
        type: 'fault'
      };
    }
    if (activeFaults?.acPhaseLossL2) {
      return {
        title: '🚨 FAULT INJECTED: AC Input Phase L2 Loss',
        desc: 'Utility Phase L2 is zero. Rectifier operates single-phase with ~20% voltage drop and heavy 100Hz ripple (14.2%).',
        type: 'fault'
      };
    }
    if (activeFaults?.dcOvervoltage) {
      return {
        title: '🚨 FAULT INJECTED: DC Bus Overvoltage Runaway',
        desc: 'Control loop failure forces Vdc to 145.0VDC. Protection Relay 59 operated alert.',
        type: 'fault'
      };
    }
    if (activeFaults?.controlFuseBlown) {
      return {
        title: '🚨 FAULT INJECTED: Control Transformer Fuse Blown',
        desc: 'Thyristor gate firing pulses lost. Rectifier output is 0VDC (Battery supplies load if Q2 closed).',
        type: 'fault'
      };
    }
    if (activeFaults?.filterCapOpen || !hasLcFilter) {
      return {
        title: '⚡ OPERATING CHANGE: DC Filter Capacitor Open / Bypassed',
        desc: 'DC LC filter smoothing disabled. Unfiltered 6-pulse rectified wave displays heavy AC ripple voltage (4.85V pk-pk).',
        type: 'warning'
      };
    }
    if (sourceInductanceMh > 0.8) {
      return {
        title: '⚡ PARAMETER CHANGE: Source Inductance Ls Increased',
        desc: `Commutating reactance Ls = ${sourceInductanceMh}mH. Phase overlap angle μ increased to ${readouts.overlapMu}° during SCR commutation.`,
        type: 'info'
      };
    }
    if (firingAngle !== 67) {
      return {
        title: `⚡ PARAMETER CHANGE: SCR Firing Angle α = ${firingAngle}°`,
        desc: firingAngle < 67
          ? `Thyristors fire earlier in AC cycle (${firingAngle}°), increasing average DC output voltage to ${readouts.vdc}V.`
          : `Thyristors fire later in AC cycle (${firingAngle}°), decreasing average DC output voltage to ${readouts.vdc}V.`,
        type: 'info'
      };
    }
    if (loadPct > 90) {
      return {
        title: `⚡ PARAMETER CHANGE: High Load Demand (${loadPct}%)`,
        desc: `Heavy load demand increases DC output current to ${readouts.idc}A with slight voltage regulation droop.`,
        type: 'info'
      };
    }
    return {
      title: '✓ NOMINAL SIMULATION ENGINE STATUS',
      desc: `6-Pulse SCR Bridge synchronized at α = ${firingAngle}°. Voltage Vdc = ${readouts.vdc}V, Idc = ${readouts.idc}A. All systems nominal.`,
      type: 'info'
    };
  };

  const whatChanged = getWhatChangedExplanation();

  // 2. Oscilloscope Canvas Render Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      if (isRunning && !isFrozen) {
        animTimeRef.current += 0.35;
      }

      const targetFade = q1Closed ? 1 : 0;
      fadeFactorRef.current += (targetFade - fadeFactorRef.current) * 0.15;
      const fade = fadeFactorRef.current;
      const tTime = animTimeRef.current;

      const totalSpanMs = 10 * timebaseMs;

      // -------------------------------------------------------------
      // CANVAS 1: 3-PHASE AC INPUT OSCILLOSCOPE (CH1, CH2, CH3)
      // -------------------------------------------------------------
      const oscCanvas = canvasOscRef.current;
      if (oscCanvas && channels.acInput && activeTab === 'waveforms') {
        const ctx = oscCanvas.getContext('2d');
        if (ctx) {
          const W = oscCanvas.width;
          const H = oscCanvas.height;

          // DSO Dark Background
          ctx.fillStyle = '#030712';
          ctx.fillRect(0, 0, W, H);

          // Grid Reticle - 10 Vert Divs, 8 Horiz Divs
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;

          for (let i = 0; i <= 10; i++) {
            const x = (i / 10) * W;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();

            // Center Micro-Ticks
            ctx.strokeStyle = '#334155';
            ctx.beginPath();
            ctx.moveTo(x, H / 2 - 4);
            ctx.lineTo(x, H / 2 + 4);
            ctx.stroke();
            ctx.strokeStyle = '#1e293b';
          }

          for (let i = 0; i <= 8; i++) {
            const y = (i / 8) * H;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
          }

          // Zero Axis Center Line
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, H / 2);
          ctx.lineTo(W, H / 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Voltage Peak Math
          const vPeakLL = voltageIn * Math.SQRT2;
          const vPeakLN = vPeakLL / Math.sqrt(3);
          const peakVal = signalMode === 'LINE_LINE' ? vPeakLL : vPeakLN;
          const totalVoltsSpan = 8 * voltsPerDiv;

          const phases = [
            { name: 'L1 (Va)', color: '#ef4444', shift: 0 },
            { name: 'L2 (Vb)', color: '#eab308', shift: (-2 * Math.PI) / 3 },
            { name: 'L3 (Vc)', color: '#3b82f6', shift: (2 * Math.PI) / 3 },
          ];

          phases.forEach((p) => {
            ctx.beginPath();
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2.2;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 4;

            for (let x = 0; x <= W; x += 2) {
              const tMs = (x / W) * totalSpanMs;
              const omegaT = (2 * Math.PI * (tMs + tTime + panOffset)) / 20.0;
              let vInstant = peakVal * Math.sin(omegaT + p.shift) * fade;

              if (p.name.includes('L2') && activeFaults?.acPhaseLossL2) {
                vInstant = 0;
              }

              const y = H / 2 - (vInstant / totalVoltsSpan) * H;

              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
          });

          // FAULT OVERLAY MARKER (If AC fault active)
          if (activeFaults?.acPhaseLossL2) {
            const faultX = W * 0.45;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(faultX, 10);
            ctx.lineTo(faultX, H - 10);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#ef4444';
            ctx.fillRect(faultX - 55, 12, 110, 18);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('🚨 FAULT: PHASE L2 LOSS', faultX - 50, 24);
          }

          // Scope Header OSD
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`3Φ AC INPUT (${signalMode === 'LINE_LINE' ? 'L-L 415V' : 'L-N 240V'}) | ${voltsPerDiv}V/div | ${timebaseMs}ms/div`, 10, 15);
        }
      }

      // -------------------------------------------------------------
      // CANVAS 2: DC OUTPUT VOLTAGE (CH4 Vdc) & CURRENT (CH3 Idc)
      // -------------------------------------------------------------
      const dcCanvas = canvasDcRef.current;
      if (dcCanvas && channels.dcVoltage && activeTab === 'waveforms') {
        const ctx = dcCanvas.getContext('2d');
        if (ctx) {
          const W = dcCanvas.width;
          const H = dcCanvas.height;

          // Clear
          ctx.fillStyle = '#030712';
          ctx.fillRect(0, 0, W, H);

          // Grid
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          for (let v = 0; v <= 200; v += 40) {
            const y = H - (v / 200) * (H - 20) - 10;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();

            ctx.fillStyle = '#64748b';
            ctx.font = '9px monospace';
            ctx.fillText(`${v}V`, 4, y - 2);
          }

          // 122.65V Float Reference Line
          const targetY = H - (122.65 / 200) * (H - 20) - 10;
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, targetY);
          ctx.lineTo(W, targetY);
          ctx.stroke();
          ctx.setLineDash([]);

          let vdcLevel = 0;
          if (activeFaults?.dcOvervoltage) {
            vdcLevel = 145.0;
          } else if (q1Closed && isRunning) {
            const rad = (firingAngle * Math.PI) / 180;
            vdcLevel = 122.65 * (voltageIn / 415) * (Math.cos(rad) / Math.cos((67 * Math.PI) / 180));
            if (activeFaults?.scrT3Open) vdcLevel *= 0.75;
            if (activeFaults?.acPhaseLossL2) vdcLevel *= 0.80;
          } else if (q2Closed) {
            let vCellFromSoc = 2.10;
            if (soc <= 0) vCellFromSoc = 1.85;
            else if (soc <= 25) vCellFromSoc = 1.85 + (soc / 250);
            else if (soc <= 50) vCellFromSoc = 1.95 + ((soc - 25) / 500);
            else if (soc <= 75) vCellFromSoc = 2.00 + ((soc - 50) / 250);
            else vCellFromSoc = 2.10 + ((soc - 75) / 192.3);
            vdcLevel = vCellFromSoc * 55;
          }

          const rippleAmp = hasLcFilter && !activeFaults?.filterCapOpen
            ? 0.45 + (loadPct / 100) * 0.4
            : 4.85 + (loadPct / 100) * 1.2;

          ctx.beginPath();
          const traceColor = activeFaults?.dcOvervoltage || activeFaults?.scrT3Open || activeFaults?.acPhaseLossL2
            ? '#ef4444'
            : '#10b981';

          ctx.strokeStyle = traceColor;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = traceColor;
          ctx.shadowBlur = 4;

          for (let x = 0; x <= W; x += 2) {
            const tMs = (x / W) * totalSpanMs;
            let vInst = vdcLevel;

            if (q1Closed && isRunning) {
              if (activeFaults?.scrT3Open) {
                const cycleMs = (tMs + tTime + panOffset) % 20;
                const isT3Slot = cycleMs >= 6.0 && cycleMs <= 10.0;
                const dip = isT3Slot ? 0.65 : 1.0;
                const rippleAngle = (2 * Math.PI * 150 * (tMs + tTime + panOffset)) / 1000;
                vInst = vdcLevel * dip + rippleAmp * Math.abs(Math.sin(rippleAngle));
              } else if (activeFaults?.acPhaseLossL2) {
                const rippleAngle = (2 * Math.PI * 100 * (tMs + tTime + panOffset)) / 1000;
                vInst = vdcLevel + rippleAmp * Math.abs(Math.sin(rippleAngle));
              } else {
                const rippleAngle = (2 * Math.PI * 300 * (tMs + tTime + panOffset)) / 1000;
                vInst = vdcLevel + rippleAmp * Math.abs(Math.sin(rippleAngle));
              }
            }

            const y = H - (vInst / 200) * (H - 20) - 10;

            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          // FAULT OVERLAY MARKER (SCR T3 / Overvoltage)
          if (activeFaults?.scrT3Open) {
            const faultX = W * 0.55;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(faultX, 10);
            ctx.lineTo(faultX, H - 10);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#ef4444';
            ctx.fillRect(faultX - 55, 12, 110, 18);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('🚨 FAULT: SCR T3 OPEN', faultX - 48, 24);
          }

          // Header Label
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`DC RECTIFIED VOLTAGE (Vdc) | ${hasLcFilter ? 'LC FILTERED' : 'UNFILTERED RIPPLE'}`, 10, 15);
        }
      }

      // -------------------------------------------------------------
      // CANVAS 3: BATTERY & LOAD CURRENT WAVEFORMS
      // -------------------------------------------------------------
      const batCanvas = canvasBatRef.current;
      if (batCanvas && channels.battery && activeTab === 'waveforms') {
        const ctx = batCanvas.getContext('2d');
        if (ctx) {
          const W = batCanvas.width;
          const H = batCanvas.height;

          // Clear
          ctx.fillStyle = '#030712';
          ctx.fillRect(0, 0, W, H);

          // Grid
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          for (let i = 0; i <= 4; i++) {
            const y = (i / 4) * H;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
          }

          // Draw Battery Current Trace (Purple #a855f7) & Load Current Trace (Cyan #06b6d4)
          ctx.beginPath();
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 3;

          for (let x = 0; x <= W; x += 2) {
            const tMs = (x / W) * totalSpanMs;
            const noise = Math.sin((2 * Math.PI * 50 * (tMs + tTime + panOffset)) / 1000) * 1.5;
            const iInst = readouts.iBat + noise;
            // Map -50A to +50A across H
            const y = H / 2 - (iInst / 50) * (H / 2 - 10);

            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Header Label
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`BATTERY CURRENT (Ibat = ${readouts.iBat.toFixed(1)}A) | LOAD CURRENT (${readouts.iLoad.toFixed(1)}A)`, 10, 15);
        }
      }

      // -------------------------------------------------------------
      // CANVAS 4: SCR GATE FIRING PULSES TIMELINE (T1..T6)
      // -------------------------------------------------------------
      const gateCanvas = canvasGateRef.current;
      if (gateCanvas && (activeTab === 'gate' || (activeTab === 'waveforms' && channels.gatePulses))) {
        const ctx = gateCanvas.getContext('2d');
        if (ctx) {
          const W = gateCanvas.width;
          const H = gateCanvas.height;

          // Clear
          ctx.fillStyle = '#030712';
          ctx.fillRect(0, 0, W, H);

          const channelHeight = (H - 20) / 6;
          const scrNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
          const basePhaseDeg = [0, 60, 120, 180, 240, 300];

          scrNames.forEach((scr, i) => {
            const yTop = 15 + i * channelHeight;

            // Channel Line
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(40, yTop + channelHeight / 2);
            ctx.lineTo(W, yTop + channelHeight / 2);
            ctx.stroke();

            // SCR Label
            const isT3Fault = scr === 'T3' && activeFaults?.scrT3Open;
            ctx.fillStyle = isT3Fault ? '#ef4444' : '#94a3b8';
            ctx.font = isT3Fault ? 'bold 10px monospace' : '10px monospace';
            ctx.fillText(isT3Fault ? 'T3 ✕' : scr, 8, yTop + channelHeight / 2 + 3);

            // Gate Pulses Generation
            if (q1Closed && isRunning && !isT3Fault && !activeFaults?.controlFuseBlown) {
              const startDeg = basePhaseDeg[i] + firingAngle;
              const pulseWidthDeg = 60;

              ctx.fillStyle = '#f97316';

              for (let x = 40; x < W; x += 1.5) {
                const tMs = ((x - 40) / (W - 40)) * totalSpanMs;
                const currentDeg = (((tMs + tTime + panOffset) / 20.0) * 360) % 360;

                const endDeg = startDeg + pulseWidthDeg;
                let isPulseOn = false;

                if (endDeg < 360) {
                  isPulseOn = currentDeg >= startDeg && currentDeg <= endDeg;
                } else {
                  isPulseOn = currentDeg >= startDeg || currentDeg <= endDeg % 360;
                }

                if (isPulseOn) {
                  ctx.fillRect(x, yTop + 2, 2, channelHeight - 4);
                }
              }
            }
          });

          // Vertical Firing Angle α Marker Line
          const alphaX = 40 + ((firingAngle % 360) / 360) * (W - 40);
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(alphaX, 10);
          ctx.lineTo(alphaX, H - 5);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#f97316';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`GATE TIMING α = ${firingAngle.toFixed(1)}°`, W - 140, 12);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isRunning, isFrozen, q1Closed, q2Closed, voltageIn, loadPct, firingAngle, sourceInductanceMh, soc, timebaseMs, voltsPerDiv, signalMode, channels, activeTab, activeFaults, hasLcFilter, panOffset]);

  // Toolbar Handlers
  const handleAutoScale = () => {
    setTimebaseMs(5);
    setVoltsPerDiv(100);
    setPanOffset(0);
  };

  const handleZoomIn = () => {
    setTimebaseMs((prev) => Math.max(2, prev / 1.5));
  };

  const handleZoomOut = () => {
    setTimebaseMs((prev) => Math.min(20, prev * 1.5));
  };

  const handleResetView = () => {
    setTimebaseMs(5);
    setVoltsPerDiv(100);
    setPanOffset(0);
    setIsFrozen(false);
  };

  if (compact) {
    return (
      <div className="flex flex-col gap-2.5 w-full bg-transparent p-0 select-none font-mono">
        {/* WHAT CHANGED EDUCATIONAL BANNER */}
        <div className={`p-2.5 rounded-xl border flex items-start gap-2 text-xs transition-all ${
          whatChanged.type === 'fault'
            ? 'bg-rose-950/60 border-rose-500/60 text-rose-200'
            : whatChanged.type === 'warning'
            ? 'bg-amber-950/60 border-amber-500/60 text-amber-200'
            : 'bg-[#0b1220] border-sky-500/40 text-slate-200'
        }`}>
          <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${
            whatChanged.type === 'fault' ? 'text-rose-400' : whatChanged.type === 'warning' ? 'text-amber-400' : 'text-sky-400'
          }`} />
          <div>
            <span className="font-extrabold block text-[11px] uppercase tracking-wider">{whatChanged.title}</span>
            <p className="text-[10px] text-slate-300 font-sans mt-0.5 leading-tight">{whatChanged.desc}</p>
          </div>
        </div>

        {/* TAB NAVIGATION BAR */}
        <div className="flex items-center justify-between bg-[#0b1220] border border-[#1e293b] p-1 rounded-xl text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('waveforms')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === 'waveforms' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Waveforms
            </button>
            <button
              onClick={() => setActiveTab('gate')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === 'gate' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Gate Pulses
            </button>
            <button
              onClick={() => setActiveTab('measurements')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === 'measurements' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Measurements
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                activeTab === 'events' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Log
            </button>
          </div>

          <button
            onClick={() => setIsFrozen(!isFrozen)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
              isFrozen ? 'bg-amber-500 text-black animate-pulse' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {isFrozen ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {isFrozen ? 'RESUME' : 'FREEZE'}
          </button>
        </div>

        {/* TAB 1: WAVEFORMS */}
        {activeTab === 'waveforms' && (
          <div className="flex flex-col gap-2">
            {/* CHANNEL TOGGLE PILLS */}
            <div className="flex flex-wrap items-center gap-1 bg-[#070b14] border border-[#1e293b] p-1.5 rounded-xl text-[9px]">
              <button
                onClick={() => toggleChannel('acInput')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer border ${
                  channels.acInput ? 'bg-rose-950 text-rose-300 border-rose-500/50' : 'bg-slate-900 text-slate-600 border-slate-800'
                }`}
              >
                3Φ AC Input
              </button>
              <button
                onClick={() => toggleChannel('dcVoltage')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer border ${
                  channels.dcVoltage ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50' : 'bg-slate-900 text-slate-600 border-slate-800'
                }`}
              >
                Vdc Output
              </button>
              <button
                onClick={() => toggleChannel('battery')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer border ${
                  channels.battery ? 'bg-purple-950 text-purple-300 border-purple-500/50' : 'bg-slate-900 text-slate-600 border-slate-800'
                }`}
              >
                Battery I/V
              </button>
            </div>

            {/* 3Φ AC CANVAS */}
            {channels.acInput && (
              <div className="bg-[#030712] border border-[#1e293b] rounded-xl p-2 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-300 font-bold">3Φ AC Input (Va, Vb, Vc)</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-rose-400 font-bold">● L1</span>
                    <span className="text-amber-400 font-bold">● L2</span>
                    <span className="text-blue-400 font-bold">● L3</span>
                  </div>
                </div>
                <canvas
                  ref={canvasOscRef}
                  width={400}
                  height={120}
                  className="w-full h-[100px] block rounded-lg border border-[#1e293b] bg-[#030712]"
                />
              </div>
            )}

            {/* VDC OUTPUT CANVAS */}
            {channels.dcVoltage && (
              <div className="bg-[#030712] border border-[#1e293b] rounded-xl p-2 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-300 font-bold">DC Rectified Voltage (Vdc = {readouts.vdc.toFixed(1)}V)</span>
                  <span className="text-emerald-400 font-bold">● Vdc</span>
                </div>
                <canvas
                  ref={canvasDcRef}
                  width={400}
                  height={120}
                  className="w-full h-[100px] block rounded-lg border border-[#1e293b] bg-[#030712]"
                />
              </div>
            )}

            {/* BATTERY CURRENT CANVAS */}
            {channels.battery && (
              <div className="bg-[#030712] border border-[#1e293b] rounded-xl p-2 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-300 font-bold">Battery &amp; Load Current</span>
                  <span className="text-purple-400 font-bold">● Ibat = {readouts.iBat.toFixed(1)}A</span>
                </div>
                <canvas
                  ref={canvasBatRef}
                  width={400}
                  height={90}
                  className="w-full h-[75px] block rounded-lg border border-[#1e293b] bg-[#030712]"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GATE PULSES */}
        {activeTab === 'gate' && (
          <div className="bg-[#030712] border border-[#1e293b] rounded-xl p-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-300 font-bold">SCR Gate Firing Pulses (T1–T6)</span>
              <span className="text-amber-400 font-bold">α = {firingAngle}°</span>
            </div>
            <canvas
              ref={canvasGateRef}
              width={400}
              height={140}
              className="w-full h-[130px] block rounded-lg border border-[#1e293b] bg-[#030712]"
            />
          </div>
        )}

        {/* TAB 3: MEASUREMENTS */}
        {activeTab === 'measurements' && (
          <div className="grid grid-cols-2 gap-1.5 bg-[#070b14] border border-[#1e293b] p-2 rounded-xl text-xs">
            <div className="p-2 bg-[#0b1220] rounded-lg border border-[#1e293b]">
              <span className="text-[9px] text-slate-400 font-bold block">AC INPUT RMS</span>
              <span className="text-sky-400 font-extrabold">{readouts.vAcRms.toFixed(1)} V</span>
            </div>
            <div className="p-2 bg-[#0b1220] rounded-lg border border-[#1e293b]">
              <span className="text-[9px] text-slate-400 font-bold block">DC OUTPUT VDC</span>
              <span className="text-emerald-400 font-extrabold">{readouts.vdc.toFixed(1)} V</span>
            </div>
            <div className="p-2 bg-[#0b1220] rounded-lg border border-[#1e293b]">
              <span className="text-[9px] text-slate-400 font-bold block">DC LOAD CURRENT</span>
              <span className="text-blue-400 font-extrabold">{readouts.idc.toFixed(1)} A</span>
            </div>
            <div className="p-2 bg-[#0b1220] rounded-lg border border-[#1e293b]">
              <span className="text-[9px] text-slate-400 font-bold block">RIPPLE FACTOR</span>
              <span className="text-amber-400 font-extrabold">{readouts.rippleV.toFixed(2)} V ({readouts.ripplePct.toFixed(1)}%)</span>
            </div>
            <div className="p-2 bg-[#0b1220] rounded-lg border border-[#1e293b]">
              <span className="text-[9px] text-slate-400 font-bold block">CURRENT THDI</span>
              <span className="text-purple-400 font-extrabold">{readouts.thdi.toFixed(1)} %</span>
            </div>
            <div className="p-2 bg-[#0b1220] rounded-lg border border-[#1e293b]">
              <span className="text-[9px] text-slate-400 font-bold block">OVERLAP ANGLE (μ)</span>
              <span className="text-amber-300 font-extrabold">{readouts.overlapMu.toFixed(1)}°</span>
            </div>
          </div>
        )}

        {/* TAB 4: FAULT LOG */}
        {activeTab === 'events' && (
          <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1 text-[10px]">
            {eventLog.map((log) => (
              <div key={log.id} className="p-2 rounded-lg bg-[#070b14] border border-[#1e293b] flex items-start gap-2">
                <span className="text-slate-500 font-mono shrink-0">{log.time}</span>
                <span className={`font-bold shrink-0 ${
                  log.type === 'FAULT' ? 'text-rose-400' : log.type === 'WARNING' ? 'text-amber-400' : 'text-sky-400'
                }`}>
                  [{log.type}]
                </span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 w-full bg-[#0b1220] border border-[#1e293b] rounded-2xl p-4 select-none shadow-2xl font-mono">
      {/* WHAT CHANGED EDUCATIONAL BANNER */}
      <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs transition-all shadow-md ${
        whatChanged.type === 'fault'
          ? 'bg-rose-950/60 border-rose-500/60 text-rose-200'
          : whatChanged.type === 'warning'
          ? 'bg-amber-950/60 border-amber-500/60 text-amber-200'
          : 'bg-[#070b14] border-sky-500/40 text-slate-200'
      }`}>
        <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${
          whatChanged.type === 'fault' ? 'text-rose-400 animate-pulse' : whatChanged.type === 'warning' ? 'text-amber-400' : 'text-sky-400'
        }`} />
        <div>
          <span className="font-extrabold block text-xs uppercase tracking-wider">{whatChanged.title}</span>
          <p className="text-[11px] text-slate-300 font-sans mt-0.5 leading-relaxed">{whatChanged.desc}</p>
        </div>
      </div>

      {/* DSO WORKSPACE TABS & CONTROLS DOCK */}
      <div className="bg-[#070b14] border border-[#1e293b] p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 shadow-md">
        {/* TABS */}
        <div className="flex items-center gap-1 bg-[#0b1220] border border-[#1e293b] p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('waveforms')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'waveforms' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Waveforms
          </button>
          <button
            onClick={() => setActiveTab('gate')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'gate' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔥 Gate Pulses
          </button>
          <button
            onClick={() => setActiveTab('measurements')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'measurements' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            📈 Measurements
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'events' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            📜 Event Log
          </button>
        </div>

        {/* DSO TOOLBAR BUTTONS */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={handleAutoScale}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold cursor-pointer"
            title="Auto Scale Voltage & Timebase"
          >
            Auto Scale
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold cursor-pointer"
            title="Zoom In Timebase"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold cursor-pointer"
            title="Zoom Out Timebase"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFrozen(!isFrozen)}
            className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              isFrozen ? 'bg-amber-500 text-black font-extrabold animate-pulse' : 'bg-emerald-600 text-white shadow-md'
            }`}
          >
            {isFrozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isFrozen ? 'RESUME' : 'FREEZE'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: WAVEFORMS */}
      {activeTab === 'waveforms' && (
        <div className="flex flex-col gap-3">
          {/* CHANNEL SELECTOR PILLS */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#070b14] border border-[#1e293b] p-2 rounded-xl text-xs">
            <span className="text-slate-400 font-bold mr-1 text-[11px]">CHANNELS:</span>
            <button
              onClick={() => toggleChannel('acInput')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                channels.acInput ? 'bg-rose-950 text-rose-300 border-rose-500/50 shadow-sm' : 'bg-[#0b1220] text-slate-500 border-[#1e293b]'
              }`}
            >
              3Φ AC Input (Va, Vb, Vc)
            </button>
            <button
              onClick={() => toggleChannel('dcVoltage')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                channels.dcVoltage ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50 shadow-sm' : 'bg-[#0b1220] text-slate-500 border-[#1e293b]'
              }`}
            >
              DC Output Vdc
            </button>
            <button
              onClick={() => toggleChannel('battery')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                channels.battery ? 'bg-purple-950 text-purple-300 border-purple-500/50 shadow-sm' : 'bg-[#0b1220] text-slate-500 border-[#1e293b]'
              }`}
            >
              Battery Vbat / Ibat
            </button>
            <button
              onClick={() => toggleChannel('gatePulses')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                channels.gatePulses ? 'bg-amber-950 text-amber-300 border-amber-500/50 shadow-sm' : 'bg-[#0b1220] text-slate-500 border-[#1e293b]'
              }`}
            >
              Thyristor Gate Pulses
            </button>
          </div>

          {/* 3Φ AC CANVAS */}
          {channels.acInput && (
            <div className="bg-[#030712] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-bold">📈 CH1: 3-Phase AC Voltage Input</span>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-rose-400 font-bold">● L1 (Va)</span>
                  <span className="text-amber-400 font-bold">● L2 (Vb)</span>
                  <span className="text-blue-400 font-bold">● L3 (Vc)</span>
                </div>
              </div>
              <canvas
                ref={canvasOscRef}
                width={650}
                height={200}
                className="w-full h-[180px] block rounded-lg border border-[#1e293b] bg-[#030712]"
              />
            </div>
          )}

          {/* VDC OUTPUT CANVAS */}
          {channels.dcVoltage && (
            <div className="bg-[#030712] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-bold">⚡ CH2: DC Rectified Voltage Output (Vdc = {readouts.vdc.toFixed(1)}V)</span>
                <span className="text-emerald-400 font-bold text-[10px]">● Vdc (6-Pulse)</span>
              </div>
              <canvas
                ref={canvasDcRef}
                width={650}
                height={160}
                className="w-full h-[140px] block rounded-lg border border-[#1e293b] bg-[#030712]"
              />
            </div>
          )}

          {/* BATTERY CURRENT CANVAS */}
          {channels.battery && (
            <div className="bg-[#030712] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white font-bold">🔋 CH3: Battery Voltage &amp; Current</span>
                <span className="text-purple-400 font-bold text-[10px]">● Ibat = {readouts.iBat.toFixed(1)}A</span>
              </div>
              <canvas
                ref={canvasBatRef}
                width={650}
                height={120}
                className="w-full h-[110px] block rounded-lg border border-[#1e293b] bg-[#030712]"
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GATE PULSES */}
      {activeTab === 'gate' && (
        <div className="bg-[#030712] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white font-bold">🔥 SCR Gate Firing Pulses Timeline (Thyristors T1–T6)</span>
            <span className="text-amber-400 font-bold text-[10px]">Firing Angle α = {firingAngle}°</span>
          </div>
          <canvas
            ref={canvasGateRef}
            width={650}
            height={180}
            className="w-full h-[160px] block rounded-lg border border-[#1e293b] bg-[#030712]"
          />
        </div>
      )}

      {/* TAB 3: MEASUREMENTS */}
      {activeTab === 'measurements' && (
        <div className="bg-[#070b14] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-3">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Comprehensive DSO Telemetry &amp; Power Quality
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-2.5 bg-[#0b1220] border border-[#1e293b] rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block">AC INPUT RMS</span>
              <span className="text-sm font-extrabold text-sky-400">{readouts.vAcRms.toFixed(1)} V</span>
            </div>
            <div className="p-2.5 bg-[#0b1220] border border-[#1e293b] rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block">AC PEAK VOLTAGE</span>
              <span className="text-sm font-extrabold text-sky-300">{readouts.vAcPeak.toFixed(1)} V</span>
            </div>
            <div className="p-2.5 bg-[#0b1220] border border-[#1e293b] rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block">DC BUS VOLTAGE</span>
              <span className="text-sm font-extrabold text-emerald-400">{readouts.vdc.toFixed(1)} V</span>
            </div>
            <div className="p-2.5 bg-[#0b1220] border border-[#1e293b] rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block">DC LOAD CURRENT</span>
              <span className="text-sm font-extrabold text-blue-400">{readouts.idc.toFixed(1)} A</span>
            </div>
            <div className="p-2.5 bg-[#0b1220] border border-[#1e293b] rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block">RIPPLE FACTOR</span>
              <span className="text-sm font-extrabold text-amber-400">{readouts.rippleV.toFixed(2)} V ({readouts.ripplePct.toFixed(1)}%)</span>
            </div>
            <div className="p-2.5 bg-[#0b1220] border border-[#1e293b] rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block">CURRENT THDI</span>
              <span className="text-sm font-extrabold text-purple-400">{readouts.thdi.toFixed(1)} %</span>
            </div>
            <div className="p-2.5 bg-[#0b1220] border border-[#1e293b] rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block">OVERLAP ANGLE (μ)</span>
              <span className="text-sm font-extrabold text-amber-300">{readouts.overlapMu.toFixed(1)}°</span>
            </div>
            <div className="p-2.5 bg-[#0b1220] border border-[#1e293b] rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold block">BATTERY CELL V</span>
              <span className="text-sm font-extrabold text-emerald-300">{readouts.cellV.toFixed(2)} V/cell</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EVENT LOG */}
      {activeTab === 'events' && (
        <div className="bg-[#070b14] border border-[#1e293b] rounded-xl p-3 flex flex-col gap-2">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span>DSO Timestamped Event &amp; Protection Log</span>
            <span className="text-[10px] text-slate-400 font-normal">{eventLog.length} EVENTS</span>
          </h4>
          <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1 text-xs">
            {eventLog.map((log) => (
              <div key={log.id} className="p-2 rounded-lg bg-[#0b1220] border border-[#1e293b] flex items-center gap-3">
                <span className="text-slate-500 font-mono text-[10px] shrink-0">{log.time}</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                  log.type === 'FAULT' ? 'bg-rose-950 text-rose-300 border border-rose-800' : log.type === 'WARNING' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-sky-950 text-sky-300 border border-sky-800'
                }`}>
                  {log.type}
                </span>
                <span className="text-slate-200 font-sans text-xs">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
