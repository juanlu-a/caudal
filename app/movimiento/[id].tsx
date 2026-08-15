import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Boton } from '../../src/components/Boton';
import { Cifra } from '../../src/components/Cifra';
import { IconoCategoria } from '../../src/components/IconoCategoria';
import { Panel } from '../../src/components/Panel';
import { Texto } from '../../src/components/Texto';
import {
  useBorrarMovimiento,
  useMovimiento,
  usePerfil,
} from '../../src/features/movimientos/queries';
import { formatFecha } from '../../src/lib/format';
import { color, espacio, margenPantalla } from '../../src/theme';

export default function DetalleMovimiento() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const perfil = usePerfil();
  const movimiento = useMovimiento(id);
  const borrar = useBorrarMovimiento();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dato = movimiento.data;
  const moneda = perfil.data?.currency ?? 'UYU';

  if (!dato) {
    return (
      <View style={styles.pantalla}>
        <Texto variante="secundario" style={styles.vacio}>
          {movimiento.isLoading ? 'Buscando el movimiento…' : 'Ese movimiento ya no existe.'}
        </Texto>
      </View>
    );
  }

  async function eliminar() {
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    try {
      await borrar.mutateAsync(id);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? `No se pudo borrar: ${e.message}` : 'No se pudo borrar.');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.contenido} contentInsetAdjustmentBehavior="automatic">
      <Panel>
        <Cifra
          etiqueta={dato.amount > 0 ? 'Ingreso' : 'Gasto'}
          valor={Number(dato.amount)}
          moneda={moneda}
        />
      </Panel>

      <Panel variante="tarjeta" padding={espacio[4]}>
        <Dato etiqueta="Fecha" valor={formatFecha(dato.occurred_on)} />
        <View style={styles.separador} />
        <View style={styles.filaCategoria}>
          <Texto variante="micro">Categoría</Texto>
          <View style={styles.categoria}>
            {dato.categories ? (
              <IconoCategoria
                iconKey={dato.categories.icon_key}
                colorIndex={dato.categories.color_index}
                tamano={28}
              />
            ) : null}
            <Texto variante="cuerpo" color={dato.categories ? color.texto : color.pendiente}>
              {dato.categories?.name ?? 'Sin asignar'}
            </Texto>
          </View>
        </View>
        {dato.description ? (
          <>
            <View style={styles.separador} />
            <Dato etiqueta="Descripción" valor={dato.description} />
          </>
        ) : null}
      </Panel>

      {error ? (
        <Texto variante="etiqueta" color={color.error}>
          {error}
        </Texto>
      ) : null}

      <Boton variante="destructivo" onPress={eliminar} cargando={borrar.isPending}>
        {confirmando ? 'Confirmar borrado' : 'Borrar movimiento'}
      </Boton>
      {confirmando ? (
        <Texto variante="etiqueta" color={color.textoTerciario} style={styles.aviso}>
          Se borra del historial y del saldo del mes. No se puede deshacer.
        </Texto>
      ) : null}
    </ScrollView>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Texto variante="micro">{etiqueta}</Texto>
      <Texto variante="cuerpo">{valor}</Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: color.fondo,
  },
  contenido: {
    padding: margenPantalla,
    gap: espacio[5],
  },
  vacio: {
    padding: margenPantalla,
  },
  dato: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: espacio[2],
    gap: espacio[4],
  },
  filaCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: espacio[2],
  },
  categoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[2],
  },
  separador: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.separador,
  },
  aviso: {
    textAlign: 'center',
  },
});
