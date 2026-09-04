import React, { useState } from 'react';
import {
  Activity,
  Award,
  Battery,
  Camera,
  Compass,
  Cpu,
  Flame,
  Gauge,
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  Radio,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
  Wrench,
  X,
  Zap
} from 'lucide-react';
import { VirtualDiagnosticsInstrumentation } from './VirtualDiagnosticsInstrumentation';
import { IndustrialLotoCertificationLab } from './IndustrialLotoCertificationLab';
import { CircuitBreakerArcChuteLab } from './CircuitBreakerArcChuteLab';
import { BatteryThermalRunawayLab } from './BatteryThermalRunawayLab';

interface UniversalVisualQuickNavProps {
  className?: string;
}

/**
 * UniversalVisualQuickNav.tsx
 * 
 * Gap 23: Universal "See-to-Learn" Visual Pedagogy & Master Diagnostic Tool HUD
 * 
 * Floating persistent engineering HUD accessible across all simulator pages.
 * Provides instant 1-click access to CAT IV Virtual DMM, 4-Ch DSO, FLIR Camera,
 * Circuit Breaker Arc Chute, Battery Thermal Runaway, and OSHA LOTO Certification!
 */
export const UniversalVisualQuickNav: React.FC<UniversalVisualQuickNavProps> = ({
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<
    'none' | 'diagnostics' | 'loto' | 'arc_chute' | 'battery_runaway'
  >('none');

  return (
    <>
      {/* Floating Floating HUD Pill Button on Bottom-Right */}
      <div className={`fixed bottom-5 right-5 z-40 flex items-center gap-2 select-none ${className}`}>
        
        {/* Quick Trigger Buttons */}
        <div className="flex items-center gap-2 bg-[#020617]/90 backdrop-blur-md border border-[#334155] p-1.5 rounded-2xl shadow-2xl">
          <button
            onClick={() => setActiveModal('diagnostics')}
            className="px-3 py-1.5 rounded-xl bg-[#06b6d4] hover:bg-[#0891b2] text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            title="Open IEC 61010-031 Virtual DMM, 4-Ch Scope & FLIR Camera"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">VIRTUAL TOOLS</span>
          </button>

          <button
            onClick={() => setActiveModal('loto')}
            className="px-3 py-1.5 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            title="Open OSHA 1910.147 / NFPA 70E LOTO Certification Drill"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">OSHA LOTO</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] text-white border border-[#475569] cursor-pointer transition-all"
            title="Toggle Visual Mastery Hub"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
          </button>
        </div>

      </div>

      {/* Slide-Up Visual Navigation Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 right-5 z-40 w-84 sm:w-96 bg-[#0a0f1d]/95 backdrop-blur-xl border-2 border-[#06b6d4] rounded-3xl p-4 shadow-2xl space-y-3 font-mono text-xs select-none">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <span className="font-extrabold text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#06b6d4]" />
              POWER LAB MASTER DRILLS HUD
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-[#94a3b8] hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-[#94a3b8] font-sans">
            Instant access to verified IEEE / IEC / OSHA visual physics cavities:
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setActiveModal('diagnostics');
                setIsOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <Gauge className="w-3.5 h-3.5" /> Tools Suite
              </div>
              <div className="text-[9px] text-[#94a3b8] mt-0.5">DMM, DSO &amp; FLIR</div>
            </button>

            <button
              onClick={() => {
                setActiveModal('loto');
                setIsOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-red-400 font-bold">
                <Lock className="w-3.5 h-3.5" /> OSHA LOTO
              </div>
              <div className="text-[9px] text-[#94a3b8] mt-0.5">Field Safety Drill</div>
            </button>

            <button
              onClick={() => {
                setActiveModal('arc_chute');
                setIsOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Flame className="w-3.5 h-3.5" /> Arc Chute
              </div>
              <div className="text-[9px] text-[#94a3b8] mt-0.5">IEC 60947 Breaker</div>
            </button>

            <button
              onClick={() => {
                setActiveModal('battery_runaway');
                setIsOpen(false);
              }}
              className="p-2.5 rounded-xl bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Battery className="w-3.5 h-3.5" /> Battery Thermal
              </div>
              <div className="text-[9px] text-[#94a3b8] mt-0.5">IEEE 1188 Runaway</div>
            </button>
          </div>

          <div className="text-[9px] text-center text-[#64748b] border-t border-[#1e293b] pt-1.5">
            PE TRAINING LAB • 25/25 GAPS COMPLIANT
          </div>
        </div>
      )}

      {/* MODAL 1: Virtual Diagnostics Suite */}
      {activeModal === 'diagnostics' && (
        <div className="fixed inset-0 z-50 bg-[#060911]/95 backdrop-blur-md flex flex-col p-4 gap-3 select-none overflow-y-auto">
          <VirtualDiagnosticsInstrumentation onClose={() => setActiveModal('none')} />
        </div>
      )}

      {/* MODAL 2: OSHA LOTO Certification */}
      {activeModal === 'loto' && (
        <div className="fixed inset-0 z-50 bg-[#060911]/95 backdrop-blur-md flex flex-col p-4 gap-3 select-none overflow-y-auto">
          <IndustrialLotoCertificationLab onClose={() => setActiveModal('none')} />
        </div>
      )}

      {/* MODAL 3: Circuit Breaker Arc Chute */}
      {activeModal === 'arc_chute' && (
        <div className="fixed inset-0 z-50 bg-[#060911]/95 backdrop-blur-md flex flex-col p-4 gap-3 select-none overflow-y-auto">
          <CircuitBreakerArcChuteLab onClose={() => setActiveModal('none')} />
        </div>
      )}

      {/* MODAL 4: Battery Thermal Runaway */}
      {activeModal === 'battery_runaway' && (
        <div className="fixed inset-0 z-50 bg-[#060911]/95 backdrop-blur-md flex flex-col p-4 gap-3 select-none overflow-y-auto">
          <BatteryThermalRunawayLab onClose={() => setActiveModal('none')} />
        </div>
      )}
    </>
  );
};
