'use client';

import React, { useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

interface TouchSelectModalProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string; detail?: string }>;
  placeholder?: string;
  helper?: string;
  onChange: (val: string) => void;
  required?: boolean;
}

export function TouchSelectModal({
  label,
  value,
  options,
  placeholder = 'Seleccionar...',
  helper,
  onChange,
  required,
}: TouchSelectModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = options.find((o) => o.value === value);

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.value.toLowerCase().includes(search.toLowerCase()) ||
      (o.detail && o.detail.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Botón táctil que abre el selector */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full min-h-[52px] px-4 py-3 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-between text-left shadow-sm active:bg-slate-50 hover:border-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
      >
        <div className="flex flex-col truncate">
          {selectedOption ? (
            <>
              <span className="font-bold text-slate-900 text-base truncate">
                {selectedOption.label}
              </span>
              {selectedOption.detail && (
                <span className="text-xs text-slate-500 font-medium truncate">
                  {selectedOption.detail}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 font-medium">{placeholder}</span>
          )}
        </div>
        <ChevronDown className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
      </button>

      {helper && <p className="text-xs text-slate-500 mt-0.5">{helper}</p>}

      {/* Modal táctil de pantalla completa o flotante */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full sm:max-w-xl max-h-[85vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-200">
            {/* Header del modal */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{label}</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {options.length} opciones disponibles
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 active:scale-95 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Buscador táctil */}
            {options.length > 8 && (
              <div className="p-3 border-b border-slate-100 bg-white">
                <div className="relative flex items-center">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filtrar por código o nombre..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-3 text-xs text-slate-400 font-bold hover:text-slate-600"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Cuadrícula táctil de opciones */}
            <div className="p-3 overflow-y-auto max-h-[60vh] grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-bold shadow-sm'
                        : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 text-slate-800'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="text-sm font-semibold truncate">
                        {opt.label}
                      </div>
                      {opt.detail && (
                        <div className="text-xs text-slate-500 truncate font-normal mt-0.5">
                          {opt.detail}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 text-sm">
                  No se encontraron resultados para &quot;{search}&quot;
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
