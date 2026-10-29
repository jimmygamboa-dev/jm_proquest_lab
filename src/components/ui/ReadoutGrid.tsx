'use client';

import React from 'react';

interface ReadoutItem {
  label: string;
  value: string | number;
  highlight?: boolean;
  status?: 'good' | 'warn' | 'critical' | 'neutral';
  subtitle?: string;
}

interface ReadoutGridProps {
  items: ReadoutItem[];
  title?: string;
  helper?: string;
  columns?: 2 | 3 | 4;
}

export function ReadoutGrid({
  items,
  title,
  helper,
  columns = 3,
}: ReadoutGridProps) {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4',
  }[columns];

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800">
      {title && (
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {title}
          </span>
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
            Cálculo en Vivo
          </span>
        </div>
      )}

      <div className={`grid ${colClass} gap-3`}>
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-xl border flex flex-col justify-between ${
              item.highlight
                ? 'bg-blue-950/60 border-blue-500/40 text-blue-100'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
            }`}
          >
            <small className="text-xs font-semibold text-slate-400 leading-tight">
              {item.label}
            </small>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`text-xl sm:text-2xl font-black tracking-tight ${
                  item.status === 'good'
                    ? 'text-emerald-400'
                    : item.status === 'warn'
                    ? 'text-amber-400'
                    : item.status === 'critical'
                    ? 'text-red-400'
                    : item.highlight
                    ? 'text-blue-300'
                    : 'text-white'
                }`}
              >
                {item.value}
              </span>
              {item.subtitle && (
                <span className="text-xs text-slate-400 font-normal">
                  {item.subtitle}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {helper && (
        <p className="text-xs text-slate-400 mt-3 border-t border-slate-800 pt-2 font-medium">
          {helper}
        </p>
      )}
    </div>
  );
}
