import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { alertsApi, capaApi, evidenceApi } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import { EmptyState, ErrorState } from '../components/common/StateViews';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Plus,
  ArrowRight,
  Clock,
  Building,
  Sparkles,
  RefreshCw,
  X,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Hash
} from 'lucide-react';

export default function AlertsAnomalies() {
  const { selectedDepartment, refreshKey, notify } = useApp();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Convert to CAPA modal
  const [capaModalAlert, setCapaModalAlert] = useState(null);
  const [capaForm, setCapaForm] = useState({
    action: '',
    responsiblePerson: '',
    deadline: '',
    priority: 'HIGH',
    predictedImpact: 30.0
  });

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await alertsApi.getAlerts(
        selectedDepartment,
        statusFilter === 'ALL' ? undefined : statusFilter,
        severityFilter === 'ALL' ? undefined : severityFilter
      );
      setAlerts(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [selectedDepartment, severityFilter, statusFilter, refreshKey]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await alertsApi.updateStatus(id, newStatus);
      notify(`Alert marked as ${newStatus}.`, 'info');
      fetchAlerts();
    } catch (err) {
      notify(`Failed to update status: ${err.message}`, 'error');
    }
  };

  const handleOpenCapaModal = (alert) => {
    setCapaModalAlert(alert);
    setCapaForm({
      action: alert.recommendedCapa || `Investigate root cause and implement protocol gate for ${alert.reason}`,
      responsiblePerson: 'Elena Rostova (Lead Quality Auditor)',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      priority: alert.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      predictedImpact: 30.0
    });
  };

  const handleCreateCapaFromAlert = async (e) => {
    e.preventDefault();
    try {
      await capaApi.create({
        problem: capaModalAlert.reason,
        department: capaModalAlert.department,
        action: capaForm.action,
        responsiblePerson: capaForm.responsiblePerson,
        deadline: capaForm.deadline,
        alertId: capaModalAlert._id,
        standardCode: capaModalAlert.standardCode,
        priority: capaForm.priority,
        predictedImpact: Number(capaForm.predictedImpact) || 30.0
      });
      notify('Alert successfully converted to CAPA plan with simulation tracking!', 'success');
      setCapaModalAlert(null);
      fetchAlerts();
    } catch (err) {
      notify(`Failed to create CAPA: ${err.message}`, 'error');
    }
  };

  if (error) {
    return <ErrorState error={error} onRetry={fetchAlerts} />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Evidence-Backed Quality Alerts & Signals</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Operational risk violations, evidence integrity alerts, and statistical anomalies linked to accreditation standards.
                </p>
              </div>
            </div>
          </div>

          {/* Severity Filters */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  severityFilter === sev
                    ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <EmptyState title="No Active Alerts" message="No quality alerts found for the selected department and filters." />
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert._id}
              className={`p-5 rounded-2xl border transition space-y-3.5 shadow-sm ${
                alert.severity === 'CRITICAL'
                  ? 'bg-rose-50/40 border-rose-200'
                  : alert.severity === 'HIGH'
                  ? 'bg-amber-50/40 border-amber-200'
                  : 'bg-white border-sky-100'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <StatusBadge status={alert.severity} />
                  <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {alert.department}
                  </span>
                  {alert.standardCode && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {alert.standardCode}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(alert.createdAt).toLocaleString()}
                  </span>
                  <StatusBadge status={alert.status} />
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                <strong className="text-slate-900">Reason: </strong> {alert.reason}
              </p>

              {/* Multi-Vector Alert Cards: Values, Standard, Risk Contribution, Recommended CAPA (Section 11 in PDF) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 bg-white p-3 rounded-xl border border-slate-200/80 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Standard Target</div>
                  <div className="font-bold text-blue-700 mt-0.5 font-mono">{alert.standardCode || 'NABH-COP.6'}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Risk Contribution</div>
                  <div className="font-black text-rose-600 mt-0.5">+{alert.riskContribution || 18} Points</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Evidence Count & Status</div>
                  <div className="flex items-center gap-1 font-bold text-emerald-700 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{alert.evidenceCount || 1} Verified Blocks</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/60">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Recommended CAPA</div>
                  <div className="font-semibold text-slate-800 truncate mt-0.5" title={alert.recommendedCapa}>
                    {alert.recommendedCapa || 'Conduct nursing protocol refresher'}
                  </div>
                </div>
              </div>

              {/* Evidence list */}
              {alert.evidence && alert.evidence.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Cryptographic Evidence Trail:</div>
                  {alert.evidence.map((ev, idx) => (
                    <div key={idx} className="text-[11px] text-slate-700 flex items-start gap-1.5 font-medium">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions toolbar */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-500">
                    Source: <span className="font-mono font-semibold text-slate-700">{alert.source}</span>
                  </span>
                  <Link
                    to="/evidence"
                    className="inline-flex items-center gap-1 font-bold text-cyan-700 hover:text-cyan-900 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200"
                  >
                    <Eye className="w-3 h-3" /> View Evidence Block
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  {alert.status === 'OPEN' && (
                    <button
                      onClick={() => handleUpdateStatus(alert._id, 'ACKNOWLEDGED')}
                      className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                    >
                      Acknowledge
                    </button>
                  )}

                  {alert.status !== 'RESOLVED' && alert.status !== 'CAPA_CREATED' && (
                    <button
                      onClick={() => handleOpenCapaModal(alert)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Convert to CAPA Plan</span>
                    </button>
                  )}

                  {alert.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateStatus(alert._id, 'RESOLVED')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Convert to CAPA Modal */}
      {capaModalAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Convert Alert into Corrective Action (CAPA)</h3>
              <button onClick={() => setCapaModalAlert(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-500 font-semibold">Problem Identified:</span>
              <div className="font-bold text-slate-900 mt-0.5">{capaModalAlert.reason}</div>
              <div className="text-[11px] text-blue-700 mt-1 font-semibold">
                Department: {capaModalAlert.department} • Standard: {capaModalAlert.standardCode || 'NABH-COP.6'}
              </div>
            </div>

            <form onSubmit={handleCreateCapaFromAlert} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Corrective Action Plan *</label>
                <textarea
                  required
                  rows={3}
                  value={capaForm.action}
                  onChange={(e) => setCapaForm({ ...capaForm, action: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Responsible Person *</label>
                  <input
                    type="text"
                    required
                    value={capaForm.responsiblePerson}
                    onChange={(e) => setCapaForm({ ...capaForm, responsiblePerson: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Deadline *</label>
                  <input
                    type="date"
                    required
                    value={capaForm.deadline}
                    onChange={(e) => setCapaForm({ ...capaForm, deadline: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Predicted Risk Reduction Impact (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="5"
                  max="80"
                  value={capaForm.predictedImpact}
                  onChange={(e) => setCapaForm({ ...capaForm, predictedImpact: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCapaModalAlert(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Create & Link Closed-Loop CAPA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
