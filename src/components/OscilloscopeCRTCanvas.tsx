import React, { useEffect, useRef } from 'react';
import { HarmonicComponent, PowerQualityEngine } from '../utils/PowerQualityEngine';

interface OscilloscopeCRTCanvasProps {
  loadSpectrum: HarmonicComponent[];
  apfEnabled: boolean;
  apfEfficiency?: number; // 0 to 100%
  frequencyHz?: number;
  fundamentalAmp?: number;
  timebaseScale?: number;
  showGridTrace?: boolean;
  showLoadTrace?: boolean;
  showApfTrace?: boolean;
  className?: string;
}

/**
 * Task 1: Phosphor CRT Oscilloscope Canvas (HTML5 Canvas 60fps)
 * 
 * Traces:
 *  - Grid/Source Current: Neon Green (#10b981 / #22c55e)
 *  - Load Current: Neon Red (#ef4444)
 *  - APF Current: Neon Blue (#3b82f6 / #06b6d4)
 * 
 * Features:
 *  - Glow effects (shadowBlur / shadowColor)
 *  - Phosphor CRT grid background & CRT scanline overlay
 *  - High-performance 60fps requestAnimationFrame loop
 */
export const OscilloscopeCRTCanvas: React.FC<OscilloscopeCRTCanvasProps> = ({
  loadSpectrum,
  apfEnabled,
  apfEfficiency = 100,
  frequencyHz = 50,
  fundamentalAmp = 100,
  timebaseScale = 1.0,
  showGridTrace = true,
  showLoadTrace = true,
  showApfTrace = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPaused, setIsPaused] = React.useState<boolean>(false);
  const isPausedRef = useRef<boolean>(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      if (canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width || 800;
        canvas.height = rect.height || 220;
      }
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    if (canvas.parentElement) {
      observer.observe(canvas.parentElement);
    }

    let animationFrameId: number;
    let timeOffset = 0;
    let lastTime = performance.now();
    const targetInterval = 1000 / 30; // 30 FPS throttle for laptops

    const render = (now: number) => {
      animationFrameId = requestAnimationFrame(render);

      if (isPausedRef.current) return;

      const elapsed = now - lastTime;
      if (elapsed < targetInterval) return;
      lastTime = now - (elapsed % targetInterval);

      timeOffset += 0.0009; // Smooth continuous left-to-right wave motion at 30fps

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // 1. Phosphor CRT Dark Background (#051317 phosphor CRT tint)
      ctx.fillStyle = '#051317';
      ctx.fillRect(0, 0, width, height);

      // 2. Phosphor CRT Grid Mesh
      ctx.lineWidth = 1;

      // Minor grid lines (dark green CRT phosphor style)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      const stepX = width / 24;
      const stepY = height / 12;

      for (let x = 0; x <= width; x += stepX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += stepY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Major axis division lines (Brighter phosphor green)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.lineWidth = 1.2;
      
      // Center horizontal axis
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      // Center vertical axis
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      // Hash marks along center axes
      ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
      for (let x = 0; x <= width; x += width / 40) {
        ctx.fillRect(x, centerY - 2, 1, 4);
      }
      for (let y = 0; y <= height; y += height / 20) {
        ctx.fillRect(width / 2 - 2, y, 4, 1);
      }

      // 3. Generate Waveform Points
      const numCycles = 2.0 / timebaseScale;
      const period = 1 / frequencyHz;
      const totalTimeWindow = numCycles * period;

      const maxPeak = Math.max(120, fundamentalAmp * 1.6);
      const scaleY = (height * 0.38) / maxPeak;

      const pointsCount = width;
      const gridPoints: number[] = [];
      const loadPoints: number[] = [];
      const apfPoints: number[] = [];

      const effFactor = apfEnabled ? Math.max(0, Math.min(1, apfEfficiency / 100)) : 0;
      const omega = 2 * Math.PI * frequencyHz;

      for (let i = 0; i < pointsCount; i++) {
        const t = (i / pointsCount) * totalTimeWindow + timeOffset;

        // Instantaneous load current
        const iLoad = PowerQualityEngine.generateWaveform(loadSpectrum, t, frequencyHz, false);

        // Harmonic content (h >= 2)
        let iHarmonics = 0;
        for (const comp of loadSpectrum) {
          if (comp.order >= 2) {
            iHarmonics += comp.magnitude * Math.sin(comp.order * omega * t + (comp.phase ?? 0));
          }
        }

        // APF injection current = -efficiency * harmonics
        const iApf = -effFactor * iHarmonics;
        // Grid current = Load current + APF current
        const iGrid = iLoad + iApf;

        loadPoints.push(centerY - iLoad * scaleY);
        apfPoints.push(centerY - iApf * scaleY);
        gridPoints.push(centerY - iGrid * scaleY);
      }

      // 4. Trace 1: APF Current (Neon Blue/Cyan)
      if (apfEnabled && showApfTrace) {
        ctx.strokeStyle = '#06b6d4'; // Neon Cyan/Blue
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < pointsCount; i++) {
          if (i === 0) ctx.moveTo(i, apfPoints[i]);
          else ctx.lineTo(i, apfPoints[i]);
        }
        ctx.stroke();
      }

      // 5. Trace 2: Load Current (Neon Red)
      if (showLoadTrace) {
        ctx.strokeStyle = '#ef4444'; // Neon Red
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.lineWidth = apfEnabled ? 1.8 : 2.5;
        ctx.beginPath();
        for (let i = 0; i < pointsCount; i++) {
          if (i === 0) ctx.moveTo(i, loadPoints[i]);
          else ctx.lineTo(i, loadPoints[i]);
        }
        ctx.stroke();
      }

      // 6. Trace 3: Grid/Source Current (Neon Green)
      if (showGridTrace) {
        ctx.strokeStyle = '#10b981'; // Neon Green
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < pointsCount; i++) {
          if (i === 0) ctx.moveTo(i, gridPoints[i]);
          else ctx.lineTo(i, gridPoints[i]);
        }
        ctx.stroke();
      }

      // Reset shadow blur to prevent leaking to CRT scanlines
      ctx.shadowBlur = 0;

      // 7. CRT Phosphor Scanline Overlay Effect
      ctx.fillStyle = 'rgba(5, 19, 23, 0.15)';
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }

      // CRT Screen Bezel Glow Corner Vignette
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        height * 0.45,
        width / 2,
        height / 2,
        width * 0.6
      );
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, 'rgba(0, 10, 8, 0.7)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, [
    loadSpectrum,
    apfEnabled,
    apfEfficiency,
    frequencyHz,
    fundamentalAmp,
    timebaseScale,
    showGridTrace,
    showLoadTrace,
    showApfTrace,
  ]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-[#10b981]/30 bg-[#051317] shadow-[0_0_25px_rgba(16,185,129,0.15)] h-full w-full flex flex-col justify-between ${className}`}>
      
      {/* CRT Top Status Bar */}
      <div className="absolute top-2 left-3 right-3 flex items-center justify-between z-10 font-mono text-[10px]">
        <div className="flex items-center gap-2 pointer-events-none">
          <span className="flex items-center gap-1 text-[#10b981] font-bold">
            <span className={`w-2 h-2 rounded-full bg-[#10b981] ${isPaused ? '' : 'animate-ping'}`} />
            GRID
          </span>
          <span className="text-[#ef4444] font-bold">LOAD</span>
          {apfEnabled && <span className="text-[#06b6d4] font-bold">APF</span>}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="pointer-events-auto px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-all cursor-pointer bg-[#10b981]/20 hover:bg-[#10b981]/40 border border-[#10b981]/50 text-[#10b981]"
          >
            {isPaused ? '▶ RESUME' : '❚❚ PAUSE'}
          </button>
          <div className="text-[#10b981]/70 bg-[#051317]/80 px-2 py-0.5 rounded border border-[#10b981]/20 pointer-events-none">
            30 FPS SCOPE
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={220}
        className="w-full flex-1 block cursor-crosshair object-cover"
      />
    </div>
  );
};
