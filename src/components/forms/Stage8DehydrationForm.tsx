'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { fmtDec, nextId, dryingLotTotals } from '../../lib/calculations';
import { TouchSlider } from '../ui/TouchSlider';
import { TouchSelectModal } from '../ui/TouchSelectModal';
import {
  Save,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Flame,
  Scale,
  Calendar,
  UserCheck,
} from 'lucide-react';

interface Stage8DehydrationFormProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export function Stage8DehydrationForm({ onBack, onSuccess }: Stage8DehydrationFormProps) {
  const { state, currentEmployee, saveDryingRun } = useStore();

  // Paso actual (1: Lote & Tiempos, 2: Temperatura & Rendimiento)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Lotes con cargas de lavado que no hayan sido deshidratados aún
  const driedLotIds = new Set(state.dryingRuns.map((d) => d.lotId));
  const availableLots = state.washingLots.filter(
    (l) => l.status === 'Listo para deshidratar' || !driedLotIds.has(l.id)
  );

  const defaultLot = availableLots[0] || state.washingLots[0];

  const [lotId, setLotId] = useState(defaultLot?.id || 'LP-2025-0001');
  const now = new Date();
  const startIso = new Date(now.getTime() - 8 * 3600000).toISOString().slice(0, 16);
  const endIso = now.toISOString().slice(0, 16);

  const [startAt, setStartAt] = useState(startIso);
  const [endAt, setEndAt] = useState(endIso);
  const [temp, setTemp] = useState(78);
  const [dryWeight, setDryWeight] = useState(7.5);

  // Empleado tomado automáticamente de la sesión/login
  const employeeCode = currentEmployee?.employee_code || 'E-09';
  const employeeName = currentEmployee?.full_name || 'Operador en turno';

