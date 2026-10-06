import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import SituationAlertPopup from '../common/SituationAlertPopup';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';

export default function Layout() {
  const { notifications } = useApp();

  return (
    <div className="flex min-h-screen bg-slate-50/90 text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <Suspense
            fallback={
              <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-xs font-semibold tracking-wide">Loading accreditation intelligence view...</p>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-up ${
              n.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900'
                : n.type === 'error'
                ? 'bg-rose-50/95 border-rose-300 text-rose-900'
                : 'bg-white/95 border-sky-200 text-slate-800'
            }`}
          >
            {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {n.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
            {n.type === 'info' && <Info className="w-4 h-4 text-blue-600" />}
            <span>{n.message}</span>
          </div>
        ))}
      </div>

      {/* Real-time Emergency Situation Alert Popup Beacon & Modal */}
      <SituationAlertPopup />
    </div>
  );
}
