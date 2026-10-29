'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { BOXES, AGE_GRILLERS } from '../../lib/constants';
import { fmt, nextId, nymphsFor, dateDays, assignedCount } from '../../lib/calculations';
import { TouchSlider } from '../ui/TouchSlider';
import { TouchSelectModal } from '../ui/TouchSelectModal';
import {
  Save,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Box,
  Scale,
  Calendar,
  UserCheck,
} from 'lucide-react';

interface Stage3TransferFormProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export function Stage3TransferForm({ onBack, onSuccess }: Stage3TransferFormProps) {
  const { state, currentEmployee, saveTransfer } = useStore();

  // Paso actual (1: Asignación & Caja, 2: Pesaje & Balance)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Incubaciones elegibles con modo Caja de 60 L y saldo pendiente
  const eligibleIncubations = state.incubations.filter((inc) => {
    if (inc.transferMode !== 'Caja de 60 L') return false;
    const assigned = assignedCount(inc.id, state.transfers);
    const born = Number(inc.newbornCount || 0);
    return born - assigned > 0;
  });

  const availableIncubations = eligibleIncubations.length ? eligibleIncubations : state.incubations;
  const defaultInc = availableIncubations[0];

  const [incubationId, setIncubationId] = useState(defaultInc?.id || '');
  const [boxCode, setBoxCode] = useState('CJ-001');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState(50);

  // Empleado tomado automáticamente de la sesión/login
  const employeeCode = currentEmployee?.employee_code || 'E-01';
  const employeeName = currentEmployee?.full_name || 'Operador en turno';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedInc = state.incubations.find((i) => i.id === incubationId);
  const birthDate = selectedInc?.actualBirth || selectedInc?.entryDate || '';
  const calculatedAge = birthDate && date ? dateDays(birthDate, date) || 1 : 1;
  const rate = AGE_GRILLERS[calculatedAge] || 0;
  const countInBox = nymphsFor(weight, calculatedAge);
  const totalBorn = Number(selectedInc?.newbornCount || 0);
  const alreadyAssigned = selectedInc ? assignedCount(selectedInc.id, state.transfers) : 0;
  const remaining = totalBorn - alreadyAssigned - (countInBox || 0);

  const isBoxExceeded = countInBox !== null && countInBox > 60000;
  const isIncExceeded = remaining < 0;

