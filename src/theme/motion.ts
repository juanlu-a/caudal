import { Easing } from 'react-native-reanimated';

/**
 * Movimiento — manual de marca, seccion 09.
 *
 * El movimiento de Caudal imita el agua, no la goma: entra con impulso y se frena
 * suave. Nunca hay overshoot elastico ni resortes. La plata no rebota.
 */
export const duracion = {
  /** Microinteraccion, respuesta al toque. */
  rapido: 120,
  /** Transicion entre estados o vistas. */
  normal: 240,
  /** Aparicion de una pieza completa. */
  entrada: 400,
} as const;

/** Salida acelerada, llegada desacelerada. Siempre asimetrica, nunca elastica. */
export const curva = Easing.bezier(0.22, 0.61, 0.36, 1);

export const transicion = {
  rapido: { duration: duracion.rapido, easing: curva },
  normal: { duration: duracion.normal, easing: curva },
  entrada: { duration: duracion.entrada, easing: curva },
} as const;
