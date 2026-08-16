import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { modoDemo } from '../../lib/config';
import { pedirSupabase, supabase } from '../../lib/supabase';

/** A dónde vuelve el link del mail de confirmación: a la app, no al navegador. */
const VOLVER_A_LA_APP = Linking.createURL('/confirmado');

type Contexto = {
  session: Session | null;
  cargando: boolean;
  /** En modo demo no hay cuentas: se entra derecho al contenido local. */
  demo: boolean;
  ingresar: (email: string, password: string) => Promise<void>;
  /** Devuelve true cuando quedó pendiente confirmar el mail. */
  crearCuenta: (email: string, password: string, nombre: string) => Promise<boolean>;
  salir: () => Promise<void>;
};

const AuthContext = createContext<Contexto | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(!modoDemo);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nueva) => {
      setSession(nueva);
      setCargando(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // El link del mail de confirmación abre la app con un código: se canjea por la
  // sesión. Sirve tanto si la app estaba cerrada como si estaba abierta.
  useEffect(() => {
    if (!supabase) return;

    async function canjear(url: string | null) {
      if (!url || !supabase) return;
      const { queryParams } = Linking.parse(url);
      const codigo = typeof queryParams?.code === 'string' ? queryParams.code : null;
      if (!codigo) return;

      const { error } = await supabase.auth.exchangeCodeForSession(codigo);
      if (error) console.warn('[auth] no se pudo canjear el código del mail:', error.message);
    }

    Linking.getInitialURL().then(canjear);
    const sub = Linking.addEventListener('url', ({ url }) => canjear(url));
    return () => sub.remove();
  }, []);

  const valor = useMemo<Contexto>(
    () => ({
      session,
      cargando,
      demo: modoDemo,
      async ingresar(email, password) {
        const { error } = await pedirSupabase().auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw new Error(traducirError(error.message));
      },
      async crearCuenta(email, password, nombre) {
        const { data, error } = await pedirSupabase().auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: nombre.trim() },
            emailRedirectTo: VOLVER_A_LA_APP,
          },
        });
        if (error) throw new Error(traducirError(error.message));
        // Con la confirmación de mail activada no hay sesión hasta que se abre
        // el link: la pantalla tiene que decirlo en vez de quedarse quieta.
        return data.session == null;
      },
      async salir() {
        if (supabase) await supabase.auth.signOut();
        // La cache es de la sesion que se va: se descarta entera.
        queryClient.clear();
      },
    }),
    [session, cargando, queryClient],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): Contexto {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth necesita estar dentro de AuthProvider');
  return ctx;
}

/** Los errores dicen que paso y cual es la salida, sin disculparse ni dramatizar. */
function traducirError(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return 'El mail o la contraseña no coinciden. Revisá los datos y volvé a intentar.';
  }
  if (m.includes('user already registered')) {
    return 'Ya hay una cuenta con ese mail. Ingresá con tu contraseña.';
  }
  if (m.includes('password') && m.includes('at least')) {
    return 'La contraseña necesita al menos 6 caracteres.';
  }
  if (m.includes('email') && m.includes('invalid')) {
    return 'Ese mail no tiene un formato válido.';
  }
  if (m.includes('email not confirmed')) {
    return 'Falta confirmar el mail. Buscá el correo de Caudal y abrí el link.';
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'No hay conexión con el servidor. Probá de nuevo cuando vuelva la red.';
  }
  return mensaje;
}
