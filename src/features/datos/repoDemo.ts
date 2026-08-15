import AsyncStorage from '@react-native-async-storage/async-storage';

import { aFechaISO, inicioDeMes, sumarMeses } from '../../lib/format';
import type {
  Categoria,
  MovimientoConCategoria,
  Perfil,
  TotalesDelMes,
} from '../../types/database';
import type { Repositorio } from './repo';

/**
 * Backend local para correr la app sin Supabase.
 * Persiste en AsyncStorage: los datos no salen del telefono y se borran
 * reinstalando la app. Misma forma de datos que el repositorio remoto.
 */
const CLAVE = 'caudal.demo.v2';
const USUARIO = 'demo';

type Estado = {
  perfil: Perfil;
  categorias: Categoria[];
  movimientos: MovimientoConCategoria[];
};

let cache: Estado | null = null;

const CATEGORIAS: Array<[string, string, number]> = [
  ['Alimentos', 'alimentos', 0],
  ['Transporte', 'transporte', 1],
  ['Vivienda', 'vivienda', 2],
  ['Compras', 'compras', 3],
  ['Salud', 'salud', 4],
  ['Ocio', 'ocio', 5],
  ['Servicios', 'servicios', 6],
  ['Otros', 'otros', 7],
];

/** Movimientos de ejemplo, iguales en cada instalacion: sin azar, para poder comparar. */
const SEMILLA: Array<[number, number, string, number]> = [
  // [meses atras, dia del mes, categoria, monto con signo]
  [0, 13, 'Otros', 62_000],
  [0, 14, 'Alimentos', -2_480],
  [0, 12, 'Transporte', -3_200],
  [0, 8, 'Vivienda', -21_000],
  [0, 5, 'Ocio', -1_850],
  [1, 13, 'Otros', 62_000],
  [1, 20, 'Alimentos', -18_400],
  [1, 9, 'Vivienda', -21_000],
  [1, 3, 'Servicios', -4_100],
  [2, 13, 'Otros', 58_000],
  [2, 17, 'Alimentos', -16_900],
  [2, 6, 'Vivienda', -20_500],
  [3, 13, 'Otros', 58_000],
  [3, 11, 'Compras', -9_300],
  [3, 4, 'Vivienda', -20_500],
  [4, 13, 'Otros', 55_000],
  [4, 15, 'Alimentos', -15_200],
  [5, 13, 'Otros', 55_000],
  [5, 7, 'Salud', -6_800],
  [6, 13, 'Otros', 52_000],
  [6, 19, 'Transporte', -5_400],
];

function id(prefijo: string, n: number): string {
  return `${prefijo}-${String(n).padStart(4, '0')}`;
}

function sembrar(): Estado {
  const ahora = new Date().toISOString();
  const categorias: Categoria[] = CATEGORIAS.map(([name, icon_key, color_index], i) => ({
    id: id('cat', i),
    user_id: USUARIO,
    name,
    icon_key,
    color_index,
    sort_order: i,
    archived: false,
    created_at: ahora,
  }));

  const porNombre = new Map(categorias.map((c) => [c.name, c]));
  const hoy = new Date();

  const movimientos: MovimientoConCategoria[] = SEMILLA.map(
    ([mesesAtras, dia, nombre, amount], i) => {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - mesesAtras, dia);
      // Nunca sembrar en el futuro: el mes en curso solo tiene lo que ya paso.
      if (fecha > hoy) fecha.setMonth(fecha.getMonth() - 1);
      const categoria = porNombre.get(nombre)!;

      return {
        id: id('mov', i),
        user_id: USUARIO,
        occurred_on: aFechaISO(fecha),
        amount,
        category_id: amount > 0 ? null : categoria.id,
        description: amount > 0 ? 'Sueldo' : descripcionDe(nombre),
        created_at: fecha.toISOString(),
        categories:
          amount > 0
            ? null
            : {
                id: categoria.id,
                name: categoria.name,
                icon_key: categoria.icon_key,
                color_index: categoria.color_index,
              },
      };
    },
  );

  return {
    perfil: {
      id: USUARIO,
      display_name: 'Invitado',
      currency: 'UYU',
      created_at: ahora,
    },
    categorias,
    movimientos,
  };
}

