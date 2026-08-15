import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aFechaISO, inicioDeMes, sumarMeses } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type {
  Categoria,
  MovimientoConCategoria,
  Perfil,
  TotalesDelMes,
} from '../../types/database';

export const claves = {
  perfil: ['perfil'] as const,
  categorias: ['categorias'] as const,
  movimientos: (mes?: string) => ['movimientos', mes ?? 'todos'] as const,
  totales: ['totales'] as const,
};

const SELECT_MOVIMIENTO =
  'id, user_id, occurred_on, amount, category_id, description, created_at, categories (id, name, icon_key, color_index)';

export function usePerfil() {
  return useQuery({
    queryKey: claves.perfil,
    queryFn: async (): Promise<Perfil | null> => {
      const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCategorias() {
  return useQuery({
    queryKey: claves.categorias,
    queryFn: async (): Promise<Categoria[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('archived', false)
        .order('sort_order');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Movimientos de un mes (ISO del primer dia) o los ultimos si no se pasa mes. */
export function useMovimientos(mes?: string, limite = 200) {
  return useQuery({
    queryKey: claves.movimientos(mes),
    queryFn: async (): Promise<MovimientoConCategoria[]> => {
      let q = supabase
        .from('transactions')
        .select(SELECT_MOVIMIENTO)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limite);

      if (mes) {
        const desde = mes;
        const hasta = aFechaISO(sumarMeses(new Date(mes), 1));
        q = q.gte('occurred_on', desde).lt('occurred_on', hasta);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as MovimientoConCategoria[];
    },
  });
}

/** Totales de los ultimos N meses, del mas viejo al mas nuevo, sin huecos. */
export function useTotales(meses = 7) {
  return useQuery({
    queryKey: [...claves.totales, meses],
    queryFn: async (): Promise<TotalesDelMes[]> => {
      const desde = inicioDeMes(sumarMeses(new Date(), -(meses - 1)));
      const { data, error } = await supabase
        .from('monthly_totals')
        .select('*')
        .gte('month', desde)
        .order('month');
      if (error) throw error;

      const porMes = new Map((data ?? []).map((f) => [f.month, f as TotalesDelMes]));
      return Array.from({ length: meses }, (_, i) => {
        const mes = inicioDeMes(sumarMeses(new Date(), -(meses - 1 - i)));
        return (
          porMes.get(mes) ?? {
            user_id: '',
            month: mes,
            ingresos: 0,
            gastos: 0,
            saldo: 0,
            movimientos: 0,
          }
        );
      });
    },
  });
}

export function useMovimiento(id: string) {
  return useQuery({
    queryKey: ['movimiento', id],
    queryFn: async (): Promise<MovimientoConCategoria | null> => {
      const { data, error } = await supabase
        .from('transactions')
        .select(SELECT_MOVIMIENTO)
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as MovimientoConCategoria | null;
    },
  });
}

export function useActualizarPerfil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cambios: { display_name?: string; currency?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('La sesión venció. Volvé a ingresar.');

      const { error } = await supabase.from('profiles').update(cambios).eq('id', user.user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claves.perfil }),
  });
}

export type NuevoMovimiento = {
  /** Ya viene con signo: negativo gasto, positivo ingreso. */
  amount: number;
  occurred_on: string;
  category_id: string | null;
  description: string;
};

export function useCrearMovimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nuevo: NuevoMovimiento) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('La sesión venció. Volvé a ingresar.');

      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...nuevo, user_id: user.user.id })
        .select(SELECT_MOVIMIENTO)
        .single();
      if (error) throw error;
      return data as unknown as MovimientoConCategoria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: claves.totales });
    },
  });
}

export function useBorrarMovimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: claves.totales });
    },
  });
}
