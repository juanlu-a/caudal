import { Text, type TextProps } from 'react-native';

import { texto, type EstiloTexto } from '../theme';

type Props = TextProps & {
  variante?: EstiloTexto;
  color?: string;
};

/**
 * Todo el texto de la app pasa por aca: los tamanos y pesos salen de la escala
 * del manual y no se inventan en la pantalla.
 */
export function Texto({ variante = 'cuerpo', color, style, ...props }: Props) {
  return <Text {...props} style={[texto[variante], color ? { color } : null, style]} />;
}
