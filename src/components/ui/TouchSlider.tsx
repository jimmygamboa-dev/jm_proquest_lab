'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface TouchSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  helper?: string;
  onChange: (val: number) => void;
  required?: boolean;
}

export function TouchSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  helper,
  onChange,
}: TouchSliderProps) {
  const handleDecrement = () => {
    const next = Math.max(min, Number((value - step).toFixed(2)));
    onChange(next);
  };

  const handleIncrement = () => {
    const next = Math.min(max, Number((value + step).toFixed(2)));
    onChange(next);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-slate-700 tracking-tight">
          {label}
        </label>
        <div className="bg-white border border-slate-300 px-3 py-1 rounded-lg shadow-inner">
          <span className="text-xl font-black text-slate-900 tracking-tight">
            {value}
          </span>
          {unit && <span className="ml-1 text-xs font-bold text-slate-500">{unit}</span>}
        </div>
      </div>

      {/* Stepper + Slider Controles Táctiles */}
      <div className="flex items-center gap-3 mt-3">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          aria-label={`Disminuir ${label}`}
          className="h-12 w-12 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 active:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm select-none"
        >
          <Minus className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="flex-1 relative flex items-center px-1">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          aria-label={`Aumentar ${label}`}
          className="h-12 w-12 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 active:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm select-none"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      <div className="flex justify-between items-center mt-2 px-1 text-[11px] font-semibold text-slate-400">
        <span>Mín: {min} {unit}</span>
        {helper && <span className="text-slate-500 font-normal">{helper}</span>}
        <span>Máx: {max} {unit}</span>
      </div>
    </div>
  );
}
