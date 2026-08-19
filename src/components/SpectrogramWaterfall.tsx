import React, { useEffect, useRef, useState } from 'react';
import { HarmonicComponent } from '../utils/PowerQualityEngine';
import { Play, Pause, RefreshCw, Info, Flame, Layers } from 'lucide-react';

interface SpectrogramWaterfallProps {
  loadSpectrum: HarmonicComponent[];
  maxDemandIl?: number;
  maxDisplayOrder?: number; // Default 25
  className?: string;
}

/**
 * Task 2: Real-time Spectrogram Waterfall Plot (HTML5 Heatmap Canvas)
 * 
 * Axes:
 *  - X-Axis: Frequency / Harmonic Order (H1 to H25)
 *  - Y-Axis: Time (scrolling downwards)
 *  - Z-Axis (Color Heatmap): Magnitude / % of IL (Dark Slate -> Cyan -> Yellow -> Red)
 * 
 * Visualizes dynamic harmonic spectral changes over time when sliders/presets are adjusted.
 */
export const SpectrogramWaterfall: React.FC<SpectrogramWaterfallProps> = ({
  loadSpectrum,
  maxDemandIl = 100,
  maxDisplayOrder = 25,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(1); // pixels per frame

  // Extract harmonic order magnitudes up to maxDisplayOrder
  const spectrumMap = React.useMemo(() => {
    const map = new Map<number, number>();
    for (const comp of loadSpectrum) {
      map.set(comp.order, comp.magnitude);
    }
    return map;
  }, [loadSpectrum]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // Heatmap Color Gradient Converter
    const getHeatmapColor = (pctOfIl: number) => {
      // pctOfIl range: 0% to 50%
      const val = Math.min(1.0, pctOfIl / 40);

      if (val < 0.05) return '#0f172a';           // Dark Slate (0%)
      if (val < 0.15) return '#06b6d4';           // Cyan (low)
      if (val < 0.35) return '#10b981';           // Green (medium)
      if (val < 0.60) return '#f59e0b';           // Amber (high)
      return '#ef4444';                           // Neon Red (critical)
    };

    const renderFrame = () => {
      if (!isPaused) {
        const width = canvas.width;
        const height = canvas.height;

        const paddingLeft = 40;
        const paddingBottom = 25;
        const waterfallWidth = width - paddingLeft - 10;
        const waterfallHeight = height - paddingBottom - 10;

        // 1. Shift canvas content DOWN by scrollSpeed pixels
        ctx.drawImage(
          canvas,
          paddingLeft,
          10,
          waterfallWidth,
          waterfallHeight - scrollSpeed,
          paddingLeft,
          10 + scrollSpeed,
          waterfallWidth,
          waterfallHeight - scrollSpeed
        );

        // 2. Draw New Top Strip Row (Y = 10)
        const colWidth = waterfallWidth / maxDisplayOrder;

        for (let order = 1; order <= maxDisplayOrder; order++) {
          const mag = spectrumMap.get(order) ?? 0;
          const pctOfIl = maxDemandIl > 0 ? (mag / maxDemandIl) * 100 : 0;

          const color = getHeatmapColor(pctOfIl);
          const x = paddingLeft + (order - 1) * colWidth;

          ctx.fillStyle = color;
          ctx.fillRect(x, 10, colWidth - 1, scrollSpeed);
        }

        // 3. Draw X-Axis Labels & Grid Borders
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, height - paddingBottom, width, paddingBottom);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';

        for (let order = 1; order <= maxDisplayOrder; order += 2) {
          const x = paddingLeft + (order - 1) * colWidth + colWidth / 2;
          ctx.fillText(`H${order}`, x, height - 8);
        }

        // 4. Draw Y-Axis Time Label
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, paddingLeft, height);

        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';
        ctx.fillText('NOW', paddingLeft - 5, 20);
        ctx.fillText('-5s', paddingLeft - 5, height / 2);
        ctx.fillText('-10s', paddingLeft - 5, height - paddingBottom - 5);
      }

      animationFrameId = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [spectrumMap, maxDemandIl, maxDisplayOrder, isPaused, scrollSpeed]);

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className={`bg-[#1e293b] border border-[#334155] rounded-2xl p-5 shadow-2xl space-y-4 ${className}`}>
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#334155] pb-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span>🔥</span> Real-Time Spectrogram Waterfall Plot
          </h2>
          <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
            X: Harmonic Order (H1–H{maxDisplayOrder}) • Y: Time (Scrolling Down) • Z: Color Amplitude
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-xl border border-[#334155] bg-[#0f172a] hover:border-[#06b6d4] text-[#94a3b8] hover:text-white transition-colors"
            title={isPaused ? 'Resume Waterfall' : 'Pause Waterfall'}
          >
            {isPaused ? <Play className="w-4 h-4 text-[#10b981]" /> : <Pause className="w-4 h-4 text-amber-400" />}
          </button>

          <button
            onClick={handleClearCanvas}
            className="p-2 rounded-xl border border-[#334155] bg-[#0f172a] hover:border-[#06b6d4] text-[#94a3b8] hover:text-white transition-colors"
            title="Clear Waterfall History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Waterfall Heatmap Canvas Viewport */}
      <div className="relative rounded-xl overflow-hidden border border-[#334155] bg-[#0f172a]">
        
        <canvas
          ref={canvasRef}
          width={800}
          height={260}
          className="w-full h-[240px] md:h-[260px] block"
        />

        {/* Color Gradient Legend */}
        <div className="absolute top-3 right-3 bg-[#1e293b]/90 backdrop-blur border border-[#334155] px-3 py-1.5 rounded-xl text-[10px] font-mono flex items-center gap-2">
          <span className="text-[#94a3b8]">0% IL</span>
          <div className="w-24 h-2.5 rounded bg-gradient-to-r from-[#0f172a] via-[#06b6d4] via-[#10b981] via-[#f59e0b] to-[#ef4444]" />
          <span className="text-[#ef4444] font-bold">&gt;40% IL</span>
        </div>

      </div>

      {/* Physics Explanation Note */}
      <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-xl text-xs space-y-1 text-[#94a3b8]">
        <div className="font-semibold text-white flex items-center gap-1.5">
          <Info className="w-4 h-4 text-[#06b6d4]" />
          Spectrogram Waterfall Physics Note
        </div>
        <p className="text-[11px] leading-relaxed">
          The waterfall plot records time-varying harmonic spectrum signatures.
          As load conditions change or APF filters activate, previous harmonic rows scroll downward, providing a complete historical spectral audit.
        </p>
      </div>

    </div>
  );
};
