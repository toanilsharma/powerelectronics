import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';

interface PrivacyViewProps {
  isDarkMode: boolean;
  onBack: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ isDarkMode, onBack }) => {
  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 sm:gap-8 py-2 sm:py-6">
        
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer select-none ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4 text-blue-500" />
            <span>Back to Simulators</span>
          </button>

          <span className={`text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-full border ${
            isDarkMode ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            PRIVACY POLICY
          </span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col gap-2 border-b border-slate-800/80 pb-6">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-400" />
            Privacy Policy
          </h1>
          <p className={`text-sm leading-relaxed max-w-2xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Last updated: August 2026. Learn how Power Electronics Lab protects your privacy during browser simulation sessions.
          </p>
        </div>

        <div className={`p-6 sm:p-8 rounded-2xl border flex flex-col gap-5 ${
          isDarkMode ? 'bg-[#0d1424] border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
        }`}>
          <h2 className="text-base font-bold text-white">1. Client-Side Browser Execution</h2>
          <p className="text-xs leading-relaxed">
            Power Electronics Lab is executed entirely on your local machine using standard web browser technologies (HTML5, JavaScript, WebGL/Canvas). Circuit solver calculations, waveform graphs, and report generation occur inside your browser. No personal telemetry or user data is transmitted to external servers.
          </p>

          <h2 className="text-base font-bold text-white">2. Local Preference Storage</h2>
          <p className="text-xs leading-relaxed">
            The application may store non-sensitive UI configuration data (such as dark mode preferences, scope channel settings, or last active tab) in your browser’s <code>localStorage</code>. You can clear this data at any time through your browser settings.
          </p>

          <h2 className="text-base font-bold text-white">3. Contact Communications</h2>
          <p className="text-xs leading-relaxed">
            If you send an inquiry to our engineering team at <code>0808miracle@gmail.com</code>, your email address and message contents are strictly used to respond to your inquiry and are never shared or sold to third parties.
          </p>
        </div>

      </div>
  );
};
