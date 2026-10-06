import React from 'react';

export default function RiskBadge({ category, score, size = 'md' }) {
  const cat = (category || 'LOW').toUpperCase();
  
  let colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-300';
  if (cat === 'MEDIUM') {
    colorStyles = 'bg-amber-50 text-amber-800 border-amber-300';
  } else if (cat === 'HIGH') {
    colorStyles = 'bg-orange-50 text-orange-800 border-orange-300';
  } else if (cat === 'CRITICAL') {
    colorStyles = 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse';
  }

  const sizeStyles = size === 'sm' 
    ? 'text-[10px] px-2 py-0.5' 
    : size === 'lg' 
    ? 'text-sm px-3.5 py-1.5 font-bold' 
    : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${colorStyles} ${sizeStyles}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{cat} RISK</span>
      {score !== undefined && score !== null && (
        <span className="font-mono opacity-90">({score})</span>
      )}
    </span>
  );
}
