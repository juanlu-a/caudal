/**
 * Formato de cifras y fechas — manual de marca, seccion 02.
 * Esto es diseno, no localizacion: la puntuacion de un numero cambia como se lee su peso.
 */

/** Signo menos real (U+2212), nunca un guion ni parentesis. */
export const MENOS = '−';
export const MAS = '+';

const SIMBOLO: Record<string, string> = {
  UYU: '$',
  ARS: '$',
  USD: 'US$',
  EUR: '€',
  BRL: 'R$',
};

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

function conSeparadores(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

type OpcionesMonto = {
  /** 'auto' pone «−» solo en negativos; 'siempre' agrega «+» en positivos. */
  signo?: 'auto' | 'siempre' | 'nunca';
  /** Los decimales se ocultan en listas cuando son cero. */
  decimales?: 'siempre' | 'ocultarEnCero' | 'nunca';
};

/** Formatea el valor absoluto con puntuacion rioplatense y le antepone el signo. */
export function formatMonto(valor: number, opciones: OpcionesMonto = {}): string {
  const { signo = 'auto', decimales = 'siempre' } = opciones;
  const absoluto = Math.abs(valor);
  const redondeado = Math.round(absoluto * 100) / 100;
  const centavos = Math.round((redondeado - Math.floor(redondeado)) * 100);

  const mostrarDecimales =
    decimales === 'siempre' || (decimales === 'ocultarEnCero' && centavos !== 0);

  const entero = conSeparadores(String(Math.floor(redondeado)));
  const cuerpo = mostrarDecimales
    ? `${entero},${String(centavos).padStart(2, '0')}`
    : entero;

  if (signo === 'nunca') return cuerpo;
  if (valor < 0) return `${MENOS}${cuerpo}`;
  return signo === 'siempre' ? `${MAS}${cuerpo}` : cuerpo;
}

/** «$ 12.480,50» — espacio tras el simbolo, siempre. */
export function formatMoneda(
  valor: number,
  moneda = 'UYU',
  opciones: OpcionesMonto = {},
): string {
  const simbolo = SIMBOLO[moneda] ?? moneda;
  const monto = formatMonto(valor, opciones);
  // El signo va pegado a la cifra, no al simbolo: «$ −2.480,00» se lee peor que «−$ 2.480,00».
  if (monto.startsWith(MENOS) || monto.startsWith(MAS)) {
    return `${monto[0]}${simbolo} ${monto.slice(1)}`;
  }
  return `${simbolo} ${monto}`;
}

/** Variacion: un decimal, siempre con signo. «+12,4%» */
export function formatVariacion(fraccion: number): string {
  const porcentaje = fraccion * 100;
  const signo = porcentaje < 0 ? MENOS : MAS;
  return `${signo}${Math.abs(porcentaje).toFixed(1).replace('.', ',')}%`;
}

/** Fecha en contexto: «14/08», sin ano si es el periodo actual. */
export function formatFecha(fecha: Date | string, hoy = new Date()): string {
  const d = typeof fecha === 'string' ? parseFechaISO(fecha) : fecha;
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return d.getFullYear() === hoy.getFullYear()
    ? `${dia}/${mes}`
    : `${dia}/${mes}/${d.getFullYear()}`;
}

/** «Agosto 2026» — sentence case, sin coma. */
export function formatMes(fecha: Date): string {
  const mes = MESES[fecha.getMonth()];
  return `${mes[0].toUpperCase()}${mes.slice(1)} ${fecha.getFullYear()}`;
}

/** «Hoy», «Ayer» o «Jueves 14/08» para los encabezados de dia de la lista. */
export function formatDiaRelativo(fecha: string, hoy = new Date()): string {
  const d = parseFechaISO(fecha);
  const diff = Math.round((soloFecha(hoy).getTime() - soloFecha(d).getTime()) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return formatFecha(d, hoy);
}

/** Una fecha ISO «2026-08-14» se parsea local, no UTC: si no, se corre un dia. */
export function parseFechaISO(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, (mes ?? 1) - 1, dia ?? 1);
}

export function aFechaISO(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Primer dia del mes en ISO — la clave con la que agrupa la vista de totales. */
export function inicioDeMes(fecha: Date): string {
  return aFechaISO(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
}

export function sumarMeses(fecha: Date, meses: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth() + meses, 1);
}

/** Abreviatura de tres letras para el eje del grafico: «AGO». */
export function abreviaturaMes(fecha: Date): string {
  return MESES[fecha.getMonth()].slice(0, 3).toUpperCase();
}

function soloFecha(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
