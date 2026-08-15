import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { color, espacio, palette } from '../theme';
import { Texto } from './Texto';

type Props = {
  titulo: string;
  detalle?: string;
  accion?: React.ReactNode;
};

/**
 * Estados vacios — manual seccion 07.
 * Nada de personajes ni mascotas: el mismo lenguaje del isotipo a mayor escala,
 * dos trazos gruesos en Humo con un solo detalle en Verde Caudal.
 */
export function EstadoVacio({ titulo, detalle, accion }: Props) {
  return (
    <View style={styles.contenedor}>
      <Svg width={96} height={72} viewBox="0 0 120 90">
        <Path
          d="M8 62 C34 62, 40 26, 66 26 C86 26, 92 50, 112 50"
          fill="none"
          stroke={palette.humo}
          strokeWidth={10}
          strokeLinecap="round"
        />
        <Path
          d="M8 82 C34 82, 40 74, 66 74"
          fill="none"
          stroke={color.acento}
          strokeWidth={10}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.texto}>
        <Texto variante="titulo2" style={styles.centrado}>
          {titulo}
        </Texto>
        {detalle ? (
          <Texto variante="secundario" style={styles.centrado}>
            {detalle}
          </Texto>
        ) : null}
      </View>
      {accion}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio[5],
    paddingVertical: espacio[14],
    paddingHorizontal: espacio[5],
  },
  texto: {
    gap: espacio[2],
    maxWidth: 320,
  },
  // Centrado solo para cifras solas y estados vacios (manual, seccion 06).
  centrado: {
    textAlign: 'center',
  },
});
