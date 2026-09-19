const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function request(endpoint, options = {}) {
  const url = API_BASE + endpoint;
  const token = localStorage.getItem('asha_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || data.error || data.details?.join?.(', ') || ('Request failed with status ' + res.status));
    }
    return data;
  } catch (err) {
    console.error('API Error on ' + endpoint + ':', err);
    throw err;
  }
}

// Auth
export const login = (username, password) => 
  request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
export const getCurrentUser = () => request('/auth/me');
export const logoutUser = () => request('/auth/logout', { method: 'POST' });

// Dashboard & Households
export const getDashboardSummary = () => request('/dashboard');
export const getHouseholds = () => request('/households');
export const getHousehold = (id) => request('/households/' + id);
export const getHouseholdHistory = (id) => request('/households/' + id + '/history');
export const createHousehold = (data) => 
  request('/households', { method: 'POST', body: JSON.stringify(data) });

// Household Members CRUD
export const getHouseholdMembers = (id) => request('/households/' + id + '/members');
export const addHouseholdMember = (id, memberData) => 
  request('/households/' + id + '/members', { method: 'POST', body: JSON.stringify(memberData) });
export const updateHouseholdMember = (memberId, memberData) => 
  request('/households/members/' + memberId, { method: 'PUT', body: JSON.stringify(memberData) });
export const deleteHouseholdMember = (memberId) => 
  request('/households/members/' + memberId, { method: 'DELETE' });

// Encounters & Reports
export const getEncounters = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request('/encounters' + (query ? '?' + query : ''));
};
export const getEncounter = (id) => request('/encounters/' + id);
export const createEncounter = (data) => 
  request('/encounters', { method: 'POST', body: JSON.stringify(data) });
export const processEncounter = (id) => 
  request('/encounters/' + id + '/process', { method: 'POST' });
export const getEncounterReports = (id) => request('/encounters/' + id + '/reports');
export const getEncounterOutputs = (id) => request('/encounters/' + id + '/outputs');

// Voice
export const parseVoiceTranscript = (transcript, lang = 'en') => 
  request('/voice/parse', { method: 'POST', body: JSON.stringify({ transcript, lang }) });

// Followups & Notifications
export const getFollowups = (params = {}) => {
  const query = typeof params === 'string' ? `status=${params}` : new URLSearchParams(params).toString();
  return request('/followups' + (query ? '?' + query : ''));
};
export const getNotifications = () => 
  request('/followups/notifications');
export const createFollowup = (data) => 
  request('/followups', { method: 'POST', body: JSON.stringify(data) });
export const updateFollowup = (id, data) => 
  request('/followups/' + id, { method: 'PATCH', body: JSON.stringify(data) });
export const sendFollowupSMS = (id, payload = {}) => 
  request('/followups/' + id + '/send-sms', { method: 'POST', body: JSON.stringify(payload) });

// Global Data Retrieval & Smart Search
export const getDataRetrieval = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request('/retrieval' + (query ? '?' + query : ''));
};
export const getExportDataUrl = (params = {}) => {
  const token = localStorage.getItem('asha_token');
  const cleanParams = { ...params, format: 'csv' };
  const query = new URLSearchParams(cleanParams).toString();
  return API_BASE + '/retrieval?' + query;
};

// SMS System
export const getSMSList = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request('/sms' + (query ? '?' + query : ''));
};
export const getSMSDetails = (id) => request(`/sms/${id}`);
export const generateSMS = (payload) => 
  request('/sms/generate', { method: 'POST', body: JSON.stringify(payload) });
export const sendSMS = (id, payload = {}) => 
  request(`/sms/${id}/send`, { method: 'POST', body: JSON.stringify(payload) });
export const cancelSMS = (id, reason = 'Cancelled by user') => 
  request(`/sms/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
export const retrySMS = (id) => 
  request(`/sms/${id}/retry`, { method: 'POST' });
export const getSMSStats = () => request('/sms/stats');
export const getSMSHistory = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request('/sms/history' + (query ? '?' + query : ''));
};
export const bulkGenerateSMS = (payload) => {
  const body = Array.isArray(payload) ? { items: payload } : payload;
  return request('/sms/bulk-generate', { method: 'POST', body: JSON.stringify(body) });
};

// Analytics
export const getAnalytics = () => request('/analytics');

// Offline Sync
export const syncOfflineEncounters = (encounters) => 
  request('/sync', { method: 'POST', body: JSON.stringify({ encounters }) });

// Admin Endpoints
export const getAdminHistory = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request('/admin/history' + (query ? '?' + query : ''));
};
export const getAdminOperations = () => request('/admin/operations');
export const getAdminSafetyGovernance = () => request('/admin/safety-governance');
export const getAdminAuditLogs = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return request('/admin/audit-logs' + (query ? '?' + query : ''));
};

// System Maintenance / Reset
export const getDemoScenarios = () => request('/demo/scenarios');
export const loadDemoScenario = (scenario_id) => 
  request('/demo/load-scenario', { method: 'POST', body: JSON.stringify({ scenario_id }) });
export const resetDemoData = () => 
  request('/demo/reset', { method: 'POST' });

