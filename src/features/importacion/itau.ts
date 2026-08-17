import type { LineaDePdf } from './pdf';
import {
  ErrorDeArchivo,
  type FilaImportada,
  type Lectura,
  type SeccionImportable,
} from './tipos';
import { limpiarDescripcion, normalizar, parsearImporte } from './valores';

/**
 * Lectura de los estados de cuenta de Itaú Uruguay en PDF.
 *
 * Un archivo puede traer más de una cuenta: el estado de cuenta viene con la
 * sección en pesos y la sección en dólares, y el resumen de la tarjeta tiene una
 * columna para cada moneda. Por eso se devuelven secciones y la pantalla elige
 * la que corresponde a la cuenta elegida.
 */

const MESES: Record<string, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
};

const MONEDAS: Record<string, string> = {
  URGP: 'UYU',
  'US.D': 'USD',
  USD: 'USD',
};

function iso(ano: number, mes: number, dia: number): string | null {
  const d = new Date(ano, mes - 1, dia);
  if (d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** «31JUL2026» — la fecha de cierre, que es de donde sale el año. */
function buscarCierre(lineas: LineaDePdf[]): { ano: number; mes: number } | null {
  for (const linea of lineas.slice(0, 60)) {
    for (const celda of linea.celdas) {
      const m = celda.match(/^(\d{2})([A-Z]{3})(\d{4})$/);
      if (m && MESES[m[2]]) return { ano: Number(m[3]), mes: MESES[m[2]] };
    }
  }
  return null;
}

/**
 * El estado de cuenta no trae el año en cada fila, solo «01JUL». Se toma el año
 * del cierre y se corrige cuando el movimiento cae en el mes siguiente, que pasa
 * en los períodos que cruzan diciembre.
 */
function fechaDeCuenta(celda: string, cierre: { ano: number; mes: number }): string | null {
  const m = celda.match(/^(\d{2})([A-Z]{3})$/);
  if (!m) return null;
  const mes = MESES[m[2]];
  if (!mes) return null;

  let ano = cierre.ano;
  if (mes - cierre.mes > 6) ano -= 1;
  if (cierre.mes - mes > 6) ano += 1;
  return iso(ano, mes, Number(m[1]));
}

/** «220526» → 22 de mayo de 2026. */
function fechaDeTarjeta(celda: string): string | null {
  const m = celda.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (!m) return null;
  return iso(2000 + Number(m[3]), Number(m[2]), Number(m[1]));
}

/**
 * Las columnas de importe están alineadas a la derecha, así que se agrupan por su
 * borde derecho. Devuelve cada columna con cuántas filas la usan, de la más
 * poblada a la menos: la columna de los consumos es siempre la que más se repite,
 * y los números sueltos del encabezado quedan al final.
 */
function columnasDeImporte(bordes: number[], tolerancia = 12): { borde: number; filas: number }[] {
  const grupos: number[][] = [];
  for (const borde of [...bordes].sort((a, b) => a - b)) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && borde - ultimo[ultimo.length - 1] <= tolerancia) ultimo.push(borde);
    else grupos.push([borde]);
  }

  return grupos
    .map((g) => ({ borde: g.reduce((s, v) => s + v, 0) / g.length, filas: g.length }))
    .sort((a, b) => b.filas - a.filas);
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

// ------------------------------------------------------------ estado de cuenta

export function leerEstadoDeCuenta(lineas: LineaDePdf[]): Lectura {
  const cierre = buscarCierre(lineas);
  if (!cierre) {
    throw new ErrorDeArchivo(
      'No se encontró la fecha de cierre del estado de cuenta. Revisá que sea el PDF que descargás del banco.',
    );
  }

  const secciones: SeccionImportable[] = [];
  const avisos: string[] = [];
  let actual: SeccionImportable | null = null;
  let saldo: number | null = null;

  for (const linea of lineas) {
    const celdas = linea.celdas;

    // Cabecera de sección: «859670 | URGP | 3650987». Se repite en cada página,
    // así que solo abre una sección nueva si cambia la cuenta.
    if (celdas.length >= 3 && MONEDAS[celdas[1]]) {
      const identificador = celdas[2];
      if (!actual || actual.identificador !== identificador) {
        actual = {
          moneda: MONEDAS[celdas[1]],
          identificador,
          filas: [],
          apertura: null,
          cierre: null,
          descuadre: null,
        };
        secciones.push(actual);
        saldo = null;
      }
      continue;
    }

    if (!actual) continue;

    const primera = normalizar(celdas[0] ?? '');
    if (primera.startsWith('sdo apertura')) {
      actual.apertura = parsearImporte(celdas[1]);
      saldo = actual.apertura;
      continue;
    }
    if (primera.startsWith('sdo cierre')) {
      actual.cierre = parsearImporte(celdas[1]);
      continue;
    }

    // Movimiento: fecha, descripción repartida en celdas, importe y saldo.
    const fecha = fechaDeCuenta(celdas[0] ?? '', cierre);
    if (!fecha || celdas.length < 3) continue;

    const nuevoSaldo = parsearImporte(celdas[celdas.length - 1]);
    const importe = parsearImporte(celdas[celdas.length - 2]);
    if (nuevoSaldo == null || importe == null) continue;

    // El PDF no dice si el movimiento suma o resta: el signo sale de cómo se
    // movió el saldo. Es el dato más confiable del archivo y además se controla
    // contra el importe impreso.
    const monto = saldo == null ? -Math.abs(importe) : redondear(nuevoSaldo - saldo);
    if (saldo != null && Math.abs(Math.abs(monto) - Math.abs(importe)) > 0.01) {
      avisos.push(
        `En la página ${linea.pagina} hay una fila cuyo importe no coincide con el saldo. Revisá el movimiento del ${fecha}.`,
      );
    }

    actual.filas.push({
      fecha,
      descripcion: limpiarDescripcion(celdas.slice(1, -2).join(' ')),
      monto: monto === 0 ? (importe > 0 ? importe : -importe) : monto,
      saldo: nuevoSaldo,
      moneda: actual.moneda,
      fila: linea.pagina,
    });
    saldo = nuevoSaldo;
  }

  for (const seccion of secciones) {
    if (seccion.apertura == null || seccion.cierre == null) continue;
    const calculado = seccion.filas.reduce((s, f) => s + f.monto, seccion.apertura);
    seccion.descuadre = redondear(calculado - seccion.cierre);
  }

  const conMovimientos = secciones.filter((s) => s.filas.length > 0);
  if (conMovimientos.length === 0) {
    throw new ErrorDeArchivo(
      'El PDF no tiene movimientos. Puede ser un período sin actividad.',
    );
  }

  return { origen: 'cuenta', secciones: conMovimientos, ...periodo(conMovimientos), avisos };
}

// ----------------------------------------------------------- resumen de tarjeta

/** Cargos del resumen que no vienen con fecha propia: van a la fecha de cierre. */
const CARGO_SIN_FECHA = /^(seguro|cargo|comision|interes|renovacion|anualidad|mantenimiento)/;

/** Filas que traen números pero no son movimientos. */
const NO_ES_MOVIMIENTO = /^(saldo|total|subtotal|limite|disponible|\d+ ?cuotas|tea|pago minimo)/;

function esImporte(celda: string): boolean {
  return /^-?[\d.]+,\d{2}$/.test(celda.replace(/\s/g, ''));
}

/** «27/07/26» — la fecha de cierre del resumen. */
function fechaDeCierreDeTarjeta(lineas: LineaDePdf[]): string | null {
  for (const linea of lineas.slice(0, 20)) {
    for (const celda of linea.celdas) {
      const m = celda.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
      if (m) return iso(2000 + Number(m[3]), Number(m[2]), Number(m[1]));
    }
  }
  return null;
}

export function leerResumenDeTarjeta(lineas: LineaDePdf[]): Lectura {
  const cierre = fechaDeCierreDeTarjeta(lineas);

  // Cada fila puede traer importe en pesos, en dólares o en los dos. Se sabe por
  // la columna, porque están alineados a la derecha. La de pesos es la que más
  // se repite; la de dólares, la que queda a su derecha.
  const bordesDeImportes: number[] = [];
  for (const linea of lineas) {
    linea.celdas.forEach((celda, i) => {
      if (esImporte(celda) && linea.derecha[i] != null) bordesDeImportes.push(linea.derecha[i]);
    });
  }

  const columnas = columnasDeImporte(bordesDeImportes);
  if (columnas.length === 0 || columnas[0].filas < 3) {
    throw new ErrorDeArchivo(
      'No se encontraron consumos en el resumen. Revisá que sea el PDF que descargás del banco.',
    );
  }
  // La columna con más filas es la de la moneda principal del resumen.
  const columnaPesos = columnas[0].borde;
  const columnaDolares =
    columnas.filter((c) => c.borde - columnaPesos > 30).sort((a, b) => a.borde - b.borde)[0]
      ?.borde ?? null;

  function monedaDe(borde: number): string | null {
    if (Math.abs(borde - columnaPesos) <= 14) return 'UYU';
    if (columnaDolares != null && Math.abs(borde - columnaDolares) <= 14) return 'USD';
    return null;
  }

  const porMoneda = new Map<string, FilaImportada[]>();
  const anterior = new Map<string, number>();
  const contado = new Map<string, number>();
  const avisos: string[] = [];

  function agregar(moneda: string, fila: FilaImportada) {
    const lista = porMoneda.get(moneda) ?? [];
    lista.push(fila);
    porMoneda.set(moneda, lista);
  }

  for (const linea of lineas) {
    const celdas = linea.celdas;
    const etiqueta = normalizar(celdas[0] ?? '');
    const fechaPropia = fechaDeTarjeta(celdas[0] ?? '');

    // Saldos del resumen: sirven para controlar que se leyó todo.
    if (etiqueta.startsWith('saldo del estado de cuenta anterior') || etiqueta.startsWith('saldo contado')) {
      const destino = etiqueta.startsWith('saldo contado') ? contado : anterior;
      // Acá los dos importes van siempre en orden: primero pesos, después dólares.
      const importes = celdas.slice(1).filter(esImporte);
      if (importes[0] != null) destino.set('UYU', parsearImporte(importes[0]) ?? 0);
      if (importes[1] != null) destino.set('USD', parsearImporte(importes[1]) ?? 0);
      continue;
    }

    if (!fechaPropia && (NO_ES_MOVIMIENTO.test(etiqueta) || !CARGO_SIN_FECHA.test(etiqueta))) continue;

    const fecha = fechaPropia ?? cierre;
    if (!fecha) continue;

    const indices = celdas
      .map((celda, i) => (esImporte(celda) ? i : -1))
      .filter((i) => i >= 0 && monedaDe(linea.derecha[i]) !== null);
    if (indices.length === 0) continue;

    // El código de la tarjeta («4023») no aporta nada a la descripción.
    const desde = fechaPropia && /^\d{4}$/.test(celdas[1] ?? '') ? 2 : 1;
    const descripcion = limpiarDescripcion(celdas.slice(desde, indices[0]).join(' '));

    for (const i of indices) {
      const importe = parsearImporte(celdas[i]);
      const moneda = monedaDe(linea.derecha[i]);
      if (importe == null || moneda == null) continue;

      // En el resumen los consumos vienen en positivo y los pagos en negativo.
      // En Caudal es al revés: gastar resta, pagar la tarjeta suma.
      agregar(moneda, {
        fecha,
        descripcion: descripcion || (fechaPropia ? '' : limpiarDescripcion(celdas[0])),
        monto: redondear(-importe),
        saldo: null,
        moneda,
        fila: linea.pagina,
      });
    }
  }

  const identificador = buscarTarjeta(lineas);
  const secciones: SeccionImportable[] = [...porMoneda.entries()].map(([moneda, filas]) => {
    const apertura = anterior.get(moneda) ?? null;
    const cierreDelBanco = contado.get(moneda) ?? null;
    // El resumen informa deuda: sube con los consumos y baja con los pagos, o sea
    // al revés que los montos de Caudal. De ahí el menos.
    const descuadre =
      apertura != null && cierreDelBanco != null
        ? redondear(apertura - filas.reduce((s, f) => s + f.monto, 0) - cierreDelBanco)
        : null;

    return { moneda, identificador, filas, apertura, cierre: cierreDelBanco, descuadre };
  });

  if (secciones.length > 1) {
    avisos.push('El resumen trae pesos y dólares. Se importa la moneda de la cuenta elegida.');
  }
  for (const s of secciones) {
    if (s.descuadre != null && s.descuadre !== 0) {
      avisos.push(
        `En ${s.moneda} la suma de los movimientos no da el saldo del resumen: faltan ${Math.abs(s.descuadre).toFixed(2)}. Revisá antes de importar.`,
      );
    }
  }

  return { origen: 'tarjeta', secciones, ...periodo(secciones), avisos };
}

/** Los últimos cuatro dígitos con los que el resumen identifica la tarjeta. */
function buscarTarjeta(lineas: LineaDePdf[]): string | null {
  for (const linea of lineas) {
    if (fechaDeTarjeta(linea.celdas[0] ?? '') && /^\d{4}$/.test(linea.celdas[1] ?? '')) {
      return linea.celdas[1];
    }
  }
  return null;
}

function periodo(secciones: SeccionImportable[]): { desde: string | null; hasta: string | null } {
  const fechas = secciones.flatMap((s) => s.filas.map((f) => f.fecha)).sort();
  return { desde: fechas[0] ?? null, hasta: fechas[fechas.length - 1] ?? null };
}

// --------------------------------------------- estado de cuenta del mes en curso

/**
 * El estado de cuenta que se baja de Itaú Link, que es la página impresa a PDF y
 * no el resumen mensual. Tiene encabezado propio y una tabla con columnas
 * separadas de débito y crédito.
 *
 * La fila no dice a qué columna pertenece su importe: una de las dos viene
 * vacía y al reconstruir la tabla desaparece. Se resuelve por posición — las
 * columnas están alineadas a la derecha — y se controla contra el saldo
 * corriente, que sí viene en cada fila.
 */
const ENCABEZADO_LINK = ['fecha', 'concepto', 'debito', 'credito', 'saldo'];

export function leerLinkDeItau(lineas: LineaDePdf[]): Lectura {
  const iEncabezado = lineas.findIndex((l) => {
    const celdas = l.celdas.map((c) => normalizar(c));
    return ENCABEZADO_LINK.every((nombre) => celdas.some((c) => c === nombre));
  });

  if (iEncabezado === -1) {
    throw new ErrorDeArchivo(
      'No se encontró la tabla de movimientos. Tiene que ser el PDF que baja Itaú Link, sin editar.',
    );
  }

  // Dónde termina cada columna, para saber después a cuál pertenece un importe.
  const encabezado = lineas[iEncabezado];
  const columna = new Map<string, number>();
  encabezado.celdas.forEach((celda, i) => {
    const nombre = normalizar(celda);
    if (ENCABEZADO_LINK.includes(nombre)) columna.set(nombre, encabezado.derecha[i]);
  });

  /** La columna cuyo borde derecho queda más cerca del importe. */
  function columnaDe(borde: number): string | null {
    let mejor: { nombre: string; distancia: number } | null = null;
    for (const nombre of ['debito', 'credito', 'saldo']) {
      const ref = columna.get(nombre);
      if (ref == null) continue;
      const distancia = Math.abs(borde - ref);
      if (!mejor || distancia < mejor.distancia) mejor = { nombre, distancia };
    }
    return mejor && mejor.distancia < 60 ? mejor.nombre : null;
  }

  const { moneda, numero } = cabeceraDeLink(lineas.slice(0, iEncabezado));
  const filas: FilaImportada[] = [];
  const avisos: string[] = [];
  let saldoAnterior: number | null = null;

  for (const linea of lineas.slice(iEncabezado + 1)) {
    const fecha = fechaDeLink(linea.celdas[0] ?? '');
    if (!fecha) continue;

    let importe: number | null = null;
    let signo = 0;
    let saldo: number | null = null;

    linea.celdas.forEach((celda, i) => {
      const valor = parsearImporte(celda);
      if (valor == null || !/\d,\d{2}$/.test(celda)) return;

      switch (columnaDe(linea.derecha[i])) {
        case 'debito':
          importe = valor;
          signo = -1;
          break;
        case 'credito':
          importe = valor;
          signo = 1;
          break;
        case 'saldo':
          saldo = valor;
          break;
      }
    });

    if (importe == null || signo === 0 || saldo == null) continue;
    const monto = redondear(signo * Math.abs(importe));

    // El saldo corriente confirma el signo que dio la columna.
    if (saldoAnterior != null && Math.abs(saldoAnterior + monto - saldo) > 0.01) {
      avisos.push(
        `El movimiento del ${fecha} no cierra con el saldo de la fila. Revisalo antes de importar.`,
      );
    }
    saldoAnterior = saldo;

    filas.push({
      fecha,
      descripcion: limpiarDescripcion(linea.celdas.slice(1, -2).join(' ')),
      monto,
      saldo,
      moneda,
      fila: linea.pagina,
    });
  }

  if (filas.length === 0) {
    throw new ErrorDeArchivo('El PDF no tiene movimientos en el período que muestra.');
  }

  const seccion: SeccionImportable = {
    moneda,
    identificador: numero,
    filas,
    apertura: null,
    cierre: filas[filas.length - 1].saldo,
    // Sin saldo de apertura no hay contra qué cuadrar el total: el control se
    // hizo fila por fila contra el saldo corriente.
    descuadre: null,
  };

  const fechas = filas.map((f) => f.fecha).sort();
  return {
    origen: 'cuenta',
    secciones: [seccion],
    desde: fechas[0] ?? null,
    hasta: fechas[fechas.length - 1] ?? null,
    avisos,
  };
}

/** «14-08-26» → 14 de agosto de 2026. */
function fechaDeLink(celda: string): string | null {
  const m = celda.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (!m) return null;
  return iso(2000 + Number(m[3]), Number(m[2]), Number(m[1]));
}

/** Del encabezado salen el número de cuenta y la moneda. */
function cabeceraDeLink(lineas: LineaDePdf[]): { moneda: string; numero: string | null } {
  let moneda = 'UYU';
  let numero: string | null = null;

  for (const linea of lineas) {
    for (const celda of linea.celdas) {
      const texto = normalizar(celda);
      if (/^(dolares|dolar|usd)$/.test(texto)) moneda = 'USD';
      if (/^\d{6,}$/.test(celda) && !numero) numero = celda;
    }
  }
  return { moneda, numero };
}
