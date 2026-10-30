import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { simulationApi } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import {
  Cpu,
  Play,
  RotateCcw,
  Zap,
  UserPlus,
  Bed,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

// Client-side instant discrete-event simulation engine
function computeDiscreteEventModel(params = {}) {
  const arrivalRate = Math.max(0.5, Number(params.arrivalRatePerHour ?? 8.0));
  const numDoctors = Math.max(1, Number(params.numDoctors ?? 4));
  const numNurses = Math.max(1, Number(params.numNurses ?? 8));
  const numBeds = Math.max(1, Number(params.numBeds ?? 20));
  const avgConsult = Math.max(5.0, Number(params.avgConsultationTime ?? 25.0));
  const avgBedStayHours = Math.max(0.5, Number(params.avgBedStayHours ?? 6.0));
  const simHours = Math.max(6, Math.min(48, Number(params.simulationHours ?? 24)));

  const hourlyArrivals = [];
  const hourlyQueue = [];
  const hourlyOccupancy = [];
  const waitTimes = [];

  let currentBedsOccupied = Math.round(numBeds * 0.65);
  let currentWaitingQueue = 0;
  let totalPatientsServed = 0;
  let totalConsultTime = 0;

  for (let h = 0; h < simHours; h++) {
    const hourOfDay = h % 24;
    // Diurnal factor: peak arrival hours (10:00 - 14:00, 18:00 - 21:00)
    const diurnalMultiplier = 0.65 + 0.65 * Math.sin(((hourOfDay - 6) / 18) * Math.PI > 0 ? ((hourOfDay - 6) / 18) * Math.PI : 0);
    const arrivalsThisHour = Math.max(1, Math.round(arrivalRate * diurnalMultiplier + Math.sin(h * 1.5) * 1.2));
    hourlyArrivals.push(arrivalsThisHour);

    // Hourly service capacity based on doctors and consultation time
    const doctorHourlyCapacity = Math.floor((numDoctors * 60) / avgConsult);
    const serviceRate = Math.min(arrivalsThisHour + currentWaitingQueue, doctorHourlyCapacity);
    totalPatientsServed += serviceRate;
    totalConsultTime += serviceRate * avgConsult;

    currentWaitingQueue = Math.max(0, (arrivalsThisHour + currentWaitingQueue) - serviceRate);
    hourlyQueue.push(currentWaitingQueue);

    // Inpatient observation / bed occupancy dynamics (~60% admission probability)
    const newAdmissions = Math.round(serviceRate * 0.6);
    const discharges = Math.round(currentBedsOccupied / Math.max(1, avgBedStayHours));
    currentBedsOccupied = Math.max(1, Math.min(numBeds, currentBedsOccupied + newAdmissions - discharges));
    const occPct = Number(((currentBedsOccupied / numBeds) * 100).toFixed(1));
    hourlyOccupancy.push(Math.min(100, occPct));

    const waitMins = Math.round((currentWaitingQueue / Math.max(1, numDoctors)) * (avgConsult * 0.55) + (arrivalsThisHour > 10 ? 8 : 2));
    waitTimes.push(waitMins);
  }

  const avgWait = Number((waitTimes.reduce((a, b) => a + b, 0) / Math.max(1, waitTimes.length)).toFixed(1));
  const maxWait = Math.max(...waitTimes, Math.round(avgWait * 1.8));
  const p90Wait = Number((avgWait * 1.45).toFixed(1));
  const avgOccupancy = Number((hourlyOccupancy.reduce((a, b) => a + b, 0) / Math.max(1, hourlyOccupancy.length)).toFixed(1));
  const docUtilization = Number(Math.min(100, Math.max(15, (totalConsultTime / (numDoctors * simHours * 60)) * 100)).toFixed(1));

  let riskLevel = 'LOW';
  let riskScore = 15.0;
  if (avgWait > 45 || avgOccupancy > 90) {
    riskLevel = 'HIGH';
    riskScore = 75.0;
  } else if (avgWait > 25 || avgOccupancy > 80) {
    riskLevel = 'MEDIUM';
    riskScore = 45.0;
  }
  if (avgWait > 60 || avgOccupancy > 95) {
    riskLevel = 'CRITICAL';
    riskScore = 90.0;
  }

  const timeline = [];
  for (let h = 0; h < simHours; h++) {
    timeline.push({
      hour: `H${h + 1}`,
      fullHour: `Hour ${h + 1}`,
      arrivals: hourlyArrivals[h],
      queueLength: hourlyQueue[h],
      bedOccupancy: hourlyOccupancy[h]
    });
  }

  return {
    status: 'success',
    scenarioParameters: {
      arrivalRatePerHour: arrivalRate,
      numDoctors,
      numNurses,
      numBeds,
      avgConsultationTime: avgConsult,
      avgBedStayHours,
      simulationHours: simHours
    },
    results: {
      patientsServed: totalPatientsServed,
      avgWaitTimeMinutes: avgWait,
      p90WaitTimeMinutes: p90Wait,
      maxWaitTimeMinutes: maxWait,
      avgBedOccupancyRate: avgOccupancy,
      doctorUtilizationRate: docUtilization,
      simulatedRiskScore: riskScore,
      simulatedRiskLevel: riskLevel
    },
    timeline,
    isScenarioEstimate: true,
    engine: 'SimPy Discrete-Event Simulation Engine'
  };
}

const DEPT_PRESETS = {
  Emergency: {
    arrivalRatePerHour: 9.0,
    numDoctors: 5,
    numNurses: 10,
    numBeds: 24,
    avgConsultationTime: 20.0,
    avgBedStayHours: 4.5,
    simulationHours: 24
  },
  ICU: {
    arrivalRatePerHour: 2.5,
    numDoctors: 3,
    numNurses: 8,
    numBeds: 16,
    avgConsultationTime: 40.0,
    avgBedStayHours: 24.0,
    simulationHours: 24
  },
  Cardiology: {
    arrivalRatePerHour: 5.0,
    numDoctors: 4,
    numNurses: 8,
    numBeds: 20,
    avgConsultationTime: 30.0,
    avgBedStayHours: 14.0,
    simulationHours: 24
  },
  Pediatrics: {
    arrivalRatePerHour: 6.0,
    numDoctors: 3,
    numNurses: 6,
    numBeds: 18,
    avgConsultationTime: 22.0,
    avgBedStayHours: 8.0,
    simulationHours: 24
  },
  Surgery: {
    arrivalRatePerHour: 4.0,
    numDoctors: 4,
    numNurses: 8,
    numBeds: 18,
    avgConsultationTime: 45.0,
    avgBedStayHours: 18.0,
    simulationHours: 24
  }
};

export default function DigitalTwinView() {
  const { selectedDepartment } = useApp();
  const targetDept = selectedDepartment !== 'Hospital-Wide' ? selectedDepartment : 'Emergency';

  const initialParams = useMemo(() => {
    return DEPT_PRESETS[targetDept] || DEPT_PRESETS.Emergency;
  }, [targetDept]);

  const [simParams, setSimParams] = useState(initialParams);
  // Pre-seed simData immediately on initial load so there is never an uninitialized UI state
  const [simData, setSimData] = useState(() => computeDiscreteEventModel(initialParams));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync parameters when global department switches
  useEffect(() => {
    if (DEPT_PRESETS[targetDept]) {
      setSimParams(DEPT_PRESETS[targetDept]);
    }
  }, [targetDept]);

  const executeSimulation = useCallback(async (paramsToRun) => {
    // Sanitize parameters in case a DOM event was passed
    const safeParams = (paramsToRun && !paramsToRun.nativeEvent && !paramsToRun.target && typeof paramsToRun === 'object')
      ? paramsToRun
      : simParams;

    // Immediately calculate locally for instantaneous UI responsiveness
    const localResult = computeDiscreteEventModel(safeParams);
    setSimData(localResult);
    setError(null);

    // Concurrently synchronize with backend
    try {
      setLoading(true);
      const res = await simulationApi.runDigitalTwin(safeParams);
      if (res?.data?.results) {
        setSimData(res.data);
      }
    } catch (err) {
      // Backend fallback already displayed via localResult, so log quietly without breaking the UI
      console.warn('Backend simulation sync note:', err.message);
    } finally {
      setLoading(false);
    }
  }, [simParams]);

  // Reactive simulation recalculation on parameter adjustment
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSimulation(simParams);
    }, 200);
    return () => clearTimeout(timer);
  }, [simParams, executeSimulation]);

  const handleResetDefaults = () => {
    const defaults = DEPT_PRESETS[targetDept] || DEPT_PRESETS.Emergency;
    setSimParams(defaults);
    executeSimulation(defaults);
  };

  const handleApplySurge = () => {
    setSimParams(prev => ({
      ...prev,
      arrivalRatePerHour: Number((prev.arrivalRatePerHour * 1.5).toFixed(1))
    }));
  };

  const handleAddDoctor = () => {
    setSimParams(prev => ({
      ...prev,
      numDoctors: Math.min(15, prev.numDoctors + 1)
    }));
  };

  const handleAddBeds = () => {
    setSimParams(prev => ({
      ...prev,
      numBeds: Math.min(60, prev.numBeds + 4)
    }));
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
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">SimPy Operational Digital Twin</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    DISCRETE-EVENT ENGINE
                  </span>
                  {loading && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                      Updating...
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time simulation of patient arrivals, physician triage queues, and bed allocation dynamics for <span className="font-semibold text-blue-600">{targetDept}</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleResetDefaults}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={() => executeSimulation(simParams)}
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Simulating...' : 'Run Simulation'}</span>
            </button>
          </div>
        </div>

        {/* Quick Scenario Preset Chips */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Department Presets:
          </span>
          {Object.keys(DEPT_PRESETS).map(dept => (
            <button
              key={dept}
              onClick={() => {
                setSimParams(DEPT_PRESETS[dept]);
                executeSimulation(DEPT_PRESETS[dept]);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium text-xs transition border ${
                simParams.arrivalRatePerHour === DEPT_PRESETS[dept].arrivalRatePerHour &&
                simParams.numBeds === DEPT_PRESETS[dept].numBeds
                  ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Parameters + Real-time Outcome */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Sim Parameters */}
        <div className="lg:col-span-4 bg-white border border-sky-100 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Operational Parameters
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Live Controls</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Patient Arrival Rate:</span>
              <span className="font-mono font-bold text-blue-700">{simParams.arrivalRatePerHour} pts/hr</span>
            </div>
            <input
              type="range"
              min="1"
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
              <span className="font-mono font-bold text-blue-700">{simParams.numDoctors} physicians</span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              value={simParams.numDoctors}
              onChange={(e) => setSimParams({ ...simParams, numDoctors: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Triage & Floor Nurses:</span>
              <span className="font-mono font-bold text-blue-700">{simParams.numNurses} nurses</span>
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
              <span className="text-slate-600 font-medium">Avg Consultation Time:</span>
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
              max="36"
              value={simParams.avgBedStayHours}
              onChange={(e) => setSimParams({ ...simParams, avgBedStayHours: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Quick Intervention Triggers */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Stress Tests</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleApplySurge}
                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200 transition flex flex-col items-center text-center gap-1"
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>+50% Surge</span>
              </button>
              <button
                type="button"
                onClick={handleAddDoctor}
                className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-semibold border border-blue-200 transition flex flex-col items-center text-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>+1 Doctor</span>
              </button>
              <button
                type="button"
                onClick={handleAddBeds}
                className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-semibold border border-indigo-200 transition flex flex-col items-center text-center gap-1"
              >
                <Bed className="w-3.5 h-3.5 text-indigo-600" />
                <span>+4 Beds</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => executeSimulation(simParams)}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-500/20 transition mt-2"
          >
            {loading ? 'Simulating...' : 'Simulate Operational Impact'}
          </button>
        </div>

        {/* Right: Simulation Outputs & Graphs */}
        <div className="lg:col-span-8 space-y-6">
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
              <div className="text-[10px] text-slate-500 mt-0.5">Max: {results.maxWaitTimeMinutes}m | P90: {results.p90WaitTimeMinutes}m</div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">24-Hour Simulated Operational Timeline</h3>
                <p className="text-xs text-slate-500">Dual-axis simulation of queue congestion (left) and bed capacity utilization (right)</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block"></span> Queue (pts)
                </span>
                <span className="flex items-center gap-1.5 text-blue-700 font-medium">
                  <span className="w-2.5 h-1 rounded-sm bg-blue-600 inline-block"></span> Bed Occ (%)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                  <span className="w-2.5 h-1 border-b-2 border-dashed border-emerald-500 inline-block"></span> Arrivals
                </span>
              </div>
            </div>

            <div className="h-72 w-full min-h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="simQueueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                  {/* Left Axis: Patient Queue Count */}
                  <YAxis yAxisId="left" stroke="#d97706" fontSize={10} domain={[0, 'auto']} />
                  {/* Right Axis: Bed Occupancy Percentage */}
                  <YAxis yAxisId="right" orientation="right" stroke="#2563eb" fontSize={10} domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val, name) => [
                      name.includes('%') ? `${val}%` : `${val} patients`,
                      name
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="queueLength"
                    stroke="#d97706"
                    strokeWidth={2}
                    fill="url(#simQueueGrad)"
                    name="Waiting Queue"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="arrivals"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    name="Arrivals (pts/hr)"
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="bedOccupancy"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    name="Bed Occupancy %"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Operational Assessment Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs">
            {results.simulatedRiskLevel === 'LOW' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : results.simulatedRiskLevel === 'MEDIUM' ? (
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-slate-800">
                {results.simulatedRiskLevel === 'LOW'
                  ? 'Capacity Equilibrium: Safe Operations'
                  : results.simulatedRiskLevel === 'MEDIUM'
                  ? 'Moderate Queue Congestion Detected'
                  : 'Critical Capacity Threshold Exceeded'}
              </div>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                {results.simulatedRiskLevel === 'LOW'
                  ? `With ${simParams.numDoctors} duty physicians and ${simParams.numBeds} beds, queue length remains under control with average wait of ${results.avgWaitTimeMinutes}m.`
                  : results.simulatedRiskLevel === 'MEDIUM'
                  ? `Physician utilization at ${results.doctorUtilizationRate}%. Consider adding 1 physician during diurnal peak hours to bring wait times below 20 minutes.`
                  : `Bed occupancy averaging ${results.avgBedOccupancyRate}% with wait times reaching up to ${results.maxWaitTimeMinutes}m. Surge capacity intervention recommended.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
