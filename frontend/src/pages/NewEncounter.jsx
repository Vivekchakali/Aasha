import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Mic, 
  Timer, 
  Save, 
  ArrowRight, 
  Check, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Sparkles,
  ShieldAlert,
  HelpCircle,
  Home,
  User,
  Heart,
  Baby,
  Activity,
  Calendar,
  Clock,
  CheckCircle2,
  Droplet,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  Phone,
  Send,
  Zap,
  Info
} from 'lucide-react';
import VoiceCaptureModal from '../components/VoiceCaptureModal';
import { useLanguage } from '../context/LanguageContext';
import { getHouseholds, bulkGenerateSMS } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

export default function NewEncounter({ onReview, initialData }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const draftFromNav = location.state?.prefilledDraft;
  const initial = initialData || draftFromNav || {};

  const [households, setHouseholds] = useState([]);
  const [selectedHhId, setSelectedHhId] = useState(initial.household_id || 'H1024');
  const [householdMembers, setHouseholdMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(initial.member_id || '');
  const [prefillAlert, setPrefillAlert] = useState('');

  // Main encounter form state
  const [formData, setFormData] = useState(() => ({
    household_id: initial.household_id || 'H1024',
    village_area: initial.village_area || 'Ward 4 & 5, Shanti Nagar',
    head_of_family: initial.head_of_family || 'Ravi Kumar',
    household_members: initial.household_members || 4,
    visit_date: initial.visit_date || new Date().toISOString().split('T')[0],

    // Core Questionnaire Screening Questions
    safe_water: initial.safe_water !== undefined ? initial.safe_water : true,
    has_illness: initial.has_illness || false,
    illness_member_name: initial.illness_member_name || '',
    illness_details: initial.illness_details || '',
    illness_duration: initial.illness_duration || '',
    other_concerns: initial.other_concerns || '',

    // Member Demographics
    member_id: initial.member_id || 'M1024-02',
    member_name: initial.member_name || 'Seetha Kumar',
    phone_number: initial.phone_number || '',
    preferred_language: initial.preferred_language || 'en',
    gender: initial.gender || 'Female',
    relationship_to_head: initial.relationship_to_head || 'Spouse',

    // Maternal Health Screening (Question 4)
    pregnant: initial.pregnant !== undefined ? initial.pregnant : true,
    maternal_age: initial.maternal_age || 27,
    pregnancy_month: initial.pregnancy_month || 5,
    gestational_age: initial.gestational_age || 22,
    pregnancy_registered: initial.pregnancy_registered !== undefined ? initial.pregnancy_registered : true,
    pregnancy_vaccinated: initial.pregnancy_vaccinated !== undefined ? initial.pregnancy_vaccinated : true,
    expected_delivery_date: initial.expected_delivery_date || '2027-01-15',
    maternal_observations: initial.maternal_observations || 'Fetal movement normal, mild ankle edema, IFA supplied',

    // Child Health Screening (Question 5)
    has_young_child: initial.has_young_child !== undefined ? initial.has_young_child : true,
    child_dob: initial.child_dob || '2025-06-15',
    child_feeding: initial.child_feeding || 'Complementary feeding + breast milk',
    child_meals_per_day: initial.child_meals_per_day || 4,
    child_normal_weight: initial.child_normal_weight !== undefined ? initial.child_normal_weight : true,
    children: initial.children || [
      { child_index: 1, age: 1, vaccination_status: 'Complete', observations: 'Growth on green track' }
    ],

    // Clinical Encounter Vitals
    temperature: initial.temperature || '98.4 F',
    blood_pressure: initial.blood_pressure || '118/76 mmHg',
    weight: initial.weight || '54 kg',
    hemoglobin: initial.hemoglobin || '11.5 g/dL',
    symptoms: initial.symptoms || 'Mild fatigue',
    danger_signs: initial.danger_signs || 'None',
    general_observations: initial.general_observations || 'Safe covered water container, sanitation clean',

    // Follow-up Protocol (Question 7)
    follow_up_required: initial.follow_up_required !== undefined ? initial.follow_up_required : true,
    follow_up_days: initial.follow_up_days || 14,
    follow_up_date: initial.follow_up_date || '2026-10-02',
    follow_up_notes: initial.follow_up_notes || 'Review blood pressure check and infant weight',
    sms_note: initial.sms_note || initial.follow_up_notes || 'Review blood pressure check and infant weight',
    send_sms_on_confirm: initial.send_sms_on_confirm !== undefined ? initial.send_sms_on_confirm : true
  }));

  // Stopwatch
  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');

  // SMS Trigger State
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [smsSentSuccess, setSmsSentSuccess] = useState(false);
  const [smsNotice, setSmsNotice] = useState(null);

  const maskPhone = (p) => {
    if (!p) return '';
    const clean = String(p).trim();
    if (clean.length < 6) return clean;
    return clean.slice(0, 2) + '•••• ••' + clean.slice(-2);
  };

  const handleTriggerSMS = async () => {
    if (!formData.phone_number) {
      setSmsNotice({ type: 'error', text: 'Please enter a valid mobile number first in Section 1.' });
      return;
    }
    try {
      setIsSendingSMS(true);
      setSmsNotice(null);
      const res = await bulkGenerateSMS([
        {
          phone_number: formData.phone_number,
          recipient_name: formData.member_name || 'Beneficiary',
          template_type: formData.pregnant ? 'iron_tablets' : (formData.children?.length ? 'vaccination' : 'general'),
          language: formData.preferred_language || 'en',
          due_date: formData.follow_up_date,
          reason: formData.follow_up_notes || 'Scheduled health follow-up'
        }
      ]);
      if (res.sent_count > 0 || res.success) {
        setSmsSentSuccess(true);
        setSmsNotice({
          type: 'success',
          text: `SMS dispatched to ${maskPhone(formData.phone_number)}: "${formData.follow_up_notes || 'Routine follow-up'}"`
        });
      } else {
        setSmsNotice({
          type: 'error',
          text: res.message || res.results?.[0]?.reason || 'SMS skipped (cooldown active or already sent within 24h).'
        });
      }
    } catch (e) {
      setSmsNotice({ type: 'error', text: e.message || 'Failed to dispatch SMS reminder.' });
    } finally {
      setIsSendingSMS(false);
    }
  };

  // Fetch households list
  useEffect(() => {
    async function loadHouseholds() {
      try {
        const res = await getHouseholds();
        const list = res.households || [];
        setHouseholds(list);

        const currentHh = list.find(h => h.household_id === (initial.household_id || selectedHhId));
        if (currentHh && currentHh.members) {
          setHouseholdMembers(currentHh.members);
        }
      } catch (err) {
        console.error('Failed to load households:', err);
      }
    }
    loadHouseholds();
  }, [initial.household_id]);

  // Timer
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Handle Household selection
  const handleHouseholdChange = (hhId) => {
    setSelectedHhId(hhId);
    setSelectedMemberId('');
    const hh = households.find(h => h.household_id === hhId);
    if (hh) {
      setFormData(prev => ({
        ...prev,
        household_id: hh.household_id,
        village_area: hh.village_area || prev.village_area,
        head_of_family: hh.head_of_family || prev.head_of_family,
        household_members: hh.total_members || prev.household_members,
        member_id: '',
        member_name: ''
      }));
      setHouseholdMembers(hh.members || []);
      setPrefillAlert('');
    }
  };

  // Handle Member selection
  const handleMemberChange = (memberCode) => {
    setSelectedMemberId(memberCode);
    const m = householdMembers.find(mem => mem.member_code === memberCode);
    if (!m) return;

    setFormData(prev => {
      const updated = {
        ...prev,
        member_id: m.member_code,
        member_name: m.full_name,
        gender: m.gender,
        maternal_age: m.age,
        relationship_to_head: m.relationship_to_head,
        phone_number: m.phone_number || prev.phone_number || '',
        preferred_language: m.preferred_language || prev.preferred_language || 'en'
      };

      if (m.is_pregnant) {
        updated.pregnant = true;
        updated.pregnancy_month = m.pregnancy_month || 5;
        updated.gestational_age = m.pregnancy_month ? Math.min(40, m.pregnancy_month * 4 + 2) : 22;
      } else {
        updated.pregnant = false;
      }

      if (m.is_child || m.age <= 5) {
        updated.has_young_child = true;
        updated.children = [
          {
            child_index: 1,
            age: m.age,
            vaccination_status: m.vaccination_status || 'Complete',
            observations: m.notes || 'Routine checkup'
          }
        ];
      }

      return updated;
    });

    setPrefillAlert(`Pre-filled profile for ${m.full_name} (${m.relationship_to_head}).`);
  };

  // Apply voice-extracted fields
  const handleApplyVoice = (extracted, transcript, langName) => {
    setFormData(prev => {
      const updated = { ...prev };
      if (extracted.household_id) {
        updated.household_id = extracted.household_id;
        const active = households.find(h => h.household_id === extracted.household_id || h.household_id === 'H' + extracted.household_id);
        if (active && active.members) {
          setHouseholdMembers(active.members);
        }
      }
      if (extracted.member_name) updated.member_name = extracted.member_name;
      if (extracted.phone_number) updated.phone_number = extracted.phone_number;
      if (extracted.age !== undefined && extracted.age !== null) {
        updated.maternal_age = extracted.age;
      }
      if (extracted.pregnant !== undefined && extracted.pregnant !== null) {
        updated.pregnant = extracted.pregnant;
      }
      if (extracted.pregnancy_month) {
        updated.pregnancy_month = extracted.pregnancy_month;
        updated.gestational_age = Math.min(40, extracted.pregnancy_month * 4 + 2);
      }
      if (extracted.blood_pressure) {
        updated.blood_pressure = extracted.blood_pressure.includes('mmHg')
          ? extracted.blood_pressure
          : `${extracted.blood_pressure} mmHg`;
      }
      if (extracted.safe_water !== undefined) updated.safe_water = extracted.safe_water;
      if (extracted.has_illness !== undefined) updated.has_illness = extracted.has_illness;
      if (extracted.illness_details) updated.illness_details = extracted.illness_details;

      if (extracted.children_list && extracted.children_list.length > 0) {
        updated.children = extracted.children_list;
        updated.has_young_child = true;
      } else if (extracted.children_count !== undefined && extracted.children_count !== null) {
        const count = parseInt(extracted.children_count, 10);
        if (count === 0) {
          updated.children = [];
          updated.has_young_child = false;
        } else {
          updated.has_young_child = true;
          const newChildren = [];
          for (let i = 0; i < count; i++) {
            newChildren.push(prev.children[i] || {
              child_index: i + 1,
              age: 1,
              vaccination_status: extracted.immunization_status || 'Complete',
              observations: 'Spoken intake record'
            });
          }
          updated.children = newChildren;
        }
      }
      if (extracted.follow_up_required !== undefined && extracted.follow_up_required !== null) {
        updated.follow_up_required = extracted.follow_up_required;
      }
      if (extracted.follow_up_days) {
        updated.follow_up_days = parseInt(extracted.follow_up_days, 10);
        const d = new Date();
        d.setDate(d.getDate() + parseInt(extracted.follow_up_days, 10));
        updated.follow_up_date = d.toISOString().split('T')[0];
      }
      return updated;
    });
    setVoiceNotice(`Verified fields extracted from ${langName || 'Voice Capture'}. Form updated.`);
  };

  const handleAddChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [
        ...prev.children,
        { child_index: prev.children.length + 1, age: 1, vaccination_status: 'Complete', observations: 'Routine wellness' }
      ]
    }));
  };

  const handleRemoveChild = (index) => {
    setFormData(prev => {
      const remaining = prev.children.filter((_, i) => i !== index);
      return {
        ...prev,
        children: remaining,
        has_young_child: remaining.length > 0
      };
    });
  };

  const handleChildChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.children];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, children: updated };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsTimerRunning(false);
    const draftPayload = {
      ...formData,
      duration_seconds: seconds || 45
    };

    if (onReview) {
      onReview(draftPayload);
    } else {
      navigate('/encounters/review', { state: { draft: draftPayload } });
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <Card className="bg-white">
        <div className="p-6 sm:p-7 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="teal">Adaptive Visit Questionnaire</Badge>
                <span className="text-xs text-slate-400">Step 1 of 3</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {t('encounterTitle', 'Household Clinical Encounter')}
              </h1>
              <p className="text-xs text-slate-500">
                Capture frontline observations once. Deterministic engine transforms to maternal, immunisation, and census registers.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-auto">
              {/* Live Stopwatch Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs font-semibold">
                <Timer className="w-3.5 h-3.5 text-teal-600 animate-spin" style={{ animationDuration: '3s' }} />
                <span>{formatTimer(seconds)}</span>
              </div>

              {/* Multilingual Voice Capture Button */}
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Mic}
                onClick={() => setIsVoiceOpen(true)}
              >
                Voice Capture
              </Button>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center">1</span>
              <span className="font-semibold text-slate-800 hidden sm:inline">Demographics</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center">2</span>
              <span className="font-medium text-slate-600 hidden sm:inline">Screening</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">3</span>
              <span className="font-medium text-slate-500 hidden sm:inline">Vitals</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">4</span>
              <span className="font-medium text-slate-500 hidden sm:inline">Follow-up & SMS</span>
            </div>
          </div>

          {/* Feedback notices */}
          {voiceNotice && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>{voiceNotice}</span>
              </div>
              <button onClick={() => setVoiceNotice('')} className="text-teal-600 hover:text-teal-900 font-bold cursor-pointer">&times;</button>
            </div>
          )}

          {prefillAlert && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{prefillAlert}</span>
              </div>
              <button onClick={() => setPrefillAlert('')} className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer">&times;</button>
            </div>
          )}
        </div>
      </Card>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* SECTION 1: HOUSEHOLD & BENEFICIARY SELECTION */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700">
                <Home className="w-3.5 h-3.5" />
              </div>
              <div>
                <CardTitle as="h2">1. Household & Beneficiary Details</CardTitle>
                <CardDescription>Select family & member to pre-fill profile data and avoid repetitive entry</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Household *
                </label>
                <select
                  value={selectedHhId}
                  onChange={(e) => handleHouseholdChange(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-hidden bg-white"
                >
                  {households.map(h => (
                    <option key={h.household_id} value={h.household_id}>
                      {h.household_id} — {h.head_of_family} ({h.village_area})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Select Member (Auto Pre-fill) *</span>
                  <span className="text-[11px] text-teal-700 font-semibold">Auto-populates</span>
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => handleMemberChange(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-teal-300 focus:ring-2 focus:ring-teal-500 focus:outline-hidden bg-teal-50/20 font-medium"
                >
                  <option value="">-- Choose Member to Pre-fill --</option>
                  {householdMembers.map(m => (
                    <option key={m.member_code} value={m.member_code}>
                      {m.full_name} ({m.relationship_to_head}, {m.age}y {m.gender}) {m.is_pregnant ? '★ Pregnant' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Beneficiary Details Row */}
              <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider">Member Code</span>
                  <span className="font-bold text-slate-900 block mt-1.5 font-mono">{formData.member_id || 'Intake'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 uppercase font-bold block tracking-wider">Beneficiary Name *</span>
                  <input
                    type="text"
                    value={formData.member_name}
                    onChange={(e) => setFormData({ ...formData, member_name: e.target.value })}
                    placeholder="Enter or speak name"
                    className="text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-1.5 w-full mt-0.5 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="lg:col-span-2">
                  <span className="text-[10px] text-slate-600 uppercase font-bold flex items-center justify-between tracking-wider">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-teal-600" />
                      <span>Mobile Number *</span>
                    </span>
                    <span className="text-teal-700 font-semibold text-[10px]">SMS Enabled</span>
                  </span>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="e.g. 9876543210 (10 digits)"
                    maxLength={13}
                    className="text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-1.5 w-full mt-0.5 focus:ring-1 focus:ring-teal-500 font-mono"
                  />
                  {formData.phone_number && (
                    <span className="text-[10px] text-teal-700 font-mono block mt-0.5">
                      Masked: {maskPhone(formData.phone_number)}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 uppercase font-bold block tracking-wider">SMS Language</span>
                  <select
                    value={formData.preferred_language}
                    onChange={(e) => setFormData({ ...formData, preferred_language: e.target.value })}
                    className="text-xs bg-white border border-slate-300 rounded-lg p-1.5 w-full mt-0.5 font-medium"
                  >
                    <option value="en">English</option>
                    <option value="te">తెలుగు (Telugu)</option>
                    <option value="hi">हिंदी (Hindi)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider">Visit Date</span>
                  <input
                    type="date"
                    value={formData.visit_date}
                    onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                    className="text-xs bg-white border border-slate-300 rounded-lg p-1.5 w-full mt-0.5"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: CORE HEALTH SCREENING (PROGRESSIVE DISCLOSURE) */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700">
                <HelpCircle className="w-3.5 h-3.5" />
              </div>
              <div>
                <CardTitle as="h2">2. Core Household Screening Questionnaire</CardTitle>
                <CardDescription>Relevant clinical sections reveal automatically based on answers</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Q1 & Q2: Census & Drinking Water */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Q1: Total people living in this household?
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.household_members}
                  onChange={(e) => setFormData({ ...formData, household_members: parseInt(e.target.value, 10) || 1 })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Q2: Is there a source of safe drinking water?
                </label>
                <div className="flex items-center gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="safe_water"
                      checked={formData.safe_water === true}
                      onChange={() => setFormData({ ...formData, safe_water: true })}
                      className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-medium text-slate-700">Yes (Piped / Chlorinated)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="safe_water"
                      checked={formData.safe_water === false}
                      onChange={() => setFormData({ ...formData, safe_water: false })}
                      className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-xs font-medium text-slate-700">No (Unsafe / Open Well)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Q3: Current Illness? */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Q3: Does anyone in the family currently have an active illness?
                  </span>
                  <span className="text-[11px] text-slate-500">Fever, persistent cough, diarrhea, or acute conditions</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="has_illness"
                      checked={formData.has_illness === true}
                      onChange={() => setFormData({ ...formData, has_illness: true })}
                      className="w-4 h-4 text-teal-600"
                    />
                    <span className="text-xs font-bold text-slate-800">Yes</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="has_illness"
                      checked={formData.has_illness === false}
                      onChange={() => setFormData({ ...formData, has_illness: false })}
                      className="w-4 h-4 text-teal-600"
                    />
                    <span className="text-xs font-bold text-slate-800">No</span>
                  </label>
                </div>
              </div>

              {/* Conditional Illness Expansion */}
              {formData.has_illness && (
                <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Ill Member Name</label>
                    <input
                      type="text"
                      value={formData.illness_member_name}
                      onChange={(e) => setFormData({ ...formData, illness_member_name: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Symptoms & Details</label>
                    <input
                      type="text"
                      value={formData.illness_details}
                      onChange={(e) => setFormData({ ...formData, illness_details: e.target.value })}
                      placeholder="High fever for 3 days, body ache"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Duration</label>
                    <input
                      type="text"
                      value={formData.illness_duration}
                      onChange={(e) => setFormData({ ...formData, illness_duration: e.target.value })}
                      placeholder="e.g. 3 days"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Q4: Pregnant Woman? */}
            <div className="p-4 rounded-xl border border-rose-200/80 bg-rose-50/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-950 block">
                    Q4: Is there a pregnant woman in the family?
                  </span>
                  <span className="text-[11px] text-rose-700">Triggers Maternal Health Register mapping</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="pregnant"
                      checked={formData.pregnant === true}
                      onChange={() => setFormData({ ...formData, pregnant: true })}
                      className="w-4 h-4 text-rose-600"
                    />
                    <span className="text-xs font-bold text-rose-950">Yes</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="pregnant"
                      checked={formData.pregnant === false}
                      onChange={() => setFormData({ ...formData, pregnant: false })}
                      className="w-4 h-4 text-rose-600"
                    />
                    <span className="text-xs font-bold text-rose-950">No</span>
                  </label>
                </div>
              </div>

              {/* Conditional Maternal Section */}
              {formData.pregnant && (
                <div className="pt-3 border-t border-rose-200 bg-white p-4 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Maternal Age (years)</label>
                      <input
                        type="number"
                        min="12"
                        max="55"
                        value={formData.maternal_age}
                        onChange={(e) => setFormData({ ...formData, maternal_age: parseInt(e.target.value, 10) || '' })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Pregnancy Month (1-9)</label>
                      <input
                        type="number"
                        min="1"
                        max="9"
                        value={formData.pregnancy_month}
                        onChange={(e) => {
                          const m = parseInt(e.target.value, 10) || 1;
                          setFormData({ 
                            ...formData, 
                            pregnancy_month: m,
                            gestational_age: Math.min(40, m * 4 + 2)
                          });
                        }}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Gestational Age (weeks)</label>
                      <input
                        type="number"
                        min="1"
                        max="45"
                        value={formData.gestational_age}
                        onChange={(e) => setFormData({ ...formData, gestational_age: parseInt(e.target.value, 10) || '' })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.pregnancy_registered}
                        onChange={(e) => setFormData({ ...formData, pregnancy_registered: e.target.checked })}
                        className="w-4 h-4 rounded text-rose-600"
                      />
                      <span className="text-xs font-medium text-slate-700">ANC Registered at PHC/Sub-center</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.pregnancy_vaccinated}
                        onChange={(e) => setFormData({ ...formData, pregnancy_vaccinated: e.target.checked })}
                        className="w-4 h-4 rounded text-rose-600"
                      />
                      <span className="text-xs font-medium text-slate-700">TT Injection & IFA Distributed</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Maternal Observations</label>
                    <input
                      type="text"
                      value={formData.maternal_observations}
                      onChange={(e) => setFormData({ ...formData, maternal_observations: e.target.value })}
                      placeholder="Fetal movement normal, mild swelling, advised high-iron diet"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Q5: Child under 2 / Immunisation? */}
            <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-950 block">
                    Q5: Is there a newborn or child under 2 years?
                  </span>
                  <span className="text-[11px] text-amber-800">Triggers Child Immunisation Register mapping</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="has_young_child"
                      checked={formData.has_young_child === true}
                      onChange={() => setFormData({ ...formData, has_young_child: true })}
                      className="w-4 h-4 text-amber-600"
                    />
                    <span className="text-xs font-bold text-amber-950">Yes</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="has_young_child"
                      checked={formData.has_young_child === false}
                      onChange={() => setFormData({ ...formData, has_young_child: false, children: [] })}
                      className="w-4 h-4 text-amber-600"
                    />
                    <span className="text-xs font-bold text-amber-950">No</span>
                  </label>
                </div>
              </div>

              {/* Conditional Child Section */}
              {formData.has_young_child && (
                <div className="pt-3 border-t border-amber-200 bg-white p-4 rounded-xl space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Child DOB</label>
                      <input
                        type="date"
                        value={formData.child_dob}
                        onChange={(e) => setFormData({ ...formData, child_dob: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Feeding Practice</label>
                      <input
                        type="text"
                        value={formData.child_feeding}
                        onChange={(e) => setFormData({ ...formData, child_feeding: e.target.value })}
                        placeholder="Exclusive breastfeeding / Solid foods"
                        className="w-full text-xs p-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Meals Per Day</label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={formData.child_meals_per_day}
                        onChange={(e) => setFormData({ ...formData, child_meals_per_day: parseInt(e.target.value, 10) || 1 })}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>

                  {/* Children Roster */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Child Doses & Growth Observations</span>
                      <button
                        type="button"
                        onClick={handleAddChild}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                      >
                        + Add Another Child
                      </button>
                    </div>

                    {formData.children.map((child, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs">
                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Age (Years)</label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={child.age}
                            onChange={(e) => handleChildChange(idx, 'age', parseInt(e.target.value, 10) || 1)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Vaccination Status</label>
                          <select
                            value={child.vaccination_status}
                            onChange={(e) => handleChildChange(idx, 'vaccination_status', e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg"
                          >
                            <option value="Complete">Complete (Up-to-Date)</option>
                            <option value="Partial">Partial (Booster Due)</option>
                            <option value="Pending">Pending (Overdue)</option>
                          </select>
                        </div>
                        <div className="sm:col-span-4">
                          <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Clinical Observations</label>
                          <input
                            type="text"
                            value={child.observations}
                            onChange={(e) => handleChildChange(idx, 'observations', e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveChild(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Remove child entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Q6: Other health problems */}
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Q6: Other health problems, elderly care, or community concerns?
              </label>
              <textarea
                rows="2"
                value={formData.other_concerns}
                onChange={(e) => setFormData({ ...formData, other_concerns: e.target.value })}
                placeholder="Elderly joint pain, sanitation drainage issue, nutrition counseling provided..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: CLINICAL VITALS */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <CardTitle as="h2">3. Clinical Vitals & Observations</CardTitle>
                <CardDescription>Key physiological indicators recorded during today's visit</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Blood Pressure</label>
                <input
                  type="text"
                  value={formData.blood_pressure}
                  onChange={(e) => setFormData({ ...formData, blood_pressure: e.target.value })}
                  placeholder="118/76 mmHg"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Temperature</label>
                <input
                  type="text"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  placeholder="98.4 F"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Weight</label>
                <input
                  type="text"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="54 kg"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hemoglobin (Hb)</label>
                <input
                  type="text"
                  value={formData.hemoglobin}
                  onChange={(e) => setFormData({ ...formData, hemoglobin: e.target.value })}
                  placeholder="11.5 g/dL"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Reported Symptoms</label>
                <input
                  type="text"
                  value={formData.symptoms}
                  onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                  placeholder="Mild fatigue, mild headache..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Danger Signs Observed</label>
                <input
                  type="text"
                  value={formData.danger_signs}
                  onChange={(e) => setFormData({ ...formData, danger_signs: e.target.value })}
                  placeholder="None"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: FOLLOW-UP PROTOCOL & SMS */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <CardTitle as="h2">4. Follow-up Protocol & Multilingual SMS</CardTitle>
                  <CardDescription>Schedules tracking task and triggers verified beneficiary reminders</CardDescription>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-bold text-slate-700">Follow-up Needed?</span>
                <input
                  type="checkbox"
                  checked={formData.follow_up_required}
                  onChange={(e) => setFormData({ ...formData, follow_up_required: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-600 cursor-pointer"
                />
              </label>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {formData.follow_up_required ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Interval (Days)</label>
                  <select
                    value={formData.follow_up_days}
                    onChange={(e) => {
                      const days = parseInt(e.target.value, 10);
                      const d = new Date();
                      d.setDate(d.getDate() + days);
                      setFormData({ 
                        ...formData, 
                        follow_up_days: days,
                        follow_up_date: d.toISOString().split('T')[0]
                      });
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500"
                  >
                    <option value={7}>7 Days (1 Week)</option>
                    <option value={14}>14 Days (2 Weeks - Standard)</option>
                    <option value={21}>21 Days (3 Weeks)</option>
                    <option value={30}>30 Days (1 Month)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Due Date</label>
                  <input
                    type="date"
                    value={formData.follow_up_date}
                    onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                </div>

                {/* Editable Follow-up & SMS Note */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Follow-up Reason & SMS Reminder Note
                    </label>
                    <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Editable Note
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={formData.follow_up_notes}
                    onChange={(e) => setFormData({ ...formData, follow_up_notes: e.target.value, sms_note: e.target.value })}
                    placeholder="Enter clinical follow-up reason or custom SMS reminder text..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>

                {/* Trigger Button to Send SMS */}
                <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <Send className="w-3.5 h-3.5 text-teal-600" />
                        <span>Automated Multilingual SMS Reminder</span>
                        <span className="text-[10px] bg-slate-200 text-slate-800 font-semibold px-1.5 py-0.5 rounded">
                          {formData.preferred_language === 'te' ? 'తెలుగు' : formData.preferred_language === 'hi' ? 'हिंदी' : 'English'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formData.phone_number
                          ? `Configured for ${formData.member_name || 'Beneficiary'} at ${maskPhone(formData.phone_number)}`
                          : 'Enter mobile number in Section 1 to enable SMS reminder'}
                      </p>
                    </div>

                    {/* Trigger SMS Action Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={Zap}
                      onClick={handleTriggerSMS}
                      disabled={!formData.phone_number || isSendingSMS}
                      loading={isSendingSMS}
                    >
                      {smsSentSuccess ? 'Resend SMS' : 'Trigger SMS Reminder'}
                    </Button>
                  </div>

                  {/* Trigger Status Notice */}
                  {smsNotice && (
                    <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center justify-between ${
                      smsNotice.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {smsNotice.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{smsNotice.text}</span>
                      </div>
                    </div>
                  )}

                  {/* Auto-dispatch on confirmation toggle */}
                  <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-slate-200">
                    <input
                      type="checkbox"
                      checked={formData.send_sms_on_confirm}
                      onChange={(e) => setFormData({ ...formData, send_sms_on_confirm: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-teal-600"
                    />
                    <span className="text-[11px] font-medium text-slate-700">
                      Also queue reminder automatically upon visit confirmation
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-1">
                No follow-up visit scheduled. Follow-up register record will not be created.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Form Submission Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="text-xs text-slate-500">
            Click Review to confirm. Deterministic engine will generate <strong>Maternal, Immunisation, Household Register, and Follow-up</strong> records.
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={ArrowRight}
          >
            Review & Generate Records
          </Button>
        </div>

      </form>

      {/* Voice Capture Modal */}
      <VoiceCaptureModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onApplyExtracted={handleApplyVoice}
      />
    </div>
  );
}
