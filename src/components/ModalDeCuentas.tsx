import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { areaTactilMinima, color, espacio, margenPantalla, radio } from '../theme';
import { Boton } from './Boton';
import { Texto } from './Texto';

export type CuentaDetectada = {
  clave: string;
  nombre: string;
  moneda: string;
  tipo: 'bank' | 'card';
  /** Número con el que el banco la identifica. */
  numero: string | null;
  movimientos: number;
  /** Ya existe en la app: se muestra marcada y no se vuelve a crear. */
  yaExiste: boolean;
};

type Props = {
  visible: boolean;
  detectadas: CuentaDetectada[];
  elegidas: Set<string>;
  creando?: boolean;
  onAlternar: (clave: string) => void;
  onCrear: () => void;
  onCancelar: () => void;
};

/**
 * Lo que el archivo trajo, antes de importar nada.
 *
 * Un estado de cuenta de Itaú viene con la sección en pesos y la de dólares, y
 * el resumen de tarjeta con sus dos monedas: son cuatro cuentas distintas que
 * aparecen en dos archivos. Mostrarlas todas juntas evita tener que descubrirlas
 * de a una, importación por importación.
 */
export function ModalDeCuentas({
  visible,
  detectadas,
  elegidas,
  creando = false,
  onAlternar,
  onCrear,
  onCancelar,
}: Props) {
  const nuevas = detectadas.filter((d) => !d.yaExiste);
  const aCrear = nuevas.filter((d) => elegidas.has(d.clave)).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.pantalla}>
        <ScrollView contentContainerStyle={styles.contenido}>
          <View style={styles.encabezado}>
            <Texto variante="titulo1">
              {nuevas.length === 1
                ? 'Encontramos una cuenta'
                : `Encontramos ${detectadas.length} cuentas`}
            </Texto>
            <Texto variante="secundario">
              {nuevas.length === 0
                ? 'Ya las tenés todas creadas.'
                : 'Elegí cuáles llevar en Caudal. Después se importa cada una con su archivo.'}
            </Texto>
          </View>

          <View style={styles.lista}>
            {detectadas.map((d) => {
              const marcada = d.yaExiste || elegidas.has(d.clave);
              return (
                <Pressable
                  key={d.clave}
                  disabled={d.yaExiste}
                  onPress={() => onAlternar(d.clave)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: marcada, disabled: d.yaExiste }}
                  style={[styles.fila, marcada && styles.filaMarcada, d.yaExiste && styles.filaVieja]}>
                  <View style={styles.marca}>
                    <Texto variante="cuerpo" color={marcada ? color.acento : color.textoApagado}>
                      {marcada ? '✓' : '○'}
                    </Texto>
                  </View>
                  <View style={styles.datos}>
                    <Texto variante="cuerpo">{d.nombre}</Texto>
                    <Texto variante="dato">
                      {d.tipo === 'card' ? 'Tarjeta' : 'Cuenta'} · {d.moneda} · {d.movimientos}{' '}
                      {d.movimientos === 1 ? 'movimiento' : 'movimientos'}
                      {d.yaExiste ? ' · ya la tenés' : ''}
                    </Texto>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.acciones}>
          <Boton onPress={onCrear} cargando={creando} deshabilitado={aCrear === 0}>
            {aCrear === 0
              ? 'Seguir'
              : aCrear === 1
                ? 'Crear la cuenta'
                : `Crear las ${aCrear} cuentas`}
          </Boton>
          <Boton variante="texto" onPress={onCancelar}>
            Ahora no
          </Boton>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: color.fondo,
  },
  contenido: {
    padding: margenPantalla,
    gap: espacio[6],
    paddingTop: espacio[10],
  },
  encabezado: {
    gap: espacio[3],
  },
  lista: {
    gap: espacio[2],
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[4],
    minHeight: areaTactilMinima + espacio[2],
    padding: espacio[4],
    borderRadius: radio.tarjeta,
    backgroundColor: color.superficie,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.borde,
  },
  filaMarcada: {
    borderColor: color.acento,
  },
  filaVieja: {
    opacity: 0.55,
  },
  marca: {
    width: 20,
    alignItems: 'center',
  },
  datos: {
    flex: 1,
    gap: 2,
  },
  acciones: {
    padding: margenPantalla,
    gap: espacio[3],
  },
});
