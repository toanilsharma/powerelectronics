import React, { useState } from 'react';
import { Phasor3DDiagram } from './Phasor3DDiagram';
import { SpectrogramWaterfall } from './SpectrogramWaterfall';
import { HarmonicComponent } from '../utils/PowerQualityEngine';
import { Box, Layers, BarChart3, Activity } from 'lucide-react';

interface AdvancedVisualizationTabsProps {
  loadSpectrum: HarmonicComponent[];
  maxDemandIl?: number;
  frequencyHz?: number;
  className?: string;
}

/**
 * Advanced Visualization Tabs Container
 * Allows switching between:
 *  - Tab 1: 3D Phasor Vector Diagram (Three.js / 3D Canvas Projection)
 *  - Tab 2: Real-Time Spectrogram Waterfall Plot (Heatmap Canvas)
 */
export const AdvancedVisualizationTabs: React.FC<AdvancedVisualizationTabsProps> = ({
  loadSpectrum,
  maxDemandIl = 100,
  frequencyHz = 50,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'3d-phasor' | 'spectrogram'>('3d-phasor');

  return (
    <div className={`space-y-4 ${className}`}>
      
      {/* Navigation Tab Buttons */}
      <div className="flex items-center justify-between bg-[#1e293b] border border-[#334155] p-2 rounded-2xl">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('3d-phasor')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === '3d-phasor'
                ? 'bg-[#06b6d4] text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-[#0f172a] text-[#94a3b8] hover:text-white border border-[#334155]'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>Tab 1: 3D Phasor Diagram</span>
          </button>

          <button
            onClick={() => setActiveTab('spectrogram')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              activeTab === 'spectrogram'
                ? 'bg-[#06b6d4] text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-[#0f172a] text-[#94a3b8] hover:text-white border border-[#334155]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Tab 2: Spectrogram Waterfall</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#94a3b8] px-3">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
          <span>REAL-TIME 3D / SPECTRAL SOLVER</span>
        </div>
      </div>

      {/* Active Tab View */}
      {activeTab === '3d-phasor' ? (
        <Phasor3DDiagram loadSpectrum={loadSpectrum} frequencyHz={frequencyHz} />
      ) : (
        <SpectrogramWaterfall loadSpectrum={loadSpectrum} maxDemandIl={maxDemandIl} />
      )}

    </div>
  );
};
