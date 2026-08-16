/**
 * Parche de pdf.js para que corra en Hermes.
 *
 * pdf.js trae, dentro de `_setupFakeWorkerGlobal`, un `await import(this.workerSrc)`
 * con la ruta calculada en tiempo de ejecución. Hermes compila la función entera la
 * primera vez que se la llama y ahí se cae con «Invalid expression encountered»,
 * aunque esa línea nunca se ejecute: la app ya le pasa el WorkerMessageHandler por
 * `globalThis.pdfjsWorker` y el import dinámico jamás haría falta.
 *
 * Este script reemplaza esa línea por un error explícito. Corre solo en postinstall.
 *
 * Uso: node scripts/parche-pdfjs.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

const VIEJO = 'await import(/*webpackIgnore: true*/this.workerSrc)';
const NUEVO =
  'await Promise.reject(new Error("Caudal: pdf.js tiene que usar el handler de globalThis.pdfjsWorker"))';

function parchear(archivo) {
  const texto = readFileSync(archivo, 'utf8');

  if (texto.includes(NUEVO)) return 'ya estaba';
  if (!texto.includes(VIEJO)) return 'sin coincidencias';

  writeFileSync(archivo, texto.split(VIEJO).join(NUEVO));
  return 'parcheado';
}

const base = path.dirname(require.resolve('pdfjs-dist/package.json'));
for (const relativo of ['legacy/build/pdf.mjs', 'build/pdf.mjs']) {
  const archivo = path.join(base, relativo);
  try {
    console.log(`  ${relativo}: ${parchear(archivo)}`);
  } catch (e) {
    console.log(`  ${relativo}: no se pudo (${e.code ?? e.message})`);
  }
}
