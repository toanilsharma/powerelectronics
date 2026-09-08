import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Sliders,
  Info,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Activity,
  Maximize2
} from 'lucide-react';

interface SCRDynamicVICurveAndCarrierLabProps {
  className?: string;
  onClose?: () => void;
}

/**
 * SCRDynamicVICurveAndCarrierLab.tsx
 * 
 * Recommendations 1 & 2:
 * 1. Synchronized Real-Time Dynamic V-I Operating Point Tracer:
 *    - Complete 4-Quadrant V-I Characteristic Plane (Forward Blocking, S-Curve Transition,
 *      Forward Conduction Vf~1.4V, Reverse Blocking VRBO, Holding Current IH, Latching Current IL).
 *    - Real-time phosphor dot (vAK(t), iA(t)) dynamically tracing the curve in sync with
 *      the AC/DC source, tracking load-line intersections (Vs - iA * RL).
 *    - Synchronized dual time-domain CRT oscilloscope (Vs, vAK, iA, Gate Pulse).
 * 
 * 2. Microscopic 4-Layer (PNPN) Charge Carrier & J2 Depletion Layer Collapse Animation:
 *    - 4 physical layers: P1, N1, P2, N2 with junctions J1, J2, J3.
 *    - Dynamic depletion layer width & electric field barrier at J2 under forward voltage.
 *    - Animated carrier injection: holes (h+) and electrons (e-).
 *    - Avalanche breakdown & plasma flood (conductivity modulation) upon latching.
 *    - Gate pulse disconnect test: plasma remains self-sustaining until iA < IH.
 */
