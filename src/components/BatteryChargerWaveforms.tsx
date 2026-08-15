import React, { useEffect, useRef, useState } from 'react';
import { ActiveFaults } from '../types/batteryCharger';

interface BatteryChargerWaveformsProps {
  voltageIn: number;
  loadPct: number;
  firingAngle: number; // in degrees, e.g. 30
  q1Closed: boolean;
  q2Closed: boolean;
  q3Closed: boolean;
  isRunning: boolean;
  soc: number;
  activeFaults?: ActiveFaults;
  hasLcFilter?: boolean;
  compact?: boolean;
}

export const BatteryChargerWaveforms: React.FC<BatteryChargerWaveformsProps> = ({
  voltageIn = 415,
  loadPct = 85,
  firingAngle = 30,
  q1Closed = true,
  q2Closed = true,
  q3Closed = true,
  isRunning = true,
  soc = 87,
  activeFaults,
  hasLcFilter = true,
  compact = false,
}) => {
  // References to the 3 canvas elements
  const canvasOscRef = useRef<HTMLCanvasElement | null>(null);
  const canvasDcRef = useRef<HTMLCanvasElement | null>(null);
  const canvasGateRef = useRef<HTMLCanvasElement | null>(null);

  // Digital readouts state with subtle fluctuations
  const [readouts, setReadouts] = useState({
    vdc: 220.0,
    idc: 45.2,
    ripple: 1.8,
    thdi: 14.5,
    cellV: 2.25,
    socVal: 87,
    temp: 32.0,
  });

  // Fade factor for smooth transition when Q1 opens/closes
  const fadeFactorRef = useRef<number>(q1Closed ? 1 : 0);
  const animTimeRef = useRef<number>(0);

  // 1. Digital Readouts Fluctuation Loop (every 100ms)
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // Calculated baseline Vdc
      let targetVdc = 0;
      if (activeFaults?.dcOvervoltage) {
        targetVdc = 145.0;
      } else if (activeFaults?.controlFuseBlown) {
        // No gate pulses generated; charger output is 0V
        targetVdc = q2Closed ? (1.85 + (soc / 100) * 0.38) * 55 : 0;
      } else if (activeFaults?.equalizeForgotten) {
        targetVdc = 137.5; // Equalize boost voltage
      } else if (q1Closed) {
        // Vdc = 122.65V Float nominal at 67 deg firing angle
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

      // Loose terminal voltage dip under load
      if (activeFaults?.looseTerminal && q3Closed && loadPct > 0) {
        targetVdc = Math.max(85, targetVdc - 26.5);
      }

      let targetIdc = 0;
      if (q3Closed && targetVdc > 50) {
        targetIdc = (targetVdc / 110) * (loadPct / 100) * 85;
        if (activeFaults?.controlFuseBlown) targetIdc = 0;
        if (activeFaults?.roomFanFail) targetIdc = Math.min(targetIdc, 25.0); // Thermal derating 50%
      }

      let calculatedRipple = 0.2;
      if (q1Closed && !activeFaults?.controlFuseBlown) {
        if (activeFaults?.filterCapOpen || !hasLcFilter) {
          calculatedRipple = 9.0 + (loadPct / 100) * 1.8; // 9% to 11% high AC ripple
        } else if (activeFaults?.scrT3Open) {
          calculatedRipple = 8.2;
        } else if (activeFaults?.acPhaseLossL2) {
          calculatedRipple = 14.8;
        } else {
          // 6-pulse with C1=4700uF: 1.5% to 4% depending on load
          calculatedRipple = 1.5 + (loadPct / 100) * 1.5;
        }
      }

      // THDi physics formula
      let calculatedThdi = 0.5;
      if (q1Closed && !activeFaults?.controlFuseBlown) {
        const baseTHD = 28.0;
        const alphaPenalty = 0.15 * firingAngle;
        const filterReduction = hasLcFilter ? 18.0 : 0;
        calculatedThdi = baseTHD + alphaPenalty - filterReduction;
        calculatedThdi = Math.min(35.0, Math.max(4.0, calculatedThdi));
      }

      const totalCells = 55;
      const vCell = targetVdc > 0 ? targetVdc / totalCells : 0;
      let calculatedSoc = 0;
      if (vCell <= 1.85) calculatedSoc = 0;
      else if (vCell <= 1.95) calculatedSoc = (vCell - 1.85) * 250;
      else if (vCell <= 2.00) calculatedSoc = 25 + (vCell - 1.95) * 500;
      else if (vCell <= 2.10) calculatedSoc = 50 + (vCell - 2.00) * 250;
      else calculatedSoc = 75 + (vCell - 2.10) * 192.3;

      calculatedSoc = Math.min(100, Math.max(0, calculatedSoc));

      let calculatedTemp = 30 + (loadPct / 100) * 8 + (isRunning ? 2 : 0) + (activeFaults?.dcOvervoltage ? 15 : 0);
      if (activeFaults?.roomFanFail) calculatedTemp = 72.0; // Battery room fan fail thermal rise

      // Add slight jitter (+/- 0.1)
      const noise = () => (Math.random() - 0.5) * 0.2;

      setReadouts({
        vdc: Math.max(0, parseFloat((targetVdc + noise() * 1.5).toFixed(1))),
        idc: Math.max(0, parseFloat((targetIdc + noise() * 0.8).toFixed(1))),
        ripple: Math.max(0.1, parseFloat((calculatedRipple + noise() * 0.05).toFixed(1))),
        thdi: Math.max(0.1, parseFloat((calculatedThdi + noise() * 0.05).toFixed(1))),
        cellV: Math.max(0, parseFloat((vCell + noise() * 0.005).toFixed(2))),
        socVal: Math.round(calculatedSoc),
        temp: parseFloat((calculatedTemp + noise() * 0.3).toFixed(1)),
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, q1Closed, q2Closed, q3Closed, voltageIn, loadPct, firingAngle, soc, activeFaults, hasLcFilter]);

  // 2. Main Canvas Animation Loop (requestAnimationFrame)
  useEffect(() => {
    let animId: number;

    const render = () => {
      if (isRunning) {
        animTimeRef.current += 0.4; // advance time ms
      }

      // Smooth fade transition for Q1 open/close (100ms transition)
      const targetFade = q1Closed ? 1 : 0;
      fadeFactorRef.current += (targetFade - fadeFactorRef.current) * 0.15;
      const fade = fadeFactorRef.current;
      const tTime = animTimeRef.current;

      // -------------------------------------------------------------
      // CANVAS 1: 3-PHASE OSCILLOSCOPE (400x200)
      // -------------------------------------------------------------
      const oscCanvas = canvasOscRef.current;
      if (oscCanvas) {
        const ctx = oscCanvas.getContext('2d');
        if (ctx) {
          const W = oscCanvas.width;
          const H = oscCanvas.height;

          // Clear & Background
          ctx.fillStyle = '#010409';
          ctx.fillRect(0, 0, W, H);

          // Grid Lines
          ctx.strokeStyle = '#21262d';
          ctx.lineWidth = 1;

          // Vertical Grid (every 5ms across 40ms -> 8 divisions)
          for (let i = 0; i <= 8; i++) {
            const x = (i / 8) * W;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();

            // Label
            ctx.fillStyle = '#8b949e';
            ctx.font = '10px monospace';
            ctx.fillText(`${i * 5}ms`, x + 2, H - 4);
          }

          // Horizontal Grid (every 100V from -400V to +400V)
          for (let v = -400; v <= 400; v += 100) {
            const y = H / 2 - (v / 400) * (H / 2 - 12);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();

            if (v !== 0 && v % 200 === 0) {
              ctx.fillStyle = '#8b949e';
              ctx.font = '10px monospace';
              ctx.fillText(`${v > 0 ? '+' : ''}${v}V`, 4, y - 2);
            }
          }

          // Center 0V Reference Line
          ctx.strokeStyle = '#30363d';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, H / 2);
          ctx.lineTo(W, H / 2);
          ctx.stroke();

          // Waveform Traces (L1, L2, L3)
          // Peak voltage = 415 * sqrt(2) ≈ 586.9 V
          const vPeak = voltageIn * Math.SQRT2;

          const phases = [
            { name: 'L1', color: '#f85149', shift: 0 },
            { name: 'L2', color: '#d29922', shift: (-2 * Math.PI) / 3 },
            { name: 'L3', color: '#58a6ff', shift: (2 * Math.PI) / 3 },
          ];

          phases.forEach((p) => {
            ctx.beginPath();
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;

            for (let x = 0; x <= W; x += 2) {
              // Time in ms corresponding to pixel x (0 to 40ms)
              const tMs = (x / W) * 40;
              // Angle omega*t for 50Hz (Period = 20ms -> 2pi rad per 20ms)
              const omegaT = (2 * Math.PI * (tMs + tTime)) / 20;
              let vInstant = vPeak * Math.sin(omegaT + p.shift) * fade;

              // Fault: AC Phase Loss L2 -> L2 voltage is 0
              if (p.name === 'L2' && activeFaults?.acPhaseLossL2) {
                vInstant = 0;
              }

              // Map voltage to canvas y (y=0 top is +400V, y=H bottom is -400V)
              const y = H / 2 - (vInstant / 400) * (H / 2 - 12);

              if (x === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            }
            ctx.stroke();
          });
        }
      }

      // -------------------------------------------------------------
      // CANVAS 2: DC OUTPUT WAVEFORM (400x150)
      // -------------------------------------------------------------
      const dcCanvas = canvasDcRef.current;
      if (dcCanvas) {
        const ctx = dcCanvas.getContext('2d');
        if (ctx) {
          const W = dcCanvas.width;
          const H = dcCanvas.height;

          // Clear
          ctx.fillStyle = '#010409';
          ctx.fillRect(0, 0, W, H);

          // Grid
          ctx.strokeStyle = '#21262d';
          ctx.lineWidth = 1;
          for (let v = 0; v <= 200; v += 50) {
            const y = H - (v / 200) * (H - 20) - 10;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();

            if (v % 50 === 0) {
              ctx.fillStyle = '#8b949e';
              ctx.font = '10px monospace';
              ctx.fillText(`${v}V`, 4, y - 2);
            }
          }

          // Target 122.65V Float Reference Line (Dashed)
          const targetY = H - (122.65 / 200) * (H - 20) - 10;
          ctx.strokeStyle = '#8b949e';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(0, targetY);
          ctx.lineTo(W, targetY);
          ctx.stroke();
          ctx.setLineDash([]); // reset

          // DC Output Level with 6-pulse Ripple
          let vdcLevel = 0;
          if (activeFaults?.dcOvervoltage) {
            vdcLevel = 145.0;
          } else if (q1Closed) {
            const rad = (firingAngle * Math.PI) / 180;
            const theoreticalVdc = 122.65 * (voltageIn / 415) * (Math.cos(rad) / Math.cos((30 * Math.PI) / 180));
            vdcLevel = theoreticalVdc;
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

          const ripplePct = activeFaults?.acPhaseLossL2
            ? 14.8
            : activeFaults?.scrT3Open
            ? 8.2
            : q1Closed
            ? 1.8 + (loadPct / 100) * 1.2
            : 0.2;
          const rippleAmp = vdcLevel * (ripplePct / 100);

          ctx.beginPath();
          ctx.strokeStyle =
            activeFaults?.dcOvervoltage || activeFaults?.scrT3Open || activeFaults?.acPhaseLossL2
              ? '#f85149'
              : '#3fb950';
          ctx.lineWidth = 2.5;

          for (let x = 0; x <= W; x += 2) {
            const tMs = (x / W) * 40;
            let vInst = vdcLevel;

            if (activeFaults?.scrT3Open) {
              const cycleMs = (tMs + tTime) % 20;
              const isT3Slot = cycleMs >= 6.0 && cycleMs <= 10.0;
              const dip = isT3Slot ? 0.65 : 1.0;
              const rippleAngle = (2 * Math.PI * 300 * (tMs + tTime)) / 1000;
              vInst = vdcLevel * dip + rippleAmp * Math.abs(Math.sin(rippleAngle));
            } else if (activeFaults?.acPhaseLossL2) {
              const rippleAngle = (2 * Math.PI * 100 * (tMs + tTime)) / 1000;
              vInst = vdcLevel + rippleAmp * Math.abs(Math.sin(rippleAngle));
            } else {
              const rippleAngle = (2 * Math.PI * 300 * (tMs + tTime)) / 1000;
              vInst = vdcLevel + rippleAmp * Math.abs(Math.sin(rippleAngle));
            }

            const y = H - (vInst / 200) * (H - 20) - 10;

            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
      }

      // -------------------------------------------------------------
      // CANVAS 3: SCR GATE PULSES (400x120)
      // -------------------------------------------------------------
      const gateCanvas = canvasGateRef.current;
      if (gateCanvas) {
        const ctx = gateCanvas.getContext('2d');
        if (ctx) {
          const W = gateCanvas.width;
          const H = gateCanvas.height;

          // Clear
          ctx.fillStyle = '#010409';
          ctx.fillRect(0, 0, W, H);

          // 6 Horizontal channels for T1..T6
          const channelHeight = (H - 20) / 6;

          // Draw channels & pulses
          const scrNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
          const basePhaseDeg = [0, 60, 120, 180, 240, 300];

          scrNames.forEach((scr, i) => {
            const yTop = 15 + i * channelHeight;

            // Channel Background Line
            ctx.strokeStyle = '#21262d';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(40, yTop + channelHeight / 2);
            ctx.lineTo(W, yTop + channelHeight / 2);
            ctx.stroke();

            // SCR Label
            const isT3Fault = scr === 'T3' && activeFaults?.scrT3Open;
            ctx.fillStyle = isT3Fault ? '#f85149' : '#8b949e';
            ctx.font = isT3Fault ? 'bold 10px monospace' : '10px monospace';
            ctx.fillText(isT3Fault ? 'T3 ✗' : scr, 8, yTop + channelHeight / 2 + 3);

            // Gate Pulses for each cycle (20ms cycle = 360 deg)
            if (q1Closed && isRunning && !isT3Fault) {
              const startDeg = basePhaseDeg[i] + firingAngle;
              const pulseWidthDeg = 60; // 60 deg electrical pulse width

              ctx.fillStyle = '#f78166';

              for (let x = 40; x < W; x += 1) {
                const tMs = ((x - 40) / (W - 40)) * 40; // 0 to 40ms
                const currentDeg = (((tMs + tTime) / 20) * 360) % 360;

                // Check if currentDeg is inside [startDeg, startDeg + 60]
                let isPulseOn = false;
                const endDeg = startDeg + pulseWidthDeg;

                if (endDeg < 360) {
                  isPulseOn = currentDeg >= startDeg && currentDeg <= endDeg;
                } else {
                  isPulseOn = currentDeg >= startDeg || currentDeg <= endDeg % 360;
                }

                if (isPulseOn) {
                  ctx.fillRect(x, yTop + 2, 1.5, channelHeight - 4);
                }
              }
            }
          });

          // Vertical Dashed Line for Firing Angle Alpha
          const alphaX = 40 + ((firingAngle % 360) / 360) * (W - 40);
          ctx.strokeStyle = '#f78166';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(alphaX, 10);
          ctx.lineTo(alphaX, H - 5);
          ctx.stroke();
          ctx.setLineDash([]); // reset

          // Firing Angle Label
          ctx.fillStyle = '#f78166';
          ctx.font = 'bold 11px monospace';
          ctx.fillText(`α = ${firingAngle.toFixed(1)}°`, W - 80, 12);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isRunning, q1Closed, q2Closed, voltageIn, loadPct, firingAngle, soc, readouts.vdc, readouts.ripple]);

  // Status LED boolean states according to specification
  const isGroundFault = Boolean(activeFaults?.groundFault);
  const isAnyActiveFault = Boolean(
    activeFaults?.scrT3Open ||
      activeFaults?.acPhaseLossL2 ||
      activeFaults?.groundFault ||
      activeFaults?.dcOvervoltage ||
      activeFaults?.loadTrip
  );
  const isLowVoltageTrip = firingAngle > 90 || (q1Closed && readouts.vdc < 99);

  // 1. POWER: Green if AC breaker Q1 closed
  const powerLed = q1Closed;

  // 2. CHARGING: Amber if in CC, Green if Float, Blue if Boost
  let chargingLedClass = 'bg-[#21262d]';
  let chargingLabel = 'CHARGING';
  if (q1Closed && q2Closed && !isAnyActiveFault && !isLowVoltageTrip) {
    if (readouts.vdc < 122.6 && loadPct > 50) {
      chargingLedClass = 'bg-[#d29922] shadow-[0_0_8px_#d29922] animate-pulse';
      chargingLabel = 'CC LIMIT';
    } else if (readouts.vdc > 128.0) {
      chargingLedClass = 'bg-[#1f6beb] shadow-[0_0_8px_#1f6beb]';
      chargingLabel = 'BOOST';
    } else {
      chargingLedClass = 'bg-[#3fb950] shadow-[0_0_8px_#3fb950]';
      chargingLabel = 'FLOAT';
    }
  }

  // 3. FAULT: Red if any relay tripped or low voltage trip
  const faultLed = isAnyActiveFault || isLowVoltageTrip || (!q1Closed && q3Closed && soc < 30);

  // 4. GROUND OK: Green if 64G normal, Red if ground fault
  const groundOkClass = isGroundFault
    ? 'bg-[#f85149] shadow-[0_0_8px_#f85149]'
    : 'bg-[#3fb950] shadow-[0_0_8px_#3fb950]';

  const commsLed = isRunning && Math.floor(Date.now() / 500) % 2 === 0;

  if (compact) {
    return (
      <div className="flex flex-col gap-3 w-full bg-transparent p-0 select-none">
        {/* 1. OSCILLOSCOPE PANEL */}
        <div className="bg-[#010409]/60 border border-[#1e293b] rounded-xl p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              📈 Input Waveforms - 3 Phase AC
            </span>
            <div className="flex items-center gap-2 text-[9px] font-mono">
              <span className="text-rose-500">● L1</span>
              <span className="text-amber-500">● L2</span>
              <span className="text-blue-500">● L3</span>
            </div>
          </div>
          <canvas
            ref={canvasOscRef}
            width={400}
            height={130}
            className="w-full h-[100px] block rounded-lg border border-[#1e293b] bg-black/40"
          />
        </div>

        {/* 2. DC OUTPUT WAVEFORM PANEL (CHOPPED BY DIODES/SCRs) */}
        <div className="bg-[#010409]/60 border border-[#1e293b] rounded-xl p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              ⚡ DC Output (Chopped SCR Wave)
            </span>
            <span className="text-[9px] font-mono text-emerald-400">● Rectified Vdc</span>
          </div>
          <canvas
            ref={canvasDcRef}
            width={400}
            height={130}
            className="w-full h-[100px] block rounded-lg border border-[#1e293b] bg-black/40"
          />
        </div>

        {/* 3. SCR GATE PULSES PANEL */}
        <div className="bg-[#010409]/60 border border-[#1e293b] rounded-xl p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              🔥 SCR Gate Pulses (T1–T6)
            </span>
            <span className="text-[9px] font-mono text-[#f78166]">α = {firingAngle}°</span>
          </div>
          <canvas
            ref={canvasGateRef}
            width={400}
            height={100}
            className="w-full h-[80px] block rounded-lg border border-[#1e293b] bg-black/40"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full bg-[#161b22] border border-[#30363d] rounded-lg p-4 select-none">
      {/* 1. OSCILLOSCOPE PANEL */}
      <div className="bg-[#010409] border border-[#30363d] rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#c9d1d9] flex items-center gap-2">
            📈 Input Waveforms - 3 Phase AC
          </span>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="text-[#f85149]">● L1</span>
            <span className="text-[#d29922]">● L2</span>
            <span className="text-[#58a6ff]">● L3</span>
          </div>
        </div>
        <canvas
          ref={canvasOscRef}
          width={400}
          height={200}
          className="w-full h-[180px] block rounded border border-[#21262d]"
        />
      </div>

      {/* 2. DC OUTPUT WAVEFORM PANEL */}
      <div className="bg-[#010409] border border-[#30363d] rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#c9d1d9] flex items-center gap-2">
            ⚡ DC Output Voltage & 6-Pulse Ripple
          </span>
          <span className="text-[10px] font-mono text-[#3fb950]">● Rectified Vdc</span>
        </div>
        <canvas
          ref={canvasDcRef}
          width={400}
          height={140}
          className="w-full h-[130px] block rounded border border-[#21262d]"
        />
      </div>

      {/* 3. SCR GATE PULSES PANEL */}
      <div className="bg-[#010409] border border-[#30363d] rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#c9d1d9] flex items-center gap-2">
            🔥 SCR Gate Pulses (T1–T6)
          </span>
          <span className="text-[10px] font-mono text-[#f78166]">α = {firingAngle}°</span>
        </div>
        <canvas
          ref={canvasGateRef}
          width={400}
          height={120}
          className="w-full h-[110px] block rounded border border-[#21262d]"
        />
      </div>

      {/* 4. DIGITAL READOUTS (2 columns × 3 rows) */}
      <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-3">
        <div className="text-xs font-bold text-[#8b949e] uppercase tracking-wider mb-2">
          Digital Meter Telemetry
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* [Vdc] */}
          <div className="bg-[#000000] border border-[#30363d] rounded p-2 flex flex-col justify-between">
            <span className="text-[10px] text-[#8b949e] font-semibold uppercase">DC BUS VOLTAGE</span>
            <span className="text-lg font-bold font-mono text-[#3fb950] mt-1">
              {readouts.vdc.toFixed(1)} V
            </span>
          </div>

          {/* [Idc] */}
          <div className="bg-[#000000] border border-[#30363d] rounded p-2 flex flex-col justify-between">
            <span className="text-[10px] text-[#8b949e] font-semibold uppercase">DC BUS CURRENT</span>
            <span className="text-lg font-bold font-mono text-[#3fb950] mt-1">
              {readouts.idc.toFixed(1)} A
            </span>
          </div>

          {/* [THDi] */}
          <div className="bg-[#000000] border border-[#30363d] rounded p-2 flex flex-col justify-between">
            <span className="text-[10px] text-[#8b949e] font-semibold uppercase">CURRENT THDi</span>
            <span className="text-lg font-bold font-mono text-[#e3b341] mt-1">
              {readouts.thdi.toFixed(1)} %
            </span>
          </div>

          {/* [Ripple] */}
          <div className="bg-[#000000] border border-[#30363d] rounded p-2 flex flex-col justify-between">
            <span className="text-[10px] text-[#8b949e] font-semibold uppercase">AC RIPPLE FACTOR</span>
            <span className="text-lg font-bold font-mono text-[#3fb950] mt-1">
              {readouts.ripple.toFixed(1)} %
            </span>
          </div>

          {/* [Cell V] */}
          <div className="bg-[#000000] border border-[#30363d] rounded p-2 flex flex-col justify-between">
            <span className="text-[10px] text-[#8b949e] font-semibold uppercase">AVG CELL VOLTAGE</span>
            <span className="text-lg font-bold font-mono text-[#3fb950] mt-1">
              {readouts.cellV.toFixed(2)} V
            </span>
          </div>

          {/* [SOC] */}
          <div className="bg-[#000000] border border-[#30363d] rounded p-2 flex flex-col justify-between">
            <span className="text-[10px] text-[#8b949e] font-semibold uppercase">BATTERY SOC</span>
            <span className="text-lg font-bold font-mono text-[#3fb950] mt-1">
              {readouts.socVal} %
            </span>
          </div>

          {/* [Temp] */}
          <div className="bg-[#000000] border border-[#30363d] rounded p-2 flex flex-col justify-between">
            <span className="text-[10px] text-[#8b949e] font-semibold uppercase">HEATSINK TEMP</span>
            <span className="text-lg font-bold font-mono text-[#3fb950] mt-1">
              {readouts.temp.toFixed(1)} °C
            </span>
          </div>
        </div>
      </div>

      {/* 5. STATUS LEDs */}
      <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-3">
        <div className="text-xs font-bold text-[#8b949e] uppercase tracking-wider mb-2">
          System Status Annunciator
        </div>
        <div className="flex items-center justify-between text-center pt-1">
          {/* POWER */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                powerLed ? 'bg-[#3fb950] shadow-[0_0_8px_#3fb950]' : 'bg-[#21262d]'
              }`}
            />
            <span className="text-[10px] text-[#8b949e] font-mono">POWER</span>
          </div>

          {/* CHARGING */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full transition-all duration-300 ${chargingLedClass}`}
            />
            <span className="text-[10px] text-[#8b949e] font-mono">{chargingLabel}</span>
          </div>

          {/* FAULT */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                faultLed ? 'bg-[#f85149] shadow-[0_0_8px_#f85149]' : 'bg-[#21262d]'
              }`}
            />
            <span className="text-[10px] text-[#8b949e] font-mono">FAULT</span>
          </div>

          {/* GROUND OK */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full transition-all duration-300 ${groundOkClass}`}
            />
            <span className="text-[10px] text-[#8b949e] font-mono">
              {isGroundFault ? 'GND FAULT' : 'GROUND OK'}
            </span>
          </div>

          {/* COMMS */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                commsLed ? 'bg-[#58a6ff] shadow-[0_0_8px_#58a6ff]' : 'bg-[#21262d]'
              }`}
            />
            <span className="text-[10px] text-[#8b949e] font-mono">COMMS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
