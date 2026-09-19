import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Layers, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  Droplet, 
  Heart, 
  Baby, 
  Activity, 
  Calendar,
  Home,
  Check,
  Phone,
  Edit2
} from 'lucide-react';
import { createEncounter, processEncounter } from '../services/api';
import { useOffline } from '../context/OfflineContext';
import ProcessingAnimation from '../components/ProcessingAnimation';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

const maskPhone = (num) => {
  if (!num) return 'Not provided';
  const clean = String(num).replace(/\D/g, '');
  if (clean.length >= 6) {
    return `${clean.slice(0, 2)}•••• ••${clean.slice(-2)}`;
  }
  return clean;
};

export default function EncounterReview({ encounterData: propData, onEdit, onConfirm: propConfirm, isProcessing: propProcessing }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline, addOfflineEncounter } = useOffline();

  const data = propData || location.state?.draft;

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!data) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">No Active Visit Draft to Review</h2>
        <p className="text-xs text-slate-500">
          Please begin a household visit encounter first to review and generate records.
        </p>
        <Link to="/encounters/new">
          <Button variant="primary" size="sm" icon={ArrowRight}>
            Start New Visit
          </Button>
        </Link>
      </div>
    );
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      navigate('/encounters/new', { state: { prefilledDraft: data } });
    }
  };

  const handleConfirm = async () => {
    if (propConfirm) {
      propConfirm();
      return;
    }

    if (!isOnline) {
      addOfflineEncounter(data, data.duration_seconds || 45);
      alert(`Network is offline. Visit for ${data.household_id} saved to offline queue.`);
      navigate('/offline-sync');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      // 1. Save encounter
      const res = await createEncounter(data);
      const encId = res.encounter.id;

      // 2. Process encounter with mapping engine
      const procRes = await processEncounter(encId);

      // Transition to records view
      setTimeout(() => {
        setIsProcessing(false);
        navigate(`/encounters/${encId}/reports`, { 
          state: { 
            outputs: procRes.generated_outputs || [],
            encounterId: encId,
            householdId: data.household_id
          } 
        });
      }, 2000);
    } catch (err) {
      console.error('Encounter processing error:', err);
      setError(err.message || 'Failed to process encounter');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Card */}
      <Card className="bg-white">
        <div className="p-6 sm:p-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="teal">Step 2 of 3 • Review & Confirm</Badge>
                <span className="text-xs text-slate-400">Encounter Verification</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Verification & Review</h1>
              <p className="text-xs text-slate-500">
                Confirm information captured during this visit before verified programme reports are generated.
              </p>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 rounded-xl text-xs font-mono font-semibold text-slate-700 self-start sm:self-auto border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>Capture Duration: {data.duration_seconds || 45}s</span>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Review Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Household & Census */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-teal-600" />
                <CardTitle as="h3">HOUSEHOLD CENSUS</CardTitle>
              </div>
              <span className="text-xs font-mono bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-700 border border-slate-200">
                {data.household_id}
              </span>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Head of Family</span>
              <span className="font-semibold text-slate-900">{data.head_of_family}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Area / Ward</span>
              <span className="font-semibold text-slate-900">{data.village_area}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Total Family Members</span>
              <span className="font-semibold text-slate-900">{data.household_members}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Safe Water Source</span>
              <span className={`font-semibold ${data.safe_water ? 'text-emerald-700' : 'text-rose-700'}`}>
                {data.safe_water ? '✓ Yes (Protected)' : '✗ No (Unsafe / Open)'}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Active Illness</span>
              <span className="font-semibold text-slate-900">
                {data.has_illness ? `Yes (${data.illness_details || data.illness_member_name})` : 'None'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Beneficiary Details & Clinical Vitals */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <CardTitle as="h3">BENEFICIARY & VITALS</CardTitle>
              </div>
              <Badge variant="teal">
                {data.member_name || 'Generic Visit'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Relation / Gender</span>
              <span className="font-semibold text-slate-900">{data.relationship_to_head || 'Self'} ({data.gender || 'F'})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Mobile Number</span>
              <span className="font-semibold font-mono text-slate-900">{data.phone_number ? maskPhone(data.phone_number) : 'Not provided'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Blood Pressure</span>
              <span className="font-semibold text-slate-900">{data.blood_pressure || '118/76 mmHg'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Temp & Weight</span>
              <span className="font-semibold text-slate-900">{data.temperature || '98.4 F'} • {data.weight || '54 kg'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Hemoglobin</span>
              <span className="font-semibold text-slate-900">{data.hemoglobin || '11.5 g/dL'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Maternal Health */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                <CardTitle as="h3">MATERNAL HEALTH</CardTitle>
              </div>
              <Badge variant={data.pregnant ? 'danger' : 'neutral'}>
                {data.pregnant ? 'Active Pregnancy' : 'Not Pregnant'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-slate-600">
            {data.pregnant ? (
              <>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Maternal Age</span>
                  <span className="font-semibold text-slate-900">{data.maternal_age} yrs</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Gestation</span>
                  <span className="font-semibold text-slate-900">Month {data.pregnancy_month} ({data.gestational_age} weeks)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ANC Registered</span>
                  <span className="font-semibold text-emerald-700">{data.pregnancy_registered ? '✓ Registered' : 'Pending'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">TT / IFA Status</span>
                  <span className="font-semibold text-emerald-700">{data.pregnancy_vaccinated ? '✓ Received' : 'Pending'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Clinical Observations</span>
                  <span className="font-semibold text-slate-900">{data.maternal_observations || 'Normal'}</span>
                </div>
              </>
            ) : (
              <p className="text-slate-400 italic py-4 text-center">No pregnancy reported during this visit. Maternal register will be skipped.</p>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Children & Follow-up */}
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Baby className="w-4 h-4 text-amber-500" />
                <CardTitle as="h3">CHILD HEALTH & FOLLOW-UP</CardTitle>
              </div>
              <Badge variant="warning">
                {data.children?.length || 0} Child(ren)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-3 text-slate-600">
            {data.children?.length > 0 ? (
              data.children.map((c, i) => (
                <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                  <p className="font-bold text-slate-900">Child #{i + 1} ({c.age} yrs) • {c.vaccination_status}</p>
                  <p className="text-[11px] text-slate-500">{c.observations || 'Normal health'}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-400 italic text-center py-2">No young children documented.</p>
            )}

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Follow-up Protocol</span>
                <span className="font-semibold text-slate-900">
                  {data.follow_up_required ? `In ${data.follow_up_days || 14} days (${data.follow_up_date || 'Calculated'})` : 'None required'}
                </span>
              </div>
              {(data.sms_note || data.follow_up_notes) && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px]">
                  <p className="font-bold text-slate-700 mb-0.5">Follow-up / SMS Note:</p>
                  <p className="text-slate-800">{data.sms_note || data.follow_up_notes}</p>
                </div>
              )}
              {data.phone_number && (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    <span>Recipient: <strong>{maskPhone(data.phone_number)}</strong></span>
                  </div>
                  <Badge variant="teal">
                    {data.send_sms_on_confirm ? 'Auto-dispatch' : 'Manual'}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Target Preview Alert */}
      <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-xs text-teal-900">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            Upon confirmation, verified programme records will be generated automatically without duplicate entry.
          </span>
        </div>
        <span className="font-bold text-teal-800 text-[11px] bg-teal-100 px-2.5 py-0.5 rounded-full">
          1 Encounter → Multiple Registers
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          icon={ArrowLeft}
          onClick={handleEdit}
          disabled={isProcessing || propProcessing}
        >
          Edit Encounter
        </Button>

        <Button
          type="button"
          variant="primary"
          size="md"
          icon={ArrowRight}
          onClick={handleConfirm}
          disabled={isProcessing || propProcessing}
          loading={isProcessing || propProcessing}
        >
          Confirm & Generate Records
        </Button>
      </div>

      {/* Processing Animation */}
      <ProcessingAnimation
        isVisible={isProcessing || propProcessing}
        onClose={() => setIsProcessing(false)}
        onComplete={() => {}}
      />
    </div>
  );
}

