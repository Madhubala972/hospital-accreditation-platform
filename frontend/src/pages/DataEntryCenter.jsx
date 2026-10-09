import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { metricsApi, pathwaysApi } from '../services/api';
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
  ShieldCheck
} from 'lucide-react';

const STANDARD_ACTIVITIES = [
  'Admission',
  'Triage',
  'Lab',
  'Medication Verification',
  'Treatment',
  'Emergency Examination',
  'Pre-Op Assessment',
  'Anesthesia Check',
  'Surgical Safety Checklist',
  'Surgical Procedure',
  'Post-Op Recovery',
  'Discharge Planning'
];

export default function DataEntryCenter() {
  const { selectedDepartment, notify, triggerRefresh } = useApp();
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' | 'pathway'

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

  const handleMetricSubmit = async (e) => {
    e.preventDefault();
    try {
      setMetricSubmitting(true);
      setMetricResult(null);
      const res = await metricsApi.createMetric(metricForm);
      setMetricResult(res.data);
      notify(`Operational metrics for ${metricForm.department} saved and risk re-evaluated.`, 'success');
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

      await pathwaysApi.createTrace(payload);
      notify(`Patient pathway trace ${pathwayForm.caseId} recorded with admission & completion timestamps and analyzed via PM4Py.`, 'success');
      triggerRefresh();
      // Generate new Case ID
      setPathwayForm({
        ...pathwayForm,
        caseId: `CASE-${Math.floor(1000 + Math.random() * 9000)}`,
        admissionDateTime: getNowLocalDateTime()
      });
    } catch (err) {
      notify(`Failed to log pathway trace: ${err.response?.data?.message || err.message}`, 'error');
    } finally {
      setPathwaySubmitting(false);
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
        </div>
      </div>

      {/* Tab 1: Operational Metrics Form */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Ingest Shift Operational Indicators</h3>

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
          <div className="flex items-center justify-between mb-4">
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
        </div>
      )}
    </div>
  );
}
