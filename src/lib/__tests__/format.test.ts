import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  abreviaturaMes,
  aFechaISO,
  formatFecha,
  formatMes,
  formatMoneda,
  formatMonto,
  formatVariacion,
  inicioDeMes,
  parseFechaISO,
} from '../format';

// Las reglas del manual de marca, seccion 02: puntuacion rioplatense, signo
// menos real y decimales que se ocultan cuando son cero.
test('la moneda lleva punto de miles y coma decimal', () => {
  assert.equal(formatMoneda(12480.5), '$ 12.480,50');
  assert.equal(formatMoneda(1250, 'USD'), 'US$ 1.250,00');
  assert.equal(formatMonto(1234567.89), '1.234.567,89');
});

test('el negativo usa el signo menos real, no un guion', () => {
  assert.equal(formatMonto(-2480), '−2.480,00');
});

test('los decimales se ocultan solo cuando son cero', () => {
  assert.equal(formatMonto(2480, { decimales: 'ocultarEnCero' }), '2.480');
  assert.equal(formatMonto(2480.5, { decimales: 'ocultarEnCero' }), '2.480,50');
});

test('el ingreso puede pedir el signo mas', () => {
  assert.equal(formatMonto(62000, { signo: 'siempre' }), '+62.000,00');
  assert.equal(formatMonto(62000, { signo: 'nunca' }), '62.000,00');
});

test('la variacion lleva un decimal y siempre signo', () => {
  assert.equal(formatVariacion(0.124), '+12,4%');
  assert.equal(formatVariacion(-0.037), '−3,7%');
});

test('la fecha omite el año solo dentro del año en curso', () => {
  const hoy = new Date(2026, 7, 20);
  assert.equal(formatFecha('2026-08-14', hoy), '14/08');
  assert.equal(formatFecha('2025-12-03', hoy), '03/12/2025');
});

test('una fecha ISO se lee en horario local, no en UTC', () => {
  // Al oeste de Greenwich, new Date('2026-08-01') cae el 31 de julio: por eso
  // el mes se calculaba vacio y los movimientos importados no aparecian.
  const d = parseFechaISO('2026-08-01');
  assert.equal(d.getMonth(), 7);
  assert.equal(d.getDate(), 1);
  assert.equal(inicioDeMes(new Date(2026, 7, 14)), '2026-08-01');
  assert.equal(aFechaISO(new Date(2026, 7, 9)), '2026-08-09');
});

test('el mes se escribe en sentence case y se abrevia en tres letras', () => {
  assert.equal(formatMes(new Date(2026, 7, 1)), 'Agosto 2026');
  assert.equal(abreviaturaMes(new Date(2026, 7, 1)), 'AGO');
});
