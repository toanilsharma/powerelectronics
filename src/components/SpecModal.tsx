import React from 'react';
import { X, Zap, ShieldCheck, Cpu, ArrowRight } from 'lucide-react';
import { TopologyPreviewSVG } from './TopologyPreviewSVG';

interface SimulatorSpec {
  id: string;
  tabName: string;
  title: string;
  icon: string;
  description: string;
  standards: string[];
  voltage: string;
}

interface SpecModalProps {
  sim: SimulatorSpec | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (id: string) => void;
}

export const SpecModal: React.FC<SpecModalProps> = ({ sim, isOpen, onClose, onLaunch }) => {
  if (!isOpen || !sim) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 font-sans">
      {/* Dark backdrop overlay */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Bottom sheet on mobile / Modal box on desktop */}
      <div className="relative w-full max-w-2xl bg-[#0a0f1e] border border-[#1e293b] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl z-50 flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-slide-in text-white">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-12 h-12 rounded-xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-2xl shrink-0 text-blue-400">
              {sim.icon}
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-lg sm:text-xl font-black text-white leading-tight tracking-tight">
                {sim.title}
              </h2>
              <span className="text-xs font-mono text-blue-400 font-bold mt-1">
                {sim.voltage}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-11 h-11 min-h-[44px] rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-all shrink-0 cursor-pointer p-0"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Topology Preview Diagram */}
        <div className="w-full bg-[#070b14] border border-slate-800/80 rounded-xl p-3">
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Single Line Topology Diagram</span>
            <span className="text-emerald-400 font-bold">100% Verified</span>
          </div>
          <TopologyPreviewSVG simId={sim.id} className="w-full h-28" />
        </div>

        {/* Full Unclipped Description */}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            Detailed Description & Operational Specs
          </h3>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed bg-[#0f172a]/60 border border-slate-800/60 p-4 rounded-xl">
            {sim.description}
          </p>
        </div>

        {/* Standards Grid */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            Compliance Standards & Engineering Guidelines
          </h3>
          <div className="flex flex-wrap gap-2">
            {sim.standards.map((std) => (
              <div 
                key={std} 
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-xs font-mono text-slate-200 border border-slate-700 flex items-center gap-1.5 font-medium"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>{std}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Application Specs */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-[#141a24] border border-[#1e293b] p-3 rounded-xl flex flex-col gap-0.5 font-mono">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Operating Voltage</span>
            <span className="text-xs text-blue-400 font-bold">{sim.voltage}</span>
          </div>
          <div className="bg-[#141a24] border border-[#1e293b] p-3 rounded-xl flex flex-col gap-0.5 font-mono">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Simulation Engine</span>
            <span className="text-xs text-emerald-400 font-bold">Real-Time DSP (60 FPS)</span>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-800 mt-2">
          <button
            onClick={onClose}
            className="w-full sm:w-auto flex-1 min-h-[48px] h-12 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
          >
            Close Spec
          </button>
          
          <button
            onClick={() => {
              onClose();
              onLaunch(sim.id);
            }}
            className="w-full sm:w-auto flex-1 min-h-[48px] h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 cursor-pointer border-0"
          >
            <span>Launch Simulator</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
