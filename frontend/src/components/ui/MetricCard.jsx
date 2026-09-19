import React from 'react';

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'teal', // 'teal' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate'
  badge,
  badgeVariant = 'neutral',
  onClick,
  className = ''
}) {
  const iconVariants = {
    teal: 'bg-teal-50 text-teal-700 border-teal-200/60',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/60',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/60',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    slate: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between transition-all duration-150 ${
        isClickable
          ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0'
          : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider line-clamp-1">
          {title}
        </span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconVariants[variant] || iconVariants.teal}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {value}
          </span>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 font-medium line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
