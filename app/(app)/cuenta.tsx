import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '../../src/components/Boton';
import { Campo } from '../../src/components/Campo';
import { Desplegable } from '../../src/components/Desplegable';
import { Panel } from '../../src/components/Panel';
import { Texto } from '../../src/components/Texto';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { BANCOS, BANCO_POR_DEFECTO } from '../../src/features/importacion/bancos';
import { useActualizarPerfil, usePerfil, useSaldos } from '../../src/features/movimientos/queries';
import { formatMoneda } from '../../src/lib/format';
import { color, espacio, margenPantalla, radio } from '../../src/theme';

const MONEDAS = ['UYU', 'USD', 'ARS', 'EUR', 'BRL'] as const;

export default function Cuenta() {
  const insets = useSafeAreaInsets();
  const { session, salir, demo } = useAuth();
  const perfil = usePerfil();
  const saldos = useSaldos();
  const actualizar = useActualizarPerfil();
  const [nombre, setNombre] = useState('');
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (perfil.data?.display_name != null) setNombre(perfil.data.display_name);
  }, [perfil.data?.display_name]);

  const moneda = perfil.data?.currency ?? 'UYU';
  const banco = perfil.data?.bank ?? BANCO_POR_DEFECTO;

  async function guardarNombre() {
    await actualizar.mutateAsync({ display_name: nombre.trim() });
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      // Sin color propio, el contenedor de la tab nativa se ve blanco detras.
      style={styles.pantalla}
      contentContainerStyle={[
        styles.contenido,
        { paddingTop: insets.top + espacio[4], paddingBottom: insets.bottom + 120 },
      ]}>
      <View>
        <Texto variante="micro">Cuenta</Texto>
        <Texto variante="titulo1">{perfil.data?.display_name || 'Sin nombre'}</Texto>
        <Texto variante="secundario">
          {demo ? 'Datos guardados solo en este teléfono' : session?.user.email}
        </Texto>
      </View>

      {demo ? (
        <Panel variante="tarjeta" padding={espacio[4]}>
          <Texto variante="micro">Modo demo</Texto>
          <Texto variante="secundario" style={styles.nota}>
            Todavía no hay proyecto de Supabase conectado. Los movimientos viven en este
            dispositivo y se pierden al reinstalar. Completá las claves en .env para usar
            cuentas y sincronizar.
          </Texto>
        </Panel>
      ) : null}

      <Panel>
        <Texto variante="micro">Cuentas</Texto>
        <View style={styles.saldos}>
          {(saldos.data ?? []).map((s) => (
            <View key={s.account_id} style={styles.saldo}>
              <Texto variante="etiqueta">{s.name}</Texto>
              <Texto variante="cifraLista" style={styles.saldoCifra}>
                {formatMoneda(s.saldo, s.currency, { decimales: 'ocultarEnCero' })}
              </Texto>
            </View>
          ))}
        </View>
      </Panel>

      <Panel>
        <Texto variante="micro">Banco</Texto>
        <View style={styles.nota}>
          <Desplegable
            opciones={BANCOS.map((b) => ({
              id: b.id,
              nombre: b.nombre,
              deshabilitada: !b.soportado,
              nota: b.soportado ? undefined : 'Todavía no',
            }))}
            valor={banco}
            onElegir={(id) => actualizar.mutate({ bank: id })}
          />
        </View>
        <Texto variante="secundario" style={styles.nota}>
          De esto depende cómo se leen los archivos al importar. Por ahora solo sabemos leer los
          de Itaú.
        </Texto>
      </Panel>

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

      {demo ? null : (
        <Boton variante="texto" onPress={salir}>
          Cerrar sesión
        </Boton>
      )}
    </ScrollView>
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
  accion: {
    marginTop: espacio[4],
  },
  saldos: {
    gap: espacio[3],
    marginTop: espacio[3],
  },
  saldo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacio[4],
  },
  saldoCifra: {
    textAlign: 'right',
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
