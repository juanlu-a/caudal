import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';

import { areaTactilMinima, color, espacio, radio } from '../theme';
import { Texto } from './Texto';

export type OpcionDesplegable = {
  id: string;
  nombre: string;
  /** Las opciones que todavía no funcionan se muestran, apagadas. */
  deshabilitada?: boolean;
  nota?: string;
};

type Props = {
  opciones: OpcionDesplegable[];
  valor: string;
  onElegir: (id: string) => void;
  /** Qué se muestra cuando el valor no está en la lista. */
  vacio?: string;
};

/**
 * Desplegable. Se abre en el lugar en vez de tapar la pantalla con un modal:
 * son listas cortas y así no se pierde de vista lo que se está configurando.
 */
export function Desplegable({ opciones, valor, onElegir, vacio = 'Elegir' }: Props) {
  const [abierto, setAbierto] = useState(false);
  const elegida = opciones.find((o) => o.id === valor);

  function alternar() {
    LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
    setAbierto((a) => !a);
  }

  return (
    <View>
      <Pressable
        onPress={alternar}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        style={styles.cabecera}>
        <Texto variante="cuerpo">{elegida?.nombre ?? vacio}</Texto>
        <Texto variante="titulo2" color={color.textoTerciario}>
          {abierto ? '⌃' : '⌄'}
        </Texto>
      </Pressable>

      {abierto ? (
        <View style={styles.lista}>
          {opciones.map((o) => {
            const activa = o.id === valor;
            return (
              <Pressable
                key={o.id}
                disabled={o.deshabilitada}
                onPress={() => {
                  onElegir(o.id);
                  alternar();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: activa, disabled: o.deshabilitada }}
                style={[styles.opcion, o.deshabilitada && styles.apagada]}>
                <View style={styles.textoOpcion}>
                  <Texto variante="cuerpo" color={activa ? color.acento : color.texto}>
                    {o.nombre}
                  </Texto>
                  {o.nota ? <Texto variante="etiqueta">{o.nota}</Texto> : null}
                </View>
                {activa ? (
                  <Texto variante="cuerpo" color={color.acento}>
                    ✓
                  </Texto>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: areaTactilMinima,
    paddingHorizontal: espacio[4],
    borderRadius: radio.campo,
    backgroundColor: color.superficieElevada,
  },
  lista: {
    marginTop: espacio[2],
    borderRadius: radio.campo,
    backgroundColor: color.superficieElevada,
    overflow: 'hidden',
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: areaTactilMinima,
    paddingHorizontal: espacio[4],
    paddingVertical: espacio[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.separador,
  },
  apagada: {
    opacity: 0.4,
  },
  textoOpcion: {
    gap: 2,
  },
});
