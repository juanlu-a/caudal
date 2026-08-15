import Svg, { Path } from 'react-native-svg';

import { color, palette } from '../theme';

type Props = {
  tamano?: number;
  /** Sobre fondo claro el sistema se invierte: la C va en Fondeo y la corriente en Bajio. */
  variante?: 'oscuro' | 'claro' | 'unaTinta';
  tinta?: string;
};

/**
 * Isotipo — manual seccion 05. Dos trazos del mismo grosor sobre grilla de 120.
 * El trazo claro es una C abierta: el cauce. El verde es el caudal que sale y sube.
 * Nunca rotarlo, deformarlo, sombrearlo ni encerrarlo en un circulo.
 */
export function Isotipo({ tamano = 40, variante = 'oscuro', tinta }: Props) {
  const cauce =
    tinta ?? (variante === 'claro' ? palette.fondeo : color.texto);
  const corriente =
    tinta ?? (variante === 'claro' ? palette.bajio : color.acento);

  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 120 120">
      <Path
        d="M91.1 38.2 A38 38 0 1 0 81.8 91.1"
        fill="none"
        stroke={cauce}
        strokeWidth={14}
        strokeLinecap="round"
      />
      <Path
        d="M66 78 C78 68, 92 50, 108 26"
        fill="none"
        stroke={corriente}
        strokeWidth={14}
        strokeLinecap="round"
      />
    </Svg>
  );
}
