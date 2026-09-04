import React, { useState } from 'react';
import { Mail, Send, X, Shield, FileText, Info, CheckCircle2, Copy, ExternalLink, Scale, ShieldAlert } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, isDarkMode }) => {
  const [copied, setCopied] = useState(false);
  const [subject, setSubject] = useState('General Enquiry');
  const [message, setMessage] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const email = '0808miracle@gmail.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(`[Power Electronics Lab] ${subject}`)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoUrl;
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className={`relative w-full max-w-lg rounded-2xl border p-6 shadow-2xl flex flex-col gap-5 ${
          isDarkMode ? 'bg-[#0d1424] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Contact Engineering Team</h2>
              <p className="text-xs text-slate-400 font-mono">Power Electronics Lab</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Email Address Display Box */}
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
          isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-mono uppercase font-bold text-blue-400">Direct Contact Email</span>
            <span className="text-sm font-mono font-bold text-white select-all">{email}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Contact Form */}
        <form onSubmit={handleSend} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-bold text-slate-300">Enquiry Category</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
            >
              <option value="General Enquiry">General Enquiry</option>
              <option value="Model & Equation Feedback">Model &amp; Equation Feedback</option>
              <option value="University / Course Integration">University / Course Integration</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Bug Report">Bug Report</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-bold text-slate-300">Your Message</label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your inquiry, simulation question, or feedback..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {sentSuccess ? (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Opening your email client... Message ready!</span>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Email</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export const PrivacyModal: React.FC<{ isOpen: boolean; onClose: () => void; isDarkMode: boolean }> = ({ isOpen, onClose, isDarkMode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className={`relative w-full max-w-2xl rounded-2xl border p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto ${
        isDarkMode ? 'bg-[#0d1424] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-extrabold">Privacy Policy</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="text-xs text-slate-300 leading-relaxed flex flex-col gap-3">
          <p><strong>Effective Date:</strong> August 2026</p>
          <p>Power Electronics Lab respects user privacy and is designed as a client-side educational application.</p>
          <h3 className="font-bold text-white text-sm mt-1">1. Data Collection</h3>
          <p>We do not collect personal identifying information, track user identities, or store personal telemetry. All circuit solver calculations occur locally inside your browser.</p>
          <h3 className="font-bold text-white text-sm mt-1">2. Local Storage</h3>
          <p>The application may store temporary preferences (such as dark mode state or scope channel settings) in your browser’s localStorage. No remote user profiling is conducted.</p>
          <h3 className="font-bold text-white text-sm mt-1">3. Contact Inquiries</h3>
          <p>When contacting us via email at <code>0808miracle@gmail.com</code>, your email address is used solely to respond to your inquiry.</p>
        </div>
      </div>
    </div>
  );
};

export const TermsModal: React.FC<{ isOpen: boolean; onClose: () => void; isDarkMode: boolean }> = ({ isOpen, onClose, isDarkMode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className={`relative w-full max-w-2xl rounded-2xl border p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto ${
        isDarkMode ? 'bg-[#0d1424] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-extrabold">Terms of Use</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="text-xs text-slate-300 leading-relaxed flex flex-col gap-3">
          <p><strong>Educational Disclaimer:</strong> Power Electronics Lab is an educational simulation suite.</p>
          <h3 className="font-bold text-white text-sm mt-1">1. Educational Scope</h3>
          <p>Simulation outputs are model-based and intended solely for learning, conceptual demonstration, and academic exploration. They do not constitute certified engineering designs or protection study approvals.</p>
          <h3 className="font-bold text-white text-sm mt-1">2. No Guarantee of Physical Accuracy</h3>
          <p>While models are benchmarked within 2-5% against standard equations, physical installations must rely on site measurements, manufacturer nameplate ratings, and regulatory code requirements.</p>
          <h3 className="font-bold text-white text-sm mt-1">3. Contact</h3>
          <p>For questions or feedback, reach out to <code>0808miracle@gmail.com</code>.</p>
        </div>
      </div>
    </div>
  );
};

export const AboutModal: React.FC<{ isOpen: boolean; onClose: () => void; isDarkMode: boolean }> = ({ isOpen, onClose, isDarkMode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className={`relative w-full max-w-2xl rounded-2xl border p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto ${
        isDarkMode ? 'bg-[#0d1424] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-extrabold">About Power Electronics Lab</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="text-xs text-slate-300 leading-relaxed flex flex-col gap-3">
          <p>Power Electronics Lab is a browser-native electrical engineering simulation suite created and engineered by <strong>Anil Sharma</strong>.</p>
          <p>The mission of the lab is to make complex power conversion concepts—such as SCR firing angles, 3-phase Graetz rectifiers, soft starter current ramps, static transfer switches, and IEEE 519 harmonic spectrums—accessible to students, educators, and field engineers worldwide.</p>
          <p>Contact Email: <code className="text-blue-400">0808miracle@gmail.com</code></p>
        </div>
      </div>
    </div>
  );
};

export const DisclaimerModal: React.FC<{ isOpen: boolean; onClose: () => void; isDarkMode: boolean }> = ({ isOpen, onClose, isDarkMode }) => {
  if (!isOpen) return null;
  const email = '0808miracle@gmail.com';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className={`relative w-full max-w-2xl rounded-2xl border p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto ${
        isDarkMode ? 'bg-[#0d1424] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-extrabold">Educational Notice &amp; Disclaimer</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="text-xs text-slate-300 leading-relaxed flex flex-col gap-3">
          <div className="p-3.5 rounded-xl border bg-amber-950/40 border-amber-800/60 text-amber-200 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Independent Educational Platform:</strong> Not affiliated with, endorsed by, certified by, or approved by IEEE, IEC, NFPA, OSHA, or any standards organization.
            </span>
          </div>
          <h3 className="font-bold text-white text-sm mt-1">1. Educational Scope</h3>
          <p>This software is built solely for educational study and engineering training. Mathematical outputs are model-based and do not substitute for certified physical measurements or licensed engineering design.</p>
          <h3 className="font-bold text-white text-sm mt-1">2. Trademark Notice</h3>
          <p>All trademarks, registered trademarks, standard identifiers (e.g. IEEE 519, IEC 60146, NFPA 70E, OSHA 1910.147), and company names are property of their respective holders. Their mention does not imply any affiliation or endorsement.</p>
          <h3 className="font-bold text-white text-sm mt-1">3. Discrepancy Reporting &amp; Feedback</h3>
          <p>
            If you have suggestions or found a calculation mistake, please contact us at: <a href={`mailto:${email}`} className="text-cyan-400 underline font-mono">{email}</a>. We actively review and incorporate peer-reviewed corrections!
          </p>
        </div>
      </div>
    </div>
  );
};
