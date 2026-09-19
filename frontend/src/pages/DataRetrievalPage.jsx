import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, Download, Send, MessageSquare, Calendar, AlertCircle, 
  CheckCircle2, Clock, Filter, Users, Baby, HeartPulse, Pill, 
  RefreshCw, ShieldCheck, Check, X, ChevronLeft, ChevronRight,
  Phone, ArrowRight, Info, AlertTriangle, Sparkles, FileText
} from 'lucide-react';
import { getDataRetrieval, getExportDataUrl, sendFollowupSMS, bulkGenerateSMS, retrySMS } from '../services/api';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const CATEGORIES = [
  { id: 'PEOPLE', label: 'All People', icon: Users, desc: 'Registered household members' },
  { id: 'MATERNAL', label: 'Maternal', icon: HeartPulse, desc: 'ANC & pregnant women' },
  { id: 'CHILD', label: 'Child Health', icon: Baby, desc: 'Children < 5 & immunisation' },
  { id: 'FOLLOW_UP', label: 'Follow-ups', icon: Clock, desc: 'Due, overdue & completed' },
  { id: 'IRON_TABLETS', label: 'Iron Tablets', icon: Pill, desc: 'IFA distribution tracking' },
  { id: 'SMS', label: 'SMS Logs', icon: MessageSquare, desc: 'Twilio & simulated logs' },
  { id: 'HOUSEHOLDS', label: 'Households', icon: ShieldCheck, desc: 'Families & dwellings' },
];

const PRESETS_PEOPLE = [
  { id: '', label: 'All Members' },
  { id: 'pregnant', label: 'Pregnant Women' },
  { id: 'under2', label: 'Children < 2' },
  { id: 'newborn', label: 'Newborns (< 1)' },
  { id: 'elderly', label: 'Elderly (60+)' },
  { id: 'health_concerns', label: 'Health Concerns' }
];

