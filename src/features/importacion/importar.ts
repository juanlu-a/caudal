import type { Categoria, Cuenta } from '../../types/database';
import type { FilaImportada, Lectura, OrigenDeArchivo, SeccionImportable } from './tipos';
import { normalizar } from './valores';

/**
 * Un movimiento del archivo, ya cruzado con lo que hay en la base.
 */
export type MovimientoPlaneado = {
  fila: FilaImportada;
  /** Clave estable de la fila: la misma fila importada dos veces no entra dos veces. */
  clave: string;
  duplicado: boolean;
  /** Pago de tarjeta detectado: es plata que se mueve, no un gasto. */
  pagoDeTarjeta: boolean;
  /**
   * Traspaso a otra cuenta de la misma persona. No es gasto ni ingreso: la plata
   * sigue siendo suya. Un traspaso a un tercero sí es un gasto de verdad, y por
   * eso hay que distinguirlos.
   */
  entreCuentasPropias: boolean;
  categoriaId: string | null;
};

export type PlanDeImportacion = {
  origen: OrigenDeArchivo;
  archivo: string;
  cuentaId: string;
  desde: string | null;
  hasta: string | null;
  moneda: string;
  movimientos: MovimientoPlaneado[];
  nuevos: number;
  duplicados: number;
  pagosDeTarjeta: number;
  transferenciasPropias: number;
  /**
   * Diferencia entre la suma de los movimientos leídos y el saldo que informa el
   * banco. Cero es la confirmación de que se leyó el archivo entero y bien.
   */
  descuadre: number | null;
  /** Saldo que informa el banco al cerrar el período del archivo. */
  cierre: number | null;
  avisos: string[];
};

/**
 * «TRASPASO DE 3650979», «Traspaso a 3650987». El número dice a qué cuenta fue o
 * de cuál vino, y con eso se sabe si la plata salió del bolsillo o solo cambió
 * de bolsillo.
 */
const TRASPASO = /(traspaso|transferencia)\s+(a|de|desde|hacia)?\s*(\d{5,})/;

/**
 * Frases con las que aparece el pago de la tarjeta en el estado de cuenta.
 * Si se importa tambien el resumen de la tarjeta, este movimiento y las compras
 * que lo componen son la misma plata: por eso se marca como transferencia.
 */
const PAGO_DE_TARJETA =
  /(pago|pgo)\s+(de\s+)?(tarjeta|tj|tc|visa|master|mastercard|oca|amex)|tarjeta\s+de\s+credito|pago\s+resumen|pago\s+recibido|su\s+pago|pago\s+minimo|pago\s+contado/;

/**
 * Pistas para adivinar la categoria por el nombre del comercio. Es una ayuda,
 * no una sentencia: la categoria se puede cambiar despues movimiento por movimiento.
 */
const PISTAS: [RegExp, string][] = [
  [/super|tienda\s+inglesa|disco|devoto|geant|tata|macro|frog|carrasco|kinko|almacen|carniceria|verduleria|panaderia/, 'Alimentos'],
  [/ancap|petrobras|axion|shell|esso|nafta|combustible|uber|cabify|taxi|omnibus|cutcsa|copsa|stm|peaje/, 'Transporte'],
  [/alquiler|ute|ose|antel|gas|contribucion|inmobiliaria|expensas|comun/, 'Vivienda'],
  [/farmacia|mutualista|casmu|medica|sanatorio|hospital|optica|dentista|salud/, 'Salud'],
  [/netflix|spotify|disney|hbo|max|prime|cine|teatro|bar|resto|restaurant|pizzeria|cerveceria|pedidosya|rappi/, 'Ocio'],
  [/antel|movistar|claro|internet|cable|seguro|banco|comision|mantenimiento|itau|bbva|santander|scotiabank/, 'Servicios'],
  [/zara|nike|adidas|mercado\s*libre|amazon|aliexpress|shein|indumentaria|libreria|ferreteria/, 'Compras'],
];

function adivinarCategoria(descripcion: string, categorias: Categoria[]): string | null {
  const texto = normalizar(descripcion);
  if (!texto) return null;

  for (const [patron, nombre] of PISTAS) {
    if (!patron.test(texto)) continue;
    const categoria = categorias.find((c) => normalizar(c.name) === normalizar(nombre));
    if (categoria) return categoria.id;
  }
  return null;
}

