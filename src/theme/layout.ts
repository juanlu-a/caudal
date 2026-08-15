/**
 * Composicion — manual de marca, seccion 06.
 * Unidad base 4. Ningun valor intermedio: el tipo lo impide a proposito.
 */
export const espacio = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  14: 56,
  18: 72,
} as const;

export type Espacio = (typeof espacio)[keyof typeof espacio];

/** Margen exterior de cualquier pieza: nunca baja de 20. */
export const margenPantalla = espacio[5];

/**
 * El radio es lenguaje de marca: cuanto mas grande el elemento, mas redondo.
 */
export const radio = {
  chip: 10,
  campo: 14,
  tarjeta: 20,
  panel: 28,
  pildora: 999,
} as const;

/** Area tactil minima, aunque el icono sea de 24 — seccion 11. */
export const areaTactilMinima = 44;

/** Metrica de iconos — seccion 07. */
export const icono = {
  grilla: 24,
  trazo: 1.75,
  circulo: 44,
} as const;
