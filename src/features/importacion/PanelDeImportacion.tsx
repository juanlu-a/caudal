import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Boton } from '../../components/Boton';
import { Cifra } from '../../components/Cifra';
import { FilaMovimiento } from '../../components/FilaMovimiento';
import { Panel } from '../../components/Panel';
import { Texto } from '../../components/Texto';
import { ZonaDeArchivo } from '../../components/ZonaDeArchivo';
import { formatFecha } from '../../lib/format';
import { color, espacio, radio } from '../../theme';
import type { Cuenta, MovimientoConCategoria } from '../../types/database';
import { repo } from '../datos/repo';
import {
  useCategorias,
  useCrearCuenta,
  useCuentas,
  useImportar,
  usePerfil,
} from '../movimientos/queries';
import { buscarBanco } from './bancos';
import { elegirArchivo, leerArchivo } from './archivo';
import { planificar, type PlanDeImportacion } from './importar';
import { ErrorDeArchivo, type Lectura, type SeccionImportable } from './tipos';

type Props = {
  onListo: () => void;
};

/**
 * Traer los movimientos desde el archivo del banco.
 *
 * El orden importa: primero el archivo, después a dónde va. Al revés obligaba a
 * tener creada la cuenta antes de saber siquiera qué trae el PDF, y si no la
 * tenías la pantalla no hacía nada.
 */
