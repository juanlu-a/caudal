import type { TextStyle } from 'react-native';

import { color } from './colors';

/**
 * Tipografia de Caudal — manual de marca, seccion 04.
 *
 * Archivo es una grotesca variable con eje de ancho 62-125, pero React Native no
 * soporta ejes variables en runtime. Por eso scripts/build-fonts.py corta instancias
 * estaticas con el ancho exacto que pide el manual y cada una es su propia familia.
 *
 *   Caudal Display  → wdth 118 · wght 700 → cifras grandes y display
 *   Caudal Title    → wdth 106 · wght 620 → titulos
 *   Caudal Text     → wdth 100 · wght 400/550 → cuerpo y etiquetas
 *   Caudal Micro    → wdth 100 · wght 650 → micro en mayusculas
 *
 * IBM Plex Mono aparece solo donde hay cifras en columna.
 */
export const fuente = {
  display: 'CaudalDisplayBold',
  titulo: 'CaudalTitleSemiBold',
  cuerpo: 'CaudalTextRegular',
  etiqueta: 'CaudalTextMedium',
  micro: 'CaudalMicroBold',
  mono: 'IBMPlexMono-Regular',
  monoMedium: 'IBMPlexMono-Medium',
} as const;

/** Cifras tabulares siempre: cualquier texto con un monto usa ancho fijo. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const texto = {
  /** Cifra · 44/44 · tracking −0.035 em */
  cifra: {
    fontFamily: fuente.display,
    fontSize: 44,
    lineHeight: 44,
    letterSpacing: -1.54,
    color: color.texto,
    ...tabular,
  },
  /** Display · 34/38 */
  display: {
    fontFamily: fuente.display,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.95,
    color: color.texto,
  },
  /** Titulo 1 · 26/32 */
  titulo1: {
    fontFamily: fuente.titulo,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.39,
    color: color.texto,
  },
  /** Titulo 2 · 20/26 */
  titulo2: {
    fontFamily: fuente.titulo,
    fontSize: 20,
    lineHeight: 26,
    color: color.texto,
  },
  /** Cuerpo · 17/25 */
  cuerpo: {
    fontFamily: fuente.cuerpo,
    fontSize: 17,
    lineHeight: 25,
    color: color.texto,
  },
  /** Secundario · 15/21 · Bruma */
  secundario: {
    fontFamily: fuente.cuerpo,
    fontSize: 15,
    lineHeight: 21,
    color: color.textoSecundario,
  },
  /** Etiqueta · 13/17 */
  etiqueta: {
    fontFamily: fuente.etiqueta,
    fontSize: 13,
    lineHeight: 17,
    color: color.textoSecundario,
  },
  /** Micro · 11/13 · mayusculas · tracking +0.09 em · Niebla */
  micro: {
    fontFamily: fuente.micro,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0.99,
    textTransform: 'uppercase',
    color: color.textoTerciario,
  },
  /** Cifra en lista · IBM Plex Mono 17/22 */
  cifraLista: {
    fontFamily: fuente.monoMedium,
    fontSize: 17,
    lineHeight: 22,
    color: color.texto,
    ...tabular,
  },
  /** Dato monoespaciado de apoyo: fechas, variaciones, codigos. */
  dato: {
    fontFamily: fuente.mono,
    fontSize: 13,
    lineHeight: 18,
    color: color.textoTerciario,
    ...tabular,
  },
} satisfies Record<string, TextStyle>;

export type EstiloTexto = keyof typeof texto;
