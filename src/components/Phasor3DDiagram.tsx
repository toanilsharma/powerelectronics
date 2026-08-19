import React, { useEffect, useRef, useState } from 'react';
import { HarmonicComponent, PowerQualityEngine } from '../utils/PowerQualityEngine';
import { RotateCcw, Play, Pause, Eye, Info, Layers, RefreshCw } from 'lucide-react';

interface Phasor3DDiagramProps {
  loadSpectrum: HarmonicComponent[];
  frequencyHz?: number;
  className?: string;
}

/**
 * Task 1: 3D Phasor Diagram Component (Canvas 3D Projection Math)
 * 
 * Physics Rules:
 *  - Fundamental (h=1): Large vector rotating counter-clockwise (+w)
 *  - 5th Harmonic (h=5): Attached to tip of Fundamental, rotates in OPPOSITE direction (-5w) -> Negative Sequence
 *  - 7th Harmonic (h=7): Attached to tip of 5th, rotates in SAME direction (+7w) -> Positive Sequence
 * 
 * Demonstrates 6-pulse epicyclic vector locus & phase sequence rotation.
 */
export const Phasor3DDiagram: React.FC<Phasor3DDiagramProps> = ({
  loadSpectrum,
  frequencyHz = 50,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Viewport Orbit Angle Controls
  const [pitch, setPitch] = useState<number>(25); // degrees
  const [yaw, setYaw] = useState<number>(-35);    // degrees
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [showLocusTrace, setShowLocusTrace] = useState<boolean>(true);
  const [timeScale, setTimeScale] = useState<number>(1.0);

  // Drag Orbit Control State
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Extract Magnitudes for 1st, 5th, 7th harmonics
  const spectrumMap = React.useMemo(() => {
    const map = new Map<number, { mag: number; phase: number }>();
    for (const comp of loadSpectrum) {
      map.set(comp.order, { mag: comp.magnitude, phase: comp.phase ?? 0 });
    }
    return map;
  }, [loadSpectrum]);

  const h1 = spectrumMap.get(1) ?? { mag: 100, phase: 0 };
  const h5 = spectrumMap.get(5) ?? { mag: 20, phase: Math.PI };
  const h7 = spectrumMap.get(7) ?? { mag: 14.3, phase: 0 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let tTime = 0;
    const locusHistory: { x: number; y: number; z: number }[] = [];
    const maxLocusPoints = 300;

    const render = () => {
      if (isRotating) {
        tTime += 0.003 * timeScale;
      }

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      // Dark Industrial Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // 3D Projection Transform Math
      const pitchRad = (pitch * Math.PI) / 180;
      const yawRad = (yaw * Math.PI) / 180;

      const cosP = Math.cos(pitchRad);
      const sinP = Math.sin(pitchRad);
      const cosY = Math.cos(yawRad);
      const sinY = Math.sin(yawRad);

      // Project 3D (x, y, z) to 2D (screenX, screenY)
      const project3D = (x: number, y: number, z: number) => {
        // Rotate around Y axis (yaw)
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;

        // Rotate around X axis (pitch)
        const y2 = y * cosP - z1 * sinP;
        const z2 = y * sinP + z1 * cosP;

        // Perspective scaling
        const perspective = 800 / (800 + z2);
        return {
          sx: cx + x1 * perspective,
          sy: cy - y2 * perspective,
          depth: z2,
        };
      };

      // 1. Draw 3D Grid Axes (Alpha X, Beta Y, Gamma Z)
      const axisLen = 140;
      const origin = project3D(0, 0, 0);

      const axisX = project3D(axisLen, 0, 0);
      const axisY = project3D(0, axisLen, 0);
      const axisZ = project3D(0, 0, axisLen);

      // Draw Alpha Axis (Cyan)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(axisX.sx, axisX.sy);
      ctx.stroke();

      // Draw Beta Axis (Green)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(axisY.sx, axisY.sy);
      ctx.stroke();

      // Draw Gamma Axis (Purple)
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(axisZ.sx, axisZ.sy);
      ctx.stroke();

      // Axis Labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText('α (Real)', axisX.sx + 4, axisX.sy);
      ctx.fillText('β (Imag)', axisY.sx + 4, axisY.sy);
      ctx.fillText('z (Order)', axisZ.sx + 4, axisZ.sy);

      // 2. Vector Magnitudes & Angular Speeds
      const baseRadius = 90;
      const r1 = baseRadius;
      const r5 = (h5.mag / Math.max(1, h1.mag)) * baseRadius * 1.5;
      const r7 = (h7.mag / Math.max(1, h1.mag)) * baseRadius * 1.5;

      const w1 = 2 * Math.PI * frequencyHz * tTime;
      const w5 = -5 * w1 + h5.phase; // Negative Sequence (-5w)
      const w7 = +7 * w1 + h7.phase; // Positive Sequence (+7w)

      // Tip Position 1: Fundamental Vector Tip
      const x1 = r1 * Math.cos(w1);
      const y1 = r1 * Math.sin(w1);
      const z1 = 0;

      // Tip Position 2: 5th Harmonic Vector Tip (Attached to Tip 1)
      const x5 = x1 + r5 * Math.cos(w5);
      const y5 = y1 + r5 * Math.sin(w5);
      const z5 = 15; // Offset slightly in Z for 3D visual clarity

      // Tip Position 3: 7th Harmonic Vector Tip (Attached to Tip 2)
      const x7 = x5 + r7 * Math.cos(w7);
      const y7 = y5 + r7 * Math.sin(w7);
      const z7 = 30;

      // Add resultant tip (x7, y7, z7) to locus history
      if (isRotating) {
        locusHistory.push({ x: x7, y: y7, z: z7 });
        if (locusHistory.length > maxLocusPoints) {
          locusHistory.shift();
        }
      }

      // 3. Render Locus Trace (6-Lobe Epicyclic Trajectory)
      if (showLocusTrace && locusHistory.length > 1) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let i = 0; i < locusHistory.length; i++) {
          const pt = project3D(locusHistory[i].x, locusHistory[i].y, locusHistory[i].z);
          if (i === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 4. Render Fundamental Vector (Large Green Arrow)
      const p1 = project3D(x1, y1, z1);
      ctx.strokeStyle = '#10b981'; // Neon Green
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(origin.sx, origin.sy);
      ctx.lineTo(p1.sx, p1.sy);
      ctx.stroke();

      // Vector 1 Tip Circle
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(p1.sx, p1.sy, 4, 0, 2 * Math.PI);
      ctx.fill();

      // 5. Render 5th Harmonic Vector (Attached to Tip 1, Rotating Clockwise - Negative Sequence)
      const p5 = project3D(x5, y5, z5);
      ctx.strokeStyle = '#f59e0b'; // Amber
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p5.sx, p5.sy);
      ctx.stroke();

      // Vector 5 Tip Circle
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(p5.sx, p5.sy, 3.5, 0, 2 * Math.PI);
      ctx.fill();

      // 6. Render 7th Harmonic Vector (Attached to Tip 5, Rotating Counter-Clockwise - Positive Sequence)
      const p7 = project3D(x7, y7, z7);
      ctx.strokeStyle = '#06b6d4'; // Cyan
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p5.sx, p5.sy);
      ctx.lineTo(p7.sx, p7.sy);
      ctx.stroke();

      // Resultant Tip Circle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(p7.sx, p7.sy, 5, 0, 2 * Math.PI);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Render Labels on Vector Tips
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#10b981';
      ctx.fillText('H1 (+ω)', p1.sx + 6, p1.sy - 4);

      ctx.fillStyle = '#f59e0b';
      ctx.fillText('H5 (-5ω)', p5.sx + 6, p5.sy - 4);

      ctx.fillStyle = '#06b6d4';
      ctx.fillText('H7 (+7ω)', p7.sx + 6, p7.sy - 4);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [pitch, yaw, isRotating, showLocusTrace, timeScale, frequencyHz, h1, h5, h7]);

  // Mouse Orbit Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;

    setYaw((prev) => prev + dx * 0.5);
    setPitch((prev) => Math.max(-85, Math.min(85, prev - dy * 0.5)));

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className={`bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-4 ${className}`}>
      
      {/* Header Bar & Orbit Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span>🌐</span> 3D Harmonic Phasor Vector Diagram
          </h2>
          <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
            Phase Sequence Rotation • H1 (+ω), H5 (-5ω), H7 (+7ω)
          </p>
        </div>

        {/* Orbit Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className="p-2 rounded-xl border border-[#334155] bg-[#0f172a] hover:border-[#06b6d4] text-[#94a3b8] hover:text-white transition-colors"
            title={isRotating ? 'Pause Rotation' : 'Resume Rotation'}
          >
            {isRotating ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-[#10b981]" />}
          </button>

          <button
            onClick={() => setShowLocusTrace(!showLocusTrace)}
            className={`p-2 rounded-xl border font-mono transition-colors ${
              showLocusTrace
                ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]'
                : 'bg-[#0f172a] border-[#334155] text-[#94a3b8]'
            }`}
            title="Toggle Locus Trajectory Trace"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setPitch(25);
              setYaw(-35);
            }}
            className="p-2 rounded-xl border border-[#334155] bg-[#0f172a] hover:border-[#06b6d4] text-[#94a3b8] hover:text-white transition-colors"
            title="Reset 3D Orbit View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div className="relative rounded-xl overflow-hidden border border-[#334155] bg-[#0f172a]">
        
        <canvas
          ref={canvasRef}
          width={800}
          height={320}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-[300px] md:h-[320px] block cursor-grab active:cursor-grabbing"
        />

        {/* Orbit Overlay Hint */}
        <div className="absolute top-3 left-3 bg-[#1e293b]/90 backdrop-blur border border-[#334155] px-2.5 py-1 rounded text-[10px] font-mono text-[#94a3b8] pointer-events-none">
          <span>DRAG MOUSE TO ORBIT 3D VIEW</span>
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-3 left-3 right-3 bg-[#1e293b]/90 backdrop-blur border border-[#334155] px-3 py-2 rounded-xl text-[10px] font-mono flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[#10b981]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> H1 Fundamental (+ω)
            </span>
            <span className="flex items-center gap-1 text-[#f59e0b]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> H5 (-5ω Negative Seq)
            </span>
            <span className="flex items-center gap-1 text-[#06b6d4]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" /> H7 (+7ω Positive Seq)
            </span>
          </div>

          <div className="text-[#ef4444] font-semibold">
            Resultant 6-Lobe Epicycle Trace
          </div>
        </div>

      </div>

      {/* Physics Explanation Card */}
      <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-xl text-xs space-y-1 text-[#94a3b8]">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#06b6d4]" />
          3D Phase Sequence Physics
        </div>
        <p className="text-[11px] leading-relaxed">
          5th harmonic rotates backwards (-5ω) creating a negative sequence magnetic field that resists motor rotation.
          7th harmonic rotates forwards (+7ω) creating positive sequence torque. Together they form the characteristic 6-pulse drive harmonic profile.
        </p>
      </div>

    </div>
  );
};
