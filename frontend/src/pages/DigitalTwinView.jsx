import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { simulationApi } from '../services/api';
import MetricCard from '../components/common/MetricCard';
import RiskBadge from '../components/common/RiskBadge';
import { ErrorState } from '../components/common/StateViews';
import {
  Cpu,
  Play,
  Clock,
  Bed,
  UserPlus,
  Activity,
  AlertCircle,
  TrendingUp,
  RotateCcw
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

export default function DigitalTwinView() {
  const { selectedDepartment } = useApp();
  const targetDept = selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'Emergency';

  const [simParams, setSimParams] = useState({
    arrivalRatePerHour: 8.0,
    numDoctors: 4,
    numNurses: 8,
    numBeds: 20,
    avgConsultationTime: 25.0,
    avgBedStayHours: 6.0,
    simulationHours: 24
  });

  const [simData, setSimData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runSim = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await simulationApi.runDigitalTwin(simParams);
      setSimData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSim();
  }, []);

  const handleResetDefaults = () => {
    setSimParams({
      arrivalRatePerHour: 8.0,
      numDoctors: 4,
      numNurses: 8,
      numBeds: 20,
      avgConsultationTime: 25.0,
      avgBedStayHours: 6.0,
      simulationHours: 24
    });
  };

  const results = simData?.results;
  const timeline = simData?.timeline || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">SimPy Operational Digital Twin</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    DISCRETE-EVENT ENGINE
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Simulate patient arrivals, physician triage queues, and bed allocation dynamics for {targetDept} without modifying live clinical data.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={runSim}
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Simulating...' : 'Run Simulation'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={runSim} />}

      {/* Main Grid: Parameters + Real-time Outcome */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Sim Parameters */}
        <div className="lg:col-span-4 bg-white border border-sky-100 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Simulation Operational Controls
          </h3>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Patient Arrival Rate:</span>
              <span className="font-mono font-bold text-blue-700">{simParams.arrivalRatePerHour} pts/hr</span>
            </div>
            <input
              type="range"
              min="2"
              max="25"
              step="0.5"
              value={simParams.arrivalRatePerHour}
              onChange={(e) => setSimParams({ ...simParams, arrivalRatePerHour: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Duty Doctors:</span>
              <span className="font-mono font-bold text-blue-700">{simParams.numDoctors}</span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              value={simParams.numDoctors}
              onChange={(e) => setSimParams({ ...simParams, numDoctors: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Triage & Floor Nurses:</span>
              <span className="font-mono font-bold text-blue-700">{simParams.numNurses}</span>
            </div>
            <input
              type="range"
              min="2"
              max="24"
              value={simParams.numNurses}
              onChange={(e) => setSimParams({ ...simParams, numNurses: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Operational Bed Capacity:</span>
              <span className="font-mono font-bold text-blue-700">{simParams.numBeds} beds</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={simParams.numBeds}
              onChange={(e) => setSimParams({ ...simParams, numBeds: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Avg Doctor Consultation Time:</span>
              <span className="font-mono font-bold text-blue-700">{simParams.avgConsultationTime} mins</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              value={simParams.avgConsultationTime}
              onChange={(e) => setSimParams({ ...simParams, avgConsultationTime: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Avg Bed Stay Duration:</span>
              <span className="font-mono font-bold text-blue-700">{simParams.avgBedStayHours} hours</span>
            </div>
            <input
              type="range"
              min="1"
              max="24"
              value={simParams.avgBedStayHours}
              onChange={(e) => setSimParams({ ...simParams, avgBedStayHours: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <button
            onClick={runSim}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 transition mt-2"
          >
            {loading ? 'Running SimPy Process...' : 'Simulate Operational Impact'}
          </button>
        </div>

        {/* Right: Simulation Outputs & Graphs */}
        <div className="lg:col-span-8 space-y-6">
          {results ? (
            <>
              {/* Output Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-sky-100 shadow-sm">
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">Patients Served</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">{results.patientsServed}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">24-hour cycle</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-sky-100 shadow-sm">
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">Avg Wait Time</div>
                  <div className={`text-2xl font-black mt-1 ${results.avgWaitTimeMinutes > 30 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {results.avgWaitTimeMinutes}m
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Max: {results.maxWaitTimeMinutes}m</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-sky-100 shadow-sm">
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">Bed Occupancy</div>
                  <div className={`text-2xl font-black mt-1 ${results.avgBedOccupancyRate > 85 ? 'text-rose-700' : 'text-blue-700'}`}>
                    {results.avgBedOccupancyRate}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Capacity: {simParams.numBeds} beds</div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-sky-100 shadow-sm">
                  <div className="text-[11px] text-slate-500 uppercase font-semibold">Simulated Risk</div>
                  <div className="mt-1">
                    <RiskBadge category={results.simulatedRiskLevel} score={results.simulatedRiskScore} size="sm" />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Doctor Util: {results.doctorUtilizationRate}%</div>
                </div>
              </div>

              {/* Hourly Simulated Queue & Occupancy Dynamic Chart */}
              <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">24-Hour Simulated Operational Timeline</h3>
                    <p className="text-xs text-slate-500">Queue congestion and bed capacity utilization over simulated 24h</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="queueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                      <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px', color: '#1e293b' }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Area type="monotone" dataKey="queueLength" stroke="#d97706" fill="url(#queueGrad)" name="Waiting Queue" />
                      <Line type="monotone" dataKey="bedOccupancy" stroke="#2563eb" strokeWidth={2.5} name="Bed Occupancy %" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
              Initializing simulation model...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
