import { aFechaISO, inicioDeMes, sumarMeses } from '../../lib/format';
import { pedirSupabase } from '../../lib/supabase';
import type { MovimientoConCategoria, TotalesDelMes } from '../../types/database';
import type { Repositorio } from './repo';

const SELECT_MOVIMIENTO =
  'id, user_id, occurred_on, amount, category_id, description, created_at, categories (id, name, icon_key, color_index)';

export const repositorio: Repositorio = {
  async perfil() {
    const { data, error } = await pedirSupabase().from('profiles').select('*').maybeSingle();
    if (error) throw error;
    return data;
  },

  async actualizarPerfil(cambios) {
    const supabase = pedirSupabase();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('La sesión venció. Volvé a ingresar.');

    const { error } = await supabase.from('profiles').update(cambios).eq('id', user.user.id);
    if (error) throw error;
  },

  async categorias() {
    const { data, error } = await pedirSupabase()
      .from('categories')
      .select('*')
      .eq('archived', false)
      .order('sort_order');
    if (error) throw error;
    return data ?? [];
  },

  async movimientos(mes, limite = 200) {
    let q = pedirSupabase()
      .from('transactions')
      .select(SELECT_MOVIMIENTO)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limite);

    if (mes) {
      q = q.gte('occurred_on', mes).lt('occurred_on', aFechaISO(sumarMeses(new Date(mes), 1)));
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as unknown as MovimientoConCategoria[];
  },

  async movimiento(id) {
    const { data, error } = await pedirSupabase()
      .from('transactions')
      .select(SELECT_MOVIMIENTO)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as unknown as MovimientoConCategoria | null;
  },

  async totales(meses) {
    const desde = inicioDeMes(sumarMeses(new Date(), -(meses - 1)));
    const { data, error } = await pedirSupabase()
      .from('monthly_totals')
      .select('*')
      .gte('month', desde)
      .order('month');
    if (error) throw error;

    // La vista solo trae los meses con movimientos: los huecos se completan en cero
    // para que el grafico no cambie de forma segun cuanto se gasto.
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

  async crearMovimiento(nuevo) {
    const supabase = pedirSupabase();
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

  async borrarMovimiento(id) {
    const { error } = await pedirSupabase().from('transactions').delete().eq('id', id);
    if (error) throw error;
  },
};
