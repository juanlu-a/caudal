import { File } from 'expo-file-system';
import * as XLSX from 'xlsx';

import { buscarBanco, type IdDeBanco } from './bancos';
import { leerEstadoDeCuenta, leerLinkDeItau, leerResumenDeTarjeta } from './itau';
import { leerPdf, type LineaDePdf } from './pdf';
import { interpretar, type Matriz } from './parser';
import { ErrorDeArchivo, type Lectura, type OrigenDeArchivo } from './tipos';

export type ArchivoElegido = {
  nombre: string;
  bytes: Uint8Array;
};

/** Lo que deja elegir el selector del sistema. */
const TIPOS = [
  'com.adobe.pdf',
  'com.microsoft.excel.xls',
  'org.openxmlformats.spreadsheetml.sheet',
  'public.comma-separated-values-text',
];

/**
 * Abre el selector de archivos del sistema. En iOS devuelve una copia temporal,
 * así que el original del banco queda intacto.
 */
export async function elegirArchivo(): Promise<ArchivoElegido | null> {
  const { result, canceled } = await File.pickFileAsync({ mimeTypes: TIPOS });
  if (canceled || !result) return null;

  return { nombre: result.name, bytes: await result.bytes() };
}

export type OpcionesDeArchivo = {
  /** Si no se dice qué es el archivo, se deduce del contenido. */
  origen?: OrigenDeArchivo;
  monedaPorDefecto?: string;
  /** Con qué banco opera la persona. Define qué lectores se prueban. */
  banco?: IdDeBanco;
};

/** Los lectores de cada banco, en orden de exigencia. */
const LECTORES: Partial<Record<IdDeBanco, ((lineas: LineaDePdf[]) => Lectura)[]>> = {
  itau: [leerEstadoDeCuenta, leerLinkDeItau, leerResumenDeTarjeta],
};

/**
 * Lee el archivo del banco, sea el PDF del estado de cuenta o una planilla.
 * Todo pasa acá: la pantalla no necesita saber de qué formato se trata.
 *
 * El PDF es el formato preferido porque trae los saldos: al reconstruirlo se
 * controla que la suma de los movimientos dé exactamente el saldo que informa el
 * banco, y si no da, se avisa en vez de importar cifras mal leídas.
 */
export async function leerArchivo(
  archivo: ArchivoElegido,
  opciones: OpcionesDeArchivo,
): Promise<Lectura> {
  const esPdf =
    /\.pdf$/i.test(archivo.nombre) ||
    (archivo.bytes[0] === 0x25 && archivo.bytes[1] === 0x50); // «%P» de %PDF

  if (esPdf) {
    const lineas = await leerPdf(archivo.bytes);
    if (opciones.origen === 'tarjeta') return leerResumenDeTarjeta(lineas);
    if (opciones.origen === 'cuenta') return leerEstadoDeCuenta(lineas);

    const banco = buscarBanco(opciones.banco);
    const lectores = LECTORES[banco.id];
    if (!lectores) {
      throw new ErrorDeArchivo(
        `Todavía no sabemos leer los archivos de ${banco.nombre}. Cambiá el banco en Ajustes o cargá los movimientos a mano.`,
      );
    }

    // Cada lector pide marcas propias, así que el que reconoce el archivo es el
    // correcto: no hace falta decir de antemano qué documento es.
    for (const leer of lectores) {
      try {
        return leer(lineas);
      } catch (e) {
        if (!(e instanceof ErrorDeArchivo)) throw e;
      }
    }

    throw new ErrorDeArchivo(
      `No se reconoce el PDF como un archivo de ${banco.nombre}. Tiene que ser el que descargás del banco, sin editar.`,
    );
  }

  // Una planilla no se puede deducir: sin dato, se asume estado de cuenta.
  return leerPlanilla(archivo.bytes, { ...opciones, origen: opciones.origen ?? 'cuenta' });
}

/** Cada hoja del libro como matriz de celdas. */
function hojasDe(bytes: Uint8Array): { nombre: string; matriz: Matriz }[] {
  let libro: XLSX.WorkBook;
  try {
    libro = XLSX.read(bytes, { type: 'array', cellDates: true, raw: false });
  } catch {
    throw new ErrorDeArchivo(
      'No se pudo abrir el archivo. Tiene que ser el PDF o la planilla que descargás del banco, sin editar.',
    );
  }

  return libro.SheetNames.map((nombre) => ({
    nombre,
    matriz: XLSX.utils.sheet_to_json<unknown[]>(libro.Sheets[nombre], {
      header: 1,
      raw: true,
      defval: '',
      blankrows: false,
    }),
  }));
}

/**
 * Planillas. Prueba hoja por hoja y se queda con la primera que tenga una tabla
 * de movimientos reconocible: los extractos suelen traer una portada antes.
 */
function leerPlanilla(
  bytes: Uint8Array,
  opciones: OpcionesDeArchivo & { origen: OrigenDeArchivo },
): Lectura {
  const hojas = hojasDe(bytes);
  if (hojas.length === 0) throw new ErrorDeArchivo('El archivo no tiene ninguna hoja con datos.');

  let ultimoError: ErrorDeArchivo | null = null;

  for (const hoja of hojas) {
    try {
      const resultado = interpretar(hoja.matriz, opciones);
      const avisos = [...resultado.avisos];
      if (hojas.length > 1) avisos.push(`Se leyó la hoja «${hoja.nombre}».`);

      return {
        origen: resultado.origen,
        desde: resultado.desde,
        hasta: resultado.hasta,
        avisos,
        secciones: [
          {
            moneda: resultado.moneda ?? opciones.monedaPorDefecto ?? 'UYU',
            identificador: null,
            filas: resultado.filas,
            // Una planilla no trae saldos con que controlar la lectura.
            apertura: null,
            cierre: null,
            descuadre: null,
          },
        ],
      };
    } catch (e) {
      if (e instanceof ErrorDeArchivo) ultimoError = e;
      else throw e;
    }
  }

  throw ultimoError ?? new ErrorDeArchivo('El archivo no tiene columnas de fecha e importe.');
}
