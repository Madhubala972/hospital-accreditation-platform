import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  KanbanSquare,
  FilePlus2,
  Activity,
  GitFork,
  SlidersHorizontal,
  Cpu,
  Radar,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  BotMessageSquare,
  Building2,
  UserCheck,
  LogIn,
  Lock
} from 'lucide-react';

const baseNavItems = [
  { name: 'Executive Overview', path: '/', icon: LayoutDashboard },
  { name: 'Evidence & Integrity', path: '/evidence', icon: ShieldCheck, badge: 'Auditor Only' },
  { name: 'Accreditation Standards', path: '/standards', icon: ShieldAlert },
  { name: 'Accreditation Kanban', path: '/kanban', icon: KanbanSquare },
  { name: 'Data Entry Center', path: '/data-entry', icon: FilePlus2 },
  { name: 'Operational Metrics', path: '/metrics', icon: Activity },
  { name: 'PM4Py Process Mining', path: '/process-mining', icon: GitFork },
  { name: 'Counterfactual Analysis', path: '/counterfactual', icon: SlidersHorizontal },
  { name: 'SimPy Digital Twin', path: '/digital-twin', icon: Cpu },
  { name: 'Peer Benchmark Radar', path: '/benchmarks', icon: Radar },
  { name: 'Alerts & Anomalies', path: '/alerts', icon: AlertTriangle },
  { 
    name: 'Executive Reports', 
    path: '/reports', 
    icon: FileText,
    badge: 'Auditor & Dean'
  },
  { name: 'AI Copilot Assistant', path: '/copilot', icon: BotMessageSquare },
];

export default function Sidebar() {
  const { user, pendingCount } = useAuth();
  const isDean = user?.role === 'Dean' || user?.role === 'Admin';
  const isAuditor = user?.role === 'Auditor' || user?.role === 'Admin';
  const isAuditorOrDean = user?.role === 'Auditor' || user?.role === 'Dean' || user?.role === 'Admin';

  return (
    <aside className="w-64 bg-white/95 backdrop-blur-md border-r border-sky-100 flex flex-col flex-shrink-0 h-screen sticky top-0 z-30 shadow-sm">
      {/* Brand Header */}
      <div className="p-5 border-b border-sky-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-slate-900 tracking-tight">Accreditation IQ</h1>
          <p className="text-[11px] text-blue-600 font-semibold">Evidence-Driven Intelligence</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Dean Executive Special Section */}
        {isDean && (
          <div className="mb-3 pb-3 border-b border-sky-100">
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Dean Governance
            </div>
            <NavLink
              to="/dean-approvals"
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-100/80 text-amber-900 border border-amber-300 shadow-sm'
                    : 'text-amber-800 bg-amber-50/70 border border-amber-200/80 hover:bg-amber-100 hover:text-amber-950'
                }`
              }
            >
              <div className="flex items-center gap-2.5 truncate">
                <UserCheck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="truncate">Dean Approvals & Audits</span>
              </div>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          </div>
        )}

        <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Intelligence Views
        </div>

        {baseNavItems.map((item) => {
          const Icon = item.icon;
          const isEvidence = item.path === '/evidence';
          const isRestrictedForUser = 
            (item.path === '/reports' && !isAuditorOrDean) ||
            (isEvidence && !isAuditor);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-bold shadow-sm'
                    : isEvidence
                    ? 'text-cyan-800 bg-cyan-50/60 hover:bg-cyan-100/70 border border-cyan-200/70'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-sky-50/70'
                }`
              }
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className={`w-4 h-4 flex-shrink-0 ${isEvidence ? 'text-cyan-600' : ''}`} />
                <span className="truncate">{item.name}</span>
              </div>
              {item.badge && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 font-mono font-medium ${
                  isEvidence ? 'bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {isRestrictedForUser && <Lock className="w-2.5 h-2.5 text-amber-600 mr-0.5" />}
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info & Account Switcher Link */}
      <div className="p-3.5 border-t border-sky-100 bg-slate-50/80 space-y-2">
        <Link
          to="/login"
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 shadow-sm transition"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In / Switch Profile</span>
        </Link>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-medium">
          <span>Active Role:</span>
          <span className="text-blue-700 font-bold font-mono">{user?.role || 'Guest'}</span>
        </div>
      </div>
    </aside>
  );
}
