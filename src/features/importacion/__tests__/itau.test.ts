import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  leerEstadoDeCuenta,
  leerLinkDeItau,
  leerPlanillaDeItau,
  leerResumenDeTarjeta,
} from '../itau';
import type { Matriz } from '../parser';
import type { LineaDePdf } from '../pdf';

/**
 * Las lineas salen escritas a mano y no de un PDF: los extractos de verdad son
 * datos bancarios de una persona y no entran en el repo. Lo que se prueba es la
 * interpretacion, que es donde estan las decisiones.
 */
function linea(celdas: string[], derecha: number[] = []): LineaDePdf {
  return {
    celdas,
    x: celdas.map((_, i) => i * 100),
    derecha: derecha.length ? derecha : celdas.map((_, i) => i * 100 + 40),
    texto: celdas.join(' '),
    pagina: 1,
  };
}

// ------------------------------------------------------ estado de cuenta mensual

const MENSUAL: LineaDePdf[] = [
  linea(['31JUL2026']),
  linea(['859670', 'URGP', '3650987']),
  linea(['SDO.APERTURA', '5,51']),
  linea(['01JUL', 'CRE. CAMBIOS', 'OP....210399', '110.330,00', '110.335,51']),
  linea(['01JUL', 'DEB. VARIOS', 'VISA-ILINK', '11.000,00', '99.335,51']),
  linea(['02JUL', 'COMPRA', 'TIENDA INGLESA', '2.000,00', '97.335,51']),
  linea(['SDO. CIERRE', '97.335,51']),
];

test('el estado de cuenta deduce el signo del saldo corriente', () => {
  const r = leerEstadoDeCuenta(MENSUAL);
  const s = r.secciones[0];

  assert.equal(s.moneda, 'UYU');
  assert.equal(s.identificador, '3650987');
  assert.equal(s.filas.length, 3);
  // El PDF imprime los importes sin signo: sube o baja segun se haya movido el saldo.
  assert.equal(s.filas[0].monto, 110330);
  assert.equal(s.filas[1].monto, -11000);
});

test('el estado de cuenta cuadra contra el saldo que informa el banco', () => {
  const s = leerEstadoDeCuenta(MENSUAL).secciones[0];
  assert.equal(s.apertura, 5.51);
  assert.equal(s.cierre, 97335.51);
  // Cero es la confirmacion de que se leyo el archivo entero y bien.
  assert.equal(s.descuadre, 0);
});

test('el año sale de la fecha de cierre, que la fila no trae', () => {
  const s = leerEstadoDeCuenta(MENSUAL).secciones[0];
  assert.equal(s.filas[0].fecha, '2026-07-01');
});

test('separa la seccion en pesos de la de dolares', () => {
  const dos = [
    ...MENSUAL,
    linea(['859670', 'US.D', '3650979']),
    linea(['SDO.APERTURA', '100,00']),
    linea(['03JUL', 'COMPRA', 'ALGO', '40,00', '60,00']),
    linea(['SDO. CIERRE', '60,00']),
  ];
  const r = leerEstadoDeCuenta(dos);
  assert.deepEqual(r.secciones.map((s) => s.moneda), ['UYU', 'USD']);
  assert.equal(r.secciones[1].descuadre, 0);
});

// ------------------------------------------------- estado de cuenta en planilla

// La planilla que Itaú exporta a Excel: la moneda, el numero de cuenta y los
// saldos con que se controla la lectura viven arriba, fuera de la tabla.
const PLANILLA: Matriz = [
  ['', 'Nombre', '', '', 'Tipo de cuenta', 'Moneda', 'Nro de cuenta', '', ''],
  ['', 'PEREZ MARIA', '', '', 'Caja de Ahorro', 'Dólares', '3650979', '', ''],
  ['', 'Fecha', 'Concepto', '', 'Débito', 'Crédito', 'Saldo', 'Referencia', 'Destino'],
  ['', '31/07/2026', 'SALDO ANTERIOR', '', '', '', 4071.37, '', ''],
  ['', '03/08/2026', 'COMPRA      CAFE DORE', '', 5.64, '', 4065.73, '020826 MARIA PEREZ', ''],
  ['', '03/08/2026', 'REDIVA 17934CAFE DORE', '', '', 0.46, 4066.19, '', ''],
  ['', '05/08/2026', 'DEB.CONTRATO6385747 012', '', '', 0, 4066.19, '', ''],
  ['', '17/08/2026', 'TRASPASO A  3650987ILINK', '', 66.19, '', 4000, '', ''],
  ['', '', 'SALDO FINAL', '', '', '', 4000, '', ''],
];

test('la planilla saca la moneda y el numero de cuenta del encabezado', () => {
  const s = leerPlanillaDeItau(PLANILLA).secciones[0];
  // Sin esto, un extracto en dolares se importa como si fueran pesos.
  assert.equal(s.moneda, 'USD');
  assert.equal(s.identificador, '3650979');
});

