'use client';

import React, { useState } from 'react';
import { useStore } from '../../lib/store';
import { fmtDec, nextId, hoursFrozen } from '../../lib/calculations';
import { TouchSelectModal } from '../ui/TouchSelectModal';
import {
  Save,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
  Check,
  Waves,
  Calendar,
  UserCheck,
} from 'lucide-react';

interface Stage7WashingFormProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export function Stage7WashingForm({ onBack, onSuccess }: Stage7WashingFormProps) {
  const { state, currentEmployee, saveWashingLoad } = useStore();

  // Paso actual (1: Bolsas & Lote Destino, 2: Inocuidad & Balance)
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Bolsas congeladas disponibles (que no hayan sido lavadas aún)
  const washedBagKeys = new Set(
    state.washingLoads.flatMap((l) => (l.bags || []).map((b) => b.key))
  );

  const availableBags: Array<{
    key: string;
    bagId: string;
    cycleId: string;
    weightKg: number;
    frozenAt: string;
    freezer: string;
  }> = [];

  state.harvests.forEach((harvest) => {
    (harvest.bags || []).forEach((bag) => {
      const key = `${harvest.id}-${bag.bagId}`;
      if (!washedBagKeys.has(key)) {
        availableBags.push({
          key,
          bagId: bag.bagId,
          cycleId: harvest.cycleId,
          weightKg: bag.weightKg,
          frozenAt: bag.frozenAt,
          freezer: bag.freezer,
        });
      }
    });
  });

  const nowIso = new Date().toISOString().slice(0, 16);
  const [selectedBagKeys, setSelectedBagKeys] = useState<string[]>(
    availableBags.slice(0, 3).map((b) => b.key)
  );

  // Lotes de deshidratación acumulables
  const accumulatingLots = state.washingLots.filter((l) => l.status === 'Acumulando cargas');
  const [lotSelection, setLotSelection] = useState<string>('__new__');
  const [dateTime, setDateTime] = useState(nowIso);

  // Empleado tomado automáticamente de la sesión/login
  const employeeCode = currentEmployee?.employee_code || 'E-08';
  const employeeName = currentEmployee?.full_name || 'Operador en turno';

  const [disinfectant, setDisinfectant] = useState('Ácido peracético 15%');
  const [concentration, setConcentration] = useState('200 ppm');

