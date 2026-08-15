import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { areaTactilMinima, color, espacio } from '../theme';
import { Texto } from './Texto';

/**
 * Accesorio de la barra de tabs (iOS 26): vive dentro del vidrio del sistema,
 * arriba de las tabs, y el sistema le corre el contenido para que nunca lo tape.
 * Por eso la accion principal va aca y no en un boton flotante encima de la lista.
 */
export function AccesorioAgregar() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/nuevo')}
      accessibilityRole="button"
      accessibilityLabel="Agregar movimiento"
      style={({ pressed }) => [styles.contenedor, pressed && styles.presionado]}>
      <View style={styles.contenido}>
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path
            d="M12 5v14M5 12h14"
            fill="none"
            stroke={color.acento}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
        <Texto variante="etiqueta" color={color.texto}>
          Agregar movimiento
        </Texto>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    minHeight: areaTactilMinima,
    justifyContent: 'center',
    paddingHorizontal: espacio[5],
  },
  presionado: {
    opacity: 0.7,
  },
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[2],
  },
});
