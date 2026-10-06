import React from 'react';

export default function MetricCard({ title, value, unit = '', subtitle, icon: Icon, trend, color = 'cyan' }) {
  const colorMap = {
    cyan: {
      card: 'border-sky-200/90 shadow-sky-900/5',
      iconBox: 'bg-sky-50 border-sky-200 text-sky-600',
    },
    blue: {
      card: 'border-blue-200/90 shadow-blue-900/5',
      iconBox: 'bg-blue-50 border-blue-200 text-blue-600',
    },
    rose: {
      card: 'border-rose-200/90 shadow-rose-900/5',
      iconBox: 'bg-rose-50 border-rose-200 text-rose-600',
    },
    amber: {
      card: 'border-amber-200/90 shadow-amber-900/5',
      iconBox: 'bg-amber-50 border-amber-200 text-amber-700',
    },
    emerald: {
      card: 'border-emerald-200/90 shadow-emerald-900/5',
      iconBox: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    },
    indigo: {
      card: 'border-indigo-200/90 shadow-indigo-900/5',
      iconBox: 'bg-indigo-50 border-indigo-200 text-indigo-600',
    }
  };

  const currentTheme = colorMap[color] || colorMap.cyan;

  return (
    <div className={`p-5 rounded-2xl bg-white border ${currentTheme.card} shadow-md backdrop-blur-sm relative overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${currentTheme.iconBox}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">{value}</span>
        {unit && <span className="text-xs text-slate-500 font-bold">{unit}</span>}
      </div>
      {(subtitle || trend) && (
        <div className="mt-2 text-xs text-slate-600 flex items-center justify-between font-medium">
          <span className="truncate">{subtitle}</span>
          {trend && <span className="font-bold text-emerald-600 ml-2">{trend}</span>}
        </div>
      )}
    </div>
  );
}
