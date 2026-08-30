import AsyncStorage from '@react-native-async-storage/async-storage';

import { aFechaISO, inicioDeMes, parseFechaISO, sumarMeses } from '../../lib/format';
import { uuid } from '../../lib/uuid';
import type {
  Categoria,
  Cuenta,
  MovimientoConCategoria,
  Perfil,
  SaldoDeCuenta,
  TotalesDelMes,
} from '../../types/database';
import type { Repositorio } from './repo';

/**
 * Backend local para correr la app sin Supabase.
 * Persiste en AsyncStorage: los datos no salen del telefono y se borran
 * reinstalando la app. Misma forma de datos que el repositorio remoto.
 */
const CLAVE = 'caudal.demo.v3';
const USUARIO = 'demo';

type Estado = {
  perfil: Perfil;
  cuentas: Cuenta[];
  categorias: Categoria[];
  movimientos: MovimientoConCategoria[];
};

let cache: Estado | null = null;

const CATEGORIAS: [string, string, number][] = [
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
const SEMILLA: [number, number, string, number][] = [
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

  const cuentas: Cuenta[] = [
    {
      id: id('cta', 0),
      user_id: USUARIO,
      name: 'Cuenta',
      kind: 'bank',
      currency: 'UYU',
      last4: null,
      external_number: null,
      confirmed_balance: null,
      confirmed_on: null,
      archived: false,
      created_at: ahora,
    },
  ];

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
        account_id: cuentas[0].id,
        is_transfer: false,
        import_id: null,
        external_key: null,
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
      bank: 'itau',
      created_at: ahora,
    },
    cuentas,
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

  async cuentas() {
    return (await leer()).cuentas.filter((c) => !c.archived);
  },

  async crearCuenta(datos) {
    const estado = await leer();
    const cuenta: Cuenta = {
      id: uuid(),
      user_id: USUARIO,
      name: datos.name,
      kind: datos.kind,
      currency: datos.currency ?? estado.perfil.currency,
      last4: datos.last4 ?? null,
      external_number: datos.external_number ?? null,
      confirmed_balance: null,
      confirmed_on: null,
      archived: false,
      created_at: new Date().toISOString(),
    };
    await guardar({ ...estado, cuentas: [...estado.cuentas, cuenta] });
    return cuenta;
  },

  async saldos() {
    const estado = await leer();
    return estado.cuentas
      .filter((c) => !c.archived)
      .map((cuenta): SaldoDeCuenta => {
        const suyos = estado.movimientos.filter((m) => m.account_id === cuenta.id);
        return {
          user_id: USUARIO,
          account_id: cuenta.id,
          name: cuenta.name,
          kind: cuenta.kind,
          currency: cuenta.currency,
          confirmed_balance: cuenta.confirmed_balance,
          confirmed_on: cuenta.confirmed_on,
          // El saldo arranca del último que confirmó el banco y suma solo lo
          // posterior: ese número ya incluye todo lo de antes, lo tengamos
          // cargado o no. Se redondea porque sumar decimales en coma flotante
          // deja restos; Postgres usa numeric y no tiene el problema.
          saldo:
            Math.round(
              suyos
                .filter((m) => !cuenta.confirmed_on || m.occurred_on > cuenta.confirmed_on)
                .reduce((suma, m) => suma + Number(m.amount), cuenta.confirmed_balance ?? 0) * 100,
            ) / 100,
          movimientos: suyos.length,
          ultimo_movimiento: suyos.map((m) => m.occurred_on).sort().at(-1) ?? null,
        };
      });
  },

  async clavesExistentes(claves) {
    const estado = await leer();
    const todas = new Set(
      estado.movimientos.map((m) => m.external_key).filter((k): k is string => !!k),
    );
    return new Set(claves.filter((c) => todas.has(c)));
  },

  async aplicarImportacion(plan, opciones = {}) {
    const estado = await leer();
    const nuevos = plan.movimientos.filter((m) => !m.duplicado);
    // En el resumen de la tarjeta el pago recibido siempre es transferencia:
    // nadie gana plata con su tarjeta.
    const comoTransferencia =
      plan.origen === 'tarjeta' || opciones.pagosDeTarjetaComoTransferencia === true;

    const yaEstan = new Set(
      estado.movimientos.map((m) => m.external_key).filter((k): k is string => !!k),
    );

    const importId = uuid();
    const agregados: MovimientoConCategoria[] = [];
    let transferencias = 0;

    for (const movimiento of nuevos) {
      if (yaEstan.has(movimiento.clave)) continue;
      yaEstan.add(movimiento.clave);

      const categoria = estado.categorias.find((c) => c.id === movimiento.categoriaId) ?? null;
      // Un traspaso entre cuentas propias siempre es plata que solo cambia de
      // lugar. El pago de tarjeta, en cambio, depende de si además se lleva el
      // resumen: si no, ese pago es el único rastro del gasto.
      const esTransferencia =
        movimiento.entreCuentasPropias || (movimiento.pagoDeTarjeta && comoTransferencia);
      if (esTransferencia) transferencias++;

      agregados.push({
        id: uuid(),
        user_id: USUARIO,
        occurred_on: movimiento.fila.fecha,
        amount: movimiento.fila.monto,
        category_id: categoria?.id ?? null,
        description: movimiento.fila.descripcion,
        created_at: new Date().toISOString(),
        account_id: plan.cuentaId,
        is_transfer: esTransferencia,
        import_id: importId,
        external_key: movimiento.clave,
        categories: categoria
          ? {
              id: categoria.id,
              name: categoria.name,
              icon_key: categoria.icon_key,
              color_index: categoria.color_index,
            }
          : null,
      });
    }

    // El saldo que informa el extracto es la verdad más reciente que tenemos de
    // esa cuenta. Solo se pisa con uno más nuevo.
    const cuentas = estado.cuentas.map((c) => {
      if (c.id !== plan.cuentaId || plan.cierre == null || !plan.hasta) return c;
      if (c.confirmed_on != null && plan.hasta <= c.confirmed_on) return c;
      // En la tarjeta el resumen informa deuda, que en Caudal es saldo negativo.
      const saldo = plan.origen === 'tarjeta' ? -plan.cierre : plan.cierre;
      return { ...c, confirmed_balance: saldo, confirmed_on: plan.hasta };
    });

    await guardar({ ...estado, cuentas, movimientos: [...agregados, ...estado.movimientos] });
    return { importados: agregados.length, omitidos: plan.duplicados, transferencias };
  },

  async categorias() {
    return (await leer()).categorias.filter((c) => !c.archived);
  },

  async movimientos(mes, limite = 200) {
    const estado = await leer();
    // parseFechaISO y no new Date(mes): la fecha ISO se parsea en UTC y al oeste
    // de Greenwich cae el dia anterior, con lo que el rango del mes queda vacio.
    const hasta = mes ? aFechaISO(sumarMeses(parseFechaISO(mes), 1)) : null;
    const lista = ordenar(estado.movimientos).filter(
      (m) => !mes || !hasta || (m.occurred_on >= mes && m.occurred_on < hasta),
    );
    return lista.slice(0, limite);
  },

  async movimiento(id) {
    return (await leer()).movimientos.find((m) => m.id === id) ?? null;
  },

  async totales(meses, desplazamiento = 0) {
    const estado = await leer();
    const acumulado = new Map<string, TotalesDelMes>();

    for (const m of estado.movimientos) {
      // Mover plata de una cuenta a otra no es ni ingreso ni gasto.
      if (m.is_transfer) continue;
      const mes = inicioDeMes(parseFechaISO(m.occurred_on));
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
      const mes = inicioDeMes(sumarMeses(new Date(), desplazamiento - (meses - 1 - i)));
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
      account_id: nuevo.account_id ?? estado.cuentas[0]?.id ?? null,
      is_transfer: false,
      import_id: null,
      external_key: null,
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
