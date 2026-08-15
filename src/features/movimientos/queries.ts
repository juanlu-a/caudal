import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { repo, type CambiosPerfil, type NuevoMovimiento } from '../datos/repo';

export type { NuevoMovimiento };

export const claves = {
  perfil: ['perfil'] as const,
  categorias: ['categorias'] as const,
  movimientos: (mes?: string) => ['movimientos', mes ?? 'todos'] as const,
  movimiento: (id: string) => ['movimiento', id] as const,
  totales: ['totales'] as const,
};

export function usePerfil() {
  return useQuery({
    queryKey: claves.perfil,
    queryFn: () => repo.perfil(),
  });
}

export function useCategorias() {
  return useQuery({
    queryKey: claves.categorias,
    queryFn: () => repo.categorias(),
  });
}

/** Movimientos de un mes (ISO del primer dia) o los ultimos si no se pasa mes. */
export function useMovimientos(mes?: string, limite = 200) {
  return useQuery({
    queryKey: claves.movimientos(mes),
    queryFn: () => repo.movimientos(mes, limite),
  });
}

export function useMovimiento(id: string) {
  return useQuery({
    queryKey: claves.movimiento(id),
    queryFn: () => repo.movimiento(id),
  });
}

/** Totales de los ultimos N meses, del mas viejo al mas nuevo, sin huecos. */
export function useTotales(meses = 7) {
  return useQuery({
    queryKey: [...claves.totales, meses],
    queryFn: () => repo.totales(meses),
  });
}

export function useActualizarPerfil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cambios: CambiosPerfil) => repo.actualizarPerfil(cambios),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claves.perfil }),
  });
}

export function useCrearMovimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nuevo: NuevoMovimiento) => repo.crearMovimiento(nuevo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: claves.totales });
    },
  });
}

export function useBorrarMovimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => repo.borrarMovimiento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      queryClient.invalidateQueries({ queryKey: claves.totales });
    },
  });
}