export default function DataRetrievalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(searchParams.get('category') || 'PEOPLE');
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [preset, setPreset] = useState(searchParams.get('preset') || '');
  const [urgencyFilter, setUrgencyFilter] = useState(searchParams.get('urgency') || '');
  const [vaxFilter, setVaxFilter] = useState(searchParams.get('vaccination_status') || '');
  const [ironFilter, setIronFilter] = useState(searchParams.get('collected') || '');
  const [smsStatusFilter, setSmsStatusFilter] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ results: [], total: 0, pages: 1, counts: {} });
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  const [smsModalItem, setSmsModalItem] = useState(null);
  const [smsTemplateType, setSmsTemplateType] = useState('general');
  const [smsLanguage, setSmsLanguage] = useState('en');
  const [smsSending, setSmsSending] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState(null);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && cat !== category) setCategory(cat.toUpperCase());
    const q = searchParams.get('q');
    if (q !== null && q !== query) setQuery(q);
    const urg = searchParams.get('urgency');
    if (urg) setUrgencyFilter(urg);
    const vax = searchParams.get('vaccination_status');
    if (vax) setVaxFilter(vax);
    const iron = searchParams.get('collected');
    if (iron !== null && iron !== '') setIronFilter(iron);
    const stat = searchParams.get('status');
    if (stat) setSmsStatusFilter(stat);
  }, [searchParams]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { category, q: query, page, limit };
      if (preset) params.preset = preset;
      if (urgencyFilter) params.urgency = urgencyFilter;
      if (vaxFilter) params.vaccination_status = vaxFilter;
      if (ironFilter !== '') params.collected = ironFilter;
      if (category === 'SMS' && smsStatusFilter) params.status = smsStatusFilter;

      const res = await getDataRetrieval(params);
      setData(res);
      if (res.category && res.category !== category) {
        setCategory(res.category);
      }
    } catch (err) {
      console.error('Failed to retrieve data:', err);
      setNotificationMsg({ type: 'error', text: 'Error retrieving data: ' + err.message });
    } finally {
      setLoading(false);
    }
  }, [category, query, preset, urgencyFilter, vaxFilter, ironFilter, smsStatusFilter, page, limit]);

  const handleRetrySmsItem = async (smsId) => {
    try {
      setRetryingId(smsId);
      const res = await retrySMS(smsId);
      setNotificationMsg({
        type: 'success',
        text: `SMS #${smsId} retried successfully (Status: ${res.sms?.status || 'Sent'})`
      });
      fetchData();
    } catch (err) {
      setNotificationMsg({
        type: 'error',
        text: `Retry failed: ${err.message || 'Unknown error'}`
      });
    } finally {
      setRetryingId(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setSelectedIds(new Set());
    fetchData();
  };

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    setPage(1);
    setPreset('');
    setUrgencyFilter('');
    setVaxFilter('');
    setIronFilter('');
    setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === data.results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.results.map(r => r.id)));
    }
  };

  const openSmsModal = (item) => {
    setSmsModalItem(item);
    setSmsLanguage(item.preferred_language || 'en');
    let tType = 'general';
    if (category === 'IRON_TABLETS' || item.iron_tablets_required) tType = 'iron_tablets';
    else if (category === 'CHILD' || item.vaccination_status === 'Pending') tType = 'vaccination';
    else if (item.followup_type) tType = item.followup_type;
    setSmsTemplateType(tType);
  };

  const handleSendSingleSMS = async () => {
    if (!smsModalItem) return;
    try {
      setSmsSending(true);
      const isFollowup = category === 'FOLLOW_UP' || smsModalItem.due_date;
      
      let res;
      if (isFollowup && smsModalItem.id && smsModalItem.followup_type) {
        res = await sendFollowupSMS(smsModalItem.id, {
          template_type: smsTemplateType,
          language: smsLanguage,
          phone_number: smsModalItem.phone_number
        });
      } else {
        res = await bulkGenerateSMS({
          items: [{
            member_id: smsModalItem.id,
            phone_number: smsModalItem.phone_number,
            recipient_name: smsModalItem.full_name || smsModalItem.beneficiary_name,
            template_type: smsTemplateType,
            language: smsLanguage,
            due_date: 'Scheduled date',
            reason: smsModalItem.notes || 'Health checkup'
          }]
        });
      }
      setSmsModalItem(null);
      setNotificationMsg({ 
        type: 'success', 
        text: res.message || 'SMS notification dispatched successfully!' 
      });
      fetchData();
    } catch (err) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to send SMS reminder' });
    } finally {
      setSmsSending(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (selectedIds.size === 0) return;
    try {
      setBulkSending(true);
      let res;
      if (category === 'FOLLOW_UP') {
        res = await bulkGenerateSMS({
          followup_ids: Array.from(selectedIds)
        });
      } else {
        res = await bulkGenerateSMS({
          member_ids: Array.from(selectedIds),
          template_type: category === 'IRON_TABLETS' ? 'iron_tablets' : (category === 'CHILD' ? 'vaccination' : 'general')
        });
      }

      setBulkModalOpen(false);
      setSelectedIds(new Set());
      setNotificationMsg({ 
        type: 'success', 
        text: `Bulk Generation Complete: ${res.sent_count} sent/queued, ${res.skipped_count} skipped (24h cooldown/opted out).` 
      });
      fetchData();
    } catch (err) {
      setNotificationMsg({ type: 'error', text: err.message || 'Bulk SMS generation failed' });
    } finally {
      setBulkSending(false);
    }
  };

  const handleExportCSV = () => {
    const params = { category, q: query };
    if (preset) params.preset = preset;
    if (urgencyFilter) params.urgency = urgencyFilter;
    if (vaxFilter) params.vaccination_status = vaxFilter;
    if (ironFilter !== '') params.collected = ironFilter;
    window.open(getExportDataUrl(params), '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Community Register & Data Retrieval
            </h1>
            <Badge variant="teal">Unified Database</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Query verified community records, trigger multilingual reminders & export audit-logged datasets across all 5 programme registers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            icon={RefreshCw}
            className={loading ? '[&_svg]:animate-spin' : ''}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCSV}
            icon={Download}
          >
            Export Filtered CSV
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {notificationMsg && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold animate-fade-in ${
          notificationMsg.type === 'error' 
            ? 'bg-rose-50 text-rose-800 border border-rose-200' 
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            <span>{notificationMsg.text}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Bar & Suggestions */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, household ID (e.g. H1024), village area, or natural queries like 'pregnant', 'iron tablets', 'overdue'..."
              className="w-full pl-11 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition"
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setPage(1); }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <Button type="submit" size="xs" variant="primary">
                Search
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3" /> Quick filters:
            </span>
            {[
              { label: 'Pregnant Women', q: 'pregnant' },
              { label: 'Iron Tablets Due', q: 'iron tablets' },
              { label: 'Overdue Visits', q: 'overdue' },
              { label: 'Children < 2', q: 'under 2' },
              { label: 'Seetha Kumar', q: 'Seetha' },
              { label: 'H1024', q: 'H1024' }
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => { setQuery(chip.q); setPage(1); }}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-600 rounded-lg transition border border-slate-200/80 cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-200/80">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = category === cat.id;
          const count = data.counts ? data.counts[cat.id] : undefined;

          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-white text-teal-900 shadow-xs border border-slate-200/90'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-700' : 'text-slate-400'}`} />
              <span>{cat.label}</span>
              {count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Category Specific Sub-Filters */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {category === 'PEOPLE' && PRESETS_PEOPLE.map((p) => (
            <button
              key={p.id}
              onClick={() => { setPreset(p.id); setPage(1); }}
              className={`px-3 py-1.2 text-xs rounded-lg transition font-bold cursor-pointer ${
                preset === p.id 
                  ? 'bg-teal-700 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}

          {category === 'FOLLOW_UP' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Urgency:</span>
              {['', 'due_today', 'overdue', 'upcoming', 'completed'].map((u) => (
                <button
                  key={u}
                  onClick={() => { setUrgencyFilter(u); setPage(1); }}
                  className={`px-3 py-1 text-xs rounded-lg transition font-bold cursor-pointer ${
                    urgencyFilter === u 
                      ? 'bg-teal-700 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {u === '' ? 'All' : u.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {category === 'IRON_TABLETS' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Distribution:</span>
              {[
                { val: '', label: 'All Requiring IFA' },
                { val: 'false', label: 'Pending Collection' },
                { val: 'true', label: 'Collected' }
              ].map((i) => (
                <button
                  key={i.val}
                  onClick={() => { setIronFilter(i.val); setPage(1); }}
                  className={`px-3 py-1 text-xs rounded-lg transition font-bold cursor-pointer ${
                    ironFilter === i.val 
                      ? 'bg-purple-700 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          )}

          {category === 'CHILD' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Vaccination:</span>
              {['', 'Pending', 'Partial', 'Complete'].map((v) => (
                <button
                  key={v}
                  onClick={() => { setVaxFilter(v); setPage(1); }}
                  className={`px-3 py-1 text-xs rounded-lg transition font-bold cursor-pointer ${
                    vaxFilter === v 
                      ? 'bg-blue-700 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {v === '' ? 'All Children' : v}
                </button>
              ))}
            </div>
          )}

          {category === 'SMS' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Status:</span>
              {[
                { val: '', label: 'All Messages' },
                { val: 'PENDING', label: 'Pending' },
                { val: 'GENERATED', label: 'Generated' },
                { val: 'SENT', label: 'Sent' },
                { val: 'DELIVERED', label: 'Delivered' },
                { val: 'FAILED', label: 'Failed' },
                { val: 'CANCELLED', label: 'Cancelled' }
              ].map((s) => (
                <button
                  key={s.val}
                  onClick={() => { setSmsStatusFilter(s.val); setPage(1); }}
                  className={`px-2.5 py-1 text-xs rounded-lg transition font-bold cursor-pointer ${
                    smsStatusFilter === s.val 
                      ? 'bg-teal-700 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Showing {data.results.length} of {data.total} total records
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-4 z-20 bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-slide-up border border-slate-700">
          <div className="flex items-center gap-3">
            <span className="bg-teal-500 px-2.5 py-0.5 rounded-full text-xs font-black text-slate-950">
              {selectedIds.size} Selected
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-200">
              Ready for batch reminder dispatch
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              Deselect
            </button>
            <Button
              variant="primary"
              size="xs"
              onClick={() => setBulkModalOpen(true)}
              icon={Send}
            >
              Send Reminders ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Results Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-teal-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Querying unified health register...</p>
          </div>
        ) : data.results.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No matching records found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your query, switching categories, or clearing active filters to broaden your search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold tracking-wider border-b border-slate-200">
                {category === 'SMS' ? (
                  <tr>
                    <th className="p-3.5 sm:p-4">Recipient</th>
                    <th className="p-3.5 sm:p-4">Phone (Masked)</th>
                    <th className="p-3.5 sm:p-4 max-w-xs">Message Content</th>
                    <th className="p-3.5 sm:p-4">Type & Lang</th>
                    <th className="p-3.5 sm:p-4">Status & Provider</th>
                    <th className="p-3.5 sm:p-4">Dispatched / Created</th>
                    <th className="p-3.5 sm:p-4 text-right">Action</th>
                  </tr>
                ) : (
                  <tr>
                    {category !== 'HOUSEHOLDS' && (
                      <th className="p-3.5 sm:p-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === data.results.length && data.results.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded text-teal-600 focus:ring-teal-600 h-4 w-4 accent-teal-600 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="p-3.5 sm:p-4">Beneficiary / Code</th>
                    <th className="p-3.5 sm:p-4">Demographics</th>
                    <th className="p-3.5 sm:p-4">Location</th>
                    <th className="p-3.5 sm:p-4">Phone & Privacy</th>
                    <th className="p-3.5 sm:p-4">Programme Status</th>
                    <th className="p-3.5 sm:p-4 text-right">Actions</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.results.map((row) => {
                  const isSelected = selectedIds.has(row.id);

                  if (category === 'SMS') {
                    const isMock = row.provider === 'mock' || row.simulated_flag;
                    const st = (row.status || '').toLowerCase();
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5 sm:p-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                            <span>{row.recipient_name || 'Beneficiary'}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {row.household_id ? `HH: ${row.household_id}` : `ID: #${row.id}`}
                          </div>
                        </td>

                        <td className="p-3.5 sm:p-4 font-mono text-slate-700">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{row.recipient_phone}</span>
                          </div>
                          <Badge variant="success" size="sm" className="mt-1">
                            PROTECTED
                          </Badge>
                        </td>

                        <td className="p-3.5 sm:p-4 max-w-xs">
                          <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 leading-relaxed font-sans">
                            "{row.message_body}"
                          </div>
                          {row.failure_reason && (
                            <div className="text-[11px] text-rose-600 mt-1.5 flex items-center gap-1 font-semibold">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Error: {row.failure_reason}</span>
                            </div>
                          )}
                        </td>

                        <td className="p-3.5 sm:p-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="uppercase text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                              {row.reminder_type || row.template_type || 'GENERAL'}
                            </span>
                            <span className="uppercase text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                              {row.language === 'te' ? 'TELUGU' : row.language === 'hi' ? 'HINDI' : 'ENGLISH'}
                            </span>
                          </div>
                        </td>

                        <td className="p-3.5 sm:p-4">
                          <div className="flex flex-col gap-1 items-start">
                            <Badge 
                              variant={
                                st === 'delivered' ? 'success' :
                                st === 'sent' ? 'teal' :
                                st === 'failed' ? 'danger' :
                                st === 'cancelled' ? 'neutral' : 'warning'
                              }
                              size="sm"
                              dot={true}
                            >
                              {row.status}
                            </Badge>
                            {isMock ? (
                              <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono">
                                MOCK SIMULATION
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-mono">
                                TWILIO LIVE
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 sm:p-4 text-slate-500 whitespace-nowrap text-[11px]">
                          {row.sent_at ? new Date(row.sent_at).toLocaleString() : (row.created_at ? new Date(row.created_at).toLocaleString() : 'N/A')}
                        </td>

                        <td className="p-3.5 sm:p-4 text-right">
                          {st === 'failed' ? (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleRetrySmsItem(row.id)}
                              disabled={retryingId === row.id}
                              icon={RefreshCw}
                              className={retryingId === row.id ? '[&_svg]:animate-spin' : ''}
                            >
                              Retry
                            </Button>
                          ) : (
                            <span className="text-xs font-mono text-slate-400">#{row.id}</span>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  if (category === 'HOUSEHOLDS') {
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5 sm:p-4 font-semibold text-slate-800" colSpan={2}>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span className="font-bold text-slate-900">{row.household_id}</span>
                            <span className="text-xs text-slate-500">— Head: {row.head_of_family || row.head_of_household}</span>
                          </div>
                        </td>
                        <td className="p-3.5 sm:p-4 text-slate-600">
                          {row.village_area}
                        </td>
                        <td className="p-3.5 sm:p-4">
                          <span className="font-bold text-slate-700">{row.total_members} members</span>
                        </td>
                        <td className="p-3.5 sm:p-4">
                          {row.vulnerable_status ? (
                            <Badge variant="danger" size="sm">Vulnerable</Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">Standard Register</Badge>
                          )}
                        </td>
                        <td className="p-3.5 sm:p-4 text-right">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => navigate(`/households/${row.household_id}/history`)}
                          >
                            View History →
                          </Button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={row.id} className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-teal-50/30' : ''}`}>
                      <td className="p-3.5 sm:p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(row.id)}
                          className="rounded text-teal-600 focus:ring-teal-600 h-4 w-4 accent-teal-600 cursor-pointer"
                        />
                      </td>

                      <td className="p-3.5 sm:p-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {row.full_name || row.beneficiary_name}
                          {row.preferred_language && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded uppercase font-bold">
                              {row.preferred_language}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {row.member_code || `HH: ${row.household_id}`}
                        </div>
                      </td>

                      <td className="p-3.5 sm:p-4 text-slate-600">
                        {row.age !== undefined && <span>{row.age} yrs • {row.gender}</span>}
                        {row.relationship && <div className="text-slate-400">{row.relationship}</div>}
                        {row.due_date && <div className="text-teal-700 font-bold">Due: {row.due_date}</div>}
                      </td>

                      <td className="p-3.5 sm:p-4 text-slate-600">
                        <div className="font-bold text-slate-800">{row.household_id}</div>
                        <div className="text-slate-400">{row.village_area || 'Main Catchment'}</div>
                      </td>

                      <td className="p-3.5 sm:p-4">
                        <div className="flex items-center gap-1.5 font-mono text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{row.phone_number || 'No phone'}</span>
                        </div>
                        <Badge variant="success" size="sm" className="mt-1">
                          Privacy Masked
                        </Badge>
                      </td>

                      <td className="p-3.5 sm:p-4">
                        <div className="flex flex-wrap gap-1">
                          {row.is_pregnant && (
                            <Badge variant="warning" size="sm">
                              Pregnant {row.pregnancy_details || ''}
                            </Badge>
                          )}
                          {row.iron_tablets_required && (
                            <Badge 
                              variant={row.iron_tablets_collected ? 'success' : 'info'} 
                              size="sm"
                            >
                              IFA: {row.iron_tablets_collected ? 'Collected' : 'Pending'}
                            </Badge>
                          )}
                          {row.vaccination_status && (
                            <Badge 
                              variant={row.vaccination_status === 'Complete' ? 'success' : 'warning'} 
                              size="sm"
                            >
                              Vax: {row.vaccination_status}
                            </Badge>
                          )}
                          {row.urgency && (
                            <Badge 
                              variant={
                                row.urgency === 'overdue' ? 'danger' :
                                row.urgency === 'due_today' ? 'warning' :
                                row.urgency === 'completed' ? 'success' : 'info'
                              }
                              size="sm"
                            >
                              {row.urgency.replace('_', ' ').toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 sm:p-4 text-right">
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => openSmsModal(row)}
                          icon={Send}
                        >
                          Reminder
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {data.pages > 1 && (
          <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div className="font-medium">
              Page <span className="font-bold text-slate-800">{data.page}</span> of <span className="font-bold text-slate-800">{data.pages}</span> ({data.total} total items)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.pages}
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Individual SMS Preview Modal */}
      {smsModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200/60">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Dispatch SMS Reminder</h3>
                  <p className="text-xs text-slate-500">Recipient: {smsModalItem.full_name || smsModalItem.beneficiary_name}</p>
                </div>
              </div>
              <button onClick={() => setSmsModalItem(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Language:</label>
                  <select
                    value={smsLanguage}
                    onChange={(e) => setSmsLanguage(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white text-xs font-medium focus:ring-2 focus:ring-teal-600/20"
                  >
                    <option value="en">English (English)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Template Type:</label>
                  <select
                    value={smsTemplateType}
                    onChange={(e) => setSmsTemplateType(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 bg-white text-xs font-medium focus:ring-2 focus:ring-teal-600/20"
                  >
                    <option value="iron_tablets">Iron Tablets (IFA)</option>
                    <option value="vaccination">Vaccination Due</option>
                    <option value="medication">Medication & Vitals</option>
                    <option value="general">General Follow-up</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Recipient Mobile (Protected):</label>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-mono flex items-center justify-between">
                  <span>{smsModalItem.phone_number || 'No phone number linked'}</span>
                  <Badge variant="success" size="sm">PRIVACY PROTECTED</Badge>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Live Message Preview:</label>
                <div className="p-3.5 bg-teal-50/50 border border-teal-200/80 rounded-2xl text-slate-800 text-xs leading-relaxed font-sans">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-800">
                      Standard Health Notification
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">GSM 7-bit</span>
                  </div>
                  {smsTemplateType === 'iron_tablets' && (
                    smsLanguage === 'te' 
                      ? `నమస్కారం ${smsModalItem.full_name || smsModalItem.beneficiary_name}, మీ ఆశా కార్యకర్త నుండి రిమైండర్. మీ నెలవారీ ఐరన్ ఫోలిక్ యాసిడ్ మాత్రలు తీసుకోవడానికి సిద్ధంగా ఉన్నాయి.`
                      : smsLanguage === 'hi'
                      ? `नमस्ते ${smsModalItem.full_name || smsModalItem.beneficiary_name}, आपकी आशा कार्यकर्ता की ओर से सूचना। आपकी मासिक आयरन की गोलियां उपलब्ध हैं।`
                      : `Namaste ${smsModalItem.full_name || smsModalItem.beneficiary_name}, this is a reminder from your ASHA worker. Your monthly iron folic acid tablets are ready for collection.`
                  )}
                  {smsTemplateType === 'vaccination' && (
                    smsLanguage === 'te' 
                      ? `నమస్కారం ${smsModalItem.full_name || smsModalItem.beneficiary_name}, మీ ఆశా కార్యకర్త నుండి రిమైండర్. టీకా గడువు తేదీ సమీపంలో ఉంది. దయచేసి ఆరోగ్య కేంద్రానికి వెళ్ళండి.`
                      : smsLanguage === 'hi'
                      ? `नमस्ते ${smsModalItem.full_name || smsModalItem.beneficiary_name}, आपकी आशा कार्यकर्ता की ओर से सूचना। टीकाकरण की देय तिथि आ गई है। कृपया केंद्र पर आएं।`
                      : `Namaste ${smsModalItem.full_name || smsModalItem.beneficiary_name}, this is a reminder from your ASHA worker. Scheduled vaccination is due. Please visit the health centre.`
                  )}
                  {smsTemplateType !== 'iron_tablets' && smsTemplateType !== 'vaccination' && (
                    `Namaste ${smsModalItem.full_name || smsModalItem.beneficiary_name}, this is a health follow-up reminder from your ASHA worker.`
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                * Note: Cooldown logic prevents generating duplicate messages to the same mobile number within 24 hours.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSmsModalItem(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSendSingleSMS}
                disabled={smsSending || !smsModalItem.phone_number}
                loading={smsSending}
                icon={Send}
              >
                Confirm & Dispatch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk SMS Confirmation Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Batch SMS Dispatch</h3>
                <p className="text-xs text-slate-500">Automated Patient Outreach</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2 text-slate-600">
              <p className="font-bold text-slate-800">
                You are about to dispatch reminders to <span className="text-teal-700 font-black">{selectedIds.size} recipient(s)</span>.
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Rendered in each beneficiary's preferred language (English / Telugu / Hindi).</li>
                <li>Real-time eligibility & cooldown validation applied per number.</li>
                <li>Audit logged in central event repository.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBulkModalOpen(false)}
                disabled={bulkSending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleBulkGenerate}
                disabled={bulkSending}
                loading={bulkSending}
                icon={Check}
              >
                Dispatch Reminders ({selectedIds.size})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
