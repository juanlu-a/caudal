import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '../../src/components/Boton';
import { BotonPerfil } from '../../src/components/BotonPerfil';
import { Cifra } from '../../src/components/Cifra';
import { EstadoVacio } from '../../src/components/EstadoVacio';
import { FilaMovimiento } from '../../src/components/FilaMovimiento';
import { GraficoBarras } from '../../src/components/GraficoBarras';
import { Isotipo } from '../../src/components/Isotipo';
import { Panel } from '../../src/components/Panel';
import { Texto } from '../../src/components/Texto';
import {
  useMovimientos,
  usePerfil,
  useTotales,
} from '../../src/features/movimientos/queries';
import {
  abreviaturaMes,
  formatMes,
  formatVariacion,
  inicioDeMes,
  parseFechaISO,
  sumarMeses,
} from '../../src/lib/format';
import { areaTactilMinima, color, espacio, margenPantalla } from '../../src/theme';

export default function Mes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // 0 es el mes en curso. Los movimientos importados suelen ser del mes pasado,
  // así que la pantalla tiene que dejar caminar hacia atrás.
  const [desplazamiento, setDesplazamiento] = useState(0);
  const fechaDelMes = sumarMeses(new Date(), desplazamiento);
  const mesElegido = inicioDeMes(fechaDelMes);

  const perfil = usePerfil();
  const totales = useTotales(7, desplazamiento);
  const movimientos = useMovimientos(mesElegido);

  const moneda = perfil.data?.currency ?? 'UYU';
  const serie = totales.data ?? [];
  const esteMes = serie.at(-1);
  const mesPasado = serie.at(-2);

  // Variacion del saldo contra el mes anterior. Si no hay con que comparar, no se muestra:
  // un porcentaje inventado es peor que ninguno.
  const variacion =
    esteMes && mesPasado && Math.abs(mesPasado.saldo) > 0
      ? (esteMes.saldo - mesPasado.saldo) / Math.abs(mesPasado.saldo)
      : null;

  const ultimos = (movimientos.data ?? []).slice(0, 5);
  const recargando = totales.isRefetching || movimientos.isRefetching;

  return (
    <View style={styles.pantalla}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          styles.contenido,
          // Arriba, solo librar la isla: el encabezado es una fila de iconos, no
          // un titulo, y no necesita el aire de una barra de navegacion.
          // Abajo, la barra de tabs y su accesorio de vidrio flotan sobre el
          // contenido: este aire evita que tapen la ultima fila.
          { paddingTop: insets.top + espacio[2], paddingBottom: insets.bottom + 120 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={recargando}
            onRefresh={() => {
              totales.refetch();
              movimientos.refetch();
            }}
            tintColor={color.textoTerciario}
          />
        }>
        <View style={styles.encabezado}>
          <Isotipo tamano={28} />
          <View style={styles.derecha}>
            <View style={styles.selectorMes}>
              <Flecha
                hacia="anterior"
                onPress={() => setDesplazamiento((d) => d - 1)}
              />
              <Texto variante="micro">{formatMes(fechaDelMes)}</Texto>
              <Flecha
                hacia="siguiente"
                onPress={() => setDesplazamiento((d) => Math.min(0, d + 1))}
                deshabilitada={desplazamiento >= 0}
              />
            </View>
            <BotonPerfil />
          </View>
        </View>

        <Panel>
          <Cifra
            etiqueta="Saldo del mes"
            valor={esteMes?.saldo ?? 0}
            moneda={moneda}
            // El saldo no es un ingreso: va neutro. El verde se reserva para lo que
            // entra, para que quede un solo acento por pieza.
            tono="neutro"
            decimales="ocultarEnCero"
            pie={
              variacion != null ? (
                <Texto
                  variante="dato"
                  color={variacion >= 0 ? color.ingreso : color.textoTerciario}>
                  {formatVariacion(variacion)} vs el mes pasado
                </Texto>
              ) : null
            }
          />
          <View style={styles.desglose}>
            <View style={styles.columna}>
              <Texto variante="micro">Ingresos</Texto>
              <Cifra
                valor={esteMes?.ingresos ?? 0}
                moneda={moneda}
                variante="cifraMedia"
                // La etiqueta ya dice «Ingresos»: el «+» delante del símbolo sobra.
                signo={false}
                decimales="ocultarEnCero"
              />
            </View>
            <View style={styles.columna}>
              <Texto variante="micro">Gastos</Texto>
              <Cifra
                valor={esteMes?.gastos ?? 0}
                moneda={moneda}
                variante="cifraMedia"
                tono="neutro"
                // Pedido explícito, contra la regla del manual de que un gasto no
                // es un error. Se usa el Coral de la paleta y solo en este panel:
                // en las listas el gasto sigue siendo neutro.
                color={color.error}
                decimales="ocultarEnCero"
              />
            </View>
          </View>
        </Panel>

        {serie.some((m) => m.gastos > 0) ? (
          <Panel>
            <Texto variante="micro" style={styles.tituloBloque}>
              Gasto por mes
            </Texto>
            <GraficoBarras
              datos={serie.map((m, i) => ({
                etiqueta:
                  i === serie.length - 1 && desplazamiento === 0
                    ? 'HOY'
                    : abreviaturaMes(parseFechaISO(m.month)),
                valor: m.gastos,
                destacado: i === serie.length - 1,
              }))}
            />
          </Panel>
        ) : null}

        <View>
          <Texto variante="micro" style={styles.tituloBloque}>
            Últimos movimientos
          </Texto>
          {ultimos.length === 0 && !movimientos.isLoading ? (
            <EstadoVacio
              titulo="Todavía no hay movimientos"
              detalle="Traé el estado de cuenta del banco y se cargan todos juntos, o agregá el primero a mano."
              accion={
                <Boton
                  variante="secundario"
                  ancho="contenido"
                  onPress={() => router.push('/agregar?modo=importar')}>
                  Traer del banco
                </Boton>
              }
            />
          ) : (
            <View style={styles.lista}>
              {ultimos.map((m) => (
                <FilaMovimiento key={m.id} movimiento={m} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Flecha({
  hacia,
  onPress,
  deshabilitada,
}: {
  hacia: 'anterior' | 'siguiente';
  onPress: () => void;
  deshabilitada?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitada}
      accessibilityRole="button"
      accessibilityLabel={hacia === 'anterior' ? 'Mes anterior' : 'Mes siguiente'}
      style={[styles.flecha, deshabilitada && styles.flechaInactiva]}>
      <Texto variante="titulo2" color={color.textoSecundario}>
        {hacia === 'anterior' ? '‹' : '›'}
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
    paddingHorizontal: margenPantalla,
    gap: espacio[6],
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  derecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[2],
  },
  selectorMes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flecha: {
    width: areaTactilMinima,
    height: areaTactilMinima,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flechaInactiva: {
    opacity: 0.3,
  },
  desglose: {
    flexDirection: 'row',
    gap: espacio[6],
    marginTop: espacio[6],
  },
  columna: {
    flex: 1,
    gap: espacio[1],
  },
  tituloBloque: {
    marginBottom: espacio[3],
  },
  lista: {
    gap: espacio[1],
  },
});
