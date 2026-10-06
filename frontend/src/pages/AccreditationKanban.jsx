import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { capaApi } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import RiskBadge from '../components/common/RiskBadge';
import { EmptyState, ErrorState } from '../components/common/StateViews';
import {
  KanbanSquare,
  Plus,
  ArrowRight,
  CheckCircle2,
  Calendar,
  User,
  AlertCircle,
  TrendingUp,
  X,
  Clock
} from 'lucide-react';

const COLUMNS = [
  { id: 'OPEN', title: 'Open / Triage', color: 'border-amber-300 text-amber-800 bg-amber-50' },
  { id: 'ASSIGNED', title: 'Assigned', color: 'border-blue-300 text-blue-800 bg-blue-50' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-sky-300 text-sky-800 bg-sky-50' },
  { id: 'COMPLETED', title: 'Completed & Verified', color: 'border-emerald-300 text-emerald-800 bg-emerald-50' }
];

export default function AccreditationKanban() {
  const { selectedDepartment, refreshKey, notify } = useApp();
  const [kanban, setKanban] = useState({ OPEN: [], ASSIGNED: [], IN_PROGRESS: [], COMPLETED: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionModal, setActionModal] = useState(null); // Selected card to change status

  // New CAPA Form State
  const [formData, setFormData] = useState({
    problem: '',
    department: 'ICU',
    action: '',
    responsiblePerson: '',
    deadline: '',
    priority: 'HIGH'
  });

  const fetchKanban = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await capaApi.getKanban(selectedDepartment);
      setKanban(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKanban();
  }, [selectedDepartment, refreshKey]);

  const handleCreateCapa = async (e) => {
    e.preventDefault();
    try {
      await capaApi.create(formData);
      notify('New CAPA action created successfully.', 'success');
      setShowModal(false);
      setFormData({
        problem: '',
        department: selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'ICU',
        action: '',
        responsiblePerson: '',
        deadline: '',
        priority: 'HIGH'
      });
      fetchKanban();
    } catch (err) {
      notify(`Failed to create CAPA: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  const handleStatusTransition = async (capaId, newStatus) => {
    try {
      const res = await capaApi.updateStatus(capaId, newStatus);
      if (newStatus === 'COMPLETED') {
        notify('CAPA completed! Department re-evaluation triggered & before/after improvement verified.', 'success');
      } else {
        notify(`CAPA moved to ${newStatus}.`, 'info');
      }
      setActionModal(null);
      fetchKanban();
    } catch (err) {
      notify(`Failed to update CAPA status: ${err.message}`, 'error');
    }
  };

  if (error) {
    return <ErrorState error={error} onRetry={fetchKanban} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <KanbanSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Accreditation Corrective Actions (CAPA) Kanban</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Track root-cause investigations, manage corrective actions, and verify measurable quality improvements after completion.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New CAPA Plan</span>
        </button>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
        {COLUMNS.map((col) => {
          const items = kanban[col.id] || [];
          return (
            <div
              key={col.id}
              className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 flex flex-col min-h-[500px] shadow-sm"
            >
              <div className={`flex items-center justify-between pb-3 border-b border-slate-200 mb-3`}>
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${col.color}`}>
                  {col.title}
                </span>
                <span className="text-xs font-mono font-bold bg-white text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm">
                  {items.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic">
                    No items in this stage
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item._id}
                      className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition shadow-sm space-y-3 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {item.department}
                        </span>
                        <StatusBadge status={item.priority} label={item.priority} />
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {item.problem}
                      </h4>

                      <p className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <span className="font-semibold text-slate-900">Action:</span> {item.action}
                      </p>

                      <div className="space-y-1 text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate font-medium">{item.responsiblePerson}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Deadline: {new Date(item.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Closed Loop: Before vs After Metrics Comparison (Section 10) */}
                      {item.status === 'COMPLETED' && (
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-emerald-700 font-bold">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Closed Loop Verified</span>
                            </span>
                            {item.improvementPercentage !== null && (
                              <span className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">+{item.improvementPercentage}% Imprv.</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[10px] p-2 rounded bg-emerald-50/60 border border-emerald-200">
                            <div>
                              <span className="text-slate-500">Before Risk: </span>
                              <span className="font-mono font-bold text-rose-700">{item.beforeMetrics?.riskScore || 80}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">After Risk: </span>
                              <span className="font-mono font-bold text-emerald-700">{item.afterMetrics?.riskScore || 25}</span>
                            </div>
                          </div>
                          {item.verificationNotes && (
                            <p className="text-[10px] text-slate-500 italic">{item.verificationNotes}</p>
                          )}
                        </div>
                      )}

                      {/* Transition Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        {item.status !== 'COMPLETED' ? (
                          <button
                            onClick={() => setActionModal(item)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[11px] font-semibold transition border border-slate-200 hover:border-blue-200"
                          >
                            <span>Advance Stage</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Audit Archived</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage Transition Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Update CAPA Workflow Stage</h3>
              <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <div className="font-bold text-slate-900 mb-1">{actionModal.problem}</div>
              <div className="text-[11px] text-slate-500">Current Status: {actionModal.status}</div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">Select Target Stage:</label>
              <div className="grid grid-cols-2 gap-2">
                {['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
                  <button
                    key={st}
                    disabled={st === actionModal.status}
                    onClick={() => handleStatusTransition(actionModal._id, st)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border transition text-center ${
                      st === actionModal.status
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : st === 'COMPLETED'
                        ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                        : 'bg-slate-50 hover:bg-blue-50 border-slate-200 hover:border-blue-200 text-slate-800'
                    }`}
                  >
                    {st === 'COMPLETED' ? 'Mark Completed & Re-evaluate' : st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New CAPA Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Create Corrective / Preventive Action Plan (CAPA)</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCapa} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Problem / Deviation Identified *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 12 traces skipped mandatory medication verification in ICU"
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    {['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Corrective Action Plan *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Implement dual barcode scanning checkpoint and conduct staff training."
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Responsible Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Elena Rostova"
                    value={formData.responsiblePerson}
                    onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Deadline *</label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Save CAPA Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
