'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { INCUBATORS, AGE_GRILLERS, INCUBATION_DAYS } from '../../lib/constants';
import { fmt, localDatePlus, nextId, nymphsFor, eggCeiling } from '../../lib/calculations';
import { TouchSlider } from '../ui/TouchSlider';
import { TouchSelectModal } from '../ui/TouchSelectModal';
import {
  Save,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Bug,
  Thermometer,
  Calendar,
  Sparkles,
  UserCheck,
  Scale,
} from 'lucide-react';

interface Stage2IncubationFormProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export function Stage2IncubationForm({ onBack, onSuccess }: Stage2IncubationFormProps) {
  const { state, currentEmployee, saveIncubation } = useStore();

  // Paso actual (1: Asignación & Fechas, 2: Clima & Fitosanitario, 3: Pesaje & Balance)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Buscar posturas que no tengan incubación aún
  const existingIncPostureIds = new Set(state.incubations.map((i) => i.postureId));
  const availablePostures = state.postures.filter((p) => !existingIncPostureIds.has(p.id));
  const defaultPosture = availablePostures[0] || state.postures[0];

  const [postureId, setPostureId] = useState(defaultPosture?.id || '');
  const [incubator, setIncubator] = useState('INC-001');
  const [actualBirth, setActualBirth] = useState('');
  const [temp, setTemp] = useState(32.5);
  const [humidity, setHumidity] = useState(80);
  const [weight, setWeight] = useState(100);
  const [age, setAge] = useState(1);
  const [transferMode, setTransferMode] = useState<'Caja de 60 L' | 'Directo a cajón'>('Caja de 60 L');

  // Código de empleado tomado automáticamente de la sesión/login
  const employeeCode = currentEmployee?.employee_code || 'E-01';
  const employeeName = currentEmployee?.full_name || 'Operador en turno';

