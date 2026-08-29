import React, { useEffect, useRef } from 'react';

export const WaveformBackground: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      time += 0.012;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Wave 1: 3-Phase Fundamental Sine (Blue)
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isDarkMode ? 'rgba(59, 130, 246, 0.28)' : 'rgba(37, 99, 235, 0.22)';
      for (let x = 0; x < w; x += 4) {
        const y = h / 2 + Math.sin(x * 0.01 + time) * 45;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Wave 2: SCR Switching Chopped Waveform (Cyan)
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isDarkMode ? 'rgba(34, 211, 238, 0.22)' : 'rgba(14, 165, 233, 0.18)';
      for (let x = 0; x < w; x += 5) {
        const phase = (x * 0.012 + time * 1.5) % (Math.PI * 2);
        const switched = phase > 1.2 && phase < 4.8 ? Math.sin(phase) * 55 : 0;
        const y = h / 2 - switched;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Wave 3: High Frequency PWM Carrier (Indigo)
      ctx.beginPath();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = isDarkMode ? 'rgba(129, 140, 248, 0.18)' : 'rgba(79, 70, 229, 0.15)';
      for (let x = 0; x < w; x += 3) {
        const y = h / 2 + Math.sin(x * 0.035 + time * 2) * 18 + Math.cos(x * 0.006 - time) * 30;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isDarkMode]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-90"
      aria-hidden="true"
    />
  );
};
