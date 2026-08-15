import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '../../src/components/Boton';
import { Campo } from '../../src/components/Campo';
import { Panel } from '../../src/components/Panel';
import { Texto } from '../../src/components/Texto';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { useActualizarPerfil, usePerfil } from '../../src/features/movimientos/queries';
import { color, espacio, margenPantalla, radio } from '../../src/theme';

const MONEDAS = ['UYU', 'USD', 'ARS', 'EUR', 'BRL'] as const;

export default function Cuenta() {
  const insets = useSafeAreaInsets();
  const { session, salir } = useAuth();
  const perfil = usePerfil();
  const actualizar = useActualizarPerfil();
  const [nombre, setNombre] = useState('');
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (perfil.data?.display_name != null) setNombre(perfil.data.display_name);
  }, [perfil.data?.display_name]);

  const moneda = perfil.data?.currency ?? 'UYU';

  async function guardarNombre() {
    await actualizar.mutateAsync({ display_name: nombre.trim() });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.contenido,
        { paddingTop: insets.top + espacio[4], paddingBottom: espacio[18] },
      ]}>
      <View>
        <Texto variante="micro">Cuenta</Texto>
        <Texto variante="titulo1">{perfil.data?.display_name || 'Sin nombre'}</Texto>
        <Texto variante="secundario">{session?.user.email}</Texto>
      </View>

      <Panel>
        <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} autoCapitalize="words" />
        <View style={styles.accion}>
          <Boton
            variante="secundario"
            ancho="contenido"
            onPress={guardarNombre}
            cargando={actualizar.isPending}
            deshabilitado={nombre.trim() === (perfil.data?.display_name ?? '')}>
            {guardado ? 'Guardado' : 'Guardar'}
          </Boton>
        </View>
      </Panel>

      <Panel>
        <Texto variante="micro">Moneda</Texto>
        <View style={styles.monedas}>
          {MONEDAS.map((m) => {
            const activa = m === moneda;
            return (
              <Pressable
                key={m}
                onPress={() => actualizar.mutate({ currency: m })}
                accessibilityRole="button"
                accessibilityState={{ selected: activa }}
                style={[styles.moneda, activa && styles.monedaActiva]}>
                <Texto variante="etiqueta" color={activa ? color.texto : color.textoTerciario}>
                  {m}
                </Texto>
              </Pressable>
            );
          })}
        </View>
        <Texto variante="secundario" style={styles.nota}>
          Cambia cómo se muestran las cifras. No convierte los montos ya cargados.
        </Texto>
      </Panel>

      <Boton variante="texto" onPress={salir}>
        Cerrar sesión
      </Boton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: {
    paddingHorizontal: margenPantalla,
    gap: espacio[6],
  },
  accion: {
    marginTop: espacio[4],
  },
  monedas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio[2],
    marginTop: espacio[3],
  },
  moneda: {
    paddingHorizontal: espacio[4],
    paddingVertical: espacio[3],
    borderRadius: radio.chip,
    backgroundColor: color.superficieElevada,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  monedaActiva: {
    borderColor: color.acento,
  },
  nota: {
    marginTop: espacio[3],
  },
});
