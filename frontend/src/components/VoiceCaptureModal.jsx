import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Volume2, 
  Globe, 
  ShieldAlert, 
  Check, 
  Edit3,
  Languages,
  Info,
  HelpCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { parseVoiceTranscript } from '../services/api';

export default function VoiceCaptureModal({ isOpen, onClose, onApplyExtracted }) {
  const { t } = useLanguage();
  const [selectedLang, setSelectedLang] = useState('en-IN'); // en-IN, te-IN, hi-IN
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedResult, setParsedResult] = useState(null);
  const [editableFields, setEditableFields] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [isRefining, setIsRefining] = useState(false);
  const [isEditingFields, setIsEditingFields] = useState(false);

  // Preset demonstration phrases per language showcasing multi-field extraction
  const demoPresetsByLang = {
    'en-IN': [
      {
        label: "Household H1024 (Demographics & Child)",
        text: "1024 Seetha Kumar age 27 one child"
      },
      {
        label: "Household H1024 (Full Visit & Follow-up)",
        text: "Household 1024, Seetha Kumar, age 27, one child, follow-up after 14 days."
      },
      {
        label: "Maternal Prenatal (Sita Kumar)",
        text: "Sita Kumar is 27 years old, pregnant for 5 months, blood pressure 120 over 80."
      },
      {
        label: "Child Immunisation (Anjali)",
        text: "Anjali is 4 years old and vaccination is complete."
      },
      {
        label: "Maternal Comprehensive (Section 15)",
        text: "Household 1024. Seetha Kumar is 27 years old and five months pregnant. Blood pressure is 120 over 80. She needs follow-up after 14 days."
      }
    ],
    'te-IN': [
      {
        label: "కుటుంబ సందర్శన (సీత కుమార్ & బిడ్డ)",
        text: "కుటుంబం 1024, సీత కుమార్, వయసు 27 సంవత్సరాలు, ఒక బిడ్డ ఉంది, 14 రోజుల తర్వాత ఫాలో అప్ అవసరం."
      },
      {
        label: "గర్భిణీ నమోదు (సీత కుమార్)",
        text: "సీత కుమార్ ఐదు నెలల గర్భిణి. రక్తపోటు 120 బై 80. 14 రోజుల తర్వాత ఫాలో అప్ అవసరం."
      },
      {
        label: "పిల్లల టీకా వివరాలు (అంజలి కుమార్)",
        text: "అంజలి కుమార్ వయస్సు నాలుగు సంవత్సరాలు టీకాలు పూర్తయ్యాయి. ఆరోగ్యం నిలకడగా ఉంది."
      },
      {
        label: "వయసు మరియు వివరాలు",
        text: "సీత కుమార్ వయసు 27 సంవత్సరాలు"
      }
    ],
    'hi-IN': [
      {
        label: "परिवार दौरा (सीता कुमार & बच्चा)",
        text: "परिवार 1024, सीता कुमार, उम्र 27 साल, एक बच्चा है, 14 दिन बाद फॉलो अप चाहिए."
      },
      {
        label: "मातृ स्वास्थ्य (सीता कुमार)",
        text: "सीता कुमार पांच महीने की गर्भवती हैं. ब्लड प्रेशर 120 बटा 80 है. 14 दिन बाद फॉलो अप चाहिए."
      },
      {
        label: "बालक टीका (राहुल वर्मा)",
        text: "राहुल वर्मा उम्र चार साल टीका पूरा हुआ. कोई लक्षण नहीं."
      },
      {
        label: "उम्र एवं पहचान",
        text: "सीता कुमार की उम्र 27 साल है"
      }
    ]
  };

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSpeechSupported(false);
    }
  }, []);

  const handleStartListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech API is not supported in this browser. Please use Google Chrome or choose from the demonstration presets.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedLang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        processSpokenText(text, selectedLang);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  const processSpokenText = async (text, lang) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    try {
      const langShort = lang.startsWith('te') ? 'te' : lang.startsWith('hi') ? 'hi' : 'en';
      const result = await parseVoiceTranscript(text, langShort);
      setParsedResult(result);
      setEditableFields(result.extracted_fields || {});
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUsePreset = (text) => {
    setTranscript(text);
    processSpokenText(text, selectedLang);
  };

  const handleFieldChange = (key, val) => {
    setEditableFields(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleConfirmAndApply = () => {
    if (parsedResult) {
      // Pass the worker-confirmed (and potentially edited) values
      onApplyExtracted(editableFields, transcript, parsedResult.language_name);
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentPresets = demoPresetsByLang[selectedLang] || demoPresetsByLang['en-IN'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {t('voiceModalTitle', 'Multilingual Voice Capture & Clinical Extraction')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('voiceModalSubtitle', 'Capture speech in English, Telugu, or Hindi → Safe rule-based extraction → Worker confirmation')}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 text-2xl font-bold cursor-pointer p-1"
            title="Close"
          >
            &times;
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Language Selector Dropdown */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">{t('selectLanguage', 'Spoken Language Model')}:</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedLang('en-IN');
                  if (transcript) processSpokenText(transcript, 'en-IN');
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  selectedLang === 'en-IN' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                English (India)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedLang('te-IN');
                  if (transcript) processSpokenText(transcript, 'te-IN');
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  selectedLang === 'te-IN' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                తెలుగు (Telugu - te-IN)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedLang('hi-IN');
                  if (transcript) processSpokenText(transcript, 'hi-IN');
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  selectedLang === 'hi-IN' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                हिंदी (Hindi - hi-IN)
              </button>
            </div>
          </div>

          {/* Microphone Capture Center */}
          <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-teal-50/40 to-slate-50 rounded-2xl border border-teal-100">
            <button
              type="button"
              onClick={isListening ? () => setIsListening(false) : handleStartListening}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer ${
                isListening 
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200' 
                  : 'bg-teal-600 hover:bg-teal-700 text-white hover:scale-105'
              }`}
            >
              {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
            <span className="text-xs font-bold mt-2 text-slate-800">
              {isListening ? t('listening', 'Listening... Speak clearly') : t('startListening', 'Click Microphone to Speak')}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <span>Active recognition:</span>
              <span className="font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded-sm border border-teal-200">
                {selectedLang}
              </span>
              {!speechSupported && (
                <span className="text-amber-600 text-[10px] ml-1 flex items-center gap-0.5">
                  <Info className="w-3 h-3" /> Browser Speech API requires Chrome/Edge; use demo presets below
                </span>
              )}
            </span>
          </div>

          {/* Recognized Text Display & Refine Option */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                <span>{t('spokenTranscript', 'Recognized Spoken Speech')}</span>
              </label>
              {transcript && (
                <button
                  type="button"
                  onClick={() => setIsRefining(!isRefining)}
                  className="text-xs text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{isRefining ? 'Done Editing' : t('editOrRefine', 'Edit Speech Text')}</span>
                </button>
              )}
            </div>

            {isRefining ? (
              <textarea
                rows="2"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onBlur={() => processSpokenText(transcript, selectedLang)}
                className="w-full text-xs p-2.5 rounded-xl border border-teal-300 focus:ring-2 focus:ring-teal-500 focus:outline-hidden bg-white"
                placeholder="Type or edit spoken speech here..."
              />
            ) : (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 min-h-[44px] font-medium flex items-center">
                {transcript ? (
                  <span className="italic">"{transcript}"</span>
                ) : (
                  <span className="text-slate-400 italic">No audio recorded yet. Speak into the microphone or click a demonstration sample below.</span>
                )}
              </div>
            )}
          </div>

          {/* Demonstration Sample Phrases */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-slate-600">
                {t('useDemoPhrase', 'Or click a demonstration sample:')}
              </p>
              <span className="text-[10px] text-slate-400">Multi-field extraction presets</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {currentPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleUsePreset(preset.text)}
                  className="text-left p-2 rounded-lg border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 bg-white transition cursor-pointer text-xs group shadow-2xs"
                >
                  <span className="font-bold text-teal-800 block text-[11px] group-hover:text-teal-900 mb-0.5">
                    {preset.label}
                  </span>
                  <span className="text-slate-600 line-clamp-2 text-[10px]">
                    "{preset.text}"
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 text-center text-xs text-teal-800 font-semibold animate-pulse">
              Parsing speech into structured clinical fields across English, Telugu & Hindi...
            </div>
          )}

          {/* Structured Clinical Extraction Preview */}
          {parsedResult && !isProcessing && (
            <div className="space-y-3">
              {/* SECTION 1: EXTRACTED FIELDS */}
              <div className="bg-emerald-50/80 border border-emerald-300 rounded-xl p-3.5 shadow-xs">
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-emerald-200">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      {t('extractedFields', 'Extracted Fields')}
                    </h4>
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded-sm ml-1">
                      {parsedResult.language_name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingFields(!isEditingFields)}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-md"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isEditingFields ? 'Done Editing' : 'Edit Values'}</span>
                  </button>
                </div>

                {/* Extracted Fields Cards Grid */}
                {parsedResult.fields_detail && parsedResult.fields_detail.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {parsedResult.fields_detail.map((f, i) => (
                      <div key={i} className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span className="font-semibold text-slate-600 flex items-center gap-1">
                            <span className="text-emerald-600 font-bold">✓</span> {f.label}
                          </span>
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1 rounded-sm">
                            {Math.round((f.confidence || 0.95) * 100)}%
                          </span>
                        </div>

                        {/* Inline Editable or Display Value */}
                        {isEditingFields ? (
                          <input
                            type="text"
                            value={editableFields[f.key] !== undefined ? editableFields[f.key] : f.value}
                            onChange={(e) => handleFieldChange(f.key, e.target.value)}
                            className="w-full text-xs font-bold text-slate-900 p-1 rounded-sm border border-emerald-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 bg-white"
                          />
                        ) : (
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {editableFields[f.key] !== undefined ? String(editableFields[f.key]) : f.display_value}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No structured clinical fields could be extracted from the transcript.</p>
                )}
              </div>

              {/* SECTION 2: NEEDS REVIEW (If Any Ambiguous Fields) */}
              {parsedResult.needs_review && parsedResult.needs_review.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>NEEDS REVIEW (Ambiguous or Low Confidence)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedResult.needs_review.map((item, idx) => (
                      <span key={idx} className="bg-white text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1">
                        <span>⚠ {item.label}:</span>
                        <span className="font-bold">{item.display_value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 3: NOT MENTIONED (STRICT NON-FABRICATION AUDIT) */}
              {parsedResult.not_mentioned_fields && parsedResult.not_mentioned_fields.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <span>Not Mentioned in Speech</span>
                      <span className="text-[10px] font-normal lowercase text-slate-400">(strictly not fabricated)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {parsedResult.not_mentioned_fields.length} candidate fields
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedResult.not_mentioned_fields.map((f, idx) => (
                      <span
                        key={idx}
                        className="bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 shadow-2xs"
                        title="Not mentioned in spoken speech. Values are never silently fabricated."
                      >
                        <span className="text-slate-400 font-bold">—</span>
                        <span>{f.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Safety Rule Callout */}
              <div className="pt-1.5 flex items-start gap-2 text-[11px] text-emerald-900">
                <ShieldAlert className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span className="leading-tight">
                  <strong>Safety Rule:</strong> Rule-based parsing only. Unconfirmed fields are flagged for manual review. Medical facts (gender, pregnancy, BP, vaccinations) are never silently fabricated.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            {t('cancel', 'Cancel')}
          </button>

          <div className="flex items-center gap-2">
            {parsedResult && (
              <button
                type="button"
                onClick={() => setIsEditingFields(!isEditingFields)}
                className="px-3.5 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 cursor-pointer"
              >
                {isEditingFields ? 'Done Editing Fields' : t('editOrRefine', 'Edit Fields')}
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirmAndApply}
              disabled={!parsedResult}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg shadow-sm transition cursor-pointer ${
                parsedResult 
                  ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('confirmAndApply', 'Confirm & Apply to Visit')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
