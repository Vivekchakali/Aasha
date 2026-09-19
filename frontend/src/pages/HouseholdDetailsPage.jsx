import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Plus, 
  ArrowLeft, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Heart, 
  Baby, 
  Phone, 
  CheckCircle2, 
  Calendar, 
  Stethoscope, 
  AlertCircle,
  Mic,
  History,
  Clock,
  Eye,
  MessageSquare,
  ShieldCheck,
  Activity,
  FileText
} from 'lucide-react';
import { 
  getHousehold, 
  addHouseholdMember, 
  updateHouseholdMember, 
  deleteHouseholdMember,
  getHouseholdHistory
} from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import VoiceCaptureModal from '../components/VoiceCaptureModal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';

export default function HouseholdDetailsPage({ onStartEncounterWithMember }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [household, setHousehold] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'visits'
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Member Modal state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formError, setFormError] = useState('');
  const [savingMember, setSavingMember] = useState(false);

  const [memberForm, setMemberForm] = useState({
    full_name: '',
    age: '',
    gender: 'Female',
    relationship_to_head: 'Spouse',
    phone_number: '',
    is_pregnant: false,
    pregnancy_month: '',
    is_child: false,
    vaccination_status: 'Complete',
    notes: ''
  });

  const fetchHouseholdData = async () => {
    try {
      setLoading(true);
      setError('');
      const [hhRes, histRes] = await Promise.all([
        getHousehold(id),
        getHouseholdHistory(id).catch(() => ({ history: [] }))
      ]);

      if (hhRes && hhRes.household) {
        setHousehold(hhRes.household);
      } else {
        setError('Household record not found.');
      }
      setHistory(histRes?.history || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load household details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseholdData();
  }, [id]);

  const maskPhone = (p) => {
    if (!p) return null;
    const clean = String(p).trim();
    if (clean.length < 6) return clean;
    return clean.slice(0, 2) + '•••• ••' + clean.slice(-2);
  };

  const handleOpenAddMember = () => {
    setEditingMember(null);
    setMemberForm({
      full_name: '',
      age: '',
      gender: 'Female',
      relationship_to_head: 'Spouse',
      phone_number: '',
      is_pregnant: false,
      pregnancy_month: '',
      is_child: false,
      vaccination_status: 'Complete',
      notes: ''
    });
    setFormError('');
    setIsMemberModalOpen(true);
  };

  const handleOpenEditMember = (m) => {
    setEditingMember(m);
    setMemberForm({
      full_name: m.full_name || '',
      age: m.age ?? '',
      gender: m.gender || 'Female',
      relationship_to_head: m.relationship_to_head || 'Spouse',
      phone_number: m.phone_number || '',
      is_pregnant: !!m.is_pregnant,
      pregnancy_month: m.pregnancy_month ?? '',
      is_child: !!m.is_child,
      vaccination_status: m.vaccination_status || 'Complete',
      notes: m.notes || ''
    });
    setFormError('');
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!memberForm.full_name.trim()) {
      setFormError('Member name is required');
      return;
    }
    if (memberForm.age === '' || isNaN(Number(memberForm.age))) {
      setFormError('Valid age is required');
      return;
    }

    try {
      setSavingMember(true);
      const payload = {
        ...memberForm,
        age: parseInt(memberForm.age, 10),
        pregnancy_month: memberForm.is_pregnant && memberForm.pregnancy_month ? parseInt(memberForm.pregnancy_month, 10) : null
      };

      if (editingMember) {
        await updateHouseholdMember(editingMember.id, payload);
      } else {
        await addHouseholdMember(household.household_id, payload);
      }

      setIsMemberModalOpen(false);
      fetchHouseholdData();
    } catch (err) {
      setFormError(err.message || 'Failed to save member');
    } finally {
      setSavingMember(false);
    }
  };

  const handleDeleteMember = async (member) => {
    if (!window.confirm(`Are you sure you want to remove member ${member.full_name}?`)) return;
    try {
      await deleteHouseholdMember(member.id);
      fetchHouseholdData();
    } catch (err) {
      alert(`Error deleting member: ${err.message}`);
    }
  };

  const handleStartVisit = (member) => {
    const draft = {
      household_id: household.household_id,
      village_area: household.village_area,
      head_of_family: household.head_of_family,
      household_members: household.total_members,
      member_id: member?.member_code || '',
      member_name: member?.full_name || '',
      gender: member?.gender || 'Female',
      maternal_age: member?.age || 27,
      relationship_to_head: member?.relationship_to_head || 'Self',
      phone_number: member?.phone_number || '',
      pregnant: !!member?.is_pregnant,
      pregnancy_month: member?.pregnancy_month || (member?.is_pregnant ? 5 : ''),
      gestational_age: member?.pregnancy_month ? Math.min(40, member.pregnancy_month * 4 + 2) : (member?.is_pregnant ? 22 : ''),
      children: (member?.is_child || (member?.age !== undefined && member.age <= 5)) ? [
        { child_index: 1, age: member.age, vaccination_status: member.vaccination_status || 'Complete', observations: member.notes || 'Routine checkup' }
      ] : []
    };

    if (onStartEncounterWithMember) {
      onStartEncounterWithMember(draft);
    }
    navigate('/encounters/new', { state: { prefilledDraft: draft } });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-500">
        <div className="w-9 h-9 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-semibold text-slate-600">Loading household profile...</p>
      </div>
    );
  }

  if (error || !household) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">{error || 'Household not found'}</h2>
        <p className="text-xs text-slate-500">The requested household record could not be found or has been relocated.</p>
        <Link to="/households">
          <Button variant="outline" size="sm" icon={ArrowLeft}>
            Back to Directory
          </Button>
        </Link>
      </div>
    );
  }

  const members = household.members || [];
  const pregnantCount = members.filter(m => m.is_pregnant).length;
  const childCount = members.filter(m => m.is_child || m.age <= 5).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link 
          to="/households" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
          <span>Households Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            icon={UserPlus} 
            onClick={handleOpenAddMember}
          >
            Add Member
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            icon={Stethoscope} 
            onClick={() => handleStartVisit(null)}
          >
            Start Household Visit
          </Button>
        </div>
      </div>

      {/* Household Profile Hero Card */}
      <Card className="bg-white">
        <div className="p-6 sm:p-7 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-13 h-13 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700 shrink-0">
                <Home className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200">
                    {household.household_id}
                  </span>
                  <Badge variant="success" dot>Active Register</Badge>
                  <span className="text-[11px] text-slate-400">ID #{household.id}</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Family of {household.head_of_family || 'Household Head'}
                </h1>
                <p className="text-xs text-slate-500">
                  {household.village_area}
                </p>
              </div>
            </div>

            {/* Micro Vitals Badges */}
            <div className="flex flex-wrap gap-2 md:self-center">
              {pregnantCount > 0 && (
                <Badge variant="danger" dot>
                  {pregnantCount} {pregnantCount === 1 ? 'Maternal Patient' : 'Maternal Patients'}
                </Badge>
              )}
              {childCount > 0 && (
                <Badge variant="warning" dot>
                  {childCount} {childCount === 1 ? 'Infant/Child' : 'Infants/Children'}
                </Badge>
              )}
              <Badge variant="info">
                {members.length} Registered {members.length === 1 ? 'Member' : 'Members'}
              </Badge>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-slate-100 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Family Members</span>
              <span className="text-lg font-bold text-slate-900 mt-0.5 block">{members.length} Listed</span>
            </div>
            <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100/80">
              <span className="text-[10px] uppercase font-bold text-rose-700 block tracking-wider">Maternal Patients</span>
              <span className="text-lg font-bold text-rose-900 mt-0.5 block">{pregnantCount} Active</span>
            </div>
            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/80">
              <span className="text-[10px] uppercase font-bold text-amber-700 block tracking-wider">Children Under 5</span>
              <span className="text-lg font-bold text-amber-900 mt-0.5 block">{childCount} Registered</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Encounters</span>
              <span className="text-lg font-bold text-slate-900 mt-0.5 block">{history.length} Recorded</span>
            </div>
          </div>

          {household.notes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2">
              <span className="font-semibold text-slate-800 shrink-0">Field Notes:</span>
              <span>{household.notes}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Tabs: Family Roster vs. Visit History */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'members'
              ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 text-teal-600" />
          <span>Family Roster ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('visits')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'visits'
              ? 'bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4 text-teal-600" />
          <span>Visit Encounters ({history.length})</span>
        </button>
      </div>

      {/* TAB 1: FAMILY ROSTER */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Registered Family Members</h2>
              <p className="text-xs text-slate-500">Persistent profiles pre-fill demographic and clinical fields during visits</p>
            </div>
            <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAddMember}>
              Add Family Member
            </Button>
          </div>

          {members.length === 0 ? (
            <Card className="text-center py-12 border-dashed">
              <CardContent className="space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No members registered in this family yet.</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Add family members to enable pre-filled demographic data during clinical encounters.
                </p>
                <Button variant="primary" size="sm" icon={UserPlus} onClick={handleOpenAddMember}>
                  Add First Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.map((m) => {
                const isPregnant = !!m.is_pregnant;
                const isChild = !!m.is_child || (m.age !== undefined && m.age <= 5);

                return (
                  <Card 
                    key={m.id} 
                    className="hover:border-teal-200 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div className="p-5 space-y-4">
                      {/* Top Row: Code, Name, Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {m.member_code}
                            </span>
                            <h3 className="font-bold text-slate-900 text-sm">{m.full_name}</h3>
                          </div>
                          <p className="text-xs text-slate-500">
                            {m.relationship_to_head} • {m.age} yrs • {m.gender}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditMember(m)}
                            className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Edit Member Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMember(m)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Remove Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Clinical Indicators */}
                      <div className="flex flex-wrap gap-1.5">
                        {isPregnant && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                            <Heart className="w-3 h-3 text-rose-500" />
                            <span>Maternal (Month {m.pregnancy_month || 'Active'})</span>
                          </span>
                        )}

                        {isChild && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                            <Baby className="w-3 h-3 text-amber-600" />
                            <span>Child Under 5 • {m.vaccination_status || 'Complete'}</span>
                          </span>
                        )}

                        {m.phone_number ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{maskPhone(m.phone_number)}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No mobile recorded</span>
                        )}
                      </div>

                      {m.notes && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {m.notes}
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
                      <span className="text-[11px] text-slate-400">Ready for clinical encounter</span>
                      <Button 
                        variant="secondary" 
                        size="xs" 
                        icon={Stethoscope} 
                        onClick={() => handleStartVisit(m)}
                      >
                        Start Visit
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VISIT HISTORY */}
      {activeTab === 'visits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Encounter Timeline</h2>
              <p className="text-xs text-slate-500">Historical records and generated outputs from visits to this household</p>
            </div>
            <Link to="/encounters/new" state={{ prefilledDraft: { household_id: household.household_id } }}>
              <Button variant="primary" size="sm" icon={Plus}>
                New Visit
              </Button>
            </Link>
          </div>

          {history.length === 0 ? (
            <Card className="text-center py-12 border-dashed">
              <CardContent className="space-y-3">
                <History className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No visits recorded for this household yet.</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Encounters conducted here will generate verified maternal, immunization, and follow-up outputs automatically.
                </p>
                <Button 
                  variant="primary" 
                  size="sm" 
                  icon={Stethoscope}
                  onClick={() => handleStartVisit(null)}
                >
                  Conduct First Visit
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((item, idx) => (
                <Card key={item.id} className="hover:border-teal-200 transition shadow-xs">
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                        #{history.length - idx}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">
                            Visit on {item.visit_date}
                          </span>
                          <Badge variant="success" dot>Verified</Badge>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {item.duration_seconds || 45}s
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Beneficiary: <strong className="text-slate-800">{item.beneficiary_name || 'Family Checkup'}</strong> • Recorded by {item.worker_name || 'ASHA Worker'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <Link
                        to={`/encounters/${item.id}/reports`}
                        state={{ householdId: id, encounterId: item.id, outputs: item.reports }}
                      >
                        <Button variant="secondary" size="xs" icon={Eye}>
                          View Reports ({item.reports?.length || 0})
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Member Add/Edit Modal */}
      <Modal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        title={editingMember ? 'Edit Household Member' : `Add Member to ${household.household_id}`}
        subtitle="Persistent demographic profile pre-filled during future visits"
        size="md"
        actions={
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Mic}
              onClick={() => setIsVoiceModalOpen(true)}
            >
              Voice Fill
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsMemberModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="member-form"
                variant="primary"
                size="sm"
                loading={savingMember}
              >
                {editingMember ? 'Save Changes' : 'Add Member'}
              </Button>
            </div>
          </div>
        }
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form id="member-form" onSubmit={handleSaveMember} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={memberForm.full_name}
              onChange={(e) => setMemberForm({ ...memberForm, full_name: e.target.value })}
              placeholder="e.g. Seetha Devi"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-hidden bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Age (Years) *</label>
              <input
                type="number"
                required
                min="0"
                max="120"
                value={memberForm.age}
                onChange={(e) => setMemberForm({ ...memberForm, age: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-hidden bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
              <select
                value={memberForm.gender}
                onChange={(e) => setMemberForm({ ...memberForm, gender: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-hidden bg-white"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Relation to Head</label>
              <select
                value={memberForm.relationship_to_head}
                onChange={(e) => setMemberForm({ ...memberForm, relationship_to_head: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-hidden bg-white"
              >
                <option value="Head">Head</option>
                <option value="Spouse">Spouse</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Mother">Mother</option>
                <option value="Father">Father</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile (Optional)</label>
              <input
                type="tel"
                value={memberForm.phone_number}
                onChange={(e) => setMemberForm({ ...memberForm, phone_number: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-hidden bg-white font-mono"
              />
            </div>
          </div>

          {/* Health Flags Panel */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Health Flags</span>

            <div className="flex items-center gap-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={memberForm.is_pregnant}
                  onChange={(e) => setMemberForm({ ...memberForm, is_pregnant: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs font-medium text-slate-700">Pregnant Beneficiary</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={memberForm.is_child}
                  onChange={(e) => setMemberForm({ ...memberForm, is_child: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs font-medium text-slate-700">Infant / Child Under 5</span>
              </label>
            </div>

            {memberForm.is_pregnant && (
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pregnancy Month (1-9)</label>
                <input
                  type="number"
                  min="1"
                  max="9"
                  value={memberForm.pregnancy_month}
                  onChange={(e) => setMemberForm({ ...memberForm, pregnancy_month: e.target.value })}
                  placeholder="e.g. 5"
                  className="w-full text-xs p-2 bg-white rounded-lg border border-slate-300"
                />
              </div>
            )}

            {memberForm.is_child && (
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vaccination Status</label>
                <select
                  value={memberForm.vaccination_status}
                  onChange={(e) => setMemberForm({ ...memberForm, vaccination_status: e.target.value })}
                  className="w-full text-xs p-2 bg-white rounded-lg border border-slate-300"
                >
                  <option value="Complete">Complete (Up-to-Date)</option>
                  <option value="Partial">Partial (Pending Booster)</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Remarks / Notes</label>
            <input
              type="text"
              value={memberForm.notes}
              onChange={(e) => setMemberForm({ ...memberForm, notes: e.target.value })}
              placeholder="Known conditions, allergies, or observations..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:outline-hidden bg-white"
            />
          </div>
        </form>
      </Modal>

      {/* Multilingual Voice Capture Modal for Member */}
      <VoiceCaptureModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onApplyExtracted={(editable, raw) => {
          setMemberForm(prev => ({
            ...prev,
            full_name: editable.member_name || raw.member_name || prev.full_name,
            age: editable.age ?? raw.age ?? prev.age,
            gender: editable.gender || raw.gender || prev.gender,
            relationship_to_head: editable.relationship || raw.relationship || prev.relationship_to_head,
            phone_number: editable.phone || raw.phone || prev.phone_number,
            is_pregnant: (editable.pregnant !== undefined) ? !!editable.pregnant : (raw.pregnant !== undefined ? !!raw.pregnant : prev.is_pregnant),
            pregnancy_month: editable.pregnancy_month || raw.pregnancy_month || prev.pregnancy_month,
            is_child: (raw.age !== undefined && raw.age <= 5) ? true : prev.is_child
          }));
          setIsVoiceModalOpen(false);
        }}
      />
    </div>
  );
}

