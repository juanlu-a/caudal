/**
 * Bancos que la app sabe leer.
 *
 * Cada uno exporta lo suyo de una forma distinta. En vez de probar todos los
 * formatos conocidos con cada archivo, la persona dice con qué banco opera y la
 * importación se acopla a eso: menos adivinanza y errores más claros cuando el
 * archivo no es el que corresponde.
 */
export type IdDeBanco = 'itau' | 'santander' | 'brou' | 'prex' | 'midinero';

export type Banco = {
  id: IdDeBanco;
  nombre: string;
  /** Todavía no sabemos leer sus archivos. */
  soportado: boolean;
  /** Qué archivos acepta, en criollo, para mostrar en la zona de archivo. */
  acepta?: string;
};

export const BANCOS: Banco[] = [
  {
    id: 'itau',
    nombre: 'Itaú',
    soportado: true,
    acepta:
      'El estado de cuenta en PDF o en Excel, el resumen de la tarjeta o la consulta de Itaú Link.',
  },
  { id: 'santander', nombre: 'Santander', soportado: false },
  { id: 'brou', nombre: 'BROU', soportado: false },
  { id: 'prex', nombre: 'Prex', soportado: false },
  { id: 'midinero', nombre: 'Mi Dinero', soportado: false },
];

export const BANCO_POR_DEFECTO: IdDeBanco = 'itau';

export function buscarBanco(id: string | null | undefined): Banco {
  return BANCOS.find((b) => b.id === id) ?? BANCOS[0];
}
