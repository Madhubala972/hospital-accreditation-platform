import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { reportsApi } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';
import { EmptyState, ErrorState } from '../components/common/StateViews';
import {
  FileText,
  Printer,
  Download,
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

  // Fetch list of available audit dates
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
          Per NABH/JCI Hospital Accreditation Governance, official Executive Quality Audit Reports and Regulatory Certifications can <strong>only be accessed by Certified Auditors and the Dean</strong>.
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

        <p className="text-[11px] text-slate-500">
          💡 If you are an auditor or the Dean, please switch or sign in with your authorized credentials.
        </p>
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
    departmentAssessments,
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
                  <h2 className="text-lg font-bold text-slate-900">Executive Daily Accreditation & Quality Audit Reports</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    EVERYDAY AUDIT ARCHIVE
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select any daily shift audit to view or print official compliance verification and governance certifications.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowArchive(!showArchive)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-semibold border border-slate-200 hover:border-blue-200 transition shadow-sm"
            >
              <Archive className="w-4 h-4 text-blue-600" />
              <span>{showArchive ? 'Hide Archive' : 'Everyday Calendar Archive'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Audit Document</span>
            </button>
          </div>
        </div>

        {/* Quick Date Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-600 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" /> Daily Reports:
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

          {availableDates.length > 6 && (
            <select
              value={selectedDate}
              onChange={(e) => handleDateSelect(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 focus:outline-none focus:border-blue-500"
            >
              {availableDates.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.formattedDate} ({d.complianceIndex}% Compliance)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Everyday Archive Drawer / Grid View */}
      {showArchive && (
        <div className="bg-white border border-sky-100 rounded-2xl p-6 space-y-4 shadow-md print:hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Complete Everyday Audit Report Calendar</h3>
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

      {/* Printable Report Document Container */}
      <div className="bg-white border border-sky-100 rounded-2xl p-8 sm:p-12 space-y-8 shadow-md text-slate-800 print:bg-white print:text-black print:border-none print:p-0">
        {/* Report Header */}
        <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-blue-600 font-bold uppercase tracking-widest mb-1">
              Official Quality Intelligence Document
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {reportTitle}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
              <span>Standard: <strong className="text-slate-700">{accreditationStandardFramework}</strong></span>
              <span>•</span>
              <span>Scope: <strong className="text-slate-700">{auditScope}</strong></span>
              <span>•</span>
              <span className="text-blue-700 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Audit Date: {auditDateFormatted || auditDate}
              </span>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500 font-mono space-y-1">
            <div>Report ID: <strong className="text-slate-900">{reportId}</strong></div>
            <div>Generated: {new Date(generatedAt).toLocaleString()}</div>
            <div>Shift Auditor: <strong className="text-slate-700">{shiftAuditor}</strong></div>
          </div>
        </div>

        {/* Shift Audit Log Note */}
        {shiftNote && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900">Daily Operational Shift Log Note: </span>
              <span>{shiftNote}</span>
            </div>
          </div>
        )}

        {/* Executive Certification Readiness Banner */}
        <div className={`p-5 rounded-2xl border ${
          governanceCertification.status === 'ACCREDITATION_READY'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm mb-1 text-emerald-800">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Accreditation Status: {governanceCertification.status.replace('_', ' ')}</span>
          </div>
          <p className="text-xs leading-relaxed opacity-95">
            {governanceCertification.recommendation}
          </p>
        </div>

        {/* Key Operational KPI Summary */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            I. Key Hospital Quality Indicators for {auditDateFormatted || auditDate}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] text-slate-500">Compliance Index</div>
              <div className="text-2xl font-black text-blue-700 mt-1">{executiveSummary.hospitalComplianceIndex}%</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] text-slate-500">Average Risk Score</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{executiveSummary.averageRiskScore} / 100</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] text-slate-500">Bed Occupancy Mean</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{executiveSummary.averageOccupancyRate}%</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] text-slate-500">CAPA Resolution Rate</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">{executiveSummary.capaCompletionRate}%</div>
            </div>
          </div>
        </div>

        {/* Departmental Assessment Table */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            II. Departmental Risk & Conformance Evaluations
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Department</th>
                  <th className="p-3">Risk Assessment</th>
                  <th className="p-3">Bed Occupancy</th>
                  <th className="p-3">Avg Wait Time</th>
                  <th className="p-3">Infection Rate</th>
                  <th className="p-3">Protocol Conformance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departmentAssessments.map((dept) => (
                  <tr key={dept.department} className="hover:bg-blue-50/30">
                    <td className="p-3 font-bold text-slate-900">{dept.department}</td>
                    <td className="p-3">
                      <RiskBadge category={dept.riskCategory} score={dept.riskScore} size="sm" />
                    </td>
                    <td className="p-3 font-mono text-slate-700">{dept.occupancyRate}%</td>
                    <td className="p-3 font-mono text-slate-700">{dept.avgWaitingTime} mins</td>
                    <td className="p-3 font-mono text-slate-700">{dept.infectionRate}%</td>
                    <td className="p-3 font-mono font-bold text-blue-700">{dept.pathwayConformance}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Closed-Loop Corrective Actions (CAPA) Summary */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            III. Corrective & Preventive Actions (CAPA) Verification Audit
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
                    Assigned to: {c.responsiblePerson} | Deadline: {new Date(c.deadline).toLocaleDateString()}
                  </div>
                </div>
                {c.improvementPercentage && (
                  <div className="text-emerald-700 font-bold text-xs whitespace-nowrap bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                    +{c.improvementPercentage}% Verified Imprv.
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
            <div className="text-slate-500">Chief Medical Officer:</div>
            <div className="font-serif italic text-slate-800 text-sm border-b border-slate-300 pb-1">Dr. Robert Thorne</div>
          </div>
        </div>
      </div>
    </div>
  );
}