  const generatedId = nextId('CN', date, state.transfers);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!incubationId) {
      alert('Seleccione una incubación.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveTransfer({
        id: generatedId,
        incubationId,
        boxCode,
        date,
        weight,
        age: calculatedAge,
        nymphs: countInBox || 0,
        employee: employeeCode,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Error guardando salida a caja.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const incOptions = availableIncubations.map((inc) => {
    const assigned = assignedCount(inc.id, state.transfers);
    const pending = Math.max(0, Number(inc.newbornCount || 0) - assigned);
    return {
      value: inc.id,
      label: `${inc.id} · Nacimiento: ${inc.actualBirth || 'Pendiente'}`,
      detail: `Pendiente por asignar: ${fmt(pending)} ninfas`,
    };
  });

  const boxOptions = BOXES.map((box) => ({
    value: box,
    label: box,
    detail: 'Caja física de plástico 60 L',
  }));

  const stepsConfig = [
    { num: 1, label: 'Lote & Caja Destino', icon: Box },
    { num: 2, label: 'Pesaje & Balance Integral', icon: Scale },
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col justify-between min-h-[500px]">
      {/* Encabezado compacto optimizado para Tablet */}
      <div className="border-b pb-3 border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-8 bg-blue-600 rounded-full shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-wider">
                  Etapa 3 · Segmento 1
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  Operador: <strong className="text-slate-800">{employeeCode}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Salida a Cajas (60 L)
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
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : isCompleted
                    ? 'bg-blue-50 text-blue-900 hover:bg-blue-100 cursor-pointer'
                    : 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    isCurrent
                      ? 'bg-white text-blue-600'
                      : isCompleted
                      ? 'bg-blue-600 text-white'
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
            <div className="font-bold text-base">¡Salida a caja {boxCode} registrada exitosamente!</div>
            <div className="text-xs opacity-90">ID asignado: {generatedId}. Lista para Etapa 4 (Siembra).</div>
          </div>
        </div>
      )}

      {/* Contenedor Principal de los Pasos */}
      <div className="py-4 flex-1 flex flex-col justify-center">
        {/* =========================================================================
            PASO 1: Asignación de Lote & Caja
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">1. Asignación de Origen y Caja Física</h2>
                <p className="text-xs text-slate-500">
                  Seleccione el lote de incubación con saldo pendiente y la caja física receptora de 60 L.
                </p>
              </div>
              <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Lote ID Generado</span>
                <span className="text-sm font-black text-slate-800 tracking-tight">{generatedId}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <TouchSelectModal
                  label="ID de Incubación de origen"
                  value={incubationId}
                  options={incOptions}
                  onChange={setIncubationId}
                  required
                />
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <TouchSelectModal
                  label="Código de caja física (60 L)"
                  value={boxCode}
                  options={boxOptions}
                  onChange={setBoxCode}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              {/* Fecha Real de Salida */}
              <div className="flex flex-col gap-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Fecha de salida a esta caja <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-h-[50px] px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-base focus:border-blue-500 shadow-sm"
                />
                <span className="text-[11px] text-slate-400">
                  Nacimiento en incubación: {birthDate || 'No registrada'}
                </span>
              </div>

              {/* Tarjeta de Confirmación de Operador Autenticado */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-sm">
                  {employeeCode}
                </div>
                <div>
                  <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
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
                <h2 className="text-lg font-black text-slate-900">2. Pesaje Trasladado y Balance Integral</h2>
                <p className="text-xs text-slate-500">
                  Ajuste el peso y verifique el balance completo del saldo de la incubación antes de guardar.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black">
                Paso Final
              </span>
            </div>

            <TouchSlider
              label="Peso trasladado a esta caja"
              value={weight}
              min={5}
              max={120}
              step={1}
              unit="g"
              helper={`A ${calculatedAge} días de edad biológica = ${fmt(rate)} grillos/g`}
              onChange={setWeight}
            />

            {/* Advertencias */}
            {isBoxExceeded && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-amber-900 text-xs font-semibold">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Tope de Caja Excedido:</strong> Esta caja supera el máximo de referencia de 60.000 ninfas ({fmt(countInBox)} calculadas). Se recomienda dividir el traslado entre varias cajas.
                </div>
              </div>
            )}

            {isIncExceeded && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 flex items-start gap-2.5 text-red-900 text-xs font-semibold">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Saldo Insuficiente:</strong> Las ninfas asignadas ({fmt(countInBox)}) superan el saldo restante de la incubación ({fmt(totalBorn - alreadyAssigned)} disponibles). Reduzca el peso trasladado.
                </div>
              </div>
            )}

            {/* Grilla de Métricas Finales y Estadísticas Completas */}
            <div className="bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Balance de Distribución a Cajas</span>
                <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60 font-semibold">
                  Cálculo en Vivo
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* 1. Ninfas en esta Caja */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Ninfas en Esta Caja
                  </span>
                  <span
                    className={`text-base sm:text-lg font-black tracking-tight ${
                      isBoxExceeded ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {fmt(countInBox)} <span className="text-[10px] font-semibold text-slate-400">ninfas</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {weight}g · Caja: {boxCode} (Tope: 60k)
                  </span>
                </div>

                {/* 2. Saldo Restante de Incubación */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Saldo Restante
                  </span>
                  <span
                    className={`text-base sm:text-lg font-black tracking-tight ${
                      remaining < 0 ? 'text-red-400' : 'text-blue-300'
                    }`}
                  >
                    {fmt(remaining)} <span className="text-[10px] font-semibold text-slate-400">ninfas</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Por asignar en otras cajas
                  </span>
                </div>

                {/* 3. ID de Salida Asignado */}
                <div className="p-2.5 bg-blue-950/60 border border-blue-500/40 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-300 uppercase block">
                    ID Generado
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {generatedId}
                  </span>
                  <span className="text-[9px] text-blue-300 block truncate">
                    Caja {boxCode} · {date}
                  </span>
                </div>

                {/* 4. Nacidas en Incubación */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Total Nacidas Origen
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {fmt(totalBorn)} <span className="text-[10px] font-semibold text-slate-400">ninfas</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Incubación: {incubationId}
                  </span>
                </div>

                {/* 5. Ya Asignadas Previamente */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Asignadas Previamente
                  </span>
                  <span className="text-base sm:text-lg font-black text-slate-200 tracking-tight">
                    {fmt(alreadyAssigned)} <span className="text-[10px] font-semibold text-slate-400">ninfas</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    En cajas anteriores
                  </span>
                </div>

                {/* 6. Edad Biológica y Factor */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Edad Biológica
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {calculatedAge} días
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Factor: {fmt(rate)} grillos/g
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
            className="min-h-[52px] px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
          >
            <span>Siguiente: Pesaje y Balance</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || isIncExceeded}
            className="min-h-[52px] px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{isSubmitting ? 'Guardando Salida...' : 'Confirmar y Guardar Salida a Caja'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
