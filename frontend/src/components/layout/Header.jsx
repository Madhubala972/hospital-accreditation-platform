import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { RefreshCw, Activity, Database, Cpu, UserCheck, ShieldCheck, LogIn, Clock } from 'lucide-react';

const departments = [
  'Hospital-Wide',
  'ICU',
  'Emergency',
  'Surgery',
  'Cardiology',
  'General Ward'
];

export default function Header() {
  const { selectedDepartment, setSelectedDepartment, systemStatus, triggerRefresh } = useApp();
  const { user, pendingCount } = useAuth();
  const isDean = user?.role === 'Dean' || user?.role === 'Admin';

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-sky-100 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      {/* Left: Department Selector */}
      <div className="flex items-center gap-3 sm:gap-4">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Department Scope:
        </label>
        <select
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer shadow-sm hover:border-blue-300 transition"
        >
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      </div>

      {/* Right: Service Status, Refresh, User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Dean Pending Approvals Alert Pill */}
        {isDean && pendingCount > 0 && (
          <Link
            to="/dean-approvals"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold hover:bg-amber-100 transition shadow-sm animate-pulse"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>{pendingCount} Pending Registration{pendingCount > 1 ? 's' : ''}</span>
          </Link>
        )}

        {/* Live Connectivity Indicators */}
        <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
          {/* MongoDB */}
          <div className="flex items-center gap-1.5 text-[11px]" title={`MongoDB: ${systemStatus.mongoDB}`}>
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">Mongo:</span>
            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              systemStatus.mongoDB === 'connected'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {systemStatus.mongoDB === 'connected' ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="w-px h-3 bg-slate-200" />

          {/* Python AI Service */}
          <div className="flex items-center gap-1.5 text-[11px]" title={`Python Flask (PM4Py/SimPy): ${systemStatus.pythonAIService}`}>
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">Python AI:</span>
            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              systemStatus.pythonAIService === 'online'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {systemStatus.pythonAIService === 'online' ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Refresh Action */}
        <button
          onClick={triggerRefresh}
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 hover:border-blue-200 transition shadow-sm"
          title="Refresh Current View Data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sync</span>
        </button>

        {/* User Profile & Switcher Link */}
        <Link
          to="/login"
          title="Click to Switch User Role or Sign In"
          className="flex items-center gap-2.5 pl-2 border-l border-slate-200 hover:opacity-90 transition group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xs shadow-md group-hover:ring-2 group-hover:ring-blue-400">
            {user?.name ? user.name.charAt(0) : 'U'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-800 leading-tight flex items-center gap-1.5">
              <span>{user?.name || 'Dr. Sarah Jenkins'}</span>
            </div>
            <div className="text-[10px] text-blue-600 font-semibold flex items-center gap-1">
              <span>{user?.role?.replace('_', ' ') || 'Quality Manager'}</span>
              <span className="text-[9px] text-slate-500 font-normal">({user?.department || 'Hospital-Wide'})</span>
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}

