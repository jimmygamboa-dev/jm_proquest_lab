'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { nextId } from '../../lib/calculations';
import { TouchSelectModal } from '../ui/TouchSelectModal';
import {
  Save,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Calendar,
  Wrench,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface Stage6CleaningFormProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export function Stage6CleaningForm({ onBack, onSuccess }: Stage6CleaningFormProps) {
  const { state, currentEmployee, saveCleaning } = useStore();

  // Paso actual (1: Ciclo & Fechas, 2: Inspección & Habilitación)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const cleanedCycles = new Set(state.cleanings.map((c) => c.cycleId));
  const uncleanedHarvests = state.harvests.filter((h) => !cleanedCycles.has(h.cycleId));
  const availableHarvests = uncleanedHarvests.length ? uncleanedHarvests : state.harvests;
  const defaultHarvest = availableHarvests[0];

  const [cycleId, setCycleId] = useState(defaultHarvest?.cycleId || 'C-CE001-001');
  const [cleanDate, setCleanDate] = useState(new Date().toISOString().slice(0, 10));
  const [assembleDate, setAssembleDate] = useState(new Date().toISOString().slice(0, 10));
  const [repairRequired, setRepairRequired] = useState<'No' | 'Sí'>('No');
  const [repairDate, setRepairDate] = useState('');

  // Empleado tomado automáticamente de la sesión/login
  const employeeCode = currentEmployee?.employee_code || 'E-06';
  const employeeName = currentEmployee?.full_name || 'Operador en turno';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedHarvest = state.harvests.find((h) => h.cycleId === cycleId);
  const cage = selectedHarvest?.cage || 'CE-001';
  const generatedId = nextId('LP', cleanDate, state.cleanings);

  const isAvailableForNewCycle =
    cleanDate && assembleDate && (repairRequired === 'No' || (repairRequired === 'Sí' && repairDate));

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cycleId) {
      alert('Seleccione un ciclo cosechado.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveCleaning({
        id: generatedId,
        cycleId,
        cleanDate,
        assembleDate,
        repairRequired,
        repairDate: repairRequired === 'Sí' ? repairDate : undefined,
        employee: employeeCode,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Error guardando limpieza.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const harvestOptions = availableHarvests.map((h) => ({
    value: h.cycleId,
    label: `${h.cycleId} (Cajón ${h.cage})`,
    detail: `Cosechado el ${h.date} | ${h.bags.length} bolsas`,
  }));

  const stepsConfig = [
    { num: 1, label: 'Ciclo & Fechas Sanitarias', icon: Sparkles },
    { num: 2, label: 'Inspección & Habilitación', icon: ShieldCheck },
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
                  Etapa 6 · Segmento 2
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  Operador: <strong className="text-slate-800">{employeeCode}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Limpieza y Preparación del Cajón
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
            <div className="font-bold text-base">¡Cajón {cage} preparado y registrado!</div>
            <div className="text-xs opacity-90">Registro: {generatedId}. Cajón habilitado para nueva siembra.</div>
          </div>
        </div>
      )}

      {/* Contenedor Principal de Pasos */}
      <div className="py-4 flex-1 flex flex-col justify-center">
        {/* =========================================================================
            PASO 1: Ciclo Cosechado & Fechas Sanitarias
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">1. Ciclo a Procesar y Cronograma Sanitario</h2>
                <p className="text-xs text-slate-500">
                  Seleccione el cajón que finalizó su cosecha y establezca las fechas de desinfección y armado.
                </p>
              </div>
              <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Cajón Involucrado</span>
                <span className="text-sm font-black text-amber-700 tracking-tight">{cage}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <TouchSelectModal
                  label="Ciclo cosechado a procesar"
                  value={cycleId}
                  options={harvestOptions}
                  onChange={setCycleId}
                  required
                />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fecha de Limpieza */}
              <div className="flex flex-col gap-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  Fecha de limpieza y desinfección <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={cleanDate}
                  onChange={(e) => setCleanDate(e.target.value)}
                  className="w-full min-h-[50px] px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-base focus:border-amber-500 shadow-sm"
                />
                <span className="text-[11px] text-slate-400">Lavado a presión y sanitizante</span>
              </div>

              {/* Fecha de Rearmado con Cartones */}
              <div className="flex flex-col gap-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  Fecha de rearmado con cartones <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={cleanDate}
                  value={assembleDate}
                  onChange={(e) => setAssembleDate(e.target.value)}
                  className="w-full min-h-[50px] px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-base focus:border-amber-500 shadow-sm"
                />
                <span className="text-[11px] text-slate-400">Colocación de hueveras nuevas</span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PASO 2: Inspección Mecánica & Estado de Habilitación
            ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">2. Inspección Mecánica y Estado Final</h2>
                <p className="text-xs text-slate-500">
                  Verifique la integridad física del cajón y confirme su habilitación para nueva siembra.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                Paso Final
              </span>
            </div>

            {/* Inspección y Reparaciones */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <Wrench className="w-4 h-4 text-amber-600" />
                Inspección y Reparaciones Mecánicas del Cajón
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setRepairRequired('No')}
                  className={`py-2.5 px-4 rounded-xl border-2 font-bold text-xs transition-all ${
                    repairRequired === 'No'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ✓ Sin Reparación (Óptimo)
                </button>
                <button
                  type="button"
                  onClick={() => setRepairRequired('Sí')}
                  className={`py-2.5 px-4 rounded-xl border-2 font-bold text-xs transition-all ${
                    repairRequired === 'Sí'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ⚠ Requiere Reparación
                </button>
              </div>

              {repairRequired === 'Sí' && (
                <div className="flex flex-col gap-1 max-w-sm pt-1 animate-in fade-in">
                  <label className="text-xs font-bold text-amber-900">
                    Fecha de reparación completada <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={cleanDate}
                    value={repairDate}
                    onChange={(e) => setRepairDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-amber-300 rounded-xl font-bold text-xs"
                  />
                  <span className="text-[10px] text-slate-400">
                    El cajón solo quedará habilitado cuando la reparación esté fechada.
                  </span>
                </div>
              )}
            </div>

            {/* Grilla de Métricas Finales y Balance Post-Limpieza */}
            <div className="bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Estado del Cajón Post-Limpieza</span>
                <span className="text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/60 font-semibold">
                  Habilitación Sanitaria
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* 1. Estado de Habilitación */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Estado Sanitario
                  </span>
                  <span
                    className={`text-base sm:text-lg font-black tracking-tight ${
                      isAvailableForNewCycle ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {isAvailableForNewCycle ? 'Habilitado' : 'Pendiente'}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {isAvailableForNewCycle ? 'Listo para siembra' : 'Requiere fecha de reparación'}
                  </span>
                </div>

                {/* 2. Cajón Procesado */}
                <div className="p-2.5 bg-amber-950/60 border border-amber-500/40 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-300 uppercase block">
                    Cajón Físico
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {cage}
                  </span>
                  <span className="text-[9px] text-amber-300 block truncate">
                    Ciclo cerrado: {cycleId}
                  </span>
                </div>

                {/* 3. ID de Limpieza */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    ID Registro
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {generatedId}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Limpieza: {cleanDate}
                  </span>
                </div>

                {/* 4. Rearmado con Cartones */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Rearmado Cartones
                  </span>
                  <span className="text-base sm:text-lg font-black text-blue-300 tracking-tight">
                    {assembleDate}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Hueveras colocadas
                  </span>
                </div>

                {/* 5. Reparaciones */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Reparaciones
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {repairRequired === 'No' ? 'Ninguna' : repairDate ? 'Resueltas' : 'Pendientes'}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Mantenimiento mecánico
                  </span>
                </div>

                {/* 6. Destino del Cajón */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Próxima Etapa
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight">
                    Etapa 4
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Disponible para nueva siembra
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
            <span>Siguiente: Inspección y Balance</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || !isAvailableForNewCycle}
            className="min-h-[52px] px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{isSubmitting ? 'Guardando Limpieza...' : 'Confirmar y Habilitar Cajón'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
