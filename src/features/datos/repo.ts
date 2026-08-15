import { modoDemo } from '../../lib/config';
import type {
  Categoria,
  MovimientoConCategoria,
  Perfil,
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
};

export type CambiosPerfil = {
  display_name?: string;
  currency?: string;
};

/**
 * Toda la app habla con este repositorio y nunca con Supabase directo.
 * Asi el modo demo es un cambio de implementacion, no un `if` en cada pantalla.
 */
export type Repositorio = {
  perfil(): Promise<Perfil | null>;
  actualizarPerfil(cambios: CambiosPerfil): Promise<void>;
  categorias(): Promise<Categoria[]>;
  movimientos(mes?: string, limite?: number): Promise<MovimientoConCategoria[]>;
  movimiento(id: string): Promise<MovimientoConCategoria | null>;
  totales(meses: number): Promise<TotalesDelMes[]>;
  crearMovimiento(nuevo: NuevoMovimiento): Promise<MovimientoConCategoria>;
  borrarMovimiento(id: string): Promise<void>;
};

export const repo: Repositorio = modoDemo ? demo.repositorio : remoto.repositorio;