  const [notes, setNotes] = useState('Deshidratación homogénea según protocolo térmico.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Totales del lote desde las cargas de lavado
  const lotTotals = dryingLotTotals(lotId, state.washingLoads);
  const inputLiveKg = lotTotals.wetKg;

  // Duración real
  const durationHours =
    startAt && endAt
      ? Math.max(0, (Date.parse(endAt) - Date.parse(startAt)) / 3600000)
      : null;

  // Merma y Rendimiento
  const weightLossKg = inputLiveKg > 0 ? Math.max(0, inputLiveKg - dryWeight) : null;
  const yieldPct = inputLiveKg > 0 ? (dryWeight / inputLiveKg) * 100 : null;

  const generatedId = nextId('DH', endAt.slice(0, 10), state.dryingRuns);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lotId) {
      alert('Seleccione un lote de deshidratación.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveDryingRun({
        id: generatedId,
        lotId,
        startAt,
        endAt,
        temp,
        dryWeightKg: dryWeight,
        employee: employeeCode,
        notes,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Error guardando deshidratación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const lotOptions = (availableLots.length ? availableLots : state.washingLots).map((l) => {
    const totals = dryingLotTotals(l.id, state.washingLoads);
    return {
      value: l.id,
      label: `${l.id} · ${totals.loads.length} cargas (${fmtDec(totals.wetKg, 2)} kg vivos)`,
      detail: `${totals.bags} bolsas lavadas asociadas`,
    };
  });

  const stepsConfig = [
    { num: 1, label: 'Lote & Cronograma Térmico', icon: Calendar },
    { num: 2, label: 'Secado & Rendimiento Integral', icon: Flame },
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col justify-between min-h-[500px]">
      {/* Encabezado compacto optimizado para Tablet */}
      <div className="border-b pb-3 border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-8 bg-emerald-600 rounded-full shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider">
                  Etapa 8 · Segmento 4
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  Operador: <strong className="text-slate-800">{employeeCode}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Deshidratación (Secado)
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
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 cursor-pointer'
                    : 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    isCurrent
                      ? 'bg-white text-emerald-600'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
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
            <div className="font-bold text-base">¡Deshidratación {generatedId} registrada exitosamente!</div>
            <div className="text-xs opacity-90">
              {dryWeight} kg de grillo seco listos en inventario para molienda en la Etapa 9.
            </div>
          </div>
        </div>
      )}

      {/* Contenedor Principal de los Pasos */}
      <div className="py-4 flex-1 flex flex-col justify-center">
        {/* =========================================================================
            PASO 1: Lote de Entrada & Cronograma Térmico
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">1. Lote de Grillo Lavado y Cronograma de Secado</h2>
                <p className="text-xs text-slate-500">
                  Seleccione el lote acumulado en lavado y establezca los tiempos reales de inicio y finalización.
                </p>
              </div>
              <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Lote Secado ID</span>
                <span className="text-sm font-black text-emerald-700 tracking-tight">{generatedId}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <TouchSelectModal
                  label="Lote de Deshidratación (cargas agrupadas)"
                  value={lotId}
                  options={lotOptions}
                  onChange={setLotId}
                  required
                />
              </div>

              {/* Tarjeta de Confirmación de Operador Autenticado */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-sm">
                  {employeeCode}
                </div>
                <div>
                  <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
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
              {/* Inicio Real */}
              <div className="flex flex-col gap-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Inicio real del ciclo térmico <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full min-h-[50px] px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-base focus:border-emerald-500 shadow-sm"
                />
              </div>

              {/* Fin Real */}
              <div className="flex flex-col gap-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Fin real del ciclo térmico <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full min-h-[50px] px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-base focus:border-emerald-500 shadow-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PASO 2: Temperatura, Rendimiento & Balance Integral
            ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">2. Control Térmico y Balance de Deshidratación</h2>
                <p className="text-xs text-slate-500">
                  Registre la temperatura y el peso seco entero obtenido para calcular el rendimiento auditado.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                Paso Final
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TouchSlider
                label="Temperatura promedio del deshidratador"
                value={temp}
                min={50}
                max={95}
                step={1}
                unit="°C"
                helper="Control térmico continuo del horno/deshidratador"
                onChange={setTemp}
              />

              <TouchSlider
                label="Peso seco entero obtenido"
                value={dryWeight}
                min={0.5}
                max={40}
                step={0.1}
                unit="kg"
                helper={`Entrada de peso vivo: ${fmtDec(inputLiveKg, 2)} kg`}
                onChange={setDryWeight}
              />
            </div>

            <div className="flex flex-col gap-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700">Observaciones del lote</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Condiciones del lote, textura o tiempo adicional..."
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:border-emerald-500"
              />
            </div>

            {/* Grilla de Métricas Finales y Balance de Secado */}
            <div className="bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Rendimiento de Deshidratación en Vivo</span>
                <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60 font-semibold">
                  Cálculo Auditado
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* 1. Rendimiento Seco (%) */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Rendimiento Seco
                  </span>
                  <span
                    className={`text-base sm:text-lg font-black tracking-tight ${
                      yieldPct && yieldPct >= 25 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {yieldPct ? `${yieldPct.toFixed(1)}%` : '—'}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    (Peso seco ÷ Peso vivo) × 100
                  </span>
                </div>

                {/* 2. Peso Seco Obtenido */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Peso Seco Entero
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {fmtDec(dryWeight, 2)} <span className="text-[10px] font-semibold text-slate-400">kg</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Listo para molienda
                  </span>
                </div>

                {/* 3. Peso Vivo de Entrada */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Peso Vivo Entrada
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight">
                    {fmtDec(inputLiveKg, 2)} <span className="text-[10px] font-semibold text-slate-400">kg</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Lote {lotId}
                  </span>
                </div>

                {/* 4. Merma de Humedad */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Agua Evaporada
                  </span>
                  <span className="text-base sm:text-lg font-black text-blue-300 tracking-tight">
                    {weightLossKg ? `${fmtDec(weightLossKg, 2)} kg` : '—'}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Merma hídrica del ciclo
                  </span>
                </div>

                {/* 5. Duración del Ciclo Térmico */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Tiempo de Secado
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {durationHours !== null ? `${durationHours.toFixed(1)} h` : '—'}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    A {temp}°C promedio
                  </span>
                </div>

                {/* 6. ID Registro */}
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase block">
                    ID Registro
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {generatedId}
                  </span>
                  <span className="text-[9px] text-emerald-300 block truncate">
                    Disponible para Etapa 9
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
            className="min-h-[52px] px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
          >
            <span>Siguiente: Rendimiento y Balance</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || dryWeight <= 0}
            className="min-h-[52px] px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{isSubmitting ? 'Guardando Deshidratación...' : 'Confirmar y Guardar Deshidratación'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
