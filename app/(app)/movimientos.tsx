import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '../../src/components/Boton';
import { EstadoVacio } from '../../src/components/EstadoVacio';
import { FilaMovimiento } from '../../src/components/FilaMovimiento';
import { Texto } from '../../src/components/Texto';
import {
  useCategorias,
  useMovimientos,
  usePerfil,
} from '../../src/features/movimientos/queries';
import {
  formatDiaRelativo,
  formatMes,
  formatMoneda,
  inicioDeMes,
  sumarMeses,
} from '../../src/lib/format';
import { areaTactilMinima, color, colorDeCategoria, espacio, margenPantalla, radio } from '../../src/theme';
import type { MovimientoConCategoria } from '../../src/types/database';

type Item =
  | { tipo: 'dia'; clave: string; fecha: string; total: number }
  | { tipo: 'movimiento'; clave: string; movimiento: MovimientoConCategoria };

export default function Movimientos() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [offsetMes, setOffsetMes] = useState(0);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);

  const fechaMes = sumarMeses(new Date(), offsetMes);
  const mes = inicioDeMes(fechaMes);

  const perfil = usePerfil();
  const categorias = useCategorias();
  const movimientos = useMovimientos(mes);
  const moneda = perfil.data?.currency ?? 'UYU';

  const items = useMemo<Item[]>(() => {
    const filtrados = (movimientos.data ?? []).filter(
      (m) => !categoriaId || m.category_id === categoriaId,
    );

    const porDia = new Map<string, MovimientoConCategoria[]>();
    for (const m of filtrados) {
      const lista = porDia.get(m.occurred_on) ?? [];
      lista.push(m);
      porDia.set(m.occurred_on, lista);
    }

    const salida: Item[] = [];
    for (const [fecha, lista] of porDia) {
      salida.push({
        tipo: 'dia',
        clave: `dia-${fecha}`,
        fecha,
        total: lista.reduce((suma, m) => suma + Number(m.amount), 0),
      });
      for (const m of lista) {
        salida.push({ tipo: 'movimiento', clave: m.id, movimiento: m });
      }
    }
    return salida;
  }, [movimientos.data, categoriaId]);

  return (
    <View style={styles.pantalla}>
      <FlashList
        data={items}
        keyExtractor={(item) => item.clave}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingHorizontal: margenPantalla,
          paddingBottom: insets.bottom + 120,
        }}
        ListHeaderComponent={
          <View style={[styles.encabezado, { paddingTop: insets.top + espacio[2] }]}>
            <View style={styles.selectorMes}>
              <FlechaMes direccion="anterior" onPress={() => setOffsetMes((o) => o - 1)} />
              <Texto variante="titulo1">{formatMes(fechaMes)}</Texto>
              <FlechaMes
                direccion="siguiente"
                onPress={() => setOffsetMes((o) => Math.min(0, o + 1))}
                deshabilitada={offsetMes >= 0}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}>
              <Chip activo={categoriaId === null} onPress={() => setCategoriaId(null)}>
                Todas
              </Chip>
              {(categorias.data ?? []).map((c) => (
                <Chip
                  key={c.id}
                  activo={categoriaId === c.id}
                  tinta={colorDeCategoria(c.color_index)}
                  onPress={() => setCategoriaId(categoriaId === c.id ? null : c.id)}>
                  {c.name}
                </Chip>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          movimientos.isLoading ? null : (
            <EstadoVacio
              titulo="No hay movimientos en este mes"
              detalle={
                categoriaId
                  ? 'Probá sacando el filtro de categoría.'
                  : 'Traé el estado de cuenta del banco y se cargan todos juntos.'
              }
              accion={
                categoriaId ? null : (
                  <Boton
                    variante="secundario"
                    ancho="contenido"
                    onPress={() => router.push('/agregar?modo=importar')}>
                    Traer del banco
                  </Boton>
                )
              }
            />
          )
        }
        renderItem={({ item }) =>
          item.tipo === 'dia' ? (
            <View style={styles.dia}>
              <Texto variante="micro">{formatDiaRelativo(item.fecha)}</Texto>
              <Texto variante="dato">
                {formatMoneda(item.total, moneda, { decimales: 'ocultarEnCero' })}
              </Texto>
            </View>
          ) : (
            <FilaMovimiento
              movimiento={item.movimiento}
              onPress={() => router.push(`/movimiento/${item.movimiento.id}`)}
            />
          )
        }
      />
    </View>
  );
}

function Chip({
  children,
  activo,
  tinta,
  onPress,
}: {
  children: string;
  activo: boolean;
  tinta?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      style={[styles.chip, activo && styles.chipActivo]}>
      {tinta ? <View style={[styles.punto, { backgroundColor: tinta }]} /> : null}
      <Texto variante="etiqueta" color={activo ? color.texto : color.textoTerciario}>
        {children}
      </Texto>
    </Pressable>
  );
}

function FlechaMes({
  direccion,
  onPress,
  deshabilitada,
}: {
  direccion: 'anterior' | 'siguiente';
  onPress: () => void;
  deshabilitada?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitada}
      accessibilityRole="button"
      accessibilityLabel={direccion === 'anterior' ? 'Mes anterior' : 'Mes siguiente'}
      style={[styles.flecha, deshabilitada && styles.flechaInactiva]}>
      <Texto variante="titulo2" color={color.textoSecundario}>
        {direccion === 'anterior' ? '‹' : '›'}
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: color.fondo,
  },
  encabezado: {
    gap: espacio[5],
    paddingBottom: espacio[4],
  },
  selectorMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  chips: {
    gap: espacio[2],
    paddingRight: espacio[5],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[2],
    paddingHorizontal: espacio[3],
    paddingVertical: espacio[2],
    borderRadius: radio.chip,
    backgroundColor: color.superficie,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.borde,
  },
  chipActivo: {
    borderColor: color.acento,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: espacio[5],
    paddingBottom: espacio[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.separador,
    marginTop: espacio[2],
  },
});
