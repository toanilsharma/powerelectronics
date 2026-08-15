import React, { useEffect, useRef } from 'react';

interface StaticSwitchSynchroscopeProps {
  voltageA: number;
  freqA: number;
  voltageB: number;
  freqB: number;
  phaseBOffset: number; // degrees
  isSyncOk: boolean;
  deltaTheta: number;
  deltaFreq: number;
  deltaVoltPct: number;
}

export const StaticSwitchSynchroscope: React.FC<StaticSwitchSynchroscopeProps> = ({
  voltageA,
  freqA,
  voltageB,
  freqB,
  phaseBOffset,
  isSyncOk,
  deltaTheta,
  deltaFreq,
  deltaVoltPct,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let angleA = 0;

    const render = () => {
      ctx.clearRect(0, 0, 200, 200);

      const cx = 100;
      const cy = 95;
      const radius = 65;

      // Outer dial ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#0d1117';
      ctx.fill();
      ctx.strokeStyle = '#30363d';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner tick marks & sync zone (-5 to +5 deg)
      ctx.beginPath();
      const syncAngleRad = (5 * Math.PI) / 180;
      ctx.arc(cx, cy, radius - 2, -Math.PI / 2 - syncAngleRad, -Math.PI / 2 + syncAngleRad);
      ctx.strokeStyle = isSyncOk ? '#3fb950' : '#f85149';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Top 12 o'clock indicator
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy - radius + 8);
      ctx.strokeStyle = '#c9d1d9';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Grid crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - radius + 10, cy);
      ctx.lineTo(cx + radius - 10, cy);
      ctx.moveTo(cx, cy - radius + 10);
      ctx.lineTo(cx, cy + radius - 10);
      ctx.strokeStyle = '#21262d';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Update rotation angles based on frequency & animation
      // Normal rotation speed for 50Hz scaled for visual representation
      const dt = 0.03;
      angleA = (angleA + 2 * Math.PI * (freqA / 50) * dt) % (2 * Math.PI);
      const radOffset = (phaseBOffset * Math.PI) / 180;
      const angleB = angleA + radOffset + (freqB - freqA) * 2 * Math.PI * dt;

      // Draw Source A Phasor (RED)
      const lenA = Math.min(55, (voltageA / 230) * 50);
      const xA = cx + lenA * Math.sin(angleA);
      const yA = cy - lenA * Math.cos(angleA);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(xA, yA);
      ctx.strokeStyle = '#f85149'; // Source A RED
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Arrowhead for Source A
      const headlen = 7;
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
      ctx.fillStyle = '#f85149';
      ctx.fill();

      // Draw Source B Phasor (BLUE)
      const lenB = Math.min(55, (voltageB / 230) * 50);
      const xB = cx + lenB * Math.sin(angleB);
      const yB = cy - lenB * Math.cos(angleB);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(xB, yB);
      ctx.strokeStyle = '#58a6ff'; // Source B BLUE
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
      ctx.fillStyle = '#58a6ff';
      ctx.fill();

      // Center pivot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#c9d1d9';
      ctx.fill();

      // Labels Legend on Canvas
      ctx.font = '9px monospace';
      ctx.fillStyle = '#f85149';
      ctx.fillText('Source A', 10, 20);

      ctx.fillStyle = '#58a6ff';
      ctx.fillText('Source B', 145, 20);

      // Angle display & Sync Status text
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#c9d1d9';
      ctx.fillText(`Δθ = ${deltaTheta >= 0 ? '+' : ''}${deltaTheta.toFixed(1)}°`, cx, 172);

      // SYNC OK / SYNC FAIL Badge
      ctx.font = 'bold 11px monospace';
      if (isSyncOk) {
        ctx.fillStyle = '#3fb950';
        ctx.fillText('SYNC OK', cx, 188);
      } else {
        ctx.fillStyle = '#f85149';
        ctx.fillText('SYNC FAIL', cx, 188);
      }

      ctx.textAlign = 'left'; // reset
      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animFrameId);
  }, [voltageA, freqA, voltageB, freqB, phaseBOffset, isSyncOk, deltaTheta]);

  return (
    <div className="flex flex-col items-center justify-center bg-[#161b22] border border-[#30363d] rounded-lg p-2 shadow-lg">
      <div className="text-[10px] font-mono text-[#8b949e] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
        <span>🔄 Synchroscope</span>
        <span className="text-[9px] px-1 bg-[#21262d] rounded text-[#58a6ff]">25 Relay</span>
      </div>
      <canvas ref={canvasRef} width={200} height={200} className="rounded bg-[#0d1117]" />
      <div className="mt-1 flex items-center justify-between w-full text-[9px] font-mono text-[#8b949e] px-1">
        <span>Δf: {deltaFreq >= 0 ? '+' : ''}{deltaFreq.toFixed(2)}Hz</span>
        <span>ΔV: {deltaVoltPct >= 0 ? '+' : ''}{deltaVoltPct.toFixed(1)}%</span>
      </div>
    </div>
  );
};
