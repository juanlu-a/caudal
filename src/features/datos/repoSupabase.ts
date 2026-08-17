import { aFechaISO, inicioDeMes, parseFechaISO, sumarMeses } from '../../lib/format';
import { pedirSupabase } from '../../lib/supabase';
import type {
  Database,
  MovimientoConCategoria,
  TotalesDelMes,
} from '../../types/database';
import type { Repositorio } from './repo';

type NuevaFila = Database['public']['Tables']['transactions']['Insert'];

const SELECT_MOVIMIENTO =
  'id, user_id, occurred_on, amount, category_id, description, created_at, categories (id, name, icon_key, color_index)';

async function idDeUsuario(): Promise<string> {
  const { data } = await pedirSupabase().auth.getUser();
  if (!data.user) throw new Error('La sesión venció. Volvé a ingresar.');
  return data.user.id;
}

export const repositorio: Repositorio = {
  async perfil() {
    const { data, error } = await pedirSupabase().from('profiles').select('*').maybeSingle();
    if (error) throw error;
    return data;
  },

  async cuentas() {
    const { data, error } = await pedirSupabase()
      .from('accounts')
      .select('*')
      .eq('archived', false)
      .order('created_at');
    if (error) throw error;
    return data ?? [];
  },

  async crearCuenta(datos) {
    const { data, error } = await pedirSupabase()
      .from('accounts')
      .insert({ ...datos, user_id: await idDeUsuario() })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async saldos() {
    const { data, error } = await pedirSupabase().from('account_balances').select('*').order('name');
    if (error) throw error;
    return data ?? [];
  },

  async clavesExistentes(claves) {
    const encontradas = new Set<string>();
    // El `in` de Postgres tiene limite practico: se pregunta de a tandas.
    for (let i = 0; i < claves.length; i += 300) {
      const tanda = claves.slice(i, i + 300);
      const { data, error } = await pedirSupabase()
        .from('transactions')
        .select('external_key')
        .in('external_key', tanda);
      if (error) throw error;
      for (const fila of data ?? []) {
        if (fila.external_key) encontradas.add(fila.external_key);
      }
    }
    return encontradas;
  },

  async aplicarImportacion(plan, opciones = {}) {
    const supabase = pedirSupabase();
    const userId = await idDeUsuario();
    const nuevos = plan.movimientos.filter((m) => !m.duplicado);

    const { data: importacion, error: errorImport } = await supabase
      .from('imports')
      .insert({
        user_id: userId,
        account_id: plan.cuentaId,
        source: `itau-${plan.origen}`,
        file_name: plan.archivo,
        period_start: plan.desde,
        period_end: plan.hasta,
        rows_total: plan.movimientos.length,
        rows_imported: nuevos.length,
        rows_skipped: plan.duplicados,
      })
      .select('id')
      .single();
    if (errorImport) throw errorImport;

    // En el resumen de la tarjeta el pago recibido siempre es transferencia:
    // nadie gana plata con su tarjeta.
    const comoTransferencia =
      plan.origen === 'tarjeta' || opciones.pagosDeTarjetaComoTransferencia === true;
    const filas: NuevaFila[] = [];
    let transferencias = 0;

    for (const movimiento of nuevos) {
      const esTransferencia = movimiento.pagoDeTarjeta && comoTransferencia;
      if (esTransferencia) transferencias++;

      filas.push({
        user_id: userId,
        account_id: plan.cuentaId,
        occurred_on: movimiento.fila.fecha,
        amount: movimiento.fila.monto,
        description: movimiento.fila.descripcion,
        category_id: movimiento.categoriaId,
        import_id: importacion.id,
        external_key: movimiento.clave,
        is_transfer: esTransferencia,
      });
    }

    let importados = 0;
    for (let i = 0; i < filas.length; i += 200) {
      const { data, error } = await supabase
        .from('transactions')
        .upsert(filas.slice(i, i + 200), {
          onConflict: 'user_id,external_key',
          ignoreDuplicates: true,
        })
        .select('id');
      if (error) throw error;
      importados += data?.length ?? 0;
    }

    return { importados, omitidos: plan.duplicados, transferencias };
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
      // parseFechaISO y no new Date(mes): la fecha ISO se parsea en UTC y al oeste
      // de Greenwich cae el dia anterior, con lo que el rango del mes queda vacio.
      q = q.gte('occurred_on', mes).lt('occurred_on', aFechaISO(sumarMeses(parseFechaISO(mes), 1)));
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

  async totales(meses, desplazamiento = 0) {
    const desde = inicioDeMes(sumarMeses(new Date(), desplazamiento - (meses - 1)));
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
      const mes = inicioDeMes(sumarMeses(new Date(), desplazamiento - (meses - 1 - i)));
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
