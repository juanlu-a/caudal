/** Una fila del archivo, ya interpretada pero todavia no guardada. */
export type FilaImportada = {
  /** Fecha en ISO local, «2026-08-14». */
  fecha: string;
  descripcion: string;
  /** Con signo y en la convencion de Caudal: negativo gasto, positivo ingreso. */
  monto: number;
  /** Saldo que informa el banco en esa fila, si viene. Sirve para controlar. */
  saldo: number | null;
  moneda: string | null;
  /** Numero de fila en el archivo, para poder señalar dónde falló algo. */
  fila: number;
};

export type OrigenDeArchivo = 'cuenta' | 'tarjeta';

export type ResultadoDeLectura = {
  origen: OrigenDeArchivo;
  filas: FilaImportada[];
  desde: string | null;
  hasta: string | null;
  moneda: string | null;
  /** Cosas que la persona debería saber, en el tono del manual: qué pasó y qué hacer. */
  avisos: string[];
  /** Filas que se saltearon por no tener fecha o importe legible. */
  descartadas: number;
};

export class ErrorDeArchivo extends Error {}