function descripcionDe(categoria: string): string {
  const mapa: Record<string, string> = {
    Alimentos: 'Supermercado',
    Transporte: 'Nafta',
    Vivienda: 'Alquiler',
    Compras: 'Ropa',
    Salud: 'Farmacia',
    Ocio: 'Cine',
    Servicios: 'Internet',
    Otros: 'Varios',
  };
  return mapa[categoria] ?? '';
}

async function leer(): Promise<Estado> {
  if (cache) return cache;
  const guardado = await AsyncStorage.getItem(CLAVE);
  cache = guardado ? (JSON.parse(guardado) as Estado) : sembrar();
  if (!guardado) await guardar(cache);
  return cache;
}

async function guardar(estado: Estado): Promise<void> {
  cache = estado;
  await AsyncStorage.setItem(CLAVE, JSON.stringify(estado));
}

function ordenar(movimientos: MovimientoConCategoria[]): MovimientoConCategoria[] {
  return [...movimientos].sort((a, b) =>
    a.occurred_on === b.occurred_on
      ? b.created_at.localeCompare(a.created_at)
      : b.occurred_on.localeCompare(a.occurred_on),
  );
}

export const repositorio: Repositorio = {
  async perfil() {
    return (await leer()).perfil;
  },

  async actualizarPerfil(cambios) {
    const estado = await leer();
    await guardar({ ...estado, perfil: { ...estado.perfil, ...cambios } });
  },

  async categorias() {
    return (await leer()).categorias.filter((c) => !c.archived);
  },

  async movimientos(mes, limite = 200) {
    const estado = await leer();
    const lista = ordenar(estado.movimientos).filter((m) => {
      if (!mes) return true;
      const hasta = aFechaISO(sumarMeses(new Date(mes), 1));
      return m.occurred_on >= mes && m.occurred_on < hasta;
    });
    return lista.slice(0, limite);
  },

  async movimiento(id) {
    return (await leer()).movimientos.find((m) => m.id === id) ?? null;
  },

  async totales(meses) {
    const estado = await leer();
    const acumulado = new Map<string, TotalesDelMes>();

    for (const m of estado.movimientos) {
      const mes = inicioDeMes(new Date(m.occurred_on));
      const actual =
        acumulado.get(mes) ??
        ({
          user_id: USUARIO,
          month: mes,
          ingresos: 0,
          gastos: 0,
          saldo: 0,
          movimientos: 0,
        } satisfies TotalesDelMes);

      if (m.amount > 0) actual.ingresos += m.amount;
      else actual.gastos += -m.amount;
      actual.saldo += m.amount;
      actual.movimientos += 1;
      acumulado.set(mes, actual);
    }

    return Array.from({ length: meses }, (_, i) => {
      const mes = inicioDeMes(sumarMeses(new Date(), -(meses - 1 - i)));
      return (
        acumulado.get(mes) ?? {
          user_id: USUARIO,
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
    const estado = await leer();
    const categoria = estado.categorias.find((c) => c.id === nuevo.category_id) ?? null;

    const movimiento: MovimientoConCategoria = {
      id: `mov-${Date.now()}`,
      user_id: USUARIO,
      occurred_on: nuevo.occurred_on,
      amount: nuevo.amount,
      category_id: categoria?.id ?? null,
      description: nuevo.description,
      created_at: new Date().toISOString(),
      categories: categoria
        ? {
            id: categoria.id,
            name: categoria.name,
            icon_key: categoria.icon_key,
            color_index: categoria.color_index,
          }
        : null,
    };

    await guardar({ ...estado, movimientos: [movimiento, ...estado.movimientos] });
    return movimiento;
  },

  async borrarMovimiento(id) {
    const estado = await leer();
    await guardar({
      ...estado,
      movimientos: estado.movimientos.filter((m) => m.id !== id),
    });
  },
};
