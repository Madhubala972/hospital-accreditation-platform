import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { metricsApi } from '../services/api';
import { EmptyState, ErrorState } from '../components/common/StateViews';
import {
  Activity,
  Calendar,
  Filter,
  TrendingUp,
  Table as TableIcon,
  RefreshCw,
  Clock,
  HeartPulse,
  Users
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

export default function OperationalMetrics() {
  const { selectedDepartment, refreshKey } = useApp();
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMetric, setViewMetric] = useState('occupancyRate'); // 'occupancyRate' | 'avgWaitingTime' | 'infectionRate' | 'pathwayConformance'

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await metricsApi.getMetrics(selectedDepartment, 50);
      setMetrics(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [selectedDepartment, refreshKey]);

  if (loading && metrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-blue-600">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchMetrics} />;
  }

  if (!metrics || metrics.length === 0) {
    return <EmptyState title="No Operational Metrics" message="No metric logs recorded for this department." />;
  }

  // Format historical chronological series
  const timelineData = [...metrics].reverse().map((m, idx) => ({
    date: new Date(m.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    occupancyRate: m.occupancyRate,
    avgWaitingTime: m.avgWaitingTime,
    infectionRate: m.infectionRate,
    staffingLevel: Number((m.staffingLevel * 100).toFixed(1)), // for scaled display
    pathwayConformance: m.pathwayConformance,
    incidentCount: m.incidentCount
  }));

  const metricConfigs = {
    occupancyRate: { name: 'Bed Occupancy (%)', color: '#2563eb', unit: '%' },
    avgWaitingTime: { name: 'Avg Waiting Time (mins)', color: '#d97706', unit: 'mins' },
    infectionRate: { name: 'Infection Rate (%)', color: '#e11d48', unit: '%' },
    pathwayConformance: { name: 'Pathway Conformance (%)', color: '#059669', unit: '%' }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Operational & Clinical Indicators Explorer</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Department-level operational time-series metrics from MongoDB. Filter historical trends and observe variance against safety bounds.
              </p>
            </div>
          </div>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(metricConfigs).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setViewMetric(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                viewMetric === key
                  ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cfg.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Historical Chart */}
      <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {metricConfigs[viewMetric].name} Timeline Trend
            </h3>
            <p className="text-xs text-slate-500">Sequential shift logs across recorded timeframe</p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metricConfigs[viewMetric].color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={metricConfigs[viewMetric].color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', color: '#1e293b' }}
                itemStyle={{ color: '#1e293b', fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey={viewMetric}
                stroke={metricConfigs[viewMetric].color}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#metricGrad)"
                name={metricConfigs[viewMetric].name}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Multi-Indicator Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Protocol Conformance vs Bed Occupancy</h3>
          <p className="text-xs text-slate-500 mb-4">Correlation between department crowding and clinical protocol adherence</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px', color: '#1e293b' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="pathwayConformance" stroke="#059669" strokeWidth={2.5} name="Conformance %" dot={false} />
                <Line type="monotone" dataKey="occupancyRate" stroke="#e11d48" strokeWidth={2.5} name="Occupancy %" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Waiting Times & Incident Frequency</h3>
          <p className="text-xs text-slate-500 mb-4">Monitoring adverse event counts during triage peaks</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px', color: '#1e293b' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="avgWaitingTime" stroke="#d97706" strokeWidth={2.5} name="Wait Time (mins)" dot={false} />
                <Line type="monotone" dataKey="incidentCount" stroke="#7c3aed" strokeWidth={2.5} name="Incidents" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Raw Records Table */}
      <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-blue-600" />
            <span>Recorded Shift Metrics Log ({metrics.length} records)</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Department</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Occupancy</th>
                <th className="p-3">Wait Time</th>
                <th className="p-3">Infection Rate</th>
                <th className="p-3">Staffing Ratio</th>
                <th className="p-3">Incidents</th>
                <th className="p-3">Conformance</th>
                <th className="p-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.slice(0, 15).map((m) => (
                <tr key={m._id} className="hover:bg-blue-50/40 transition">
                  <td className="p-3 font-semibold text-slate-900">{m.department}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-500">
                    {new Date(m.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3 font-mono">{m.occupancyRate}%</td>
                  <td className="p-3 font-mono">{m.avgWaitingTime} mins</td>
                  <td className="p-3 font-mono">{m.infectionRate}%</td>
                  <td className="p-3 font-mono">{m.staffingLevel}</td>
                  <td className="p-3 font-mono">{m.incidentCount}</td>
                  <td className="p-3 font-mono font-bold text-blue-700">{m.pathwayConformance}%</td>
                  <td className="p-3 text-slate-500">{m.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
