'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { fmtDec, nextId, dryRunLiveKg } from '../../lib/calculations';
import { TouchSlider } from '../ui/TouchSlider';
import {
  Save,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Package,
  Check,
  Calendar,
  Sparkles,
  UserCheck,
} from 'lucide-react';

interface Stage9MillingFormProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export function Stage9MillingForm({ onBack, onSuccess }: Stage9MillingFormProps) {
  const { state, currentEmployee, saveMillingRun } = useStore();

  // Paso actual (1: Lotes Secos & Método, 2: Molienda & Balance Final)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Inventario disponible de grillo seco de las deshidrataciones (DH)
  const usedDryKgByDH: Record<string, number> = {};
  state.millingRuns.forEach((run) => {
    (run.inputs || []).forEach((inp) => {
      usedDryKgByDH[inp.dryingRunId] = (usedDryKgByDH[inp.dryingRunId] || 0) + Number(inp.usedKg || 0);
    });
  });

  const availableRuns = state.dryingRuns.map((run) => {
    const totalDry = Number(run.dryWeightKg || 0);
    const used = usedDryKgByDH[run.id] || 0;
    const availableKg = Math.max(0, totalDry - used);
    return {
      run,
      availableKg,
    };
  });

  const [selectedInputs, setSelectedInputs] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    const firstAvail = availableRuns.find((r) => r.availableKg > 0);
    if (firstAvail) {
      initial[firstAvail.run.id] = firstAvail.availableKg;
    } else if (state.dryingRuns[0]) {
      initial[state.dryingRuns[0].id] = state.dryingRuns[0].dryWeightKg;
    }
    return initial;
  });

  const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));

  // Empleado tomado automáticamente de la sesión/login
  const employeeCode = currentEmployee?.employee_code || 'E-09';
  const employeeName = currentEmployee?.full_name || 'Operador en turno';

  const [method, setMethod] = useState<'Manual' | 'Empacadora'>('Empacadora');
  const [bagCapacity, setBagCapacity] = useState(state.settings.bagCapacityKg || 9);
  const [flourKg, setFlourKg] = useState(7.0);
  const [packedKg, setPackedKg] = useState(7.0);
  const [humidity, setHumidity] = useState(4.8);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Totales de grillo seco usado
  const totalDryUsed = Object.entries(selectedInputs).reduce(
    (sum, [_, kg]) => sum + (Number(kg) || 0),
    0
  );

  // Trazabilidad a peso vivo desde las DH seleccionadas
  let tracedLiveKg = 0;
  Object.entries(selectedInputs).forEach(([dhId, usedKg]) => {
    const dh = state.dryingRuns.find((d) => d.id === dhId);
    if (dh && dh.dryWeightKg > 0) {
      const liveTotal = dryRunLiveKg(dh, state.washingLoads);
      tracedLiveKg += (liveTotal * usedKg) / dh.dryWeightKg;
    }
  });

  // Rendimientos
  const millingYieldPct = totalDryUsed > 0 ? (flourKg / totalDryUsed) * 100 : null;
  const looseFlourPendingKg = Math.max(0, flourKg - packedKg);
  const liveToPackYieldPct = tracedLiveKg > 0 ? (packedKg / tracedLiveKg) * 100 : null;

  // Conteo de bolsas empacadas
  const fullBags = bagCapacity > 0 ? Math.floor(packedKg / bagCapacity) : 0;
  const remainder = bagCapacity > 0 ? packedKg % bagCapacity : 0;
  const totalBags = fullBags + (remainder > 0.05 ? 1 : 0);

  const generatedId = nextId('MP', dateTime.slice(0, 10), state.millingRuns);

  const toggleRun = (runId: string, maxAvailable: number) => {
    setSelectedInputs((prev) => {
      const next = { ...prev };
      if (next[runId] !== undefined) {
        delete next[runId];
      } else {
        next[runId] = maxAvailable > 0 ? maxAvailable : 7.2;
      }
      return next;
    });
  };

  const handleKgChange = (runId: string, kg: number) => {
    setSelectedInputs((prev) => ({
      ...prev,
      [runId]: kg,
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (totalDryUsed <= 0) {
      alert('Debe seleccionar al menos un lote de grillo seco para moler.');
      return;
    }
    if (flourKg > totalDryUsed) {
      alert('La harina obtenida no puede superar el peso de grillo seco usado.');
      return;
    }
    if (packedKg > flourKg) {
      alert('La harina empacada no puede superar la harina obtenida.');
      return;
    }

    setIsSubmitting(true);
    try {
      const inputsList = Object.entries(selectedInputs).map(([dhId, kg]) => ({
        dryingRunId: dhId,
        usedKg: Number(kg),
      }));

      await saveMillingRun({
        id: generatedId,
        dateTime,
        employee: employeeCode,
        method,
        bagCapacityKg: bagCapacity,
        flourKg,
        packedKg,
        looseFlourKg: looseFlourPendingKg,
        humidity,
        targetMin: 90,
        targetMax: 150,
        inputs: inputsList,
        dryUsedKg: totalDryUsed,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Error guardando molienda y empaque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsConfig = [
    { num: 1, label: 'Grillo Seco & Empaque', icon: Package },
    { num: 2, label: 'Molienda & Rendimiento', icon: Sparkles },
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col justify-between min-h-[520px]">
      {/* Encabezado compacto optimizado para Tablet */}
      <div className="border-b pb-3 border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-8 bg-emerald-600 rounded-full shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider">
                  Etapa 9 · Segmento 4
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  Operador: <strong className="text-slate-800">{employeeCode}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Molienda y Empaque Final
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
            <div className="font-bold text-base">¡Molienda {generatedId} registrada exitosamente!</div>
            <div className="text-xs opacity-90">
              {packedKg} kg de harina empacada en {totalBags} bolsa(s). Trazabilidad completada.
            </div>
          </div>
        </div>
      )}

      {/* Contenedor Principal de los Pasos */}
      <div className="py-4 flex-1 flex flex-col justify-center">
        {/* =========================================================================
            PASO 1: Lotes de Grillo Seco (DH) & Método de Empaque
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">1. Lotes de Grillo Seco y Especificación de Empaque</h2>
                <p className="text-xs text-slate-500">
                  Seleccione los lotes de secado a moler e indique el método de embolsado.
                </p>
              </div>
              <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Molienda ID</span>
                <span className="text-sm font-black text-emerald-700 tracking-tight">{generatedId}</span>
              </div>
            </div>

            {/* Selector interactivo de lotes secos DH */}
            <div className="p-3 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900">
                  Lotes de Grillo Seco para Moler (DH)
                </label>
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  Total seleccionado: {totalDryUsed.toFixed(2)} kg
                </span>
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1.5 p-1">
                {availableRuns.map(({ run, availableKg }) => {
                  const isSelected = selectedInputs[run.id] !== undefined;
                  const currentKg = selectedInputs[run.id] || 0;

                  return (
                    <div
                      key={run.id}
                      className={`p-2 rounded-xl border-2 flex items-center justify-between gap-2 transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <div
                        onClick={() => toggleRun(run.id, availableKg)}
                        className="flex items-center gap-2 cursor-pointer select-none truncate flex-1"
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-bold block truncate">{run.id} · Lote {run.lotId}</span>
                          <span className="text-[10px] text-slate-500">
                            Disponible: {availableKg.toFixed(2)} kg
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] text-slate-600 font-bold">Kg:</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max={availableKg > 0 ? availableKg : run.dryWeightKg}
                            value={currentKg}
                            onChange={(e) => handleKgChange(run.id, Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-white border border-emerald-500 rounded-lg text-xs font-black text-center text-slate-900 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <div className="flex flex-col gap-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Fecha y hora <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full min-h-[44px] px-2.5 py-1.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-xs focus:border-emerald-500 shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800">Método de empaque</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Empacadora', 'Manual'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`py-2 px-2 rounded-xl border-2 font-bold text-xs ${
                        method === m
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <TouchSlider
                  label="Capacidad bolsa"
                  value={bagCapacity}
                  min={1}
                  max={25}
                  step={1}
                  unit="kg"
                  helper="Estándar: 9 kg"
                  onChange={setBagCapacity}
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PASO 2: Molienda, Humedad & Balance Integral Auditado
            ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">2. Molienda, Control de Calidad y Rendimiento Vivo</h2>
                <p className="text-xs text-slate-500">
                  Ajuste los pesajes de harina y verifique la trazabilidad total hasta el peso vivo de origen.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                Paso Final
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TouchSlider
                label="Harina molida obtenida"
                value={flourKg}
                min={0.5}
                max={totalDryUsed > 0 ? totalDryUsed : 40}
                step={0.1}
                unit="kg"
                helper="Salida total del molino"
                onChange={(val) => {
                  setFlourKg(val);
                  if (packedKg > val) setPackedKg(val);
                }}
              />

              <TouchSlider
                label="Harina empacada en bolsas"
                value={packedKg}
                min={0.5}
                max={flourKg}
                step={0.1}
                unit="kg"
                helper={`Suelto: ${looseFlourPendingKg.toFixed(2)} kg`}
                onChange={setPackedKg}
              />

              <TouchSlider
                label="Humedad final certificada"
                value={humidity}
                min={2.0}
                max={8.0}
                step={0.1}
                unit="%"
                helper="Inocuidad (<5.0%)"
                onChange={setHumidity}
              />
            </div>

            {/* Grilla de Métricas Finales y Balance de Molienda */}
            <div className="bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Rendimientos Auditados de Molienda y Empaque</span>
                <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60 font-semibold">
                  Trazabilidad 100%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* 1. Rendimiento Vivo a Empaque Trazado */}
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase block">
                    Rendimiento Vivo Trazado
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-300 tracking-tight">
                    {liveToPackYieldPct ? `${liveToPackYieldPct.toFixed(1)}%` : '—'}
                  </span>
                  <span className="text-[9px] text-slate-300 block truncate">
                    Desde {fmtDec(tracedLiveKg, 1)} kg vivos de origen
                  </span>
                </div>

                {/* 2. Rendimiento de Molienda */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Rendimiento Molienda
                  </span>
                  <span
                    className={`text-base sm:text-lg font-black tracking-tight ${
                      millingYieldPct && millingYieldPct >= 95 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {millingYieldPct ? `${millingYieldPct.toFixed(1)}%` : '—'}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Harina ÷ Grillo Seco
                  </span>
                </div>

                {/* 3. Bolsas Empacadas Generadas */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Bolsas Finales
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {totalBags} <span className="text-[10px] font-semibold text-slate-400">bolsas</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {fmtDec(packedKg, 2)} kg totales ({bagCapacity} kg c/u)
                  </span>
                </div>

                {/* 4. Grillo Seco Utilizado */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Grillo Seco Usado
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {fmtDec(totalDryUsed, 2)} <span className="text-[10px] font-semibold text-slate-400">kg</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Insumo deshidratado
                  </span>
                </div>

                {/* 5. Humedad Certificada */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Humedad Final
                  </span>
                  <span
                    className={`text-base sm:text-lg font-black tracking-tight ${
                      humidity <= 5.0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {humidity}%
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {humidity <= 5.0 ? 'Cumple inocuidad (<5%)' : 'Alerta humedad alta'}
                  </span>
                </div>

                {/* 6. ID Registro Molienda */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    ID Registro
                  </span>
                  <span className="text-base sm:text-lg font-black text-blue-300 tracking-tight">
                    {generatedId}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Producto final terminado
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
            onClick={() => {
              if (totalDryUsed <= 0) {
                alert('Debe seleccionar al menos un lote de grillo seco para moler.');
                return;
              }
              setCurrentStep(2);
            }}
            className="min-h-[52px] px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
          >
            <span>Siguiente: Molienda y Balance</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || totalDryUsed <= 0}
            className="min-h-[52px] px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{isSubmitting ? 'Guardando Molienda...' : 'Confirmar y Guardar Harina'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
