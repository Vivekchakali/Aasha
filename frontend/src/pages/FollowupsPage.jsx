import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle2, 
  Calendar, 
  AlertCircle, 
  Home, 
  Square, 
  Send,
  MessageSquare, 
  RefreshCw, 
  Edit2, 
  X, 
  Phone, 
  ShieldCheck, 
  Check, 
  Radio, 
  RotateCcw, 
  Zap, 
  ChevronRight, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { 
  getFollowups, 
  updateFollowup, 
  sendFollowupSMS, 
  generateSMS, 
  sendSMS, 
  retrySMS, 
  getSMSStats 
} from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';

export default function FollowupsPage() {
  const navigate = useNavigate();
  const [followups, setFollowups] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'due_today', 'overdue', 'upcoming', 'completed'
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // SMS Provider stats
  const [smsStats, setSmsStats] = useState({ provider_mode: 'mock', provider_configured: true });

  // Reschedule modal state
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [savingReschedule, setSavingReschedule] = useState(false);

  // SMS Preview & Confirm Modal state
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [activeFollowup, setActiveFollowup] = useState(null);
  const [smsDraft, setSmsDraft] = useState(null);
  const [smsLanguage, setSmsLanguage] = useState('en');
  const [editableBody, setEditableBody] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [dispatchingSMS, setDispatchingSMS] = useState(false);
  const [confirmStepOpen, setConfirmStepOpen] = useState(false);
  const [retryingId, setRetryingId] = useState(null);

  useEffect(() => {
    fetchFollowups();
    fetchProviderStats();
  }, [filter]);

  const fetchProviderStats = async () => {
    try {
      const res = await getSMSStats();
      if (res && res.stats) {
        setSmsStats(res.stats);
      }
    } catch (e) {
      console.warn('Could not fetch SMS provider stats:', e);
    }
  };

  const fetchFollowups = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter === 'completed') {
        params.status = 'completed';
      } else if (filter !== 'all') {
        params.category = filter;
        params.status = 'pending';
      }
      const res = await getFollowups(params);
      setFollowups(res.followups || []);
    } catch (e) {
      console.error('Failed to fetch followups:', e);
      setNotification({ type: 'error', text: 'Failed to load follow-up records.' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const isCompleting = item.status === 'pending';
    const newStatus = isCompleting ? 'completed' : 'pending';
    try {
      const res = await updateFollowup(item.id, { status: newStatus });
      setFollowups(prev => prev.map(f => f.id === item.id ? { ...f, ...res.followup, sms_status: isCompleting ? 'CANCELLED' : f.sms_status } : f));
      setNotification({
        type: 'success',
        text: isCompleting
          ? `Follow-up for ${item.beneficiary_name || item.household_id} completed. Future SMS reminders cancelled.`
          : `Follow-up reopened as pending.`
      });
      fetchProviderStats();
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', text: 'Failed to update follow-up status.' });
    }
  };

  // Open Preview Modal and Generate Draft
  const handleOpenSMSPreview = async (item) => {
    if (!item.phone_number) {
      setNotification({ type: 'error', text: 'Phone number required for SMS. Please update member details first.' });
      return;
    }
    setActiveFollowup(item);
    const lang = item.preferred_language || 'en';
    setSmsLanguage(lang);
    setConfirmStepOpen(false);
    setSmsModalOpen(true);

    try {
      setGeneratingDraft(true);
      const res = await generateSMS({ followup_id: item.id, language: lang });
      if (res && res.sms) {
        setSmsDraft(res.sms);
        setEditableBody(res.sms.message_body || '');
      } else {
        setNotification({ type: 'error', text: res.message || 'Could not generate SMS draft.' });
        setSmsModalOpen(false);
      }
    } catch (err) {
      setNotification({ type: 'error', text: err.message || 'Eligibility check failed or error generating draft.' });
      setSmsModalOpen(false);
    } finally {
      setGeneratingDraft(false);
    }
  };

  // Regenerate with a different language selection
  const handleLanguageChange = async (newLang) => {
    setSmsLanguage(newLang);
    if (!activeFollowup) return;
    try {
      setGeneratingDraft(true);
      const res = await generateSMS({ followup_id: activeFollowup.id, language: newLang });
      if (res && res.sms) {
        setSmsDraft(res.sms);
        setEditableBody(res.sms.message_body || '');
      }
    } catch (err) {
      setNotification({ type: 'error', text: err.message || 'Failed to switch template language.' });
    } finally {
      setGeneratingDraft(false);
    }
  };

  // Step 2: User explicitly confirms and dispatches SMS
  const handleConfirmSendSMS = async () => {
    if (!smsDraft || !smsDraft.id) return;
    try {
      setDispatchingSMS(true);
      const res = await sendSMS(smsDraft.id, { message_body: editableBody });
      setNotification({
        type: 'success',
        text: res.message || `SMS dispatched via ${smsStats.provider_mode?.toUpperCase()}.`
      });

      // Update item in list
      setFollowups(prev => prev.map(f => {
        if (f.id === activeFollowup.id) {
          return {
            ...f,
            sms_status: res.sms.status || 'SENT',
            reminder_count: (f.reminder_count || 0) + 1,
            last_reminder_at: new Date().toISOString()
          };
        }
        return f;
      }));

      setSmsModalOpen(false);
      setConfirmStepOpen(false);
      fetchProviderStats();
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.message || 'Failed to dispatch SMS. Please check eligibility or try again.'
      });
      setConfirmStepOpen(false);
    } finally {
      setDispatchingSMS(false);
    }
  };

  // Retry a failed SMS
  const handleRetrySMS = async (item) => {
    try {
      setRetryingId(item.id);
      const genRes = await generateSMS({ followup_id: item.id, language: item.preferred_language || 'en' });
      if (genRes && genRes.sms) {
        const sendRes = await sendSMS(genRes.sms.id, { message_body: genRes.sms.message_body });
        setNotification({
          type: 'success',
          text: sendRes.message || 'SMS retry succeeded!'
        });
        setFollowups(prev => prev.map(f => f.id === item.id ? { ...f, sms_status: sendRes.sms.status } : f));
      }
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.message || 'Retry failed. Check phone number and eligibility.'
      });
    } finally {
      setRetryingId(null);
    }
  };

  const openRescheduleModal = (item) => {
    setRescheduleItem(item);
    setNewDueDate(item.due_date ? item.due_date.slice(0, 10) : '');
    setNewNotes(item.notes || '');
  };

  const handleSaveReschedule = async () => {
    if (!rescheduleItem || !newDueDate) return;
    try {
      setSavingReschedule(true);
      const res = await updateFollowup(rescheduleItem.id, {
        due_date: newDueDate,
        notes: newNotes
      });
      setFollowups(prev => prev.map(f => f.id === rescheduleItem.id ? { ...f, ...res.followup } : f));
      setRescheduleItem(null);
      setNotification({ type: 'success', text: 'Follow-up rescheduled successfully.' });
    } catch (e) {
      setNotification({ type: 'error', text: e.message || 'Failed to reschedule follow-up.' });
    } finally {
      setSavingReschedule(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <Card className="bg-white">
        <div className="p-6 sm:p-7 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="teal">Continuity of Care Register</Badge>

                {/* Provider Indicator Pill */}
                {smsStats.provider_mode === 'twilio' ? (
                  <Badge variant={smsStats.provider_configured ? 'success' : 'warning'} dot>
                    {smsStats.provider_configured ? 'Twilio Live Gateway' : 'Twilio Pending Config'}
                  </Badge>
                ) : (
                  <Badge variant="neutral">
                    Mock SMS Engine (Simulation)
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Scheduled Follow-up Center</h1>
              <p className="text-xs text-slate-500">
                Automated clinical tracking for vaccinations, IFA tablets, and high-risk reviews with verified multilingual SMS reminders.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto self-start md:self-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'due_today', label: 'Due Today' },
                { id: 'overdue', label: 'Overdue' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'completed', label: 'Completed' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                    filter === tab.id 
                      ? 'bg-white text-slate-900 shadow-2xs' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold ${
          notification.type === 'error' 
            ? 'bg-rose-50 text-rose-800 border border-rose-200' 
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Followup Tasks Grid */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/90 space-y-3">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">Loading follow-up tasks...</p>
          </div>
        ) : followups.length === 0 ? (
          <Card className="text-center py-12 border-dashed">
            <CardContent className="space-y-3">
              <Clock className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-slate-800 text-sm">No follow-up records found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                All scheduled tasks in this view have been attended to or none are currently queued.
              </p>
            </CardContent>
          </Card>
        ) : (
          followups.map((item) => {
            const isCompleted = item.status === 'completed';
            const urgencyVariant = 
              item.urgency === 'overdue' ? 'danger' :
              item.urgency === 'due_today' ? 'warning' :
              isCompleted ? 'success' : 'neutral';

            const typeLabel = 
              item.followup_type === 'iron_tablets' ? 'IFA Tablets' :
              item.followup_type === 'vaccination' ? 'Vaccination' :
              item.followup_type === 'medication' ? 'Medication' : 'General Care';

            const smsStatus = (item.sms_status || 'NONE').toUpperCase();

            return (
              <Card
                key={item.id}
                className={`transition-all shadow-xs ${
                  isCompleted
                    ? 'bg-slate-50/70 border-slate-200 opacity-80'
                    : 'bg-white hover:border-teal-200'
                }`}
              >
                <div className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <button
                      onClick={() => handleToggleStatus(item)}
                      className="mt-0.5 text-slate-400 hover:text-teal-600 transition cursor-pointer shrink-0"
                      title={isCompleted ? "Reopen task" : "Mark completed (cancels future SMS reminders)"}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 hover:text-teal-500" />
                      )}
                    </button>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 flex items-center gap-1">
                          <Home className="w-3.5 h-3.5 text-slate-400" />
                          {item.household_id} • {item.beneficiary_name || 'Beneficiary'}
                        </span>

                        {/* Follow-up Type Badge */}
                        <Badge variant="teal">{typeLabel}</Badge>

                        {/* Due Date & Urgency */}
                        <Badge variant={urgencyVariant} dot>
                          Due: {item.due_date} ({item.urgency ? item.urgency.replace('_', ' ') : 'scheduled'})
                        </Badge>

                        {/* Standardized SMS Status Badge */}
                        {smsStatus !== 'NONE' && (
                          <Badge 
                            variant={
                              smsStatus === 'SENT' || smsStatus === 'DELIVERED' ? 'success' :
                              smsStatus === 'FAILED' ? 'danger' :
                              smsStatus === 'CANCELLED' ? 'neutral' : 'info'
                            }
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>SMS: {smsStatus}</span>
                            {item.reminder_count > 0 && <span>({item.reminder_count})</span>}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-slate-700">{item.reason}</p>

                      {item.notes && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {item.notes}
                        </p>
                      )}

                      {/* Phone & Language line */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {item.masked_phone ? (
                            <span>{item.masked_phone}</span>
                          ) : (
                            <span className="text-rose-500 font-sans font-bold">Phone number required</span>
                          )}
                        </span>
                        {item.preferred_language && (
                          <span className="uppercase bg-slate-100 px-1.5 py-0.2 rounded font-sans text-[10px] text-slate-600 font-bold">
                            {item.preferred_language}
                          </span>
                        )}
                        {item.last_reminder_at && (
                          <span className="text-[10px] text-slate-400 font-sans">
                            Last: {new Date(item.last_reminder_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {!isCompleted && (
                      <>
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={Edit2}
                          onClick={() => openRescheduleModal(item)}
                        >
                          Reschedule
                        </Button>

                        {/* SMS Action: Generate or Preview */}
                        {item.phone_number ? (
                          smsStatus === 'FAILED' ? (
                            <Button
                              variant="danger"
                              size="xs"
                              icon={RotateCcw}
                              onClick={() => handleRetrySMS(item)}
                              loading={retryingId === item.id}
                            >
                              Retry SMS
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="xs"
                              icon={Send}
                              onClick={() => handleOpenSMSPreview(item)}
                            >
                              {smsStatus === 'GENERATED' || smsStatus === 'PENDING' ? 'Preview & Send' : 'Generate SMS'}
                            </Button>
                          )
                        ) : (
                          <Link to={`/households/${item.household_id}`}>
                            <Button variant="outline" size="xs" icon={Phone}>
                              Add Phone
                            </Button>
                          </Link>
                        )}
                      </>
                    )}

                    <Button
                      variant={isCompleted ? "ghost" : "secondary"}
                      size="xs"
                      onClick={() => handleToggleStatus(item)}
                    >
                      {isCompleted ? 'Reopen' : 'Mark Done'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* SMS PREVIEW & EXPLICIT CONFIRMATION MODAL */}
      <Modal
        isOpen={smsModalOpen && !!activeFollowup}
        onClose={() => setSmsModalOpen(false)}
        title={confirmStepOpen ? 'Confirm SMS Dispatch' : 'SMS Reminder Preview'}
        subtitle={confirmStepOpen ? 'Step 2: Explicit Confirmation' : 'Step 1: SMS Template & Content Review'}
        size="md"
        actions={
          confirmStepOpen ? (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmStepOpen(false)}
                disabled={dispatchingSMS}
              >
                Back to Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                onClick={handleConfirmSendSMS}
                loading={dispatchingSMS}
              >
                Send SMS Now
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSmsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={ChevronRight}
                onClick={() => setConfirmStepOpen(true)}
                disabled={!editableBody.trim()}
              >
                Confirm & Send
              </Button>
            </div>
          )
        }
      >
        {generatingDraft ? (
          <div className="py-12 text-center space-y-2">
            <RefreshCw className="w-7 h-7 text-teal-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Evaluating real-time eligibility & generating template draft...</p>
          </div>
        ) : confirmStepOpen ? (
          /* Step 2: Explicit Confirmation Dialog */
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Dispatch real SMS to {activeFollowup?.masked_phone || '+91******1234'}?</span>
              </div>
              <p className="text-[11px] text-amber-800">
                This action will dispatch an administrative reminder via the active provider (<strong>{smsStats.provider_mode?.toUpperCase()}</strong>).
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
              <p><strong>Recipient:</strong> {activeFollowup?.beneficiary_name} ({activeFollowup?.masked_phone})</p>
              <p><strong>Language:</strong> {smsLanguage.toUpperCase()}</p>
              <p><strong>Message:</strong> {editableBody}</p>
            </div>
          </div>
        ) : (
          /* Step 1: Preview & Edit Mode */
          <div className="space-y-4 text-xs">
            {/* Beneficiary Details Grid */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-600">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Member</span>
                <strong className="text-slate-900">{activeFollowup?.beneficiary_name || 'Beneficiary'}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Phone</span>
                <strong className="text-slate-900 font-mono">{activeFollowup?.masked_phone || 'None'}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Reminder Type</span>
                <strong className="text-slate-900">{activeFollowup?.followup_type || 'General'}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Scheduled Date</span>
                <strong className="text-slate-900">{activeFollowup?.due_date}</strong>
              </div>
            </div>

            {/* Language Selector */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Select Template Language:
              </label>
              <select
                value={smsLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden text-xs"
              >
                <option value="en">English (Official Template)</option>
                <option value="te">తెలుగు (Telugu Approved Template)</option>
                <option value="hi">हिन्दी (Hindi Approved Template)</option>
              </select>
            </div>

            {/* Editable Draft Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">
                  Message Content (Approved Draft):
                </label>
                <span className="text-[10px] text-slate-400">{editableBody.length} chars</span>
              </div>
              <textarea
                rows={4}
                value={editableBody}
                onChange={(e) => setEditableBody(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-sans text-xs"
                placeholder="Approved reminder text..."
              />
            </div>

            {/* Provider Note */}
            <div className="p-2.5 bg-slate-100 rounded-xl text-[11px] flex items-center justify-between">
              <span className="text-slate-600">Active Engine: <strong>{smsStats.provider_mode?.toUpperCase()}</strong></span>
              <span className="text-[10px] font-bold text-slate-500">
                {smsStats.provider_mode === 'mock' ? 'MOCK SMS (Simulation)' : 'TWILIO MESSAGING API'}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={!!rescheduleItem}
        onClose={() => setRescheduleItem(null)}
        title="Reschedule Follow-up"
        subtitle={rescheduleItem ? `${rescheduleItem.beneficiary_name || rescheduleItem.household_id}` : ''}
        size="sm"
        actions={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRescheduleItem(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveReschedule}
              disabled={savingReschedule || !newDueDate}
              loading={savingReschedule}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">New Due Date:</label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Update Notes:</label>
            <textarea
              rows={3}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Add rationale for rescheduling..."
              className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

