import React from 'react';
import { Activity, TrendingUp, Sliders, AlertTriangle, BookOpen, Layers } from 'lucide-react';

interface DCDCBottomTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const DCDCBottomTabs: React.FC<DCDCBottomTabsProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'telemetry', label: '📊 Waveform Telemetry', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'curves', label: '📈 Inductor Sawtooth Curves', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'compare', label: '⚖️ LDO vs Switching Efficiency', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'faults', label: '🎯 Fault Annunciator Matrix', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { id: 'sop', label: '📋 Substation SOP Guidelines', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full bg-[#070b14] border-2 border-[#1e293b] rounded-2xl p-2 shadow-xl font-mono">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[44px] flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md scale-[1.02]'
                  : 'bg-[#0b1220] text-slate-400 border-[#1e293b] hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