test('la planilla cuadra contra el saldo anterior y el saldo final', () => {
  const s = leerPlanillaDeItau(PLANILLA).secciones[0];
  assert.equal(s.apertura, 4071.37);
  assert.equal(s.cierre, 4000);
  assert.equal(s.descuadre, 0);
});

test('en la planilla el debito resta y el credito suma', () => {
  const s = leerPlanillaDeItau(PLANILLA).secciones[0];
  assert.equal(s.filas[0].monto, -5.64);
  assert.equal(s.filas[1].monto, 0.46);
});

test('la descripcion sale del concepto, que es lo unico que dice algo', () => {
  const s = leerPlanillaDeItau(PLANILLA).secciones[0];
  // La referencia de una compra es la fecha y el nombre del titular: si se
  // toma esa, no hay con que reconocer el traspaso ni el pago de la tarjeta.
  assert.equal(s.filas[0].descripcion, 'Compra Cafe Dore');
  assert.equal(s.filas[2].descripcion, 'Traspaso A 3650987ilink');
});

test('la fila de importe cero se saltea y se avisa', () => {
  const r = leerPlanillaDeItau(PLANILLA);
  assert.equal(r.secciones[0].filas.length, 3);
  assert.ok(r.avisos.some((a) => a.includes('una fila de importe cero')));
});

test('la planilla avisa cuando una fila no explica el saldo', () => {
  const rota = PLANILLA.map((f) => [...f]);
  // El importe dice una cosa y el saldo corriente, otra.
  rota[4][4] = 500;
  const r = leerPlanillaDeItau(rota);
  assert.ok(r.avisos.some((a) => a.includes('no cierra con el saldo')));
});

test('una planilla que no es de Itaú se rechaza para que la lea el generico', () => {
  assert.throws(() => leerPlanillaDeItau([['fecha', 'importe']]), /tabla de movimientos/);
});

// ------------------------------------------------------------ resumen de tarjeta

// Las columnas de importe se distinguen por su borde derecho: la de pesos y la
// de dolares. Los consumos vienen en positivo y los pagos en negativo.
const TARJETA: LineaDePdf[] = [
  linea(['27/07/26']),
  linea(['SALDO DEL ESTADO DE CUENTA ANTERIOR', '1.000,00', '10,00'], [281, 419, 465]),
  linea(['010726', 'PAGOS', '-500,00', '-10,00'], [100, 134, 474, 533]),
  linea(['030726', '4023', 'PEDIDOSYA', '250,00'], [100, 125, 222, 474]),
  linea(['040726', '4023', 'FARMACIA', '150,00'], [100, 125, 222, 474]),
  linea(['050726', '4023', 'REDUC. IVA LEY 17934', '-20,00'], [100, 125, 222, 474]),
  linea(['SEGURO DE VIDA SOBRE SALDO', '30,00'], [251, 474]),
  linea(['SALDO CONTADO', '910,00', '0,00'], [167, 474, 533]),
];

test('en la tarjeta el consumo resta y el pago suma', () => {
  const pesos = leerResumenDeTarjeta(TARJETA).secciones.find((s) => s.moneda === 'UYU')!;
  assert.equal(pesos.filas.find((f) => f.descripcion.includes('Pedidosya'))!.monto, -250);
  assert.equal(pesos.filas.find((f) => f.descripcion === 'Pagos')!.monto, 500);
  // La reduccion de IVA es plata que vuelve.
  assert.equal(pesos.filas.find((f) => f.descripcion.includes('Reduc'))!.monto, 20);
});

test('la tarjeta toma los cargos sin fecha propia, como el seguro', () => {
  const pesos = leerResumenDeTarjeta(TARJETA).secciones.find((s) => s.moneda === 'UYU')!;
  const seguro = pesos.filas.find((f) => f.descripcion.toLowerCase().includes('seguro'));
  assert.ok(seguro, 'el seguro de vida tiene que entrar');
  assert.equal(seguro!.monto, -30);
  assert.equal(seguro!.fecha, '2026-07-27', 'va a la fecha de cierre del resumen');
});

test('la tarjeta cuadra contra el saldo contado', () => {
  const pesos = leerResumenDeTarjeta(TARJETA).secciones.find((s) => s.moneda === 'UYU')!;
  // 1.000 de saldo anterior − (500 − 250 − 150 + 20 − 30) = 910
  assert.equal(pesos.descuadre, 0);
});

test('la columna de la derecha son dolares, no pesos', () => {
  const dolares = leerResumenDeTarjeta(TARJETA).secciones.find((s) => s.moneda === 'USD');
  assert.ok(dolares, 'tiene que reconocer la seccion en dolares');
  assert.equal(dolares!.filas.length, 1);
  assert.equal(dolares!.filas[0].monto, 10);
});

