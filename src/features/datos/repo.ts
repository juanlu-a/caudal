import { modoDemo } from '../../lib/config';
import type { PlanDeImportacion } from '../importacion/importar';
import type {
  Categoria,
  Cuenta,
  MovimientoConCategoria,
  Perfil,
  SaldoDeCuenta,
  TipoDeCuenta,
  TotalesDelMes,
} from '../../types/database';
import * as demo from './repoDemo';
import * as remoto from './repoSupabase';

export type NuevoMovimiento = {
  /** Ya viene con signo: negativo gasto, positivo ingreso. */
  amount: number;
  occurred_on: string;
  category_id: string | null;
  description: string;
  /** Si no se pasa, va a la primera cuenta bancaria. */
  account_id?: string | null;
};

export type CambiosPerfil = {
  display_name?: string;
  currency?: string;
  bank?: string;
};

export type NuevaCuenta = {
  name: string;
  kind: TipoDeCuenta;
  currency?: string;
  last4?: string | null;
};

export type ResultadoDeImportacion = {
  importados: number;
  omitidos: number;
  /** Pagos de tarjeta convertidos en transferencia entre dos cuentas. */
  transferencias: number;
};

export type OpcionesDeAplicacion = {
  /**
   * Si además se lleva el resumen de la tarjeta aparte, el pago de la tarjeta que
   * aparece en el estado de cuenta no es un gasto: es la misma plata que las
   * compras del resumen. Si no se lleva, ese pago es el único rastro del gasto
   * y tiene que contar como gasto.
   */
  pagosDeTarjetaComoTransferencia?: boolean;
};

/**
 * Toda la app habla con este repositorio y nunca con Supabase directo.
 * Asi el modo demo es un cambio de implementacion, no un `if` en cada pantalla.
 */
export type Repositorio = {
  perfil(): Promise<Perfil | null>;
  actualizarPerfil(cambios: CambiosPerfil): Promise<void>;
  cuentas(): Promise<Cuenta[]>;
  crearCuenta(datos: NuevaCuenta): Promise<Cuenta>;
  saldos(): Promise<SaldoDeCuenta[]>;
  /** De las claves que se le pasan, cuáles ya existen. */
  clavesExistentes(claves: string[]): Promise<Set<string>>;
  aplicarImportacion(
    plan: PlanDeImportacion,
    opciones?: OpcionesDeAplicacion,
  ): Promise<ResultadoDeImportacion>;
  categorias(): Promise<Categoria[]>;
  movimientos(mes?: string, limite?: number): Promise<MovimientoConCategoria[]>;
  movimiento(id: string): Promise<MovimientoConCategoria | null>;
  /** `desplazamiento` corre la ventana: 0 termina en el mes actual, -1 en el anterior. */
  totales(meses: number, desplazamiento?: number): Promise<TotalesDelMes[]>;
  crearMovimiento(nuevo: NuevoMovimiento): Promise<MovimientoConCategoria>;
  borrarMovimiento(id: string): Promise<void>;
};

export const repo: Repositorio = modoDemo ? demo.repositorio : remoto.repositorio;
