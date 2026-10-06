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
  Sparkles,
  Zap,
  Building2,
  Clock,
  Eye,
  Activity,
  Flame
} from 'lucide-react';

export default function SituationAlertPopup() {
  const navigate = useNavigate();
  const { showNotification } = useApp();
  const { user } = useAuth();

  const [activeAlert, setActiveAlert] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasDismissedCurrent, setHasDismissedCurrent] = useState(false);
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Poll for active unacknowledged alerts
  const checkSituations = useCallback(async () => {
    try {
      const res = await alertsApi.getAlerts(null, 'OPEN', null);
      const openAlerts = res.data.data || [];
      setUnacknowledgedAlerts(openAlerts);

      // If there are open alerts and user hasn't actively closed the current one
      if (openAlerts.length > 0 && !hasDismissedCurrent) {
        const topPriority = openAlerts.find(a => a.severity === 'CRITICAL') || 
                            openAlerts.find(a => a.severity === 'HIGH') || 
                            openAlerts[0];
        if (topPriority && (!activeAlert || activeAlert._id !== topPriority._id)) {
          setActiveAlert(topPriority);
          setIsOpen(true);
        }
      }
    } catch (err) {
      console.warn('[SituationAlertPopup] Polling warning:', err.message);
    }
  }, [activeAlert, hasDismissedCurrent]);

  useEffect(() => {
    checkSituations();
    const interval = setInterval(checkSituations, 3500);
    return () => clearInterval(interval);
  }, [checkSituations]);

  // Handle Acknowledge Alert
  const handleAcknowledge = async () => {
    if (!activeAlert) return;
    try {
      setIsProcessing(true);
      await alertsApi.updateStatus(activeAlert._id, 'ACKNOWLEDGED');
      showNotification(`Incident #${activeAlert.standardCode || activeAlert._id?.slice(-4)} acknowledged.`, 'info');
      setIsOpen(false);
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
        department: 'Pediatrics',
        standardCode: 'JCI-IPSG-1',
        title: 'Clinical Pathway Deviation',
        reason: 'Medication administration identity dual-check skipped in 4 consecutive cases.',
        recommendedAction: 'Audit barcode wristband scanning terminals and enforce clinical verification checkpoint.',
        createdAt: new Date().toISOString()
      }
    ];

    const randomSituation = mockSituations[Math.floor(Math.random() * mockSituations.length)];
    setActiveAlert(randomSituation);
    setHasDismissedCurrent(false);
    setIsOpen(true);
    showNotification('⚡ Live emergency situation simulated!', 'info');
  };

  return (
    <>
      {/* Floating Emergency Beacon Button (Always Accessible in Lower Left) */}
      <div className="fixed bottom-5 left-5 z-40 flex items-center gap-2">
        <button
          onClick={() => {
            if (unacknowledgedAlerts.length > 0) {
              setActiveAlert(unacknowledgedAlerts[0]);
              setIsOpen(true);
              setHasDismissedCurrent(false);
            } else {
              handleSimulateSituation();
            }
          }}
          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl font-bold text-xs shadow-xl transition border backdrop-blur-md ${
            unacknowledgedAlerts.length > 0
              ? 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse hover:bg-rose-100'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          title="Clinical Situation & Alert Monitor"
        >
          <Siren className={`w-4 h-4 ${unacknowledgedAlerts.length > 0 ? 'text-rose-600 animate-bounce' : 'text-blue-600'}`} />
          <span>
            {unacknowledgedAlerts.length > 0
              ? `${unacknowledgedAlerts.length} Active Situation${unacknowledgedAlerts.length > 1 ? 's' : ''}`
              : 'Situation Monitor'}
          </span>
          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-mono text-blue-700 font-bold border border-slate-200">
            LIVE
          </span>
        </button>

        {/* Quick Demo Simulator Trigger */}
        <button
          onClick={handleSimulateSituation}
          className="p-2.5 bg-white hover:bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-200 shadow-lg transition text-xs flex items-center gap-1.5"
          title="Simulate Real-Time Emergency Incident"
        >
          <Zap className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline font-bold text-[11px]">Test Alert Popup</span>
        </button>
      </div>

      {/* Emergency Situation Modal Popup */}
      {isOpen && activeAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-2 border-rose-400 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative overflow-hidden animate-scale-up">
            {/* Pulsing Top Highlight Banner */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 animate-pulse" />

            {/* Close Button */}
            <button
              onClick={() => {
                setIsOpen(false);
                setHasDismissedCurrent(true);
              }}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-800 rounded-xl bg-slate-100 hover:bg-slate-200 transition border border-slate-200"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Badge */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <Siren className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 font-mono tracking-wider">
                    {activeAlert.severity || 'CRITICAL'} REAL-TIME SITUATION ALERT
                  </span>
                  <span className="text-[10px] text-slate-600 font-bold font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {activeAlert.standardCode || 'NABH-PROTOCOL'}
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
              </div>

              {/* AI Recommended Protocol / Countermeasure */}
              <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-2xl p-3.5 space-y-1">
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
                onClick={() => {
                  setIsOpen(false);
                  setHasDismissedCurrent(true);
                  navigate('/pathways');
                }}
                className="w-full sm:w-auto py-3 px-3 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-xl text-xs font-bold border border-sky-200 transition flex items-center justify-center gap-1"
                title="Investigate Process Mining & Pathway"
              >
                <Activity className="w-4 h-4 text-sky-600" />
                <span>Investigate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
