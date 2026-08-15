import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { areaTactilMinima, color, espacio, radio } from '../theme';
import { Texto } from './Texto';

type Props = {
  children: string;
  onPress: () => void;
};

/**
 * Boton flotante sobre el contenido. En iOS 26 usa el vidrio del sistema
 * (mismo material que la barra de tabs); en iOS viejo y en Android cae a una
 * superficie solida, sin glassmorphism decorativo.
 */
export function BotonFlotante({ children, onPress }: Props) {
  const conVidrio = isLiquidGlassAvailable();

  const contenido = (
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
        {children}
      </Texto>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={children}
      style={({ pressed }) => [styles.contenedor, pressed && styles.presionado]}>
      {conVidrio ? (
        <GlassView style={styles.superficie} glassEffectStyle="regular" isInteractive>
          {contenido}
        </GlassView>
      ) : (
        <View style={[styles.superficie, styles.solida]}>{contenido}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignSelf: 'center',
  },
  presionado: {
    opacity: 0.85,
  },
  superficie: {
    minHeight: areaTactilMinima,
    borderRadius: radio.pildora,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: espacio[5],
  },
  solida: {
    backgroundColor: color.superficieElevada,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.bordeFuerte,
  },
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[2],
  },
});
