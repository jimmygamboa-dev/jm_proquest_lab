'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { CAGES, AGE_GRILLERS } from '../../lib/constants';
import { fmt, nextId, nymphsFor, dateDays } from '../../lib/calculations';
import { TouchSlider } from '../ui/TouchSlider';
import { TouchSelectModal } from '../ui/TouchSelectModal';
import {
  Save,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Sprout,
  Scale,
  Calendar,
  UserCheck,
} from 'lucide-react';

interface Stage4SowingFormProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export function Stage4SowingForm({ onBack, onSuccess }: Stage4SowingFormProps) {
  const { state, currentEmployee, saveSowing } = useStore();

  // Paso actual (1: Lote & Cajón, 2: Pesaje & Balance)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Orígenes disponibles: Cajas de traslado (Etapa 3) e Incubaciones directas (Etapa 2)
  const transferSources = state.transfers.map((t) => ({
    type: 'transfer' as const,
    id: t.id,
    label: `Caja ${t.boxCode} (Traslado ${t.id})`,
    detail: `Peso: ${t.weight} g | Ninfas: ${fmt(t.nymphs)} | Fecha: ${t.date}`,
    weight: t.weight,
    date: t.date,
  }));

  const directSources = state.incubations
    .filter((i) => i.transferMode === 'Directo a cajón')
    .map((i) => ({
      type: 'direct' as const,
      id: i.id,
      label: `Incubación directa ${i.id}`,
      detail: `Peso: ${i.newbornWeight || 0} g | Ninfas: ${fmt(i.newbornCount)} | Nacimiento: ${i.actualBirth || i.entryDate}`,
      weight: i.newbornWeight || 100,
      date: i.actualBirth || i.entryDate,
    }));

  const allSources = [...transferSources, ...directSources];
  const defaultSource = allSources[0];

  const [sourceKey, setSourceKey] = useState(defaultSource ? `${defaultSource.type}|${defaultSource.id}` : '');
  const [cage, setCage] = useState('CE-001');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState(defaultSource ? defaultSource.weight : 48);

  // Empleado tomado automáticamente de la sesión/login
  const employeeCode = currentEmployee?.employee_code || 'E-06';
  const employeeName = currentEmployee?.full_name || 'Operador en turno';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedParts = sourceKey.split('|');
  const sourceType = (selectedParts[0] || 'transfer') as 'transfer' | 'direct';
  const sourceId = selectedParts[1] || '';

  // Fecha de nacimiento para calcular edad biológica
  let birthDate = '';
  if (sourceType === 'direct') {
    const inc = state.incubations.find((i) => i.id === sourceId);
    birthDate = inc?.actualBirth || inc?.entryDate || '';
  } else {
    const trans = state.transfers.find((t) => t.id === sourceId);
    const inc = trans ? state.incubations.find((i) => i.id === trans.incubationId) : null;
    birthDate = inc?.actualBirth || inc?.entryDate || '';
  }

  const biologicalAge = birthDate && date ? dateDays(birthDate, date) || 1 : 1;
  const rate = AGE_GRILLERS[biologicalAge] || 0;
  const estimatedNymphs = nymphsFor(weight, biologicalAge);

