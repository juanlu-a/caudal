import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../src/features/auth/AuthProvider';
import { color, texto } from '../src/theme';

SplashScreen.preventAutoHideAsync();

/** Encabezado comun de las pantallas que se abren sobre las tabs. */
const encabezado = {
  headerStyle: { backgroundColor: color.superficie },
  headerTitleStyle: { ...texto.titulo2, color: color.texto },
  headerTintColor: color.acento,
} as const;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.fondo }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="light" />
            <Navegacion />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Navegacion() {
  const { session, cargando, demo } = useAuth();
  const segmentos = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;

    // La pantalla de confirmación se abre desde el mail, sin sesión todavía:
    // si el guardia la mandara a ingresar, el código nunca se canjearía.
    const enAuth = segmentos[0] === '(auth)';
    const confirmando = segmentos[0] === 'confirmado';
    if (confirmando) {
      SplashScreen.hideAsync();
      return;
    }

    // En modo demo no hay cuentas: se entra derecho al contenido local.
    if (!demo && !session && !enAuth) {
      router.replace('/ingresar');
    } else if ((demo || session) && enAuth) {
      router.replace('/');
    }
    SplashScreen.hideAsync();
  }, [session, cargando, demo, segmentos, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.fondo },
      }}>
      <Stack.Screen name="(app)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="confirmado" />
      <Stack.Screen
        name="movimiento/[id]"
        options={{
          headerShown: true,
          title: 'Movimiento',
          ...encabezado,
        }}
      />
      <Stack.Screen
        name="cuenta"
        options={{
          headerShown: true,
          title: 'Cuenta',
          ...encabezado,
        }}
      />
    </Stack>
  );
}
