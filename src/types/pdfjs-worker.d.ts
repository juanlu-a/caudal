/**
 * El build del worker de pdf.js no trae tipos. Lo único que se usa de él es
 * WorkerMessageHandler, que se cuelga en globalThis para que pdf.js corra en el
 * hilo principal (en el teléfono no hay Web Workers).
 */
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown;
}
