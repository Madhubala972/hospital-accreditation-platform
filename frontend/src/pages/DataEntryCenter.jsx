import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { metricsApi, pathwaysApi, alertsApi } from '../services/api';
import {
  FilePlus2,
  GitCommit,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Send,
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
  Zap,
  ArrowRight,
  Siren,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Building2,
  Lock
} from 'lucide-react';

const STANDARD_ACTIVITIES = [
  'Admission',
  'Triage',
  'Lab',
  'Nursing Intake',
  'Physician Rounds',
  'Medication Verification',
  'Bedside Medication Scan',
  'Treatment',
  'Emergency Examination',
  'Pre-Op Assessment',
  'Anesthesia Check',
  'Surgical Safety Checklist',
  'Surgical Procedure',
  'Post-Op Recovery',
  'Discharge Reconciliation',
  'Discharge Planning'
];

export default function DataEntryCenter() {
  const { selectedDepartment, notify, triggerRefresh, triggerSituationPopup } = useApp();
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' | 'pathway' | 'situation'

  // Metric Form State
  const [metricForm, setMetricForm] = useState({
    department: selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'ICU',
    occupancyRate: 85,
    avgWaitingTime: 35,
    infectionRate: 1.8,
    staffingLevel: 0.33,
    incidentCount: 1,
    pathwayConformance: 88,
    notes: ''
  });
  const [metricSubmitting, setMetricSubmitting] = useState(false);
  const [metricResult, setMetricResult] = useState(null);

  const getNowLocalDateTime = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  // Pathway Form State
  const [pathwayForm, setPathwayForm] = useState({
    caseId: `CASE-${Math.floor(1000 + Math.random() * 9000)}`,
    department: selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'ICU',
    admissionDiagnosis: 'Observation / Monitoring',
    admissionDateTime: getNowLocalDateTime(),
    events: [
      { activity: 'Admission', resource: 'Triage Nurse', durationMinutes: 10 },
      { activity: 'Triage', resource: 'Duty Doctor', durationMinutes: 15 },
      { activity: 'Lab', resource: 'Lab Tech', durationMinutes: 20 },
      { activity: 'Medication Verification', resource: 'Lead Pharmacist', durationMinutes: 10 },
      { activity: 'Treatment', resource: 'Attending Physician', durationMinutes: 45 }
    ]
  });
  const [pathwaySubmitting, setPathwaySubmitting] = useState(false);
  const [pathwayResult, setPathwayResult] = useState(null);

  // Critical Situation & Safety Incident Form State (Separate Block)
  const [situationForm, setSituationForm] = useState({
    department: selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'ICU',
    title: 'Central Line-Associated Bloodstream Infection (CLABSI) Alarm',
    severity: 'CRITICAL',
    standardCode: 'HIC.2',
    reason: 'Elevated procalcitonin & positive catheter-tip culture in Bed 04. Bundle protocol breach detected.',
    remediation: 'Immediate catheter removal, blood cultures x2, broad-spectrum IV antimicrobials started, ICU clinical audit ordered.',
    reportedBy: 'Dr. Arthur Vance (ICU Intensivist)',
    incidentDateTime: getNowLocalDateTime()
  });
  const [situationSubmitting, setSituationSubmitting] = useState(false);
  const [situationResult, setSituationResult] = useState(null);

  // Quick Preset Handlers for 1-Click Fast Data Entry
  const applyMetricPreset = (type) => {
    if (type === 'OPTIMAL') {
      setMetricForm({
        department: selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'ICU',
        occupancyRate: 78.5,
        avgWaitingTime: 14,
        infectionRate: 0.9,
        staffingLevel: 0.42,
        incidentCount: 0,
        pathwayConformance: 96.5,
        notes: 'Optimal shift performance: Full protocol conformance achieved.'
      });
      notify('Loaded Optimal Shift Preset', 'info');
    } else if (type === 'SURGE') {
      setMetricForm({
        department: selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'Emergency',
        occupancyRate: 94.0,
        avgWaitingTime: 48,
        infectionRate: 2.8,
        staffingLevel: 0.28,
        incidentCount: 3,
        pathwayConformance: 78.0,
        notes: 'High Surge Conditions: Unit capacity exceeded, wait times elevated.'
      });
      notify('Loaded High-Surge Stress Preset', 'info');
    } else if (type === 'NORMAL') {
      setMetricForm({
        department: selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'Surgery',
        occupancyRate: 82.0,
        avgWaitingTime: 22,
        infectionRate: 1.4,
        staffingLevel: 0.35,
        incidentCount: 1,
        pathwayConformance: 91.0,
        notes: 'Standard accredited operating range.'
      });
      notify('Loaded Standard Accredited Preset', 'info');
    } else if (type === 'WARD') {
      setMetricForm({
        department: selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'General Ward',
        occupancyRate: 84.0,
        avgWaitingTime: 24,
        infectionRate: 1.1,
        staffingLevel: 0.38,
        incidentCount: 1,
        pathwayConformance: 92.5,
        notes: 'General Medical Ward: Routine shift operations, high bed census turnover.'
      });
      notify('Loaded General Ward Quality Preset', 'info');
    }
  };

  const applyPathwayPreset = (type) => {
    const padNum = Math.floor(100 + Math.random() * 900);
    if (type === 'ICU_COMPLIANT') {
      setPathwayForm({
        caseId: `ICU-CASE-${padNum}`,
        department: 'ICU',
        admissionDiagnosis: 'Post-Op Critical Care Surveillance',
        admissionDateTime: getNowLocalDateTime(),
        events: [
          { activity: 'Admission', resource: 'ICU Triage Nurse', durationMinutes: 10 },
          { activity: 'Triage', resource: 'Dr. Arthur Vance', durationMinutes: 15 },
          { activity: 'Lab Cultures', resource: 'Microbiology Lab', durationMinutes: 20 },
          { activity: 'Central Line Sterile Dressing', resource: 'ICU Clinical Nurse', durationMinutes: 15 },
          { activity: 'Medication Verification', resource: 'Dual Clinician Sign-Off', durationMinutes: 10 },
          { activity: 'Treatment', resource: 'Attending Intensivist', durationMinutes: 30 }
        ]
      });
      notify('Loaded ICU 100% Compliant Protocol Preset', 'info');
    } else if (type === 'ICU_DEVIATED') {
      setPathwayForm({
        caseId: `ICU-DEV-${padNum}`,
        department: 'ICU',
        admissionDiagnosis: 'Acute Respiratory Distress',
        admissionDateTime: getNowLocalDateTime(),
        events: [
          { activity: 'Admission', resource: 'ICU Triage Nurse', durationMinutes: 10 },
          { activity: 'Triage', resource: 'Dr. Arthur Vance', durationMinutes: 15 },
          { activity: 'Lab Cultures', resource: 'Microbiology Lab', durationMinutes: 20 },
          { activity: 'Central Line Sterile Dressing', resource: 'ICU Clinical Nurse', durationMinutes: 15 },
          { activity: 'Treatment', resource: 'Attending Intensivist', durationMinutes: 30 }
        ]
      });
      notify('Loaded ICU Deviated Preset (Missing Medication Verification)', 'info');
    } else if (type === 'EMERGENCY_FAST') {
      setPathwayForm({
        caseId: `EME-FAST-${padNum}`,
        department: 'Emergency',
        admissionDiagnosis: 'Acute Chest Pain / Trauma',
        admissionDateTime: getNowLocalDateTime(),
        events: [
          { activity: 'Registration', resource: 'Admissions Desk', durationMinutes: 5 },
          { activity: 'Acuity Triage', resource: 'Triage Sister', durationMinutes: 10 },
          { activity: 'Emergency Physician Assessment', resource: 'ER Consultant', durationMinutes: 15 },
          { activity: 'Diagnostic Imaging', resource: 'Radiology Bay 2', durationMinutes: 20 },
          { activity: 'Medication Verification', resource: 'Clinical Pharmacist', durationMinutes: 10 },
          { activity: 'Disposition', resource: 'Transfer Team', durationMinutes: 15 }
        ]
      });
      notify('Loaded Emergency Fast-Track Protocol Preset', 'info');
    } else if (type === 'SURGERY_CHECKLIST') {
      setPathwayForm({
        caseId: `SUR-OT-${padNum}`,
        department: 'Surgery',
        admissionDiagnosis: 'Laparoscopic Appendectomy',
        admissionDateTime: getNowLocalDateTime(),
        events: [
          { activity: 'Pre-Op Assessment', resource: 'Anesthesiologist', durationMinutes: 15 },
          { activity: 'Site Marking & Consent', resource: 'Lead Surgeon', durationMinutes: 10 },
          { activity: 'Anesthesia Check', resource: 'Anesthesia Registrar', durationMinutes: 15 },
          { activity: 'WHO Surgical Safety Checklist', resource: 'Circulating Nurse', durationMinutes: 10 },
          { activity: 'Surgical Procedure', resource: 'Surgical Team', durationMinutes: 60 },
          { activity: 'Post-Op Recovery', resource: 'PACU Staff', durationMinutes: 30 }
        ]
      });
      notify('Loaded Surgery WHO Safety Checklist Preset', 'info');
    } else if (type === 'WARD_COMPLIANT') {
      setPathwayForm({
        caseId: `GEN-CASE-${padNum}`,
        department: 'General Ward',
        admissionDiagnosis: 'Inpatient Post-Surgical Convalescence',
        admissionDateTime: getNowLocalDateTime(),
        events: [
          { activity: 'Admission', resource: 'Admissions Desk', durationMinutes: 10 },
          { activity: 'Nursing Intake', resource: 'Primary Ward Sister', durationMinutes: 15 },
          { activity: 'Physician Rounds', resource: 'Attending Physician', durationMinutes: 20 },
          { activity: 'Bedside Medication Scan', resource: 'Handheld Barcode Scanner', durationMinutes: 10 },
          { activity: 'Discharge Reconciliation', resource: 'Lead Clinical Pharmacist', durationMinutes: 15 }
        ]
      });
      notify('Loaded General Ward 100% Compliant Protocol Preset', 'info');
    } else if (type === 'WARD_DEVIATED') {
      setPathwayForm({
        caseId: `GEN-DEV-${padNum}`,
        department: 'General Ward',
        admissionDiagnosis: 'Exacerbation of Chronic Bronchitis',
        admissionDateTime: getNowLocalDateTime(),
        events: [
          { activity: 'Admission', resource: 'Admissions Desk', durationMinutes: 10 },
          { activity: 'Nursing Intake', resource: 'Primary Ward Sister', durationMinutes: 15 },
          { activity: 'Physician Rounds', resource: 'Attending Physician', durationMinutes: 20 }
        ]
      });
      notify('Loaded General Ward Deviated Preset (Missing Barcode Scan & Discharge)', 'info');
    }
  };

  const handleMetricSubmit = async (e) => {
    e.preventDefault();
    try {
      setMetricSubmitting(true);
      setMetricResult(null);
      const res = await metricsApi.createMetric(metricForm);
      setMetricResult(res.data);
      notify(`Operational metrics for ${metricForm.department} saved! All views updated instantly.`, 'success');
      triggerRefresh();
    } catch (err) {
      notify(`Failed to save metrics: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setMetricSubmitting(false);
    }
  };

  const handleAddEvent = () => {
    setPathwayForm({
      ...pathwayForm,
      events: [
        ...pathwayForm.events,
        { activity: 'Treatment', resource: 'Clinical Staff', durationMinutes: 15 }
      ]
    });
  };

  const handleRemoveEvent = (idx) => {
    const updated = pathwayForm.events.filter((_, i) => i !== idx);
    setPathwayForm({ ...pathwayForm, events: updated });
  };

  const handleEventChange = (idx, field, val) => {
    const updated = [...pathwayForm.events];
    updated[idx][field] = val;
    setPathwayForm({ ...pathwayForm, events: updated });
  };

  const handlePathwaySubmit = async (e) => {
    e.preventDefault();
    try {
      setPathwaySubmitting(true);
      setPathwayResult(null);
      const startMs = new Date(pathwayForm.admissionDateTime || Date.now()).getTime();
      let currentMs = startMs;
      
      const computedEvents = pathwayForm.events.map((ev) => {
        const stepTime = new Date(currentMs);
        currentMs += (Number(ev.durationMinutes) || 15) * 60000;
        return {
          activity: ev.activity,
          resource: ev.resource || `${pathwayForm.department} Staff`,
          durationMinutes: Number(ev.durationMinutes) || 15,
          status: 'COMPLETED',
          timestamp: stepTime
        };
      });

      const payload = {
        caseId: pathwayForm.caseId,
        department: pathwayForm.department,
        admissionDiagnosis: pathwayForm.admissionDiagnosis,
        timestamp: new Date(startMs),
        events: computedEvents
      };

      const res = await pathwaysApi.createTrace(payload);
      setPathwayResult(res.data?.data || payload);
      notify(`Trace ${pathwayForm.caseId} recorded! Process Mining updated instantly.`, 'success');
      triggerRefresh();
      // Generate new unique Case ID
      setPathwayForm({
        ...pathwayForm,
        caseId: `${pathwayForm.department.slice(0, 3).toUpperCase()}-CASE-${Date.now().toString().slice(-4)}`,
        admissionDateTime: getNowLocalDateTime()
      });
    } catch (err) {
      notify(`Failed to log pathway trace: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setPathwaySubmitting(false);
    }
  };

  const applySituationPreset = (type) => {
    if (type === 'ICU_CLABSI') {
      setSituationForm({
        department: 'ICU',
        title: 'Central Line-Associated Bloodstream Infection (CLABSI) Alarm',
        severity: 'CRITICAL',
        standardCode: 'HIC.2',
        reason: 'Elevated procalcitonin & positive catheter-tip culture in Bed 04. Bundle protocol breach detected.',
        remediation: 'Immediate catheter removal, blood cultures x2, broad-spectrum IV antimicrobials started, ICU clinical audit ordered.',
        reportedBy: 'Dr. Arthur Vance (ICU Intensivist)',
        incidentDateTime: getNowLocalDateTime()
      });
      notify('Loaded ICU CLABSI Incident Preset', 'info');
    } else if (type === 'CARDIO_ECG') {
      setSituationForm({
        department: 'Cardiology',
        title: 'Delayed Door-to-Balloon STEMI Escalation',
        severity: 'HIGH',
        standardCode: 'COP.6',
        reason: 'Cath lab mobilization delay of 24 minutes exceeding 90-minute benchmark during off-hours emergency intake.',
        remediation: 'Emergency on-call cardiac team dispatched, intervention successful, root-cause team briefing scheduled.',
        reportedBy: 'Dr. Priya Sharma (Interventional Cardiologist)',
        incidentDateTime: getNowLocalDateTime()
      });
      notify('Loaded Cardiology STEMI Latency Preset', 'info');
    } else if (type === 'ER_OVERFLOW') {
      setSituationForm({
        department: 'Emergency',
        title: 'Severe Emergency Department Surge & Triage Divert Risk',
        severity: 'CRITICAL',
        standardCode: 'COP.1',
        reason: 'ED bed occupancy at 145%, critical care resuscitation bays full, ambulance triage wait exceeding 45 minutes.',
        remediation: 'Activated Hospital Disaster Surge Plan Stage 2, decanted 6 stable ward beds, expedited pending discharges.',
        reportedBy: 'Dr. Marcus Brody (ED Medical Director)',
        incidentDateTime: getNowLocalDateTime()
      });
      notify('Loaded Emergency Room Surge Overflow Preset', 'info');
    } else if (type === 'SURGERY_TIMEOUT') {
      setSituationForm({
        department: 'Surgery',
        title: 'WHO Surgical Safety Sign-In Pause Non-Compliance',
        severity: 'HIGH',
        standardCode: 'IPSG.4',
        reason: 'Surgical incision begun prior to full circulating nurse time-out verification in OT-3.',
        remediation: 'Immediate procedure hold called, full checklist verification executed with dual confirmation, incident logged.',
        reportedBy: 'Sister Martha Jenkins (OT Head Nurse)',
        incidentDateTime: getNowLocalDateTime()
      });
      notify('Loaded Surgical Safety Checklist Omission Preset', 'info');
    } else if (type === 'WARD_BARCODE') {
      setSituationForm({
        department: 'General Ward',
        title: 'High-Alert Medication Barcode Scanning Bypass',
        severity: 'MEDIUM',
        standardCode: 'MOM.5',
        reason: 'IV Potassium infusion administered manually without standard handheld barcode medication scan verification.',
        remediation: 'Infusion halted, dosage cross-checked with pharmacy, handheld scanner re-calibrated and replaced.',
        reportedBy: 'Staff Nurse R. Dave (Ward 4B)',
        incidentDateTime: getNowLocalDateTime()
      });
      notify('Loaded Medication Safety Scan Bypass Preset', 'info');
    }
  };

  const handleSituationSubmit = async (e) => {
    e.preventDefault();
    try {
      setSituationSubmitting(true);
      setSituationResult(null);

      const payload = {
        department: situationForm.department,
        title: situationForm.title,
        severity: situationForm.severity,
        standardCode: situationForm.standardCode,
        reason: situationForm.reason,
        recommendedCapa: situationForm.remediation,
        reportedBy: situationForm.reportedBy,
        incidentDate: situationForm.incidentDateTime ? new Date(situationForm.incidentDateTime) : new Date()
      };

      const res = await alertsApi.createAlert(payload);
      const alertData = res.data?.data || res.data;
      const evidenceId = res.data?.evidenceId || alertData?.supportingEvidenceIds?.[0];
      const resultObj = {
        ...alertData,
        evidenceId,
        riskSummary: res.data?.riskSummary
      };

      setSituationResult(resultObj);
      notify(`Critical situation logged! Sealed Evidence #${evidenceId} minted in blockchain ledger.`, 'success');
      triggerRefresh();

      // Trigger the medium-sized popup anchored on the right side!
      triggerSituationPopup({
        ...alertData,
        evidenceId,
        supportingEvidenceIds: evidenceId ? [evidenceId] : alertData.supportingEvidenceIds
      });
    } catch (err) {
      notify(`Failed to log critical situation: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setSituationSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <FilePlus2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Data Entry & Event Ingestion Center</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingest department quality indicators or clinical patient pathway event logs. Submission triggers instantaneous validation, MongoDB storage, and Python AI pipeline risk evaluation.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-3 mt-4 border-b border-slate-100 pb-2">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`text-xs font-bold pb-2 border-b-2 transition ${
              activeTab === 'metrics'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Hospital Operational & Quality Metrics
          </button>
          <button
            onClick={() => setActiveTab('pathway')}
            className={`text-xs font-bold pb-2 border-b-2 transition ${
              activeTab === 'pathway'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Patient Pathway Event Log Ingestion
          </button>
          <button
            onClick={() => setActiveTab('situation')}
            className={`text-xs font-bold pb-2 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'situation'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Siren className="w-3.5 h-3.5 text-rose-600" />
            <span>3. Critical Situations & Clinical Safety Incidents</span>
            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-mono rounded-full font-bold">
              ALERT
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Operational Metrics Form */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Ingest Shift Operational Indicators</h3>

            {/* Fast Presets Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Fast 1-Click Presets:
              </span>
              <button
                type="button"
                onClick={() => applyMetricPreset('OPTIMAL')}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 transition"
              >
                ⚡ Optimal Shift (ICU)
              </button>
              <button
                type="button"
                onClick={() => applyMetricPreset('SURGE')}
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200 transition"
              >
                ⚠️ Emergency Surge (Stress)
              </button>
              <button
                type="button"
                onClick={() => applyMetricPreset('NORMAL')}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold border border-blue-200 transition"
              >
                🛡️ Standard Normal (Surgery)
              </button>
              <button
                type="button"
                onClick={() => applyMetricPreset('WARD')}
                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold border border-teal-200 transition"
              >
                🏥 General Ward (Census)
              </button>
            </div>

            <form onSubmit={handleMetricSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Department *</label>
                  <select
                    value={metricForm.department}
                    onChange={(e) => setMetricForm({ ...metricForm, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bed Occupancy Rate (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={metricForm.occupancyRate}
                    onChange={(e) => setMetricForm({ ...metricForm, occupancyRate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Average Waiting Time (mins) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={metricForm.avgWaitingTime}
                    onChange={(e) => setMetricForm({ ...metricForm, avgWaitingTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Infection Rate (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    required
                    value={metricForm.infectionRate}
                    onChange={(e) => setMetricForm({ ...metricForm, infectionRate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Staffing Level (Nurse/Patient Ratio) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.05"
                    max="1.0"
                    required
                    value={metricForm.staffingLevel}
                    onChange={(e) => setMetricForm({ ...metricForm, staffingLevel: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Incident / Adverse Event Count *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={metricForm.incidentCount}
                    onChange={(e) => setMetricForm({ ...metricForm, incidentCount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Protocol Adherence (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={metricForm.pathwayConformance}
                  onChange={(e) => setMetricForm({ ...metricForm, pathwayConformance: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Shift Notes / Clinical Remarks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Night shift observed bed saturation due to emergency overflow."
                  value={metricForm.notes}
                  onChange={(e) => setMetricForm({ ...metricForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={metricSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{metricSubmitting ? 'Saving & Calculating Risk...' : 'Submit & Trigger Evaluation'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Real-time Validation & Feedback Panel */}
          <div className="bg-white border border-sky-100 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Workflow Automation Rule</span>
              </h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Core Workflow: Submitting new metrics saves to MongoDB, triggers Python anomaly detection & ML scoring, evaluates compliance against standards, and stores calculated risk once.
              </p>

              {metricResult && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Evaluation Successful</span>
                  </div>
                  <p className="text-slate-700">{metricResult.message}</p>
                  {metricResult.riskSummary && (
                    <div className="p-2 rounded bg-white border border-emerald-200 mt-2">
                      <div className="text-[11px] text-slate-500 font-semibold">Calculated Risk Score:</div>
                      <div className="font-bold text-blue-700 text-sm">{metricResult.riskSummary.score} / 100 ({metricResult.riskSummary.category})</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-600 p-3 rounded-xl bg-slate-50 border border-slate-200">
              💡 <span className="font-semibold text-slate-900">Tip:</span> To test ICU risk elevation, enter Occupancy &gt; 90% and Infection Rate &gt; 3.0%.
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Patient Pathway Event Ingestion */}
      {activeTab === 'pathway' && (
        <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Log Patient Trace Activities (PM4Py Event Ingestion)</h3>
              <p className="text-xs text-slate-500">Configure sequential clinical event trace for process conformance analysis.</p>
            </div>
            <button
              onClick={handleAddEvent}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-slate-200 hover:border-blue-200 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Step</span>
            </button>
          </div>

          {/* Fast Presets Bar for Pathway */}
          <div className="flex flex-wrap items-center gap-2 mb-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-600" /> Fast 1-Click Presets:
            </span>
            <button
              type="button"
              onClick={() => applyPathwayPreset('ICU_COMPLIANT')}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 transition"
            >
              ⚡ ICU 100% Compliant
            </button>
            <button
              type="button"
              onClick={() => applyPathwayPreset('ICU_DEVIATED')}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200 transition"
            >
              ⚠️ ICU Deviated (Skip Med Sign-Off)
            </button>
            <button
              type="button"
              onClick={() => applyPathwayPreset('EMERGENCY_FAST')}
              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold border border-blue-200 transition"
            >
              ⚡ Emergency Fast-Track
            </button>
            <button
              type="button"
              onClick={() => applyPathwayPreset('SURGERY_CHECKLIST')}
              className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold border border-purple-200 transition"
            >
              ⚡ Surgery WHO Safety Checklist
            </button>
            <button
              type="button"
              onClick={() => applyPathwayPreset('WARD_COMPLIANT')}
              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold border border-teal-200 transition"
            >
              🏥 General Ward Compliant
            </button>
            <button
              type="button"
              onClick={() => applyPathwayPreset('WARD_DEVIATED')}
              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 transition"
            >
              ⚠️ General Ward Deviated
            </button>
          </div>

          <form onSubmit={handlePathwaySubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Case Identifier *</label>
                <input
                  type="text"
                  required
                  value={pathwayForm.caseId}
                  onChange={(e) => setPathwayForm({ ...pathwayForm, caseId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                <select
                  value={pathwayForm.department}
                  onChange={(e) => setPathwayForm({ ...pathwayForm, department: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-bold focus:outline-none focus:border-blue-500"
                >
                  {['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" /> Admission Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={pathwayForm.admissionDateTime}
                  onChange={(e) => setPathwayForm({ ...pathwayForm, admissionDateTime: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Admission Diagnosis</label>
                <input
                  type="text"
                  value={pathwayForm.admissionDiagnosis}
                  onChange={(e) => setPathwayForm({ ...pathwayForm, admissionDiagnosis: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Live Timing & Completion Preview Card */}
            {(() => {
              const startMs = new Date(pathwayForm.admissionDateTime || Date.now()).getTime();
              const totalMins = pathwayForm.events.reduce((acc, ev) => acc + (Number(ev.durationMinutes) || 0), 0);
              const endMs = startMs + totalMins * 60000;
              const startDate = new Date(startMs);
              const endDate = new Date(endMs);

              return (
                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Admission Timestamp</div>
                      <div className="font-bold text-slate-900 font-mono">
                        {isNaN(startDate.getTime()) ? 'Invalid Date' : startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Total Pathway Duration</div>
                      <div className="font-bold text-indigo-700 font-mono">
                        {totalMins} minutes ({pathwayForm.events.length} sequential stages)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Completed Timestamp</div>
                      <div className="font-bold text-emerald-700 font-mono">
                        {isNaN(endDate.getTime()) ? 'Invalid Date' : endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Sequential Steps List */}
            <div className="space-y-2 pt-2">
              <label className="block font-semibold text-slate-700">Clinical Pathway Sequence (In Order of Execution):</label>
              <div className="space-y-2">
                {pathwayForm.events.map((ev, idx) => {
                  let stepStartMins = 0;
                  for (let j = 0; j < idx; j++) {
                    stepStartMins += (Number(pathwayForm.events[j].durationMinutes) || 0);
                  }
                  const baseMs = new Date(pathwayForm.admissionDateTime || Date.now()).getTime();
                  const stepStartTime = new Date(baseMs + stepStartMins * 60000);
                  const stepEndTime = new Date(baseMs + (stepStartMins + (Number(ev.durationMinutes) || 0)) * 60000);

                  return (
                    <div
                      key={idx}
                      className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <span className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center font-mono font-bold text-blue-700 text-xs shadow-sm shrink-0">
                        {idx + 1}
                      </span>

                      <select
                        value={ev.activity}
                        onChange={(e) => handleEventChange(idx, 'activity', e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium flex-1 focus:outline-none focus:border-blue-500"
                      >
                        {STANDARD_ACTIVITIES.map((act) => (
                          <option key={act} value={act}>{act}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Resource (e.g. Lead Nurse)"
                        value={ev.resource}
                        onChange={(e) => handleEventChange(idx, 'resource', e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 w-36 focus:outline-none focus:border-blue-500"
                      />

                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          placeholder="Mins"
                          value={ev.durationMinutes}
                          onChange={(e) => handleEventChange(idx, 'durationMinutes', Number(e.target.value))}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 w-16 text-center font-mono focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-slate-500 text-[11px]">mins</span>
                      </div>

                      <div className="text-[10px] font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 shrink-0 whitespace-nowrap">
                        {isNaN(stepStartTime.getTime()) ? '' : stepStartTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) + ' - ' + stepEndTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>

                      {pathwayForm.events.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEvent(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={pathwaySubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                <GitCommit className="w-4 h-4" />
                <span>{pathwaySubmitting ? 'Logging & Checking Conformance...' : 'Record Trace & Run PM4Py Conformance'}</span>
              </button>
            </div>
          </form>

          {/* Instant Result Success Card */}
          {pathwayResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs mt-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Trace {pathwayResult.caseId} Ingested & Analyzed Instantly!</span>
                </div>
                <Link
                  to="/pathways"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition text-xs self-start sm:self-auto"
                >
                  <span>View in Process Mining & Trace Inspector</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <p className="text-slate-700 text-xs">
                Patient pathway was saved with verified timestamps. The PM4Py Conformance Engine and department readiness scores have updated across the platform.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Critical Situations & Clinical Safety Incidents (Dedicated Manual Entry Block) */}
      {activeTab === 'situation' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-rose-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Manual Critical Situation & Incident Logger</h3>
                  <p className="text-[11px] text-slate-500">
                    Immediately records critical patient safety deviations, updates departmental risk ratings, logs to staff audit trail, and generates an unalterable SHA-256 cryptographic evidence block.
                  </p>
                </div>
              </div>
            </div>

            {/* Fast 1-Click Situation Presets */}
            <div className="flex flex-wrap items-center gap-2 my-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> 1-Click Fast Presets:
              </span>
              <button
                type="button"
                onClick={() => applySituationPreset('ICU_CLABSI')}
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200 transition"
              >
                🚨 ICU CLABSI Alarm
              </button>
              <button
                type="button"
                onClick={() => applySituationPreset('CARDIO_ECG')}
                className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 text-[11px] font-bold border border-orange-200 transition"
              >
                ⚡ Cardio STEMI Delay
              </button>
              <button
                type="button"
                onClick={() => applySituationPreset('ER_OVERFLOW')}
                className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 text-[11px] font-bold border border-red-200 transition"
              >
                ⚠️ ER Surge Overflow
              </button>
              <button
                type="button"
                onClick={() => applySituationPreset('SURGERY_TIMEOUT')}
                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold border border-purple-200 transition"
              >
                🛡️ OT Safety Time-Out
              </button>
              <button
                type="button"
                onClick={() => applySituationPreset('WARD_BARCODE')}
                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 transition"
              >
                💊 Med Scan Bypass
              </button>
            </div>

            <form onSubmit={handleSituationSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Department *</label>
                  <select
                    value={situationForm.department}
                    onChange={(e) => setSituationForm({ ...situationForm, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-rose-500 font-medium"
                  >
                    {['ICU', 'Emergency', 'Surgery', 'Cardiology', 'General Ward'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Severity Level *</label>
                  <select
                    value={situationForm.severity}
                    onChange={(e) => setSituationForm({ ...situationForm, severity: e.target.value })}
                    className={`w-full border rounded-lg p-2.5 font-bold focus:outline-none ${
                      situationForm.severity === 'CRITICAL' ? 'bg-rose-50 border-rose-300 text-rose-800' :
                      situationForm.severity === 'HIGH' ? 'bg-orange-50 border-orange-300 text-orange-800' :
                      'bg-amber-50 border-amber-300 text-amber-800'
                    }`}
                  >
                    <option value="CRITICAL">🔴 CRITICAL (+30% Department Risk)</option>
                    <option value="HIGH">🟠 HIGH (+20% Department Risk)</option>
                    <option value="MEDIUM">🟡 MEDIUM (+10% Department Risk)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Accreditation Standard Code *</label>
                  <input
                    type="text"
                    value={situationForm.standardCode}
                    onChange={(e) => setSituationForm({ ...situationForm, standardCode: e.target.value })}
                    placeholder="e.g. HIC.2, COP.6, IPSG.4"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-800 focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Incident Title / Alert Summary *</label>
                <input
                  type="text"
                  value={situationForm.title}
                  onChange={(e) => setSituationForm({ ...situationForm, title: e.target.value })}
                  placeholder="e.g. Central Line Protocol Omission / Elevated Infection Rate"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-semibold focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Observation / Root Variance *</label>
                <textarea
                  value={situationForm.reason}
                  onChange={(e) => setSituationForm({ ...situationForm, reason: e.target.value })}
                  rows={2}
                  placeholder="Describe the clinical deviation or safety violation observed..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Immediate Remediation Protocol / Counter-Measure</label>
                <textarea
                  value={situationForm.remediation}
                  onChange={(e) => setSituationForm({ ...situationForm, remediation: e.target.value })}
                  rows={2}
                  placeholder="Immediate clinical corrective action, staff reallocation, or isolation step..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reported By (Clinician / Auditor) *</label>
                  <input
                    type="text"
                    value={situationForm.reportedBy}
                    onChange={(e) => setSituationForm({ ...situationForm, reportedBy: e.target.value })}
                    placeholder="e.g. Dr. Arthur Vance"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Incident Timestamp *</label>
                  <input
                    type="datetime-local"
                    value={situationForm.incidentDateTime}
                    onChange={(e) => setSituationForm({ ...situationForm, incidentDateTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-rose-500 font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={situationSubmitting}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold rounded-xl transition shadow-lg shadow-rose-600/25 disabled:opacity-50"
                >
                  <Siren className="w-4 h-4" />
                  <span>{situationSubmitting ? 'Minting Evidence & Alerting...' : '🚨 Log Situation & Open Right-Side Alert Popup'}</span>
                </button>
              </div>
            </form>

            {/* Instant Result Card */}
            {situationResult && (
              <div className="mt-5 p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-3 animate-fade-in text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-rose-900 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Critical Situation Logged & Sealed Successfully!</span>
                  </div>
                  <button
                    onClick={() => triggerSituationPopup(situationResult)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm transition text-xs self-start sm:self-auto"
                  >
                    <Siren className="w-3.5 h-3.5" />
                    <span>Re-open Right-Side Alert Popup</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="bg-white p-3 rounded-xl border border-rose-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Evidence Ledger ID</div>
                    <div className="font-mono font-bold text-slate-800 text-xs mt-0.5">{situationResult.evidenceId || 'MINTED'}</div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> SHA-256 Verified
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-rose-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Department Risk Update</div>
                    <div className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                      {situationResult.riskSummary ? `${situationResult.riskSummary.score}% (${situationResult.riskSummary.category})` : 'Recalculated'}
                    </div>
                    <div className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Risk Adjusted Live
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-rose-100">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Incident Status</div>
                    <div className="font-mono font-bold text-rose-700 text-xs mt-0.5">OPEN (DISPATCHED)</div>
                    <div className="text-[10px] text-slate-500 font-semibold mt-1">
                      {new Date(situationResult.createdAt || Date.now()).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    to="/evidence"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 underline"
                  >
                    <span>View in Cryptographic Evidence Vault</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <span className="text-slate-300">|</span>
                  <Link
                    to="/capa"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 underline"
                  >
                    <span>Create CAPA Remediation Task</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right Info Box */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <Siren className="w-4 h-4 text-rose-600" />
                <span>Connected Multi-Process Pipeline</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span><strong>Right-Side Floating Popup:</strong> Displays as a medium-sized alert on the bottom right without blocking background interactions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span><strong>Cryptographic Ledger:</strong> Mints an immutable SHA-256 evidence record with verified incident timestamp in MongoDB.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span><strong>Synchronous Risk Re-indexing:</strong> Instantly recalculates the target department's risk score and updates the executive dashboard.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span><strong>One-Click CAPA Dispatch:</strong> Directly initiates JCI/NABH corrective and preventive action with automated root cause synthesis.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-xs space-y-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Accreditation Alignment
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Conforms with NABH Continual Quality Improvement (CQI) and JCI International Patient Safety Goals (IPSG). Ensures zero-lag incident escalation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
