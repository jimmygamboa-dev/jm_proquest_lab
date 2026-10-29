const fs = require('fs');

const html = fs.readFileSync('dist/index.html', 'utf8');
const loaderLine = html.split('\n').find((line) => line.startsWith('function mapBackup('));
if (!loaderLine) throw new Error('No se encontró el lector de respaldos.');

const mapBackup = eval(`(${loaderLine})`);
const samplePosture = { id: 'P-2026-0004', date: '2026-09-15', nests: 6 };
const sampleIncubation = { id: 'I-2026-0001', postureId: 'P-2026-0004' };
const sampleBagPlan = { id: 'PLAN-MP-2026-0001-B01', bagKey: 'MP-2026-0001-B01', status: 'pending_delivery' };
const sampleCorrection = { id: 'COR-2026-0001', bagKey: 'MP-2026-0001-B01', type: 'Devolución controlada a almacenamiento' };

for (const source of [
  { postures: [samplePosture], incubations: [sampleIncubation], bagPlans: [sampleBagPlan], corrections: [sampleCorrection], settings: {} },
  { posturas: [samplePosture], incubaciones: [sampleIncubation], destinosBolsas: [sampleBagPlan], correcciones: [sampleCorrection], parametros: {} },
]) {
  const restored = mapBackup(source);
  if (restored.postures.length !== 1 || restored.postures[0].id !== samplePosture.id) {
    throw new Error('La actualización perdería una postura guardada.');
  }
  if (restored.incubations.length !== 1 || restored.incubations[0].postureId !== samplePosture.id) {
    throw new Error('La actualización perdería el enlace entre postura e incubación.');
  }
  if (restored.bagPlans.length !== 1 || restored.bagPlans[0].bagKey !== sampleBagPlan.bagKey) {
    throw new Error('La actualización perdería el destino pendiente de una bolsa.');
  }
  if (restored.corrections.length !== 1 || restored.corrections[0].id !== sampleCorrection.id) {
    throw new Error('La actualización perdería una corrección controlada.');
  }
}

for (const required of ['records_controller', 'Responsable de control y trazabilidad', 'const roleOrder={admin:1,supervisor:2,records_controller:3']) {
  if (!html.includes(required)) throw new Error(`Falta la estructura de responsables: ${required}`);
}

console.log('Datos locales: posturas, incubaciones, destinos de bolsas y correcciones controladas se conservan.');
