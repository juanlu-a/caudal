import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Boton } from '../src/components/Boton';
import { Cifra } from '../src/components/Cifra';
import { FilaMovimiento } from '../src/components/FilaMovimiento';
import { Panel } from '../src/components/Panel';
import { Texto } from '../src/components/Texto';
import { ZonaDeArchivo } from '../src/components/ZonaDeArchivo';
import { repo } from '../src/features/datos/repo';
import { planificar, type PlanDeImportacion } from '../src/features/importacion/importar';
import { elegirArchivo, leerPlanilla } from '../src/features/importacion/planilla';
import { ErrorDeArchivo, type OrigenDeArchivo } from '../src/features/importacion/tipos';
import {
  useCategorias,
  useCrearCuenta,
  useCuentas,
  useImportar,
  usePerfil,
} from '../src/features/movimientos/queries';
import { formatFecha } from '../src/lib/format';
import { color, espacio, margenPantalla, radio } from '../src/theme';
import type { Cuenta, MovimientoConCategoria } from '../src/types/database';

export default function Importar() {
  const router = useRouter();
  const perfil = usePerfil();
  const cuentas = useCuentas();
  const categorias = useCategorias();
  const crearCuenta = useCrearCuenta();
  const importar = useImportar();

  const [origen, setOrigen] = useState<OrigenDeArchivo>('cuenta');
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [plan, setPlan] = useState<PlanDeImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [llevaTarjeta, setLlevaTarjeta] = useState(false);
  const [listo, setListo] = useState<{ importados: number; omitidos: number } | null>(null);

  const moneda = perfil.data?.currency ?? 'UYU';
  const lista = cuentas.data ?? [];
  const delTipo = lista.filter((c) => (origen === 'tarjeta' ? c.kind === 'card' : c.kind !== 'card'));
  const cuentaElegida = delTipo.find((c) => c.id === cuentaId) ?? delTipo[0] ?? null;
  const hayTarjetas = lista.some((c) => c.kind === 'card');

  async function elegir() {
    if (!cuentaElegida) return;
    setError(null);
    setLeyendo(true);
    try {
      const archivo = await elegirArchivo();
      if (!archivo) return;

      const lectura = leerPlanilla(archivo.base64, {
        origen,
        monedaPorDefecto: cuentaElegida.currency,
      });
      const preliminar = planificar(lectura, {
        cuentaId: cuentaElegida.id,
        archivo: archivo.nombre,
        categorias: categorias.data ?? [],
        clavesExistentes: new Set(),
      });

      // Recién ahora se le pregunta a la base cuáles ya estaban.
      const existentes = await repo.clavesExistentes(preliminar.movimientos.map((m) => m.clave));
      setPlan(
        planificar(lectura, {
          cuentaId: cuentaElegida.id,
          archivo: archivo.nombre,
          categorias: categorias.data ?? [],
          clavesExistentes: existentes,
        }),
      );
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

  async function confirmar() {
    if (!plan) return;
    setError(null);
    try {
      const resultado = await importar.mutateAsync({
        plan,
        opciones: { pagosDeTarjetaComoTransferencia: llevaTarjeta },
      });
      setListo({ importados: resultado.importados, omitidos: resultado.omitidos });
      setPlan(null);
    } catch (e) {
      setError(e instanceof Error ? `No se pudo importar: ${e.message}` : 'No se pudo importar.');
    }
  }

  async function crearTarjeta() {
    const tarjeta = await crearCuenta.mutateAsync({ name: 'Tarjeta', kind: 'card' });
    setCuentaId(tarjeta.id);
  }

  if (listo) {
    return (
      <ScrollView style={styles.pantalla} contentContainerStyle={styles.contenido}>
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
        <Boton onPress={() => router.back()}>Ver los movimientos</Boton>
        <Boton variante="texto" onPress={() => setListo(null)}>
          Importar otro archivo
        </Boton>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
      keyboardShouldPersistTaps="handled">
      {plan ? (
        <Vista
          plan={plan}
          moneda={moneda}
          cuenta={cuentaElegida}
          llevaTarjeta={llevaTarjeta}
          onCambiarTarjeta={setLlevaTarjeta}
        />
      ) : (
        <>
          <View style={styles.bloque}>
            <Texto variante="micro">Qué vas a cargar</Texto>
            <View style={styles.segmentos}>
              <Segmento activo={origen === 'cuenta'} onPress={() => setOrigen('cuenta')}>
                Estado de cuenta
              </Segmento>
              <Segmento activo={origen === 'tarjeta'} onPress={() => setOrigen('tarjeta')}>
                Resumen de tarjeta
              </Segmento>
            </View>
          </View>

          <View style={styles.bloque}>
            <Texto variante="micro">A qué cuenta va</Texto>
            {delTipo.length === 0 ? (
              <Panel variante="tarjeta" padding={espacio[4]}>
                <Texto variante="secundario">
                  Todavía no hay una tarjeta cargada. Creala y después traé el resumen.
                </Texto>
                <View style={styles.accion}>
                  <Boton
                    variante="secundario"
                    ancho="contenido"
                    onPress={crearTarjeta}
                    cargando={crearCuenta.isPending}>
                    Crear tarjeta
                  </Boton>
                </View>
              </Panel>
            ) : (
              <View style={styles.cuentas}>
                {delTipo.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setCuentaId(c.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: c.id === cuentaElegida?.id }}
                    style={[styles.cuenta, c.id === cuentaElegida?.id && styles.cuentaActiva]}>
                    <Texto
                      variante="etiqueta"
                      color={c.id === cuentaElegida?.id ? color.texto : color.textoTerciario}>
                      {c.name}
                    </Texto>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <ZonaDeArchivo onPress={elegir} leyendo={leyendo} />

          {origen === 'cuenta' && hayTarjetas ? (
            <Panel variante="tarjeta" padding={espacio[4]}>
              <View style={styles.fila}>
                <View style={styles.filaTexto}>
                  <Texto variante="etiqueta">Llevo también el resumen de la tarjeta</Texto>
                  <Texto variante="secundario" style={styles.explicacion}>
                    Si lo llevás, el pago de la tarjeta no se cuenta como gasto: el gasto real son
                    las compras del resumen. Si no, se cuenta el pago.
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
        </>
      )}

      {error ? (
        <Texto variante="etiqueta" color={color.error}>
          {error}
        </Texto>
      ) : null}

      {plan ? (
        <View style={styles.acciones}>
          <Boton onPress={confirmar} cargando={importar.isPending} deshabilitado={plan.nuevos === 0}>
            {plan.nuevos === 0 ? 'No hay nada nuevo' : `Importar ${plan.nuevos}`}
          </Boton>
          <Boton variante="texto" onPress={() => setPlan(null)}>
            Elegir otro archivo
          </Boton>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Vista({
  plan,
  moneda,
  cuenta,
  llevaTarjeta,
  onCambiarTarjeta,
}: {
  plan: PlanDeImportacion;
  moneda: string;
  cuenta: Cuenta | null;
  llevaTarjeta: boolean;
  onCambiarTarjeta: (valor: boolean) => void;
}) {
  const nuevos = useMemo(() => plan.movimientos.filter((m) => !m.duplicado), [plan]);
  const total = nuevos.reduce((suma, m) => suma + m.fila.monto, 0);

  return (
    <>
      <Panel>
        <Cifra
          etiqueta={`${plan.archivo}`}
          valor={total}
          moneda={moneda}
          tono="neutro"
          decimales="ocultarEnCero"
          pie={
            <Texto variante="dato">
              {plan.desde && plan.hasta
                ? `${formatFecha(plan.desde)} al ${formatFecha(plan.hasta)} · ${cuenta?.name ?? ''}`
                : (cuenta?.name ?? '')}
            </Texto>
          }
        />
        <View style={styles.resumen}>
          <Dato etiqueta="Nuevos" valor={String(plan.nuevos)} />
          <Dato etiqueta="Ya estaban" valor={String(plan.duplicados)} />
          <Dato etiqueta="Pagos de tarjeta" valor={String(plan.pagosDeTarjeta)} />
        </View>
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

      {plan.pagosDeTarjeta > 0 && plan.origen === 'cuenta' ? (
        <Panel variante="tarjeta" padding={espacio[4]}>
          <View style={styles.fila}>
            <View style={styles.filaTexto}>
              <Texto variante="etiqueta">
                {plan.pagosDeTarjeta === 1
                  ? 'Hay un pago de tarjeta en este archivo'
                  : `Hay ${plan.pagosDeTarjeta} pagos de tarjeta en este archivo`}
              </Texto>
              <Texto variante="secundario" style={styles.explicacion}>
                Si además cargás el resumen de esa tarjeta, el pago y las compras son la misma
                plata. Con esto prendido el pago no se cuenta como gasto.
              </Texto>
            </View>
            <Switch
              value={llevaTarjeta}
              onValueChange={onCambiarTarjeta}
              trackColor={{ true: color.acento, false: color.superficieElevada }}
              thumbColor={color.texto}
            />
          </View>
        </Panel>
      ) : null}

      <View>
        <Texto variante="micro" style={styles.tituloBloque}>
          Lo que se va a cargar
        </Texto>
        <View>
          {nuevos.slice(0, 40).map((m) => (
            <FilaMovimiento key={m.clave} movimiento={comoMovimiento(m.clave, m)} />
          ))}
        </View>
        {nuevos.length > 40 ? (
          <Texto variante="secundario" style={styles.tituloBloque}>
            Y {nuevos.length - 40} más.
          </Texto>
        ) : null}
      </View>
    </>
  );
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

function Segmento({
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
      style={[styles.segmento, activo && styles.segmentoActivo]}>
      <Texto variante="etiqueta" color={activo ? color.texto : color.textoTerciario}>
        {children}
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: color.fondo,
  },
  contenido: {
    padding: margenPantalla,
    gap: espacio[6],
    paddingBottom: espacio[18],
  },
  bloque: {
    gap: espacio[3],
  },
  segmentos: {
    flexDirection: 'row',
    gap: espacio[2],
    backgroundColor: color.superficie,
    borderRadius: radio.campo,
    padding: espacio[1],
  },
  segmento: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.chip,
  },
  segmentoActivo: {
    backgroundColor: color.superficieElevada,
  },
  cuentas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio[2],
  },
  cuenta: {
    paddingHorizontal: espacio[4],
    paddingVertical: espacio[3],
    borderRadius: radio.chip,
    backgroundColor: color.superficie,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.borde,
  },
  cuentaActiva: {
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
  avisos: {
    gap: espacio[2],
  },
  tituloBloque: {
    marginBottom: espacio[3],
  },
  nota: {
    marginTop: espacio[3],
  },
  acciones: {
    gap: espacio[3],
  },
});