export function PanelDeImportacion({ onListo }: Props) {
  const perfil = usePerfil();
  const cuentas = useCuentas();
  const categorias = useCategorias();
  const crearCuenta = useCrearCuenta();
  const importar = useImportar();

  const [archivo, setArchivo] = useState<string | null>(null);
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [indice, setIndice] = useState(0);
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanDeImportacion | null>(null);
  const [llevaTarjeta, setLlevaTarjeta] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<{ importados: number; omitidos: number } | null>(null);

  const banco = buscarBanco(perfil.data?.bank);
  const seccion: SeccionImportable | null = lectura?.secciones[indice] ?? null;
  const tipoDeCuenta = lectura?.origen === 'tarjeta' ? 'card' : 'bank';
  const compatibles = (cuentas.data ?? []).filter(
    (c) => c.kind === tipoDeCuenta && (!seccion || c.currency === seccion.moneda),
  );
  // Si el archivo dice de qué cuenta es, se elige sola.
  const porNumero = seccion?.identificador
    ? compatibles.find((c) => c.last4 && seccion.identificador?.endsWith(c.last4))
    : undefined;
  const cuenta = compatibles.find((c) => c.id === cuentaId) ?? porNumero ?? compatibles[0] ?? null;

  async function elegir() {
    setError(null);
    setLeyendo(true);
    try {
      const elegido = await elegirArchivo();
      if (!elegido) return;

      // Sin decirle qué es: entre los lectores del banco, reconoce solo cuál corresponde.
      const leido = await leerArchivo(elegido, { banco: banco.id });
      setArchivo(elegido.nombre);
      setLectura(leido);
      setIndice(0);
      setPlan(null);
    } catch (e) {
      setError(
        e instanceof ErrorDeArchivo
          ? e.message
          : 'No se pudo leer el archivo. Probá con el original que descargaste del banco.',
      );
    } finally {
      setLeyendo(false);
    }
  }

  // Con archivo y cuenta, se cruza contra lo que ya está guardado.
  useEffect(() => {
    let vivo = true;
    if (!lectura || !seccion || !cuenta) {
      setPlan(null);
      return;
    }

    (async () => {
      const armar = (clavesExistentes: Set<string>) =>
        planificar(lectura, seccion, {
          cuentaId: cuenta.id,
          archivo: archivo ?? '',
          categorias: categorias.data ?? [],
          cuentas: cuentas.data ?? [],
          clavesExistentes,
        });

      const preliminar = armar(new Set());
      const existentes = await repo.clavesExistentes(preliminar.movimientos.map((m) => m.clave));
      if (vivo) setPlan(armar(existentes));
    })().catch((e) => {
      if (vivo) setError(e instanceof Error ? e.message : 'No se pudo preparar la importación.');
    });

    return () => {
      vivo = false;
    };
  }, [lectura, seccion, cuenta, archivo, categorias.data, cuentas.data]);

  async function crearLaCuenta() {
    if (!seccion || !lectura) return;
    setError(null);
    try {
      const nueva = await crearCuenta.mutateAsync({
        name: nombreSugerido(lectura, seccion, cuentas.data ?? []),
        kind: tipoDeCuenta,
        currency: seccion.moneda,
        last4: seccion.identificador?.slice(-4) ?? null,
        external_number: seccion.identificador ?? null,
      });
      setCuentaId(nueva.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la cuenta.');
    }
  }

  async function confirmar() {
    if (!plan) return;
    setError(null);
    try {
      const resultado = await importar.mutateAsync({
        plan,
        opciones: { pagosDeTarjetaComoTransferencia: llevaTarjeta },
      });
      setListo({ importados: resultado.importados, omitidos: resultado.omitidos });
      setLectura(null);
      setPlan(null);
    } catch (e) {
      setError(e instanceof Error ? `No se pudo importar: ${e.message}` : 'No se pudo importar.');
    }
  }

  if (listo) {
    return (
      <View style={styles.bloque}>
        <Panel>
          <Texto variante="micro">Movimientos importados</Texto>
          <Texto variante="cifra">{listo.importados}</Texto>
          {listo.omitidos > 0 ? (
            <Texto variante="secundario" style={styles.nota}>
              Se omitieron {listo.omitidos}{' '}
              {listo.omitidos === 1 ? 'movimiento ya registrado' : 'movimientos ya registrados'}.
            </Texto>
          ) : null}
        </Panel>
        <Boton onPress={onListo}>Ver los movimientos</Boton>
        <Boton variante="texto" onPress={() => setListo(null)}>
          Traer otro archivo
        </Boton>
      </View>
    );
  }

  if (!lectura) {
    return (
      <View style={styles.bloque}>
        <ZonaDeArchivo onPress={elegir} leyendo={leyendo} detalle={banco.acepta} />
        {error ? (
          <Texto variante="etiqueta" color={color.error}>
            {error}
          </Texto>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.bloque}>
      <Panel>
        <Texto variante="micro">
          {lectura.origen === 'tarjeta' ? 'Resumen de tarjeta' : 'Estado de cuenta'}
        </Texto>
        <Texto variante="titulo2">{archivo}</Texto>
        {lectura.desde && lectura.hasta ? (
          <Texto variante="dato" style={styles.nota}>
            {formatFecha(lectura.desde)} al {formatFecha(lectura.hasta)}
          </Texto>
        ) : null}

        {lectura.secciones.length > 1 ? (
          <View style={styles.chips}>
            {lectura.secciones.map((s, i) => (
              <Chip key={s.moneda} activo={i === indice} onPress={() => setIndice(i)}>
                {`${s.moneda} · ${s.filas.length}`}
              </Chip>
            ))}
          </View>
        ) : null}
      </Panel>

      {compatibles.length === 1 ? null : (
      <View style={styles.bloque}>
        <Texto variante="micro">A qué cuenta va</Texto>
        {compatibles.length === 0 ? (
          <Panel variante="tarjeta" padding={espacio[4]}>
            <Texto variante="secundario">
              {tipoDeCuenta === 'card'
                ? 'Todavía no hay una tarjeta donde poner estos consumos.'
                : `Todavía no hay una cuenta en ${seccion?.moneda} donde poner estos movimientos.`}
            </Texto>
            <View style={styles.accion}>
              <Boton
                variante="secundario"
                ancho="contenido"
                onPress={crearLaCuenta}
                cargando={crearCuenta.isPending}>
                {`Crear «${nombreSugerido(lectura, seccion!, cuentas.data ?? [])}»`}
              </Boton>
            </View>
          </Panel>
        ) : (
          <View style={styles.chips}>
            {compatibles.map((c) => (
              <Chip key={c.id} activo={c.id === cuenta?.id} onPress={() => setCuentaId(c.id)}>
                {c.currency === 'UYU' ? c.name : `${c.name} · ${c.currency}`}
              </Chip>
            ))}
          </View>
        )}
      </View>
      )}

      {plan ? <Previsualizacion plan={plan} cuenta={cuenta} /> : null}

      {plan && plan.pagosDeTarjeta > 0 && plan.origen === 'cuenta' ? (
        <Panel variante="tarjeta" padding={espacio[4]}>
          <View style={styles.fila}>
            <View style={styles.filaTexto}>
              <Texto variante="etiqueta">
                {plan.pagosDeTarjeta === 1
                  ? 'Hay un pago de tarjeta acá'
                  : `Hay ${plan.pagosDeTarjeta} pagos de tarjeta acá`}
              </Texto>
              <Texto variante="secundario" style={styles.explicacion}>
                Si también cargás el resumen de esa tarjeta, el pago y las compras son la misma
                plata. Con esto prendido el pago no se cuenta como gasto.
              </Texto>
            </View>
            <Switch
              value={llevaTarjeta}
              onValueChange={setLlevaTarjeta}
              trackColor={{ true: color.acento, false: color.superficieElevada }}
              thumbColor={color.texto}
            />
          </View>
        </Panel>
      ) : null}

      {error ? (
        <Texto variante="etiqueta" color={color.error}>
          {error}
        </Texto>
      ) : null}

      <Boton
        onPress={confirmar}
        cargando={importar.isPending}
        deshabilitado={!plan || plan.nuevos === 0}>
        {!plan
          ? 'Elegí la cuenta'
          : plan.nuevos === 0
            ? 'No hay nada nuevo'
            : `Importar ${plan.nuevos}`}
      </Boton>
      <Boton
        variante="texto"
        onPress={() => {
          setLectura(null);
          setPlan(null);
          setArchivo(null);
        }}>
        Elegir otro archivo
      </Boton>
    </View>
  );
}

function Previsualizacion({ plan, cuenta }: { plan: PlanDeImportacion; cuenta: Cuenta | null }) {
  const nuevos = plan.movimientos.filter((m) => !m.duplicado);
  const total = nuevos.reduce((suma, m) => suma + m.fila.monto, 0);

  return (
    <>
      <Panel>
        <Cifra
          etiqueta={cuenta ? `Va a ${cuenta.name}` : 'Movimientos'}
          valor={total}
          moneda={plan.moneda}
          tono="neutro"
          decimales="ocultarEnCero"
        />
        <View style={styles.resumen}>
          <Dato etiqueta="Nuevos" valor={String(plan.nuevos)} />
          <Dato etiqueta="Ya estaban" valor={String(plan.duplicados)} />
          {plan.transferenciasPropias > 0 ? (
            <Dato etiqueta="Entre tus cuentas" valor={String(plan.transferenciasPropias)} />
          ) : null}
        </View>

        {plan.descuadre === 0 ? (
          <Texto variante="dato" color={color.acento} style={styles.cuadre}>
            La suma da el saldo que informa el banco.
          </Texto>
        ) : null}
      </Panel>

      {plan.avisos.length > 0 ? (
        <View style={styles.avisos}>
          {plan.avisos.map((aviso) => (
            <Texto key={aviso} variante="secundario">
              {aviso}
            </Texto>
          ))}
        </View>
      ) : null}

      <View>
        <Texto variante="micro" style={styles.tituloBloque}>
          Lo que se va a cargar
        </Texto>
        {nuevos.slice(0, 30).map((m) => (
          <FilaMovimiento key={m.clave} movimiento={comoMovimiento(m.clave, m)} />
        ))}
        {nuevos.length > 30 ? (
          <Texto variante="secundario" style={styles.tituloBloque}>
            Y {nuevos.length - 30} más.
          </Texto>
        ) : null}
      </View>
    </>
  );
}

/** Un nombre que se entienda solo, sin obligar a escribirlo. */
function nombreSugerido(
  lectura: Lectura,
  seccion: SeccionImportable,
  existentes: Cuenta[],
): string {
  const cola = seccion.identificador?.slice(-4);
  const base =
    lectura.origen === 'tarjeta'
      ? `Tarjeta ${cola ?? ''}`.trim()
      : `Cuenta ${cola ?? ''}`.trim();
  const conMoneda = seccion.moneda === 'UYU' ? base : `${base} ${seccion.moneda}`;

  // Los nombres son únicos por persona: si ya existe, se numera.
  if (!existentes.some((c) => c.name === conMoneda)) return conMoneda;
  for (let i = 2; i < 50; i++) {
    const intento = `${conMoneda} ${i}`;
    if (!existentes.some((c) => c.name === intento)) return intento;
  }
  return conMoneda;
}

/** Adapta una fila del archivo a la forma que espera la fila de la lista. */
function comoMovimiento(
  clave: string,
  m: PlanDeImportacion['movimientos'][number],
): MovimientoConCategoria {
  return {
    id: clave,
    user_id: '',
    occurred_on: m.fila.fecha,
    amount: m.fila.monto,
    category_id: m.categoriaId,
    description: m.fila.descripcion,
    created_at: '',
    account_id: null,
    is_transfer: false,
    import_id: null,
    external_key: clave,
    categories: null,
  };
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Texto variante="micro">{etiqueta}</Texto>
      <Texto variante="titulo2">{valor}</Texto>
    </View>
  );
}

function Chip({
  children,
  activo,
  onPress,
}: {
  children: string;
  activo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      style={[styles.chip, activo && styles.chipActivo]}>
      <Texto variante="etiqueta" color={activo ? color.texto : color.textoTerciario}>
        {children}
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bloque: {
    gap: espacio[4],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio[2],
    marginTop: espacio[3],
  },
  chip: {
    paddingHorizontal: espacio[4],
    paddingVertical: espacio[3],
    borderRadius: radio.chip,
    backgroundColor: color.superficie,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.borde,
  },
  chipActivo: {
    borderColor: color.acento,
  },
  accion: {
    marginTop: espacio[4],
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[4],
  },
  filaTexto: {
    flex: 1,
    gap: espacio[2],
  },
  explicacion: {
    fontSize: 13,
    lineHeight: 18,
  },
  resumen: {
    flexDirection: 'row',
    gap: espacio[6],
    marginTop: espacio[6],
  },
  dato: {
    gap: espacio[1],
  },
  cuadre: {
    marginTop: espacio[5],
  },
  avisos: {
    gap: espacio[2],
  },
  tituloBloque: {
    marginBottom: espacio[3],
  },
  nota: {
    marginTop: espacio[3],
  },
});
