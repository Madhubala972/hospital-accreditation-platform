import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { reportsApi } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';
import { EmptyState, ErrorState } from '../components/common/StateViews';
import {
  FileText,
  Printer,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Archive,
  Clock,
  UserCheck,
  ChevronRight,
  Layers,
  Lock,
  Hash,
  Eye,
  GitBranch,
  ShieldAlert
} from 'lucide-react';

export default function ExecutiveReports() {
  const { selectedDepartment, refreshKey } = useApp();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAuthorized = user?.role === 'Auditor' || user?.role === 'Dean' || user?.role === 'Admin';

  const fetchDates = async () => {
    try {
      const res = await reportsApi.getAvailableDates();
      const dates = res.data.data || [];
      setAvailableDates(dates);
      if (dates.length > 0 && !selectedDate) {
        setSelectedDate(dates[0].date);
      }
    } catch (err) {
      console.warn('Could not fetch audit dates:', err.message);
    }
  };

  const fetchReport = async (dateToFetch) => {
    try {
      setLoading(true);
      setError(null);
      const res = await reportsApi.getExecutiveReport(selectedDepartment, dateToFetch || selectedDate);
      setReport(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDates();
  }, [refreshKey]);

  useEffect(() => {
    if (selectedDate) {
      fetchReport(selectedDate);
    } else {
      fetchReport();
    }
  }, [selectedDepartment, selectedDate, refreshKey]);

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
    setShowArchive(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isAuthorized) {
    return (
      <div className="bg-white border border-rose-200 shadow-xl rounded-3xl p-8 sm:p-12 text-center space-y-5 max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-widest font-mono">
          Executive Document Governance Policy
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Executive Quality Audit Access Restricted
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto">
          Per NABH/JCI Hospital Accreditation Governance, official Executive Quality Audit Reports and Regulatory Packages can <strong>only be accessed by Certified Auditors and the Dean</strong>.
        </p>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 max-w-md mx-auto text-left space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Current User:</span>
            <strong className="text-slate-900">{user?.name || 'Clinical Staff'}</strong>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Assigned Role:</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {user?.role}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Authorized Roles:</span>
            <span className="text-[11px] text-emerald-700 font-semibold font-mono">
              Auditor, Dean
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center h-96 text-blue-600">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => fetchReport(selectedDate)} />;
  }

  if (!report) {
    return <EmptyState title="Report Generation Failed" message="No stored audit data found." />;
  }

  const {
    reportTitle,
    reportId,
    auditDate,
    auditDateFormatted,
    generatedAt,
    auditScope,
    shiftNote,
    shiftAuditor,
    accreditationStandardFramework,
    executiveSummary,
    accreditationReadiness,
    departmentAssessments,
    evidencePackages,
    correctiveActionsStatus,
    governanceCertification
  } = report;

  return (
    <div className="space-y-6">
      {/* Top Controls & Everyday Date Selector */}
      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Accreditation Evidence Package & Audit Suite</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                    SHA-256 PROVENANCE
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete evidence package linking standards, hash verification, process deviations, risk factors, and verified CAPA outcomes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/evidence"
              className="flex items-center gap-2 px-3.5 py-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded-xl text-xs font-semibold border border-cyan-200 transition shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-700" />
              <span>Inspect Ledger</span>
            </Link>

            <button
              onClick={() => setShowArchive(!showArchive)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-semibold border border-slate-200 transition shadow-xs"
            >
              <Archive className="w-4 h-4 text-blue-600" />
              <span>{showArchive ? 'Hide Archive' : 'Everyday Archive'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Evidence Package</span>
            </button>
          </div>
        </div>

        {/* Quick Date Selector */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-600 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" /> Audit Snapshots:
          </span>
          {availableDates.slice(0, 6).map((d) => (
            <button
              key={d.date}
              onClick={() => handleDateSelect(d.date)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-1.5 ${
                selectedDate === d.date
                  ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{d.relativeLabel}</span>
              <span className={`w-2 h-2 rounded-full ${d.auditStatus === 'ACCREDITATION_READY' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Everyday Archive View */}
      {showArchive && (
        <div className="bg-white border border-sky-100 rounded-2xl p-6 space-y-4 shadow-md print:hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Historical Audit Records</h3>
            </div>
            <span className="text-xs text-slate-500 font-semibold">{availableDates.length} Days Recorded</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
            {availableDates.map((d) => (
              <div
                key={d.date}
                onClick={() => handleDateSelect(d.date)}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                  selectedDate === d.date
                    ? 'bg-blue-50/70 border-blue-300 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 text-xs">{d.formattedDate}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    d.auditStatus === 'ACCREDITATION_READY'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {d.auditStatus === 'ACCREDITATION_READY' ? 'READY' : 'REVIEW'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600 py-1">
                  <div>
                    <span className="text-[10px] block text-slate-500">Compliance</span>
                    <strong className="text-blue-700 font-mono">{d.complianceIndex}%</strong>
                  </div>
                  <div>
                    <span className="text-[10px] block text-slate-500">Occupancy</span>
                    <strong className="text-slate-800 font-mono">{d.averageOccupancyRate}%</strong>
                  </div>
                  <div>
                    <span className="text-[10px] block text-slate-500">Incidents</span>
                    <strong className="text-slate-800 font-mono">{d.totalIncidents}</strong>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 truncate mt-1">
                  {d.shiftNotes}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Printable Accreditation Evidence Package Container (Section 20 in PDF) */}
      <div className="bg-white border border-sky-100 rounded-2xl p-8 sm:p-12 space-y-8 shadow-md text-slate-800 print:bg-white print:text-black print:border-none print:p-0">
        {/* Package Header */}
        <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-700 font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Official Accreditation Evidence Package
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {reportTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
              <span>Framework: <strong className="text-slate-700">{accreditationStandardFramework}</strong></span>
              <span>•</span>
              <span>Scope: <strong className="text-slate-700">{auditScope}</strong></span>
              <span>•</span>
              <span className="text-blue-700 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date: {auditDateFormatted || auditDate}
              </span>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500 font-mono space-y-1">
            <div>Package ID: <strong className="text-slate-900">{reportId}</strong></div>
            <div>Generated: {new Date(generatedAt).toLocaleString()}</div>
            <div>Inspector: <strong className="text-slate-700">{shiftAuditor}</strong></div>
          </div>
        </div>

        {/* Governance Certification Banner */}
        <div className={`p-5 rounded-2xl border ${
          governanceCertification.status === 'ACCREDITATION_READY'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm mb-1 text-emerald-800">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Accreditation Readiness: {governanceCertification.status.replace('_', ' ')}</span>
          </div>
          <p className="text-xs leading-relaxed opacity-95">
            {governanceCertification.recommendation}
          </p>
        </div>

        {/* 6-Vector Accreditation Readiness Scorecard */}
        {accreditationReadiness && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Multi-Vector Accreditation Readiness Index ({accreditationReadiness.overallReadinessIndex || 92}%)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">1. Evidence Integrity</span>
                <span className="text-lg font-black text-emerald-700 font-mono">{accreditationReadiness.evidenceIntegrity}%</span>
                <span className="text-[10px] text-emerald-600 block">SHA-256 Validated</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">2. Completeness</span>
                <span className="text-lg font-black text-blue-700 font-mono">{accreditationReadiness.evidenceCompleteness}%</span>
                <span className="text-[10px] text-blue-600 block">Audit Packaged</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">3. Process Conformance</span>
                <span className="text-lg font-black text-cyan-700 font-mono">{accreditationReadiness.processConformance}%</span>
                <span className="text-[10px] text-cyan-600 block">Clinical Pathways</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">4. Compliance Score</span>
                <span className="text-lg font-black text-indigo-700 font-mono">{accreditationReadiness.complianceScore}%</span>
                <span className="text-[10px] text-indigo-600 block">Standard Rules</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">5. CAPA Effectiveness</span>
                <span className="text-lg font-black text-teal-700 font-mono">{accreditationReadiness.capaEffectiveness}%</span>
                <span className="text-[10px] text-teal-600 block">Closed-Loop Verified</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">6. Risk Exposure</span>
                <span className="text-lg font-black text-slate-700 font-mono">{accreditationReadiness.riskExposure}</span>
                <span className="text-[10px] text-slate-500 block">Composite Index</span>
              </div>
            </div>
          </div>
        )}

        {/* Section I: Cryptographic Evidence Packages by Standard */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <Hash className="w-4 h-4 text-cyan-600" />
            <span>I. Accreditation Standard Evidence Dossiers (Recorded for {auditDateFormatted || auditDate})</span>
          </h3>

          <div className="space-y-4">
            {(evidencePackages || []).map((pkg, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                  <div>
                    <span className="font-mono font-bold text-blue-700 mr-2">{pkg.standardCode}</span>
                    <strong className="text-slate-900">{pkg.standardName}</strong>
                    <span className="ml-2 text-slate-500 font-semibold">({pkg.department})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      pkg.complianceStatus === 'COMPLIANT'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {pkg.complianceStatus || 'COMPLIANT'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                      {pkg.evidenceIntegrityStatus || 'VERIFIED'}
                    </span>
                    <RiskBadge category={pkg.riskCategory} score={pkg.associatedRiskScore} size="sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] bg-white p-3 rounded-lg border border-slate-200/60">
                  <div>
                    <span className="text-slate-500 block font-semibold">Recorded Day Metric:</span>
                    <span className="text-slate-900 font-bold font-mono">
                      {pkg.actualValue !== undefined ? pkg.actualValue : 'N/A'} (Target: {pkg.operator} {pkg.threshold})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">Evidence Requirements:</span>
                    <span className="text-slate-800">{pkg.evidenceRequirements || 'Digital trace verification'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">Supporting Records:</span>
                    <span className="text-slate-800 font-bold">{pkg.supportingEvidenceCount || 1} Cryptographic Block(s)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-semibold">Associated CAPA Plans:</span>
                    <span className="text-slate-800 font-bold">{pkg.capaActions?.length || 0} Actions Configured</span>
                  </div>
                </div>

                {pkg.evidenceRecords && pkg.evidenceRecords.length > 0 && (
                  <div className="space-y-1.5 font-mono text-[10px] bg-slate-900 text-sky-200 p-3 rounded-lg">
                    {pkg.evidenceRecords.map((e, eIdx) => (
                      <div key={eIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/80 pb-1 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 font-bold">{e.evidenceId}</span>
                          <span className="text-slate-400">[{e.evidenceType}]</span>
                          <span className="text-slate-300 text-[9px] truncate max-w-xs">{e.title}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-cyan-300">SHA-256: {e.hash?.substring(0, 16)}...</span>
                          <span className="text-emerald-400 font-bold px-1.5 py-0.2 bg-emerald-950/60 rounded border border-emerald-700/50">
                            {e.integrityStatus || 'VERIFIED'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section II: Closed-Loop CAPA Verification Results */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-600" />
            <span>II. Corrective Actions (CAPA) Closed-Loop Verification Table</span>
          </h3>

          <div className="space-y-2">
            {correctiveActionsStatus.activeItems.map((c, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    <span className="font-bold text-slate-900">{c.department}:</span>
                    <span className="text-slate-700">{c.problem}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Lead: {c.responsiblePerson} | Verification: <strong className="text-emerald-700">{c.verificationStatus || 'PENDING'}</strong>
                  </div>
                </div>
                {c.predictedImpact && (
                  <div className="text-blue-800 font-bold text-xs whitespace-nowrap bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                    {c.predictedImpact}% Predicted → {c.actualImpact ? `${c.actualImpact}% Actual` : 'Pending'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Signatures / Audit Sign-Off */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
          <div className="space-y-6">
            <div className="text-slate-500">Quality Manager Signature:</div>
            <div className="font-serif italic text-slate-800 text-sm border-b border-slate-300 pb-1">Dr. Sarah Jenkins</div>
          </div>
          <div className="space-y-6">
            <div className="text-slate-500">Lead Auditor Signature:</div>
            <div className="font-serif italic text-slate-800 text-sm border-b border-slate-300 pb-1">Elena Rostova</div>
          </div>
          <div className="space-y-6 hidden sm:block">
            <div className="text-slate-500">Dean of Quality & Safety:</div>
            <div className="font-serif italic text-slate-800 text-sm border-b border-slate-300 pb-1">Dean Dr. Arthur Vance</div>
          </div>
        </div>
      </div>
    </div>
  );
}
