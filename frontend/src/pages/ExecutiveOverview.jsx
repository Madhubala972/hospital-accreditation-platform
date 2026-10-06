import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dashboardApi, riskApi } from '../services/api';
import MetricCard from '../components/common/MetricCard';
import RiskBadge from '../components/common/RiskBadge';
import StatusBadge from '../components/common/StatusBadge';
import { EmptyState, ErrorState } from '../components/common/StateViews';
import {
  ShieldCheck,
  AlertTriangle,
  KanbanSquare,
  Activity,
  ArrowUpRight,
  TrendingDown,
  RefreshCw,
  Building,
  CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

export default function ExecutiveOverview() {
  const { selectedDepartment, refreshKey, notify } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardApi.getSummary(selectedDepartment);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedDepartment, refreshKey]);

  const handleExplicitEvaluation = async () => {
    try {
      setEvaluating(true);
      await riskApi.evaluate(selectedDepartment);
      notify('Department risk & accreditation re-evaluation complete.', 'success');
      await fetchDashboard();
    } catch (err) {
      notify(`Re-evaluation failed: ${err.message}`, 'error');
    } finally {
      setEvaluating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-2 text-cyan-400">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <p className="text-xs">Loading Executive Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchDashboard} />;
  }

  if (!data || !data.departments || data.departments.length === 0) {
    return <EmptyState title="No Executive Data Found" message="Please seed or enter operational data in Data Entry Center." />;
  }

  const { kpis, capaSummary, alertCountsBySeverity, recentAlerts, departments } = data;

  // Chart data for departmental risk comparison
  const chartData = departments.map(d => ({
    name: d.department,
    riskScore: d.riskScore,
    conformance: d.pathwayConformance,
    occupancy: d.occupancyRate
  }));

  const getBarColor = (score) => {
    if (score >= 75) return '#f43f5e'; // rose
    if (score >= 55) return '#f97316'; // orange
    if (score >= 35) return '#f59e0b'; // amber
    return '#10b981'; // emerald
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Evaluation Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-900/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white border border-white/30 tracking-wider">
              AUDIT INTELLIGENCE
            </span>
            <span className="text-xs text-blue-100 font-medium">Scope: {data.selectedDepartment}</span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">Executive Accreditation Overview</h2>
          <p className="text-xs text-blue-100 mt-1 max-w-2xl font-medium">
            Real-time clinical safety indicators, stored risk assessments, active accreditation alerts, and CAPA remediation progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExplicitEvaluation}
            disabled={evaluating}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-blue-50 text-blue-800 rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-700 ${evaluating ? 'animate-spin' : ''}`} />
            <span>{evaluating ? 'Evaluating Pipeline...' : 'Run Department Re-Evaluation'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Compliance Index"
          value={`${kpis.hospitalComplianceIndex}%`}
          subtitle="Hospital-wide protocol adherence"
          icon={ShieldCheck}
          color="cyan"
          trend="+3.2% vs target"
        />
        <MetricCard
          title="Average Risk Score"
          value={kpis.averageRiskScore}
          unit="/ 100"
          subtitle={`Highest: ${kpis.highestRiskDepartment} (${kpis.highestRiskScore})`}
          icon={Activity}
          color={kpis.averageRiskScore > 50 ? 'rose' : 'emerald'}
        />
        <MetricCard
          title="Active Alerts"
          value={kpis.totalOpenAlerts}
          subtitle={`${kpis.criticalAlerts} Critical Priority`}
          icon={AlertTriangle}
          color={kpis.criticalAlerts > 0 ? 'rose' : 'amber'}
        />
        <MetricCard
          title="CAPA Resolution Rate"
          value={`${kpis.capaCompletionRate}%`}
          subtitle={`${capaSummary.completed} of ${capaSummary.total} closed with audit verification`}
          icon={KanbanSquare}
          color="indigo"
        />
      </div>

      {/* Main Grid: Department Heatmap + Risk Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Risk Chart */}
        <div className="lg:col-span-2 bg-white border border-sky-100 shadow-sm rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Departmental Risk & Compliance Matrix</h3>
              <p className="text-xs text-slate-500">Stored risk scores aggregated across clinical units</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.7} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={600} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                />
                <Bar dataKey="riskScore" name="Risk Score (0-100)" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.riskScore)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CAPA Progress Overview */}
        <div className="bg-white border border-sky-100 shadow-sm rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">CAPA Quality Loop</h3>
            <p className="text-xs text-slate-500 mb-4">Closed-loop corrective actions status</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-600 font-semibold">Completed & Verified</span>
                <span className="text-sm font-black text-emerald-600">{capaSummary.completed}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-600 font-semibold">In Progress / Assigned</span>
                <span className="text-sm font-black text-blue-600">{capaSummary.inProgress}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-600 font-semibold">Open / Pending Review</span>
                <span className="text-sm font-black text-amber-600">{capaSummary.open}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-800 font-medium">
            <span className="font-bold">Quality Rule:</span> CAPA completion triggers automatic re-evaluation to compare before vs after operational metrics.
          </div>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Building className="w-4 h-4 text-blue-600" />
          <span>Department Performance Cards</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div
              key={dept.department}
              className="p-5 rounded-3xl bg-white border border-sky-100 shadow-sm hover:border-blue-300 hover:shadow-md transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{dept.department}</span>
                <RiskBadge category={dept.riskCategory} score={dept.riskScore} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Bed Occupancy</div>
                  <div className="font-black text-slate-800 mt-0.5">{dept.occupancyRate}%</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Avg Wait Time</div>
                  <div className="font-black text-slate-800 mt-0.5">{dept.avgWaitingTime} mins</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Infection Rate</div>
                  <div className="font-black text-slate-800 mt-0.5">{dept.infectionRate}%</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Conformance</div>
                  <div className="font-black text-blue-600 mt-0.5">{dept.pathwayConformance}%</div>
                </div>
              </div>

              {dept.contributingFactors && dept.contributingFactors.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Key Factor:</div>
                  <div className="text-xs text-slate-600 line-clamp-2 font-medium">
                    {dept.contributingFactors[0]}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Alerts Feed */}
      {recentAlerts && recentAlerts.length > 0 && (
        <div className="bg-white border border-sky-100 shadow-sm rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Prioritized Open Quality Alerts</span>
            </h3>
            <span className="text-xs text-slate-500 font-semibold">{recentAlerts.length} issues requiring attention</span>
          </div>

          <div className="space-y-2.5">
            {recentAlerts.map((alert) => (
              <div
                key={alert._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-blue-200 gap-3 transition shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={alert.severity} />
                    <span className="text-xs font-bold text-slate-900">{alert.title}</span>
                    <span className="text-[10px] font-bold text-slate-600 px-2 py-0.5 rounded-md bg-slate-200">{alert.department}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{alert.reason}</p>
                </div>
                <div className="text-[11px] text-slate-500 self-end sm:self-center font-mono font-semibold">
                  {new Date(alert.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
