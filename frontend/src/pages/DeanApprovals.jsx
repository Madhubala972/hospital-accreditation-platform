import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { authApi, deanApi } from '../services/api';
import {
  ShieldCheck,
  Clock,
  UserCheck,
  UserX,
  Building2,
  Stethoscope,
  HeartPulse,
  Award,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  Lock,
  UserPlus,
  Activity,
  LogIn,
  LogOut,
  FileSpreadsheet,
  Network,
  Calendar
} from 'lucide-react';

export default function DeanApprovals() {
  const { user, refreshPendingCount } = useAuth();
  const { showNotification } = useApp();

  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStats, setAuditStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all' | 'audits'
  const [searchQuery, setSearchQuery] = useState('');
  const [auditFilterEvent, setAuditFilterEvent] = useState('');
  const [auditFilterRole, setAuditFilterRole] = useState('');

  const isDeanOrAdmin = user?.role === 'Dean' || user?.role === 'Admin';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pendingRes, allRes] = await Promise.all([
        authApi.getPendingUsers(),
        authApi.getAllUsers()
      ]);
      setPendingUsers(pendingRes.data.data || []);
      setAllUsers(allRes.data.data || []);
      refreshPendingCount();
    } catch (err) {
      console.error('Failed to fetch Dean approval data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditsLoading(true);
      const res = await deanApi.getStaffAudits({
        eventType: auditFilterEvent || undefined,
        role: auditFilterRole || undefined
      });
      setAuditLogs(res.data.data || []);
      setAuditStats(res.data.stats || null);
    } catch (err) {
      console.error('Failed to fetch staff audits:', err);
      showNotification('Failed to retrieve staff audit records.', 'error');
    } finally {
      setAuditsLoading(false);
    }
  };

  useEffect(() => {
    if (isDeanOrAdmin) {
      fetchData();
      fetchAuditLogs();
    }
  }, [user, auditFilterEvent, auditFilterRole]);

  const handleApprove = async (userId, userName, userRole) => {
    try {
      setActionLoading(userId);
      const res = await authApi.approveUser(userId);
      showNotification(`✅ ${userName} (${userRole}) approved! They can now sign in normally.`, 'success');
      await fetchData();
    } catch (err) {
      showNotification(err.response?.data?.message || err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId, userName) => {
    try {
      setActionLoading(userId);
      await authApi.rejectUser(userId);
      showNotification(`Registration for ${userName} has been declined.`, 'info');
      await fetchData();
    } catch (err) {
      showNotification(err.response?.data?.message || err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isDeanOrAdmin) {
    return (
      <div className="bg-white border border-rose-200 shadow-md rounded-3xl p-12 text-center space-y-4 max-w-2xl mx-auto my-12">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Dean Executive Access Restricted</h2>
        <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
          The Staff Registration & Clinical Credential Approval Portal is restricted strictly to <strong>Dean Dr. Arthur Vance</strong>.
        </p>
        <div className="pt-2 text-xs text-blue-600 font-mono font-semibold">
          Current Logged In Role: {user?.role || 'Guest'}
        </div>
      </div>
    );
  }

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Dean Executive Header */}
      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Dean Executive Approvals Portal</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                    DEAN'S OFFICE GOVERNANCE
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authorize or decline pending doctor, nurse, and auditor clinical registrations.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-semibold border border-slate-200 hover:border-blue-200 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh Registrations</span>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-slate-100 text-xs">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 border ${
              activeTab === 'pending'
                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Pending Approvals ({pendingUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 border ${
              activeTab === 'all'
                ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>All Registered Staff ({allUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audits')}
            className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 border ${
              activeTab === 'audits'
                ? 'bg-purple-50 text-purple-700 border-purple-300 shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4 text-purple-600" />
            <span>Staff Sign-In/Out & Work Audits</span>
            <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-mono font-bold">
              DEAN EXCLUSIVE
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: PENDING APPROVALS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingUsers.length === 0 ? (
            <div className="p-12 text-center bg-white border border-sky-100 rounded-2xl shadow-sm space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">All Clear! No Pending Registrations</h3>
              <p className="text-xs text-slate-500">
                All clinical doctors and nurses have been reviewed and approved by the Dean.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingUsers.map((u) => (
                <div
                  key={u._id}
                  className="bg-white border border-amber-200 rounded-2xl p-5 space-y-4 shadow-sm relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> WAITING DEAN APPROVAL
                        </span>
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold">
                          {u.employeeId || 'NO-ID'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{u.name}</h3>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-right">
                      <div className="text-[10px] text-slate-500">Requested Role</div>
                      <div className="font-bold text-blue-700 text-xs mt-0.5">{u.role}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Department</span>
                      <strong className="text-slate-800">{u.department}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Registered On</span>
                      <strong className="text-slate-800">{new Date(u.createdAt).toLocaleDateString()}</strong>
                    </div>
                  </div>

                  {u.registrationNotes && (
                    <div className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 font-semibold">Notes: </span>
                      <span>{u.registrationNotes}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleApprove(u._id, u.name, u.role)}
                      disabled={actionLoading === u._id}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{actionLoading === u._id ? 'Approving...' : 'Approve Clinical Access'}</span>
                    </button>

                    <button
                      onClick={() => handleReject(u._id, u.name)}
                      disabled={actionLoading === u._id}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 transition flex items-center justify-center gap-1.5"
                    >
                      <UserX className="w-4 h-4" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL REGISTERED STAFF DIRECTORY */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-sky-100 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search staff by name, email, department, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
            </div>
            <span className="text-xs text-slate-500 font-mono font-semibold">
              Showing {filteredUsers.length} of {allUsers.length} Staff
            </span>
          </div>

          <div className="bg-white border border-sky-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Staff Member</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Approved By</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-blue-50/40 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                      </td>
                      <td className="p-3.5 font-semibold text-blue-700">{u.role}</td>
                      <td className="p-3.5 text-slate-700 font-medium">{u.department}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.approvalStatus === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : u.approvalStatus === 'WAITING_APPROVAL'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {u.approvalStatus}
                        </span>
                      </td>
                      <td className="p-3.5 text-[11px] text-slate-500">
                        {u.approvedBy || (u.approvalStatus === 'WAITING_APPROVAL' ? 'Pending Dean' : 'System')}
                      </td>
                      <td className="p-3.5 text-right">
                        {u.approvalStatus === 'WAITING_APPROVAL' && (
                          <button
                            onClick={() => handleApprove(u._id, u.name, u.role)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                          >
                            Approve
                          </button>
                        )}
                        {u.approvalStatus === 'APPROVED' && (
                          <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">Active Staff</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: STAFF SIGN-IN/OUT & CLINICAL WORK AUDITS (DEAN ONLY) */}
      {activeTab === 'audits' && (
        <div className="space-y-6">
          {/* Executive KPI Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-sky-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Total Audited Events</span>
                <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono">
                {auditStats?.totalAudits ?? auditLogs.length}
              </div>
              <div className="text-[10px] text-purple-600 font-semibold mt-1">Immutable Dean Log</div>
            </div>

            <div className="bg-white border border-sky-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Today's Staff Sign-Ins</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <LogIn className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono">
                {auditStats?.todaySignIns ?? 0}
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-1">Authenticated Sessions</div>
            </div>

            <div className="bg-white border border-sky-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Today's Clinical Actions</span>
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono">
                {auditStats?.todayWorkActions ?? 0}
              </div>
              <div className="text-[10px] text-blue-600 font-semibold mt-1">Metrics, CAPA & Trace Entries</div>
            </div>

            <div className="bg-white border border-sky-100 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">Active Staff Today</span>
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                  <Stethoscope className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 font-mono">
                {auditStats?.activeStaffSessions?.length ?? 0}
              </div>
              <div className="text-[10px] text-amber-600 font-semibold mt-1">Distinct Active Clinicians</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>Filter Audits:</span>
              </div>

              {/* Event Type Filter */}
              <select
                value={auditFilterEvent}
                onChange={(e) => setAuditFilterEvent(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-medium"
              >
                <option value="">All Event Types</option>
                <option value="SIGN_IN">Sign-In (Log In)</option>
                <option value="SIGN_OUT">Sign-Out (Log Out)</option>
                <option value="METRIC_SUBMISSION">Metric Submission</option>
                <option value="CLINICAL_TRACE_LOG">Clinical Trace Log</option>
                <option value="CAPA_ADVANCE">CAPA Action</option>
                <option value="RISK_EVALUATION">Risk Evaluation</option>
                <option value="DEAN_APPROVAL_ACTION">Dean Governance Action</option>
              </select>

              {/* Role Filter */}
              <select
                value={auditFilterRole}
                onChange={(e) => setAuditFilterRole(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:border-blue-500 text-xs font-medium"
              >
                <option value="">All Staff Roles</option>
                <option value="Doctor">Doctor</option>
                <option value="Nurse">Nurse</option>
                <option value="Quality_Manager">Quality Manager</option>
                <option value="Auditor">Auditor</option>
                <option value="Dean">Dean</option>
              </select>
            </div>

            <button
              onClick={fetchAuditLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl font-semibold border border-slate-200 hover:border-blue-200 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auditsLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span>Refresh Log</span>
            </button>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white border border-sky-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Dean Executive Staff Activity & Clinical Work Audit Trail
                </h3>
              </div>
              <span className="text-[11px] text-purple-700 font-mono bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 font-semibold">
                STRICTLY DEAN ACCESS ONLY
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Clock className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-xs">No audit logs matching current filter criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Staff Member</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Event Type</th>
                      <th className="p-3.5">Activity & Clinical Details</th>
                      <th className="p-3.5">Department</th>
                      <th className="p-3.5">Terminal / IP</th>
                      <th className="p-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => {
                      let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                      if (log.eventType === 'SIGN_IN') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      else if (log.eventType === 'SIGN_OUT') badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
                      else if (log.eventType === 'METRIC_SUBMISSION') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                      else if (log.eventType === 'CLINICAL_TRACE_LOG') badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
                      else if (log.eventType === 'CAPA_ADVANCE') badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                      else if (log.eventType === 'RISK_EVALUATION') badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                      else if (log.eventType === 'DEAN_APPROVAL_ACTION') badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';

                      return (
                        <tr key={log._id || log.timestamp} className="hover:bg-blue-50/40 transition">
                          <td className="p-3.5 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{log.userName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{log.userEmail}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold text-slate-700">{log.userRole}</span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                              {log.eventType}
                            </span>
                          </td>
                          <td className="p-3.5 max-w-xs">
                            <div className="font-semibold text-slate-800">{log.actionTitle}</div>
                            <div className="text-[11px] text-slate-500 truncate" title={log.actionDetails}>
                              {log.actionDetails}
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-700 whitespace-nowrap font-medium">{log.department}</td>
                          <td className="p-3.5 text-[11px] text-slate-500 font-mono whitespace-nowrap">
                            {log.ipAddress || '127.0.0.1 (Intranet)'}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {log.status || 'SUCCESS'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
