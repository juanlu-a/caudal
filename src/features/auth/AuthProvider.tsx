import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '../../lib/supabase';

type Contexto = {
  session: Session | null;
  cargando: boolean;
  ingresar: (email: string, password: string) => Promise<void>;
  crearCuenta: (email: string, password: string, nombre: string) => Promise<void>;
  salir: () => Promise<void>;
};

const AuthContext = createContext<Contexto | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
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

  const valor = useMemo<Contexto>(
    () => ({
      session,
      cargando,
      async ingresar(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw new Error(traducirError(error.message));
      },
      async crearCuenta(email, password, nombre) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: nombre.trim() } },
        });
        if (error) throw new Error(traducirError(error.message));
      },
      async salir() {
        await supabase.auth.signOut();
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