  // Ciclo correlativo para el cajón
  const existingCycleCount = state.sowings.filter((s) => s.cage === cage).length;
  const cycleId = `C-${cage.replace('-', '')}-${String(existingCycleCount + 1).padStart(3, '0')}`;
  const generatedId = nextId('SOW', date, state.sowings);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sourceKey) {
      alert('Seleccione un lote de ninfas de origen.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveSowing({
        id: generatedId,
        sourceType,
        sourceId,
        cage,
        cycleId,
        date,
        weight,
        nymphs: estimatedNymphs || 0,
        employee: employeeCode,
        biologicalAge,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Error guardando siembra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sourceOptions = allSources.map((s) => ({
    value: `${s.type}|${s.id}`,
    label: s.label,
    detail: s.detail,
  }));

  const cageOptions = CAGES.map((c) => ({
    value: c,
    label: c,
    detail: `Cajón de engorde ${c}`,
  }));

  const stepsConfig = [
    { num: 1, label: 'Lote de Origen & Cajón', icon: Sprout },
    { num: 2, label: 'Pesaje & Balance de Siembra', icon: Scale },
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col justify-between min-h-[500px]">
      {/* Encabezado compacto optimizado para Tablet */}
      <div className="border-b pb-3 border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-8 bg-amber-500 rounded-full shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-amber-600 uppercase tracking-wider">
                  Etapa 4 · Segmento 2
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  Operador: <strong className="text-slate-800">{employeeCode}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Siembra en Cajones
              </h1>
            </div>
          </div>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 text-xs sm:text-sm font-bold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Salir</span>
            </button>
          )}
        </div>

        {/* Stepper / Indicador de Paso a Paso Táctil */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
          {stepsConfig.map((s) => {
            const isCurrent = currentStep === s.num;
            const isCompleted = currentStep > s.num;

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (s.num < currentStep) setCurrentStep(s.num as 1 | 2);
                }}
                disabled={s.num > currentStep}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-left ${
                  isCurrent
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                    : isCompleted
                    ? 'bg-amber-50 text-amber-900 hover:bg-amber-100 cursor-pointer'
                    : 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    isCurrent
                      ? 'bg-white text-amber-600'
                      : isCompleted
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? '✓' : s.num}
                </div>
                <div className="truncate">
                  <div className="text-[10px] uppercase font-bold opacity-75 leading-none">
                    Paso {s.num}
                  </div>
                  <div className="text-xs font-black truncate">{s.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerta de Éxito */}
      {showSuccess && (
        <div className="my-3 bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 flex items-center gap-3 text-emerald-900 animate-in fade-in">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <div className="font-bold text-base">¡Siembra en cajón {cage} exitosa!</div>
            <div className="text-xs opacity-90">Ciclo iniciado: {cycleId}. Listo para engorde de 45 días.</div>
          </div>
        </div>
      )}

      {/* Contenedor Principal de los Pasos (Controlado para Tablet) */}
      <div className="py-4 flex-1 flex flex-col justify-center">
        {/* =========================================================================
            PASO 1: Lote de Origen & Cajón Destino
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">1. Asignación de Lote y Cajón de Engorde</h2>
                <p className="text-xs text-slate-500">
                  Seleccione las ninfas recibidas (desde cajas 60 L o incubación directa) y el cajón destino.
                </p>
              </div>
              <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Nuevo Ciclo</span>
                <span className="text-sm font-black text-amber-700 tracking-tight">{cycleId}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <TouchSelectModal
                  label="Lote de ninfas de origen"
                  value={sourceKey}
                  options={sourceOptions}
                  onChange={(val) => {
                    setSourceKey(val);
                    const found = allSources.find((s) => `${s.type}|${s.id}` === val);
                    if (found) setWeight(found.weight);
                  }}
                  required
                />
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <TouchSelectModal
                  label="Cajón de engorde destino"
                  value={cage}
                  options={cageOptions}
                  onChange={setCage}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Fecha Real de Siembra */}
              <div className="flex flex-col gap-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  Fecha real de siembra <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-h-[50px] px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-base focus:border-amber-500 shadow-sm"
                />
                <span className="text-[11px] text-slate-400">
                  Nacimiento origen: {birthDate || 'No registrada'}
                </span>
              </div>

              {/* Tarjeta de Confirmación de Operador Autenticado */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 font-black text-sm">
                  {employeeCode}
                </div>
                <div>
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    Operador Autenticado
                  </div>
                  <div className="text-sm font-black text-slate-900">{employeeName}</div>
                  <div className="text-[11px] text-slate-500">
                    Tomado automáticamente de la sesión activa en tablet.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PASO 2: Pesaje, Balance Integral y Cierre
            ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">2. Pesaje Sembrado y Balance Integral</h2>
                <p className="text-xs text-slate-500">
                  Ajuste el peso y valide el inicio del ciclo de engorde de 45 días antes de guardar.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                Paso Final
              </span>
            </div>

            <TouchSlider
              label="Peso real trasladado al cajón"
              value={weight}
              min={5}
              max={300}
              step={1}
              unit="g"
              helper={`Edad biológica calculada: ${biologicalAge} días (${fmt(rate)} grillos/g)`}
              onChange={setWeight}
            />

            {/* Grilla de Métricas Finales y Estadísticas Completas */}
            <div className="bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Parámetros del Ciclo de Engorde</span>
                <span className="text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/60 font-semibold">
                  Apertura de Ciclo
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* 1. Ciclo Iniciado */}
                <div className="p-2.5 bg-amber-950/60 border border-amber-500/40 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-300 uppercase block">
                    Ciclo Iniciado
                  </span>
                  <span className="text-base sm:text-lg font-black text-amber-300 tracking-tight">
                    {cycleId}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Cajón {cage}
                  </span>
                </div>

                {/* 2. Ninfas Sembradas */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Ninfas Sembradas
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight">
                    {fmt(estimatedNymphs)} <span className="text-[10px] font-semibold text-slate-400">ninfas</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {weight}g × {fmt(rate)} grillos/g
                  </span>
                </div>

                {/* 3. ID de Siembra */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    ID Registro
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {generatedId}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Fecha: {date}
                  </span>
                </div>

                {/* 4. Edad Biológica */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Edad Biológica
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {biologicalAge} días
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Nacimiento: {birthDate || '—'}
                  </span>
                </div>

                {/* 5. Duración Proyectada */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Duración Estimada
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    45 días
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Ciclo de engorde estándar
                  </span>
                </div>

                {/* 6. Origen del Lote */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Origen Lote
                  </span>
                  <span className="text-base sm:text-lg font-black text-blue-300 tracking-tight truncate block">
                    {sourceType === 'direct' ? 'Directo Incubación' : 'Caja 60 L'}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    ID: {sourceId}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barra de Navegación Inferior */}
      <div className="pt-3 border-t border-slate-200 mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (currentStep === 1) {
              if (onBack) onBack();
            } else {
              setCurrentStep(1);
            }
          }}
          className="min-h-[52px] px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-bold text-sm flex items-center gap-2 border border-slate-200 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{currentStep === 1 ? 'Cancelar' : 'Paso Anterior'}</span>
        </button>

        <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-400">
          <span>Paso {currentStep} de 2</span>
        </div>

        {currentStep === 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className="min-h-[52px] px-6 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all"
          >
            <span>Siguiente: Pesaje y Balance</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting}
            className="min-h-[52px] px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{isSubmitting ? 'Guardando Siembra...' : 'Confirmar y Guardar Siembra'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
