import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { WorkerMessageHandler } from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

import { ErrorDeArchivo } from './tipos';

/**
 * Lectura de PDF con reconstrucción de la tabla.
 *
 * El texto plano de un estado de cuenta no sirve: el resumen de la tarjeta sale
 * con las descripciones de un lado y los importes del otro. pdf.js entrega cada
 * fragmento con su posición, así que se reagrupan por coordenada Y (una línea) y
 * se ordenan por X, marcando las columnas donde hay un salto horizontal.
 *
 * Corre en el teléfono: los estados de cuenta no salen del dispositivo.
 */

// En el teléfono no hay Web Workers. pdf.js corre en el hilo principal si
// encuentra el handler acá: es su propio mecanismo, no un truco.
(globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker = { WorkerMessageHandler };

// pdf.js llama structuredClone(obj, null) cuando no hay lista de transferencia.
// El estándar lo acepta; el polyfill que trae React Native desestructura las
// opciones y explota con null. Se normaliza a undefined.
const conStructuredClone = globalThis as unknown as {
  structuredClone?: (valor: unknown, opciones?: unknown) => unknown;
};
const clonarOriginal = conStructuredClone.structuredClone;
if (typeof clonarOriginal === 'function') {
  conStructuredClone.structuredClone = (valor: unknown, opciones?: unknown) =>
    opciones == null ? clonarOriginal(valor) : clonarOriginal(valor, opciones);
}

// pdf.js 4 usa APIs que Hermes todavía no trae.
const global = globalThis as unknown as {
  Promise: PromiseConstructor & { withResolvers?: unknown };
};
if (typeof global.Promise.withResolvers !== 'function') {
  global.Promise.withResolvers = function withResolvers<T>() {
    let resolve!: (valor: T | PromiseLike<T>) => void;
    let reject!: (razon?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

export type LineaDePdf = {
  /** Las celdas de la fila, de izquierda a derecha. */
  celdas: string[];
  /** Dónde empieza cada celda, en puntos desde el borde izquierdo. */
  x: number[];
  /**
   * Dónde termina cada celda. Es lo que sirve para saber en qué columna cae un
   * importe: las columnas de números están alineadas a la derecha, y el resumen
   * de la tarjeta tiene una de pesos y otra de dólares.
   */
  derecha: number[];
  /** Todo junto, para buscar encabezados y marcas. */
  texto: string;
  pagina: number;
};

/** Salto horizontal, en puntos, que separa una columna de la siguiente. */
const SALTO = 8;
/** Cuánto puede variar la Y dentro de una misma línea. */
const TOLERANCIA = 2;

export async function leerPdf(bytes: Uint8Array): Promise<LineaDePdf[]> {
  let doc: pdfjs.PDFDocumentProxy;
  try {
    doc = await pdfjs.getDocument({
      data: bytes,
      isEvalSupported: false,
      useSystemFonts: false,
    }).promise;
  } catch (e) {
    console.log('[pdf] motivo real:', e);
    throw new ErrorDeArchivo(
      'No se pudo abrir el PDF. Tiene que ser el estado de cuenta tal cual lo descargás del banco.',
    );
  }

  const lineas: LineaDePdf[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const pagina = await doc.getPage(p);
    const { items } = await pagina.getTextContent();

    const porY = new Map<number, { x: number; ancho: number; texto: string }[]>();

    for (const item of items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const x = item.transform[4] as number;
      const y = Math.round((item.transform[5] as number) / TOLERANCIA) * TOLERANCIA;
      const fila = porY.get(y) ?? [];
      fila.push({ x, ancho: item.width ?? item.str.length * 4, texto: item.str });
      porY.set(y, fila);
    }

    const ys = [...porY.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      const fragmentos = porY.get(y)!.sort((a, b) => a.x - b.x);

      const celdas: string[] = [];
      const equis: number[] = [];
      const derechas: number[] = [];
      let actual = '';
      let inicioActual = 0;
      let finAnterior: number | null = null;

      for (const { x, ancho, texto } of fragmentos) {
        if (finAnterior !== null && x - finAnterior > SALTO) {
          if (actual.trim()) {
            celdas.push(actual.trim());
            equis.push(inicioActual);
            derechas.push(finAnterior);
          }
          actual = '';
        }
        if (!actual) inicioActual = x;
        actual += texto;
        finAnterior = x + ancho;
      }
      if (actual.trim() && finAnterior !== null) {
        celdas.push(actual.trim());
        equis.push(inicioActual);
        derechas.push(finAnterior);
      }

      if (celdas.length > 0) {
        lineas.push({ celdas, x: equis, derecha: derechas, texto: celdas.join(' '), pagina: p });
      }
    }
  }

  if (lineas.length === 0) {
    throw new ErrorDeArchivo(
      'El PDF no tiene texto: parece un escaneo. Descargá el estado de cuenta original desde el banco.',
    );
  }

  return lineas;
}
