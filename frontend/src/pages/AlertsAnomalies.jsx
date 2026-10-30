import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { alertsApi, capaApi } from '../services/api';
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
  Hash,
  ExternalLink,
  GitFork,
  FileText,
  KanbanSquare,
  Info,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers
} from 'lucide-react';

function extractCaseIds(alert) {
  const cases = new Set();
  if (alert.caseId && !['null', 'undefined', 'Cohort Wide'].includes(alert.caseId)) {
    cases.add(alert.caseId.trim());
  }
  if (alert.metadata?.caseId) {
    cases.add(alert.metadata.caseId.trim());
  }

  const textToSearch = [alert.title, alert.reason, ...(alert.evidence || [])].join(' ');
  const regex = /(?:Case[s]?(?:\s+Identifier)?(?:\s*[:#]\s*|\s+))([A-Z0-9\-_]+)/gi;
  let match;
  while ((match = regex.exec(textToSearch)) !== null) {
    const val = match[1]?.trim();
    if (val && !['Wide', 'Level', 'Identifier', 'null', 'undefined'].includes(val)) {
      cases.add(val);
    }
  }

  // Also check for TRACE- prefix in supporting evidence
  (alert.supportingEvidenceIds || []).forEach(e => {
    if (e.startsWith('TRACE-')) {
      cases.add(e.replace('TRACE-', ''));
    }
  });

  return Array.from(cases);
}

function extractEvidenceIds(alert) {
  const evs = new Set();
  (alert.supportingEvidenceIds || []).forEach(e => {
    if (e && e.startsWith('EV-')) evs.add(e.trim());
  });

  const textToSearch = [alert.title, alert.reason, ...(alert.evidence || [])].join(' ');
  const regex = /EV-[A-Z0-9\-_]+/gi;
  let match;
  while ((match = regex.exec(textToSearch)) !== null) {
    if (match[0]) evs.add(match[0].trim());
  }

  return Array.from(evs);
}

function getSourceMeta(source) {
  switch (source) {
    case 'PROCESS_MINING':
      return {
        label: 'Process Mining Engine',
        desc: 'Triggered when patient journey skips mandatory steps or exceeds clinical turnaround times.',
        icon: GitFork,
        color: 'text-purple-700 bg-purple-50 border-purple-200'
      };
    case 'ANOMALY_DETECTOR':
      return {
        label: 'Clinical Anomaly Detector',
        desc: 'Triggered when infection rates, occupancy, or incidents deviate beyond historical normal limits.',
        icon: Activity,
        color: 'text-rose-700 bg-rose-50 border-rose-200'
      };
    case 'ML_RISK':
      return {
        label: 'Predictive Risk Engine',
        desc: 'Triggered by multi-factor machine learning evaluation of departmental risk.',
        icon: Sparkles,
        color: 'text-amber-700 bg-amber-50 border-amber-200'
      };
    case 'COMPLIANCE_ENGINE':
    default:
      return {
        label: 'Accreditation Engine',
        desc: 'Triggered by non-compliance with NABH/JCI standards or cryptographic hash chain verification failure.',
        icon: ShieldAlert,
        color: 'text-blue-700 bg-blue-50 border-blue-200'
      };
  }
}

export default function AlertsAnomalies() {
  const { selectedDepartment, refreshKey, notify } = useApp();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showGuide, setShowGuide] = useState(true);

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
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Evidence-Backed Quality Alerts & Signals</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    REAL-TIME SIGNAL INTELLIGENCE
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trace clinical deviations from patient Case IDs to SHA-256 evidence blocks, accreditation clauses, and CAPA remediation.
                </p>
              </div>
            </div>
          </div>

          {/* Action and Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition flex items-center gap-1.5"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{showGuide ? 'Hide Architecture Guide' : 'Explain How It Works'}</span>
              {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Severity Filters */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    severityFilter === sev
                      ? 'bg-white text-rose-700 font-bold shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Closed-Loop Lineage Guide Strip (Collapsible) */}
        {showGuide && (
          <div className="mt-5 pt-5 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                How Quality Alerts Connect to the Whole Platform (Closed-Loop Lineage)
              </span>
              <span className="text-[11px] text-slate-500">Every alert maps to 5 interconnected nodes</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Step 1: Case ID */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
                  <span>Patient Event (Case ID)</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Every admission, triage, or surgery has a unique <strong>Case ID</strong> (e.g. <span className="font-mono font-bold">ICU-20261011-001</span>). Clinical events form an audit trail.
                </p>
                <div className="pt-1 text-[10px] font-semibold text-blue-700">
                  Linked to: <strong>PM4Py Process Mining</strong>
                </div>
              </div>

              {/* Step 2: Evidence */}
              <div className="p-3 rounded-xl bg-cyan-50/70 border border-cyan-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-cyan-900">
                  <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
                  <span>SHA-256 Evidence Block</span>
                </div>
                <p className="text-[11px] text-cyan-800 leading-relaxed">
                  Clinical logs are sealed with cryptographic hashes into an immutable blockchain ledger (<span className="font-mono font-bold">EV-ICU-...</span>).
                </p>
                <div className="pt-1 text-[10px] font-semibold text-cyan-700">
                  Linked to: <strong>Evidence & Integrity</strong>
                </div>
              </div>

              {/* Step 3: Alert Engine */}
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">3</span>
                  <span>Quality Alert Raised</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  If a mandatory step is bypassed or infection thresholds are breached, this alert is generated with root cause indicators.
                </p>
                <div className="pt-1 text-[10px] font-semibold text-rose-700">
                  Linked to: <strong>Live Alerts Center</strong>
                </div>
              </div>

              {/* Step 4: Standard */}
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">4</span>
                  <span>Standard Target</span>
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  The violation is mapped directly to a regulatory requirement (e.g. <span className="font-mono font-bold">NABH-COP.6</span> Medication Safety).
                </p>
                <div className="pt-1 text-[10px] font-semibold text-indigo-700">
                  Linked to: <strong>Accreditation Standards</strong>
                </div>
              </div>

              {/* Step 5: CAPA */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">5</span>
                  <span>Closed-Loop CAPA</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Click <strong>Convert to CAPA</strong> to assign responsible clinicians and track corrective remediation until verified.
                </p>
                <div className="pt-1 text-[10px] font-semibold text-emerald-700">
                  Linked to: <strong>Accreditation Kanban</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <EmptyState title="No Active Alerts" message="No quality alerts found for the selected department and filters." />
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const detectedCases = extractCaseIds(alert);
            const detectedEvidences = extractEvidenceIds(alert);
            const sourceInfo = getSourceMeta(alert.source);
            const SourceIcon = sourceInfo.icon;
            const isCapaLinked = alert.status === 'CAPA_CREATED' || !!alert.capaId;

            return (
              <div
                key={alert._id}
                className={`p-5 rounded-2xl border transition space-y-4 shadow-sm ${
                  alert.severity === 'CRITICAL'
                    ? 'bg-rose-50/30 border-rose-200'
                    : alert.severity === 'HIGH'
                    ? 'bg-amber-50/30 border-amber-200'
                    : 'bg-white border-sky-100'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={alert.severity} />
                    <h3 className="text-sm font-bold text-slate-900">{alert.title}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {alert.department}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 ${sourceInfo.color}`}>
                      <SourceIcon className="w-3 h-3" />
                      <span>{sourceInfo.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                    <StatusBadge status={alert.status} />
                  </div>
                </div>

                {/* Problem Statement & Description */}
                <div className="text-xs text-slate-700 leading-relaxed font-medium">
                  <span className="font-bold text-slate-900">Clinical Signal / Deviation: </span>
                  {alert.reason}
                </div>

                {/* Interactive Closed-Loop Lineage Strip */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-600" />
                    <span>Closed-Loop Traceability Nodes (Click Any Node to Inspect)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    {/* 1. Case ID Links */}
                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-blue-800 flex items-center gap-1">
                          <Hash className="w-3 h-3 text-blue-600" /> Patient Case(s)
                        </span>
                        <span className="text-[9px] font-semibold text-blue-600">Process Mining</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {detectedCases.length > 0 ? (
                          detectedCases.map(cId => (
                            <Link
                              key={cId}
                              to={`/process-mining?case=${encodeURIComponent(cId)}&department=${encodeURIComponent(alert.department)}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-blue-100 text-blue-900 font-mono font-bold text-[11px] border border-blue-300 shadow-2xs transition"
                              title={`Inspect patient pathway for Case ${cId} in Process Mining`}
                            >
                              <span>{cId}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-blue-600" />
                            </Link>
                          ))
                        ) : (
                          <span className="text-[11px] font-semibold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200" title="Applies to departmental census and bed telemetry">
                            Department Census Audit
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. Cryptographic Evidence Blocks */}
                    <div className="p-2.5 rounded-xl bg-cyan-50/70 border border-cyan-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-cyan-800 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-cyan-600" /> Evidence Blocks
                        </span>
                        <span className="text-[9px] font-semibold text-cyan-600">SHA-256 Ledger</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {detectedEvidences.length > 0 ? (
                          detectedEvidences.map(eId => (
                            <Link
                              key={eId}
                              to="/evidence"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-cyan-100 text-cyan-900 font-mono font-bold text-[11px] border border-cyan-300 shadow-2xs transition"
                              title={`Verify cryptographic seal for evidence block ${eId}`}
                            >
                              <span>{eId}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-cyan-600" />
                            </Link>
                          ))
                        ) : (
                          <Link
                            to="/evidence"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-900 hover:underline"
                          >
                            <span>Inspect Ledger</span>
                            <ExternalLink className="w-2.5 h-2.5 text-cyan-600" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* 3. Accreditation Standard */}
                    <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-indigo-800 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-indigo-600" /> Standard Clause
                        </span>
                        <span className="text-[9px] font-semibold text-indigo-600">Compliance</span>
                      </div>
                      <div>
                        <Link
                          to="/standards"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-indigo-100 text-indigo-900 font-mono font-bold text-[11px] border border-indigo-300 shadow-2xs transition"
                          title="View standard clause requirements in Accreditation Standards"
                        >
                          <span>{alert.standardCode || 'NABH-COP.6'}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-indigo-600" />
                        </Link>
                        <div className="text-[10px] text-indigo-700 mt-1 font-medium truncate">
                          Risk Impact: <span className="font-bold text-rose-600">+{alert.riskContribution || 18} pts</span>
                        </div>
                      </div>
                    </div>

                    {/* 4. Closed-Loop Remediation / Recommended CAPA */}
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-emerald-800 flex items-center gap-1">
                          <KanbanSquare className="w-3 h-3 text-emerald-600" /> Remediation Plan
                        </span>
                        <span className="text-[9px] font-semibold text-emerald-600">Kanban</span>
                      </div>
                      <div className="text-[11px] text-emerald-950 font-medium line-clamp-2" title={alert.recommendedCapa}>
                        {alert.recommendedCapa || 'Conduct clinical protocol refresher and supervisor gate.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cryptographic Evidence Trail Details */}
                {alert.evidence && alert.evidence.length > 0 && (
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-slate-400" />
                      <span>Detailed Cryptographic Evidence Log & Audit Findings:</span>
                    </div>
                    {alert.evidence.map((ev, idx) => (
                      <div key={idx} className="text-[11px] text-slate-700 flex items-start gap-1.5 font-medium leading-relaxed">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{ev}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>Engine Source: <strong className="text-slate-700 font-mono">{alert.source}</strong></span>
                    <span>•</span>
                    <Link
                      to="/evidence"
                      className="inline-flex items-center gap-1 font-semibold text-cyan-700 hover:text-cyan-900 hover:underline"
                    >
                      <Eye className="w-3 h-3" /> Audit Blockchain Ledger
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

                    {isCapaLinked ? (
                      <Link
                        to="/kanban"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>View in CAPA Kanban</span>
                      </Link>
                    ) : (
                      alert.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleOpenCapaModal(alert)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Convert to CAPA Plan</span>
                        </button>
                      )
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
            );
          })}
        </div>
      )}

      {/* Convert to CAPA Modal */}
      {capaModalAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <KanbanSquare className="w-4 h-4 text-blue-600" />
                <span>Convert Alert into Corrective Action (CAPA)</span>
              </h3>
              <button onClick={() => setCapaModalAlert(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">Signal Identified:</span>
              <div className="font-bold text-slate-900">{capaModalAlert.reason}</div>
              <div className="text-[11px] text-blue-700 font-semibold flex items-center gap-2 pt-1 border-t border-slate-200">
                <span>Department: <strong>{capaModalAlert.department}</strong></span>
                <span>•</span>
                <span>Standard: <strong>{capaModalAlert.standardCode || 'NABH-COP.6'}</strong></span>
                {extractCaseIds(capaModalAlert).length > 0 && (
                  <>
                    <span>•</span>
                    <span>Cases: <strong>{extractCaseIds(capaModalAlert).join(', ')}</strong></span>
                  </>
                )}
              </div>
            </div>

            <form onSubmit={handleCreateCapaFromAlert} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Corrective Remediation Action Plan *</label>
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
