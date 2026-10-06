import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { simulationApi, metricsApi } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import { EmptyState, ErrorState } from '../components/common/StateViews';
import {
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Info
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
  const { selectedDepartment } = useApp();
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
          pathwayConformance: Math.min(100, Math.round(loaded.pathwayConformance + 15)),
          staffingLevel: Number((loaded.staffingLevel + 0.1).toFixed(2)),
          avgWaitingTime: Math.max(15, Math.round(loaded.avgWaitingTime - 15)),
          occupancyRate: Math.max(65, Math.round(loaded.occupancyRate - 10)),
          infectionRate: Math.max(0.5, Number((loaded.infectionRate - 1.0).toFixed(1)))
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
      {/* Header Banner with Disclaimer */}
      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Counterfactual Intervention Simulator</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    SCENARIO ESTIMATE
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Simulates: <em>"What if we enforce mandatory medication verification or increase nursing ratios in {targetDept}?"</em>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-[11px] font-medium">Does NOT modify real MongoDB data.</span>
          </div>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={runScenario} />}

      {/* Main Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Intervention Sliders */}
        <div className="lg:col-span-5 bg-white border border-sky-100 rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Configure Hypothetical Interventions</h3>
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
              <span className="font-semibold text-slate-700">Nurse-to-Patient Staffing Ratio:</span>
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
              <span>NABH Min: 0.33</span>
            </div>
          </div>

          {/* Slider 3: Average Waiting Time */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-700">Average Triage/Wait Time (mins):</span>
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
              <span>Target: &lt;30m</span>
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
              <span>Safe Cap: 85%</span>
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

        {/* Right: Projected Outcomes & Delta */}
        <div className="lg:col-span-7 bg-white border border-sky-100 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-sm">
          {result ? (
            <>
              {/* Score Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Current Real Baseline</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900">{result.baseline.riskScore}</span>
                    <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                  <RiskBadge category={result.baseline.riskCategory} score={result.baseline.riskScore} size="sm" />
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-emerald-800">Projected Post-Intervention</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-emerald-700">{result.scenario.projectedRiskScore}</span>
                    <span className="text-xs text-emerald-800/80">/ 100</span>
                  </div>
                  <RiskBadge category={result.scenario.projectedRiskCategory} score={result.scenario.projectedRiskScore} size="sm" />
                </div>
              </div>

              {/* Impact Callout */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-blue-800">Estimated Risk Reduction:</div>
                  <div className="text-[11px] text-slate-600">
                    Applying these interventions reduces operational risk by{' '}
                    <strong className="text-emerald-700">{Math.abs(result.impact.scoreDelta)} points ({result.impact.estimatedImprovementPercentage}%)</strong>.
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-base flex items-center gap-1 border border-emerald-200">
                  <TrendingDown className="w-5 h-5" />
                  <span>-{Math.abs(result.impact.scoreDelta)} pts</span>
                </div>
              </div>

              {/* Comparison Bar Chart */}
              <div className="h-56 w-full">
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

              <div className="text-[10px] text-slate-500 italic text-center">
                * Note: Scenario outcome generated by Python scikit-learn decision model. Does not replace clinical evaluation.
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400 text-xs">
              Calculating scenario simulation...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
