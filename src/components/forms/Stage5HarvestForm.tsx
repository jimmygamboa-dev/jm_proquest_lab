'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { FREEZERS } from '../../lib/constants';
import { fmtDec, nextId, dateDays } from '../../lib/calculations';
import { TouchSlider } from '../ui/TouchSlider';
import { TouchSelectModal } from '../ui/TouchSelectModal';
import { HarvestBag } from '../../types';
import {
  Save,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Snowflake,
  Wheat,
  Calendar,
  UserCheck,
} from 'lucide-react';

interface Stage5HarvestFormProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export function Stage5HarvestForm({ onBack, onSuccess }: Stage5HarvestFormProps) {
  const { state, currentEmployee, saveHarvest } = useStore();

  // Paso actual (1: Parámetros del Ciclo, 2: Desglose de Bolsas & Balance)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Ciclos sembrados pendientes de cosecha
  const harvestedCycles = new Set(state.harvests.map((h) => h.cycleId));
  const openCycles = state.sowings.filter((s) => !harvestedCycles.has(s.cycleId));
  const availableCycles = openCycles.length ? openCycles : state.sowings;
  const defaultSow = availableCycles[0];

  const [cycleId, setCycleId] = useState(defaultSow?.cycleId || 'C-CE001-001');
  const [cage, setCage] = useState(defaultSow?.cage || 'CE-001');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [projectedDays, setProjectedDays] = useState(45);
  const [feedKg, setFeedKg] = useState(300);
  const [frassKg, setFrassKg] = useState(80);

  // Empleado tomado automáticamente de la sesión/login
  const employeeCode = currentEmployee?.employee_code || 'E-06';
  const employeeName = currentEmployee?.full_name || 'Operador en turno';

  const nowIso = new Date().toISOString().slice(0, 16);
  const generatedId = nextId('CO', date, state.harvests);

