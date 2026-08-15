import { StyleSheet, View, type ViewProps } from 'react-native';

import { color, espacio, radio } from '../theme';

type Props = ViewProps & {
  /** La profundidad se construye con color, no con sombras: Fondeo → Marea → Rada. */
  nivel?: 'superficie' | 'elevada';
  variante?: 'panel' | 'tarjeta';
  padding?: number;
};

export function Panel({
  nivel = 'superficie',
  variante = 'panel',
  padding = espacio[5],
  style,
  ...props
}: Props) {
  return (
    <View
      {...props}
      style={[
        styles.base,
        {
          backgroundColor: nivel === 'elevada' ? color.superficieElevada : color.superficie,
          borderRadius: variante === 'panel' ? radio.panel : radio.tarjeta,
          padding,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.borde,
  },
});
