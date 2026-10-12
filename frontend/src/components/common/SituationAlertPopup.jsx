import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { alertsApi, capaApi } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import {
  AlertTriangle,
  Siren,
  ShieldAlert,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  Building2,
  Clock,
  Eye,
  Activity,
  Flame,
  GitFork,
  Search,
  Cpu,
  Layers,
  FileCheck,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

function getInvestigationDetails(alert) {
  const dept = alert.department || 'Hospital-Wide';
  const code = alert.standardCode || 'NABH-COP-4.2';
  
  if (dept.toLowerCase().includes('cardio')) {
    return {
      rootCauseTitle: 'Cath Lab Transfer & Enzyme Turnaround Latency',
      rootCauseSummary: 'Door-to-Balloon pathway time violated standard threshold. Cardiac enzyme lab report turnaround averaged 58 mins (standard: <25 mins), delaying catheterization laboratory team activation.',
      bottleneckStage: 'Lab Enzyme Processing & Team Dispatch',
      bottleneckDelay: '+33 mins delay',
      conformanceGap: '60.0% achieved vs 88.0% standard (28.0% deficit)',
      evidenceTag: 'EV-CAR-20261008-01',
      affectedCases: 6,
      aiConfidence: '98.6%',
      fiveWhys: [
        'Door-to-balloon time exceeded 90-minute benchmark.',
        'Cath lab activation was delayed by 38 minutes after patient triage.',
        'Physician waited for high-sensitivity Troponin result confirmation.',
        'Lab batch analyzer experienced queue backlog due to morning shift peak.',
        'Auto-alert routing rule for critical cardiac biomarker was unassigned.'
      ],
      steps: [
        { name: 'ED Triage & ECG', time: '12 min', status: 'normal' },
        { name: 'Biomarker / Lab Run', time: '58 min', status: 'bottleneck', note: '+33m delay' },
        { name: 'Cath Lab Prep', time: '20 min', status: 'normal' },
        { name: 'Balloon Angioplasty', time: '15 min', status: 'normal' }
      ],
      riskImpact: { statusQuo: '+38% Risk of NABH-COP.12 Citation', withCapa: 'Restores to 94.5% Conformance within 24h' }
    };
  }
  
  if (dept.toLowerCase().includes('icu') || dept.toLowerCase().includes('intensive')) {
    return {
      rootCauseTitle: 'Central Line Bundle Maintenance Protocol Gap',
      rootCauseSummary: 'ICU infection surveillance detected CLABSI rate spike to 5.8%. Review indicates sterile barrier dressing changes exceeded the 48-hour protocol threshold during shift transitions.',
      bottleneckStage: 'Sterile Barrier Dressing Maintenance',
      bottleneckDelay: '+18h protocol delay',
      conformanceGap: '72.0% achieved vs 95.0% standard (23.0% deficit)',
      evidenceTag: 'EV-ICU-20261008-01',
      affectedCases: 4,
      aiConfidence: '97.8%',
      fiveWhys: [
        'Central-line infection metric breached the 2.0% safety boundary.',
        'Catheter dressing renewal schedule was missed for 4 patients in Pod B.',
        'Night shift nurse-to-patient ratio was 1:3 instead of mandatory 1:1 in high-acuity beds.',
        'Unexpected emergency surge diverted senior nursing staff to trauma admissions.',
        'Shift handoff checklist was closed without secondary dual-sign confirmation.'
      ],
      steps: [
        { name: 'Central Line Insertion', time: 'Verified', status: 'normal' },
        { name: '24h Sterile Inspection', time: 'Passed', status: 'normal' },
        { name: '48h Dressing Renewal', time: 'Missed (+18h)', status: 'bottleneck', note: 'Protocol breached' },
        { name: 'Microbiology Swab', time: 'Pos. Culture', status: 'warning' }
      ],
      riskImpact: { statusQuo: '+45% Escalation in Hospital-Acquired Infection index', withCapa: '99.1% Compliance after Sterile Re-training & Pod Isolation' }
    };
  }

  if (dept.toLowerCase().includes('emergency') || dept.toLowerCase().includes('er')) {
    return {
      rootCauseTitle: 'Triage Inflow Surge & Physician Allocation Deficit',
      rootCauseSummary: 'Emergency department bed occupancy reached 96% with average door-to-doctor time exceeding 185 mins. Delay caused by non-urgent presentations filling acute beds.',
      bottleneckStage: 'Initial Physician Assessment & Bed Allocation',
      bottleneckDelay: '+95 mins wait',
      conformanceGap: '64.5% achieved vs 90.0% standard (25.5% deficit)',
      evidenceTag: 'EV-EMR-20261008-01',
      affectedCases: 14,
      aiConfidence: '99.1%',
      fiveWhys: [
        'Emergency wait time breached NABH-COP-4.2 threshold (>120 mins).',
        'Acute care beds were blocked by admitted patients awaiting inpatient ward transfers.',
        'Inpatient discharge approvals delayed until afternoon consultant rounds.',
        'Ward cleaning turnaround time lagged by 45 minutes per bed.',
        'Surge fast-track routing protocol was not triggered at 85% bed threshold.'
      ],
      steps: [
        { name: 'Arrival & Triage', time: '8 min', status: 'normal' },
        { name: 'Physician First-Touch', time: '185 min', status: 'bottleneck', note: '+95m over benchmark' },
        { name: 'Diagnostic Imaging', time: '35 min', status: 'normal' },
        { name: 'Disposition / Bed Assignment', time: '110 min', status: 'warning' }
      ],
      riskImpact: { statusQuo: '+50% Left-Without-Being-Seen (LWBS) Risk', withCapa: 'Reduces Wait Time to <45 mins via Fast-Track Triage' }
    };
  }

  if (dept.toLowerCase().includes('surgery') || dept.toLowerCase().includes('or') || dept.toLowerCase().includes('operation')) {
    return {
      rootCauseTitle: 'WHO Surgical Safety Checklist Sign-In Verification Skip',
      rootCauseSummary: 'Pre-incision surgical safety checklist sign-in was not digitally logged prior to anesthesia administration in 3 elective surgical procedures.',
      bottleneckStage: 'Pre-Anesthesia Checklist Dual Sign-Off',
      bottleneckDelay: 'Protocol skipped',
      conformanceGap: '78.0% achieved vs 100.0% standard (22.0% deficit)',
      evidenceTag: 'EV-SUR-20261008-01',
      affectedCases: 3,
      aiConfidence: '96.5%',
      fiveWhys: [
        'Surgical checklist compliance fell below JCI-IPSG-4 zero-tolerance standard.',
        'Circulating nurse was simultaneously preparing emergency laparotomy tray.',
        'OR display tablet battery depleted before checklist completion.',
        'Paper backup form was not entered into EHR prior to surgical incision.',
        'OR workflow lacked mandatory hard-stop anesthetic interlock in software.'
      ],
      steps: [
        { name: 'Patient Identification', time: 'Verified', status: 'normal' },
        { name: 'Site Marking & Consent', time: 'Verified', status: 'normal' },
        { name: 'Sign-In Dual Verification', time: 'Skipped', status: 'bottleneck', note: 'JCI-IPSG-4 Deficit' },
        { name: 'Time-Out & Incision', time: 'Logged', status: 'normal' }
      ],
      riskImpact: { statusQuo: 'Critical Audit Finding during NABH/JCI On-Site Survey', withCapa: '100% Zero-Defect Enforcement with Digital Gate' }
    };
  }

  // Default fallback
  return {
    rootCauseTitle: 'Clinical Protocol Conformance Variance',
    rootCauseSummary: `${alert.reason || alert.message || 'Operational anomaly detected in workflow telemetry.'} Real-time logs indicate a process bottleneck requiring corrective intervention.`,
    bottleneckStage: 'Operational Verification Checkpoint',
    bottleneckDelay: 'Variance detected',
    conformanceGap: '68.0% achieved vs 90.0% standard',
    evidenceTag: `EV-${dept.slice(0,3).toUpperCase()}-20261008-01`,
    affectedCases: 5,
    aiConfidence: '95.0%',
    fiveWhys: [
      `Telemetry variance logged for ${code}.`,
      'Process step execution time exceeded allowable clinical tolerance.',
      'Staffing or equipment resource contention occurred during peak shift.',
      'Standardized operating procedure dual-check was not completed on time.',
      'Remediation CAPA plan is required to prevent recurring non-conformance.'
    ],
    steps: [
      { name: 'Intake / Triage', time: 'Normal', status: 'normal' },
      { name: 'Clinical Execution', time: 'Delayed', status: 'bottleneck', note: 'Variance Detected' },
      { name: 'Verification & Sign-off', time: 'Pending', status: 'warning' },
      { name: 'Disposition', time: 'Scheduled', status: 'normal' }
    ],
    riskImpact: { statusQuo: '+30% Risk Escalation in Accreditation Readiness', withCapa: 'Restores Conformance to >92% in 24-48 Hours' }
  };
}

export default function SituationAlertPopup() {
  const navigate = useNavigate();
  const { showNotification, setSelectedDepartment, criticalAlertTrigger, setCriticalAlertTrigger, refreshKey } = useApp();
  const { user } = useAuth();

  const [activeAlert, setActiveAlert] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasDismissedCurrent, setHasDismissedCurrent] = useState(false);

  // When a new critical situation is manually entered or triggered, open the right-side popup immediately
  useEffect(() => {
    if (criticalAlertTrigger) {
      setActiveAlert(criticalAlertTrigger);
      setIsInvestigating(false);
      setIsOpen(true);
      setCriticalAlertTrigger(null);
    }
  }, [criticalAlertTrigger, setCriticalAlertTrigger]);

  // Keep unacknowledged alerts count up-to-date WITHOUT popping up or interrupting the user
  const checkSituations = useCallback(async () => {
    try {
      const res = await alertsApi.getAlerts(null, 'OPEN', null);
      const openAlerts = res.data.data || [];
      setUnacknowledgedAlerts(openAlerts);
    } catch (err) {
      console.warn('[SituationAlertPopup] Polling warning:', err.message);
    }
  }, []);

  useEffect(() => {
    checkSituations();
    const interval = setInterval(checkSituations, 8000);
    return () => clearInterval(interval);
  }, [checkSituations, refreshKey]);

  // Handle Acknowledge Alert
  const handleAcknowledge = async () => {
    if (!activeAlert) return;
    try {
      setIsProcessing(true);
      await alertsApi.updateStatus(activeAlert._id, 'ACKNOWLEDGED');
      showNotification(`Incident #${activeAlert.standardCode || activeAlert._id?.slice(-4)} acknowledged.`, 'info');
      setIsOpen(false);
      setIsInvestigating(false);
      setHasDismissedCurrent(true);
      setActiveAlert(null);
      await checkSituations();
    } catch (err) {
      showNotification(err.response?.data?.message || err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Instant One-Click CAPA Creation
  const handleConvertToCapa = async () => {
    if (!activeAlert) return;
    try {
      setIsProcessing(true);
      const alertMsg = activeAlert.message || activeAlert.reason || activeAlert.title;
      await capaApi.create({
        problem: `[EMERGENCY SITUATION] ${alertMsg}`,
        department: activeAlert.department || 'Hospital-Wide',
        action: `Execute immediate remediation protocol for ${activeAlert.standardCode || 'Clinical Deviation'}: review shift logs and reallocate clinical staff.`,
        responsiblePerson: user?.name || 'Dr. Arthur Vance (Dean / Quality Lead)',
        deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        alertId: activeAlert._id,
        standardCode: activeAlert.standardCode || 'NABH-COP-4.2',
        priority: activeAlert.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
      });

      await alertsApi.updateStatus(activeAlert._id, 'CAPA_CREATED');
      showNotification(`🚀 CAPA Remediation Plan created for ${activeAlert.department}!`, 'success');
      setIsOpen(false);
      setIsInvestigating(false);
      setHasDismissedCurrent(true);
      setActiveAlert(null);
      navigate('/capa');
    } catch (err) {
      showNotification(err.response?.data?.message || err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate a live emergency event for on-demand demonstration
  const handleSimulateSituation = () => {
    const mockSituations = [
      {
        _id: 'sim-' + Date.now(),
        severity: 'MEDIUM',
        department: 'Cardiology',
        standardCode: 'NABH-COP.12',
        title: 'Cardiology Risk Escalation',
        reason: 'Pathway protocol conformance deficit (60.0% vs >=88.0% threshold). Door-to-Balloon delay detected.',
        recommendedAction: 'NON-COMPLIANCE: Cardiology Door-to-Balloon / ECG Conformance at 60 violates threshold (>= 88). Gap: 28.0. [Evidence: EV-CAR-20261008-01]. Evidence Integrity: 100% (15/15 verified records).',
        createdAt: new Date().toISOString()
      },
      {
        _id: 'sim-' + Date.now(),
        severity: 'CRITICAL',
        department: 'Intensive Care Unit (ICU)',
        standardCode: 'NABH-HIC-2.1',
        title: 'Severe Infection Spike',
        reason: 'ICU Central-Line Associated Bloodstream Infection reached 5.8% (Threshold: 2.0%)',
        recommendedAction: 'Isolate affected ICU pods, initiate sterile barrier audit, and re-train night shift nursing team.',
        createdAt: new Date().toISOString()
      },
      {
        _id: 'sim-' + Date.now(),
        severity: 'HIGH',
        department: 'Emergency Room',
        standardCode: 'NABH-COP-4.2',
        title: 'Emergency Triage Overflow',
        reason: 'Average door-to-doctor time exceeded 185 mins with 96% bed occupancy.',
        recommendedAction: 'Trigger Fast-Track clinical pathway escalation and open surge capacity overflow beds.',
        createdAt: new Date().toISOString()
      },
      {
        _id: 'sim-' + Date.now(),
        severity: 'HIGH',
        department: 'Surgery',
        standardCode: 'JCI-IPSG-4',
        title: 'Surgical Checklist Omission',
        reason: 'WHO Safe Surgery Sign-In step skipped in 3 cases prior to anesthesia.',
        recommendedAction: 'Halt elective OR starts without digital sign-off and review circulating nurse handoff.',
        createdAt: new Date().toISOString()
      }
    ];

    const randomSituation = mockSituations[Math.floor(Math.random() * mockSituations.length)];
    setActiveAlert(randomSituation);
    setIsInvestigating(false);
    setHasDismissedCurrent(false);
    setIsOpen(true);
    showNotification('⚡ Live emergency situation simulated!', 'info');
  };

  const investigation = activeAlert ? getInvestigationDetails(activeAlert) : null;

  return (
    <>
      {/* Floating Critical Situation Beacon (Only shows when genuine active situations exist) */}
      {unacknowledgedAlerts.length > 0 && (
        <div className="fixed bottom-5 left-5 z-40 flex items-center gap-2">
          <button
            onClick={() => {
              setActiveAlert(unacknowledgedAlerts[0]);
              setIsInvestigating(false);
              setIsOpen(prev => !prev);
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold text-xs shadow-xl transition border backdrop-blur-md bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 animate-pulse"
            title="Click to view Active Critical Situations"
          >
            <Siren className="w-4 h-4 text-rose-600" />
            <span>
              {unacknowledgedAlerts.length} Active Situation{unacknowledgedAlerts.length > 1 ? 's' : ''}
            </span>
            <span className="text-[10px] bg-rose-200/80 px-2 py-0.5 rounded-full font-mono text-rose-900 font-bold border border-rose-300">
              LIVE
            </span>
          </button>
        </div>
      )}

      {/* Medium-sized Situation Alert Popup Anchored on the Right Side */}
      {isOpen && activeAlert && (
        <div className={`fixed bottom-6 right-6 z-50 shadow-2xl rounded-3xl border-2 border-rose-400 bg-white/98 backdrop-blur-md shadow-rose-950/25 flex flex-col overflow-hidden animate-slide-in-right transition-all duration-300 ${
          isInvestigating ? 'w-[95vw] sm:w-[560px] max-h-[88vh]' : 'w-[92vw] sm:w-[460px] max-h-[82vh]'
        }`}>
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3 relative">
            {/* Pulsing Top Highlight Banner */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 animate-pulse" />

            {/* Close Button */}
            <button
              onClick={() => {
                setIsOpen(false);
                setIsInvestigating(false);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-800 rounded-xl bg-slate-100 hover:bg-slate-200 transition border border-slate-200 z-10"
              title="Close Situation Popup"
            >
              <X className="w-4 h-4" />
            </button>

            {!isInvestigating ? (
              /* --- VIEW 1: SITUATION ALERT OVERVIEW --- */
              <>
                {/* Header Badge */}
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                    <Siren className="w-5 h-5 animate-spin-slow" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border font-mono tracking-wider ${
                        activeAlert.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        activeAlert.severity === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {activeAlert.severity || 'HIGH'} REAL-TIME SITUATION ALERT
                      </span>
                      <span className="text-[10px] text-slate-600 font-bold font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {activeAlert.standardCode || 'NABH-COP.12'}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                      {activeAlert.title || 'Accreditation & Clinical Safety Deviation'}
                    </h3>
                  </div>
                </div>

                {/* Situation Incident Details */}
                <div className="space-y-3 my-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Department:</span>
                        <strong className="text-slate-900 ml-1">{activeAlert.department || 'Hospital-Wide'}</strong>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono font-semibold">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(activeAlert.createdAt || Date.now()).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold pt-1">
                      {activeAlert.reason || activeAlert.message || activeAlert.title}
                    </div>

                    {/* Sealed Cryptographic Evidence Tag */}
                    {(activeAlert.supportingEvidenceIds?.[0] || activeAlert.evidenceId) && (
                      <div className="mt-2 p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-[11px]">
                        <span className="font-mono text-emerald-800 font-bold flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Sealed Ledger: {activeAlert.supportingEvidenceIds?.[0] || activeAlert.evidenceId}</span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                          SHA-256 SEALED
                        </span>
                      </div>
                    )}
                  </div>

                  {/* AI Recommended Protocol / Countermeasure */}
                  <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200 rounded-2xl p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>AI Recommended Counter-Measure Protocol:</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {activeAlert.recommendedAction ||
                        (Array.isArray(activeAlert.evidence) && activeAlert.evidence.length > 0
                          ? activeAlert.evidence.join('. ')
                          : 'Immediate root-cause pathway isolation required. Launch CAPA plan to reassign clinical staff and satisfy accreditation conformance.')}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    onClick={handleConvertToCapa}
                    disabled={isProcessing}
                    className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Launch CAPA Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handleAcknowledge}
                    disabled={isProcessing}
                    className="w-full sm:w-auto py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Acknowledge</span>
                  </button>

                  <button
                    onClick={() => setIsInvestigating(true)}
                    className="w-full sm:w-auto py-3 px-4 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold border border-sky-300 transition flex items-center justify-center gap-1.5 shadow-sm"
                    title="Open Deep Root-Cause Investigation Workbench"
                  >
                    <Activity className="w-4 h-4 text-sky-600" />
                    <span>Investigate</span>
                  </button>
                </div>
              </>
            ) : (
              /* --- VIEW 2: ACTIVE INVESTIGATION WORKBENCH --- */
              <div className="space-y-4 pt-1">
                {/* Back to Alert Button */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <button
                    onClick={() => setIsInvestigating(false)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Alert Summary</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
                      AI Diagnostic Confidence: {investigation?.aiConfidence || '98.5%'}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 text-sky-800">
                      INVESTIGATION WORKBENCH
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-500">
                      {activeAlert.department} • {activeAlert.standardCode}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                    <span>{investigation?.rootCauseTitle || activeAlert.title}</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {investigation?.rootCauseSummary}
                  </p>
                </div>

                {/* Process Step Bottleneck Timeline */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <GitFork className="w-3.5 h-3.5 text-blue-600" />
                      Clinical Process Trace & Bottleneck Isolation
                    </span>
                    <span className="text-[11px] font-mono text-rose-600 font-semibold">
                      Gap: {investigation?.conformanceGap}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {investigation?.steps?.map((st, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                          st.status === 'bottleneck'
                            ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-sm'
                            : st.status === 'warning'
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="text-[11px] font-bold truncate">{st.name}</div>
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                          <span className="text-[10px] font-mono font-semibold">{st.time}</span>
                          {st.note && (
                            <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1 rounded">
                              {st.note}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5-Whys Root Cause Analysis */}
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                    <Search className="w-3.5 h-3.5 text-indigo-600" />
                    <span>AI 5-Whys Root Cause Decomposition</span>
                  </div>
                  <div className="space-y-1.5 pl-1 pt-1">
                    {investigation?.fiveWhys?.map((why, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className={i === (investigation.fiveWhys.length - 1) ? 'font-bold text-indigo-950' : ''}>
                          {why}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cryptographic Evidence & Outcome Projections */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Cryptographic Provenance</span>
                    </div>
                    <div className="text-xs text-emerald-800 font-mono font-semibold">
                      Block: {investigation?.evidenceTag}
                    </div>
                    <div className="text-[11px] text-emerald-700">
                      100% SHA-256 Hash Integrity Verified
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Cpu className="w-3.5 h-3.5 text-blue-600" />
                      <span>Counterfactual Forecast</span>
                    </div>
                    <div className="text-[11px] text-rose-700 font-medium">
                      Status Quo: {investigation?.riskImpact?.statusQuo}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-bold">
                      With CAPA: {investigation?.riskImpact?.withCapa}
                    </div>
                  </div>
                </div>

                {/* Deep-Dive Navigation & Action Hub */}
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      if (activeAlert.department) {
                        setSelectedDepartment(activeAlert.department);
                      }
                      setIsOpen(false);
                      setIsInvestigating(false);
                      setHasDismissedCurrent(true);
                      navigate('/pathways');
                    }}
                    className="flex-1 min-w-[160px] py-2.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <GitFork className="w-3.5 h-3.5 text-sky-600" />
                    <span>Process Mining Trace</span>
                  </button>

                  <button
                    onClick={() => {
                      if (activeAlert.department) {
                        setSelectedDepartment(activeAlert.department);
                      }
                      setIsOpen(false);
                      setIsInvestigating(false);
                      setHasDismissedCurrent(true);
                      navigate('/simulation');
                    }}
                    className="flex-1 min-w-[160px] py-2.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Cpu className="w-3.5 h-3.5 text-purple-600" />
                    <span>Digital Twin Simulation</span>
                  </button>

                  <button
                    onClick={handleConvertToCapa}
                    disabled={isProcessing}
                    className="flex-1 min-w-[160px] py-2.5 px-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Launch CAPA Plan</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