  // Checklist de 3 zonas sanitarias
  const [checks, setChecks] = useState({
    dirty: true,
    intermediate: true,
    clean: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const generatedId = nextId('LV', dateTime.slice(0, 10), state.washingLoads);
  const targetLotId =
    lotSelection === '__new__'
      ? nextId('LP', dateTime.slice(0, 10), state.washingLots)
      : lotSelection;

  const chosenBags = availableBags.filter((b) => selectedBagKeys.includes(b.key));
  const totalWetWeight = chosenBags.reduce((sum, b) => sum + Number(b.weightKg || 0), 0);

  // Revisión de bolsas con más de 168 horas congeladas
  const overdueBags = chosenBags.filter((b) => {
    const hrs = hoursFrozen(b.frozenAt, dateTime);
    return hrs !== null && hrs >= 168;
  });

  const toggleBag = (key: string) => {
    setSelectedBagKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chosenBags.length) {
      alert('Debe seleccionar al menos una bolsa de congelador para procesar.');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveWashingLoad(
        {
          id: generatedId,
          lotId: targetLotId,
          dateTime,
          employee: employeeCode,
          weightKg: Number(totalWetWeight.toFixed(2)),
          bags: chosenBags,
          disinfectant,
          concentration,
          checks,
        },
        lotSelection === '__new__'
      );

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Error guardando carga de lavado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const lotOptions = [
    { value: '__new__', label: '+ Crear nuevo lote para deshidratación (LP-...)', detail: 'Inicia nueva acumulación' },
    ...accumulatingLots.map((l) => ({
      value: l.id,
      label: `Lote existente: ${l.id}`,
      detail: `Estado: ${l.status}`,
    })),
  ];

  const stepsConfig = [
    { num: 1, label: 'Bolsas & Lote Destino', icon: Waves },
    { num: 2, label: 'Inocuidad & Balance', icon: ShieldCheck },
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col justify-between min-h-[520px]">
      {/* Encabezado compacto optimizado para Tablet */}
      <div className="border-b pb-3 border-slate-200">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-8 bg-orange-500 rounded-full shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-orange-600 uppercase tracking-wider">
                  Etapa 7 · Segmento 3
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  Operador: <strong className="text-slate-800">{employeeCode}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                Lavado y Desinfección
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
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20'
                    : isCompleted
                    ? 'bg-orange-50 text-orange-900 hover:bg-orange-100 cursor-pointer'
                    : 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                    isCurrent
                      ? 'bg-white text-orange-600'
                      : isCompleted
                      ? 'bg-orange-600 text-white'
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
            <div className="font-bold text-base">¡Carga de lavado {generatedId} registrada exitosamente!</div>
            <div className="text-xs opacity-90">
              {chosenBags.length} bolsas procesadas ({totalWetWeight.toFixed(2)} kg vivos). Asignadas al lote {targetLotId}.
            </div>
          </div>
        </div>
      )}

      {/* Contenedor Principal de Pasos */}
      <div className="py-4 flex-1 flex flex-col justify-center">
        {/* =========================================================================
            PASO 1: Bolsas de Congelador & Lote Destino
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">1. Selección de Bolsas y Lote de Secado</h2>
                <p className="text-xs text-slate-500">
                  Seleccione las bolsas congeladas a descongelar y el lote de deshidratación receptor.
                </p>
              </div>
              <div className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Carga ID</span>
                <span className="text-sm font-black text-orange-700 tracking-tight">{generatedId}</span>
              </div>
            </div>

            {/* Selector interactivo de bolsas */}
            <div className="p-3 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900">
                  Bolsas a Procesar ({chosenBags.length} seleccionadas · {totalWetWeight.toFixed(2)} kg)
                </label>
                <span className="text-[11px] font-bold text-slate-500">
                  {availableBags.length} disponibles en congeladores
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                {availableBags.map((bag) => {
                  const isSelected = selectedBagKeys.includes(bag.key);
                  const hrs = hoursFrozen(bag.frozenAt, dateTime);
                  const isOverdue = hrs !== null && hrs >= 168;

                  return (
                    <div
                      key={bag.key}
                      onClick={() => toggleBag(bag.key)}
                      className={`p-2 rounded-xl border-2 flex items-center justify-between cursor-pointer select-none transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 text-orange-950 font-bold shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="truncate pr-1">
                        <div className="text-xs font-mono font-bold truncate">{bag.bagId}</div>
                        <div className="text-[11px] text-slate-500 font-semibold">
                          {bag.freezer} · {bag.weightKg} kg
                        </div>
                        {isOverdue && (
                          <div className="text-[9px] text-red-600 font-black">
                            ⚠ {hrs?.toFixed(0)}h (&gt;168h)
                          </div>
                        )}
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                          isSelected ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}

                {!availableBags.length && (
                  <div className="col-span-full py-6 text-center text-slate-400 text-xs font-medium">
                    No hay bolsas congeladas pendientes. Registre una cosecha en la Etapa 5.
                  </div>
                )}
              </div>
            </div>

            {overdueBags.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-start gap-2 text-amber-900 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Aviso de tiempo:</strong> {overdueBags.map((b) => b.bagId).join(', ')} supera 168 horas congelada(s). Se permite procesar bajo supervisión.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <TouchSelectModal
                  label="Lote de Deshidratación de destino"
                  value={lotSelection}
                  options={lotOptions}
                  onChange={setLotSelection}
                  required
                />
              </div>

              <div className="flex flex-col gap-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  Fecha y hora de procesamiento <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full min-h-[46px] px-3 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:border-orange-500 shadow-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PASO 2: Inocuidad, Desinfección & Balance Integral
            ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">2. Inocuidad 3 Zonas y Balance de Carga</h2>
                <p className="text-xs text-slate-500">
                  Verifique la solución desinfectante y confirme el cumplimiento de las zonas sanitarias.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-black">
                Paso Final
              </span>
            </div>

            {/* Parámetros de Desinfección */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-700">Producto desinfectante</label>
                <input
                  type="text"
                  required
                  value={disinfectant}
                  onChange={(e) => setDisinfectant(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:border-orange-500 shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-700">Concentración registrada</label>
                <input
                  type="text"
                  required
                  value={concentration}
                  onChange={(e) => setConcentration(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:border-orange-500 shadow-sm"
                />
              </div>
            </div>

            {/* Checklist de 3 Zonas Sanitarias */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Protocolo de Inocuidad · 3 Zonas Sanitarias
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={checks.dirty}
                    onChange={(e) => setChecks((p) => ({ ...p, dirty: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>1. Zona Sucia (Descongelado)</span>
                </label>

                <label className="p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={checks.intermediate}
                    onChange={(e) => setChecks((p) => ({ ...p, intermediate: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>2. Intermedia (Centrifugado)</span>
                </label>

                <label className="p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={checks.clean}
                    onChange={(e) => setChecks((p) => ({ ...p, clean: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span>3. Limpia (Desinfección)</span>
                </label>
              </div>
            </div>

            {/* Grilla de Métricas Finales y Balance de Lavado */}
            <div className="bg-slate-900 text-white rounded-2xl p-3 border border-slate-800 shadow-md">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Balance de Lavado y Entrada a Secado</span>
                <span className="text-orange-400 bg-orange-950/80 px-2 py-0.5 rounded-full border border-orange-800/60 font-semibold">
                  Cálculo en Vivo
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* 1. Peso Vivo de Entrada */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Peso Vivo Procesado
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight">
                    {fmtDec(totalWetWeight, 2)} <span className="text-[10px] font-semibold text-slate-400">kg</span>
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {chosenBags.length} bolsas incluidas
                  </span>
                </div>

                {/* 2. Lote Deshidratación Destino */}
                <div className="p-2.5 bg-orange-950/60 border border-orange-500/40 rounded-xl">
                  <span className="text-[10px] font-bold text-orange-300 uppercase block">
                    Lote Destino
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {targetLotId}
                  </span>
                  <span className="text-[9px] text-orange-300 block truncate">
                    Acumulación para Etapa 8
                  </span>
                </div>

                {/* 3. ID Carga Lavado */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    ID Registro
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {generatedId}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Hora: {dateTime.slice(11, 16)}
                  </span>
                </div>

                {/* 4. Desinfectante */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Desinfección
                  </span>
                  <span className="text-base sm:text-lg font-black text-white tracking-tight">
                    {concentration}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    {disinfectant}
                  </span>
                </div>

                {/* 5. Inocuidad 3 Zonas */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Inocuidad 3 Zonas
                  </span>
                  <span
                    className={`text-base sm:text-lg font-black tracking-tight ${
                      checks.dirty && checks.intermediate && checks.clean ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {checks.dirty && checks.intermediate && checks.clean ? 'Cumplido' : 'Incompleto'}
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Protocolo sanitario
                  </span>
                </div>

                {/* 6. Destino del Lote */}
                <div className="p-2.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Próxima Etapa
                  </span>
                  <span className="text-base sm:text-lg font-black text-blue-300 tracking-tight">
                    Etapa 8
                  </span>
                  <span className="text-[9px] text-slate-400 block truncate">
                    Deshidratación térmica
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
              if (!chosenBags.length) {
                alert('Debe seleccionar al menos una bolsa de congelador.');
                return;
              }
              setCurrentStep(2);
            }}
            className="min-h-[52px] px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all"
          >
            <span>Siguiente: Inocuidad y Balance</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || !chosenBags.length}
            className="min-h-[52px] px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black text-base flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{isSubmitting ? 'Guardando Carga...' : 'Confirmar y Guardar Lavado'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
