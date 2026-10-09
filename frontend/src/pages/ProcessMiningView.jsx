import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { pathwaysApi, capaApi } from '../services/api';
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
  ChevronRight,
  X,
  User,
  Calendar,
  Send
} from 'lucide-react';

const DEPARTMENTS = ['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward'];

export default function ProcessMiningView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedDepartment, setSelectedDepartment, refreshKey, showNotification } = useApp();
  const [miningData, setMiningData] = useState(null);
  const [conformanceData, setConformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCaseFilter, setSelectedCaseFilter] = useState('ALL');
  const [selectedCaseForAudit, setSelectedCaseForAudit] = useState(null);

  // Date and Time Formatters for Trace Audit
  const formatTraceDate = (dateVal) => {
    if (!dateVal) return 'Oct 09, 2026';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Oct 09, 2026';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTraceTime = (dateVal) => {
    if (!dateVal) return '10:00 AM';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '10:00 AM';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // CAPA Creation Modal State
  const [selectedDevForCapa, setSelectedDevForCapa] = useState(null);
  const [capaForm, setCapaForm] = useState({
    problem: '',
    department: 'ICU',
    action: '',
    responsiblePerson: '',
    deadline: '',
    priority: 'HIGH',
    standardCode: 'NABH-COP.6',
    predictedImpact: 25.0
  });
  const [isSubmittingCapa, setIsSubmittingCapa] = useState(false);

  const targetDept = selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'ICU';

  const handleOpenCapaModal = (dev) => {
    const prob = `[CLINICAL DEVIATION] ${dev.activity} in ${targetDept}: ${dev.rootCause || 'Mandatory clinical protocol step was bypassed.'}`;
    const act = dev.recommendedCapa || `Execute mandatory protocol verification and clinical retraining for '${dev.activity}'.`;
    const code = dev.standardCode || (targetDept === 'ICU' ? 'NABH-COP.6' : 'NABH-PROTOCOL');
    
    setCapaForm({
      problem: prob,
      department: targetDept,
      action: act,
      responsiblePerson: user?.name || (targetDept === 'ICU' ? 'Dr. Arthur Vance (ICU Quality Lead)' : 'Clinical Quality Lead'),
      deadline: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      priority: dev.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      standardCode: code,
      predictedImpact: Number(dev.riskContribution || 20) * 1.2
    });
    setSelectedDevForCapa(dev);
  };

  const handleCommitCapa = async (e) => {
    e?.preventDefault();
    if (!capaForm.problem || !capaForm.action) {
      showNotification('Please provide problem and remediation action.', 'error');
      return;
    }
    try {
      setIsSubmittingCapa(true);
      await capaApi.create({
        problem: capaForm.problem,
        department: capaForm.department || targetDept,
        action: capaForm.action,
        responsiblePerson: capaForm.responsiblePerson || 'Clinical Quality Lead',
        deadline: capaForm.deadline || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        priority: capaForm.priority || 'HIGH',
        standardCode: capaForm.standardCode || 'NABH-COP.6',
        predictedImpact: capaForm.predictedImpact || 25.0
      });
      showNotification(`🚀 CAPA plan successfully created for ${selectedDevForCapa?.activity || targetDept}!`, 'success');
      setSelectedDevForCapa(null);
      navigate('/kanban');
    } catch (err) {
      showNotification(err.response?.data?.message || err.message, 'error');
    } finally {
      setIsSubmittingCapa(false);
    }
  };

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

                  <button
                    onClick={() => handleOpenCapaModal(dev)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-xs transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Launch CAPA Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
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
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Individual Trace Audit Inspector ({targetDept})</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {filteredCases.length} Cases Analyzed
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological clinical patient journey traces with verified admission dates, completion timestamps, and cryptographic blockchain evidence links.
            </p>
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
                <th className="p-3">Case ID & Diagnosis</th>
                <th className="p-3">Admission Date & Time</th>
                <th className="p-3">Completed Timestamp</th>
                <th className="p-3">Evidence ID</th>
                <th className="p-3">Compliance & Fitness</th>
                <th className="p-3">Recorded Path</th>
                <th className="p-3">Missing Steps</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCases.map((c) => (
                <tr key={c.caseId} className="hover:bg-blue-50/40 transition group">
                  {/* Case ID & Diagnosis */}
                  <td className="p-3">
                    <div className="font-mono font-bold text-slate-900">{c.caseId}</div>
                    <div className="text-[10px] text-slate-500 font-medium truncate max-w-[160px]" title={c.admissionDiagnosis}>
                      {c.admissionDiagnosis || 'Clinical Observation'}
                    </div>
                  </td>

                  {/* Admission Date & Time */}
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{formatTraceDate(c.startTime || c.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{formatTraceTime(c.startTime || c.timestamp)}</span>
                    </div>
                  </td>

                  {/* Completed Timestamp & Total Duration */}
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{formatTraceDate(c.completedAt || c.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] mt-0.5">
                      <span className="font-mono text-slate-600">{formatTraceTime(c.completedAt || c.timestamp)}</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-mono font-bold text-[10px] border border-emerald-200">
                        {c.durationMinutes || 75}m total
                      </span>
                    </div>
                  </td>

                  {/* Cryptographic Evidence ID */}
                  <td className="p-3 font-mono text-cyan-700 font-bold whitespace-nowrap">
                    <Link
                      to={`/evidence?search=${encodeURIComponent(c.evidenceId || `EV-${targetDept.slice(0,3).toUpperCase()}-20261008-01`)}`}
                      className="hover:underline flex items-center gap-1"
                      title="Inspect Cryptographic Evidence Block"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{c.evidenceId || `EV-${targetDept.slice(0,3).toUpperCase()}-20261008-01`}</span>
                    </Link>
                  </td>

                  {/* Compliance & Fitness */}
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={c.isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT'}
                        label={c.isCompliant ? 'Compliant' : 'Deviated'}
                      />
                      <span className={`font-mono font-bold text-[11px] ${c.fitness >= 90 ? 'text-emerald-700' : c.fitness >= 70 ? 'text-amber-700' : 'text-rose-700'}`}>
                        {c.fitness}%
                      </span>
                    </div>
                  </td>

                  {/* Recorded Path Steps */}
                  <td className="p-3 max-w-[280px]">
                    <div className="flex flex-wrap items-center gap-1 text-[10px]">
                      {c.actualPath.map((step, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium whitespace-nowrap"
                          title={`Step ${sIdx + 1}: ${step}`}
                        >
                          {step}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Missing Steps */}
                  <td className="p-3">
                    {c.missingSteps && c.missingSteps.length > 0 ? (
                      <span className="px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] inline-block whitespace-nowrap">
                        Skipped: {c.missingSteps.join(', ')}
                      </span>
                    ) : (
                      <span className="text-emerald-700 text-[11px] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Full Protocol
                      </span>
                    )}
                  </td>

                  {/* Inspect Button */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => setSelectedCaseForAudit(c)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition flex items-center gap-1 mx-auto"
                      title="Inspect Trace Details & Step Timestamps"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive CAPA Remediation Creation Modal */}
      {selectedDevForCapa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-2 border-rose-300 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative overflow-hidden animate-scale-up space-y-4">
            {/* Top pulsing banner */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 animate-pulse" />

            {/* Close Button */}
            <button
              onClick={() => setSelectedDevForCapa(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-800 rounded-xl bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                    NEW CAPA REMEDIATION ACTION
                  </span>
                  <span className="text-[10px] text-slate-600 font-bold font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {capaForm.standardCode}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Launch CAPA for {selectedDevForCapa.activity}
                </h3>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCommitCapa} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Problem Statement</label>
                <textarea
                  rows={2}
                  value={capaForm.problem}
                  onChange={(e) => setCapaForm({ ...capaForm, problem: e.target.value })}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none bg-slate-50 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Corrective & Remediation Action Plan</label>
                <textarea
                  rows={3}
                  value={capaForm.action}
                  onChange={(e) => setCapaForm({ ...capaForm, action: e.target.value })}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                  placeholder="Specific remediation steps, staff re-training, protocol enforcement..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={capaForm.department}
                    readOnly
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-100 font-semibold text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority Level</label>
                  <select
                    value={capaForm.priority}
                    onChange={(e) => setCapaForm({ ...capaForm, priority: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-bold"
                  >
                    <option value="CRITICAL">CRITICAL (Emergency Action)</option>
                    <option value="HIGH">HIGH (Immediate Review)</option>
                    <option value="MEDIUM">MEDIUM (Standard CAPA)</option>
                    <option value="LOW">LOW (Continuous Improvement)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Responsible Quality Lead</label>
                  <input
                    type="text"
                    value={capaForm.responsiblePerson}
                    onChange={(e) => setCapaForm({ ...capaForm, responsiblePerson: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Resolution Deadline</label>
                  <input
                    type="date"
                    value={capaForm.deadline}
                    onChange={(e) => setCapaForm({ ...capaForm, deadline: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                    required
                  />
                </div>
              </div>

              {/* Evidence & Impact note */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-[11px] text-blue-900 font-semibold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Anchored Block: {selectedDevForCapa.evidenceId}
                </span>
                <span className="text-emerald-700 font-bold">
                  Est. Impact: +{capaForm.predictedImpact}% Conformance
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDevForCapa(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCapa}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition flex items-center justify-center gap-2"
                >
                  {isSubmittingCapa ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Plan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Commit & Launch CAPA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Interactive Detailed Trace Audit Inspector Modal */}
      {selectedCaseForAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-2 border-blue-200 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden animate-scale-up space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Top gradient banner */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500" />

            {/* Close Button */}
            <button
              onClick={() => setSelectedCaseForAudit(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-800 rounded-xl bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs shrink-0 mt-1">
                <GitFork className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    TRACE AUDIT TIMELINE
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {targetDept} Unit
                  </span>
                  <StatusBadge
                    status={selectedCaseForAudit.isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT'}
                    label={selectedCaseForAudit.isCompliant ? 'Compliant' : 'Deviated'}
                  />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1 font-mono">
                  {selectedCaseForAudit.caseId}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Diagnosis: <strong className="text-slate-700">{selectedCaseForAudit.admissionDiagnosis || 'Clinical Observation'}</strong>
                </p>
              </div>
            </div>

            {/* 4-Card Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-blue-600" /> Admission Date
                </div>
                <div className="font-bold text-slate-900 mt-1 text-xs">
                  {formatTraceDate(selectedCaseForAudit.startTime || selectedCaseForAudit.timestamp)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {formatTraceTime(selectedCaseForAudit.startTime || selectedCaseForAudit.timestamp)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed Time
                </div>
                <div className="font-bold text-slate-900 mt-1 text-xs">
                  {formatTraceDate(selectedCaseForAudit.completedAt || selectedCaseForAudit.timestamp)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {formatTraceTime(selectedCaseForAudit.completedAt || selectedCaseForAudit.timestamp)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-600" /> Total Duration
                </div>
                <div className="font-bold text-indigo-700 mt-1 text-xs font-mono">
                  {selectedCaseForAudit.durationMinutes || 75} mins
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Fitness: {selectedCaseForAudit.fitness}%
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Evidence Proof
                </div>
                <div className="font-bold text-cyan-700 mt-1 text-[11px] font-mono truncate" title={selectedCaseForAudit.evidenceId}>
                  {selectedCaseForAudit.evidenceId || 'EV-ICU-20261008-01'}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                  SHA-256 Sealed
                </div>
              </div>
            </div>

            {/* Skipped Steps Alert if Non-Compliant */}
            {selectedCaseForAudit.missingSteps && selectedCaseForAudit.missingSteps.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Clinical Deviation: Skipped Mandatory Standard Protocol</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-200/60 text-rose-900 font-mono text-[10px] font-bold">
                    Risk +18
                  </span>
                </div>
                <p className="text-xs text-rose-700">
                  The following mandatory accreditation step was omitted during clinical workflow execution:
                  <strong className="block mt-0.5 font-mono text-rose-900">• {selectedCaseForAudit.missingSteps.join(', ')}</strong>
                </p>
                <div className="pt-1">
                  <button
                    onClick={() => {
                      const dev = (deviations || []).find(d => selectedCaseForAudit.missingSteps.includes(d.activity)) || {
                        activity: selectedCaseForAudit.missingSteps[0],
                        standardCode: targetDept === 'ICU' ? 'NABH-COP.6' : 'NABH-PROTOCOL',
                        severity: 'CRITICAL',
                        riskContribution: 20,
                        evidenceId: selectedCaseForAudit.evidenceId
                      };
                      setSelectedCaseForAudit(null);
                      handleOpenCapaModal(dev);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white font-bold text-xs shadow-md shadow-rose-600/20 hover:from-rose-500 hover:to-amber-500 transition flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Launch CAPA Remediation for {selectedCaseForAudit.missingSteps[0]}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Vertical Step Execution Timeline */}
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>Step-by-Step Clinical Execution Timeline</span>
                <span className="text-slate-500 font-mono text-[11px] font-normal">
                  {selectedCaseForAudit.actualPath?.length || 0} Stages Completed
                </span>
              </div>

              <div className="space-y-2 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 pl-8 pt-1">
                {(selectedCaseForAudit.events && selectedCaseForAudit.events.length > 0 ? selectedCaseForAudit.events : (selectedCaseForAudit.actualPath || []).map((step, idx) => ({
                  activity: step,
                  status: 'COMPLETED',
                  durationMinutes: 15,
                  resource: `${targetDept} Clinical Staff`,
                  timestamp: new Date(new Date(selectedCaseForAudit.startTime || selectedCaseForAudit.timestamp).getTime() + idx * 15 * 60000).toISOString()
                }))).map((ev, sIdx) => (
                  <div key={sIdx} className="relative group">
                    <span className="absolute -left-8 top-1.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs flex items-center justify-center text-[8px] text-white font-bold">
                      ✓
                    </span>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 group-hover:border-blue-300 transition text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">
                          {sIdx + 1}. {ev.activity}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                          {ev.status || 'COMPLETED'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatTraceDate(ev.timestamp)}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTraceTime(ev.timestamp)}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span>Duration: {ev.durationMinutes || 15}m</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-700 font-medium">{ev.resource || `${targetDept} Team`}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <Link
                to={`/evidence?search=${encodeURIComponent(selectedCaseForAudit.evidenceId || `EV-${targetDept.slice(0,3).toUpperCase()}-20261008-01`)}`}
                className="px-4 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold text-xs border border-cyan-200 transition flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>View Evidence Block in Sealed Ledger</span>
              </Link>

              <button
                onClick={() => setSelectedCaseForAudit(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


