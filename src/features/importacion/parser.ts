import {
  ErrorDeArchivo,
  type FilaImportada,
  type OrigenDeArchivo,
  type ResultadoDeLectura,
} from './tipos';
import {
  aTexto,
  limpiarDescripcion,
  normalizar,
  parsearFecha,
  parsearImporte,
  parsearMoneda,
} from './valores';

/** Una planilla ya leida: filas de celdas crudas. */
export type Matriz = unknown[][];

type Columna = 'fecha' | 'descripcion' | 'importe' | 'debito' | 'credito' | 'saldo' | 'moneda';

/**
 * Nombres con los que cada banco llama a lo mismo. Se comparan normalizados
 * (sin tildes ni puntuacion), y gana el match mas largo para que «fecha valor»
 * no se lo lleve «fecha» si estan las dos.
 */
const NOMBRES: Record<Columna, string[]> = {
  fecha: [
    'fecha',
    'fecha valor',
    'fecha contable',
    'fecha de operacion',
    'fecha operacion',
    'fecha movimiento',
    'fecha de consumo',
    'fecha consumo',
    'fecha compra',
    'dia',
    'date',
  ],
  descripcion: [
    'descripcion',
    'concepto',
    'detalle',
    'detalle movimiento',
    'movimiento',
    'referencia',
    'comercio',
    'nombre comercio',
    'observaciones',
    'glosa',
    'description',
  ],
  importe: ['importe', 'monto', 'valor', 'importe operacion', 'amount', 'total'],
  debito: ['debito', 'debitos', 'debe', 'cargo', 'cargos', 'egreso', 'egresos', 'retiro'],
  credito: ['credito', 'creditos', 'haber', 'abono', 'abonos', 'ingreso', 'ingresos', 'deposito'],
  saldo: ['saldo', 'saldo contable', 'balance'],
  moneda: ['moneda', 'mon', 'divisa', 'currency'],
};

type Mapa = Partial<Record<Columna, number>>;

function detectarColumnas(fila: unknown[]): Mapa {
  const mapa: Mapa = {};
  const largos: Partial<Record<Columna, number>> = {};

  fila.forEach((celda, i) => {
    const texto = normalizar(aTexto(celda));
    if (!texto) return;

    for (const [columna, alias] of Object.entries(NOMBRES) as [Columna, string[]][]) {
      for (const nombre of alias) {
        // Coincidencia exacta o el encabezado empieza con el alias: «importe $»,
        // «debito uyu». Evita que «saldo anterior» se tome como saldo de la fila.
        const coincide = texto === nombre || texto.startsWith(`${nombre} `);
        if (!coincide) continue;
        if ((largos[columna] ?? 0) >= nombre.length) continue;
        mapa[columna] = i;
        largos[columna] = nombre.length;
      }
    }
  });

  return mapa;
}

function sirve(mapa: Mapa): boolean {
  const tieneImporte =
    mapa.importe != null || mapa.debito != null || mapa.credito != null;
  return mapa.fecha != null && tieneImporte;
}

/**
 * Busca el encabezado. Los extractos traen titulo, datos del titular y lineas en
 * blanco antes de la tabla, asi que se prueban las primeras filas y gana la que
 * reconoce mas columnas.
 */
function buscarEncabezado(matriz: Matriz, hasta = 30): { fila: number; mapa: Mapa } | null {
  let mejor: { fila: number; mapa: Mapa; puntos: number } | null = null;

  for (let i = 0; i < Math.min(matriz.length, hasta); i++) {
    const mapa = detectarColumnas(matriz[i] ?? []);
    if (!sirve(mapa)) continue;

    const puntos = Object.keys(mapa).length;
    if (!mejor || puntos > mejor.puntos) mejor = { fila: i, mapa, puntos };
  }

  return mejor ? { fila: mejor.fila, mapa: mejor.mapa } : null;
}

