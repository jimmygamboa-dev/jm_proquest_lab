// =============================================================================
// JM PROQUEST V1 - CÁLCULOS TÉCNICOS, ALGORITMOS Y FÓRMULAS AUDITADAS
// =============================================================================

import {
  AGE_GRILLERS,
  BASELINE,
  MORTALITY_MIN,
  MORTALITY_MAX,
  INCUBATION_DAYS,
} from './constants';
import {
  AppState,
  PostureRecord,
  IncubationRecord,
  BoxTransferRecord,
  HarvestRecord,
  DryingRunRecord,
  MillingRunRecord,
  QualityAlert,
  PlantSettings,
} from '../types';

// -----------------------------------------------------------------------------
// FORMATOS NUMÉRICOS
// -----------------------------------------------------------------------------
export function fmt(num: number | null | undefined): string {
  if (num === null || num === undefined || !Number.isFinite(Number(num))) return '—';
  return Number(num).toLocaleString('es-CR');
}

export function fmtDec(num: number | null | undefined, decimals = 2): string {
  if (num === null || num === undefined || !Number.isFinite(Number(num))) return '—';
  return Number(num).toLocaleString('es-CR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// -----------------------------------------------------------------------------
// FECHAS Y GENERACIÓN DE CORRELATIVOS (IDs)
// -----------------------------------------------------------------------------
export function yearOf(dateStr?: string): string {
  if (dateStr && dateStr.length >= 4) return dateStr.slice(0, 4);
  return String(new Date().getFullYear());
}

export function localDatePlus(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + Number(days || 0));
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

export function dateDays(fromStr?: string, toStr?: string): number | null {
  if (!fromStr || !toStr) return null;
  const a = new Date(fromStr + 'T12:00:00');
  const b = new Date(toStr + 'T12:00:00');
  const diff = Math.floor((b.getTime() - a.getTime()) / 86400000);
  return diff < 0 ? null : Math.max(1, diff + 1);
}

export function nextId(
  prefix: string,
  dateStr: string,
  existingRecords: Array<{ id: string }>
): string {
  const y = Number(yearOf(dateStr));
  let max = (BASELINE[prefix] && BASELINE[prefix][y]) || 0;
  const re = new RegExp('^' + prefix + '-' + y + '-(\\d+)$');
  existingRecords.forEach((r) => {
    const m = String(r.id || '').match(re);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `${prefix}-${y}-${String(max + 1).padStart(4, '0')}`;
}

// -----------------------------------------------------------------------------
// SEGMENTO 1: POSTURA, INCUBACIÓN Y CAJAS
// -----------------------------------------------------------------------------
export function eggCeiling(
  posture?: PostureRecord | null,
  settings?: PlantSettings
): number {
  if (!posture) return 0;
  const perNest =
    Number(posture.eggsPerNestAtRecord) ||
    Number(settings?.eggsPerNest) ||
    60000;
  return Math.max(0, Number(posture.nests || 0)) * perNest;
}

export function nymphsFor(weightGrams: number, ageDays: number): number | null {
  const rate = AGE_GRILLERS[Number(ageDays)];
  if (!rate || !Number.isFinite(Number(weightGrams)) || weightGrams <= 0) {
    return null;
  }
  return Math.round(Number(weightGrams) * rate);
}

export function assignedCount(
  incubationId: string,
  transfers: BoxTransferRecord[],
  exceptId?: string | null
): number {
  return transfers
    .filter((t) => t.incubationId === incubationId && t.id !== exceptId)
    .reduce((sum, t) => sum + Number(t.nymphs || 0), 0);
}

export function lowBirthRatio(
  inc: IncubationRecord,
  posture?: PostureRecord | null,
  settings?: PlantSettings
): boolean {
  if (!inc || !posture) return false;
  const cap = eggCeiling(posture, settings);
  const count = Number(inc.newbornCount || 0);
  return cap > 0 && count > 0 && count < cap * 0.4;
}

// -----------------------------------------------------------------------------
// SEGMENTO 2 & 3: COSECHA, HORAS CONGELADAS Y TRAZABILIDAD
// -----------------------------------------------------------------------------
export function hoursFrozen(frozenAt?: string, compareDateTime?: string): number | null {
  if (!frozenAt || !compareDateTime) return null;
  const ms = Date.parse(compareDateTime) - Date.parse(frozenAt);
  const hours = ms / 3600000;
  return Number.isFinite(hours) && hours >= 0 ? hours : null;
}

export function harvestMetrics(harvest: HarvestRecord, sowings: AppState['sowings']) {
  const cycleSows = sowings.filter((s) => s.cycleId === harvest.cycleId && s.date);
  const sowDates = cycleSows.map((s) => s.date).sort();
  const firstSow = sowDates[0] || '';
  const lastSow = sowDates[sowDates.length - 1] || '';

  const cageDays = firstSow && harvest.date ? dateDays(firstSow, harvest.date) : null;
  return {
    cageDays,
    firstSow,
    lastSow,
  };
}

// -----------------------------------------------------------------------------
// SEGMENTO 4: DESHIDRATACIÓN Y MOLIENDA
// -----------------------------------------------------------------------------
export function dryingLotTotals(lotId: string, washingLoads: AppState['washingLoads']) {
  const loads = washingLoads.filter((l) => l.lotId === lotId);
  const wetKg = loads.reduce((sum, l) => sum + Number(l.weightKg || 0), 0);
  const bags = loads.reduce((sum, l) => sum + (l.bags || []).length, 0);
  return {
    loads,
    wetKg,
    bags,
  };
}

export function dryRunLiveKg(
  dryRun?: DryingRunRecord | null,
  washingLoads: AppState['washingLoads'] = []
): number {
  if (!dryRun) return 0;
  const totals = dryingLotTotals(dryRun.lotId, washingLoads);
  return totals.wetKg;
}

export function millingTrace(
  run: MillingRunRecord,
  dryingRuns: DryingRunRecord[],
  washingLoads: AppState['washingLoads']
) {
  const details = (run.inputs || []).map((input) => {
    const dry = dryingRuns.find((item) => item.id === input.dryingRunId);
    const dryKg = Number(dry && dry.dryWeightKg ? dry.dryWeightKg : 0);
    const usedKg = Number(input.usedKg || 0);
    const liveKgTotal = dryRunLiveKg(dry, washingLoads);
    const attributedLiveKg = dryKg > 0 ? (liveKgTotal * usedKg) / dryKg : 0;
    return {
      dryingRunId: input.dryingRunId,
      usedKg,
      liveKg: attributedLiveKg,
    };
  });

  const totalLiveKg = details.reduce((sum, item) => sum + item.liveKg, 0);
  return {
    liveKg: totalLiveKg,
    details,
  };
}

// -----------------------------------------------------------------------------
// ALERTAS DE CALIDAD PRIORITARIAS (ADMIN / MONITOR)
// -----------------------------------------------------------------------------
export function getQualityAlerts(state: AppState): QualityAlert[] {
  const alerts: QualityAlert[] = [];

  // 1. Alertas de Incubación y Postura
  state.incubations.forEach((inc) => {
    if (!inc.actualBirth) return;
    const posture = state.postures.find((p) => p.id === inc.postureId);
    const cap = eggCeiling(posture, state.settings);
    const assigned = assignedCount(inc.id, state.transfers);
    const born = Number(inc.newbornCount || 0);

    // Exceso de ninfas
    if (cap > 0 && born > cap) {
      alerts.push({
        id: `excess-${inc.id}`,
        level: 'critical',
        category: 'excess_nymphs',
        stage: 'Etapa 2 · Incubación',
        title: 'Exceso de ninfas sobre máximo teórico',
        message: `${inc.id}: Ninfas estimadas (${fmt(born)}) superan el máximo teórico de ${fmt(cap)} huevos.`,
        referenceId: inc.id,
      });
    }

    // Inconsistencia: traslados a cajas superan lo nacido
    if (assigned > born && born > 0) {
      alerts.push({
        id: `inconsistent-${inc.id}`,
        level: 'critical',
        category: 'inconsistent_transfer',
        stage: 'Etapa 3 · Salida a cajas',
        title: 'Asignaciones superan ninfas nacidas',
        message: `${inc.id}: Traslados registrados (${fmt(assigned)}) superan lo nacido estimado (${fmt(born)}).`,
        referenceId: inc.id,
      });
    }

    // Bajo nacimiento (< 40%)
    if (lowBirthRatio(inc, posture, state.settings) && !inc.birthAlertReviewed) {
      alerts.push({
        id: `lowbirth-${inc.id}`,
        level: 'warn',
        category: 'low_birth',
        stage: 'Etapa 2 · Incubación',
        title: 'Bajo nacimiento (<40% del máximo)',
        message: `${inc.id}: Nacimiento inferior al 40% del máximo teórico. Revise ponederos, peso y mortalidad.`,
        referenceId: inc.id,
      });
    }

    // Mosquitos
    if (!inc.mosquitoLevel) {
      alerts.push({
        id: `mosquito-missing-${inc.id}`,
        level: 'warn',
        category: 'mosquito',
        stage: 'Etapa 2 · Incubación',
        title: 'Registro de mosquitos pendiente',
        message: `${inc.id}: Falta registrar si se observaron mosquitos en la incubadora.`,
        referenceId: inc.id,
      });
    } else if (inc.mosquitoLevel !== 'No observados' && !inc.mosquitoResolved) {
      alerts.push({
        id: `mosquito-${inc.id}`,
        level: inc.mosquitoLevel === 'Muchos' ? 'critical' : 'warn',
        category: 'mosquito',
        stage: 'Etapa 2 · Incubación',
        title: `Presencia de mosquitos (${inc.mosquitoLevel})`,
        message: `${inc.id}: Presencia de mosquitos reportada. Revise medidas de control e higiene.`,
        referenceId: inc.id,
      });
    }
  });

  // 2. Alertas de Congelamiento (> 168 horas sin lavar)
  const now = new Date().toISOString();
  const washedBagKeys = new Set(
    state.washingLoads.flatMap((l) => (l.bags || []).map((b) => b.key))
  );

  state.harvests.forEach((harvest) => {
    (harvest.bags || []).forEach((bag) => {
      const bagKey = `${harvest.id}-${bag.bagId}`;
      if (!washedBagKeys.has(bagKey)) {
        const hours = hoursFrozen(bag.frozenAt, now);
        if (hours !== null && hours >= 168) {
          alerts.push({
            id: `freezer-${bagKey}`,
            level: 'warn',
            category: 'freezer_overdue',
            stage: 'Etapa 5 / 7 · Congelador',
            title: 'Bolsa congelada supera 168 horas',
            message: `Bolsa ${bag.bagId} en ${bag.freezer} lleva ${fmtDec(hours, 1)} h acumuladas sin lavado.`,
            referenceId: bag.bagId,
          });
        }
      }
    });
  });

  return alerts;
}

// -----------------------------------------------------------------------------
// KPIS Y RESUMEN OPERATIVO COMPLETO
// -----------------------------------------------------------------------------
export function calculateKPIs(state: AppState) {
  const harvests = state.harvests || [];
  const loads = state.washingLoads || [];
  const drying = state.dryingRuns || [];
  const milling = state.millingRuns || [];

  // Totales de peso
  const liveHarvestedKg = harvests.reduce((total, h) => {
    return total + (h.bags || []).reduce((sum, b) => sum + Number(b.weightKg || 0), 0);
  }, 0);

  const washedKg = loads.reduce((total, l) => total + Number(l.weightKg || 0), 0);

  const dryingInputKg = drying.reduce((total, row) => {
    return total + Number(dryingLotTotals(row.lotId, loads).wetKg || 0);
  }, 0);

  const dryKg = drying.reduce((total, r) => total + Number(r.dryWeightKg || 0), 0);
  const dryLossKg = Math.max(0, dryingInputKg - dryKg);

  const dryUsedKg = milling.reduce((total, r) => total + Number(r.dryUsedKg || 0), 0);
  const flourKg = milling.reduce((total, r) => total + Number(r.flourKg || 0), 0);
  const packedKg = milling.reduce((total, r) => total + Number(r.packedKg || 0), 0);
  const millingLossKg = Math.max(0, dryUsedKg - flourKg);
  const looseFlourPendingKg = Math.max(0, flourKg - packedKg);

  // Rendimientos porcentuales
  const dehydrationYieldPct =
    dryingInputKg > 0 ? (dryKg / dryingInputKg) * 100 : null;

  const millingYieldPct =
    dryUsedKg > 0 ? (flourKg / dryUsedKg) * 100 : null;

  // Rendimiento vivo a empaque trazado
  const traceLiveKg = milling.reduce((sum, run) => {
    return sum + millingTrace(run, drying, loads).liveKg;
  }, 0);

  const liveToPackYieldPct =
    traceLiveKg > 0 ? (packedKg / traceLiveKg) * 100 : null;

  return {
    liveHarvestedKg,
    washedKg,
    dryingInputKg,
    dryKg,
    dryLossKg,
    dryUsedKg,
    flourKg,
    packedKg,
    millingLossKg,
    looseFlourPendingKg,
    dehydrationYieldPct,
    millingYieldPct,
    traceLiveKg,
    liveToPackYieldPct,
  };
}
