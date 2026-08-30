import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { areaTactilMinima, color } from '../theme';

/** Avatar generico en el borde superior derecho: abre la pantalla de cuenta. */
export function BotonPerfil() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/cuenta')}
      accessibilityRole="button"
      accessibilityLabel="Cuenta"
      style={({ pressed }) => [styles.boton, pressed && styles.presionado]}>
      <Svg width={26} height={26} viewBox="0 0 24 24">
        <Circle
          cx={12}
          cy={12}
          r={10.5}
          stroke={color.textoSecundario}
          strokeWidth={1.5}
          fill="none"
        />
        <Circle
          cx={12}
          cy={9.5}
          r={3}
          stroke={color.textoSecundario}
          strokeWidth={1.5}
          fill="none"
        />
        <Path
          d="M5.5 19a7.8 7.8 0 0 1 13 0"
          stroke={color.textoSecundario}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    width: areaTactilMinima,
    height: areaTactilMinima,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  presionado: {
    opacity: 0.7,
  },
});
