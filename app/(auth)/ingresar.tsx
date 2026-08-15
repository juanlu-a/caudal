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

export default function Ingresar() {
  const { ingresar } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const completo = email.trim().length > 0 && password.length > 0;

  async function enviar() {
    if (!completo || cargando) return;
    setCargando(true);
    setError(null);
    try {
      await ingresar(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo ingresar. Probá de nuevo.');
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
          { paddingTop: insets.top + espacio[18], paddingBottom: insets.bottom + espacio[8] },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.marca}>
          <Isotipo tamano={56} />
          <Texto variante="display">Caudal</Texto>
          <Texto variante="secundario">Mirá a dónde va tu plata.</Texto>
        </View>

        <View style={styles.formulario}>
          <Campo
            etiqueta="Mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            placeholder="vos@mail.com"
            returnKeyType="next"
          />
          <Campo
            etiqueta="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
            placeholder="••••••"
            returnKeyType="go"
            onSubmitEditing={enviar}
            error={error}
          />
          <Boton onPress={enviar} cargando={cargando} deshabilitado={!completo}>
            Ingresar
          </Boton>
        </View>

        <View style={styles.pie}>
          <Texto variante="secundario">¿Todavía no tenés cuenta?</Texto>
          <Link href="/crear-cuenta" replace>
            <Texto variante="etiqueta" color={color.acento}>
              Crear una
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
    gap: espacio[14],
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