export function esPagoDeTarjeta(fila: FilaImportada, origen: OrigenDeArchivo): boolean {
  // En el resumen de la tarjeta el pago recibido tambien aparece, pero ahi es la
  // otra pata de la misma transferencia.
  if (origen === 'cuenta') return fila.monto < 0 && PAGO_DE_TARJETA.test(normalizar(fila.descripcion));
  return fila.monto > 0 && PAGO_DE_TARJETA.test(normalizar(fila.descripcion));
}

/**
 * Clave estable de una fila. Incluye el orden de aparicion entre filas identicas
 * para no perder dos cafes iguales del mismo dia, que son dos gastos de verdad.
 */
export function claveDeFila(cuentaId: string, fila: FilaImportada, repeticion: number): string {
  const desc = normalizar(fila.descripcion).slice(0, 60);
  return [cuentaId, fila.fecha, fila.monto.toFixed(2), desc, repeticion].join('|');
}

/**
 * Si la descripción nombra a otra cuenta de la misma persona, la plata no salió
 * del bolsillo: solo cambió de bolsillo.
 */
function vaAOtraCuentaPropia(descripcion: string, cuentaId: string, cuentas: Cuenta[]): boolean {
  const m = TRASPASO.exec(normalizar(descripcion));
  if (!m) return false;
  const numero = m[3];

  return cuentas.some(
    (c) =>
      c.id !== cuentaId &&
      ((c.external_number && c.external_number === numero) ||
        (c.external_number == null && c.last4 != null && numero.endsWith(c.last4))),
  );
}

export function planificar(
  lectura: Lectura,
  seccion: SeccionImportable,
  opciones: {
    cuentaId: string;
    archivo: string;
    categorias: Categoria[];
    /** Todas las cuentas de la persona, para reconocer los traspasos propios. */
    cuentas?: Cuenta[];
    /** Claves que ya existen en la base, para no importar dos veces lo mismo. */
    clavesExistentes: Set<string>;
  },
): PlanDeImportacion {
  const { cuentaId, archivo, categorias, clavesExistentes, cuentas = [] } = opciones;

  const vistas = new Map<string, number>();
  const movimientos: MovimientoPlaneado[] = seccion.filas.map((fila) => {
    const base = claveDeFila(cuentaId, fila, 0);
    const repeticion = vistas.get(base) ?? 0;
    vistas.set(base, repeticion + 1);

    const clave = claveDeFila(cuentaId, fila, repeticion);
    const pagoDeTarjeta = esPagoDeTarjeta(fila, lectura.origen);
    const entreCuentasPropias = vaAOtraCuentaPropia(fila.descripcion, cuentaId, cuentas);
    const soloSeMueve = pagoDeTarjeta || entreCuentasPropias;

    return {
      fila,
      clave,
      duplicado: clavesExistentes.has(clave),
      pagoDeTarjeta,
      entreCuentasPropias,
      // La plata que solo cambia de lugar no lleva categoria: no es un gasto.
      categoriaId: soloSeMueve ? null : adivinarCategoria(fila.descripcion, categorias),
    };
  });

  const duplicados = movimientos.filter((m) => m.duplicado).length;
  const pagosDeTarjeta = movimientos.filter((m) => m.pagoDeTarjeta && !m.duplicado).length;
  const transferenciasPropias = movimientos.filter(
    (m) => m.entreCuentasPropias && !m.duplicado,
  ).length;

  const avisos = [...lectura.avisos];
  if (seccion.descuadre != null && seccion.descuadre !== 0) {
    avisos.push(
      `La suma de los movimientos no da el saldo que informa el banco: hay una diferencia de ${Math.abs(seccion.descuadre).toFixed(2)}. Revisá antes de importar.`,
    );
  }
  if (duplicados > 0) {
    avisos.push(
      `Se omiten ${duplicados} ${duplicados === 1 ? 'movimiento ya registrado' : 'movimientos ya registrados'}.`,
    );
  }

  return {
    origen: lectura.origen,
    archivo,
    cuentaId,
    desde: lectura.desde,
    hasta: lectura.hasta,
    moneda: seccion.moneda,
    movimientos,
    nuevos: movimientos.length - duplicados,
    duplicados,
    pagosDeTarjeta,
    transferenciasPropias,
    descuadre: seccion.descuadre,
    cierre: seccion.cierre,
    avisos,
  };
}
