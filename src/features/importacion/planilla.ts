import { File } from 'expo-file-system';
import * as XLSX from 'xlsx';

import { interpretar, type Matriz, type OpcionesDeLectura } from './parser';
import { ErrorDeArchivo, type ResultadoDeLectura } from './tipos';

export type ArchivoElegido = {
  nombre: string;
  base64: string;
};

/** Lo que Files deja elegir: planillas de Excel y CSV. */
const TIPOS = [
  'com.microsoft.excel.xls',
  'org.openxmlformats.spreadsheetml.sheet',
  'public.comma-separated-values-text',
  'public.plain-text',
];

/**
 * Abre el selector de archivos del sistema. En iOS devuelve una copia temporal,
 * asi que el original del banco queda intacto.
 */
export async function elegirArchivo(): Promise<ArchivoElegido | null> {
  const { result, canceled } = await File.pickFileAsync({ mimeTypes: TIPOS });
  if (canceled || !result) return null;

  const base64 = await result.base64();
  return { nombre: result.name, base64 };
}

/** Cada hoja del libro como matriz de celdas. */
function hojasDe(base64: string): { nombre: string; matriz: Matriz }[] {
  let libro: XLSX.WorkBook;
  try {
    libro = XLSX.read(base64, { type: 'base64', cellDates: true, raw: false });
  } catch {
    throw new ErrorDeArchivo(
      'No se pudo abrir el archivo. Tiene que ser el Excel o el CSV que descargás del banco, sin editar.',
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
 * Lee el archivo y devuelve los movimientos. Prueba hoja por hoja y se queda con
 * la primera que tenga una tabla de movimientos reconocible: los extractos suelen
 * traer una hoja de portada antes de los datos.
 */
export function leerPlanilla(base64: string, opciones: OpcionesDeLectura): ResultadoDeLectura {
  const hojas = hojasDe(base64);
  if (hojas.length === 0) throw new ErrorDeArchivo('El archivo no tiene ninguna hoja con datos.');

  let ultimoError: ErrorDeArchivo | null = null;

  for (const hoja of hojas) {
    try {
      const resultado = interpretar(hoja.matriz, opciones);
      if (hojas.length > 1) {
        resultado.avisos.push(`Se leyó la hoja «${hoja.nombre}».`);
      }
      return resultado;
    } catch (e) {
      if (e instanceof ErrorDeArchivo) ultimoError = e;
      else throw e;
    }
  }

  throw (
    ultimoError ??
    new ErrorDeArchivo('El archivo no tiene columnas de fecha e importe.')
  );
}
