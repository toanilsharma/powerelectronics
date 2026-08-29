import React from 'react';
import { FlaskConical, Zap, FileText, BookOpen } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string | null;
  setActiveTab: (tab: string | null) => void;
  isDarkMode: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, setActiveTab, isDarkMode }) => {
  return (
    <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 h-14 border-t backdrop-blur-md px-3 flex items-center justify-around select-none shadow-2xl ${
      isDarkMode ? 'bg-[#070d19]/95 border-slate-800 text-slate-400' : 'bg-white/95 border-slate-200 text-slate-600'
    }`}>
      {/* 1. Fundamentals */}
      <button
        type="button"
        onClick={() => setActiveTab('foundation-lab')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer border-none bg-transparent transition-colors ${
          activeTab === 'foundation-lab' ? 'text-blue-500 font-bold' : 'hover:text-slate-200'
        }`}
      >
        <FlaskConical className="w-4 h-4" />
        <span className="text-[10px] font-mono uppercase tracking-tight">Fundamentals</span>
      </button>

      {/* 2. Chargers */}
      <button
        type="button"
        onClick={() => setActiveTab('single-charger')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer border-none bg-transparent transition-colors ${
          activeTab === 'single-charger' || activeTab === 'dual-charger' ? 'text-blue-500 font-bold' : 'hover:text-slate-200'
        }`}
      >
        <Zap className="w-4 h-4" />
        <span className="text-[10px] font-mono uppercase tracking-tight">Chargers</span>
      </button>

      {/* 3. Methodology / Reports */}
      <button
        type="button"
        onClick={() => setActiveTab('methodology')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full cursor-pointer border-none bg-transparent transition-colors ${
          activeTab === 'methodology' ? 'text-blue-500 font-bold' : 'hover:text-slate-200'
        }`}
      >
        <BookOpen className="w-4 h-4" />
        <span className="text-[10px] font-mono uppercase tracking-tight">Methodology</span>
      </button>
    </div>
  );
};
