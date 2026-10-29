// =============================================================================
// JM PROQUEST V1 - CONSTANTES Y CATÁLOGOS BASE
// =============================================================================

export const EMPLOYEE_NAMES: Record<string, string> = {
  'E-01': 'Deyker',
  'E-02': 'José',
  'E-06': 'Amalia',
  'E-07': 'Luis',
  'E-08': 'Carlos',
};

export const EMPLOYEES: string[] = Array.from({ length: 25 }, (_, i) => 
  'E-' + String(i + 1).padStart(2, '0')
);

export const CAGES: string[] = Array.from({ length: 75 }, (_, i) => 
  'CE-' + String(i + 1).padStart(3, '0')
);

export const INCUBATORS: string[] = Array.from({ length: 50 }, (_, i) => 
  'INC-' + String(i + 1).padStart(3, '0')
);

export const BOXES: string[] = Array.from({ length: 50 }, (_, i) => 
  'CJ-' + String(i + 1).padStart(3, '0')
);

export const FREEZERS: string[] = [
  'Congelador 1',
  'Congelador 2',
  'Congelador 3',
  'Congelador 4',
  'Congelador 5',
  'Congelador 6',
  'Congelador 7',
];

// Maestra Edad: Grillos por gramo de ninfa según edad (días 1 a 21)
export const AGE_GRILLERS: Record<number, number> = {
  1: 1000,
  2: 775,
  3: 550,
  4: 450,
  5: 400,
  6: 350,
  7: 300,
  8: 250,
  9: 200,
  10: 140,
  11: 100,
  12: 80,
  13: 65,
  14: 60,
  15: 55,
  16: 50,
  17: 35,
  18: 25,
  19: 20,
  20: 20,
  21: 15,
};

export const MORTALITY_MIN = 0.20; // 20% escenario favorable
export const MORTALITY_MAX = 0.60; // 60% escenario conservador
export const INCUBATION_DAYS = 10;
export const EARLIEST_HARVEST_DAYS = 42;
export const GROWOUT_REFERENCE_DAYS = 45;

export const BASELINE: Record<string, Record<number, number>> = {
  P: { 2025: 3, 2026: 0 },
  I: { 2025: 3, 2026: 0 },
  CN: { 2025: 3, 2026: 0 },
  SOW: { 2025: 3, 2026: 0 },
  CO: { 2025: 3, 2026: 0 },
  LP: { 2025: 3, 2026: 0 },
  LV: { 2025: 3, 2026: 0 },
  DH: { 2025: 3, 2026: 0 },
  MP: { 2025: 3, 2026: 0 },
};

export const DEFAULT_SETTINGS = {
  eggsPerNest: 60000,
  processTargetMinKg: 90,
  processTargetMaxKg: 150,
  bagCapacityKg: 9,
};
