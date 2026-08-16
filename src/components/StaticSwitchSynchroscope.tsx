import React, { useEffect, useRef } from 'react';

interface StaticSwitchSynchroscopeProps {
  voltageA: number;
  freqA: number;
  phaseA?: number;
  voltageB: number;
  freqB: number;
  phaseB?: number;
  phaseBOffset?: number; // legacy fallback
  isSyncOk: boolean;
  deltaTheta: number;
  deltaFreq: number;
  deltaVoltPct: number;
  nominalVoltage?: '110V' | '220V';
  phaseTolerance?: number;
}

export const StaticSwitchSynchroscope: React.FC<StaticSwitchSynchroscopeProps> = ({
  voltageA,
  freqA,
  phaseA = 0,
  voltageB,
  freqB,
  phaseB,
  phaseBOffset = 0,
  isSyncOk,
  deltaTheta,
  deltaFreq,
  deltaVoltPct,
  nominalVoltage = '220V',
  phaseTolerance = 5.0,
}) => {
  const effectivePhaseB = phaseB !== undefined ? phaseB : phaseBOffset;
  const synchroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render 25 Sync Dial Canvas
  useEffect(() => {
    const canvas = synchroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let angleA = (phaseA * Math.PI) / 180;

    const render = () => {
      ctx.clearRect(0, 0, 160, 160);

      const cx = 80;
      const cy = 75;
      const radius = 55;

      // Outer dial ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#0d1117';
      ctx.fill();
      ctx.strokeStyle = '#30363d';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner tick marks & sync zone (-phaseTolerance to +phaseTolerance deg)
      ctx.beginPath();
      const syncAngleRad = (phaseTolerance * Math.PI) / 180;
      ctx.arc(cx, cy, radius - 2, -Math.PI / 2 - syncAngleRad, -Math.PI / 2 + syncAngleRad);
      ctx.strokeStyle = isSyncOk ? '#3fb950' : '#f85149';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Top 12 o'clock indicator
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy - radius + 7);
      ctx.strokeStyle = '#c9d1d9';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Grid crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - radius + 8, cy);
      ctx.lineTo(cx + radius - 8, cy);
      ctx.moveTo(cx, cy - radius + 8);
      ctx.lineTo(cx, cy + radius - 8);
      ctx.strokeStyle = '#21262d';
      ctx.lineWidth = 1;
      ctx.stroke();

      const dt = 0.03;
      angleA = (angleA + 2 * Math.PI * (freqA / 60) * dt) % (2 * Math.PI);
      const radOffsetB = (effectivePhaseB * Math.PI) / 180;
      const angleB = angleA + radOffsetB + (freqB - freqA) * 2 * Math.PI * dt;

      // Draw Source A Phasor (EMERALD GREEN)
      const vScale = nominalVoltage === '110V' ? 110 : 220;
      const lenA = Math.min(48, (voltageA / vScale) * 44);
      const xA = cx + lenA * Math.sin(angleA);
      const yA = cy - lenA * Math.cos(angleA);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(xA, yA);
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Arrowhead for Source A
      const headlen = 6;
      const angleAHead = Math.atan2(yA - cy, xA - cx);
      ctx.beginPath();
      ctx.moveTo(xA, yA);
      ctx.lineTo(
        xA - headlen * Math.cos(angleAHead - Math.PI / 6),
        yA - headlen * Math.sin(angleAHead - Math.PI / 6)
      );
      ctx.lineTo(
        xA - headlen * Math.cos(angleAHead + Math.PI / 6),
        yA - headlen * Math.sin(angleAHead + Math.PI / 6)
      );
      ctx.fillStyle = '#00ff88';
      ctx.fill();

      // Draw Source B Phasor (CYAN BLUE)
      const lenB = Math.min(48, (voltageB / vScale) * 44);
      const xB = cx + lenB * Math.sin(angleB);
      const yB = cy - lenB * Math.cos(angleB);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(xB, yB);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Arrowhead for Source B
      const angleBHead = Math.atan2(yB - cy, xB - cx);
      ctx.beginPath();
      ctx.moveTo(xB, yB);
      ctx.lineTo(
        xB - headlen * Math.cos(angleBHead - Math.PI / 6),
        yB - headlen * Math.sin(angleBHead - Math.PI / 6)
      );
      ctx.lineTo(
        xB - headlen * Math.cos(angleBHead + Math.PI / 6),
        yB - headlen * Math.sin(angleBHead + Math.PI / 6)
      );
      ctx.fillStyle = '#00f0ff';
      ctx.fill();

      // Center pivot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#c9d1d9';
      ctx.fill();

      // Labels Legend on Canvas
      ctx.font = '8px monospace';
      ctx.fillStyle = '#00ff88';
      ctx.fillText('Src A', 6, 14);

      ctx.fillStyle = '#00f0ff';
      ctx.fillText('Src B', 125, 14);

      // Angle display & Sync Status text
      ctx.textAlign = 'center';
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#c9d1d9';
      ctx.fillText(`Δθ = ${deltaTheta >= 0 ? '+' : ''}${deltaTheta.toFixed(1)}°`, cx, 142);

      // SYNC OK / SYNC FAIL Badge
      ctx.font = 'bold 10px monospace';
      if (isSyncOk) {
        ctx.fillStyle = '#3fb950';
        ctx.fillText('PERMISSIVE', cx, 154);
      } else {
        ctx.fillStyle = '#f85149';
        ctx.fillText('BLOCKED', cx, 154);
      }

      ctx.textAlign = 'left';
      animFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrameId);
  }, [voltageA, freqA, phaseA, voltageB, freqB, effectivePhaseB, isSyncOk, deltaTheta, nominalVoltage]);

  // Render Dual Input Oscilloscope Waveform Canvas (Live Sync Overlay)
  useEffect(() => {
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let timeOffset = 0;

    const renderWaveforms = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cy = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Grid background
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, width, height);

      // Oscilloscope Grid Lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;

      // Vertical grid lines
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal zero axis line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.stroke();

      timeOffset += 0.05;

      const vScale = nominalVoltage === '110V' ? 110 : 220;
      const ampA = (voltageA / vScale) * 35;
      const ampB = (voltageB / vScale) * 35;

      const radA = (phaseA * Math.PI) / 180;
      const radB = (effectivePhaseB * Math.PI) / 180;

      // --- TRACE 1: SOURCE A WAVEFORM (EMERALD GREEN) ---
      ctx.beginPath();
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      for (let x = 0; x < width; x += 2) {
        const t = (x / width) * 4 * Math.PI + timeOffset;
        const y = cy - ampA * Math.sin(t * (freqA / 60) + radA);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // --- TRACE 2: SOURCE B WAVEFORM (CYAN BLUE) ---
      ctx.beginPath();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      for (let x = 0; x < width; x += 2) {
        const t = (x / width) * 4 * Math.PI + timeOffset;
        const y = cy - ampB * Math.sin(t * (freqB / 60) + radB);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Waveform Top Legend
      ctx.font = '9px monospace';
      ctx.fillStyle = '#00ff88';
      ctx.fillText(`V1:${voltageA.toFixed(0)}V ${freqA.toFixed(1)}Hz`, 6, 12);
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(`V2:${voltageB.toFixed(0)}V ${freqB.toFixed(1)}Hz`, 90, 12);

      // Phase status text
      ctx.textAlign = 'right';
      ctx.fillStyle = isSyncOk ? '#3fb950' : '#f85149';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(isSyncOk ? 'IN SYNC' : 'UNSYNC', width - 6, 12);
      ctx.textAlign = 'left';

      animFrameId = requestAnimationFrame(renderWaveforms);
    };

    renderWaveforms();
    return () => cancelAnimationFrame(animFrameId);
  }, [voltageA, freqA, phaseA, voltageB, freqB, effectivePhaseB, isSyncOk, nominalVoltage]);

  return (
    <div className="flex flex-col gap-2.5 bg-[#161b22] border border-[#30363d] rounded-xl p-2.5 shadow-lg font-mono w-full">
      {/* HEADER TITLE */}
      <div className="text-[10px] text-[#8b949e] font-bold uppercase tracking-wider flex items-center justify-between pb-1 border-b border-[#21262d]">
        <div className="flex items-center gap-1.5">
          <span>🔄 Synchroscope & Dual Waveforms</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-[#21262d] rounded text-[#38bdf8]">25 Relay</span>
        </div>
        <span className="text-[9px] text-[#3fb950] font-bold">{nominalVoltage} AC</span>
      </div>

      {/* TOP ROW: SYNCHROSCOPE DIAL & PARAMETERS */}
      <div className="flex items-center justify-between gap-2">
        {/* Synchroscope Circular Dial Canvas */}
        <canvas ref={synchroCanvasRef} width={160} height={160} className="rounded-lg bg-[#0d1117] shrink-0 border border-[#21262d]" />

        {/* Sync Telemetry Metrics Card */}
        <div className="flex flex-col gap-1.5 text-[10px] w-full bg-[#0d1117] p-2 rounded-lg border border-[#21262d]">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1">
            <span className="text-[#8b949e]">Freq Diff Δf:</span>
            <strong className={Math.abs(deltaFreq) > 0.5 ? 'text-red-400' : 'text-emerald-400'}>
              {deltaFreq >= 0 ? '+' : ''}{deltaFreq.toFixed(2)} Hz
            </strong>
          </div>
          <div className="flex justify-between items-center border-b border-slate-800 pb-1">
            <span className="text-[#8b949e]">Volt Diff ΔV:</span>
            <strong className={Math.abs(deltaVoltPct) > 5 ? 'text-amber-400' : 'text-emerald-400'}>
              {deltaVoltPct >= 0 ? '+' : ''}{deltaVoltPct.toFixed(1)} %
            </strong>
          </div>
          <div className="flex justify-between items-center border-b border-slate-800 pb-1">
            <span className="text-[#8b949e]">Phase Shift Δθ:</span>
            <strong className={Math.abs(deltaTheta) > 5 ? 'text-red-400' : 'text-amber-400'}>
              {deltaTheta >= 0 ? '+' : ''}{deltaTheta.toFixed(1)}°
            </strong>
          </div>
          <div className="flex justify-between items-center pt-0.5">
            <span className="text-[#8b949e]">Sync State:</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${isSyncOk ? 'bg-emerald-950 text-emerald-300 border border-emerald-500' : 'bg-red-950 text-red-300 border border-red-500'}`}>
              {isSyncOk ? 'PERMISSIVE' : 'BLOCKED'}
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: LIVE DUAL INPUT WAVEFORMS OSCILLOSCOPE CANVAS */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[9px] text-slate-400 px-0.5 font-bold">
          <span>⚡ Live Input AC Waveforms (Sine In Sync)</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[#00ff88]"><span className="w-2 h-0.5 bg-[#00ff88] inline-block"></span>Src A</span>
            <span className="flex items-center gap-1 text-[#00f0ff]"><span className="w-2 h-0.5 bg-[#00f0ff] inline-block"></span>Src B</span>
          </div>
        </div>
        <canvas ref={waveCanvasRef} width={280} height={85} className="w-full h-[85px] rounded-lg bg-[#060a12] border border-[#21262d] block" />
      </div>
    </div>
  );
};

