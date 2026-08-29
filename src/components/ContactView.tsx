import React, { useState } from 'react';
import { Mail, Send, CheckCircle2, Copy, ArrowLeft, ShieldCheck, MessageSquare, ExternalLink } from 'lucide-react';

interface ContactViewProps {
  isDarkMode: boolean;
  onBack: () => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ isDarkMode, onBack }) => {
  const [copied, setCopied] = useState(false);
  const [subject, setSubject] = useState('General Enquiry');
  const [message, setMessage] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  const email = '0808miracle@gmail.com';
  const linkedinUrl = 'https://www.linkedin.com/in/toanilsharma/';

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
    setTimeout(() => setSentSuccess(false), 4000);
  };

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
            isDarkMode ? 'bg-blue-950/60 text-blue-400 border-blue-800/60' : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            DIRECT CONTACT
          </span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col gap-2 border-b border-slate-800/80 pb-6">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Contact Engineering Team
          </h1>
          <p className={`text-sm leading-relaxed max-w-2xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Have questions about converter simulation models, equations, university integration, or technical feedback? Get in touch with our engineering team directly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Direct Email & Author Card */}
          <div className="flex flex-col gap-4">
            
            <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${
              isDarkMode ? 'bg-[#0d1424] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-bold uppercase text-blue-400">Direct Email Address</span>
              <span className="text-sm font-mono font-bold text-white select-all break-all">{email}</span>
              
              <button
                type="button"
                onClick={handleCopyEmail}
                className="w-full py-2.5 rounded-xl text-xs font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer border-none shadow-md"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Email Copied!' : 'Copy Email Address'}</span>
              </button>
            </div>

            <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${
              isDarkMode ? 'bg-[#0d1424] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <span className="text-xs font-mono font-bold uppercase text-cyan-400">Lead Engineer Profile</span>
              <h3 className="font-bold text-base text-white">Anil Sharma</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Developer &amp; Engineer behind Power Electronics Lab simulation engine.
              </p>
              
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-blue-400 border border-blue-500/40 flex items-center justify-center gap-2 transition-colors no-underline cursor-pointer"
              >
                <span>Connect on LinkedIn</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

          {/* Contact Message Form */}
          <div className={`md:col-span-2 p-6 rounded-2xl border flex flex-col gap-5 ${
            isDarkMode ? 'bg-[#0d1424] border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-2 text-base font-bold">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <h2>Send an Instant Message</h2>
            </div>

            <form onSubmit={handleSend} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-bold text-slate-300">Enquiry Category</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="General Enquiry">General Enquiry</option>
                  <option value="Model & Equation Feedback">Model &amp; Equation Feedback</option>
                  <option value="University / Course Integration">University / Course Integration</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Bug Report">Bug Report</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono font-bold text-slate-300">Message Content</label>
                <textarea
                  rows={6}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry, simulation question, or feedback in detail..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>

              {sentSuccess ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Opening your default email client... Your message is prefilled!</span>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer border-none"
                >
                  <Send className="w-4 h-4" />
                  <span>Launch Email Client to Send Message</span>
                </button>
              )}
            </form>
          </div>

        </div>

      </div>
  );
};
