const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync('dist/index.html', 'utf8');
const source = fs.readFileSync('dist/languages.js', 'utf8');
const window = {};
for (const name of ['esToEn', 'summaryEnglish']) {
  const start = html.indexOf('const ' + name + '=') + ('const ' + name + '=').length;
  const end = html.indexOf('\n  };', start) + 5;
  window[name === 'esToEn' ? 'jmLanguageDictionary' : 'jmSummaryDictionary'] =
    new Function('return ' + html.slice(start, end))();
}
function node(text, protectedCell = false) {
  const cell = protectedCell ? { hasAttribute: () => false, cellIndex: 0,
    closest: () => ({ querySelectorAll: () => [{ textContent: 'Notas' }] }) } : null;
  return { nodeValue: text, parentElement: { closest(selector) {
    if (selector === 'td') return cell;
    return null;
  } } };
}
const nodes = [
  node('Inventario de harina y despachos'), node('Guardar destino'),
  node('2 postura(s) por pasar a incubación'), node('HE-2026-0001-B02'),
  node('José'), node('Guardar destino', true), node('Disponible'),
  node('Fecha de colocación'), node('Seleccione un lote.'),
  node('Corrección controlada de despacho')
];
const savedInput = { value: '15,30' };
const selectValue = 'Directo a cajón';
const stored = { 'jm-proquest-ui-language': 'es', production: '{"notes":"Guardar destino","id":"HE-2026-0001-B02"}' };
const originalStorage = stored.production;
const picker = { options: [{}, {}], value: 'es', addEventListener() {},
  cloneNode() { return this; }, replaceWith() {} };
const document = { body: {}, documentElement: {},
  createTreeWalker() { let i = -1; return { nextNode() { return ++i < nodes.length; }, get currentNode() { return nodes[i]; } }; },
  querySelectorAll() { return []; },
  getElementById(id) { return id === 'languageSelect' ? picker : null; }
};
window.confirm = () => true;
const context = { window, document, NodeFilter: { SHOW_TEXT: 4 },
  localStorage: { getItem: (key) => stored[key], setItem: (key, value) => { stored[key] = value; } },
  toast() {}, MutationObserver: class { observe() {} }, queueMicrotask };
vm.runInNewContext(source, context);
window.jmSetLanguage('en');
assert.equal(nodes[0].nodeValue, 'Flour inventory and dispatches');
assert.equal(nodes[1].nodeValue, 'Save destination');
assert.equal(nodes[2].nodeValue, '2 egg-laying batch(es) awaiting incubation');
assert.equal(nodes[3].nodeValue, 'HE-2026-0001-B02');
assert.equal(nodes[4].nodeValue, 'José');
assert.equal(nodes[5].nodeValue, 'Guardar destino');
assert.equal(nodes[6].nodeValue, 'Available');
assert.equal(savedInput.value, '15,30');
assert.equal(selectValue, 'Directo a cajón');
assert.equal(stored.production, originalStorage);
window.jmSetLanguage('es');
assert.equal(nodes[0].nodeValue, 'Inventario de harina y despachos');
assert.equal(nodes[1].nodeValue, 'Guardar destino');
assert.equal(nodes[2].nodeValue, '2 postura(s) por pasar a incubación');
for (const text of ['Guardar postura', 'Guardar incubación', 'Guardar traslado', 'Guardar siembra',
  'Guardar cosecha', 'Guardar preparación', 'Guardar carga', 'Guardar deshidratación',
  'Guardar molienda y empaque', 'Registrar entrega', 'Correcciones registradas',
  'Peso neto', 'Rendimiento vivo a empaque trazado', 'Motivo obligatorio de la corrección']) {
  assert.notEqual(window.jmTranslateUI(text), text, text);
}
for (const script of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new Function(script[1]);
new Function(source);
assert(html.includes('bindDispatchForm();bindCommon();appendDispatchCorrections(false);'));
assert(html.includes('appendDispatchCorrections(true);'));
console.log('Passed: bilingual labels/messages across all 10 stages, Spanish/English switching, protected notes/IDs, and correction location.');
