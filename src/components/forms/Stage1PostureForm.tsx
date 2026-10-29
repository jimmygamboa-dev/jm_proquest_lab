'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { CAGES, MORTALITY_MIN, MORTALITY_MAX } from '../../lib/constants';
import { fmt, localDatePlus, nextId } from '../../lib/calculations';
import { TouchSlider } from '../ui/TouchSlider';
import { TouchSelectModal } from '../ui/TouchSelectModal';
import {
  Save,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Calendar,
  Box,
  Layers,
  Sparkles,
  UserCheck,
} from 'lucide-react';

interface Stage1PostureFormProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export function Stage1PostureForm({ onBack, onSuccess }: Stage1PostureFormProps) {
  const { state, currentEmployee, savePosture } = useStore();

  // Paso actual (1: Ubicación & Fecha, 2: Ponederos & Días, 3: Proyección & Confirmación)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);

  // El código de empleado se toma automáticamente de la sesión/login
  const employeeCode = currentEmployee?.employee_code || 'E-01';
  const employeeName = currentEmployee?.full_name || 'Operador en turno';

  const [cage, setCage] = useState('CE-001');
  const [nests, setNests] = useState(2);
  const [days, setDays] = useState(3);
  const [projection, setProjection] = useState(100000);
  const [projectedCage, setProjectedCage] = useState('CE-002');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Cálculos en vivo
  const eggsPerNest = state.settings.eggsPerNest || 60000;
  const eggMax = nests * eggsPerNest;
  const removalDate = date && days >= 0 ? localDatePlus(date, days) : '—';
  const favorable = projection > 0 ? Math.round(projection * (1 - MORTALITY_MIN)) : null;
  const conservative = projection > 0 ? Math.round(projection * (1 - MORTALITY_MAX)) : null;
  const generatedId = nextId('P', date, state.postures);
  const isOverCeiling = projection > eggMax;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      await savePosture({
        id: generatedId,
        date,
        employee: employeeCode,
        cage,
        nests,
        projection,
        days,
        removalDate,
        projectedCage,
        eggsPerNestAtRecord: eggsPerNest,
        eggCeiling: eggMax,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Error guardando postura.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cageOptions = CAGES.map((code) => ({
    value: code,
    label: code,
    detail: `Cajón de engorde ${code}`,
  }));

  const stepsConfig = [
    { num: 1, label: 'Ubicación & Fecha', icon: Calendar },
    { num: 2, label: 'Ponederos & Ciclo', icon: Layers },
    { num: 3, label: 'Proyección & Cierre', icon: Sparkles },
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col justify-between min-h-[520px] tablet:min-h-[560px]">
      {/* Encabezado compacto optimizado para Tablet */}
      <div className="border-b pb-3 border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-8 bg-blue-600 rounded-full shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-wider">
                  Etapa 1 · Segmento 1
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  Operador: <strong className="text-slate-800">{employeeCode}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Registro de Postura
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
            const Icon = s.icon;
            const isCurrent = currentStep === s.num;
            const isCompleted = currentStep > s.num;

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => {
                  // Permitir retroceder a pasos completados
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

      {/* Alerta de Éxito Flotante */}
      {showSuccess && (
        <div className="my-3 bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 flex items-center gap-3 text-emerald-900 animate-in fade-in">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <div className="font-bold text-base">¡Postura {generatedId} registrada exitosamente!</div>
            <div className="text-xs opacity-90">Asignada al operador {employeeCode} ({employeeName}).</div>
          </div>
        </div>
      )}

      {/* Contenedor Principal de los Pasos (Ajustado para no desbordar en Tablet) */}
      <div className="py-4 flex-1 flex flex-col justify-center">
        {/* =========================================================================
            PASO 1: Ubicación & Fecha
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">1. Asignación de Cajón y Fecha</h2>
                <p className="text-xs text-slate-500">
                  Establezca el inicio de postura y seleccione el cajón de engorde de destino.
                </p>
              </div>
              <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Lote ID Proyectado</span>
                <span className="text-sm font-black text-slate-800 tracking-tight">{generatedId}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fecha de Colocación */}
              <div className="flex flex-col gap-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Fecha de colocación <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full min-h-[50px] px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-base focus:outline-none focus:border-blue-500 shadow-sm"
                />
                <span className="text-[11px] text-slate-400">Por defecto: Fecha actual en planta</span>
              </div>

              {/* Cajón Asociado */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <TouchSelectModal
                  label="Cajón de engorde asociado"
                  value={cage}
                  options={cageOptions}
                  onChange={setCage}
                  required
                />
              </div>
            </div>

            {/* Cajón Proyectado (Orientativo Opcional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <TouchSelectModal
                  label="Cajón proyectado (orientativo)"
                  value={projectedCage}
                  options={[{ value: '', label: 'Sin proyección asignada' }, ...cageOptions]}
                  onChange={setProjectedCage}
                  helper="Cajón previsto para la siembra final tras el ciclo"
                />
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
            PASO 2: Ponederos & Ciclo
            ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <h2 className="text-lg font-black text-slate-900">2. Cantidad de Ponederos y Duración</h2>
              <p className="text-xs text-slate-500">
                Ajuste los controles táctiles para calcular automáticamente la fecha de retiro y capacidad.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TouchSlider
                label="N.º de ponederos"
                value={nests}
                min={1}
                max={12}
                step={1}
                unit="ponederos"
                helper="Base: 60.000 huevos máx por cada ponedero"
                onChange={setNests}
              />

              <TouchSlider
                label="Días con ponederos"
                value={days}
                min={1}
                max={10}
                step={1}
                unit="días"
                helper="Determina el tiempo de exposición biológica"
                onChange={setDays}
              />
            </div>

            {/* Readout en tiempo real del Paso 2 */}
            <div className="grid grid-cols-2 gap-3 bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-md">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">
                  Máximo Teórico Biológico
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
                  {fmt(eggMax)} <span className="text-xs font-semibold text-slate-400">huevos</span>
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  ({nests} ponederos × {fmt(eggsPerNest)})
                </span>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">
                  Fecha Calculada de Retiro
                </span>
                <span className="text-xl sm:text-2xl font-black text-blue-300 tracking-tight">
                  {removalDate}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Fecha de colocación + {days} días
                </span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PASO 3: Proyección & Cierre
            ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">3. Proyección de Ninfas y Confirmación</h2>
                <p className="text-xs text-slate-500">
                  Valide los escenarios de supervivencia auditados antes de guardar el registro.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black">
                Paso Final
              </span>
            </div>

            <TouchSlider
              label="Proyección de ninfas (unidades)"
              value={projection}
              min={10000}
              max={300000}
              step={5000}
              unit="ninfas"
              helper="Escenario biológico de nacimiento esperado"
              onChange={setProjection}
            />

            {isOverCeiling && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 flex items-start gap-2.5 text-amber-900 text-xs font-semibold">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Advertencia:</strong> La proyección ({fmt(projection)}) supera el máximo teórico de{' '}
                  {fmt(eggMax)} huevos calculados para {nests} ponederos.
                </div>
              </div>
            )}

            {/* Grilla de Métricas Finales y Estadísticas Completas */}
            <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-3.5 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Balance Biológico y Proyección Integral</span>
                <span className="text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60 font-semibold">
                  Cálculo en Vivo
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* 1. Máximo Teórico */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Máximo Teórico
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight">
                    {fmt(eggMax)} <span className="text-[10px] font-semibold text-slate-400">huevos</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {nests} ponederos × {fmt(eggsPerNest)}
                  </span>
                </div>

                {/* 2. Fecha Calculada Retiro */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Fecha Retiro Calculada
                  </span>
                  <span className="text-base sm:text-lg font-black text-blue-300 tracking-tight">
                    {removalDate}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {days} días de colocación
                  </span>
                </div>

                {/* 3. ID Asignado y Cajón */}
                <div className="p-2.5 bg-blue-950/60 border border-blue-500/40 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-300 uppercase block">
                    ID Asignado
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {generatedId}
                  </span>
                  <span className="text-[9px] text-blue-300 block truncate">
                    Cajón {cage} {projectedCage ? `→ ${projectedCage}` : ''}
                  </span>
                </div>

                {/* 4. Proyección Base */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Proyección Base
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {fmt(projection)} <span className="text-[10px] font-semibold text-slate-400">ninfas</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Mortalidad est. 20% – 60%
                  </span>
                </div>

                {/* 5. Escenario Favorable */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase block">
                    Favorable (-20%)
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight">
                    {fmt(favorable)} <span className="text-[10px] font-semibold text-slate-400">ninfas</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Baja merma biológica
                  </span>
                </div>

                {/* 6. Escenario Conservador */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">
                    Conservador (-60%)
                  </span>
                  <span className="text-base sm:text-lg font-black text-amber-400 tracking-tight">
                    {fmt(conservative)} <span className="text-[10px] font-semibold text-slate-400">ninfas</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Alta merma biológica
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          BARRA DE NAVEGACIÓN FIJA / INFERIOR (BOTONES TÁCTILES GRANDES)
          ========================================================================= */}
      <div className="pt-3 border-t border-slate-200 mt-2 flex items-center justify-between gap-3">
        {/* Botón Atrás */}
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

        {/* Resumen del paso actual */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-400">
          <span>Paso {currentStep} de 3</span>
        </div>

        {/* Botón Siguiente o Guardar */}
        {currentStep < 3 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => (prev + 1) as 2 | 3)}
            className="min-h-[52px] px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
          >
            <span>
              {currentStep === 1 ? 'Siguiente: Ponederos' : 'Siguiente: Proyección'}
            </span>
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
            <span>{isSubmitting ? 'Guardando Postura...' : 'Confirmar y Guardar Postura'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
