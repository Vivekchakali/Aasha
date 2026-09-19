import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Mic, 
  Play, 
  BarChart3, 
  RotateCcw, 
  X, 
  FileText, 
  Workflow
} from 'lucide-react';
import { loadDemoScenario, resetDemoData } from '../services/api';

export default function GuidedDemoModal({ isOpen, onClose, onSelectScenario, onNavigate }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [scenarioData, setScenarioData] = useState(null);

  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      title: "Problem Context: The Five Systems Burden",
      subtitle: "One Visit. Five Registers. Massive Duplication.",
      content: "Community health workers (ASHAs) visit one household and gather critical maternal, child, census, and symptom information during a single visit. Currently, this same data must be repeatedly documented across disparate registers.",
      actionLabel: "Load Demo Household H1024",
      action: async () => {
        setLoading(true);
        try {
          const res = await loadDemoScenario("1");
          setScenarioData(res.scenario);
          onSelectScenario(res.scenario.data);
          setCurrentStep(2);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
    },
    {
      step: 2,
      title: "OneCapture: Capture Once (Voice / Manual)",
      subtitle: "Encounter Form with Integrated Voice Extraction",
      content: "We now open Household H1024's encounter form. The worker can speak naturally: 'Household 1024. Woman aged 25, pregnant for 24 weeks. One child aged 2 years. Vaccination complete. Follow-up required after two weeks.'",
      actionLabel: "Inspect Captured Encounter",
      action: () => {
        onNavigate('new-encounter');
        setCurrentStep(3);
      }
    },
    {
      step: 3,
      title: "The Heart: Rule-Based Mapping Engine",
      subtitle: "Normalizing and Evaluating Transparent Rules",
      content: "When submitted, the backend normalizes values (e.g. '24 weeks' -> 24, 'two weeks' -> 14 days) and triggers deterministic rules: Rule 1 -> Maternal Record; Rule 2 -> Child Immunisation; Rule 3 -> Household Register; Rule 4 -> Follow-up.",
      actionLabel: "View Generated Outputs",
      action: () => {
        onNavigate('outputs');
        setCurrentStep(4);
      }
    },
    {
      step: 4,
      title: "Interactive Mapping & Field Tracing",
      subtitle: "Inspect Exactly How Every Field Was Transformed",
      content: "Judges can inspect the visual pipeline: 17 raw fields normalized into 12 distinct mapping pathways, generating 4 structured records with zero redundant re-typing.",
      actionLabel: "View Mapping Visualization",
      action: () => {
        onNavigate('mapping');
        setCurrentStep(5);
      }
    },
    {
      step: 5,
      title: "Prototype Impact Measurement",
      subtitle: "From Repeated Entry to OneCapture",
      content: "See our automated prototype measurement: compares the simulated baseline of legacy registers against OneCapture. Demonstrates manual action reduction and documentation time saved without making unsubstantiated clinical claims.",
      actionLabel: "Inspect Impact Analytics",
      action: () => {
        onNavigate('impact');
        setCurrentStep(6);
      }
    },
    {
      step: 6,
      title: "Demo Complete: Ready for Q&A",
      subtitle: "Summary of Value: Capture Once. Multiple Structured Records.",
      content: "You can explore Offline Sync simulation, load Scenario 2 or Scenario 3, or click 'Reset Demo' anytime to return to a fresh state.",
      actionLabel: "Close & Explore Freely",
      action: () => {
        onClose();
      }
    }
  ];

  const current = steps[currentStep - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-700 to-emerald-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black text-sm">
              {currentStep}/{steps.length}
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Hackathon Presentation Walkthrough
              </h3>
              <p className="text-xs text-teal-100">3–5 Minute Guided End-to-End Story</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-teal-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 flex">
          {steps.map((s, idx) => (
            <div
              key={s.step}
              className={`h-full flex-1 transition-all ${
                s.step <= currentStep ? 'bg-teal-600' : 'bg-transparent'
              } ${idx !== 0 ? 'border-l border-white' : ''}`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4">
          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-sm">
              Step {currentStep} of {steps.length}
            </span>
            <h4 className="text-lg font-bold text-slate-900 mt-1">{current.title}</h4>
            <p className="text-xs font-semibold text-slate-500">{current.subtitle}</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm text-slate-700 leading-relaxed">
            {current.content}
          </div>

          {currentStep === 1 && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 text-xs text-teal-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-teal-800">
                <Workflow className="w-3.5 h-3.5" /> Target Scenario: Household H1024
              </span>
              <p>• 1 Household Visit • Pregnant Woman (25 yrs, 24 wks) • 1 Child (2 yrs, Complete vaccines) • 14-day Follow-up</p>
              <p className="font-semibold text-emerald-800">Expected Result: 4 Distinct Structured Records Generated Automatically</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                resetDemoData();
                setCurrentStep(1);
              }}
              className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1 transition cursor-pointer ml-2"
              title="Reset Demo Data"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <button
            onClick={current.action}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Loading...' : current.actionLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