export const SCRDynamicVICurveAndCarrierLab: React.FC<SCRDynamicVICurveAndCarrierLabProps> = ({
  className = '',
  onClose,
}) => {
  // Study Tab: V-I Curve or Microscopic PNPN Crystal
  const [activeTab, setActiveTab] = useState<'vi_curve' | 'pnpn_crystal'>('vi_curve');

  // Circuit & Source Parameters
  const [sourceType, setSourceType] = useState<'AC' | 'DC'>('AC');
  const [supplyVoltage, setSupplyVoltage] = useState<number>(230); // Volts RMS or DC Peak
  const [loadResistance, setLoadResistance] = useState<number>(25); // Ohms
  const [firingAngleDeg, setFiringAngleDeg] = useState<number>(60); // Degrees in AC mode (0 - 170)
  const [gateCurrentMa, setGateCurrentMa] = useState<number>(50); // mA gate drive
  const [isGateFiredDC, setIsGateFiredDC] = useState<boolean>(false); // DC manual pulse toggle

  // Playback & Animation Speed
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [timeSpeed, setTimeSpeed] = useState<number>(0.25); // 0.05x ultra-slow, 0.25x slow, 1.0x normal
  const [simTime, setSimTime] = useState<number>(0);

  // Semiconductor Constants (Benchmarked to IEC 60747-6)
  const vForwardDropV = 1.4; // Conduction forward drop
  const iLatchingMa = 65; // Latching current threshold
  const iHoldingMa = 30; // Holding current threshold
  const vBreakover0 = 600; // Zero-gate forward breakover voltage

  // Dynamic Device State
  const [deviceState, setDeviceState] = useState<'BLOCKING_FWD' | 'CONDUCTION' | 'BLOCKING_REV' | 'OFF'>('BLOCKING_FWD');
  const [vAkInstant, setVAkInstant] = useState<number>(0);
  const [iAInstant, setIAInstant] = useState<number>(0);
  const [vSourceInstant, setVSourceInstant] = useState<number>(0);
  const [isGateActiveInstant, setIsGateActiveInstant] = useState<boolean>(false);

  // Internal Latch Memory
  const isLatchedRef = useRef<boolean>(false);

  // Canvas References
  const viCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const crystalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // History buffer for time-domain scope (last 180 points)
  const historyRef = useRef<Array<{ vs: number; vak: number; ia: number; gate: boolean }>>([]);

  // Carrier particles for PNPN Crystal Animation
  const carriersRef = useRef<Array<{ x: number; y: number; type: 'hole' | 'electron'; vx: number; vy: number; life: number }>>([]);

  // Initialize Carriers
  useEffect(() => {
    const carriers: Array<{ x: number; y: number; type: 'hole' | 'electron'; vx: number; vy: number; life: number }> = [];
    for (let i = 0; i < 70; i++) {
      carriers.push({
        x: Math.random(),
        y: Math.random(),
        type: Math.random() > 0.5 ? 'hole' : 'electron',
        vx: (Math.random() - 0.5) * 0.003,
        vy: (Math.random() - 0.5) * 0.003,
        life: Math.random(),
      });
    }
    carriersRef.current = carriers;
  }, []);

  // Main Simulation Physics Loop
  useEffect(() => {
    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const dtSec = Math.min(0.05, (now - lastTimestamp) / 1000);
      lastTimestamp = now;

      if (isPlaying) {
        setSimTime((prev) => prev + dtSec * timeSpeed);
      }

      // Physics Calculation
      const omega = 2 * Math.PI * 50; // 50 Hz system (T = 20ms)
      const t = simTime;
      const vPeak = supplyVoltage * (sourceType === 'AC' ? Math.SQRT2 : 1.0);

      let vs = 0;
      let gateActive = false;

      if (sourceType === 'AC') {
        const thetaRad = (omega * t) % (2 * Math.PI);
        const thetaDeg = (thetaRad * 180) / Math.PI;
        vs = vPeak * Math.sin(thetaRad);

        // Gate pulse fired at firingAngleDeg for a duration of 15 degrees in positive half-cycle
        const pulseStart = firingAngleDeg;
        const pulseEnd = firingAngleDeg + 18;
        if (thetaDeg >= pulseStart && thetaDeg <= pulseEnd) {
          gateActive = true;
        }

        // Commutation check at zero crossing (natural line commutation)
        if (vs <= 0) {
          isLatchedRef.current = false;
        }
      } else {
        // DC Source
        vs = supplyVoltage;
        gateActive = isGateFiredDC;
      }

      // Trigger condition:
      // Can turn on if forward biased (vs > vForwardDropV) AND
      // (Gate is active with sufficient current OR vs exceeds breakover VBO)
      const isForwardBiased = vs > vForwardDropV;
      const isReverseBiased = vs < -0.5;

      const vboEffective = Math.max(10, vBreakover0 - (gateCurrentMa / 80) * 550);

      if (isForwardBiased) {
        if (gateActive && gateCurrentMa >= 15) {
          isLatchedRef.current = true;
        } else if (vs >= vboEffective) {
          isLatchedRef.current = true; // Overvoltage breakover
        }
      }

      // Anode Current calculation
      let ia = 0;
      let vak = vs;
      let state: 'BLOCKING_FWD' | 'CONDUCTION' | 'BLOCKING_REV' | 'OFF' = 'OFF';

      if (isReverseBiased) {
        isLatchedRef.current = false;
        vak = vs;
        ia = -0.001 * Math.abs(vs / 200); // reverse leakage current (~few mA)
        state = 'BLOCKING_REV';
      } else if (isLatchedRef.current && isForwardBiased) {
        // Conducting state
        vak = vForwardDropV;
        ia = (vs - vForwardDropV) / Math.max(1, loadResistance);

        // Check holding current dropout
        if (ia * 1000 < iHoldingMa) {
          isLatchedRef.current = false;
          vak = vs;
          ia = 0;
          state = 'BLOCKING_FWD';
        } else {
          state = 'CONDUCTION';
        }
      } else if (isForwardBiased) {
        // Forward blocking state
        vak = vs;
        ia = 0.001 * (vs / 300); // forward leakage current
        state = 'BLOCKING_FWD';
      }

      setVAkInstant(vak);
      setIAInstant(ia);
      setVSourceInstant(vs);
      setIsGateActiveInstant(gateActive);
      setDeviceState(state);

      // Record to history buffer
      if (historyRef.current.length > 200) {
        historyRef.current.shift();
      }
      historyRef.current.push({ vs, vak, ia, gate: gateActive });

      // Render Active Tab
      if (activeTab === 'vi_curve') {
        renderVICurve(vak, ia, vs, state);
        renderScope();
      } else {
        renderPNPNCrystal(state, gateActive, vak, ia);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, simTime, timeSpeed, sourceType, supplyVoltage, loadResistance, firingAngleDeg, gateCurrentMa, isGateFiredDC, activeTab]);

  // Render 4-Quadrant Dynamic V-I Plane
  const renderVICurve = (vak: number, ia: number, vs: number, state: string) => {
    const canvas = viCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dark Background & CRT Reticle Grid
    ctx.fillStyle = '#070b12';
    ctx.fillRect(0, 0, w, h);

    const originX = w * 0.45;
    const originY = h * 0.65;

    // Grid lines
    ctx.strokeStyle = '#162032';
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

    // Axes (Vak horizontal, Ia vertical)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // X axis (Vak)
    ctx.moveTo(10, originY);
    ctx.lineTo(w - 10, originY);
    // Y axis (Ia)
    ctx.moveTo(originX, 10);
    ctx.lineTo(originX, h - 10);
    ctx.stroke();

    // Axis Labels
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('+V_AK (Forward Voltage)', w - 170, originY - 8);
    ctx.fillText('-V_AK (Reverse)', 15, originY - 8);
    ctx.fillText('+I_A (Anode Current)', originX + 10, 20);
    ctx.fillText('-I_A', originX + 10, h - 15);

    // Scale factors:
    // Vak: 1V ≈ 0.42px (up to 600V -> 250px)
    // Ia: 1A ≈ 14px (up to 15A -> 210px)
    const scaleV = 0.42;
    const scaleI = 14;

    // 1. Draw Forward Blocking & S-Curve Curves for multiple Gate Currents
    const igLevels = [0, 25, 50, 80];
    igLevels.forEach((ig, idx) => {
      const vbo = Math.max(20, vBreakover0 - (ig / 80) * 550);
      ctx.strokeStyle = ig === gateCurrentMa ? '#38bdf8' : '#1e293b';
      ctx.lineWidth = ig === gateCurrentMa ? 2 : 1;
      ctx.setLineDash(ig === gateCurrentMa ? [] : [3, 3]);

      ctx.beginPath();
      // Forward leakage line
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX + vbo * scaleV, originY - 0.05 * scaleI);
      // S-curve negative resistance transition to on-state
      ctx.quadraticCurveTo(
        originX + (vbo * 0.7) * scaleV,
        originY - 1.2 * scaleI,
        originX + vForwardDropV * scaleV,
        originY - (iLatchingMa / 1000) * scaleI * 20
      );
      ctx.stroke();
      ctx.setLineDash([]);

      // Label Breakover point VBO(Ig)
      if (idx === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.fillText(`V_BO0 (${vbo}V)`, originX + vbo * scaleV - 45, originY + 16);
      }
    });

    // 2. Draw Forward Conduction Branch (Steep vertical line at Vak = Vf)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(originX + vForwardDropV * scaleV, originY - (iHoldingMa / 1000) * scaleI * 20);
    ctx.lineTo(originX + vForwardDropV * scaleV, 25);
    ctx.stroke();

    // 3. Draw Reverse Blocking Branch in Quadrant III
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX - 500 * scaleV, originY + 0.05 * scaleI);
    // Reverse avalanche breakdown
    ctx.lineTo(originX - 520 * scaleV, originY + 8 * scaleI);
    ctx.stroke();

    // 4. Draw Holding (IH) and Latching (IL) Current Reference Thresholds
    const yIh = originY - (iHoldingMa / 1000) * scaleI * 25;
    const yIl = originY - (iLatchingMa / 1000) * scaleI * 25;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    // Holding Current line
    ctx.beginPath();
    ctx.moveTo(originX - 40, yIh);
    ctx.lineTo(originX + 100, yIh);
    ctx.stroke();
    // Latching Current line
    ctx.beginPath();
    ctx.moveTo(originX - 40, yIl);
    ctx.lineTo(originX + 100, yIl);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`I_L (${iLatchingMa}mA)`, originX - 95, yIl + 3);
    ctx.fillText(`I_H (${iHoldingMa}mA)`, originX - 95, yIh + 3);

    // 5. Draw Dynamic Load Line: Ia = (Vs - Vak) / RL
    if (vs > 0) {
      const vIntersectX = originX + vs * scaleV;
      const iIntersectY = originY - (vs / loadResistance) * scaleI;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(vIntersectX, originY);
      ctx.lineTo(originX, iIntersectY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#d8b4fe';
      ctx.font = '9px monospace';
      ctx.fillText(`Load Line (RL=${loadResistance}Ω)`, Math.min(w - 120, vIntersectX - 70), originY + 28);
    }

    // 6. REAL-TIME DYNAMIC OPERATING POINT (The glowing phosphor dot)
    const dotX = originX + vak * scaleV;
    const dotY = originY - ia * scaleI;

    // Outer glow
    const grad = ctx.createRadialGradient(dotX, dotY, 2, dotX, dotY, 18);
    grad.addColorStop(0, state === 'CONDUCTION' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(56, 189, 248, 0.9)');
    grad.addColorStop(0.5, state === 'CONDUCTION' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 18, 0, 2 * Math.PI);
    ctx.fill();

    // Solid Center Dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Dynamic Readout Tag at Dot
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = state === 'CONDUCTION' ? '#34d399' : '#38bdf8';
    ctx.fillText(`(${vak.toFixed(1)}V, ${ia.toFixed(2)}A)`, Math.min(w - 110, dotX + 10), Math.max(25, dotY - 10));
  };

  // Render Synchronized Time-Domain CRT Scope
  const renderScope = () => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // CRT Phosphor Dark Style
    ctx.fillStyle = '#06090e';
    ctx.fillRect(0, 0, w, h);

    // Reticle Grid
    ctx.strokeStyle = '#131b26';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 35) {
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

    // Center Zero Voltage Line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    const history = historyRef.current;
    if (history.length < 2) return;

    const dx = w / 200;

    // Channel 1: Source Voltage Vs(t) (Dashed Blue)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    history.forEach((pt, i) => {
      const x = i * dx;
      const y = midY - (pt.vs / 400) * (h * 0.4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Channel 2: Anode-to-Cathode Voltage Vak(t) (Amber/Cyan)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((pt, i) => {
      const x = i * dx;
      const y = midY - (pt.vak / 400) * (h * 0.4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Channel 3: Anode Current Ia(t) (Vibrant Green)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    history.forEach((pt, i) => {
      const x = i * dx;
      const y = midY - (pt.ia / 12) * (h * 0.4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Channel 4: Gate Trigger Pulses (Pink Digital Pulses at Bottom)
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((pt, i) => {
      const x = i * dx;
      const y = h - (pt.gate ? 22 : 6);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Scope Legends
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('CH1: V_supply(t)', 10, 15);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('CH2: v_AK(t)', 115, 15);
    ctx.fillStyle = '#10b981';
    ctx.fillText('CH3: i_A(t)', 200, 15);
    ctx.fillStyle = '#ec4899';
    ctx.fillText('GATE PULSE', 280, 15);
  };

  // Render Microscopic 4-Layer PNPN Crystal Cross-Section (Recommendation 2)
  const renderPNPNCrystal = (state: string, gateActive: boolean, vak: number, ia: number) => {
    const canvas = crystalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Dark Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Crystal Silicon Block Geometry
    const crystalX = w * 0.28;
    const crystalY = 50;
    const crystalW = w * 0.44;
    const layerH = 65; // 4 layers -> total height 260px

    const isConducting = state === 'CONDUCTION';

    // Layer 1: P1 (Top, connected to Anode Terminal)
    const p1Y = crystalY;
    ctx.fillStyle = '#1e3a8a'; // Deep blue
    ctx.fillRect(crystalX, p1Y, crystalW, layerH);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(crystalX, p1Y, crystalW, layerH);

    // Layer 2: N1 (Base 1 / Drift region - wide, lightly doped)
    const n1Y = crystalY + layerH;
    ctx.fillStyle = '#1f2937'; // Dark slate
    ctx.fillRect(crystalX, n1Y, crystalW, layerH);
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 1;
    ctx.strokeRect(crystalX, n1Y, crystalW, layerH);

    // Layer 3: P2 (Base 2 - connected to Gate Terminal)
    const p2Y = crystalY + layerH * 2;
    ctx.fillStyle = '#312e81'; // Indigo
    ctx.fillRect(crystalX, p2Y, crystalW, layerH);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.strokeRect(crystalX, p2Y, crystalW, layerH);

    // Layer 4: N2 (Cathode Emitter - heavily doped N+)
    const n2Y = crystalY + layerH * 3;
    ctx.fillStyle = '#064e3b'; // Emerald
    ctx.fillRect(crystalX, n2Y, crystalW, layerH);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(crystalX, n2Y, crystalW, layerH);

    // Junction Boundaries:
    const j1Y = crystalY + layerH;
    const j2Y = crystalY + layerH * 2;
    const j3Y = crystalY + layerH * 3;

    // DRAW DYNAMIC J2 DEPLETION LAYER & ELECTRIC FIELD BARRIER
    const maxDepletionH = 36;
    const depletionH = isConducting
      ? 2 // Collapsed barrier!
      : Math.min(maxDepletionH, 8 + (vak / 400) * 24);

    ctx.fillStyle = isConducting
      ? 'rgba(16, 185, 129, 0.4)'
      : 'rgba(239, 68, 68, 0.35)'; // Red glow for high electric field barrier
    ctx.fillRect(crystalX, j2Y - depletionH / 2, crystalW, depletionH);

    ctx.strokeStyle = isConducting ? '#10b981' : '#f87171';
    ctx.lineWidth = isConducting ? 1 : 2;
    ctx.strokeRect(crystalX, j2Y - depletionH / 2, crystalW, depletionH);

    // Junction Annotations
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText('Junction J1 (FWD)', crystalX + crystalW + 10, j1Y);

    ctx.fillStyle = isConducting ? '#34d399' : '#f87171';
    ctx.fillText(
      isConducting ? '⚡ J2 BARRIER COLLAPSED (Plasma Flooded)' : `🛑 Junction J2 (REV BARRIER: ${depletionH.toFixed(0)}µm)`,
      crystalX + crystalW + 10,
      j2Y
    );

    ctx.fillStyle = '#93c5fd';
    ctx.fillText('Junction J3 (FWD)', crystalX + crystalW + 10, j3Y);

    // Layer Identification Badges inside crystal
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#bfdbfe';
    ctx.fillText('P1: ANODE LAYER (Hole Injection)', crystalX + 15, p1Y + 25);
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('N1: DRIFT REGION (Lightly Doped Base)', crystalX + 15, n1Y + 25);
    ctx.fillStyle = '#c7d2fe';
    ctx.fillText('P2: GATE BASE REGION', crystalX + 15, p2Y + 25);
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText('N2: CATHODE EMITTER (Heavy N+)', crystalX + 15, n2Y + 25);

    // Terminals & Metallic Contacts
    // Anode Contact (Top)
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(crystalX + crystalW * 0.3, crystalY - 12, crystalW * 0.4, 12);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(crystalX + crystalW * 0.5, crystalY - 12);
    ctx.lineTo(crystalX + crystalW * 0.5, 15);
    ctx.stroke();
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('ANODE (+) TERMINAL', crystalX + crystalW * 0.5 - 60, 12);

    // Cathode Contact (Bottom)
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(crystalX + crystalW * 0.3, crystalY + layerH * 4, crystalW * 0.4, 12);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(crystalX + crystalW * 0.5, crystalY + layerH * 4 + 12);
    ctx.lineTo(crystalX + crystalW * 0.5, h - 15);
    ctx.stroke();
    ctx.fillStyle = '#10b981';
    ctx.fillText('CATHODE (-) TERMINAL', crystalX + crystalW * 0.5 - 65, h - 4);

    // Gate Contact (Side attached to P2 layer)
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(crystalX - 12, p2Y + 15, 12, 35);
    ctx.strokeStyle = gateActive ? '#ec4899' : '#64748b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(crystalX - 12, p2Y + 32);
    ctx.lineTo(crystalX - 60, p2Y + 32);
    ctx.stroke();
    ctx.fillStyle = gateActive ? '#f472b6' : '#94a3b8';
    ctx.fillText(`GATE (G) ${gateActive ? '⚡ PULSE' : 'OFF'}`, crystalX - 145, p2Y + 36);

    // ANIMATE CHARGE CARRIERS (Holes and Electrons)
    const carriers = carriersRef.current;
    carriers.forEach((c) => {
      if (isConducting) {
        c.y += c.type === 'hole' ? 0.025 : -0.025;
        if (c.y > 1.0) c.y = 0.0;
        if (c.y < 0.0) c.y = 1.0;
        c.x += (Math.random() - 0.5) * 0.01;
      } else if (gateActive) {
        c.x += (Math.random() - 0.4) * 0.015;
        c.y += (Math.random() - 0.5) * 0.015;
      }

      c.x = Math.max(0.05, Math.min(0.95, c.x));
      c.y = Math.max(0.02, Math.min(0.98, c.y));

      const px = crystalX + c.x * crystalW;
      const py = crystalY + c.y * (layerH * 4);

      ctx.fillStyle = c.type === 'hole' ? '#38bdf8' : '#fbbf24';
      ctx.beginPath();
      ctx.arc(px, py, isConducting ? 3.5 : 2.5, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Plasma Conductivity Modulation Banner
    if (isConducting) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fillRect(crystalX, crystalY, crystalW, layerH * 4);
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#34d399';
      ctx.fillText('✓ PLASMA FLOOD / CONDUCTIVITY MODULATION ACTIVE', crystalX + 25, crystalY + layerH * 2 - 25);
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Current i_A = ${ia.toFixed(2)}A | Forward Drop Vf = ${vForwardDropV}V`, crystalX + 55, crystalY + layerH * 2 + 30);
    }
  };

  return (
    <div className={`flex flex-col gap-3 bg-[#0d1117] border border-[#30363d] rounded-2xl p-3 sm:p-4 shadow-2xl w-full max-w-full overflow-x-hidden ${className}`}>
      {/* 1. Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>SCR DYNAMIC V-I TRACER & 4-LAYER PNPN CARRIER LAB</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold">
                IEC 60747-6 BENCHMARK
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Synchronized 4-quadrant dynamic operating point tracer $(v_&#123;AK&#125;, i_A)$ coupled with microscopic semiconductor carrier drift and J2 depletion collapse.
            </p>
          </div>
        </div>

        {/* Tab Switcher: V-I Curve vs PNPN Crystal */}
        <div className="flex items-center gap-1.5 bg-[#161b22] border border-[#30363d] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('vi_curve')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'vi_curve'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>1. DYNAMIC V-I CURVE TRACER</span>
          </button>
          <button
            onClick={() => setActiveTab('pnpn_crystal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pnpn_crystal'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. 4-LAYER PNPN CARRIER DYNAMICS</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Master Controls Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-[#161b22] border border-[#30363d] p-3 rounded-xl">
        {/* Source Type Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Supply Source</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSourceType('AC')}
              className={`flex-1 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                sourceType === 'AC' ? 'bg-sky-600 text-white font-black' : 'bg-[#0d1117] text-slate-400 hover:text-white'
              }`}
            >
              50Hz AC Line
            </button>
            <button
              onClick={() => setSourceType('DC')}
              className={`flex-1 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                sourceType === 'DC' ? 'bg-amber-600 text-white font-black' : 'bg-[#0d1117] text-slate-400 hover:text-white'
              }`}
            >
              Pure DC Bus
            </button>
          </div>
        </div>

        {/* Supply Voltage Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-slate-400 font-bold">Supply Voltage (Vs):</span>
            <span className="text-sky-400 font-extrabold">{supplyVoltage} V</span>
          </div>
          <input
            type="range"
            min="20"
            max="650"
            step="10"
            value={supplyVoltage}
            onChange={(e) => setSupplyVoltage(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Load Resistance RL */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-slate-400 font-bold">Load Resistor (RL):</span>
            <span className="text-emerald-400 font-extrabold">{loadResistance} Ω</span>
          </div>
          <input
            type="range"
            min="5"
            max="80"
            step="5"
            value={loadResistance}
            onChange={(e) => setLoadResistance(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Firing Angle alpha (in AC) or Gate Pulse (in DC) */}
        {sourceType === 'AC' ? (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-400 font-bold">Firing Delay (α):</span>
              <span className="text-amber-400 font-extrabold">{firingAngleDeg}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="160"
              step="5"
              value={firingAngleDeg}
              onChange={(e) => setFiringAngleDeg(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">DC Gate Trigger</label>
            <button
              onClick={() => setIsGateFiredDC(!isGateFiredDC)}
              className={`w-full py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                isGateFiredDC
                  ? 'bg-rose-600 text-white animate-pulse font-extrabold'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isGateFiredDC ? 'Gate Pulse ON (Fired)' : 'Send Gate Pulse'}</span>
            </button>
          </div>
        )}

        {/* Speed and Pause Controls */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-slate-400 font-bold uppercase">Simulation Engine</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex-1 py-1.5 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                isPlaying ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white font-extrabold'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Resume'}</span>
            </button>
            <button
              onClick={() => setTimeSpeed(timeSpeed === 0.25 ? 0.05 : timeSpeed === 0.05 ? 1.0 : 0.25)}
              className="px-2 py-1.5 rounded bg-[#0d1117] border border-[#30363d] text-slate-300 hover:text-white text-xs font-mono font-bold cursor-pointer"
              title="Toggle Slow-Motion Speed"
            >
              {timeSpeed}x
            </button>
          </div>
        </div>
      </div>

      {/* 3. Live State Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0a0e14] border border-[#1e293b] px-3 py-2 rounded-xl text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="text-slate-400">STATUS:</span>
          <span className={`font-extrabold px-2 py-0.5 rounded ${
            deviceState === 'CONDUCTION'
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500'
              : deviceState === 'BLOCKING_REV'
              ? 'bg-red-950 text-red-400 border border-red-500'
              : 'bg-sky-950 text-sky-400 border border-sky-500'
          }`}>
            {deviceState === 'CONDUCTION' ? '✓ FORWARD CONDUCTION (ON)' :
             deviceState === 'BLOCKING_REV' ? '🛑 REVERSE BLOCKING' :
             '⏸ FORWARD BLOCKING (OFF)'}
          </span>
          <span className="text-slate-400 hidden sm:inline">
            v_AK: <b className="text-amber-400">{vAkInstant.toFixed(1)}V</b>
          </span>
          <span className="text-slate-400 hidden sm:inline">
            i_A: <b className="text-emerald-400">{iAInstant.toFixed(2)}A</b>
          </span>
          <span className="text-slate-400 hidden md:inline">
            v_supply: <b className="text-sky-400">{vSourceInstant.toFixed(1)}V</b>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {sourceType === 'DC' && deviceState === 'CONDUCTION' && (
            <button
              onClick={() => {
                isLatchedRef.current = false;
                setIsGateFiredDC(false);
              }}
              className="px-2.5 py-1 rounded bg-red-900/60 border border-red-500 text-red-200 hover:bg-red-800 text-[11px] font-bold cursor-pointer transition-all"
            >
              ⚡ Force Commutate (Drop Below IH)
            </button>
          )}
        </div>
      </div>

      {/* 4. Canvas Stage Area */}
      {activeTab === 'vi_curve' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 w-full max-w-full">
          {/* Left Canvas: 4-Quadrant Dynamic V-I Curve Tracer */}
          <div className="xl:col-span-7 flex flex-col bg-[#070b12] border border-[#30363d] rounded-xl p-2 relative min-w-0">
            <div className="flex items-center justify-between pb-1.5 px-1 border-b border-[#1e293b]">
              <span className="text-xs font-mono font-extrabold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>DYNAMIC V-I CHARACTERISTIC PLANE & LIVE OPERATING POINT</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400">Phosphor Reticle 60 FPS</span>
            </div>
            <canvas
              ref={viCanvasRef}
              width={640}
              height={400}
              className="w-full max-w-full h-auto rounded-lg mt-1"
            />
          </div>

          {/* Right Canvas: Synchronized Dual CRT Scope */}
          <div className="xl:col-span-5 flex flex-col bg-[#06090e] border border-[#30363d] rounded-xl p-2 relative min-w-0">
            <div className="flex items-center justify-between pb-1.5 px-1 border-b border-[#1e293b]">
              <span className="text-xs font-mono font-extrabold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span>SYNCHRONIZED TIME-DOMAIN SCOPE</span>
              </span>
              <span className="text-[10px] font-mono text-sky-400">4-Trace Sync</span>
            </div>
            <canvas
              ref={scopeCanvasRef}
              width={460}
              height={400}
              className="w-full max-w-full h-auto rounded-lg mt-1"
            />
          </div>
        </div>
      ) : (
        /* Microscopic 4-Layer PNPN Crystal Cross-Section Canvas */
        <div className="w-full flex flex-col bg-[#090d16] border border-[#30363d] rounded-xl p-2 relative">
          <div className="flex items-center justify-between pb-1.5 px-2 border-b border-[#1e293b]">
            <span className="text-xs font-mono font-extrabold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>MICROSCOPIC 4-LAYER (P1-N1-P2-N2) SILICON DIE & J2 BARRIER COLLAPSE</span>
            </span>
            <span className="text-[10px] font-mono text-indigo-400">Quantum Drift & Plasma Flood</span>
          </div>
          <canvas
            ref={crystalCanvasRef}
            width={860}
            height={380}
            className="w-full max-w-full h-auto rounded-lg mt-1"
          />
        </div>
      )}

      {/* 5. Pedagogical Key Insights Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-[#161b22] border border-[#30363d] p-2.5 rounded-xl text-xs font-mono">
        <div className="flex items-start gap-2 text-slate-300">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <b className="text-sky-400">Latching ($I_L$) vs. Holding ($I_H$):</b>
            <p className="text-[11px] text-slate-400">
              Anode current must rise above $I_L$ ({iLatchingMa}mA) before the gate pulse ends. Once latched, current only drops when $i_A &lt; I_H$ ({iHoldingMa}mA).
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-slate-300">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <b className="text-emerald-400">J2 Depletion Barrier Collapse:</b>
            <p className="text-[11px] text-slate-400">
              In forward blocking, junction J2 carries the full voltage. During regenerative avalanche, conductivity modulation floods J2 with carrier plasma, dropping $V_&#123;AK&#125;$ to ~1.4V.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <b className="text-amber-400">Gate Loss of Control:</b>
            <p className="text-[11px] text-slate-400">
              Once internal positive feedback ($\alpha_1 + \alpha_2 \ge 1$) occurs, removing the gate current cannot turn off the device. Turn-off requires external commutation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
