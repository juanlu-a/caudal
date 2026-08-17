import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Boton } from '../src/components/Boton';
import { Isotipo } from '../src/components/Isotipo';
import { Texto } from '../src/components/Texto';
import { supabase } from '../src/lib/supabase';
import { color, espacio, margenPantalla } from '../src/theme';

/**
 * Adonde vuelve el link del mail de confirmación.
 *
 * Supabase manda a la app con `caudal://confirmado?code=...`. Ese código se
 * canjea acá por la sesión: tiene que existir una ruta de verdad, porque si no
 * expo-router muestra su pantalla de «Unmatched Route» y nadie llega a leerlo.
 */
export default function Confirmado() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const [estado, setEstado] = useState<'canjeando' | 'listo' | 'error'>('canjeando');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;

    async function canjear() {
      if (!supabase) return;
      if (!code) {
        if (vivo) {
          setEstado('error');
          setError('El link no trae el código de confirmación. Pedí uno nuevo desde Ingresar.');
        }
        return;
      }

      const { error: fallo } = await supabase.auth.exchangeCodeForSession(code);
      if (!vivo) return;

      if (fallo) {
        setEstado('error');
        setError(
          // El código es de un solo uso y vence: lo más común es que el link ya
          // se haya abierto antes.
          'Este link ya se usó o venció. Ingresá con tu mail y contraseña, o pedí otro.',
        );
        return;
      }
      setEstado('listo');
    }

    canjear();
    return () => {
      vivo = false;
    };
  }, [code]);

  // Con la sesión hecha, el gate de navegación manda al contenido.
  if (estado === 'listo') return <Redirect href="/" />;

  return (
    <View style={styles.pantalla}>
      <Isotipo tamano={56} />

      {estado === 'canjeando' ? (
        <>
          <Texto variante="titulo1" style={styles.centrado}>
            Confirmando tu cuenta
          </Texto>
          <ActivityIndicator color={color.acento} />
        </>
      ) : (
        <>
          <Texto variante="titulo1" style={styles.centrado}>
            No se pudo confirmar
          </Texto>
          <Texto variante="secundario" style={styles.centrado}>
            {error}
          </Texto>
          <Boton onPress={() => router.replace('/ingresar')}>Ir a ingresar</Boton>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: color.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio[5],
    padding: margenPantalla,
  },
  centrado: {
    textAlign: 'center',
  },
});
