import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, Cpu, X, ArrowRight } from 'lucide-react';

export default function ProcessingAnimation({ isVisible, onClose, onComplete }) {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    { id: 1, label: "Saving visit details" },
    { id: 2, label: "Validating clinical screening rules" },
    { id: 3, label: "Verifying maternal & child eligibility" },
    { id: 4, label: "Generating verified programme reports" },
    { id: 5, label: "All programme reports ready" }
  ];

  useEffect(() => {
    if (!isVisible) {
      setActiveStep(1);
      return;
    }

    setActiveStep(1);
    const timer = setInterval(() => {
      setActiveStep(prev => {
        if (prev < 5) {
          return prev + 1;
        } else {
          clearInterval(timer);
          if (onComplete) {
            setTimeout(() => {
              onComplete();
            }, 600);
          }
          return 5;
        }
      });
    }, 450);

    return () => clearInterval(timer);
  }, [isVisible, onComplete]);

  // CRITICAL: If not visible, render nothing!
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 relative">
        {/* Close button so user is never trapped */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 mx-auto flex items-center justify-center mb-3 shadow-xs">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">OneCapture Engine</h3>
          <p className="text-xs text-slate-500 mt-0.5">Transforming 1 encounter into multiple structured records...</p>
        </div>

        <div className="space-y-2.5">
          {steps.map((step) => {
            const isDone = step.id < activeStep || (step.id === 5 && activeStep === 5);
            const isCurrent = step.id === activeStep && activeStep < 5;
            
            return (
              <div 
                key={step.id} 
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isDone 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : isCurrent 
                    ? 'bg-teal-50 border-teal-300 text-teal-900 shadow-xs' 
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className="text-xs font-semibold">
                    STEP {step.id}: {step.label}
                  </span>
                </div>
                {isDone && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-sm">
                    ✓ Done
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            "1 Encounter → Multiple Programme Records"
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 px-2 py-1 rounded hover:bg-teal-50 cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
