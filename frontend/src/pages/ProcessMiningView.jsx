import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Search,
  ShieldAlert,
  Eye,
  Hash,
  Building2,
  ShieldCheck,
  Zap,
  Activity,
  ChevronRight
} from 'lucide-react';

const DEPARTMENTS = ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward'];

export default function ProcessMiningView() {
  const { selectedDepartment, setSelectedDepartment, refreshKey } = useApp();
  const [miningData, setMiningData] = useState(null);
  const [conformanceData, setConformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCaseFilter, setSelectedCaseFilter] = useState('ALL');

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
  }, [targetDept, refreshKey]);

  if (loading && !miningData) {
    return (
      <div className="flex items-center justify-center h-96 text-blue-600">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <p className="text-xs font-semibold">Running PM4Py Graph Mining & Conformance Analysis for {targetDept}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchData} />;
  }

  if (!miningData || miningData.totalCases === 0) {
    return (
      <div className="space-y-6">
        {/* Department Switcher */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-sky-100 shadow-sm">
          <span className="text-xs font-bold text-slate-500 mr-2 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-600" /> Department:
          </span>
          {DEPARTMENTS.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                targetDept === dept
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
        <EmptyState title="No Pathway Traces" message={`No patient pathway logs recorded for ${targetDept}. Log traces in Data Entry Center.`} />
      </div>
    );
  }

  const { totalCases, nodes, edges, variants } = miningData;
  const { conformanceRate, compliantTraces, deviatedTraces, deviations, evidence, expectedPath, caseDetails } = conformanceData || {};

  const filteredCases = (caseDetails || []).filter(c => {
    if (selectedCaseFilter === 'COMPLIANT') return c.isCompliant;
    if (selectedCaseFilter === 'DEVIATED') return !c.isCompliant;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Interactive Department Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-600" /> Active Department:
          </span>
          {DEPARTMENTS.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                targetDept === dept
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>{dept}</span>
              {targetDept === dept && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </button>
          ))}
        </div>

        <button
          onClick={fetchData}
          className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition text-xs font-semibold flex items-center gap-1"
          title="Refresh Conformance Analysis"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Refresh Analysis</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 shadow-xs">
                <GitFork className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">PM4Py Process Mining & Evidence Conformance</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                    {targetDept}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evaluates trace fitness against expected clinical protocols, discovers execution bottlenecks, and links omissions to cryptographic evidence blocks.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-right">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Protocol Conformance</div>
              <div className={`text-2xl font-black ${conformanceRate >= 90 ? 'text-emerald-700' : conformanceRate >= 80 ? 'text-amber-700' : 'text-rose-700'}`}>
                {conformanceRate}%
              </div>
            </div>
          </div>
        </div>

        {/* Expected Clinical Protocol Path Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            <span>Expected Reference Clinical Protocol ({targetDept}):</span>
            <span className="text-blue-700 font-mono">{expectedPath?.length || 0} Mandatory Stages</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {(expectedPath || []).map((step, idx) => (
              <React.Fragment key={step}>
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  step.includes('Verification') || step.includes('Checklist') || step.includes('ECG') || step.includes('Consent') || step.includes('Dressing')
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-200 shadow-xs'
                }`}>
                  {step}
                </span>
                {idx < expectedPath.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Total Analyzed Traces</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalCases}</div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">{targetDept} Patient Cohort</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Fully Compliant Paths</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{compliantTraces}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">100% protocol match</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Deviated Traces</div>
          <div className={`text-2xl font-bold mt-1 ${deviatedTraces > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{deviatedTraces}</div>
          <div className="text-[11px] text-rose-700 mt-0.5 font-medium">Omitted or delayed steps</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Process Variants</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{variants.length}</div>
          <div className="text-[11px] text-blue-700 mt-0.5 font-medium">Unique execution pathways</div>
        </div>
      </div>

      {/* Identified Deviations with Evidence Citations & Risk Contributions */}
      <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Evidence-Linked Clinical Deviations ({targetDept})</h3>
              <p className="text-xs text-slate-500">Each deviation is verified against accreditation standards and anchored in the cryptographic ledger.</p>
            </div>
          </div>
          <span className="self-start sm:self-auto text-xs font-mono px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
            {deviations?.length || 0} Deviations Detected
          </span>
        </div>

        {(!deviations || deviations.length === 0) ? (
          <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-center space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <div className="text-sm font-bold text-emerald-900">Zero Clinical Protocol Deviations</div>
            <p className="text-xs text-emerald-700">100% of patient pathways in {targetDept} satisfied mandatory accreditation benchmarks.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deviations.map((dev, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-rose-50/30 border border-rose-200 space-y-3 shadow-xs hover:border-rose-300 transition"
              >
                {/* Title & Risk Contribution */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                      {dev.activity}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-bold">
                        {dev.standardCode || 'NABH-COP.6'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {dev.regulatoryBody || 'NABH 5th Edition'}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-xs shrink-0">
                    Risk +{dev.riskContribution || 18} pts
                  </span>
                </div>

                {/* Root Cause Reason */}
                <div className="p-3 bg-white rounded-xl border border-rose-100 text-xs space-y-2">
                  <div>
                    <span className="text-slate-500 font-semibold block text-[11px]">Diagnostic Root Cause:</span>
                    <p className="text-slate-800 font-medium text-xs mt-0.5 leading-relaxed">
                      {dev.rootCause || `Mandatory clinical protocol step '${dev.activity}' was bypassed during procedure.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Impacted Cohort:</span>
                      <strong className="text-rose-700">{dev.count} cases ({dev.percentage}%)</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Evidence Block:</span>
                      <span className="font-mono font-bold text-cyan-700 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {dev.evidenceId || `EV-${targetDept.slice(0,3).toUpperCase()}-20261008-01`}
                      </span>
                    </div>
                  </div>

                  {dev.sampleCases && dev.sampleCases.length > 0 && (
                    <div className="pt-1 text-[10px] text-slate-500 font-mono">
                      Sample Cases: <span className="text-slate-700 font-semibold">{dev.sampleCases.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Recommended CAPA Note */}
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Recommended CAPA: </strong>
                    <span>{dev.recommendedCapa || `Enforce mandatory protocol verification for '${dev.activity}'.`}</span>
                  </div>
                </div>

                {/* Action Deep-Links */}
                <div className="flex items-center justify-between pt-1">
                  <Link
                    to={`/evidence?search=${encodeURIComponent(dev.evidenceId || `EV-${targetDept.slice(0,3).toUpperCase()}-20261008-01`)}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-xs transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Evidence in Ledger</span>
                  </Link>

                  <Link
                    to="/capa"
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline"
                  >
                    <span>Launch CAPA Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Directly-Follows Transition Flow Graph */}
      <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Directly-Follows Transition Flow Graph ({targetDept})</h3>
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
                <span className="text-slate-900 font-bold truncate max-w-[110px]" title={edge.source}>{edge.source}</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-slate-900 font-bold truncate max-w-[110px]" title={edge.target}>{edge.target}</span>
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

      {/* Case-by-Case Trace Inspector */}
      <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Individual Trace Audit Inspector ({targetDept})</h3>
            <p className="text-xs text-slate-500">Inspect sequence and cryptographic evidence links for analyzed patient cases</p>
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
                <th className="p-3">Evidence ID</th>
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
                  <td className="p-3 font-mono text-cyan-700 font-bold">
                    <Link
                      to={`/evidence?search=${encodeURIComponent(c.evidenceId || `EV-${targetDept.slice(0,3).toUpperCase()}-20261008-01`)}`}
                      className="hover:underline flex items-center gap-1"
                      title="Inspect Cryptographic Evidence"
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>{c.evidenceId || `EV-${targetDept.slice(0,3).toUpperCase()}-20261008-01`}</span>
                    </Link>
                  </td>
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

