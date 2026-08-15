import React, { useEffect, useRef, useState } from 'react';
import { HarmonicBarData, HarmonicSourceType } from '../types/harmonics';
import { Activity, AlertTriangle, CheckCircle, ShieldAlert, BarChart2 } from 'lucide-react';

interface HarmonicsFFTChartProps {
  title: string;
  harmonics: HarmonicBarData[];
  thdVal: number;
  isCompliant: boolean;
  selectedHarmonic: HarmonicBarData | null;
  onSelectHarmonic: (bar: HarmonicBarData) => void;
  width?: number;
  height?: number;
}

export const HarmonicsFFTChart: React.FC<HarmonicsFFTChartProps> = ({
  title,
  harmonics,
  thdVal,
  isCompliant,
  selectedHarmonic,
  onSelectHarmonic,
  width = 600,
  height = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredBar, setHoveredBar] = useState<HarmonicBarData | null>(null);

  // Render Canvas FFT Bar Chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background
    ctx.fillStyle = '#090d12';
    ctx.fillRect(0, 0, w, h);

    // Margins
    const paddingLeft = 45;
    const paddingBottom = 30;
    const paddingTop = 20;
    const paddingRight = 20;

    const chartW = w - paddingLeft - paddingRight;
    const chartH = h - paddingTop - paddingBottom;

    // Max Y scale = 30% for harmonics (since h=1 fundamental at 100% is omitted/scaled or shown with max Y=30%)
    const maxY = 30;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let yVal = 0; yVal <= maxY; yVal += 5) {
      const y = paddingTop + chartH - (yVal / maxY) * chartH;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(paddingLeft + chartW, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${yVal}%`, paddingLeft - 5, y + 3);
    }

    // Filter harmonics to order 2 to 50 for chart
    const displayHarmonics = harmonics.filter((item) => item.order >= 2 && item.order <= 50);
    const barWidth = Math.max(2, chartW / displayHarmonics.length - 2);

    // DRAW BARS
    displayHarmonics.forEach((bar, index) => {
      const x = paddingLeft + index * (chartW / displayHarmonics.length) + 1;
      const barH = (Math.min(bar.magnitude, maxY) / maxY) * chartH;
      const y = paddingTop + chartH - barH;

      const isSelected = selectedHarmonic?.order === bar.order;
      const isHovered = hoveredBar?.order === bar.order;

      // Color
      if (bar.isExceeding) {
        ctx.fillStyle = isSelected || isHovered ? '#f87171' : '#ef4444';
      } else {
        ctx.fillStyle = isSelected || isHovered ? '#34d399' : '#10b981';
      }

      ctx.fillRect(x, y, barWidth, barH);

      // Selection outline
      if (isSelected || isHovered) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, barWidth, barH);
      }

      // X Axis Tick Labels (every 5 orders)
      if (bar.order % 5 === 0 || bar.order === 2) {
        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`h${bar.order}`, x + barWidth / 2, paddingTop + chartH + 15);
      }
    });

    // DRAW IEEE 519 LIMIT LINE OVERLAY (Dashed Red)
    ctx.beginPath();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);

    displayHarmonics.forEach((bar, index) => {
      const x = paddingLeft + index * (chartW / displayHarmonics.length) + barWidth / 2;
      const limitY = paddingTop + chartH - (bar.limit / maxY) * chartH;

      if (index === 0) ctx.moveTo(x, limitY);
      else ctx.lineTo(x, limitY);
    });
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Axis Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HARMONIC ORDER (h=2 to 50)', paddingLeft + chartW / 2, h - 5);
  }, [harmonics, selectedHarmonic, hoveredBar]);

  // Click Handler on Canvas to select harmonic
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    const paddingLeft = 45;
    const paddingRight = 20;
    const chartW = canvas.width - paddingLeft - paddingRight;

    const displayHarmonics = harmonics.filter((item) => item.order >= 2 && item.order <= 50);
    const step = chartW / displayHarmonics.length;

    const index = Math.floor((clickX - paddingLeft) / step);
    if (index >= 0 && index < displayHarmonics.length) {
      onSelectHarmonic(displayHarmonics[index]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const paddingLeft = 45;
    const paddingRight = 20;
    const chartW = canvas.width - paddingLeft - paddingRight;

    const displayHarmonics = harmonics.filter((item) => item.order >= 2 && item.order <= 50);
    const step = chartW / displayHarmonics.length;

    const index = Math.floor((mouseX - paddingLeft) / step);
    if (index >= 0 && index < displayHarmonics.length) {
      setHoveredBar(displayHarmonics[index]);
    } else {
      setHoveredBar(null);
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-3 shadow-2xl">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#30363d] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-950/60 border border-emerald-800 rounded-lg text-emerald-400">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
            <p className="text-[11px] text-slate-400">Fast Fourier Transform (FFT) Harmonic Spectrum (2nd to 50th)</p>
          </div>
        </div>

        {/* THD READOUT & PASS/FAIL INDICATOR */}
        <div className="flex items-center gap-4">
          <div className="bg-[#0d1117] border border-[#30363d] px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">CURRENT THD:</span>
            <span className="text-lg font-mono font-extrabold text-emerald-400">
              {thdVal.toFixed(1)}%
            </span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
              isCompliant
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                : 'bg-red-950 border-red-500 text-red-300 animate-pulse'
            }`}
          >
            {isCompliant ? <CheckCircle className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            {isCompliant ? 'COMPLIANT (IEEE 519)' : 'NON-COMPLIANT'}
          </div>
        </div>
      </div>

      {/* CANVAS DISPLAY */}
      <div className="relative w-full overflow-hidden bg-[#090d12] border border-[#30363d] rounded-lg">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredBar(null)}
          className="w-full h-[280px] cursor-pointer"
        />
      </div>

      {/* INTERACTIVE DETAILS CARD */}
      {selectedHarmonic && (
        <div className="bg-[#0d1117] border border-cyan-500/50 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <Activity className="w-4 h-4" />
            HARMONIC DETAILS (ORDER h={selectedHarmonic.order})
          </div>
          <div className="flex items-center gap-4 text-slate-200 font-mono">
            <span>
              MEASURED: <strong className="text-white">{selectedHarmonic.magnitude.toFixed(1)}%</strong>
            </span>
            <span>
              IEEE LIMIT: <strong className="text-cyan-400">{selectedHarmonic.limit.toFixed(1)}%</strong>
            </span>
            <span
              className={`font-bold ${
                selectedHarmonic.isExceeding ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {selectedHarmonic.isExceeding
                ? `EXCEEDS BY +${(selectedHarmonic.magnitude - selectedHarmonic.limit).toFixed(1)}%`
                : 'WITHIN IEEE 519 LIMIT'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
