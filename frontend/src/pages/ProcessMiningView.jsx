import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { pathwaysApi } from '../services/api';
import { EmptyState, ErrorState } from '../components/common/StateViews';
import StatusBadge from '../components/common/StatusBadge';
import {
  GitFork,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  Search
} from 'lucide-react';

export default function ProcessMiningView() {
  const { selectedDepartment, refreshKey } = useApp();
  const [miningData, setMiningData] = useState(null);
  const [conformanceData, setConformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCaseFilter, setSelectedCaseFilter] = useState('ALL'); // 'ALL' | 'COMPLIANT' | 'DEVIATED'

  const targetDept = selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'ICU';

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [miningRes, confRes] = await Promise.all([
        pathwaysApi.getProcessMining(targetDept),
        pathwaysApi.getConformance(targetDept)
      ]);
      setMiningData(miningRes.data.data);
      setConformanceData(confRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDepartment, refreshKey]);

  if (loading && !miningData) {
    return (
      <div className="flex items-center justify-center h-96 text-blue-600">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <p className="text-xs font-semibold">Running PM4Py Graph Mining & Conformance Analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchData} />;
  }

  if (!miningData || miningData.totalCases === 0) {
    return <EmptyState title="No Pathway Traces" message={`No patient pathway logs recorded for ${targetDept}. Log traces in Data Entry Center.`} />;
  }

  const { totalCases, nodes, edges, variants, bottlenecks } = miningData;
  const { conformanceRate, compliantTraces, deviatedTraces, deviations, evidence, expectedPath, caseDetails } = conformanceData || {};

  const filteredCases = (caseDetails || []).filter(c => {
    if (selectedCaseFilter === 'COMPLIANT') return c.isCompliant;
    if (selectedCaseFilter === 'DEVIATED') return !c.isCompliant;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <GitFork className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">PM4Py Process Mining & Conformance Intelligence</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Discovers directly-follows graph from clinical event logs, evaluates trace fitness against expected care protocols, and detects non-compliant step omissions.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-right">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Conformance Rate</div>
              <div className={`text-xl font-black ${conformanceRate >= 90 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {conformanceRate}%
              </div>
            </div>
          </div>
        </div>

        {/* Expected Clinical Protocol Path Banner */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">
            Expected Reference Clinical Pathway ({targetDept}):
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(expectedPath || []).map((step, idx) => (
              <React.Fragment key={step}>
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  step === 'Medication Verification' || step === 'Surgical Safety Checklist'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                }`}>
                  {step}
                </span>
                {idx < expectedPath.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-sky-100 shadow-sm">
          <div className="text-xs text-slate-500">Total Analyzed Traces</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalCases}</div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">{targetDept} Patient Cohort</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-sky-100 shadow-sm">
          <div className="text-xs text-slate-500">Fully Compliant Paths</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{compliantTraces}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">100% protocol match</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-sky-100 shadow-sm">
          <div className="text-xs text-slate-500">Deviated Traces</div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{deviatedTraces}</div>
          <div className="text-[11px] text-rose-700 mt-0.5 font-medium">Skipped or delayed steps</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-sky-100 shadow-sm">
          <div className="text-xs text-slate-500">Process Variants</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{variants.length}</div>
          <div className="text-[11px] text-blue-700 mt-0.5 font-medium">Unique execution pathways</div>
        </div>
      </div>

      {/* Directly-Follows Transition Flow Graph */}
      <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Directly-Follows Transition Flow Graph</h3>
            <p className="text-xs text-slate-500">Activity transitions with case frequency and mean transit duration</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {edges.map((edge, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition ${
                edge.avgDurationMinutes > 45
                  ? 'bg-rose-50/40 border-rose-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-slate-900 font-bold">{edge.source}</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-slate-900 font-bold">{edge.target}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600">
                <span>Frequency: <strong className="text-slate-900">{edge.count} cases</strong></span>
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className={edge.avgDurationMinutes > 45 ? 'text-rose-700 font-bold' : 'text-slate-700'}>
                    {edge.avgDurationMinutes}m avg
                  </span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Identified Deviations & Bottlenecks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conformance Deviations & Audit Evidence */}
        <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900">Protocol Deviations & Audit Evidence</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">Specific non-compliant patterns feeding into the Risk & Alerts pipeline</p>

          <div className="space-y-3">
            {(deviations || []).map((dev, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-800">{dev.activity}</span>
                  <StatusBadge status={dev.severity} label={dev.severity} />
                </div>
                <div className="text-[11px] text-slate-700">
                  {dev.count} traces ({dev.percentage}%) skipped mandatory step in {targetDept}.
                </div>
              </div>
            ))}

            {(evidence || []).map((evText, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>{evText}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trace Variants Distribution */}
        <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Top Clinical Trace Variants</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">Empirical activity pathways ordered by case volume</p>

          <div className="space-y-3">
            {variants.map((v, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Variant #{idx + 1}</span>
                  <span className="font-mono text-blue-700 font-bold">{v.caseCount} cases ({v.percentage}%)</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  {v.activities.map((act, aIdx) => (
                    <React.Fragment key={aIdx}>
                      <span className="px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 shadow-sm font-medium">
                        {act}
                      </span>
                      {aIdx < v.activities.length - 1 && <ArrowRight className="w-3 h-3 text-slate-400" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Case-by-Case Trace Inspector */}
      <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Individual Trace Audit Inspector</h3>
            <p className="text-xs text-slate-500">Inspect sequence and compliance status of analyzed patient cases</p>
          </div>

          <div className="flex items-center gap-2">
            {['ALL', 'COMPLIANT', 'DEVIATED'].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedCaseFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                  selectedCaseFilter === f
                    ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Case ID</th>
                <th className="p-3">Compliance</th>
                <th className="p-3">Fitness</th>
                <th className="p-3">Recorded Path</th>
                <th className="p-3">Missing Steps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.map((c) => (
                <tr key={c.caseId} className="hover:bg-blue-50/40 transition">
                  <td className="p-3 font-mono font-bold text-slate-900">{c.caseId}</td>
                  <td className="p-3">
                    <StatusBadge
                      status={c.isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT'}
                      label={c.isCompliant ? 'Compliant' : 'Deviated'}
                    />
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-800">{c.fitness}%</td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-1 text-[11px]">
                      {c.actualPath.map((step, sIdx) => (
                        <span key={sIdx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                          {step}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    {c.missingSteps && c.missingSteps.length > 0 ? (
                      <span className="text-rose-700 font-semibold text-[11px]">
                        Skipped: {c.missingSteps.join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
