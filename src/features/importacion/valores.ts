import { aFechaISO } from '../../lib/format';

/**
 * Interpretacion de las celdas de un extracto bancario.
 *
 * Los bancos exportan lo mismo de muchas formas: la fecha como texto, como
 * numero de serie de Excel o como Date; el importe con punto de miles y coma
 * decimal, entre parentesis cuando es negativo, o partido en dos columnas de
 * debito y credito. Todo eso se resuelve aca y no en el parser.
 */

/** Excel cuenta los dias desde el 30/12/1899 (con el bug del año 1900 incluido). */
const EPOCA_EXCEL = Date.UTC(1899, 11, 30);

export function aTexto(valor: unknown): string {
  if (valor == null) return '';
  if (typeof valor === 'string') return valor.trim();
  if (valor instanceof Date) return valor.toISOString();
  return String(valor).trim();
}

/** Normaliza un encabezado para compararlo: sin tildes, sin puntuacion, minusculas. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function parsearFecha(valor: unknown): string | null {
  if (valor == null || valor === '') return null;

  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return aFechaISO(valor);
  }

  if (typeof valor === 'number' && Number.isFinite(valor)) {
    // Serie de Excel. Por debajo de 20000 (año 1954) casi seguro no es una fecha.
    if (valor < 20_000 || valor > 80_000) return null;
    const ms = EPOCA_EXCEL + Math.round(valor) * 86_400_000;
    const d = new Date(ms);
    return aFechaISO(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  const texto = aTexto(valor);
  if (!texto) return null;

  // ISO: 2026-08-14 o 2026-08-14T...
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return armarFecha(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // dd/mm/aaaa, dd-mm-aa, dd.mm.aaaa — en Uruguay el dia va primero, siempre.
  const local = texto.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (local) {
    const dia = Number(local[1]);
    const mes = Number(local[2]);
    let ano = Number(local[3]);
    if (ano < 100) ano += ano < 70 ? 2000 : 1900;
    return armarFecha(ano, mes, dia);
  }

  return null;
}

function armarFecha(ano: number, mes: number, dia: number): string | null {
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  const d = new Date(ano, mes - 1, dia);
  // Rebota si la fecha no existe (31 de febrero y parecidos).
  if (d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return aFechaISO(d);
}

/**
 * Convierte el importe a numero. Devuelve null si la celda no es un importe.
 * Entiende «1.234,56», «1,234.56», «(1.234,56)», «-1.234,56» y «1.234,56-».
 */
export function parsearImporte(valor: unknown): number | null {
  if (valor == null || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;

  let texto = aTexto(valor);
  if (!texto) return null;

  // El signo puede venir antes, despues o como parentesis contables.
  let negativo = false;
  if (/^\(.*\)$/.test(texto)) {
    negativo = true;
    texto = texto.slice(1, -1);
  }
  if (texto.endsWith('-')) {
    negativo = true;
    texto = texto.slice(0, -1);
  }
  if (texto.startsWith('-') || texto.startsWith('−')) {
    negativo = true;
    texto = texto.slice(1);
  }

  texto = texto.replace(/[^\d.,]/g, '').trim();
  if (!texto || !/\d/.test(texto)) return null;

  const ultimaComa = texto.lastIndexOf(',');
  const ultimoPunto = texto.lastIndexOf('.');

  let normalizado: string;
  if (ultimaComa > ultimoPunto) {
    // «1.234,56»: la coma es el decimal.
    normalizado = texto.replace(/\./g, '').replace(',', '.');
  } else if (ultimoPunto > ultimaComa) {
    // «1,234.56»: el punto es el decimal.
    normalizado = texto.replace(/,/g, '');
  } else {
    normalizado = texto;
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return null;
  return negativo ? -numero : numero;
}

/** «USD», «U$S», «Dólares» → USD. Cualquier otra cosa se toma como pesos. */
export function parsearMoneda(valor: unknown): string | null {
  const texto = normalizar(aTexto(valor));
  if (!texto) return null;
  if (/(usd|u s|dolar|dolares|dls)/.test(texto)) return 'USD';
  if (/(uyu|peso|pesos|nacional)/.test(texto)) return 'UYU';
  if (/(eur|euro)/.test(texto)) return 'EUR';
  if (/(brl|real|reales)/.test(texto)) return 'BRL';
  if (/(ars|argentin)/.test(texto)) return 'ARS';
  return null;
}

/** Los extractos vienen con espacios de sobra y todo en mayusculas. */
export function limpiarDescripcion(texto: string): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (!limpio) return '';
  // Si viene todo en mayusculas, se pasa a capitalizacion normal: el manual
  // pide sentence case y una lista gritada se lee peor.
  if (limpio === limpio.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{4,}/.test(limpio)) {
    return limpio
      .toLowerCase()
      .replace(/(^|[\s/(-])([a-záéíóúñ])/g, (_, antes, letra) => antes + letra.toUpperCase());
  }
  return limpio;
}
