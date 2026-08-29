import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, Play, RotateCcw, ArrowRight, Award, Zap, Check } from 'lucide-react';

export interface SOPStepItem {
  id: number;
  title: string;
  description?: string;
  actionLabel?: string;
  onExecute?: () => void;
}

interface InteractiveSOPPanelProps {
  sopId: string;
  title: string;
  standard?: string;
  steps: SOPStepItem[];
  isOpen?: boolean;
  onClose?: () => void;
  onCompleteAll?: () => void;
  isModal?: boolean;
}

export const InteractiveSOPPanel: React.FC<InteractiveSOPPanelProps> = ({
  sopId,
  title,
  standard = 'IEC / IEEE Standards Referenced',
  steps,
  onCompleteAll,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [completedStepIds, setCompletedStepIds] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex];
  const progressPct = isFinished ? 100 : Math.round((completedStepIds.length / totalSteps) * 100);

  const handleConfirmStep = () => {
    if (currentStep.onExecute) {
      try {
        currentStep.onExecute();
      } catch (err) {
        console.error('Error executing step action:', err);
      }
    }

    const nextCompleted = [...completedStepIds, currentStep.id];
    setCompletedStepIds(nextCompleted);

    if (currentStepIndex + 1 < totalSteps) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
      if (onCompleteAll) onCompleteAll();
    }
  };

  const handleJumpToStep = (index: number) => {
    // Only allow jumping to steps if unlocked or already completed
    if (index <= completedStepIds.length) {
      setCurrentStepIndex(index);
      if (isFinished) setIsFinished(false);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
    setCompletedStepIds([]);
    setIsFinished(false);
  };

  return (
    <div className="w-full bg-[#161b22] border border-[#30363d] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col gap-4 font-mono select-none">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#238636]/20 border border-[#3fb950]/50 flex items-center justify-center text-[#3fb950] shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#21262d] text-[#58a6ff] border border-[#30363d]">
                {sopId}
              </span>
              <span className="text-[10px] text-[#8b949e] font-sans truncate">{standard}</span>
            </div>
            <h3 className="text-xs sm:text-sm font-extrabold text-[#c9d1d9] mt-0.5 leading-snug">
              {title}
            </h3>
          </div>
        </div>

        <span
          className={`text-[10px] px-2.5 py-1 rounded-full font-bold border shrink-0 ${
            isFinished
              ? 'bg-[#238636]/20 border-[#3fb950]/60 text-[#3fb950]'
              : 'bg-[#1f6beb]/20 border-[#58a6ff]/60 text-[#58a6ff]'
          }`}
        >
          {isFinished ? '✅ SOP COMPLETE' : `STEP ${currentStepIndex + 1}/${totalSteps}`}
        </span>
      </div>

      {/* PROGRESS BAR */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-[#8b949e] font-bold uppercase">
            {isFinished ? '100% VERIFIED' : `PROGRESS (${completedStepIds.length}/${totalSteps} COMPLETED)`}
          </span>
          <span className="text-[#3fb950] font-black">{progressPct}%</span>
        </div>
        <div className="w-full h-2 bg-[#21262d] rounded-full overflow-hidden border border-[#30363d]">
          <div
            className="h-full bg-gradient-to-r from-[#238636] to-[#3fb950] transition-all duration-300 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* CONTENT AREA */}
      {!isFinished ? (
        <div className="flex flex-col gap-4 bg-[#0d1117] border border-[#21262d] rounded-xl p-4">
          {/* ACTIVE STEP CARD */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1f6beb]/20 border border-[#58a6ff]/40 text-[#58a6ff] shrink-0 flex items-center justify-center font-extrabold text-sm shadow-inner">
              {currentStep.id < 10 ? `0${currentStep.id}` : currentStep.id}
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#58a6ff]">
                Interactive Step Instruction
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                {currentStep.title}
              </h4>
              {currentStep.description && (
                <p className="text-[11px] text-[#8b949e] font-sans leading-relaxed mt-0.5">
                  {currentStep.description}
                </p>
              )}
            </div>
          </div>

          {/* HINT FOR OPERATING ON SLD */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-2.5 flex items-center gap-2 text-[11px] text-[#d29922]">
            <Zap className="w-4 h-4 text-[#d29922] shrink-0" />
            <span className="font-sans">
              Perform action on SLD diagram / controls on screen, then click confirm below.
            </span>
          </div>

          {/* ACTION BUTTON */}
          <button
            onClick={handleConfirmStep}
            className="w-full py-3 px-4 rounded-xl bg-[#238636] hover:bg-[#2ea043] border border-[#3fb950] text-white font-extrabold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(35,134,54,0.3)] transition-all active:scale-[0.98] min-h-[46px]"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>
              {currentStep.actionLabel || `Confirm & Proceed to Step ${currentStepIndex + 2 > totalSteps ? 'Finish' : currentStepIndex + 2}`}
            </span>
            <ArrowRight className="w-4 h-4 text-white/80" />
          </button>

          {/* STEP SEQUENCE INDICATORS */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-[#21262d]">
            <span className="text-[10px] text-[#8b949e] font-bold uppercase">
              Step Execution Tracker:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-[90px] overflow-y-auto pr-1">
              {steps.map((s, idx) => {
                const isDone = completedStepIds.includes(s.id);
                const isCurrent = idx === currentStepIndex;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleJumpToStep(idx)}
                    title={s.title}
                    className={`text-[10px] px-2 py-1 rounded-md border font-bold flex items-center gap-1 transition-all ${
                      isDone
                        ? 'bg-[#238636]/20 border-[#3fb950]/50 text-[#3fb950] cursor-pointer hover:bg-[#238636]/40'
                        : isCurrent
                        ? 'bg-[#1f6beb]/20 border-[#58a6ff] text-[#58a6ff] animate-pulse ring-1 ring-[#58a6ff]'
                        : 'bg-[#161b22] border-[#30363d] text-[#8b949e] opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {isDone ? <Check className="w-3 h-3 text-[#3fb950]" /> : idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* FINISHED STATE */
        <div className="flex flex-col items-center justify-center text-center py-4 gap-4 bg-[#0d1117] border border-[#238636]/50 rounded-xl p-4">
          <div className="w-14 h-14 rounded-full bg-[#238636]/20 border-2 border-[#3fb950] flex items-center justify-center text-[#3fb950] shadow-[0_0_20px_rgba(63,185,80,0.4)]">
            <Award className="w-7 h-7" />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase text-[#3fb950] tracking-widest">
              SOP VERIFIED & COMPLETED
            </span>
            <h4 className="text-sm sm:text-base font-black text-white">
              🎉 Procedure Successfully Signed Off!
            </h4>
            <p className="text-[11px] text-[#8b949e] font-sans">
              All <strong className="text-white">{totalSteps} steps</strong> for <strong className="text-[#58a6ff]">{title}</strong> ({sopId}) have been verified.
            </p>
          </div>

          <button
            onClick={handleRestart}
            className="py-2.5 px-5 rounded-xl bg-[#21262d] border border-[#30363d] hover:border-[#58a6ff] text-[#c9d1d9] font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw className="w-4 h-4 text-[#58a6ff]" />
            <span>Rerun Interactive SOP</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Export alias for backward compatibility
export const InteractiveSOPWizard = InteractiveSOPPanel;

