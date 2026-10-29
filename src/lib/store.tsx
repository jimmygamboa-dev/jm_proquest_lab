'use client';

// =============================================================================
// JM PROQUEST V1 - CONTEXTO Y GESTIÓN DE ESTADO REACT
// =============================================================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AppState,
  Employee,
  PostureRecord,
  IncubationRecord,
  BoxTransferRecord,
  SowingRecord,
  HarvestRecord,
  CleaningRecord,
  WashingLoadRecord,
  WashingLotRecord,
  DryingRunRecord,
  MillingRunRecord,
  CorrectionRecord,
  PlantSettings,
  Role,
  SegmentNumber,
} from '../types';
import { INITIAL_EMPLOYEES, INITIAL_STATE } from './sample-data';
import {
  isSupabaseConfigured,
  supabase,
  rpcSavePosture,
  rpcSaveIncubation,
  rpcSaveTransfer,
  rpcSaveSowing,
  rpcSaveHarvest,
  rpcSaveCleaning,
  rpcSaveWashingLoad,
  rpcSaveDryingRun,
  rpcSaveMillingRun,
  rpcSaveCorrection,
} from './supabase';

const STORAGE_KEY = 'JM_PROQUEST_V1_STATE';
const SESSION_KEY = 'JM_PROQUEST_V1_SESSION';
const EMPLOYEES_KEY = 'JM_PROQUEST_V1_EMPLOYEES';

