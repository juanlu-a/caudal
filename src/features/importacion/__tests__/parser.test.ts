import assert from 'node:assert/strict';
import { test } from 'node:test';

import { interpretar, type Matriz } from '../parser';

/**
 * El lector generico de planillas: el que atiende lo que no sabemos leer con un
 * lector propio del banco. Lo que se prueba es como elige las columnas, que es
 * donde se decide si el movimiento queda con algo que se entienda o no.
 */

test('entre dos columnas de texto gana la que describe el movimiento', () => {
  // Itaú trae «Concepto» y «Referencia» a la vez, y la referencia de una compra
  // es la fecha y el nombre del titular. Quedarse con esa deja la lista entera
  // sin descripcion util.
  const matriz: Matriz = [
    ['Fecha', 'Concepto', 'Débito', 'Crédito', 'Saldo', 'Referencia'],
    ['03/08/2026', 'COMPRA EL CAFECITO', 440, '', 101.6, '010826 MARIA PEREZ'],
  ];

  const r = interpretar(matriz, { origen: 'cuenta' });
  assert.equal(r.filas[0].descripcion, 'Compra El Cafecito');
});

test('la referencia se usa igual cuando es la unica columna con texto', () => {
  const matriz: Matriz = [
    ['Fecha', 'Referencia', 'Importe'],
    ['03/08/2026', 'UM VIAJE Y SEGURO', -21338],
  ];

  const r = interpretar(matriz, { origen: 'cuenta' });
  assert.equal(r.filas[0].descripcion, 'Um Viaje Y Seguro');
});

test('el debito resta y el credito suma', () => {
  const matriz: Matriz = [
    ['Fecha', 'Concepto', 'Débito', 'Crédito'],
    ['03/08/2026', 'COMPRA', 440, ''],
    ['04/08/2026', 'SUELDO', '', 62000],
  ];

  const r = interpretar(matriz, { origen: 'cuenta' });
  assert.equal(r.filas[0].monto, -440);
  assert.equal(r.filas[1].monto, 62000);
});
