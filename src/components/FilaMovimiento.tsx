import { Pressable, StyleSheet, View } from 'react-native';

import { formatMonto } from '../lib/format';
import type { MovimientoConCategoria } from '../types/database';
import { areaTactilMinima, color, espacio } from '../theme';
import { IconoCategoria } from './IconoCategoria';
import { Texto } from './Texto';

type Props = {
  movimiento: MovimientoConCategoria;
  onPress?: () => void;
};

export function FilaMovimiento({ movimiento, onPress }: Props) {
  const esIngreso = movimiento.amount > 0;
  const categoria = movimiento.categories;
  const titulo = movimiento.description.trim() || categoria?.name || 'Sin descripción';

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.fila, pressed && styles.presionada]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${titulo}, ${formatMonto(movimiento.amount, {
        signo: esIngreso ? 'siempre' : 'auto',
      })}`}>
      <IconoCategoria
        iconKey={categoria?.icon_key}
        colorIndex={categoria?.color_index}
        tamano={40}
      />
      <View style={styles.centro}>
        <Texto variante="cuerpo" numberOfLines={1}>
          {titulo}
        </Texto>
        {categoria && movimiento.description.trim() ? (
          <Texto variante="etiqueta" color={color.textoTerciario} numberOfLines={1}>
            {categoria.name}
          </Texto>
        ) : null}
      </View>
      <Texto
        variante="cifraLista"
        color={esIngreso ? color.ingreso : color.gasto}
        style={styles.monto}>
        {formatMonto(movimiento.amount, {
          signo: esIngreso ? 'siempre' : 'auto',
          decimales: 'ocultarEnCero',
        })}
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[3],
    minHeight: areaTactilMinima + espacio[3],
    paddingVertical: espacio[3],
  },
  presionada: {
    opacity: 0.6,
  },
  centro: {
    flex: 1,
    gap: 2,
  },
  monto: {
    textAlign: 'right',
  },
});
