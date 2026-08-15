import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { areaTactilMinima, color, espacio, radio, texto } from '../theme';
import { Texto } from './Texto';

type Props = TextInputProps & {
  etiqueta?: string;
  /** Los errores dicen que paso y cual es la salida, sin disculparse. */
  error?: string | null;
};

export function Campo({ etiqueta, error, style, ...props }: Props) {
  const [enfocado, setEnfocado] = useState(false);

  return (
    <View style={styles.contenedor}>
      {etiqueta ? <Texto variante="micro">{etiqueta}</Texto> : null}
      <TextInput
        {...props}
        onFocus={(e) => {
          setEnfocado(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setEnfocado(false);
          props.onBlur?.(e);
        }}
        placeholderTextColor={color.textoApagado}
        selectionColor={color.acento}
        style={[
          styles.input,
          // Foco visible siempre: anillo de 2 en Verde Caudal (manual, seccion 11).
          enfocado && styles.enfocado,
          error ? styles.conError : null,
          style,
        ]}
      />
      {error ? (
        <Texto variante="etiqueta" color={color.error}>
          {error}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: espacio[2],
  },
  input: {
    ...texto.cuerpo,
    minHeight: areaTactilMinima + espacio[1],
    backgroundColor: color.superficieElevada,
    borderRadius: radio.campo,
    paddingHorizontal: espacio[4],
    paddingVertical: espacio[3],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  enfocado: {
    borderColor: color.acento,
  },
  conError: {
    borderColor: color.error,
  },
});
