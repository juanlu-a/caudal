import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '../../src/components/Boton';
import { Campo } from '../../src/components/Campo';
import { Isotipo } from '../../src/components/Isotipo';
import { Texto } from '../../src/components/Texto';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { color, espacio, margenPantalla } from '../../src/theme';

export default function CrearCuenta() {
  const { crearCuenta } = useAuth();
  const insets = useSafeAreaInsets();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const completo = email.trim().length > 0 && password.length >= 6;

  async function enviar() {
    if (!completo || cargando) return;
    setCargando(true);
    setError(null);
    try {
      await crearCuenta(email, password, nombre);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la cuenta. Probá de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.contenido,
          { paddingTop: insets.top + espacio[14], paddingBottom: insets.bottom + espacio[8] },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.marca}>
          <Isotipo tamano={48} />
          <Texto variante="titulo1">Crear cuenta</Texto>
          <Texto variante="secundario">
            Con el mail y una contraseña alcanza. Después cargás el primer movimiento.
          </Texto>
        </View>

        <View style={styles.formulario}>
          <Campo
            etiqueta="Nombre"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
            autoComplete="name"
            placeholder="Como querés que te llame"
          />
          <Campo
            etiqueta="Mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            placeholder="vos@mail.com"
          />
          <Campo
            etiqueta="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            placeholder="Al menos 6 caracteres"
            onSubmitEditing={enviar}
            error={error}
          />
          <Boton onPress={enviar} cargando={cargando} deshabilitado={!completo}>
            Crear cuenta
          </Boton>
        </View>

        <View style={styles.pie}>
          <Texto variante="secundario">¿Ya tenés cuenta?</Texto>
          <Link href="/ingresar" replace>
            <Texto variante="etiqueta" color={color.acento}>
              Ingresar
            </Texto>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: color.fondo,
  },
  contenido: {
    flexGrow: 1,
    paddingHorizontal: margenPantalla,
    gap: espacio[10],
  },
  marca: {
    gap: espacio[3],
  },
  formulario: {
    gap: espacio[5],
  },
  pie: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[2],
  },
});
