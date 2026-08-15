/**
 * Paleta de Caudal — manual de marca, seccion 03.
 *
 * El azul es el cauce: sostiene, no compite, ocupa casi toda la superficie.
 * El verde es el caudal: aparece solo donde hay movimiento o accion.
 * Proporcion obligatoria por pieza: 70% azules, 18% neutros, 9% verde, 3% arena.
 */

export const palette = {
  // Azules · estructura
  abismo: '#04121F', // fondo mas profundo, tinta sobre verde
  fondeo: '#071B2F', // fondo base de la marca
  marea: '#0C2740', // superficies y bloques
  rada: '#123753', // segundo plano, bordes
  corriente: '#1B5079', // estados activos, graficos
  azulCaudal: '#2A7BB5', // azul de marca sobre fondo claro

  // Verdes · accion y movimiento
  verdeCaudal: '#33D69F', // acento principal, ingresos
  espumaVerde: '#66E6BC', // realce, brillo, hover
  bajio: '#0E7A57', // verde legible sobre claro

  // Terciarios · uso restringido
  arena: '#E0B274', // avisos suaves, limites
  coral: '#FF7A66', // solo errores y acciones destructivas

  // Neutros
  espuma: '#F2F7FA', // texto principal, cifras
  bruma: '#B7C9D8', // texto secundario
  niebla: '#7A93A8', // etiquetas, fechas, apoyos
  humo: '#4A6377', // separadores, elementos apagados
} as const;

/**
 * Roles semanticos. Las pantallas usan estos, no la paleta cruda:
 * asi la regla "un gasto no es un error" queda en un solo lugar.
 */
export const color = {
  fondo: palette.fondeo,
  superficie: palette.marea,
  superficieElevada: palette.rada,
  borde: 'rgba(183,201,216,0.11)',
  bordeFuerte: 'rgba(183,201,216,0.18)',
  separador: 'rgba(183,201,216,0.09)',

  texto: palette.espuma,
  textoSecundario: palette.bruma,
  textoTerciario: palette.niebla,
  textoApagado: palette.humo,

  acento: palette.verdeCaudal,
  acentoRealce: palette.espumaVerde,

  /** Ingreso: verde, siempre acompanado del signo «+». */
  ingreso: palette.verdeCaudal,
  /** Gasto: neutro, con «−». Nunca rojo — gastar no es un error. */
  gasto: palette.espuma,
  /** Desde el 85% del tope. */
  cercaDelLimite: palette.arena,
  /** Solo errores reales y acciones destructivas. */
  error: palette.coral,
  /** Pendiente o sin asignar: neutro, nunca alarmante. */
  pendiente: palette.humo,
} as const;

/**
 * Rampa para categorias — manual seccion 08.
 * Del azul de marca al arena, pasando por el verde. Ocho pasos, en este orden.
 * El Verde Caudal puro nunca se usa aca: esta reservado a los ingresos.
 */
export const rampaCategorias = [
  '#2A7BB5',
  '#3E93B8',
  '#4FAFB0',
  '#5FC4A1',
  '#8AC7A0',
  '#C2BE8E',
  '#E0B274',
  '#C98F73',
] as const;

export function colorDeCategoria(index: number | null | undefined): string {
  if (index == null) return color.pendiente;
  return rampaCategorias[((index % rampaCategorias.length) + rampaCategorias.length) % rampaCategorias.length];
}
