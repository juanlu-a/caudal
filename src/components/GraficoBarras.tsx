import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { formatMonto } from '../lib/format';
import { color, curva, duracion, espacio, palette } from '../theme';
import { Texto } from './Texto';

export type BarraDato = {
  etiqueta: string;
  valor: number;
  destacado?: boolean;
};

type Props = {
  datos: BarraDato[];
  alto?: number;
};

/**
 * Grafico de barras — manual seccion 08.
 * Sin 3D, sin sombras, sin degradados. Eje desde cero. Un solo elemento destacado.
 * Se dibuja una sola vez, al aparecer, de izquierda a derecha.
 */
export function GraficoBarras({ datos, alto = 120 }: Props) {
  const maximo = Math.max(...datos.map((d) => Math.abs(d.valor)), 1);

  return (
    <View>
      <View style={[styles.area, { height: alto }]}>
        {/* Maximo tres marcas de eje: la grilla es un apoyo, no un dibujo. */}
        <View style={[styles.linea, { top: 0 }]} />
        <View style={[styles.linea, { top: alto / 2 }]} />
        <View style={[styles.linea, styles.base, { top: alto }]} />
        <View style={styles.barras}>
          {datos.map((dato, i) => (
            <Barra
              key={`${dato.etiqueta}-${i}`}
              dato={dato}
              indice={i}
              alturaMaxima={alto}
              proporcion={Math.abs(dato.valor) / maximo}
            />
          ))}
        </View>
      </View>
      <View style={styles.etiquetas}>
        {datos.map((dato, i) => (
          <Texto
            key={`${dato.etiqueta}-label-${i}`}
            variante="dato"
            color={dato.destacado ? color.acento : color.textoTerciario}
            style={styles.etiqueta}>
            {dato.etiqueta}
          </Texto>
        ))}
      </View>
    </View>
  );
}

function Barra({
  dato,
  indice,
  alturaMaxima,
  proporcion,
}: {
  dato: BarraDato;
  indice: number;
  alturaMaxima: number;
  proporcion: number;
}) {
  const progreso = useSharedValue(0);
  const [reducido, setReducido] = useState(false);

  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled().then((valor) => {
      if (!vivo) return;
      setReducido(valor);
      progreso.value = valor
        ? 1
        : withDelay(indice * 40, withTiming(1, { duration: duracion.entrada, easing: curva }));
    });
    return () => {
      vivo = false;
    };
  }, [indice, progreso]);

  const estilo = useAnimatedStyle(() => ({
    height: Math.max(2, proporcion * alturaMaxima * progreso.value),
    opacity: reducido ? progreso.value : 1,
  }));

  return (
    <View style={styles.columna} accessibilityLabel={`${dato.etiqueta}: ${formatMonto(dato.valor)}`}>
      <Animated.View
        style={[
          styles.barra,
          { backgroundColor: dato.destacado ? color.acento : palette.corriente },
          estilo,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    justifyContent: 'flex-end',
  },
  linea: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.separador,
  },
  base: {
    backgroundColor: color.bordeFuerte,
  },
  barras: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    // Separacion menor que el ancho de la barra.
    gap: espacio[2],
  },
  columna: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  barra: {
    width: '100%',
    // Radio 4 solo en la punta que crece.
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  etiquetas: {
    flexDirection: 'row',
    gap: espacio[2],
    marginTop: espacio[2],
  },
  etiqueta: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
  },
});
