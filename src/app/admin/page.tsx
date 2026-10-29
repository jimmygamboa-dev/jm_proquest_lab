'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../lib/store';
import { calculateKPIs, getQualityAlerts, fmtDec } from '../../lib/calculations';
import { QualityAlertBanner } from '../../components/ui/QualityAlertBanner';
import { Role, SegmentNumber, Employee, getEmployeeSegments } from '../../types';
import {
  Tv,
  Download,
  Upload,
  RefreshCw,
  Users,
  History,
  FileSpreadsheet,
  AlertTriangle,
  Edit3,
  TrendingUp,
  Scale,
  Factory,
  PackageCheck,
  ShieldCheck,
  Search,
  X,
  Save,
  UserPlus,
  KeyRound,
  Check,
  Eye,
  EyeOff,
  Lock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  Power,
  Copy,
  Sparkles,
} from 'lucide-react';

function getNextEmployeeCode(employees: Employee[]): string {
  let maxNum = 0;
  for (const emp of employees) {
    const match = emp.employee_code.match(/E-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  return `E-${String(nextNum).padStart(2, '0')}`;
}

function generateUniquePin(employees: Employee[]): string {
  let pin = '';
  let attempts = 0;
  do {
    pin = String(Math.floor(1000 + Math.random() * 9000));
    attempts++;
  } while (employees.some((e) => e.pin === pin && e.active) && attempts < 100);
  return pin;
}

const SECTION_INFO: {
  num: SegmentNumber;
  name: string;
  short: string;
  stages: string;
  badgeBg: string;
  dotBg: string;
}[] = [
  {
    num: 1,
    name: 'Segmento 1: Cría e Incubación',
    short: 'Seg 1 · Cría',
    stages: 'Etapas 1, 2 y 3 (Postura, Incubación, Salida a Cajas)',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
    dotBg: 'bg-slate-700',
  },
  {
    num: 2,
    name: 'Segmento 2: Engorde y Cosecha',
    short: 'Seg 2 · Engorde',
    stages: 'Etapas 4, 5 y 6 (Siembra, Cosecha, Preparación)',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    dotBg: 'bg-amber-600',
  },
  {
    num: 3,
    name: 'Segmento 3: Inocuidad y Lavado',
    short: 'Seg 3 · Lavado',
    stages: 'Etapa 7 (Lavado, Centrifugado y Desinfección)',
    badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
    dotBg: 'bg-orange-600',
  },
  {
    num: 4,
    name: 'Segmento 4: Procesamiento y Molienda',
    short: 'Seg 4 · Molienda',
    stages: 'Etapas 8 y 9 (Deshidratación/Secado, Molienda y Empaque)',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    dotBg: 'bg-emerald-600',
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const {
    state,
    currentEmployee,
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    resetEmployees,
    saveCorrection,
    exportBackupJson,
    exportSummaryCsv,
    importBackupJson,
    resetToSampleData,
  } = useStore();

  const [tvMode, setTvMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'personnel' | 'backup'>('dashboard');

  // Filtros de historial
  const [historySearch, setHistorySearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');

  // Filtros de personal
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [personnelRoleFilter, setPersonnelRoleFilter] = useState<'all' | Role>('all');
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  // Modales de administración de usuarios
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    employee_code: string;
    full_name: string;
    pin: string;
    role: Role;
    segments: SegmentNumber[];
    active: boolean;
  }>({
    employee_code: 'E-10',
    full_name: '',
    pin: '1234',
    role: 'operator',
    segments: [1],
    active: true,
  });

  const [editingUser, setEditingUser] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState<{
    employee_code: string;
    full_name: string;
    pin: string;
    role: Role;
    segments: SegmentNumber[];
    active: boolean;
  }>({
    employee_code: '',
    full_name: '',
    pin: '',
    role: 'operator',
    segments: [1],
    active: true,
  });

  const [quickPinUser, setQuickPinUser] = useState<Employee | null>(null);
  const [quickPinValue, setQuickPinValue] = useState('');
  const [quickPinError, setQuickPinError] = useState('');

  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // Modal de corrección para supervisores
  const [editingRecord, setEditingRecord] = useState<{
    id: string;
    stage: string;
    data: any;
  } | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [editFormData, setEditFormData] = useState<any>({});
  const [isSavingCorrection, setIsSavingCorrection] = useState(false);

  // Manejadores de Gestión de Usuarios y Accesos
  const handleOpenCreateModal = () => {
    setUserActionError(null);
    setUserActionSuccess(null);
    setCreateForm({
      employee_code: getNextEmployeeCode(employees),
      full_name: '',
      pin: generateUniquePin(employees),
      role: 'operator',
      segments: [1],
      active: true,
    });
    setIsCreateUserModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionError(null);
    setIsSubmittingUser(true);
    const res = await addEmployee(createForm);
    setIsSubmittingUser(false);
    if (!res.success) {
      setUserActionError(res.error || 'Error al crear usuario.');
    } else {
      setUserActionSuccess(`Usuario ${res.employee?.full_name} (${res.employee?.employee_code}) creado con éxito.`);
      setTimeout(() => {
        setIsCreateUserModalOpen(false);
        setUserActionSuccess(null);
      }, 900);
    }
  };

  const handleOpenEditModal = (emp: Employee) => {
    setUserActionError(null);
    setUserActionSuccess(null);
    setEditingUser(emp);
    setEditForm({
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      pin: emp.pin,
      role: emp.role,
      segments: getEmployeeSegments(emp),
      active: emp.active,
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUserActionError(null);
    setIsSubmittingUser(true);
    const res = await updateEmployee(editingUser.id, editForm);
    setIsSubmittingUser(false);
    if (!res.success) {
      setUserActionError(res.error || 'Error al actualizar usuario.');
    } else {
      setUserActionSuccess(`Usuario ${editForm.full_name} actualizado con éxito.`);
      setTimeout(() => {
        setEditingUser(null);
        setUserActionSuccess(null);
      }, 900);
    }
  };

  const handleOpenQuickPin = (emp: Employee) => {
    setQuickPinUser(emp);
    setQuickPinValue(emp.pin);
    setQuickPinError('');
  };

  const handleSaveQuickPin = async () => {
    if (!quickPinUser) return;
    if (!/^\d{4}$/.test(quickPinValue)) {
      setQuickPinError('El PIN debe tener exactamente 4 dígitos numéricos.');
      return;
    }
    const res = await updateEmployee(quickPinUser.id, { pin: quickPinValue });
    if (!res.success) {
      setQuickPinError(res.error || 'Error al actualizar PIN.');
    } else {
      setQuickPinUser(null);
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    await updateEmployee(emp.id, { active: !emp.active });
  };

  const togglePinVisibility = (empId: string) => {
    setVisiblePins((prev) => ({ ...prev, [empId]: !prev[empId] }));
  };

  const filteredEmployees = employees.filter((emp) => {
    const term = personnelSearch.toLowerCase();
    const matchesSearch =
      emp.full_name.toLowerCase().includes(term) ||
      emp.employee_code.toLowerCase().includes(term) ||
      emp.pin.includes(term);
    const matchesRole =
      personnelRoleFilter === 'all' || emp.role === personnelRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Verificación de permisos (solo admin o supervisor)
  useEffect(() => {
    if (!currentEmployee) {
      router.push('/login');
    } else if (currentEmployee.role === 'operator') {
      router.push('/operador');
    }
  }, [currentEmployee, router]);

  if (!currentEmployee || currentEmployee.role === 'operator') {
    return null;
  }

  // Cálculos de KPIs y Alertas en tiempo real
  const kpis = calculateKPIs(state);
  const alerts = getQualityAlerts(state);

  // Unificación de registros para historial con tipado seguro
  const allHistoryRecords = [
    ...state.postures.map((p) => ({
      id: p.id,
      stageKey: 'postures',
      stageName: '1 · Postura',
      segment: 1,
      date: p.date,
      employee: p.employee,
      summary: `Cajón ${p.cage} · ${p.nests} ponederos · ${p.projection} ninfas`,
      weightOrCount: `${p.eggCeiling} huevos teór.`,
      raw: p,
    })),
    ...state.incubations.map((i) => ({
      id: i.id,
      stageKey: 'incubations',
      stageName: '2 · Incubación',
      segment: 1,
      date: i.actualBirth || i.entryDate,
      employee: i.employee,
      summary: `${i.incubator} · ${i.newbornWeight || 0} g · Mosquitos: ${i.mosquitoLevel || 'N/R'}`,
      weightOrCount: `${i.newbornCount || 0} ninfas`,
      raw: i,
    })),
    ...state.transfers.map((t) => ({
      id: t.id,
      stageKey: 'transfers',
      stageName: '3 · Salida Cajas',
      segment: 1,
      date: t.date,
      employee: t.employee,
      summary: `Caja ${t.boxCode} · Inc: ${t.incubationId} · Edad: ${t.age} d`,
      weightOrCount: `${t.weight} g (${t.nymphs} ninfas)`,
      raw: t,
    })),
    ...state.sowings.map((s) => ({
      id: s.id,
      stageKey: 'sowings',
      stageName: '4 · Siembra',
      segment: 2,
      date: s.date,
      employee: s.employee,
      summary: `Cajón ${s.cage} · Ciclo: ${s.cycleId} · Edad: ${s.biologicalAge} d`,
      weightOrCount: `${s.weight} g (${s.nymphs} ninfas)`,
      raw: s,
    })),
    ...state.harvests.map((h) => ({
      id: h.id,
      stageKey: 'harvests',
      stageName: '5 · Cosecha',
      segment: 2,
      date: h.date,
      employee: h.employee,
      summary: `Ciclo ${h.cycleId} · Cajón ${h.cage} · ${h.bags.length} bolsas`,
      weightOrCount: `${h.bags.reduce((acc, b) => acc + Number(b.weightKg || 0), 0).toFixed(2)} kg vivos`,
      raw: h,
    })),
    ...state.cleanings.map((c) => ({
      id: c.id,
      stageKey: 'cleanings',
      stageName: '6 · Preparación',
      segment: 2,
      date: c.cleanDate,
      employee: c.employee,
      summary: `Ciclo ${c.cycleId} · Armado: ${c.assembleDate || '—'} · Reparación: ${c.repairRequired}`,
      weightOrCount: 'Habilitado',
      raw: c,
    })),
    ...state.washingLoads.map((w) => ({
      id: w.id,
      stageKey: 'washingLoads',
      stageName: '7 · Lavado',
      segment: 3,
      date: w.dateTime.slice(0, 10),
      employee: w.employee,
      summary: `Lote ${w.lotId} · ${w.bags.length} bolsas · ${w.disinfectant}`,
      weightOrCount: `${w.weightKg} kg`,
      raw: w,
    })),
    ...state.dryingRuns.map((d) => ({
      id: d.id,
      stageKey: 'dryingRuns',
      stageName: '8 · Deshidratación',
      segment: 4,
      date: d.startAt.slice(0, 10),
      employee: d.employee,
      summary: `Lote ${d.lotId} · ${d.temp}°C`,
      weightOrCount: `${d.dryWeightKg} kg secos`,
      raw: d,
    })),
    ...state.millingRuns.map((m) => ({
      id: m.id,
      stageKey: 'millingRuns',
      stageName: '9 · Molienda',
      segment: 4,
      date: m.dateTime.slice(0, 10),
      employee: m.employee,
      summary: `Método: ${m.method} · Humedad: ${m.humidity}%`,
      weightOrCount: `${m.packedKg} kg empacados`,
      raw: m,
    })),
  ].sort((a, b) => (b.date > a.date ? 1 : -1));

  const filteredHistory = allHistoryRecords.filter((rec) => {
    const matchSearch =
      rec.id.toLowerCase().includes(historySearch.toLowerCase()) ||
      rec.summary.toLowerCase().includes(historySearch.toLowerCase());
    const matchStage = stageFilter === 'all' || rec.stageKey === stageFilter;
    const matchEmp = employeeFilter === 'all' || rec.employee === employeeFilter;
    return matchSearch && matchStage && matchEmp;
  });

  const handleOpenCorrection = (rec: any) => {
    setEditingRecord({
      id: rec.id,
      stage: rec.stageKey,
      data: rec.raw,
    });
    setEditFormData({ ...rec.raw });
    setCorrectionReason('');
  };

  const handleSaveCorrection = async () => {
    if (!editingRecord) return;
    if (!correctionReason.trim()) {
      alert('Debe ingresar un motivo de corrección para la auditoría.');
      return;
    }

    setIsSavingCorrection(true);
    try {
      await saveCorrection(
        editingRecord.id,
        editingRecord.stage,
        editFormData,
        correctionReason
      );
      setEditingRecord(null);
      alert('Corrección guardada y registrada en auditoría.');
    } catch (err) {
      console.error(err);
      alert('Error guardando la corrección.');
    } finally {
      setIsSavingCorrection(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ok = importBackupJson(content);
      if (ok) {
        alert('Respaldo cargado exitosamente.');
      } else {
        alert('El archivo no tiene el formato JSON válido de JM Proquest.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`mx-auto px-4 sm:px-6 py-6 space-y-6 ${tvMode ? 'max-w-[95vw]' : 'max-w-7xl'}`}>
      {/* Barra de Encabezado y Selector TV */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Panel Administrativo y Supervisión
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
              {currentEmployee.role === 'admin' ? 'Administrador' : 'Supervisor'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Monitoreo en tiempo real de indicadores, alertas fitosanitarias y trazabilidad en 4 segmentos.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Toggle Modo Pantalla Oficina (TV) */}
          <button
            type="button"
            onClick={() => setTvMode(!tvMode)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              tvMode
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>{tvMode ? 'Modo TV Activo' : 'Modo TV Oficina'}</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Navegación del Panel */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Dashboard & KPIs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Historial y Auditoría ({allHistoryRecords.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('personnel')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === 'personnel'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Personal y Accesos ({employees.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === 'backup'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Respaldo y Exportación
        </button>
      </div>

      {/* ----------------------------------------------------------------------
          PESTAÑA 1: DASHBOARD Y ALERTAS
      ---------------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Panel Prioritario de Alertas de Calidad */}
          <QualityAlertBanner alerts={alerts} tvMode={tvMode} />

          {/* Tarjetas Principales de Producción */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Vivo Cosechado</span>
                <Factory className="w-5 h-5 text-amber-600" />
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {fmtDec(kpis.liveHarvestedKg, 1)} <span className="text-base font-bold text-slate-500">kg</span>
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  Total de grillo fresco cosechado
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Seco Entero</span>
                <Scale className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {fmtDec(kpis.dryKg, 1)} <span className="text-base font-bold text-slate-500">kg</span>
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  Grillo deshidratado disponible
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Harina Empacada</span>
                <PackageCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {fmtDec(kpis.packedKg, 1)} <span className="text-base font-bold text-slate-500">kg</span>
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  Harina terminada en bolsas
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Saldo Suelto</span>
                <Scale className="w-5 h-5 text-orange-600" />
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {fmtDec(kpis.looseFlourPendingKg, 1)} <span className="text-base font-bold text-slate-500">kg</span>
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">
                  Harina pendiente de embolsar
                </div>
              </div>
            </div>
          </div>

          {/* Rendimientos Técnicos Auditados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Rendimiento Deshidratación</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Seco ÷ Vivo
                </span>
              </div>
              <div className="text-4xl font-black text-emerald-400 tracking-tight">
                {kpis.dehydrationYieldPct !== null ? `${kpis.dehydrationYieldPct.toFixed(1)}%` : '—'}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Pérdida por secado térmico: {fmtDec(kpis.dryLossKg, 1)} kg de humedad evaporada.
              </p>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Rendimiento Molienda</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
                  Harina ÷ Seco
                </span>
              </div>
              <div className="text-4xl font-black text-blue-400 tracking-tight">
                {kpis.millingYieldPct !== null ? `${kpis.millingYieldPct.toFixed(1)}%` : '—'}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Merma en molino: {fmtDec(kpis.millingLossKg, 2)} kg respecto al grillo seco usado.
              </p>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Rendimiento Vivo a Empaque</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800">
                  Trazado Completo
                </span>
              </div>
              <div className="text-4xl font-black text-purple-400 tracking-tight">
                {kpis.liveToPackYieldPct !== null ? `${kpis.liveToPackYieldPct.toFixed(1)}%` : '—'}
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Basado en {fmtDec(kpis.traceLiveKg, 1)} kg vivos trazados desde bolsas iniciales a harina.
              </p>
            </div>
          </div>

          {/* Resumen de Cajones y Actividad */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-black text-lg text-slate-900 tracking-tight">
              Estado General de Planta (75 Cajones Habilitados)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-2xl font-black text-slate-900">{state.postures.length}</span>
                <span className="text-xs font-semibold text-slate-500 block mt-1">Posturas</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-2xl font-black text-slate-900">{state.incubations.length}</span>
                <span className="text-xs font-semibold text-slate-500 block mt-1">Incubaciones</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-2xl font-black text-slate-900">{state.sowings.length}</span>
                <span className="text-xs font-semibold text-slate-500 block mt-1">Siembras en Cajón</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-2xl font-black text-slate-900">{state.harvests.length}</span>
                <span className="text-xs font-semibold text-slate-500 block mt-1">Cosechas</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          PESTAÑA 2: HISTORIAL Y AUDITORÍA
      ---------------------------------------------------------------------- */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Barra de Filtros */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Buscar por ID o detalle..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="all">Todas las Etapas (1 a 9)</option>
                <option value="postures">1 · Postura</option>
                <option value="incubations">2 · Incubación</option>
                <option value="transfers">3 · Salida Cajas</option>
                <option value="sowings">4 · Siembra</option>
                <option value="harvests">5 · Cosecha</option>
                <option value="cleanings">6 · Preparación</option>
                <option value="washingLoads">7 · Lavado</option>
                <option value="dryingRuns">8 · Deshidratación</option>
                <option value="millingRuns">9 · Molienda</option>
              </select>

              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="all">Todos los Empleados</option>
                {employees.map((emp) => (
                  <option key={emp.employee_code} value={emp.employee_code}>
                    {emp.employee_code} · {emp.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla de Registros */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">ID Registro</th>
                    <th className="py-3 px-4">Etapa</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Empleado</th>
                    <th className="py-3 px-4">Detalle Operativo</th>
                    <th className="py-3 px-4">Peso / Cantidad</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-black text-slate-900">{rec.id}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                          {rec.stageName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">{rec.date}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{rec.employee}</td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-xs">{rec.summary}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{rec.weightOrCount}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenCorrection(rec)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 inline-flex items-center gap-1 text-[11px]"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Corregir
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!filteredHistory.length && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                        No se encontraron registros con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Historial de Correcciones Auditadas */}
          {state.corrections.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-black text-base text-slate-900 tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Auditoría de Correcciones de Supervisión ({state.corrections.length})
              </h3>
              <div className="space-y-2">
                {state.corrections.map((corr) => (
                  <div
                    key={corr.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-mono font-bold text-blue-700 mr-2">{corr.recordId}</span>
                      <span className="font-semibold text-slate-800">
                        Motivo: &quot;{corr.reason}&quot;
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Supervisor: <b className="text-slate-700">{corr.supervisor}</b> · {corr.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------------
          PESTAÑA 3: PERSONAL Y ACCESOS (GESTIÓN ADMIN DE USUARIOS, PIN Y SECCIONES)
      ---------------------------------------------------------------------- */}
      {activeTab === 'personnel' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6 animate-in fade-in">
          {/* Cabecera y botón principal */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-900 tracking-tight">
                    Control de Personal, PINs y Secciones de Trabajo
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Gestione las cuentas de acceso rápido, modifique PINs de 4 dígitos y configure las secciones de planta autorizadas para cada empleado.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {currentEmployee.role === 'admin' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('¿Restablecer el catálogo de empleados a los valores iniciales de prueba?')) {
                        resetEmployees();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all"
                    title="Restablecer empleados iniciales de prueba"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Crear Nuevo Usuario</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {currentEmployee.role !== 'admin' && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 font-medium">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <b>Modo Lectura (Supervisor):</b> Solo los usuarios con rol de <b>Administrador General</b> tienen permisos para crear personal, modificar códigos PIN y reasignar secciones operativas.
              </span>
            </div>
          )}

          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={personnelSearch}
                onChange={(e) => setPersonnelSearch(e.target.value)}
                placeholder="Buscar por nombre, código (ej: E-01) o PIN..."
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-blue-500 focus:outline-none"
              />
              {personnelSearch && (
                <button
                  type="button"
                  onClick={() => setPersonnelSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" /> Rol:
              </span>
              {(
                [
                  { key: 'all', label: 'Todos' },
                  { key: 'operator', label: 'Operadores' },
                  { key: 'supervisor', label: 'Supervisores' },
                  { key: 'admin', label: 'Admins' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPersonnelRoleFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    personnelRoleFilter === tab.key
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Personal */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Nombre del Empleado</th>
                  <th className="py-3 px-4">Rol en Planta</th>
                  <th className="py-3 px-4">PIN de Acceso</th>
                  <th className="py-3 px-4">Secciones / Segmentos Autorizados</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  {currentEmployee.role === 'admin' && (
                    <th className="py-3 px-4 text-right">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={currentEmployee.role === 'admin' ? 7 : 6}
                      className="py-8 text-center text-slate-400 font-medium"
                    >
                      No se encontraron empleados con los criterios de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isPinVisible = Boolean(visiblePins[emp.id]);
                    const assignedSegs = getEmployeeSegments(emp);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Código */}
                        <td className="py-3.5 px-4 font-mono font-black text-slate-900 whitespace-nowrap">
                          <span className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200">
                            {emp.employee_code}
                          </span>
                        </td>

                        {/* Nombre */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {emp.full_name}
                        </td>

                        {/* Rol */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {emp.role === 'admin' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-100 text-blue-800">
                              Administrador
                            </span>
                          )}
                          {emp.role === 'supervisor' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-800">
                              Supervisor
                            </span>
                          )}
                          {emp.role === 'operator' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-800">
                              Operador
                            </span>
                          )}
                        </td>

                        {/* PIN */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 bg-blue-50/60 border border-blue-200/60 rounded-xl px-2.5 py-1">
                            <span className="font-mono font-black text-blue-700 tracking-wider text-xs min-w-[36px]">
                              {isPinVisible ? emp.pin : '••••'}
                            </span>

                            <button
                              type="button"
                              onClick={() => togglePinVisibility(emp.id)}
                              className="text-slate-400 hover:text-blue-600 transition-colors p-0.5"
                              title={isPinVisible ? 'Ocultar PIN' : 'Ver PIN'}
                            >
                              {isPinVisible ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {currentEmployee.role === 'admin' && (
                              <button
                                type="button"
                                onClick={() => handleOpenQuickPin(emp)}
                                className="ml-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                                title="Cambio rápido de PIN"
                              >
                                Modificar
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Secciones autorizadas */}
                        <td className="py-3.5 px-4">
                          {emp.role === 'admin' || emp.role === 'supervisor' ? (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Todas las secciones (1 - 4)
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {assignedSegs.map((segNum) => {
                                const info = SECTION_INFO.find((s) => s.num === segNum);
                                return (
                                  <span
                                    key={segNum}
                                    title={info?.stages || ''}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                                      info?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-300'
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${info?.dotBg || 'bg-slate-600'}`} />
                                    {info?.short || `Seg ${segNum}`}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            disabled={currentEmployee.role !== 'admin'}
                            onClick={() => handleToggleActive(emp)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all ${
                              emp.active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                            title={
                              currentEmployee.role === 'admin'
                                ? emp.active
                                  ? 'Haga clic para desactivar'
                                  : 'Haga clic para activar'
                                : undefined
                            }
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                emp.active ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
                              }`}
                            />
                            {emp.active ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>

                        {/* Acciones */}
                        {currentEmployee.role === 'admin' && (
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(emp)}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1 font-bold text-[11px]"
                                title="Modificar usuario, PIN y secciones"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenQuickPin(emp)}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                title="Cambiar PIN"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          PESTAÑA 4: RESPALDO Y EXPORTACIÓN
      ---------------------------------------------------------------------- */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6 animate-in fade-in max-w-3xl mx-auto">
          <div>
            <h3 className="font-black text-xl text-slate-900 tracking-tight">
              Exportación y Copias de Seguridad
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Descargue respaldos técnicos completos o resúmenes en formato CSV para abrir directamente en Microsoft Excel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={exportBackupJson}
              className="p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col justify-between text-left transition-all group"
            >
              <div>
                <Download className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-black text-base text-slate-900">Respaldo Técnico (JSON)</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Copia íntegra de todas las tablas, relaciones, auditoría y parámetros para restauración.
                </p>
              </div>
              <span className="text-xs font-bold text-blue-600 mt-4 block">Descargar .json →</span>
            </button>

            <button
              type="button"
              onClick={exportSummaryCsv}
              className="p-5 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 flex flex-col justify-between text-left transition-all group"
            >
              <div>
                <FileSpreadsheet className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-black text-base text-slate-900">Resumen Legible (CSV para Excel)</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Tabla de todas las etapas con columnas ordenadas y totales para análisis contable.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600 mt-4 block">Descargar .csv →</span>
            </button>
          </div>

          <div className="border-t border-slate-100 pt-6 space-y-4">
            <h4 className="font-bold text-sm text-slate-800">Cargar Respaldo JSON Existente</h4>
            <label className="flex items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-blue-500 bg-slate-50 hover:bg-white transition-colors">
              <input type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
              <div className="text-center space-y-1">
                <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                <span className="text-xs font-bold text-slate-700 block">
                  Haga clic para seleccionar archivo JSON
                </span>
                <span className="text-[11px] text-slate-400">Restaura el estado completo de pruebas</span>
              </div>
            </label>
          </div>

          <div className="border-t border-slate-100 pt-6 flex justify-between items-center">
            <div>
              <div className="font-bold text-sm text-slate-800">Restablecer Datos de Prueba</div>
              <div className="text-xs text-slate-500">Regresa a los registros predeterminados del sistema.</div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Desea restablecer todos los registros a los valores iniciales de prueba?')) {
                  resetToSampleData();
                }
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Restablecer
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          MODAL DE CORRECCIÓN DE REGISTROS (SUPERVISIÓN)
      ---------------------------------------------------------------------- */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">Corrección de Registro · Supervisión</h3>
                <p className="text-xs text-slate-400">ID: {editingRecord.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Toda modificación realizada por Supervisión quedará registrada en el historial de auditoría con su código de empleado y fecha.
                </div>
              </div>

              {/* Campos editables según etapa */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Datos Modificables
                </label>

                {editingRecord.stage === 'postures' && (
                  <>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-600 font-semibold">Ponederos:</span>
                      <input
                        type="number"
                        value={editFormData.nests || 0}
                        onChange={(e) => setEditFormData({ ...editFormData, nests: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-xl font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-600 font-semibold">Proyección de ninfas:</span>
                      <input
                        type="number"
                        value={editFormData.projection || 0}
                        onChange={(e) => setEditFormData({ ...editFormData, projection: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-xl font-bold text-sm"
                      />
                    </div>
                  </>
                )}

                {editingRecord.stage === 'incubations' && (
                  <>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-600 font-semibold">Peso ninfas nacidas (g):</span>
                      <input
                        type="number"
                        value={editFormData.newbornWeight || 0}
                        onChange={(e) => setEditFormData({ ...editFormData, newbornWeight: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-xl font-bold text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-600 font-semibold">Edad al pesar (días):</span>
                      <input
                        type="number"
                        value={editFormData.ageWeighed || 1}
                        onChange={(e) => setEditFormData({ ...editFormData, ageWeighed: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-xl font-bold text-sm"
                      />
                    </div>
                  </>
                )}

                {editingRecord.stage === 'transfers' && (
                  <div className="space-y-1">
                    <span className="text-xs text-slate-600 font-semibold">Peso trasladado a caja (g):</span>
                    <input
                      type="number"
                      value={editFormData.weight || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, weight: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-xl font-bold text-sm"
                    />
                  </div>
                )}

                {editingRecord.stage === 'dryingRuns' && (
                  <div className="space-y-1">
                    <span className="text-xs text-slate-600 font-semibold">Peso seco entero obtenido (kg):</span>
                    <input
                      type="number"
                      step="0.1"
                      value={editFormData.dryWeightKg || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, dryWeightKg: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-xl font-bold text-sm"
                    />
                  </div>
                )}

                {editingRecord.stage === 'millingRuns' && (
                  <div className="space-y-1">
                    <span className="text-xs text-slate-600 font-semibold">Harina empacada (kg):</span>
                    <input
                      type="number"
                      step="0.1"
                      value={editFormData.packedKg || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, packedKg: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-xl font-bold text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Motivo de Corrección Obligatorio */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700">
                  Motivo de la corrección <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Explique el motivo del ajuste (ej: error de digitación en peso, recalibración de balanza)..."
                  className="w-full p-3 border-2 border-slate-200 rounded-xl text-xs font-medium focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSavingCorrection}
                  onClick={handleSaveCorrection}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-black text-xs hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <Save className="w-4 h-4" />
                  {isSavingCorrection ? 'Guardando...' : 'Aplicar Corrección'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL 1: CREAR NUEVO USUARIO
      ====================================================================== */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Crear Nuevo Usuario</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure las credenciales de acceso y secciones autorizadas en planta.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {userActionError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{userActionError}</span>
                </div>
              )}

              {userActionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{userActionSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                    placeholder="Ej: Daniel Morales"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Código */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código de Empleado <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.employee_code}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, employee_code: e.target.value.toUpperCase() })
                    }
                    placeholder="Ej: E-10"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-blue-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Rol en Planta <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { role: 'operator', label: 'Operador', desc: 'Acceso por sección' },
                      { role: 'supervisor', label: 'Supervisor', desc: 'Auditoría total' },
                      { role: 'admin', label: 'Administrador', desc: 'Control completo' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, role: item.role })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        createForm.role === item.role
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-black text-xs">{item.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN de Acceso */}
              <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    PIN de Acceso (4 Dígitos Numéricos) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm({ ...createForm, pin: generateUniquePin(employees) })
                    }
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generar PIN único</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={createForm.pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setCreateForm({ ...createForm, pin: val });
                    }}
                    placeholder="1234"
                    className="w-36 text-center font-mono font-black text-xl tracking-widest px-3 py-2 rounded-xl border-2 border-blue-300 bg-white text-blue-700 focus:border-blue-600 focus:outline-none shadow-inner"
                  />
                  <p className="text-[11px] text-slate-500 leading-tight">
                    El operador utilizará este PIN de 4 dígitos en la pantalla de inicio táctil para ingresar a la planta.
                  </p>
                </div>
              </div>

              {/* Secciones a las que puede trabajar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Secciones / Segmentos Autorizados para Trabajar
                    </label>
                    <p className="text-[11px] text-slate-500">
                      {createForm.role === 'operator'
                        ? 'Seleccione las secciones que el operador podrá ver y operar:'
                        : 'Supervisores y administradores tienen acceso a todas las secciones de planta.'}
                    </p>
                  </div>

                  {createForm.role === 'operator' && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() =>
                          setCreateForm({ ...createForm, segments: [1, 2, 3, 4] })
                        }
                        className="text-blue-600 hover:underline"
                      >
                        Todas
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCreateForm({ ...createForm, segments: [1, 2] })
                        }
                        className="text-blue-600 hover:underline"
                      >
                        Cría + Engorde
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCreateForm({ ...createForm, segments: [3, 4] })
                        }
                        className="text-blue-600 hover:underline"
                      >
                        Lavado + Molienda
                      </button>
                    </div>
                  )}
                </div>

                {createForm.role === 'operator' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SECTION_INFO.map((sec) => {
                      const isSelected = createForm.segments.includes(sec.num);
                      return (
                        <button
                          key={sec.num}
                          type="button"
                          onClick={() => {
                            const has = createForm.segments.includes(sec.num);
                            const next = has
                              ? createForm.segments.filter((s) => s !== sec.num)
                              : [...createForm.segments, sec.num];
                            setCreateForm({ ...createForm, segments: next.sort() });
                          }}
                          className={`p-3 rounded-2xl border text-left flex items-start justify-between gap-2 transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                              : 'border-slate-200 bg-white hover:bg-slate-50 opacity-75'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${sec.dotBg}`}
                              />
                              <span className="font-black text-xs text-slate-900">
                                {sec.name}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">
                              {sec.stages}
                            </p>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Habilitado para <b>todas las secciones (Segmentos 1, 2, 3 y 4)</b>.
                    </span>
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmittingUser ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL 2: MODIFICAR USUARIO, PIN Y SECCIONES
      ====================================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Modificar Usuario · {editForm.employee_code}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Actualice el PIN de acceso, nombre, rol y las secciones operativas autorizadas.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              {userActionError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{userActionError}</span>
                </div>
              )}

              {userActionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{userActionSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Código */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código de Empleado <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.employee_code}
                    onChange={(e) =>
                      setEditForm({ ...editForm, employee_code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-blue-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Rol en Planta <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { role: 'operator', label: 'Operador', desc: 'Acceso por sección' },
                      { role: 'supervisor', label: 'Supervisor', desc: 'Auditoría total' },
                      { role: 'admin', label: 'Administrador', desc: 'Control completo' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.role}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, role: item.role })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        editForm.role === item.role
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-1 ring-blue-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-black text-xs">{item.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN de Acceso */}
              <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    PIN de Acceso (4 Dígitos Numéricos) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm({ ...editForm, pin: generateUniquePin(employees) })
                    }
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generar PIN único</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={editForm.pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setEditForm({ ...editForm, pin: val });
                    }}
                    className="w-36 text-center font-mono font-black text-xl tracking-widest px-3 py-2 rounded-xl border-2 border-blue-300 bg-white text-blue-700 focus:border-blue-600 focus:outline-none shadow-inner"
                  />
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Modifique los 4 dígitos del PIN para actualizar el acceso táctil de este empleado.
                  </p>
                </div>
              </div>

              {/* Secciones autorizadas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-800">
                      Secciones / Segmentos Autorizados para Trabajar
                    </label>
                    <p className="text-[11px] text-slate-500">
                      {editForm.role === 'operator'
                        ? 'Active o desactive las secciones donde este operador puede registrar datos:'
                        : 'Supervisores y administradores tienen acceso a todas las secciones de planta.'}
                    </p>
                  </div>

                  {editForm.role === 'operator' && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm({ ...editForm, segments: [1, 2, 3, 4] })
                        }
                        className="text-blue-600 hover:underline"
                      >
                        Todas
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm({ ...editForm, segments: [1, 2] })
                        }
                        className="text-blue-600 hover:underline"
                      >
                        Cría + Engorde
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm({ ...editForm, segments: [3, 4] })
                        }
                        className="text-blue-600 hover:underline"
                      >
                        Lavado + Molienda
                      </button>
                    </div>
                  )}
                </div>

                {editForm.role === 'operator' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SECTION_INFO.map((sec) => {
                      const isSelected = editForm.segments.includes(sec.num);
                      return (
                        <button
                          key={sec.num}
                          type="button"
                          onClick={() => {
                            const has = editForm.segments.includes(sec.num);
                            const next = has
                              ? editForm.segments.filter((s) => s !== sec.num)
                              : [...editForm.segments, sec.num];
                            setEditForm({ ...editForm, segments: next.sort() });
                          }}
                          className={`p-3 rounded-2xl border text-left flex items-start justify-between gap-2 transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                              : 'border-slate-200 bg-white hover:bg-slate-50 opacity-75'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${sec.dotBg}`}
                              />
                              <span className="font-black text-xs text-slate-900">
                                {sec.name}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">
                              {sec.stages}
                            </p>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Habilitado para <b>todas las secciones (Segmentos 1, 2, 3 y 4)</b>.
                    </span>
                  </div>
                )}
              </div>

              {/* Estado Activo */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editForm.active}
                    onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Usuario activo (permite iniciar sesión con su PIN)
                  </span>
                </label>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmittingUser ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================================
          MODAL 3: CAMBIO RÁPIDO DE PIN
      ====================================================================== */}
      {quickPinUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Modificar PIN de Acceso</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {quickPinUser.full_name} ({quickPinUser.employee_code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickPinUser(null)}
                className="w-7 h-7 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {quickPinError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{quickPinError}</span>
                </div>
              )}

              <div className="space-y-1.5 text-center">
                <label className="block text-xs font-bold text-slate-700">
                  Nuevo PIN de 4 dígitos
                </label>
                <input
                  type="text"
                  maxLength={4}
                  autoFocus
                  value={quickPinValue}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setQuickPinValue(val);
                    setQuickPinError('');
                  }}
                  className="w-40 mx-auto text-center font-mono font-black text-2xl tracking-widest px-4 py-2.5 rounded-2xl border-2 border-blue-400 focus:border-blue-600 focus:outline-none shadow-sm text-blue-700 bg-blue-50/20"
                />
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setQuickPinValue(generateUniquePin(employees))}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generar PIN aleatorio</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickPinUser(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickPin}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/20"
                >
                  Actualizar PIN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
