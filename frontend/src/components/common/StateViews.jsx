import React from 'react';
import { Database, AlertTriangle, RefreshCw } from 'lucide-react';

export function EmptyState({ title = 'No Data Available', message = 'No records found in database for the selected criteria.', onAction, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-sky-100 shadow-sm my-6">
      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
        <Database className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md mb-5 font-medium">{message}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20"
        >
          {actionLabel || 'Create New'}
        </button>
      )}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-rose-50/60 rounded-3xl border border-rose-200 shadow-sm my-6">
      <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-rose-800 mb-1">Service Notice</h3>
      <p className="text-xs text-rose-600/90 max-w-md mb-5 font-medium break-all">{error || 'Failed to communicate with the service backend.'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
}
