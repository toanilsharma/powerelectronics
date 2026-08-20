/**
 * src/theme/primitives.tsx
 * 
 * Reusable Industrial UI Components & Primitives for Power Electronics Labs
 */

import React from 'react';
import { PE_COLORS } from './colors';

/**
 * Industrial Panel Card Container
 */
export interface IndustrialPanelProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const IndustrialPanel: React.FC<IndustrialPanelProps> = ({
  title,
  subtitle,
  icon,
  headerAction,
  children,
  className = '',
}) => {
  return (
    <div className={`bg-[#0d131f] border border-[#1e293b] rounded-2xl p-4 md:p-5 shadow-xl flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="font-bold text-white text-xs md:text-sm tracking-wide">{title}</h3>
            {subtitle && <p className="text-[11px] text-slate-400 font-mono">{subtitle}</p>}
          </div>
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
};

/**
 * Industrial Annunciator Status Lamp Indicator
 */
export interface StatusLampProps {
  label: string;
  isActive: boolean;
  color: 'slate' | 'amber' | 'cyan' | 'green' | 'red';
  isFlashing?: boolean;
}

export const StatusLamp: React.FC<StatusLampProps> = ({
  label,
  isActive,
  color,
  isFlashing = false,
}) => {
  const colorClasses = {
    slate: isActive ? 'bg-slate-700 text-slate-200 border-slate-400 shadow-[0_0_12px_rgba(100,116,139,0.6)]' : 'bg-[#0a0f18] text-slate-600 border-[#1e293b]',
    amber: isActive ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'bg-[#0a0f18] text-slate-600 border-[#1e293b]',
    cyan: isActive ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)]' : 'bg-[#0a0f18] text-slate-600 border-[#1e293b]',
    green: isActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-[#0a0f18] text-slate-600 border-[#1e293b]',
    red: isActive ? 'bg-rose-500/20 text-rose-300 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)]' : 'bg-[#0a0f18] text-slate-600 border-[#1e293b]',
  };

  return (
    <div
      className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono transition-all duration-300 flex items-center justify-center gap-2 ${colorClasses[color]} ${
        isFlashing && isActive ? 'animate-pulse' : ''
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isActive ? (color === 'red' ? 'bg-rose-400' : color === 'green' ? 'bg-emerald-400' : color === 'cyan' ? 'bg-cyan-400' : 'bg-amber-400') : 'bg-slate-700'
        }`}
      />
      <span>{label}</span>
    </div>
  );
};

/**
 * Oscilloscope CRT Display Container
 */
export interface ScopeCRTContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const ScopeCRTContainer: React.FC<ScopeCRTContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative w-full rounded-xl overflow-hidden border border-[#1e293b] bg-[#070a10] shadow-inner ${className}`}>
      {children}
    </div>
  );
};
