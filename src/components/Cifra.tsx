import { StyleSheet, View } from 'react-native';

import { formatMoneda } from '../lib/format';
import { color, espacio } from '../theme';
import { Texto } from './Texto';

type Props = {
  /** Etiqueta micro en mayusculas: va arriba, siempre. */
  etiqueta?: string;
  valor: number;
  moneda?: string;
  /** 'auto' pinta el ingreso en verde; 'neutro' deja la cifra en Espuma. */
  tono?: 'auto' | 'neutro';
  variante?: 'cifra' | 'display' | 'titulo1';
  decimales?: 'siempre' | 'ocultarEnCero';
  /** Linea corta debajo de la cifra: variacion, periodo, aclaracion. */
  pie?: React.ReactNode;
};

/**
 * La unidad de composicion de la marca: etiqueta micro arriba, cifra grande abajo.
 * La cifra es al menos el doble de grande que su etiqueta (manual, seccion 06).
 */
export function Cifra({
  etiqueta,
  valor,
  moneda = 'UYU',
  tono = 'auto',
  variante = 'cifra',
  decimales = 'siempre',
  pie,
}: Props) {
  // Un ingreso se pinta de verde y lleva «+». Un gasto queda en Espuma con «−»:
  // gastar es lo que hace la gente todos los dias, no un error.
  const esIngreso = tono === 'auto' && valor > 0;

  return (
    <View>
      {etiqueta ? (
        <Texto variante="micro" style={styles.etiqueta}>
          {etiqueta}
        </Texto>
      ) : null}
      <Texto variante={variante} color={esIngreso ? color.ingreso : color.gasto}>
        {formatMoneda(valor, moneda, {
          signo: esIngreso ? 'siempre' : 'auto',
          decimales,
        })}
      </Texto>
      {pie ? <View style={styles.pie}>{pie}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    marginBottom: espacio[1],
  },
  pie: {
    marginTop: espacio[1],
  },
});
