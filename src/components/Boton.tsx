import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { areaTactilMinima, color, espacio, radio } from '../theme';
import { Texto } from './Texto';

type Props = {
  children: string;
  onPress?: () => void;
  /** 'principal' es el unico acento verde de la pieza. */
  variante?: 'principal' | 'secundario' | 'texto' | 'destructivo';
  cargando?: boolean;
  deshabilitado?: boolean;
  ancho?: 'completo' | 'contenido';
};

export function Boton({
  children,
  onPress,
  variante = 'principal',
  cargando = false,
  deshabilitado = false,
  ancho = 'completo',
}: Props) {
  const inactivo = deshabilitado || cargando;
  const fondo = {
    principal: color.acento,
    secundario: color.superficieElevada,
    texto: 'transparent',
    destructivo: 'transparent',
  }[variante];
  const tinta = {
    principal: '#04121F', // Abismo sobre verde: 10.1:1
    secundario: color.texto,
    texto: color.textoSecundario,
    destructivo: color.error,
  }[variante];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: fondo,
          alignSelf: ancho === 'completo' ? 'stretch' : 'flex-start',
          borderWidth: variante === 'destructivo' ? StyleSheet.hairlineWidth : 0,
          borderColor: color.error,
        },
        pressed && styles.presionado,
        inactivo && styles.inactivo,
      ]}>
      <View style={styles.contenido}>
        {cargando ? <ActivityIndicator color={tinta} size="small" /> : null}
        <Texto variante="titulo2" color={tinta} style={styles.etiqueta}>
          {children}
        </Texto>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: areaTactilMinima + espacio[1],
    borderRadius: radio.campo,
    justifyContent: 'center',
    paddingHorizontal: espacio[5],
  },
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio[2],
  },
  etiqueta: {
    fontSize: 17,
    lineHeight: 22,
  },
  presionado: {
    opacity: 0.82,
  },
  inactivo: {
    opacity: 0.45,
  },
});
