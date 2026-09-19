import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  UserPlus, 
  Baby, 
  Heart, 
  Phone, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  ChevronRight, 
  ChevronDown, 
  Calendar,
  Sparkles,
  Mic,
  History,
  Pill
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { 
  getHouseholds, 
  createHousehold, 
  addHouseholdMember, 
  updateHouseholdMember, 
  deleteHouseholdMember 
} from '../services/api';
import VoiceCaptureModal from '../components/VoiceCaptureModal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SearchInput from '../components/ui/SearchInput';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

export default function HouseholdsPage({ onStartEncounterWithMember }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'pregnant' | 'children'
  const [expandedHhId, setExpandedHhId] = useState('H1024');

  // Modals state
  const [isAddHhModalOpen, setIsAddHhModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [targetHhId, setTargetHhId] = useState(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState('member');

  // Household Form
  const [hhForm, setHhForm] = useState({
    household_id: '',
    village_area: '',
    head_of_family: '',
    notes: ''
  });

  // Member Form
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

  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchHouseholdsList = async () => {
    try {
      setLoading(true);
      const res = await getHouseholds();
      setHouseholds(res.households || []);
    } catch (err) {
      console.error('Failed to load households:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseholdsList();
  }, []);

  const filteredHouseholds = households.filter(h => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (
      h.household_id?.toLowerCase().includes(q) ||
      h.head_of_family?.toLowerCase().includes(q) ||
      h.village_area?.toLowerCase().includes(q)
    );

    if (!matchesSearch) return false;

    if (filterType === 'pregnant') {
      return (h.members || []).some(m => m.is_pregnant);
    }
    if (filterType === 'children') {
      return (h.members || []).some(m => m.is_child || m.age <= 5);
    }

    return true;
  });

  const handleOpenAddMember = (hh) => {
    setTargetHhId(hh.household_id);
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

  const handleOpenEditMember = (hh, member) => {
    setTargetHhId(hh.household_id);
    setEditingMember(member);
    setMemberForm({
      full_name: member.full_name || '',
      age: member.age || '',
      gender: member.gender || 'Female',
      relationship_to_head: member.relationship_to_head || 'Spouse',
      phone_number: member.phone_number || '',
      is_pregnant: member.is_pregnant || false,
      pregnancy_month: member.pregnancy_month || '',
      is_child: member.is_child || false,
      vaccination_status: member.vaccination_status || 'Complete',
      notes: member.notes || ''
    });
    setFormError('');
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!memberForm.full_name.trim()) {
      setFormError('Member name is required.');
      return;
    }

    const ageNum = parseInt(memberForm.age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      setFormError('Please enter a valid age (0-120).');
      return;
    }

    if (memberForm.is_pregnant) {
      if (memberForm.gender === 'Male') {
        setFormError('Validation Rule: Pregnancy status cannot be assigned to male members.');
        return;
      }
      if (ageNum < 12 || ageNum > 55) {
        setFormError('Validation Rule: Plausible maternal age is 12-55.');
        return;
      }
      if (memberForm.pregnancy_month) {
        const m = parseInt(memberForm.pregnancy_month, 10);
        if (m < 1 || m > 9) {
          setFormError('Validation Rule: Pregnancy month must be between 1 and 9.');
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      if (editingMember) {
        await updateHouseholdMember(editingMember.id, {
          ...memberForm,
          age: ageNum
        });
      } else {
        await addHouseholdMember(targetHhId, {
          ...memberForm,
          age: ageNum
        });
      }
      setIsMemberModalOpen(false);
      await fetchHouseholdsList();
    } catch (err) {
      setFormError(err.message || 'Failed to save member.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (member) => {
    if (!window.confirm(t('confirmDelete', 'Are you sure you want to delete this member?'))) {
      return;
    }
    try {
      await deleteHouseholdMember(member.id);
      await fetchHouseholdsList();
    } catch (err) {
      alert(err.message || 'Failed to delete member');
    }
  };

  const handleCreateHousehold = async (e) => {
    e.preventDefault();
    if (!hhForm.household_id || !hhForm.village_area) {
      alert('Household ID and Village/Area are required');
      return;
    }
    try {
      setIsSaving(true);
      await createHousehold(hhForm);
      setIsAddHhModalOpen(false);
      setHhForm({ household_id: '', village_area: '', head_of_family: '', notes: '' });
      await fetchHouseholdsList();
    } catch (err) {
      alert(err.message || 'Failed to create household');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartVisitWithMember = (hh, member) => {
    const draftData = {
      household_id: hh.household_id,
      village_area: hh.village_area,
      head_of_family: hh.head_of_family,
      household_members: hh.members ? hh.members.length : 4,
      member_id: member.member_code,
      member_name: member.full_name,
      gender: member.gender,
      relationship_to_head: member.relationship_to_head,
      maternal_age: member.age,
      pregnant: member.is_pregnant,
      pregnancy_month: member.pregnancy_month || 5,
      has_young_child: member.is_child || member.age <= 5,
      phone_number: member.phone_number || ''
    };

    if (onStartEncounterWithMember) {
      onStartEncounterWithMember(draftData);
    } else {
      navigate('/encounters/new', { state: { prefilledDraft: draftData } });
    }
  };

  const handleVoiceApply = (extracted) => {
    if (voiceTarget === 'household') {
      setHhForm(prev => ({
        ...prev,
        household_id: extracted.household_id || prev.household_id,
        village_area: extracted.village_area || prev.village_area,
        head_of_family: extracted.head_of_family || prev.head_of_family
      }));
    } else {
      setMemberForm(prev => ({
        ...prev,
        full_name: extracted.member_name || extracted.full_name || prev.full_name,
        age: extracted.age || prev.age,
        is_pregnant: extracted.is_pregnant !== undefined ? extracted.is_pregnant : prev.is_pregnant,
        pregnancy_month: extracted.pregnancy_month || prev.pregnancy_month,
        gender: extracted.gender || prev.gender,
        phone_number: extracted.phone_number || prev.phone_number
      }));
    }
    setIsVoiceModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Home className="w-6 h-6 text-teal-700 shrink-0" />
            <span>Households & Member Registry</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
            Persistent community demographic records, family structures, and individual health baselines
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="md"
            icon={Mic}
            onClick={() => {
              setVoiceTarget('household');
              setIsVoiceModalOpen(true);
            }}
            className="text-xs"
          >
            Spoken Intake
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => setIsAddHhModalOpen(true)}
            className="text-xs shadow-xs"
          >
            + Register Household
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3 sm:p-4 border-slate-200/90 shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
            placeholder="Search by Household ID, Village Area, Head of Family..."
            className="flex-1 min-w-[240px]"
            size="md"
          />

          {/* Quick Segment Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                filterType === 'all'
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({households.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterType('pregnant')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                filterType === 'pregnant'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span>Maternal</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('children')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                filterType === 'children'
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
              }`}
            >
              <Baby className="w-3.5 h-3.5" />
              <span>Children &lt; 5</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Household Registry List */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-400 text-sm">
          <div className="inline-flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading registered household records...</span>
          </div>
        </div>
      ) : filteredHouseholds.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No households match your criteria"
          description="Try modifying your search or click below to register a new family."
          actionLabel="+ Register New Household"
          onAction={() => setIsAddHhModalOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {filteredHouseholds.map((hh) => {
            const isExpanded = expandedHhId === hh.household_id;
            const members = hh.members || [];
            const pregnantMembers = members.filter(m => m.is_pregnant);
            const childMembers = members.filter(m => m.is_child || m.age <= 5);

            return (
              <Card key={hh.household_id} className="border-slate-200/90 shadow-xs">
                {/* Household Summary Card Header */}
                <div 
                  onClick={() => setExpandedHhId(isExpanded ? null : hh.household_id)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition bg-white"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center font-mono font-bold text-teal-800 text-sm shrink-0 shadow-2xs">
                      {hh.household_id}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-base">
                          {hh.head_of_family || 'Family Head Unassigned'}
                        </span>
                        <Badge variant="neutral" size="sm">
                          {members.length} Members
                        </Badge>
                        {pregnantMembers.length > 0 && (
                          <Badge variant="danger" size="sm" dot>
                            {pregnantMembers.length} Maternal
                          </Badge>
                        )}
                        {childMembers.length > 0 && (
                          <Badge variant="info" size="sm" dot>
                            {childMembers.length} Children
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {hh.village_area} • Catchment Sector
                      </p>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={UserPlus}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddMember(hh);
                      }}
                      className="text-xs"
                    >
                      Add Member
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/households/${hh.household_id}`);
                      }}
                      className="text-xs"
                    >
                      View Profile
                    </Button>

                    <div className="p-1 text-slate-400">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsible Family Roster */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/40 p-4 sm:p-5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-teal-700" />
                        <span>Registered Household Members ({members.length})</span>
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        Click "Start Visit" to pre-fill today's clinical encounter
                      </span>
                    </div>

                    {members.length === 0 ? (
                      <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                        No members registered for this dwelling. Click "Add Member" above to add family members.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-3 hover:border-slate-300 transition"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  member.is_pregnant
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : member.is_child || member.age <= 5
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}>
                                  {member.is_pregnant ? (
                                    <Heart className="w-4 h-4" />
                                  ) : member.is_child || member.age <= 5 ? (
                                    <Baby className="w-4 h-4" />
                                  ) : (
                                    member.full_name.charAt(0)
                                  )}
                                </div>

                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-sm text-slate-900">
                                      {member.full_name}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 rounded">
                                      {member.member_code}
                                    </span>
                                  </div>

                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {member.gender} • {member.age} yrs • {member.relationship_to_head || 'Family Member'}
                                  </p>

                                  {member.phone_number && (
                                    <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      <span>+91******{member.phone_number.slice(-4)}</span>
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Clinical Status Badges */}
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                {member.is_pregnant && (
                                  <Badge variant="danger" size="sm">
                                    Preg Month {member.pregnancy_month || 5}
                                  </Badge>
                                )}
                                {(member.is_child || member.age <= 5) && (
                                  <Badge variant={member.vaccination_status === 'Complete' ? 'success' : 'warning'} size="sm">
                                    Vax: {member.vaccination_status || 'Pending'}
                                  </Badge>
                                )}
                                {member.iron_tablets_required && (
                                  <Badge variant={member.iron_tablets_collected ? 'success' : 'warning'} size="sm">
                                    IFA: {member.iron_tablets_collected ? 'Collected' : 'Pending'}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Member Action Bar */}
                            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditMember(hh, member)}
                                  className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg text-xs transition cursor-pointer"
                                  title="Edit Member Profile"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMember(member)}
                                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg text-xs transition cursor-pointer"
                                  title="Remove Member"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleStartVisitWithMember(hh, member)}
                                className="text-xs bg-teal-700 hover:bg-teal-800"
                              >
                                Start Visit
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Household Modal */}
      <Modal
        isOpen={isAddHhModalOpen}
        onClose={() => setIsAddHhModalOpen(false)}
        title="Register New Household"
        subtitle="Add a new family dwelling unit to your community catchment registry"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddHhModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateHousehold} loading={isSaving}>
              Register Household
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateHousehold} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Household ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={hhForm.household_id}
              onChange={(e) => setHhForm({ ...hhForm, household_id: e.target.value.toUpperCase() })}
              placeholder="e.g. H1029"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">Unique dwelling registration identifier</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Village / Sector / Area <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={hhForm.village_area}
              onChange={(e) => setHhForm({ ...hhForm, village_area: e.target.value })}
              placeholder="e.g. Shanti Nagar, Ward 4"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Head of Household
            </label>
            <input
              type="text"
              value={hhForm.head_of_family}
              onChange={(e) => setHhForm({ ...hhForm, head_of_family: e.target.value })}
              placeholder="e.g. Ramesh Chandra"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Location Notes & Landmark
            </label>
            <textarea
              rows={2}
              value={hhForm.notes}
              onChange={(e) => setHhForm({ ...hhForm, notes: e.target.value })}
              placeholder="Landmark, dwelling description, family notes..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
          </div>
        </form>
      </Modal>

      {/* Add / Edit Member Modal */}
      <Modal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        title={editingMember ? `Edit Member: ${editingMember.full_name}` : `Add Member to ${targetHhId}`}
        subtitle="Manage member demographics, clinical indicators, and contact details"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsMemberModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveMember} loading={isSaving}>
              {editingMember ? 'Save Changes' : 'Add Member'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveMember} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={memberForm.full_name}
                onChange={(e) => setMemberForm({ ...memberForm, full_name: e.target.value })}
                placeholder="Beneficiary name"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Age (Years) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                max={120}
                required
                value={memberForm.age}
                onChange={(e) => setMemberForm({ ...memberForm, age: e.target.value })}
                placeholder="Age in years"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Gender
              </label>
              <select
                value={memberForm.gender}
                onChange={(e) => setMemberForm({ ...memberForm, gender: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Relationship to Head
              </label>
              <select
                value={memberForm.relationship_to_head}
                onChange={(e) => setMemberForm({ ...memberForm, relationship_to_head: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
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
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mobile Phone (10-digit Indian Number)
            </label>
            <input
              type="text"
              maxLength={10}
              value={memberForm.phone_number}
              onChange={(e) => setMemberForm({ ...memberForm, phone_number: e.target.value.replace(/\D/g, '') })}
              placeholder="e.g. 9876543210"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          {/* Maternal Status Card */}
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={memberForm.is_pregnant}
                onChange={(e) => setMemberForm({ ...memberForm, is_pregnant: e.target.checked })}
                className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
              />
              <span className="text-xs font-bold text-rose-900">
                Beneficiary is Currently Pregnant (Maternal Care)
              </span>
            </label>

            {memberForm.is_pregnant && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-rose-800 mb-1">
                    Pregnancy Month (1-9)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={9}
                    value={memberForm.pregnancy_month}
                    onChange={(e) => setMemberForm({ ...memberForm, pregnancy_month: e.target.value })}
                    placeholder="e.g. 5"
                    className="w-full bg-white border border-rose-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Child Health Card */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={memberForm.is_child}
                onChange={(e) => setMemberForm({ ...memberForm, is_child: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-blue-900">
                Child Health & Immunization Tracking (&le; 5 years)
              </span>
            </label>

            {memberForm.is_child && (
              <div>
                <label className="block text-[11px] font-bold text-blue-800 mb-1">
                  Vaccination Status
                </label>
                <select
                  value={memberForm.vaccination_status}
                  onChange={(e) => setMemberForm({ ...memberForm, vaccination_status: e.target.value })}
                  className="w-full bg-white border border-blue-200 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Complete">Complete (Up-to-date)</option>
                  <option value="Partial">Partial (Missed Doses)</option>
                  <option value="Pending">Pending (Overdue)</option>
                </select>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Voice Assistant Modal */}
      <VoiceCaptureModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onApplyToForm={handleVoiceApply}
      />
    </div>
  );
}
