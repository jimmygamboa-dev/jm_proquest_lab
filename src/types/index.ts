// =============================================================================
// JM PROQUEST V1 - TIPOS Y MODELOS DE DATOS
// =============================================================================

export type Role = 'operator' | 'supervisor' | 'admin';
export type SegmentNumber = 1 | 2 | 3 | 4;

export interface Employee {
  id: string;
  employee_code: string; // 'E-01'..'E-25'
  full_name: string;
  pin: string;
  role: Role;
  segment?: SegmentNumber | null; // Compatibilidad hacia atrás (segmento principal)
  segments?: SegmentNumber[];     // Lista de secciones / segmentos a los que puede trabajar
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export function getEmployeeSegments(emp?: Employee | null): SegmentNumber[] {
  if (!emp) return [1];
  if (emp.role === 'admin' || emp.role === 'supervisor') {
    return [1, 2, 3, 4];
  }
  if (emp.segments && emp.segments.length > 0) {
    return emp.segments;
  }
  if (emp.segment) {
    return [emp.segment];
  }
  return [1];
}

export interface PlantSettings {
  eggsPerNest: number;        // default 60000
  processTargetMinKg: number; // default 90
  processTargetMaxKg: number; // default 150
  bagCapacityKg: number;      // default 9
}

// -----------------------------------------------------------------------------
// ETAPA 1 · POSTURA (SEGMENTO 1)
// -----------------------------------------------------------------------------
export interface PostureRecord {
  id: string;                 // P-YYYY-XXXX
  date: string;               // YYYY-MM-DD
  employee: string;           // 'E-01'
  cage: string;               // 'CE-001'
  nests: number;              // N.º de ponederos
  projection: number;         // Proyección de ninfas
  days: number;               // Días con ponederos
  removalDate: string;        // Fecha retiro de ponederos
  projectedCage?: string;     // 'CE-002'
  eggsPerNestAtRecord: number;
  eggCeiling: number;
  createdAt?: string;
}

// -----------------------------------------------------------------------------
// ETAPA 2 · INCUBACIÓN (SEGMENTO 1)
// -----------------------------------------------------------------------------
export interface IncubationRecord {
  id: string;                 // I-YYYY-XXXX
  postureId: string;
  incubator: string;          // 'INC-001'
  entryDate: string;
  expectedBirth: string;
  actualBirth?: string;
  temp?: number;              // °C
  humidity?: number;          // %
  newbornWeight?: number;     // g
  ageWeighed?: number;        // 1..21 días
  newbornCount?: number;      // Ninfas estimadas
  transferMode?: 'Caja de 60 L' | 'Directo a cajón';
  employee: string;
  mosquitoLevel?: 'No observados' | 'Algunos' | 'Muchos';
  mosquitoAction?: string;
  mosquitoResolved?: boolean;
  birthAlertReviewed?: boolean;
  boxDistributionClosed?: boolean;
  createdAt?: string;
}

// -----------------------------------------------------------------------------
// ETAPA 3 · TRASLADO A CAJAS (SEGMENTO 1)
// -----------------------------------------------------------------------------
export interface BoxTransferRecord {
  id: string;                 // CN-YYYY-XXXX
  incubationId: string;
  boxCode: string;            // 'CJ-001'
  date: string;
  weight: number;             // g
  age: number;                // días
  nymphs: number;             // Ninfas estimadas
  employee: string;
  createdAt?: string;
}

// -----------------------------------------------------------------------------
// ETAPA 4 · SIEMBRA EN CAJONES (SEGMENTO 2)
// -----------------------------------------------------------------------------
export interface SowingRecord {
  id: string;                 // SOW-YYYY-XXXX
  sourceType: 'transfer' | 'direct';
  sourceId: string;           // Box transfer ID or incubation ID
  cage: string;               // 'CE-001'
  cycleId: string;            // 'C-CE001-001'
  date: string;
  weight: number;             // g
  nymphs: number;
  employee: string;
  biologicalAge: number;
  createdAt?: string;
}

// -----------------------------------------------------------------------------
// ETAPA 5 · COSECHA Y CONGELAMIENTO (SEGMENTO 2)
// -----------------------------------------------------------------------------
export interface HarvestBag {
  bagId: string;              // CO-YYYY-XXXX-B01
  weightKg: number;
  frozenAt: string;           // ISO datetime
  freezer: string;            // 'Congelador 1'
}

export interface HarvestRecord {
  id: string;                 // CO-YYYY-XXXX
  cycleId: string;
  cage: string;
  date: string;
  projectedDays: number;      // default 45
  feedKg: number;
  frassKg: number;
  employee: string;
  bags: HarvestBag[];
  createdAt?: string;
}

// -----------------------------------------------------------------------------
// ETAPA 6 · LIMPIEZA Y PREPARACIÓN (SEGMENTO 2)
// -----------------------------------------------------------------------------
export interface CleaningRecord {
  id: string;                 // LP-YYYY-XXXX
  cycleId: string;
  cleanDate: string;
  assembleDate?: string;
  repairRequired: 'No' | 'Sí';
  repairDate?: string;
  employee: string;
  createdAt?: string;
}

// -----------------------------------------------------------------------------
// ETAPA 7 · LAVADO, CENTRIFUGADO Y DESINFECCIÓN (SEGMENTO 3)
// -----------------------------------------------------------------------------
export interface WashingBagItem {
  key: string;
  bagId: string;
  cycleId: string;
  weightKg: number;
  frozenAt: string;
  freezer: string;
}

export interface WashingLoadRecord {
  id: string;                 // LV-YYYY-XXXX
  lotId: string;              // LP-YYYY-XXXX
  dateTime: string;
  employee: string;
  weightKg: number;
  bags: WashingBagItem[];
  disinfectant: string;
  concentration: string;
  checks: {
    dirty: boolean;
    intermediate: boolean;
    clean: boolean;
  };
  createdAt?: string;
}

export interface WashingLotRecord {
  id: string;                 // LP-YYYY-XXXX
  status: 'Acumulando cargas' | 'Listo para deshidratar' | 'Procesado';
  createdAt: string;
}

// -----------------------------------------------------------------------------
// ETAPA 8 · DESHIDRATACIÓN (SEGMENTO 4)
// -----------------------------------------------------------------------------
export interface DryingRunRecord {
  id: string;                 // DH-YYYY-XXXX
  lotId: string;
  startAt: string;
  endAt: string;
  temp: number;               // °C
  dryWeightKg: number;
  employee: string;
  notes?: string;
  createdAt?: string;
}

// -----------------------------------------------------------------------------
// ETAPA 9 · MOLIENDA Y EMPAQUE (SEGMENTO 4)
// -----------------------------------------------------------------------------
export interface MillingInputSource {
  dryingRunId: string;
  usedKg: number;
}

export interface MillingRunRecord {
  id: string;                 // MP-YYYY-XXXX
  dateTime: string;
  employee: string;
  method: 'Manual' | 'Empacadora';
  bagCapacityKg: number;
  flourKg: number;
  packedKg: number;
  looseFlourKg: number;
  humidity: number;           // %
  targetMin: number;
  targetMax: number;
  inputs: MillingInputSource[];
  dryUsedKg: number;
  createdAt?: string;
}

// -----------------------------------------------------------------------------
// CORRECCIONES Y AUDITORÍA
// -----------------------------------------------------------------------------
export interface CorrectionRecord {
  id: string;
  recordId: string;
  stage: string;
  date: string;
  supervisor: string;
  reason: string;
  oldData: any;
  newData: any;
  createdAt?: string;
}

// -----------------------------------------------------------------------------
// ALERTAS Y ESTADO GLOBAL
// -----------------------------------------------------------------------------
export interface QualityAlert {
  id: string;
  level: 'critical' | 'warn' | 'info';
  category: 'excess_nymphs' | 'low_birth' | 'mosquito' | 'inconsistent_transfer' | 'freezer_overdue';
  stage: string;
  title: string;
  message: string;
  referenceId: string;
  timestamp?: string;
}

export interface AppState {
  postures: PostureRecord[];
  incubations: IncubationRecord[];
  transfers: BoxTransferRecord[];
  sowings: SowingRecord[];
  harvests: HarvestRecord[];
  cleanings: CleaningRecord[];
  washingLoads: WashingLoadRecord[];
  washingLots: WashingLotRecord[];
  dryingRuns: DryingRunRecord[];
  millingRuns: MillingRunRecord[];
  corrections: CorrectionRecord[];
  settings: PlantSettings;
}
