import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { color, espacio, palette, radio } from '../theme';
import { Texto } from './Texto';

type Props = {
  onPress: () => void;
  leyendo?: boolean;
  archivo?: string | null;
};

/**
 * El equivalente móvil de una zona de arrastre: un área grande que abre Files.
 * Se dibuja con el lenguaje del isotipo — dos trazos redondos, un solo detalle
 * en verde — y no con un ícono de nube genérico.
 */
export function ZonaDeArchivo({ onPress, leyendo = false, archivo }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={leyendo}
      accessibilityRole="button"
      accessibilityLabel="Elegir archivo del banco"
      style={({ pressed }) => [styles.zona, pressed && styles.presionada]}>
      {leyendo ? (
        <ActivityIndicator color={color.acento} />
      ) : (
        <Svg width={72} height={54} viewBox="0 0 120 90">
          <Path
            d="M22 66 C42 66, 48 30, 68 30 L100 30"
            fill="none"
            stroke={palette.humo}
            strokeWidth={9}
            strokeLinecap="round"
          />
          <Path
            d="M84 16 L100 30 L84 44"
            fill="none"
            stroke={color.acento}
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      )}

      <View style={styles.texto}>
        <Texto variante="titulo2" style={styles.centrado}>
          {leyendo ? 'Leyendo el archivo' : (archivo ?? 'Elegí el archivo del banco')}
        </Texto>
        {leyendo ? null : (
          <Texto variante="secundario" style={styles.centrado}>
            El PDF que descargás del banco, sin editar. También lee Excel y CSV.
          </Texto>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zona: {
    borderRadius: radio.panel,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.bordeFuerte,
    backgroundColor: color.superficie,
    paddingVertical: espacio[14],
    paddingHorizontal: espacio[5],
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio[5],
    minHeight: 220,
  },
  presionada: {
    opacity: 0.75,
    borderColor: color.acento,
  },
  texto: {
    gap: espacio[2],
  },
  centrado: {
    textAlign: 'center',
  },
});