// Un consumo en el exterior trae tres numeros: el importe en la moneda de
// origen, que no es de ninguna de las dos columnas, y el importe en dolares. El
// recargo por consumos en el exterior se cobra pero no tiene fila propia: sale
// suelto en el encabezado.
const EXTERIOR: LineaDePdf[] = [
  linea(['26/08/26']),
  linea(['32,00%', '9,00%'], [360, 463]),
  linea(['0,04'], [522]),
  linea(['SALDO DEL ESTADO DE CUENTA ANTERIOR', '1.000,00', '0,00'], [281, 419, 465]),
  linea(['200826', '4023', 'APPLE.COM/BILL', '2,99', '2,99'], [100, 125, 201, 415, 533]),
  linea(['210826', '4023', 'KINKO', '210,00'], [100, 125, 163, 474]),
  linea(['SALDO CONTADO', '1.210,00', '3,03'], [167, 474, 533]),
];

test('el importe en la moneda de origen no se cuela en la descripcion', () => {
  const dolares = leerResumenDeTarjeta(EXTERIOR).secciones.find((s) => s.moneda === 'USD')!;
  assert.equal(dolares.filas[0].descripcion, 'Apple.com/Bill');
  assert.equal(dolares.filas[0].monto, -2.99);
});

test('el recargo por consumos en el exterior cierra el saldo en dolares', () => {
  const dolares = leerResumenDeTarjeta(EXTERIOR).secciones.find((s) => s.moneda === 'USD')!;
  const recargo = dolares.filas.find((f) => f.descripcion.includes('Recargo'));
  assert.ok(recargo, 'el recargo del encabezado tiene que entrar como cargo');
  assert.equal(recargo!.monto, -0.04);
  assert.equal(recargo!.fecha, '2026-08-26', 'va a la fecha de cierre del resumen');
  assert.equal(dolares.descuadre, 0);
});

test('si el recargo no explica lo que falta, no se inventa el movimiento', () => {
  const otro = EXTERIOR.map((l) =>
    l.celdas[0] === 'SALDO CONTADO' ? linea(['SALDO CONTADO', '1.210,00', '3,10'], [167, 474, 533]) : l,
  );
  const dolares = leerResumenDeTarjeta(otro).secciones.find((s) => s.moneda === 'USD')!;
  assert.equal(dolares.filas.some((f) => f.descripcion.includes('Recargo')), false);
  assert.equal(dolares.descuadre, -0.11);
});

// --------------------------------------------------------- consulta de Itaú Link

// El mes en curso: columnas separadas de debito y credito, y la fila no dice a
// cual pertenece su importe porque la vacia desaparece. Se resuelve por posicion.
const LINK: LineaDePdf[] = [
  linea(['17/8/26', 'Itaú Link']),
  linea(['3650987', 'Pesos']),
  linea(['Fecha', 'Concepto', 'Débito', 'Crédito', 'Saldo'], [76, 174, 372, 456, 535]),
  linea(['14-08-26', 'IVA AL 22%', '40,60', '489,03'], [86, 240, 397, 562]),
  linea(['17-08-26', 'TRASPASO DE 3650979', '3.638,78', '4.127,81'], [86, 256, 480, 562]),
  linea(['17-08-26', 'COMPRA LUCCA 2', '90,00', '4.037,81'], [86, 212, 397, 562]),
];

test('Itaú Link distingue debito de credito por la columna', () => {
  const s = leerLinkDeItau(LINK).secciones[0];
  assert.equal(s.filas.length, 3);
  assert.equal(s.filas[0].monto, -40.6, 'la columna de debito resta');
  assert.equal(s.filas[1].monto, 3638.78, 'la de credito suma');
  assert.equal(s.filas[2].monto, -90);
});

test('Itaú Link deduce el saldo de apertura, que no imprime', () => {
  const s = leerLinkDeItau(LINK).secciones[0];
  // El saldo que dejo la primera fila menos lo que esa fila movio.
  assert.equal(s.apertura, 529.63);
  assert.equal(s.cierre, 4037.81);
  assert.equal(s.identificador, '3650987');
});

test('cada saldo se explica por el movimiento anterior', () => {
  const s = leerLinkDeItau(LINK).secciones[0];
  for (let i = 1; i < s.filas.length; i++) {
    assert.equal(
      Math.round((s.filas[i - 1].saldo! + s.filas[i].monto) * 100) / 100,
      s.filas[i].saldo,
    );
  }
});

test('un PDF que no es ninguno de los tres se rechaza con motivo', () => {
  assert.throws(() => leerEstadoDeCuenta([linea(['hola', 'mundo'])]), /fecha de cierre/);
});
