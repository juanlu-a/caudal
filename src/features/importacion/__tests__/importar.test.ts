import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Categoria, Cuenta } from '../../../types/database';
import { claveDeFila, planificar } from '../importar';
import type { FilaImportada, Lectura, SeccionImportable } from '../tipos';

const CATEGORIAS = ['Alimentos', 'Transporte', 'Ocio', 'Salud', 'Otros'].map(
  (name, i): Categoria => ({
    id: `cat-${i}`,
    user_id: 'u',
    name,
    icon_key: 'x',
    color_index: i,
    sort_order: i,
    archived: false,
    created_at: '',
  }),
);

const cuenta = (id: string, numero: string | null, last4: string | null): Cuenta => ({
  id,
  user_id: 'u',
  name: id,
  kind: 'bank',
  currency: 'UYU',
  last4,
  external_number: numero,
  confirmed_balance: null,
  confirmed_on: null,
  archived: false,
  created_at: '',
});

const fila = (fecha: string, monto: number, descripcion: string): FilaImportada => ({
  fecha,
  monto,
  descripcion,
  saldo: null,
  moneda: 'UYU',
  fila: 1,
});

function lectura(filas: FilaImportada[], origen: 'cuenta' | 'tarjeta' = 'cuenta') {
  const seccion: SeccionImportable = {
    moneda: 'UYU',
    identificador: '3650987',
    filas,
    apertura: null,
    cierre: null,
    descuadre: null,
  };
  const l: Lectura = {
    origen,
    secciones: [seccion],
    desde: filas[0]?.fecha ?? null,
    hasta: filas.at(-1)?.fecha ?? null,
    avisos: [],
  };
  return { l, seccion };
}

function planear(
  filas: FilaImportada[],
  opciones: { cuentas?: Cuenta[]; claves?: Set<string>; origen?: 'cuenta' | 'tarjeta' } = {},
) {
  const { l, seccion } = lectura(filas, opciones.origen);
  return planificar(l, seccion, {
    cuentaId: 'cta-1',
    archivo: 'extracto.pdf',
    categorias: CATEGORIAS,
    cuentas: opciones.cuentas ?? [],
    clavesExistentes: opciones.claves ?? new Set(),
  });
}

test('dos filas identicas del mismo dia son dos movimientos', () => {
  const plan = planear([
    fila('2026-07-10', -3200, 'ANCAP ESTACION 24'),
    fila('2026-07-10', -3200, 'ANCAP ESTACION 24'),
  ]);
  assert.equal(plan.nuevos, 2);
  assert.notEqual(plan.movimientos[0].clave, plan.movimientos[1].clave);
});

test('reimportar el mismo archivo no agrega nada', () => {
  const filas = [fila('2026-07-02', -2480, 'TIENDA INGLESA')];
  const claves = new Set(planear(filas).movimientos.map((m) => m.clave));

  const otra = planear(filas, { claves });
  assert.equal(otra.nuevos, 0);
  assert.equal(otra.duplicados, 1);
  assert.ok(otra.avisos.some((a) => a.includes('ya registrado')));
});

test('la clave es por cuenta: el mismo archivo en otra cuenta entra igual', () => {
  const f = fila('2026-07-02', -2480, 'TIENDA INGLESA');
  assert.notEqual(claveDeFila('cta-1', f, 0), claveDeFila('cta-2', f, 0));
});

test('el pago de tarjeta se detecta y no lleva categoria', () => {
  const plan = planear([fila('2026-07-10', -18750, 'PAGO TARJETA DE CREDITO VISA')]);
  assert.equal(plan.pagosDeTarjeta, 1);
  assert.equal(plan.movimientos[0].categoriaId, null);
});

test('en el resumen, el pago recibido tambien es el mismo movimiento', () => {
  const plan = planear([fila('2026-07-10', 18750, 'PAGO RECIBIDO GRACIAS')], {
    origen: 'tarjeta',
  });
  assert.equal(plan.pagosDeTarjeta, 1);
});

test('el pago de la tarjeta se reconoce como lo escribe Itaú', () => {
  // En el estado de cuenta el pago sale asi, sin la palabra «tarjeta» a la
  // vista. Sin reconocerlo, el pago cuenta como gasto y las compras del
  // resumen tambien: la misma plata dos veces.
  const plan = planear([fila('2026-08-21', -6000, 'DEB. VARIOS VISA-ILINK')]);
  assert.equal(plan.pagosDeTarjeta, 1);
});

test('en el resumen de Itaú el pago recibido dice «PAGOS» y nada mas', () => {
  const plan = planear([fila('2026-08-21', 6000, 'PAGOS')], { origen: 'tarjeta' });
  assert.equal(plan.pagosDeTarjeta, 1);
});

test('una compra pagada con la visa no es un pago de tarjeta', () => {
  const plan = planear([fila('2026-08-25', -301, 'TATA 320 VISA CRED')]);
  assert.equal(plan.pagosDeTarjeta, 0);
});

test('un traspaso a otra cuenta propia no es gasto ni ingreso', () => {
  // 3650979 es la cuenta en dolares de la misma persona.
  const plan = planear([fila('2026-07-15', 283.23, 'TRASPASO DE 3650979')], {
    cuentas: [cuenta('cta-1', '3650987', '0987'), cuenta('cta-2', '3650979', '0979')],
  });
  assert.equal(plan.transferenciasPropias, 1);
  assert.equal(plan.movimientos[0].entreCuentasPropias, true);
});

test('un traspaso a un tercero si es un movimiento de verdad', () => {
  // Mandarle plata a alguien por una compra es un gasto, no un cambio de bolsillo.
  const plan = planear([fila('2026-07-01', -23800, 'TRASPASO A 2359042ILINK')], {
    cuentas: [cuenta('cta-1', '3650987', '0987'), cuenta('cta-2', '3650979', '0979')],
  });
  assert.equal(plan.transferenciasPropias, 0);
  assert.equal(plan.movimientos[0].entreCuentasPropias, false);
});

test('adivina la categoria por el nombre del comercio', () => {
  const plan = planear([
    fila('2026-07-02', -2480, 'TIENDA INGLESA POCITOS'),
    fila('2026-07-03', -3200, 'ANCAP ESTACION 24'),
    fila('2026-07-04', -640, 'FARMACIA SAN ROQUE'),
  ]);
  assert.equal(plan.movimientos[0].categoriaId, 'cat-0', 'Alimentos');
  assert.equal(plan.movimientos[1].categoriaId, 'cat-1', 'Transporte');
  assert.equal(plan.movimientos[2].categoriaId, 'cat-3', 'Salud');
});

test('el descuadre del extracto se avisa antes de importar', () => {
  const { l, seccion } = lectura([fila('2026-07-02', -2480, 'ALGO')]);
  const plan = planificar(l, { ...seccion, descuadre: 12.5 }, {
    cuentaId: 'cta-1',
    archivo: 'x.pdf',
    categorias: CATEGORIAS,
    clavesExistentes: new Set(),
  });
  assert.ok(plan.avisos.some((a) => a.includes('no da el saldo')));
});
