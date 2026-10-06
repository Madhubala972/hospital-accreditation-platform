import React from 'react';

export default function StatusBadge({ status, label }) {
  const s = (status || '').toUpperCase();
  
  let styles = 'bg-slate-100 text-slate-700 border-slate-300';

  if (s === 'COMPLIANT' || s === 'COMPLETED' || s === 'RESOLVED' || s === 'APPROVED') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-300';
  } else if (s === 'NON_COMPLIANT' || s === 'CRITICAL' || s === 'OPEN' || s === 'REJECTED') {
    styles = 'bg-rose-50 text-rose-700 border-rose-300';
  } else if (s === 'IN_PROGRESS' || s === 'ASSIGNED' || s === 'ACKNOWLEDGED') {
    styles = 'bg-sky-50 text-sky-700 border-sky-300';
  } else if (s === 'AT_RISK' || s === 'MEDIUM' || s === 'HIGH' || s === 'WAITING_APPROVAL') {
    styles = 'bg-amber-50 text-amber-800 border-amber-300';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${styles}`}>
      {label || s.replace('_', ' ')}
    </span>
  );
}
