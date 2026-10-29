'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../lib/store';
import { SegmentNumber, getEmployeeSegments } from '../../types';
import { Stage1PostureForm } from '../../components/forms/Stage1PostureForm';
import { Stage2IncubationForm } from '../../components/forms/Stage2IncubationForm';
import { Stage3TransferForm } from '../../components/forms/Stage3TransferForm';
import { Stage4SowingForm } from '../../components/forms/Stage4SowingForm';
import { Stage5HarvestForm } from '../../components/forms/Stage5HarvestForm';
import { Stage6CleaningForm } from '../../components/forms/Stage6CleaningForm';
import { Stage7WashingForm } from '../../components/forms/Stage7WashingForm';
import { Stage8DehydrationForm } from '../../components/forms/Stage8DehydrationForm';
import { Stage9MillingForm } from '../../components/forms/Stage9MillingForm';
import {
  Egg,
  Thermometer,
  Box,
  Sprout,
  Wheat,
  Sparkles,
  Waves,
  Flame,
  Package,
  ArrowRight,
  User,
  Shield,
} from 'lucide-react';

export default function OperadorPage() {
  const router = useRouter();
  const { currentEmployee } = useStore();

  const [activeStage, setActiveStage] = useState<number | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<SegmentNumber>(1);

  // Redirigir a login si no hay sesión y sincronizar segmento autorizado
  useEffect(() => {
    if (!currentEmployee) {
      router.push('/login');
    } else {
      const allowed = getEmployeeSegments(currentEmployee);
      if (!allowed.includes(selectedSegment)) {
        setSelectedSegment(allowed[0] || 1);
      }
    }
  }, [currentEmployee, router, selectedSegment]);

  if (!currentEmployee) {
    return null;
  }

  const allowedSegments = getEmployeeSegments(currentEmployee);

  // Lista de etapas con metadatos
  const stagesBySegment = {
    1: [
      {
        num: 1,
        title: '1 · Registro de Postura',
        subtitle: 'Colocación y retiro de ponederos',
        detail: 'Cálculo de huevos teóricos, escenarios de mortalidad (20%-60%)',
        icon: Egg,
        color: 'from-slate-700 to-slate-900 border-slate-300',
        badge: 'Segmento 1',
      },
      {
        num: 2,
        title: '2 · Incubación',
        subtitle: 'Control fitosanitario y nacimiento',
        detail: 'Temperatura, humedad, peso, edad biológica y alerta de mosquitos',
        icon: Thermometer,
        color: 'from-slate-700 to-slate-900 border-slate-300',
        badge: 'Segmento 1',
      },
      {
        num: 3,
        title: '3 · Salida a Cajas (60 L)',
        subtitle: 'Distribución de ninfas nacidas',
        detail: 'Asignación a cajas físicas CJ-xxx con tope de 60.000 ninfas',
        icon: Box,
        color: 'from-slate-700 to-slate-900 border-slate-300',
        badge: 'Segmento 1',
      },
    ],
    2: [
      {
        num: 4,
        title: '4 · Siembra en Cajones',
        subtitle: 'Inicio de ciclo de engorde (45 días)',
        detail: 'Recepción desde cajas o directa en cajón CE-xxx con cálculo de edad',
        icon: Sprout,
        color: 'from-amber-600 to-amber-800 border-amber-300',
        badge: 'Segmento 2',
      },
      {
        num: 5,
        title: '5 · Cosecha y Congelamiento',
        subtitle: 'Recolección de grillo vivo',
        detail: 'Pesaje por bolsas individuales, congelador y registro de alimento',
        icon: Wheat,
        color: 'from-amber-600 to-amber-800 border-amber-300',
        badge: 'Segmento 2',
      },
      {
        num: 6,
        title: '6 · Limpieza y Preparación',
        subtitle: 'Habilitación sanitaria del cajón',
        detail: 'Desinfección, rearmado con cartones y control de reparaciones',
        icon: Sparkles,
        color: 'from-amber-600 to-amber-800 border-amber-300',
        badge: 'Segmento 2',
      },
    ],
    3: [
      {
        num: 7,
        title: '7 · Lavado y Desinfección',
        subtitle: 'Inocuidad en 3 zonas sanitarias',
        detail: 'Procesamiento de bolsas de congelador, alerta 168h y armado de lote LP',
        icon: Waves,
        color: 'from-orange-600 to-orange-800 border-orange-300',
        badge: 'Segmento 3',
      },
    ],
    4: [
      {
        num: 8,
        title: '8 · Deshidratación (Secado)',
        subtitle: 'Tratamiento térmico de secado',
        detail: 'Rendimiento seco (%), merma de peso y duración del ciclo térmico',
        icon: Flame,
        color: 'from-emerald-600 to-emerald-800 border-emerald-300',
        badge: 'Segmento 4',
      },
      {
        num: 9,
        title: '9 · Molienda y Empaque Final',
        subtitle: 'Harina terminada para consumo',
        detail: 'Rendimiento de molienda (%), rendimiento vivo trazado y bolsas',
        icon: Package,
        color: 'from-emerald-600 to-emerald-800 border-emerald-300',
        badge: 'Segmento 4',
      },
    ],
  };

  const currentStages = stagesBySegment[selectedSegment] || [];

  return (
    <div className={`max-w-6xl mx-auto px-3 sm:px-6 ${activeStage !== null ? 'py-2 sm:py-4' : 'py-5 space-y-6'}`}>
      {/* Banner de Bienvenida del Operador: Solo visible en la vista de selección para no forzar scroll en formularios de tablet */}
      {activeStage === null && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Estación de Trabajo · {currentEmployee.full_name}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
                  {currentEmployee.employee_code}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {currentEmployee.role === 'operator'
                  ? `Operador asignado a: ${allowedSegments.map((s) => `Segmento ${s}`).join(', ')}`
                  : 'Modo Supervisor/Admin: Acceso a todas las etapas de planta'}
              </p>
            </div>
          </div>

          {/* Selector de Segmento: Si tiene más de 1 segmento disponible */}
          {allowedSegments.length > 1 ? (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto">
              <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Segmento:
              </span>
              {allowedSegments.map((seg) => (
                <button
                  key={seg}
                  type="button"
                  onClick={() => {
                    setSelectedSegment(seg);
                    setActiveStage(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    selectedSegment === seg
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Seg {seg}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Segmento {allowedSegments[0]} (Exclusivo)</span>
            </div>
          )}
        </div>
      )}

      {/* Si hay una etapa seleccionada, muestra el formulario */}
      {activeStage !== null ? (
        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-md">
          {activeStage === 1 && (
            <Stage1PostureForm
              onBack={() => setActiveStage(null)}
              onSuccess={() => setActiveStage(null)}
            />
          )}
          {activeStage === 2 && (
            <Stage2IncubationForm
              onBack={() => setActiveStage(null)}
              onSuccess={() => setActiveStage(null)}
            />
          )}
          {activeStage === 3 && (
            <Stage3TransferForm
              onBack={() => setActiveStage(null)}
              onSuccess={() => setActiveStage(null)}
            />
          )}
          {activeStage === 4 && (
            <Stage4SowingForm
              onBack={() => setActiveStage(null)}
              onSuccess={() => setActiveStage(null)}
            />
          )}
          {activeStage === 5 && (
            <Stage5HarvestForm
              onBack={() => setActiveStage(null)}
              onSuccess={() => setActiveStage(null)}
            />
          )}
          {activeStage === 6 && (
            <Stage6CleaningForm
              onBack={() => setActiveStage(null)}
              onSuccess={() => setActiveStage(null)}
            />
          )}
          {activeStage === 7 && (
            <Stage7WashingForm
              onBack={() => setActiveStage(null)}
              onSuccess={() => setActiveStage(null)}
            />
          )}
          {activeStage === 8 && (
            <Stage8DehydrationForm
              onBack={() => setActiveStage(null)}
              onSuccess={() => setActiveStage(null)}
            />
          )}
          {activeStage === 9 && (
            <Stage9MillingForm
              onBack={() => setActiveStage(null)}
              onSuccess={() => setActiveStage(null)}
            />
          )}
        </div>
      ) : (
        /* Menú de Tarjetas Táctiles Grandes */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              Seleccione la Operación a Realizar Hoy
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {currentStages.length} etapa{currentStages.length > 1 ? 's' : ''} en Segmento {selectedSegment}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentStages.map((stage) => {
              const Icon = stage.icon;
              return (
                <button
                  key={stage.num}
                  type="button"
                  onClick={() => setActiveStage(stage.num)}
                  className="group bg-white rounded-3xl p-6 border-2 border-slate-200 hover:border-blue-500 hover:shadow-xl active:scale-[0.98] transition-all text-left flex flex-col justify-between min-h-[220px]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md group-hover:bg-blue-600 transition-colors">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-black px-3 py-1 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider">
                        {stage.badge}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                        {stage.title}
                      </h4>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">
                        {stage.subtitle}
                      </p>
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {stage.detail}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-blue-600 group-hover:translate-x-1 transition-transform">
                    <span>Iniciar Registro Táctil</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