/**
 * El signo depende del papel:
 *
 * - Estado de cuenta: un debito saca plata de la cuenta → negativo.
 * - Resumen de tarjeta: un consumo es plata gastada → negativo, y un pago
 *   recibido baja la deuda → positivo. El archivo suele traer los consumos en
 *   positivo, asi que hay que darlo vuelta.
 */
function montoDeLaFila(fila: unknown[], mapa: Mapa, origen: OrigenDeArchivo): number | null {
  if (mapa.debito != null || mapa.credito != null) {
    const debito = mapa.debito != null ? parsearImporte(fila[mapa.debito]) : null;
    const credito = mapa.credito != null ? parsearImporte(fila[mapa.credito]) : null;

    const salida = debito ? -Math.abs(debito) : 0;
    const entrada = credito ? Math.abs(credito) : 0;
    if (!salida && !entrada) return null;
    return salida + entrada;
  }

  if (mapa.importe == null) return null;
  const importe = parsearImporte(fila[mapa.importe]);
  if (importe == null || importe === 0) return null;

  return origen === 'tarjeta' ? -importe : importe;
}

export type OpcionesDeLectura = {
  origen: OrigenDeArchivo;
  /** Moneda a asumir cuando el archivo no la trae. */
  monedaPorDefecto?: string;
};

export function interpretar(matriz: Matriz, opciones: OpcionesDeLectura): ResultadoDeLectura {
  const { origen, monedaPorDefecto = 'UYU' } = opciones;

  const encabezado = buscarEncabezado(matriz);
  if (!encabezado) {
    throw new ErrorDeArchivo(
      'El archivo no tiene columnas de fecha e importe. Revisá el original y volvé a intentar.',
    );
  }

  const { mapa } = encabezado;
  const filas: FilaImportada[] = [];
  const avisos: string[] = [];
  let descartadas = 0;
  let monedaDelArchivo: string | null = null;

  for (let i = encabezado.fila + 1; i < matriz.length; i++) {
    const cruda = matriz[i] ?? [];
    if (cruda.every((c) => aTexto(c) === '')) continue;

    const fecha = parsearFecha(cruda[mapa.fecha!]);
    const monto = montoDeLaFila(cruda, mapa, origen);

    if (!fecha || monto == null) {
      // Las filas de total y de saldo anterior caen aca y no son un error.
      const texto = normalizar(cruda.map(aTexto).join(' '));
      if (!/^(total|saldo|subtotal)/.test(texto) && texto) descartadas++;
      continue;
    }

    const moneda = mapa.moneda != null ? parsearMoneda(cruda[mapa.moneda]) : null;
    if (moneda && !monedaDelArchivo) monedaDelArchivo = moneda;

    filas.push({
      fecha,
      descripcion: limpiarDescripcion(
        mapa.descripcion != null ? aTexto(cruda[mapa.descripcion]) : '',
      ),
      monto,
      saldo: mapa.saldo != null ? parsearImporte(cruda[mapa.saldo]) : null,
      moneda: moneda ?? null,
      fila: i + 1,
    });
  }

  if (filas.length === 0) {
    throw new ErrorDeArchivo(
      'El archivo tiene las columnas pero ninguna fila con fecha e importe. Puede ser un período sin movimientos.',
    );
  }

  if (descartadas > 0) {
    avisos.push(
      `Se saltearon ${descartadas} ${descartadas === 1 ? 'fila' : 'filas'} sin fecha o sin importe.`,
    );
  }

  const monedas = new Set(filas.map((f) => f.moneda).filter(Boolean));
  if (monedas.size > 1) {
    avisos.push(
      'El archivo mezcla monedas. Se importa una sola: separá el extracto por moneda si necesitás las dos.',
    );
  }

  const fechas = filas.map((f) => f.fecha).sort();

  return {
    origen,
    filas,
    desde: fechas[0] ?? null,
    hasta: fechas[fechas.length - 1] ?? null,
    moneda: monedaDelArchivo ?? monedaPorDefecto,
    avisos,
    descartadas,
  };
}
