import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { complianceApi } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import { EmptyState, ErrorState } from '../components/common/StateViews';
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Search,
  BookOpen
} from 'lucide-react';

export default function AccreditationStandards() {
  const { selectedDepartment, refreshKey, notify } = useApp();
  const [evalData, setEvalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('ALL');

  // New Standard Form
  const [formData, setFormData] = useState({
    standardCode: '',
    standardName: '',
    department: selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'ICU',
    category: 'Patient Safety',
    requirement: '',
    threshold: 90,
    operator: '>=',
    metricTargetField: 'pathwayConformance',
    severity: 'HIGH',
    regulatoryBody: 'NABH 5th Edition'
  });

  const fetchCompliance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await complianceApi.getEvaluation(selectedDepartment);
      setEvalData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompliance();
  }, [selectedDepartment, refreshKey]);

  const handleCreateStandard = async (e) => {
    e.preventDefault();
    try {
      await complianceApi.createStandard(formData);
      notify(`Accreditation standard ${formData.standardCode} saved successfully.`, 'success');
      setShowModal(false);
      fetchCompliance();
    } catch (err) {
      notify(`Failed to save standard: ${err.response?.data?.message || err.message}`, 'error');
    }
  };

  if (error) {
    return <ErrorState error={error} onRetry={fetchCompliance} />;
  }

  const standards = evalData?.standards || [];
  const filteredStandards = standards.filter(s => {
    if (filterCategory === 'ALL') return true;
    return s.category === filterCategory;
  });

  const categories = ['ALL', ...new Set(standards.map(s => s.category))];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Accreditation Standards & Compliance Evidence Matrix</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configured accreditation quality mandates (NABH / JCI) mapped directly against live hospital operational indicators and patient pathway traces.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Standard Rule</span>
          </button>
        </div>

        {/* Status Score Strip */}
        {evalData && (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-semibold text-slate-500">Department Compliance</div>
              <div className="text-xl font-bold text-blue-700 mt-0.5">{evalData.overallComplianceRate}%</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-semibold text-slate-500">Total Standards</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">{evalData.standardsCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-semibold text-slate-500">Compliant Rules</div>
              <div className="text-xl font-bold text-emerald-700 mt-0.5">{evalData.compliantCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] uppercase font-semibold text-slate-500">Non-Compliant / Gaps</div>
              <div className="text-xl font-bold text-rose-700 mt-0.5">{evalData.nonCompliantCount}</div>
            </div>
          </div>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
              filterCategory === cat
                ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold shadow-sm'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Standards List / Matrix */}
      <div className="space-y-4">
        {filteredStandards.length === 0 ? (
          <EmptyState title="No Standards in this Category" message="Select another category or add a new accreditation standard." />
        ) : (
          filteredStandards.map((std) => (
            <div
              key={std.standardCode}
              className={`p-5 rounded-2xl border transition shadow-sm space-y-3 ${
                std.status === 'NON_COMPLIANT'
                  ? 'bg-rose-50/30 border-rose-200'
                  : 'bg-white border-sky-100'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {std.standardCode}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{std.standardName}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                    {std.category}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">{std.department}</span>
                  <StatusBadge status={std.status} />
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                {std.requirement}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500">Target Threshold: </span>
                  <strong className="text-slate-800 font-semibold">{std.operator} {std.threshold}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Live Hospital Value: </span>
                  <strong className={std.status === 'NON_COMPLIANT' ? 'text-rose-700 font-mono font-bold' : 'text-emerald-700 font-mono font-bold'}>
                    {std.actualValue}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Compliance Gap: </span>
                  <strong className={std.gap > 0 ? 'text-rose-700 font-bold' : 'text-slate-500 font-semibold'}>
                    {std.gap > 0 ? `${std.gap}` : '0.0 (Compliant)'}
                  </strong>
                </div>
              </div>

              {/* Audit Evidence Trail */}
              <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-xs">
                <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800">Audit Evidence: </span>
                  <span className="text-slate-600">{std.evidence}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Standard Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Create Accreditation Standard Rule</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStandard} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Standard Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NABH-COP.15"
                    value={formData.standardCode}
                    onChange={(e) => setFormData({ ...formData, standardCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Standard Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ICU Nurse Handoff Verification"
                    value={formData.standardName}
                    onChange={(e) => setFormData({ ...formData, standardName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    {['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward', 'Hospital-Wide'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Patient Safety">Patient Safety</option>
                    <option value="Clinical Care">Clinical Care</option>
                    <option value="Infection Control">Infection Control</option>
                    <option value="Facility & Staffing">Facility & Staffing</option>
                    <option value="Governance">Governance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Regulatory Requirement Mandate *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Detailed regulatory expectation..."
                  value={formData.requirement}
                  onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Field *</label>
                  <select
                    value={formData.metricTargetField}
                    onChange={(e) => setFormData({ ...formData, metricTargetField: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="pathwayConformance">pathwayConformance</option>
                    <option value="occupancyRate">occupancyRate</option>
                    <option value="avgWaitingTime">avgWaitingTime</option>
                    <option value="infectionRate">infectionRate</option>
                    <option value="staffingLevel">staffingLevel</option>
                    <option value="incidentCount">incidentCount</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operator</label>
                  <select
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value=">=">&gt;= (At least)</option>
                    <option value="<=">&lt;= (At most)</option>
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Threshold *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
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
                  Save Standard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
