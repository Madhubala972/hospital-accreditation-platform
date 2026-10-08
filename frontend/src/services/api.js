import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hospital_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const systemApi = {
  getStatus: () => api.get('/system/status'),
};

export const dashboardApi = {
  getSummary: (department) => api.get('/dashboard/summary', { params: { department } }),
};

export const evidenceApi = {
  getEvidence: (params) => api.get('/evidence', { params }),
  getIntegrity: (department) => api.get('/evidence/integrity', { params: { department } }),
  getById: (id) => api.get(`/evidence/${id}`),
  verifyById: (id) => api.get(`/evidence/${id}/verify`),
  getHistory: (id) => api.get(`/evidence/${id}/history`),
  createEvidence: (data) => api.post('/evidence', data),
  manualVerify: (id, data) => api.post(`/evidence/${id}/manual-verify`, data),
};

export const metricsApi = {
  getMetrics: (department, limit = 50) => api.get('/metrics', { params: { department, limit } }),
  createMetric: (data) => api.post('/metrics', data),
};

export const pathwaysApi = {
  getPathways: (department) => api.get('/pathways', { params: { department } }),
  createTrace: (data) => api.post('/pathways/traces', data),
  getProcessMining: (department) => api.get('/pathways/mining', { params: { department } }),
  getConformance: (department) => api.get('/pathways/conformance', { params: { department } }),
};

export const complianceApi = {
  getEvaluation: (department) => api.get('/compliance', { params: { department } }),
  getStandards: (department) => api.get('/compliance/standards', { params: { department } }),
  createStandard: (data) => api.post('/compliance/standards', data),
};

export const riskApi = {
  getScores: (department) => api.get('/risk', { params: { department } }),
  evaluate: (department) => api.post('/risk/evaluate', { department }),
};

export const alertsApi = {
  getAlerts: (department, status, severity) => api.get('/alerts', { params: { department, status, severity } }),
  updateStatus: (id, status) => api.patch(`/alerts/${id}/status`, { status }),
};

export const capaApi = {
  getKanban: (department) => api.get('/capa/kanban', { params: { department } }),
  getAll: (department, status) => api.get('/capa', { params: { department, status } }),
  create: (data) => api.post('/capa', data),
  updateStatus: (id, status, payload) => api.patch(`/capa/${id}`, { status, ...payload }),
};

export const simulationApi = {
  runDigitalTwin: (params) => api.post('/simulation', params),
  runCounterfactual: (data) => api.post('/counterfactual', data),
};

export const benchmarksApi = {
  getBenchmarks: (department) => api.get('/benchmarks', { params: { department } }),
};

export const reportsApi = {
  getExecutiveReport: (department, date) => api.get('/reports/executive-summary', { params: { department, date } }),
  getAvailableDates: () => api.get('/reports/dates'),
  getDailyArchive: () => api.get('/reports/daily-archive'),
};

export const copilotApi = {
  ask: (department, question) => api.post('/copilot', { department, question }),
};

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  getPendingUsers: () => api.get('/auth/pending'),
  getAllUsers: () => api.get('/auth/users'),
  approveUser: (id) => api.post(`/auth/approve/${id}`),
  rejectUser: (id) => api.post(`/auth/reject/${id}`),
  getStaffAudits: (params) => api.get('/dean/staff-audits', { params }),
};

export const deanApi = {
  getPendingUsers: () => api.get('/auth/pending'),
  getAllUsers: () => api.get('/auth/users'),
  approveUser: (id) => api.post(`/auth/approve/${id}`),
  rejectUser: (id) => api.post(`/auth/reject/${id}`),
  getStaffAudits: (params) => api.get('/dean/staff-audits', { params }),
};

export default api;