  const [bags, setBags] = useState<HarvestBag[]>([
    {
      bagId: `${generatedId}-B01`,
      weightKg: 8.5,
      frozenAt: nowIso,
      freezer: 'Congelador 1',
    },
    {
      bagId: `${generatedId}-B02`,
      weightKg: 8.2,
      frozenAt: nowIso,
      freezer: 'Congelador 1',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Cálculos en vivo
  const totalWeight = bags.reduce((sum, b) => sum + Number(b.weightKg || 0), 0);
  const relatedSow = state.sowings.find((s) => s.cycleId === cycleId);
  const sowDate = relatedSow?.date || '';
  const cageDays = sowDate && date ? dateDays(sowDate, date) : projectedDays;

  const handleAddBag = () => {
    const nextNum = bags.length + 1;
    setBags((prev) => [
      ...prev,
      {
        bagId: `${generatedId}-B${String(nextNum).padStart(2, '0')}`,
        weightKg: 8.5,
        frozenAt: new Date().toISOString().slice(0, 16),
        freezer: 'Congelador 1',
      },
    ]);
  };

  const handleRemoveBag = (index: number) => {
    if (bags.length <= 1) {
      alert('Debe haber al menos 1 bolsa registrada.');
      return;
    }
    setBags((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBagChange = (index: number, field: keyof HarvestBag, val: any) => {
    setBags((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cycleId) {
      alert('Seleccione un ciclo para cosechar.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveHarvest({
        id: generatedId,
        cycleId,
        cage,
        date,
        projectedDays,
        feedKg,
        frassKg,
        employee: employeeCode,
        bags,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Error guardando cosecha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cycleOptions = availableCycles.map((s) => ({
    value: s.cycleId,
    label: `${s.cycleId} (Cajón ${s.cage})`,
    detail: `Sembrado: ${s.date} | Peso inicial: ${s.weight} g`,
  }));

  const stepsConfig = [
    { num: 1, label: 'Ciclo & Insumos', icon: Wheat },
    { num: 2, label: 'Bolsas & Congelador', icon: Snowflake },
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col justify-between min-h-[520px]">
      {/* Encabezado compacto optimizado para Tablet */}
      <div className="border-b pb-3 border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-8 bg-amber-500 rounded-full shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-amber-600 uppercase tracking-wider">
                  Etapa 5 · Segmento 2
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  Operador: <strong className="text-slate-800">{employeeCode}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Cosecha y Congelamiento
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
            <div className="font-bold text-base">¡Cosecha {generatedId} registrada exitosamente!</div>
            <div className="text-xs opacity-90">
              {bags.length} bolsas ({totalWeight.toFixed(2)} kg vivos) congeladas. Cajón listo para Etapa 6 (Limpieza).
            </div>
          </div>
        </div>
      )}

      {/* Contenedor Principal de Pasos */}
      <div className="py-4 flex-1 flex flex-col justify-center">
        {/* =========================================================================
            PASO 1: Ciclo de Engorde & Insumos
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">1. Ciclo de Engorde y Consumo de Insumos</h2>
                <p className="text-xs text-slate-500">
                  Seleccione el ciclo a cosechar y registre los consumos acumulados de alimento y frass.
                </p>
              </div>
              <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">ID Cosecha</span>
                <span className="text-sm font-black text-amber-700 tracking-tight">{generatedId}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <TouchSelectModal
                  label="Ciclo de engorde a cosechar"
                  value={cycleId}
                  options={cycleOptions}
                  onChange={(val) => {
                    setCycleId(val);
                    const found = availableCycles.find((s) => s.cycleId === val);
                    if (found) setCage(found.cage);
                  }}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  Fecha real de cosecha <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-h-[50px] px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-base focus:border-amber-500 shadow-sm"
                />
                <span className="text-[11px] text-slate-400">
                  Siembra: {sowDate || '—'} · Tiempo en cajón: {cageDays} días
                </span>
              </div>
            </div>

            {/* Sliders de Insumos: Alimento y Frass */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TouchSlider
                label="Alimento total consumido"
                value={feedKg}
                min={50}
                max={600}
                step={5}
                unit="kg"
                helper="Pienso acumulado suministrado al cajón"
                onChange={setFeedKg}
              />

              <TouchSlider
                label="Frass producido (abono recolectado)"
                value={frassKg}
                min={10}
                max={200}
                step={2}
                unit="kg"
                helper="Sustrato orgánico generado en el ciclo"
                onChange={setFrassKg}
              />
            </div>
          </div>
        )}

        {/* =========================================================================
            PASO 2: Desglose de Bolsas & Balance Integral
            ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">2. Desglose de Bolsas y Balance de Cosecha</h2>
                <p className="text-xs text-slate-500">
                  Ingrese el pesaje por bolsa viva, congele en los arcones asignados y confirme el registro.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddBag}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-sm"
              >
                <Plus className="w-4 h-4" /> Agregar Bolsa
              </button>
            </div>

            {/* Lista compacta de bolsas con scroll interno suave si hay muchas */}
            <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1 rounded-2xl bg-slate-50 p-2.5 border border-slate-200">
              {bags.map((bag, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm grid grid-cols-12 gap-2 items-center text-xs"
                >
                  <div className="col-span-3">
                    <span className="font-mono font-black text-slate-800 text-xs block">{bag.bagId}</span>
                    <span className="text-[10px] text-slate-400">{bag.frozenAt.slice(11, 16)} hrs</span>
                  </div>

                  <div className="col-span-4 flex items-center gap-1">
                    <label className="text-[10px] font-bold text-slate-400">Kg:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="15"
                      value={bag.weightKg}
                      onChange={(e) => handleBagChange(idx, 'weightKg', Number(e.target.value))}
                      className="w-full px-2 py-1 border border-slate-300 rounded-lg font-black text-slate-900 text-sm focus:border-blue-500"
                    />
                  </div>

                  <div className="col-span-4">
                    <select
                      value={bag.freezer}
                      onChange={(e) => handleBagChange(idx, 'freezer', e.target.value)}
                      className="w-full px-2 py-1 border border-slate-300 rounded-lg font-bold text-xs text-slate-800 focus:border-blue-500"
                    >
                      {FREEZERS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1 text-right">
                    {bags.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBag(idx)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                        title="Eliminar bolsa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Grilla de Métricas Finales y Balance de Cosecha */}
            <div className="bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Rendimiento Integral de Cosecha</span>
                <span className="text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/60 font-semibold">
                  Cálculo en Vivo
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* 1. Peso Vivo Total Cosechado */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Peso Vivo Total
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight">
                    {fmtDec(totalWeight, 2)} <span className="text-[10px] font-semibold text-slate-400">kg</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {bags.length} bolsas congeladas
                  </span>
                </div>

                {/* 2. Conversión Alimento / Biomasa (FCR) */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Conversión FCR
                  </span>
                  <span className="text-base sm:text-lg font-black text-blue-300 tracking-tight">
                    {totalWeight > 0 ? `${(feedKg / totalWeight).toFixed(2)} : 1` : '—'}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {feedKg} kg alimento consumido
                  </span>
                </div>

                {/* 3. Ciclo & Cajón */}
                <div className="p-2.5 bg-amber-950/60 border border-amber-500/40 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-300 uppercase block">
                    Ciclo Cosechado
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {cycleId}
                  </span>
                  <span className="text-[9px] text-amber-300 block truncate">
                    Cajón {cage} · {cageDays} días engorde
                  </span>
                </div>

                {/* 4. ID Cosecha */}
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

                {/* 5. Frass Generado */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Frass Obtenido
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {frassKg} kg
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Abono orgánico
                  </span>
                </div>

                {/* 6. Destino de Bolsas */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Destino Inmediato
                  </span>
                  <span className="text-base sm:text-lg font-black text-blue-300 tracking-tight">
                    Congeladores
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Cadena de frío lista para Etapa 7
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
            <span>Siguiente: Bolsas y Balance</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || totalWeight <= 0}
            className="min-h-[52px] px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{isSubmitting ? 'Guardando Cosecha...' : 'Confirmar y Guardar Cosecha'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
