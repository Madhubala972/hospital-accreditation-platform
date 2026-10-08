import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { simulationApi, metricsApi, capaApi } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import { EmptyState, ErrorState } from '../components/common/StateViews';
import {
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Info,
  PlusCircle,
  KanbanSquare,
  CheckCircle2,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export default function CounterfactualAnalysis() {
  const navigate = useNavigate();
  const { selectedDepartment, notify } = useApp();
  const targetDept = selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'ICU';

  const [baseMetrics, setBaseMetrics] = useState({
    occupancyRate: 94,
    avgWaitingTime: 52,
    infectionRate: 3.4,
    staffingLevel: 0.22,
    incidentCount: 6,
    pathwayConformance: 76
  });

  const [interventions, setInterventions] = useState({
    pathwayConformance: 95,
    staffingLevel: 0.35,
    avgWaitingTime: 28,
    occupancyRate: 80,
    infectionRate: 1.5
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal for Create CAPA from Simulation
  const [capaModalOpen, setCapaModalOpen] = useState(false);
  const [capaForm, setCapaForm] = useState({
    action: '',
    responsiblePerson: 'Elena Rostova (Lead Quality Auditor)',
    deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    priority: 'HIGH'
  });

  // Fetch real current baseline from database
  const fetchBaseline = async () => {
    try {
      const res = await metricsApi.getMetrics(targetDept, 1);
      if (res.data?.data && res.data.data.length > 0) {
        const m = res.data.data[0];
        const loaded = {
          occupancyRate: m.occupancyRate,
          avgWaitingTime: m.avgWaitingTime,
          infectionRate: m.infectionRate,
          staffingLevel: m.staffingLevel,
          incidentCount: m.incidentCount,
          pathwayConformance: m.pathwayConformance
        };
        setBaseMetrics(loaded);
        setInterventions({
          pathwayConformance: Math.min(100, Math.round(loaded.pathwayConformance + 16)),
          staffingLevel: Number((loaded.staffingLevel + 0.11).toFixed(2)),
          avgWaitingTime: Math.max(15, Math.round(loaded.avgWaitingTime - 18)),
          occupancyRate: Math.max(65, Math.round(loaded.occupancyRate - 12)),
          infectionRate: Math.max(0.5, Number((loaded.infectionRate - 1.2).toFixed(1)))
        });
      }
    } catch (err) {
      console.warn('Using default base metrics for simulation:', err.message);
    }
  };

  useEffect(() => {
    fetchBaseline();
  }, [targetDept]);

  const runScenario = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await simulationApi.runCounterfactual({
        department: targetDept,
        baseMetrics,
        interventions
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runScenario();
  }, [baseMetrics]);

  const handleOpenCapaFromSimulation = () => {
    const improvement = result?.impact?.estimatedImprovementPercentage || 30.8;
    setCapaForm({
      action: `Implement simulated staffing (+0.10 nurse ratio) and mandatory barcode verification in ${targetDept} to achieve projected ${improvement}% risk reduction.`,
      responsiblePerson: 'Elena Rostova (Lead Quality Auditor)',
      deadline: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      priority: 'HIGH'
    });
    setCapaModalOpen(true);
  };

  const handleCreateCapaSubmit = async (e) => {
    e.preventDefault();
    try {
      await capaApi.create({
        problem: `Elevated operational risk in ${targetDept} (Score: ${result?.baseline?.riskScore || 78}) requiring simulation-backed intervention`,
        department: targetDept,
        action: capaForm.action,
        responsiblePerson: capaForm.responsiblePerson,
        deadline: capaForm.deadline,
        priority: capaForm.priority,
        predictedImpact: result?.impact?.estimatedImprovementPercentage || 30.8,
        simulationId: result?.simulationId || `SIM-${Date.now().toString().slice(-6)}`,
        standardCode: 'NABH-COP.6'
      });
      notify('Simulation-backed CAPA plan created successfully!', 'success');
      setCapaModalOpen(false);
      navigate('/kanban');
    } catch (err) {
      notify(`Failed to create CAPA: ${err.message}`, 'error');
    }
  };

  const comparisonChartData = result ? [
    {
      metric: 'Operational Risk',
      Baseline: result.baseline.riskScore,
      ProjectedScenario: result.scenario.projectedRiskScore,
      unit: '/ 100'
    },
    {
      metric: 'Occupancy %',
      Baseline: baseMetrics.occupancyRate,
      ProjectedScenario: interventions.occupancyRate,
      unit: '%'
    },
    {
      metric: 'Wait Time (m)',
      Baseline: baseMetrics.avgWaitingTime,
      ProjectedScenario: interventions.avgWaitingTime,
      unit: 'm'
    },
    {
      metric: 'Conformance %',
      Baseline: baseMetrics.pathwayConformance,
      ProjectedScenario: interventions.pathwayConformance,
      unit: '%'
    }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header Banner with Accreditation Framing (Section 13 in PDF) */}
      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Accreditation Intervention Simulator</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                    CLOSED-LOOP SIMULATION
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evaluates: <em>"Will this proposed CAPA intervention reduce accreditation risk in {targetDept}?"</em>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-[11px] font-medium">In-memory model. Links directly to CAPA upon approval.</span>
          </div>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={runScenario} />}

      {/* Main Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Intervention Sliders */}
        <div className="lg:col-span-5 bg-white border border-sky-100 rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Configure Proposed CAPA Interventions</h3>
            <span className="text-xs text-blue-700 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{targetDept}</span>
          </div>

          {/* Slider 1: Pathway Conformance */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700">Enforce Protocol Conformance (%):</span>
              <span className="font-mono font-bold text-blue-700">{interventions.pathwayConformance}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={interventions.pathwayConformance}
              onChange={(e) => setInterventions({ ...interventions, pathwayConformance: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Baseline: {baseMetrics.pathwayConformance}%</span>
              <span>Target: 100%</span>
            </div>
          </div>

          {/* Slider 2: Staffing Ratio */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700">Add Staff / Nurse-to-Patient Ratio:</span>
              <span className="font-mono font-bold text-blue-700">{interventions.staffingLevel}</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.60"
              step="0.01"
              value={interventions.staffingLevel}
              onChange={(e) => setInterventions({ ...interventions, staffingLevel: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Baseline: {baseMetrics.staffingLevel}</span>
              <span>NABH Mandate: &gt;= 0.33</span>
            </div>
          </div>

          {/* Slider 3: Average Waiting Time */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700">Target Triage/Wait Time (mins):</span>
              <span className="font-mono font-bold text-blue-700">{interventions.avgWaitingTime} mins</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              value={interventions.avgWaitingTime}
              onChange={(e) => setInterventions({ ...interventions, avgWaitingTime: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Baseline: {baseMetrics.avgWaitingTime}m</span>
              <span>NABH Limit: &lt;= 30m</span>
            </div>
          </div>

          {/* Slider 4: Bed Occupancy */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700">Target Bed Occupancy (%):</span>
              <span className="font-mono font-bold text-blue-700">{interventions.occupancyRate}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              value={interventions.occupancyRate}
              onChange={(e) => setInterventions({ ...interventions, occupancyRate: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Baseline: {baseMetrics.occupancyRate}%</span>
              <span>Safe Buffer: 80%</span>
            </div>
          </div>

          <button
            onClick={runScenario}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Simulating Model...' : 'Recalculate Counterfactual Scenario'}</span>
          </button>
        </div>

        {/* Right: Projected Outcomes & Create CAPA from Simulation (Section 13 in PDF) */}
        <div className="lg:col-span-7 bg-white border border-sky-100 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-sm">
          {result ? (
            <>
              {/* Score Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Current Risk Baseline</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">{result.baseline.riskScore}</span>
                    <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                  <RiskBadge category={result.baseline.riskCategory} score={result.baseline.riskScore} size="sm" />
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-emerald-800">Simulated CAPA Outcome</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-emerald-700">{result.scenario.projectedRiskScore}</span>
                    <span className="text-xs text-emerald-800/80">/ 100</span>
                  </div>
                  <RiskBadge category={result.scenario.projectedRiskCategory} score={result.scenario.projectedRiskScore} size="sm" />
                </div>
              </div>

              {/* Impact Callout & Create CAPA CTA */}
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-blue-900">Predicted CAPA Risk Reduction:</div>
                  <div className="text-[11px] text-slate-700 mt-0.5">
                    Current Risk <strong className="text-slate-900">{result.baseline.riskScore}</strong> → Predicted Risk <strong className="text-emerald-700">{result.scenario.projectedRiskScore}</strong> ({result.impact.estimatedImprovementPercentage}% predicted improvement).
                  </div>
                </div>

                <button
                  onClick={handleOpenCapaFromSimulation}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition flex-shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create CAPA From Simulation</span>
                </button>
              </div>

              {/* Comparison Bar Chart */}
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                    <XAxis dataKey="metric" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px', color: '#1e293b' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Baseline" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ProjectedScenario" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
              Calculating scenario simulation...
            </div>
          )}
        </div>
      </div>

      {/* Create CAPA Modal */}
      {capaModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KanbanSquare className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Create Closed-Loop CAPA from Simulation</h3>
              </div>
              <button onClick={() => setCapaModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs space-y-1">
              <div className="font-bold text-blue-900">Simulation Baseline vs Target:</div>
              <div className="text-slate-700">
                Current Risk {result?.baseline?.riskScore} → Target Risk {result?.scenario?.projectedRiskScore} ({result?.impact?.estimatedImprovementPercentage}% predicted improvement).
              </div>
            </div>

            <form onSubmit={handleCreateCapaSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Corrective Action Plan *</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Responsible Auditor / Lead *</label>
                  <input
                    type="text"
                    required
                    value={capaForm.responsiblePerson}
                    onChange={(e) => setCapaForm({ ...capaForm, responsiblePerson: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
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

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCapaModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  Confirm & Route to Kanban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