  const [mosquitoLevel, setMosquitoLevel] = useState<'No observados' | 'Algunos' | 'Muchos'>('No observados');
  const [mosquitoAction, setMosquitoAction] = useState('');
  const [mosquitoResolved, setMosquitoResolved] = useState(true);
  const [birthAlertReviewed, setBirthAlertReviewed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedPosture = state.postures.find((p) => p.id === postureId);
  const entryDate = selectedPosture?.removalDate || selectedPosture?.date || '';
  const expectedBirth = entryDate ? localDatePlus(entryDate, INCUBATION_DAYS) : '';

  useEffect(() => {
    if (expectedBirth && !actualBirth) {
      setActualBirth(expectedBirth);
    }
  }, [expectedBirth, actualBirth]);

  // Cálculos en vivo
  const grillersRate = AGE_GRILLERS[age] || 0;
  const estimatedNymphs = nymphsFor(weight, age);
  const eggCap = eggCeiling(selectedPosture, state.settings);
  const isLowBirth = Boolean(eggCap > 0 && estimatedNymphs && estimatedNymphs < eggCap * 0.4);
  const isOverCap = Boolean(eggCap > 0 && estimatedNymphs && estimatedNymphs > eggCap);

  const generatedId = nextId('I', entryDate || new Date().toISOString().slice(0, 10), state.incubations);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!postureId) {
      alert('Debe seleccionar una postura.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveIncubation({
        id: generatedId,
        postureId,
        incubator,
        entryDate,
        expectedBirth,
        actualBirth,
        temp,
        humidity,
        newbornWeight: weight,
        ageWeighed: age,
        newbornCount: estimatedNymphs || 0,
        transferMode,
        employee: employeeCode,
        mosquitoLevel,
        mosquitoAction: mosquitoLevel !== 'No observados' ? mosquitoAction : 'No observados',
        mosquitoResolved,
        birthAlertReviewed,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Error guardando incubación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const postureOptions = (availablePostures.length ? availablePostures : state.postures).map((p) => ({
    value: p.id,
    label: `${p.id} · Cajón ${p.cage}`,
    detail: `Fecha retiro: ${p.removalDate || p.date} | Ponederos: ${p.nests}`,
  }));

  const incubatorOptions = INCUBATORS.map((code) => ({
    value: code,
    label: code,
    detail: `Incubadora industrial ${code}`,
  }));

  const stepsConfig = [
    { num: 1, label: 'Origen & Fechas', icon: Calendar },
    { num: 2, label: 'Clima & Fitosanitario', icon: Thermometer },
    { num: 3, label: 'Pesaje & Balance', icon: Sparkles },
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col justify-between min-h-[520px]">
      {/* Encabezado compacto para Tablet */}
      <div className="border-b pb-3 border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-8 bg-blue-600 rounded-full shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-wider">
                  Etapa 2 · Segmento 1
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  Operador: <strong className="text-slate-800">{employeeCode}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Registro de Incubación
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
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
          {stepsConfig.map((s) => {
            const isCurrent = currentStep === s.num;
            const isCompleted = currentStep > s.num;

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  if (s.num < currentStep) setCurrentStep(s.num as 1 | 2 | 3);
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
                <div className="truncate hidden sm:block">
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
            <div className="font-bold text-base">¡Incubación {generatedId} registrada exitosamente!</div>
            <div className="text-xs opacity-90">Nacimiento estimado listo para {transferMode}.</div>
          </div>
        </div>
      )}

      {/* Contenedor Principal de Pasos */}
      <div className="py-4 flex-1 flex flex-col justify-center">
        {/* =========================================================================
            PASO 1: Origen & Fechas
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">1. Postura de Origen y Fechas de Ciclo</h2>
                <p className="text-xs text-slate-500">
                  Seleccione el lote de postura y asigne la incubadora correspondiente.
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
                  label="ID de Postura de Origen"
                  value={postureId}
                  options={postureOptions}
                  onChange={setPostureId}
                  required
                />
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <TouchSelectModal
                  label="Incubadora asignada"
                  value={incubator}
                  options={incubatorOptions}
                  onChange={setIncubator}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fechas de Entrada y Nacimiento */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">Entrada a incubación</label>
                  <input
                    type="date"
                    readOnly
                    value={entryDate}
                    className="w-full min-h-[46px] px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600 text-sm shadow-inner"
                  />
                  <span className="text-[10px] text-slate-400">Retiro de ponederos</span>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">
                    Fecha real nacimiento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={actualBirth}
                    onChange={(e) => setActualBirth(e.target.value)}
                    className="w-full min-h-[46px] px-3 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:border-blue-500 shadow-sm"
                  />
                  <span className="text-[10px] text-slate-400">Est.: {expectedBirth || '—'}</span>
                </div>
              </div>

              {/* Modo de Traslado */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Destino siguiente de ninfas <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferMode('Caja de 60 L')}
                    className={`p-2.5 rounded-xl border-2 font-bold text-xs transition-all text-center ${
                      transferMode === 'Caja de 60 L'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Caja 60 L (Etapa 3)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferMode('Directo a cajón')}
                    className={`p-2.5 rounded-xl border-2 font-bold text-xs transition-all text-center ${
                      transferMode === 'Directo a cajón'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Directo a cajón (Etapa 4)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PASO 2: Clima & Fitosanitario
            ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-black text-slate-900">2. Control Ambiental y Fitosanitario</h2>
              <p className="text-xs text-slate-500">
                Verifique los parámetros físicos de la incubadora y registre presencia de vectores.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TouchSlider
                label="Temperatura promedio"
                value={temp}
                min={25}
                max={40}
                step={0.5}
                unit="°C"
                helper="Rango ideal: 31°C a 34°C"
                onChange={setTemp}
              />

              <TouchSlider
                label="Humedad promedio"
                value={humidity}
                min={40}
                max={99}
                step={1}
                unit="%"
                helper="Rango ideal: 75% a 85%"
                onChange={setHumidity}
              />
            </div>

            {/* Vigilancia de Mosquitos */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Bug className="w-4 h-4 text-amber-700" />
                  Control Fitosanitario: Presencia de Mosquitos
                </div>
                <span className="text-[10px] font-semibold text-amber-700">Monitoreo obligatorio</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['No observados', 'Algunos', 'Muchos'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setMosquitoLevel(level)}
                    className={`p-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                      mosquitoLevel === level
                        ? level === 'Muchos'
                          ? 'border-red-600 bg-red-100 text-red-950 shadow-sm'
                          : level === 'Algunos'
                          ? 'border-amber-500 bg-amber-100 text-amber-950 shadow-sm'
                          : 'border-emerald-600 bg-emerald-100 text-emerald-950 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              {mosquitoLevel !== 'No observados' && (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <input
                    type="text"
                    placeholder="Describa la acción de control fitosanitario tomada..."
                    value={mosquitoAction}
                    onChange={(e) => setMosquitoAction(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:border-amber-500"
                  />
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mosquitoResolved}
                      onChange={(e) => setMosquitoResolved(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    Problema de mosquitos atendido y bajo control
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            PASO 3: Pesaje & Balance Integral
            ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">3. Pesaje y Balance Biológico de Nacimiento</h2>
                <p className="text-xs text-slate-500">
                  Verifique la proyección completa con el histórico de la postura antes de confirmar.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black">
                Paso Final
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TouchSlider
                label="Peso de ninfas nacidas"
                value={weight}
                min={1}
                max={500}
                step={1}
                unit="g"
                helper="Pesado en balanza de precisión"
                onChange={setWeight}
              />

              <TouchSlider
                label="Edad biológica al pesar"
                value={age}
                min={1}
                max={21}
                step={1}
                unit="días"
                helper={`Factor: ${fmt(grillersRate)} grillos/g (Maestra Edad)`}
                onChange={setAge}
              />
            </div>

            {/* Alertas biológicas */}
            {isOverCap && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 flex items-start gap-2.5 text-red-900 text-xs font-semibold">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  Las ninfas estimadas ({fmt(estimatedNymphs)}) superan el máximo teórico ({fmt(eggCap)}) de huevos.
                  Corrija el peso o la edad antes de continuar.
                </div>
              </div>
            )}

            {isLowBirth && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 space-y-1.5 text-amber-900 text-xs font-semibold">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    Alerta de Calidad: El nacimiento ({fmt(estimatedNymphs)}) es inferior al 40% del máximo teórico ({fmt(eggCap)}).
                  </div>
                </div>
                <label className="flex items-center gap-2 pt-1 font-bold cursor-pointer text-amber-950">
                  <input
                    type="checkbox"
                    checked={birthAlertReviewed}
                    onChange={(e) => setBirthAlertReviewed(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  He revisado las condiciones de este lote y confirmo el registro con bajo nacimiento.
                </label>
              </div>
            )}

            {/* Grilla de Métricas Finales y Estadísticas Completas */}
            <div className="bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Balance Integral de Incubación</span>
                <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60 font-semibold">
                  Cálculo en Vivo
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* 1. Máximo Teórico de Postura */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Máximo Teórico Postura
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight">
                    {fmt(eggCap)} <span className="text-[10px] font-semibold text-slate-400">huevos</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Origen: {postureId}
                  </span>
                </div>

                {/* 2. Ninfas Nacidas Estimadas */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Ninfas Estimadas
                  </span>
                  <span
                    className={`text-base sm:text-lg font-black tracking-tight ${
                      isLowBirth ? 'text-amber-400' : 'text-blue-300'
                    }`}
                  >
                    {fmt(estimatedNymphs)} <span className="text-[10px] font-semibold text-slate-400">ninfas</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {weight}g × {fmt(grillersRate)} grillos/g
                  </span>
                </div>

                {/* 3. Relación de Nacimiento */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Tasa de Nacimiento
                  </span>
                  <span
                    className={`text-base sm:text-lg font-black tracking-tight ${
                      isLowBirth ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {eggCap > 0 && estimatedNymphs ? `${((estimatedNymphs / eggCap) * 100).toFixed(1)}%` : '—'}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Respecto al techo de huevos
                  </span>
                </div>

                {/* 4. Fechas de Entrada & Nacimiento */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Fecha Nacimiento
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {actualBirth || '—'}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Entrada: {entryDate || '—'}
                  </span>
                </div>

                {/* 5. Clima en Incubadora */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Clima Incubadora
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {temp}°C · {humidity}%
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {incubator} · Mosquitos: {mosquitoLevel}
                  </span>
                </div>

                {/* 6. Destino & Estado */}
                <div className="p-2.5 bg-blue-950/60 border border-blue-500/40 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-300 uppercase block">
                    Destino Traslado
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {transferMode}
                  </span>
                  <span className="text-[9px] text-blue-300 block truncate">
                    ID: {generatedId}
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
              setCurrentStep((prev) => (prev - 1) as 1 | 2);
            }
          }}
          className="min-h-[52px] px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-bold text-sm flex items-center gap-2 border border-slate-200 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{currentStep === 1 ? 'Cancelar' : 'Paso Anterior'}</span>
        </button>

        <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-400">
          <span>Paso {currentStep} de 3</span>
        </div>

        {currentStep < 3 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => (prev + 1) as 2 | 3)}
            className="min-h-[52px] px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
          >
            <span>
              {currentStep === 1 ? 'Siguiente: Clima' : 'Siguiente: Pesaje'}
            </span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || isOverCap}
            className="min-h-[52px] px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{isSubmitting ? 'Guardando Incubación...' : 'Confirmar y Guardar Incubación'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
