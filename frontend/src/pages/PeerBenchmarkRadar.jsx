import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { benchmarksApi } from '../services/api';
import { EmptyState, ErrorState } from '../components/common/StateViews';
import {
  Radar as RadarIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  RefreshCw,
  Database,
  Building,
  Award,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip
} from 'recharts';

const DEPARTMENTS = [
  'Hospital-Wide',
  'ICU',
  'Emergency',
  'Surgery',
  'Cardiology',
  'General Ward'
];

export default function PeerBenchmarkRadar() {
  const { selectedDepartment, setSelectedDepartment, refreshKey } = useApp();
  const [activeDept, setActiveDept] = useState(selectedDepartment || 'Hospital-Wide');
  const [benchmarks, setBenchmarks] = useState([]);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedDepartment) {
      setActiveDept(selectedDepartment);
    }
  }, [selectedDepartment]);

  const fetchBenchmarks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await benchmarksApi.getBenchmarks(activeDept);
      setBenchmarks(res.data.data || []);
      setDatasetInfo(res.data.datasetInfo);
      setSummary(res.data.summary);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmarks();
  }, [activeDept, refreshKey]);

  const handleDeptChange = (dept) => {
    setActiveDept(dept);
    setSelectedDepartment(dept);
  };

  if (loading && benchmarks.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-blue-600">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchBenchmarks} />;
  }

  if (!benchmarks || benchmarks.length === 0) {
    return <EmptyState title="No Benchmarks Configured" message={`No peer benchmarks found for ${activeDept}.`} />;
  }

  // Format data for Radar Chart (normalize on 0-100 scale for comparison)
  const radarData = benchmarks.map(b => {
    let hospScaled = b.hospitalValue;
    let peerScaled = b.peerValue;

    if (b.metric === 'staffingLevel') {
      hospScaled = hospScaled * 100;
      peerScaled = peerScaled * 100;
    } else if (b.metric === 'infectionRate') {
      hospScaled = hospScaled * 20;
      peerScaled = peerScaled * 20;
    } else if (b.metric === 'incidentCount') {
      hospScaled = hospScaled * 15;
      peerScaled = peerScaled * 15;
    } else if (b.metric === 'avgWaitingTime') {
      hospScaled = Math.min(100, hospScaled);
      peerScaled = Math.min(100, peerScaled);
    }

    return {
      metric: b.metricLabel,
      HospitalActual: Number(hospScaled.toFixed(1)),
      PeerBenchmark: Number(peerScaled.toFixed(1)),
      rawHospital: b.hospitalValue,
      rawPeer: b.peerValue,
      unit: b.unit,
      metricKey: b.metric
    };
  });

  const CustomRadarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg text-xs space-y-1">
          <div className="font-bold text-slate-900 mb-1">{data.metric}</div>
          <div className="text-blue-700 flex items-center justify-between gap-4 font-semibold">
            <span>Hospital Actual:</span>
            <strong className="font-mono">{data.rawHospital} {data.unit}</strong>
          </div>
          <div className="text-amber-700 flex items-center justify-between gap-4 font-semibold">
            <span>National Peer Median:</span>
            <strong className="font-mono">{data.rawPeer} {data.unit}</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <RadarIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Peer Benchmark Quality Radar</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    VERIFIED REGISTRY COHORT
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparative quality gap analysis against verified peer accreditation cohort averages for <strong>{activeDept}</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <Database className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500">Registry Source:</div>
              <div className="font-semibold text-slate-800 text-[11px]">{datasetInfo?.source}</div>
            </div>
          </div>
        </div>

        {/* Department Quick Filter Tabs */}
        <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-slate-100">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              onClick={() => handleDeptChange(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                activeDept === dept
                  ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm font-bold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Scorecards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-sm">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-blue-600" />
              <span>Peer Alignment Score</span>
            </div>
            <div className="text-2xl font-black text-blue-700 mt-1">
              {summary.alignmentPercentage}%
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              Status: {summary.status.replace('_', ' ')}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-sm">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Favorable Indicators</span>
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {summary.favorableCount} <span className="text-xs font-normal text-slate-500">/ {summary.totalMetrics}</span>
            </div>
            <div className="text-[10px] text-emerald-700 mt-1 font-medium">
              Meets or beats national peer median
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-sm">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Attention Gaps</span>
            </div>
            <div className="text-2xl font-black text-rose-700 mt-1">
              {summary.unfavorableCount} <span className="text-xs font-normal text-slate-500">metrics</span>
            </div>
            <div className="text-[10px] text-rose-700 mt-1 font-medium">
              Targeted for CAPA quality improvement
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-sm">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-amber-600" />
              <span>Current Scope</span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1 truncate">
              {activeDept}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              {datasetInfo?.version}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Radar Chart + Gap Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Radar Chart */}
        <div className="lg:col-span-6 bg-white border border-sky-100 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Multi-Dimensional Performance Radar</h3>
              <span className="text-[11px] text-blue-700 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{activeDept}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 mb-4">Comparing hospital operational metrics against national accreditation peer medians</p>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" stroke="#64748b" fontSize={11} />
                <PolarRadiusAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                <Radar name="Hospital Actual" dataKey="HospitalActual" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.35} />
                <Radar name="Peer Benchmark" dataKey="PeerBenchmark" stroke="#d97706" fill="#f59e0b" fillOpacity={0.25} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Tooltip content={<CustomRadarTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Hospital Current Value
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Peer National Benchmark
            </span>
          </div>
        </div>

        {/* Right: Gap Analysis Table & Recommendations */}
        <div className="lg:col-span-6 bg-white border border-sky-100 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Peer Gap Variance Breakdown</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Variance vs verified accreditation thresholds</p>
            </div>
            <span className="text-xs font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-bold">
              {benchmarks.length} Standards
            </span>
          </div>

          <div className="space-y-3">
            {benchmarks.map((b) => (
              <div
                key={b.metric}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{b.metricLabel}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      b.isFavorable 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {b.isFavorable ? 'FAVORABLE' : 'GAP DETECTED'}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1 font-bold font-mono ${
                    b.isFavorable ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {b.isFavorable ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <span>{b.gap > 0 ? `+${b.gap}` : b.gap} {b.unit}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500">Hospital Actual: </span>
                    <strong className="text-slate-800 font-mono">{b.hospitalValue} {b.unit}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Peer Benchmark: </span>
                    <strong className="text-amber-700 font-mono">{b.peerBenchmark} {b.unit}</strong>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Source: {b.sourceName}</span>
                  <span className="font-mono text-slate-500">{b.datasetVersion}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
