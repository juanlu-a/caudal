import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { color, colorDeCategoria, icono } from '../theme';

/**
 * Iconografia — manual seccion 07.
 * Grilla 24, trazo 1.75, terminaciones y uniones redondas, sin relleno.
 * El icono va dentro de un circulo neutro y el color de la categoria se aplica
 * al trazo, no al fondo: asi una lista larga se lee en gris y el color entra de a poco.
 */
const TRAZOS: Record<string, string> = {
  alimentos: 'M5 3v8a3 3 0 006 0V3M8 11v10M17 3c-1.5 2-2 4-2 7h4c0-3-.5-5-2-7zM17 10v11',
  transporte: 'M4 16V9l2-4h12l2 4v7M4 16h16M6.5 16v2.5M17.5 16v2.5M7 12h10',
  vivienda: 'M4 11l8-6 8 6M6 10v10h12V10M10 20v-6h4v6',
  compras: 'M4 8h16v11H4zM8 8V6a4 4 0 018 0v2M9 12h6',
  salud: 'M12 21s-7-4.5-7-9.5A4 4 0 0112 8a4 4 0 017 3.5C19 16.5 12 21 12 21z',
  ocio: 'M9 18V6l10-2v12M9 18a2 2 0 11-4 0 2 2 0 014 0zM19 16a2 2 0 11-4 0 2 2 0 014 0z',
  servicios: 'M13 3L5 14h6l-2 7 8-11h-6l2-7z',
  otros: 'M6 12h.01M12 12h.01M18 12h.01',
};

type Props = {
  iconKey?: string | null;
  colorIndex?: number | null;
  tamano?: number;
};

export function IconoCategoria({ iconKey, colorIndex, tamano = icono.circulo }: Props) {
  const trazo = TRAZOS[iconKey ?? 'otros'] ?? TRAZOS.otros;
  const tinta = colorIndex == null ? color.pendiente : colorDeCategoria(colorIndex);
  const lado = Math.round(tamano * 0.5);

  return (
    <View
      style={{
        width: tamano,
        height: tamano,
        borderRadius: tamano / 2,
        backgroundColor: color.superficieElevada,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Svg width={lado} height={lado} viewBox="0 0 24 24">
        <Path
          d={trazo}
          fill="none"
          stroke={tinta}
          strokeWidth={icono.trazo}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