interface StoreContextType {
  state: AppState;
  currentEmployee: Employee | null;
  employees: Employee[];
  loginWithPin: (pin: string) => { success: boolean; error?: string };
  loginWithEmployeeCode: (code: string) => boolean;
  logout: () => void;
  addEmployee: (emp: {
    employee_code: string;
    full_name: string;
    pin: string;
    role: Role;
    segments: SegmentNumber[];
    active?: boolean;
  }) => Promise<{ success: boolean; error?: string; employee?: Employee }>;
  updateEmployee: (
    id: string,
    updates: {
      employee_code?: string;
      full_name?: string;
      pin?: string;
      role?: Role;
      segments?: SegmentNumber[];
      active?: boolean;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteEmployee: (id: string) => Promise<{ success: boolean; error?: string }>;
  resetEmployees: () => void;
  savePosture: (record: PostureRecord) => Promise<{ success: boolean; id: string }>;
  saveIncubation: (record: IncubationRecord) => Promise<{ success: boolean; id: string }>;
  saveTransfer: (record: BoxTransferRecord) => Promise<{ success: boolean; id: string }>;
  saveSowing: (record: SowingRecord) => Promise<{ success: boolean; id: string }>;
  saveHarvest: (record: HarvestRecord) => Promise<{ success: boolean; id: string }>;
  saveCleaning: (record: CleaningRecord) => Promise<{ success: boolean; id: string }>;
  saveWashingLoad: (record: WashingLoadRecord, isNewLot?: boolean) => Promise<{ success: boolean; id: string }>;
  saveDryingRun: (record: DryingRunRecord) => Promise<{ success: boolean; id: string }>;
  saveMillingRun: (record: MillingRunRecord) => Promise<{ success: boolean; id: string }>;
  saveCorrection: (
    recordId: string,
    stage: string,
    newData: any,
    reason: string
  ) => Promise<{ success: boolean }>;
  updateSettings: (newSettings: Partial<PlantSettings>) => void;
  exportBackupJson: () => void;
  exportSummaryCsv: () => void;
  importBackupJson: (jsonString: string) => boolean;
  resetToSampleData: () => void;
  refreshFromSupabase?: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carga inicial de localStorage
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        const emp = JSON.parse(savedSession);
        // Asegurar que segments siempre esté definido
        if (emp && !emp.segments && emp.segment) {
          emp.segments = [emp.segment];
        }
        setCurrentEmployee(emp);
      }

      const savedEmployees = localStorage.getItem(EMPLOYEES_KEY);
      if (savedEmployees) {
        const parsedEmp = JSON.parse(savedEmployees);
        if (Array.isArray(parsedEmp) && parsedEmp.length > 0) {
          setEmployees(parsedEmp);
        }
      }

      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setState((prev) => ({
          ...prev,
          ...parsed,
          settings: { ...prev.settings, ...(parsed.settings || {}) },
        }));
      }
    } catch (e) {
      console.warn('No se pudo cargar el estado previo, usando datos iniciales:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Persistencia automática en localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  }, [state, isLoaded]);

  // Persistencia de empleados en localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
    } catch (e) {
      console.error('Error guardando empleados en localStorage:', e);
    }
  }, [employees, isLoaded]);

  // Sincronización completa con Supabase (Empleados, Producción y Auditoría)
  const syncFromSupabase = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      // 1. Sincronizar empleados
      const { data: empData, error: empErr } = await supabase.from('employees').select('*');
      if (!empErr && empData && empData.length > 0) {
        const mapped: Employee[] = empData.map((d: any) => ({
          id: d.id,
          employee_code: d.employee_code,
          full_name: d.full_name,
          pin: d.pin,
          role: d.role,
          segment: d.segment || (d.segments && d.segments[0]) || null,
          segments: Array.isArray(d.segments) && d.segments.length > 0 ? d.segments : (d.segment ? [d.segment] : [1]),
          active: d.active !== false,
          created_at: d.created_at,
          updated_at: d.updated_at,
        }));
        setEmployees(mapped);
      }

      // 2. Sincronizar registros de producción de las 9 etapas
      const { data: prodData, error: prodErr } = await supabase
        .from('production_records')
        .select('*')
        .order('created_at', { ascending: true });

      if (!prodErr && prodData && prodData.length > 0) {
        setState((prev) => {
          const newPostures = [...prev.postures];
          const newIncubations = [...prev.incubations];
          const newTransfers = [...prev.transfers];
          const newSowings = [...prev.sowings];
          const newHarvests = [...prev.harvests];
          const newCleanings = [...prev.cleanings];
          const newWashingLoads = [...prev.washingLoads];
          const newDryingRuns = [...prev.dryingRuns];
          const newMillingRuns = [...prev.millingRuns];

          prodData.forEach((row: any) => {
            const p = row.payload || {};
            if (row.stage === 'posture') {
              const idx = newPostures.findIndex((x) => x.id === row.id);
              if (idx >= 0) newPostures[idx] = p; else newPostures.push(p);
            } else if (row.stage === 'incubation') {
              const idx = newIncubations.findIndex((x) => x.id === row.id);
              if (idx >= 0) newIncubations[idx] = p; else newIncubations.push(p);
            } else if (row.stage === 'transfer') {
              const idx = newTransfers.findIndex((x) => x.id === row.id);
              if (idx >= 0) newTransfers[idx] = p; else newTransfers.push(p);
            } else if (row.stage === 'sowing') {
              const idx = newSowings.findIndex((x) => x.id === row.id);
              if (idx >= 0) newSowings[idx] = p; else newSowings.push(p);
            } else if (row.stage === 'harvest') {
              const idx = newHarvests.findIndex((x) => x.id === row.id);
              if (idx >= 0) newHarvests[idx] = p; else newHarvests.push(p);
            } else if (row.stage === 'cleaning') {
              const idx = newCleanings.findIndex((x) => x.id === row.id);
              if (idx >= 0) newCleanings[idx] = p; else newCleanings.push(p);
            } else if (row.stage === 'washing_load') {
              const idx = newWashingLoads.findIndex((x) => x.id === row.id);
              if (idx >= 0) newWashingLoads[idx] = p; else newWashingLoads.push(p);
            } else if (row.stage === 'drying_run') {
              const idx = newDryingRuns.findIndex((x) => x.id === row.id);
              if (idx >= 0) newDryingRuns[idx] = p; else newDryingRuns.push(p);
            } else if (row.stage === 'milling_run') {
              const idx = newMillingRuns.findIndex((x) => x.id === row.id);
              if (idx >= 0) newMillingRuns[idx] = p; else newMillingRuns.push(p);
            }
          });

          return {
            ...prev,
            postures: newPostures,
            incubations: newIncubations,
            transfers: newTransfers,
            sowings: newSowings,
            harvests: newHarvests,
            cleanings: newCleanings,
            washingLoads: newWashingLoads,
            dryingRuns: newDryingRuns,
            millingRuns: newMillingRuns,
          };
        });
      }

      // 3. Sincronizar correcciones de supervisión
      const { data: corrData, error: corrErr } = await supabase
        .from('corrections')
        .select('*')
        .order('created_at', { ascending: false });

      if (!corrErr && corrData && corrData.length > 0) {
        setState((prev) => ({
          ...prev,
          corrections: corrData.map((c: any) => ({
            id: c.id,
            recordId: c.record_id,
            stage: c.stage,
            date: c.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
            supervisor: c.supervisor_code,
            reason: c.reason,
            oldData: c.old_payload,
            newData: c.new_payload,
            createdAt: c.created_at,
          })),
        }));
      }
    } catch (err) {
      console.warn('Error sincronizando con Supabase:', err);
    }
  };

  // Carga inicial y suscripción Realtime a Supabase
  useEffect(() => {
    if (!isLoaded || !isSupabaseConfigured || !supabase) return;
    let isCancelled = false;

    syncFromSupabase();

    // Suscripción Realtime a cambios en la tabla production_records
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'production_records' },
        () => {
          if (!isCancelled) {
            syncFromSupabase();
          }
        }
      )
      .subscribe();

    return () => {
      isCancelled = true;
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [isLoaded]);

  // Login por PIN numérico
  const loginWithPin = (pin: string) => {
    const found = employees.find((e) => e.pin === pin && e.active);
    if (!found) {
      return { success: false, error: 'PIN incorrecto o empleado inactivo.' };
    }
    const normalized: Employee = {
      ...found,
      segments:
        found.segments && found.segments.length > 0
          ? found.segments
          : found.segment
          ? [found.segment]
          : [1, 2, 3, 4],
    };
    setCurrentEmployee(normalized);
    localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    return { success: true };
  };

  // Selector directo de empleado (modo demostración / pruebas)
  const loginWithEmployeeCode = (code: string) => {
    const found = employees.find((e) => e.employee_code === code && e.active);
    if (!found) return false;
    const normalized: Employee = {
      ...found,
      segments:
        found.segments && found.segments.length > 0
          ? found.segments
          : found.segment
          ? [found.segment]
          : [1, 2, 3, 4],
    };
    setCurrentEmployee(normalized);
    localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    return true;
  };

  const logout = () => {
    setCurrentEmployee(null);
    localStorage.removeItem(SESSION_KEY);
  };

  // --- GESTIÓN DE PERSONAL / USUARIOS (ADMIN) ---

  const addEmployee = async (empData: {
    employee_code: string;
    full_name: string;
    pin: string;
    role: Role;
    segments: SegmentNumber[];
    active?: boolean;
  }): Promise<{ success: boolean; error?: string; employee?: Employee }> => {
    const code = empData.employee_code.trim().toUpperCase();
    const name = empData.full_name.trim();
    const pin = empData.pin.trim();
    const role = empData.role;
    const active = empData.active !== undefined ? empData.active : true;

    if (!name) {
      return { success: false, error: 'El nombre completo es requerido.' };
    }
    if (!code) {
      return { success: false, error: 'El código de empleado es requerido.' };
    }
    if (!/^\d{4}$/.test(pin)) {
      return { success: false, error: 'El PIN debe ser de 4 dígitos numéricos.' };
    }

    // Verificar código único
    if (employees.some((e) => e.employee_code.toUpperCase() === code)) {
      return { success: false, error: `Ya existe un usuario con el código ${code}.` };
    }

    // Verificar PIN único entre empleados activos
    if (active && employees.some((e) => e.pin === pin && e.active)) {
      const existing = employees.find((e) => e.pin === pin && e.active);
      return {
        success: false,
        error: `El PIN ${pin} ya está asignado a ${existing?.full_name}. Ingrese un PIN diferente.`,
      };
    }

    let finalSegments = empData.segments;
    if (role === 'operator') {
      if (!finalSegments || finalSegments.length === 0) {
        return {
          success: false,
          error: 'Debe seleccionar al menos una sección / segmento de trabajo para el operador.',
        };
      }
    } else {
      if (!finalSegments || finalSegments.length === 0) {
        finalSegments = [1, 2, 3, 4];
      }
    }

    // Ordenar segmentos
    finalSegments = Array.from(new Set(finalSegments)).sort() as SegmentNumber[];

    const newEmployee: Employee = {
      id: 'emp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      employee_code: code,
      full_name: name,
      pin,
      role,
      segment: finalSegments[0] || null,
      segments: finalSegments,
      active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setEmployees((prev) => [...prev, newEmployee]);

    // Persistencia opcional en Supabase si configurado
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('employees').insert({
          employee_code: code,
          full_name: name,
          pin,
          role,
          segment: newEmployee.segment,
          segments: newEmployee.segments,
          active,
        });
      } catch (err) {
        console.warn('Error sincronizando nuevo usuario con Supabase:', err);
      }
    }

    return { success: true, employee: newEmployee };
  };

  const updateEmployee = async (
    id: string,
    updates: {
      employee_code?: string;
      full_name?: string;
      pin?: string;
      role?: Role;
      segments?: SegmentNumber[];
      active?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    const empIdx = employees.findIndex((e) => e.id === id);
    if (empIdx === -1) {
      return { success: false, error: 'Empleado no encontrado.' };
    }

    const current = employees[empIdx];
    const nextCode = updates.employee_code !== undefined ? updates.employee_code.trim().toUpperCase() : current.employee_code;
    const nextName = updates.full_name !== undefined ? updates.full_name.trim() : current.full_name;
    const nextPin = updates.pin !== undefined ? updates.pin.trim() : current.pin;
    const nextRole = updates.role !== undefined ? updates.role : current.role;
    const nextActive = updates.active !== undefined ? updates.active : current.active;

    if (!nextName) {
      return { success: false, error: 'El nombre completo no puede quedar vacío.' };
    }
    if (!nextCode) {
      return { success: false, error: 'El código de empleado no puede quedar vacío.' };
    }
    if (!/^\d{4}$/.test(nextPin)) {
      return { success: false, error: 'El PIN debe ser exactamente de 4 dígitos numéricos.' };
    }

    // Verificar código único
    if (employees.some((e) => e.id !== id && e.employee_code.toUpperCase() === nextCode)) {
      return { success: false, error: `Ya existe otro empleado con el código ${nextCode}.` };
    }

    // Verificar PIN único si activo
    if (nextActive && employees.some((e) => e.id !== id && e.pin === nextPin && e.active)) {
      const existing = employees.find((e) => e.id !== id && e.pin === nextPin && e.active);
      return {
        success: false,
        error: `El PIN ${nextPin} ya está asignado a ${existing?.full_name}. Seleccione un PIN único.`,
      };
    }

    let nextSegments = updates.segments !== undefined ? updates.segments : (current.segments || (current.segment ? [current.segment] : [1]));
    if (nextRole === 'operator') {
      if (!nextSegments || nextSegments.length === 0) {
        return {
          success: false,
          error: 'Debe asignar al menos una sección / segmento de trabajo para el operador.',
        };
      }
    } else {
      if (!nextSegments || nextSegments.length === 0) {
        nextSegments = [1, 2, 3, 4];
      }
    }

    nextSegments = Array.from(new Set(nextSegments)).sort() as SegmentNumber[];

    const updatedEmp: Employee = {
      ...current,
      employee_code: nextCode,
      full_name: nextName,
      pin: nextPin,
      role: nextRole,
      segments: nextSegments,
      segment: nextSegments[0] || null,
      active: nextActive,
      updated_at: new Date().toISOString(),
    };

    setEmployees((prev) => {
      const copy = [...prev];
      copy[empIdx] = updatedEmp;
      return copy;
    });

    // Actualizar sesión si es el usuario actual
    if (currentEmployee?.id === id) {
      setCurrentEmployee(updatedEmp);
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedEmp));
      } catch (e) {
        console.warn('Error actualizando sesión activa:', e);
      }
    }

    // Sincronizar en Supabase si configurado
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('employees')
          .update({
            employee_code: nextCode,
            full_name: nextName,
            pin: nextPin,
            role: nextRole,
            segment: updatedEmp.segment,
            segments: updatedEmp.segments,
            active: nextActive,
            updated_at: new Date().toISOString(),
          })
          .eq('employee_code', current.employee_code);
      } catch (err) {
        console.warn('Error actualizando usuario en Supabase:', err);
      }
    }

    return { success: true };
  };

  const deleteEmployee = async (id: string): Promise<{ success: boolean; error?: string }> => {
    return updateEmployee(id, { active: false });
  };

  const resetEmployees = () => {
    setEmployees(INITIAL_EMPLOYEES);
    try {
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(INITIAL_EMPLOYEES));
    } catch (e) {
      console.warn('Error restableciendo empleados:', e);
    }
  };

  // --- GUARDADO DE ETAPAS ---

  const savePosture = async (record: PostureRecord) => {
    if (isSupabaseConfigured && currentEmployee) {
      await rpcSavePosture(record, currentEmployee.employee_code);
    }
    setState((prev) => {
      const existingIdx = prev.postures.findIndex((p) => p.id === record.id);
      const updated = [...prev.postures];
      if (existingIdx >= 0) {
        updated[existingIdx] = record;
      } else {
        updated.push(record);
      }
      return { ...prev, postures: updated };
    });
    return { success: true, id: record.id };
  };

  const saveIncubation = async (record: IncubationRecord) => {
    if (isSupabaseConfigured && currentEmployee) {
      await rpcSaveIncubation(record, currentEmployee.employee_code);
    }
    setState((prev) => {
      const existingIdx = prev.incubations.findIndex((i) => i.id === record.id);
      const updated = [...prev.incubations];
      if (existingIdx >= 0) {
        updated[existingIdx] = record;
      } else {
        updated.push(record);
      }
      return { ...prev, incubations: updated };
    });
    return { success: true, id: record.id };
  };

  const saveTransfer = async (record: BoxTransferRecord) => {
    if (isSupabaseConfigured && currentEmployee) {
      await rpcSaveTransfer(record, currentEmployee.employee_code);
    }
    setState((prev) => {
      const existingIdx = prev.transfers.findIndex((t) => t.id === record.id);
      const updated = [...prev.transfers];
      if (existingIdx >= 0) {
        updated[existingIdx] = record;
      } else {
        updated.push(record);
      }
      return { ...prev, transfers: updated };
    });
    return { success: true, id: record.id };
  };

  const saveSowing = async (record: SowingRecord) => {
    if (isSupabaseConfigured && currentEmployee) {
      await rpcSaveSowing(record, currentEmployee.employee_code);
    }
    setState((prev) => {
      const existingIdx = prev.sowings.findIndex((s) => s.id === record.id);
      const updated = [...prev.sowings];
      if (existingIdx >= 0) {
        updated[existingIdx] = record;
      } else {
        updated.push(record);
      }
      return { ...prev, sowings: updated };
    });
    return { success: true, id: record.id };
  };

  const saveHarvest = async (record: HarvestRecord) => {
    if (isSupabaseConfigured && currentEmployee) {
      await rpcSaveHarvest(record, currentEmployee.employee_code);
    }
    setState((prev) => {
      const existingIdx = prev.harvests.findIndex((h) => h.id === record.id);
      const updated = [...prev.harvests];
      if (existingIdx >= 0) {
        updated[existingIdx] = record;
      } else {
        updated.push(record);
      }
      return { ...prev, harvests: updated };
    });
    return { success: true, id: record.id };
  };

  const saveCleaning = async (record: CleaningRecord) => {
    if (isSupabaseConfigured && currentEmployee) {
      await rpcSaveCleaning(record, currentEmployee.employee_code);
    }
    setState((prev) => {
      const existingIdx = prev.cleanings.findIndex((c) => c.id === record.id);
      const updated = [...prev.cleanings];
      if (existingIdx >= 0) {
        updated[existingIdx] = record;
      } else {
        updated.push(record);
      }
      return { ...prev, cleanings: updated };
    });
    return { success: true, id: record.id };
  };

  const saveWashingLoad = async (record: WashingLoadRecord, isNewLot = false) => {
    if (isSupabaseConfigured && currentEmployee) {
      await rpcSaveWashingLoad(record, currentEmployee.employee_code);
    }
    setState((prev) => {
      const updatedLoads = [...prev.washingLoads];
      const idx = updatedLoads.findIndex((l) => l.id === record.id);
      if (idx >= 0) {
        updatedLoads[idx] = record;
      } else {
        updatedLoads.push(record);
      }

      let updatedLots = [...prev.washingLots];
      if (isNewLot && !updatedLots.some((l) => l.id === record.lotId)) {
        updatedLots.push({
          id: record.lotId,
          status: 'Acumulando cargas',
          createdAt: new Date().toISOString(),
        });
      }

      return {
        ...prev,
        washingLoads: updatedLoads,
        washingLots: updatedLots,
      };
    });
    return { success: true, id: record.id };
  };

  const saveDryingRun = async (record: DryingRunRecord) => {
    if (isSupabaseConfigured && currentEmployee) {
      await rpcSaveDryingRun(record, currentEmployee.employee_code);
    }
    setState((prev) => {
      const existingIdx = prev.dryingRuns.findIndex((d) => d.id === record.id);
      const updated = [...prev.dryingRuns];
      if (existingIdx >= 0) {
        updated[existingIdx] = record;
      } else {
        updated.push(record);
      }

      // Marcar lote de lavado como 'Procesado'
      const updatedLots = prev.washingLots.map((l) =>
        l.id === record.lotId ? { ...l, status: 'Procesado' as const } : l
      );

      return {
        ...prev,
        dryingRuns: updated,
        washingLots: updatedLots,
      };
    });
    return { success: true, id: record.id };
  };

  const saveMillingRun = async (record: MillingRunRecord) => {
    if (isSupabaseConfigured && currentEmployee) {
      await rpcSaveMillingRun(record, currentEmployee.employee_code);
    }
    setState((prev) => {
      const existingIdx = prev.millingRuns.findIndex((m) => m.id === record.id);
      const updated = [...prev.millingRuns];
      if (existingIdx >= 0) {
        updated[existingIdx] = record;
      } else {
        updated.push(record);
      }
      return { ...prev, millingRuns: updated };
    });
    return { success: true, id: record.id };
  };

  const saveCorrection = async (
    recordId: string,
    stage: string,
    newData: any,
    reason: string
  ) => {
    const supervisorCode = currentEmployee?.employee_code || 'SUPERVISOR';
    if (isSupabaseConfigured) {
      await rpcSaveCorrection(recordId, stage, newData, reason, supervisorCode);
    }

    const newCorrection: CorrectionRecord = {
      id: `CORR-${Date.now()}`,
      recordId,
      stage,
      date: new Date().toISOString().slice(0, 10),
      supervisor: supervisorCode,
      reason,
      oldData: {},
      newData,
      createdAt: new Date().toISOString(),
    };

    setState((prev) => {
      const updatedCorrections = [newCorrection, ...prev.corrections];

      // Actualizar el registro correspondiente en el estado según etapa
      const next = { ...prev, corrections: updatedCorrections };
      if (stage === 'postures') {
        next.postures = prev.postures.map((r) => (r.id === recordId ? { ...r, ...newData } : r));
      } else if (stage === 'incubations') {
        next.incubations = prev.incubations.map((r) => (r.id === recordId ? { ...r, ...newData } : r));
      } else if (stage === 'transfers') {
        next.transfers = prev.transfers.map((r) => (r.id === recordId ? { ...r, ...newData } : r));
      } else if (stage === 'sowings') {
        next.sowings = prev.sowings.map((r) => (r.id === recordId ? { ...r, ...newData } : r));
      } else if (stage === 'harvests') {
        next.harvests = prev.harvests.map((r) => (r.id === recordId ? { ...r, ...newData } : r));
      } else if (stage === 'cleanings') {
        next.cleanings = prev.cleanings.map((r) => (r.id === recordId ? { ...r, ...newData } : r));
      } else if (stage === 'dryingRuns') {
        next.dryingRuns = prev.dryingRuns.map((r) => (r.id === recordId ? { ...r, ...newData } : r));
      } else if (stage === 'millingRuns') {
        next.millingRuns = prev.millingRuns.map((r) => (r.id === recordId ? { ...r, ...newData } : r));
      }
      return next;
    });

    return { success: true };
  };

  const updateSettings = (newSettings: Partial<PlantSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings },
    }));
  };

  // --- EXPORTACIÓN E IMPORTACIÓN ---

  const exportBackupJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `JM_PROQUEST_BACKUP_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportSummaryCsv = () => {
    const rows = [
      ['Etapa', 'ID', 'Fecha', 'Empleado', 'Detalle Principal', 'Peso / Cantidad'],
      ...state.postures.map((p) => ['1 · Postura', p.id, p.date, p.employee, `Cajón: ${p.cage}, Ponederos: ${p.nests}`, `${p.projection} ninfas`]),
      ...state.incubations.map((i) => ['2 · Incubación', i.id, i.actualBirth || i.entryDate, i.employee, `Incubadora: ${i.incubator}, Modo: ${i.transferMode}`, `${i.newbornCount || 0} nacidas`]),
      ...state.transfers.map((t) => ['3 · Salida Cajas', t.id, t.date, t.employee, `Caja: ${t.boxCode}`, `${t.weight} g (${t.nymphs} ninfas)`]),
      ...state.sowings.map((s) => ['4 · Siembra', s.id, s.date, s.employee, `Cajón: ${s.cage}, Ciclo: ${s.cycleId}`, `${s.weight} g`]),
      ...state.harvests.map((h) => ['5 · Cosecha', h.id, h.date, h.employee, `Ciclo: ${h.cycleId}, ${h.bags.length} bolsas`, `${h.bags.reduce((acc, b) => acc + b.weightKg, 0).toFixed(2)} kg vivos`]),
      ...state.cleanings.map((c) => ['6 · Preparación', c.id, c.cleanDate, c.employee, `Ciclo: ${c.cycleId}, Reparación: ${c.repairRequired}`, '—']),
      ...state.washingLoads.map((w) => ['7 · Lavado', w.id, w.dateTime.slice(0, 10), w.employee, `Lote: ${w.lotId}, Desinfectante: ${w.disinfectant}`, `${w.weightKg} kg`]),
      ...state.dryingRuns.map((d) => ['8 · Deshidratación', d.id, d.startAt.slice(0, 10), d.employee, `Lote: ${d.lotId}, Temp: ${d.temp}°C`, `${d.dryWeightKg} kg secos`]),
      ...state.millingRuns.map((m) => ['9 · Molienda', m.id, m.dateTime.slice(0, 10), m.employee, `Método: ${m.method}, Humedad: ${m.humidity}%`, `${m.packedKg} kg empacados`]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `JM_PROQUEST_RESUMEN_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importBackupJson = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object') {
        setState((prev) => ({
          ...prev,
          ...parsed,
          settings: { ...prev.settings, ...(parsed.settings || {}) },
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error importando JSON:', e);
      return false;
    }
  };

  const resetToSampleData = () => {
    setState(INITIAL_STATE);
  };

  return (
    <StoreContext.Provider
      value={{
        state,
        currentEmployee,
        employees,
        loginWithPin,
        loginWithEmployeeCode,
        logout,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        resetEmployees,
        savePosture,
        saveIncubation,
        saveTransfer,
        saveSowing,
        saveHarvest,
        saveCleaning,
        saveWashingLoad,
        saveDryingRun,
        saveMillingRun,
        saveCorrection,
        updateSettings,
        exportBackupJson,
        exportSummaryCsv,
        importBackupJson,
        resetToSampleData,
        refreshFromSupabase: syncFromSupabase,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore debe usarse dentro de un StoreProvider');
  }
  return context;
}
