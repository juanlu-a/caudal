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

/**
 * Un archivo puede traer más de una cuenta: el estado de cuenta de Itaú viene con
 * la sección en pesos y la sección en dólares, y el resumen de la tarjeta tiene
 * una columna para cada moneda. Cada sección se importa a una cuenta distinta.
 */
export type SeccionImportable = {
  moneda: string;
  /** Número de cuenta o últimos dígitos de la tarjeta, para reconocerla. */
  identificador: string | null;
  filas: FilaImportada[];
  /** Saldo que informa el banco al abrir y al cerrar el período. */
  apertura: number | null;
  cierre: number | null;
  /**
   * Diferencia entre el saldo que queda al sumar los movimientos y el que informa
   * el banco. Cero significa que se leyó todo bien; cualquier otra cosa es una
   * fila mal interpretada. Null cuando el archivo no trae saldos con que controlar.
   */
  descuadre: number | null;
};

export type Lectura = {
  origen: OrigenDeArchivo;
  secciones: SeccionImportable[];
  desde: string | null;
  hasta: string | null;
  /** Cosas que la persona debería saber, en el tono del manual: qué pasó y qué hacer. */
  avisos: string[];
};

/** Lo que devuelve el lector de planillas antes de envolverse en una sección. */
export type ResultadoDeLectura = {
  origen: OrigenDeArchivo;
  filas: FilaImportada[];
  desde: string | null;
  hasta: string | null;
  moneda: string | null;
  avisos: string[];
  /** Filas que se saltearon por no tener fecha o importe legible. */
  descartadas: number;
};

export class ErrorDeArchivo extends Error {}
