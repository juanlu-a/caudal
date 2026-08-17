import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Boton } from '../src/components/Boton';
import { PanelDeImportacion } from '../src/features/importacion/PanelDeImportacion';
import { Campo } from '../src/components/Campo';
import { IconoCategoria } from '../src/components/IconoCategoria';
import { Texto } from '../src/components/Texto';
import {
  useCategorias,
  useCrearMovimiento,
  usePerfil,
} from '../src/features/movimientos/queries';
import { aFechaISO, formatDiaRelativo, formatMoneda } from '../src/lib/format';
import {
  areaTactilMinima,
  color,
  espacio,
  margenPantalla,
  radio,
  texto,
} from '../src/theme';

type Tipo = 'gasto' | 'ingreso';
type Modo = 'manual' | 'importar';

export default function NuevoMovimiento() {
  const router = useRouter();
  const perfil = usePerfil();
  const categorias = useCategorias();
  const crear = useCrearMovimiento();

  const [modo, setModo] = useState<Modo>('manual');
  const [tipo, setTipo] = useState<Tipo>('gasto');
  const [montoTexto, setMontoTexto] = useState('');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [diasAtras, setDiasAtras] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const moneda = perfil.data?.currency ?? 'UYU';
  const monto = parseMonto(montoTexto);
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - diasAtras);

  async function guardar() {
    if (!monto || crear.isPending) return;
    setError(null);
    try {
      await crear.mutateAsync({
        // El signo lo decide el tipo: negativo gasto, positivo ingreso.
        amount: tipo === 'gasto' ? -monto : monto,
        occurred_on: aFechaISO(fecha),
        category_id: categoriaId,
        description: descripcion.trim(),
      });
      router.back();
    } catch (e) {
      setError(
        e instanceof Error
          ? `No se pudo guardar: ${e.message}`
          : 'No se pudo guardar el movimiento. Probá de nuevo.',
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={64}>
      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.segmentos}>
          <Segmento activo={modo === 'manual'} onPress={() => setModo('manual')}>
            A mano
          </Segmento>
          <Segmento activo={modo === 'importar'} onPress={() => setModo('importar')}>
            Desde el banco
          </Segmento>
        </View>

        {modo === 'importar' ? (
          <PanelDeImportacion onListo={() => router.back()} />
        ) : (
          <>
        <View style={styles.segmentos}>
          <Segmento activo={tipo === 'gasto'} onPress={() => setTipo('gasto')}>
            Gasto
          </Segmento>
          <Segmento activo={tipo === 'ingreso'} onPress={() => setTipo('ingreso')}>
            Ingreso
          </Segmento>
        </View>

        <View>
          <Texto variante="micro">Monto</Texto>
          <TextInput
            value={montoTexto}
            onChangeText={setMontoTexto}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={color.textoApagado}
            selectionColor={color.acento}
            autoFocus
            style={styles.monto}
          />
          <Texto variante="dato">
            {monto
              ? formatMoneda(tipo === 'gasto' ? -monto : monto, moneda)
              : `Se guarda como ${tipo}`}
          </Texto>
        </View>

        <View style={styles.bloque}>
          <Texto variante="micro">Categoría</Texto>
          <View style={styles.categorias}>
            {(categorias.data ?? []).map((c) => {
              const activa = categoriaId === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoriaId(activa ? null : c.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activa }}
                  style={[styles.categoria, activa && styles.categoriaActiva]}>
                  <IconoCategoria iconKey={c.icon_key} colorIndex={c.color_index} tamano={32} />
                  <Texto
                    variante="etiqueta"
                    color={activa ? color.texto : color.textoTerciario}
                    numberOfLines={1}>
                    {c.name}
                  </Texto>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.bloque}>
          <Texto variante="micro">Fecha</Texto>
          <View style={styles.fecha}>
            <Pressable
              onPress={() => setDiasAtras((d) => d + 1)}
              accessibilityLabel="Día anterior"
              style={styles.flecha}>
              <Texto variante="titulo2" color={color.textoSecundario}>
                ‹
              </Texto>
            </Pressable>
            <Texto variante="cuerpo">{formatDiaRelativo(aFechaISO(fecha))}</Texto>
            <Pressable
              onPress={() => setDiasAtras((d) => Math.max(0, d - 1))}
              disabled={diasAtras === 0}
              accessibilityLabel="Día siguiente"
              style={[styles.flecha, diasAtras === 0 && styles.flechaInactiva]}>
              <Texto variante="titulo2" color={color.textoSecundario}>
                ›
              </Texto>
            </Pressable>
          </View>
        </View>

        <Campo
          etiqueta="Descripción"
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder={tipo === 'gasto' ? 'Supermercado' : 'Sueldo'}
          error={error}
        />

        <Boton onPress={guardar} cargando={crear.isPending} deshabilitado={!monto}>
          Guardar
        </Boton>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Segmento({
  children,
  activo,
  onPress,
}: {
  children: string;
  activo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      style={[styles.segmento, activo && styles.segmentoActivo]}>
      <Texto variante="etiqueta" color={activo ? color.texto : color.textoTerciario}>
        {children}
      </Texto>
    </Pressable>
  );
}

/** Acepta «2.480,50» y «2480.50»: la coma es decimal y el punto es de miles. */
function parseMonto(entrada: string): number | null {
  const limpio = entrada.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const valor = Number(limpio);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  return Math.round(valor * 100) / 100;
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: color.fondo,
  },
  contenido: {
    padding: margenPantalla,
    gap: espacio[6],
  },
  segmentos: {
    flexDirection: 'row',
    gap: espacio[2],
    backgroundColor: color.superficie,
    borderRadius: radio.campo,
    padding: espacio[1],
  },
  segmento: {
    flex: 1,
    minHeight: areaTactilMinima - espacio[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.chip,
  },
  segmentoActivo: {
    backgroundColor: color.superficieElevada,
  },
  monto: {
    ...texto.cifra,
    paddingVertical: espacio[2],
  },
  bloque: {
    gap: espacio[3],
  },
  categorias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio[2],
  },
  categoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[2],
    paddingRight: espacio[3],
    paddingLeft: espacio[1],
    paddingVertical: espacio[1],
    borderRadius: radio.pildora,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.borde,
    backgroundColor: color.superficie,
  },
  categoriaActiva: {
    borderColor: color.acento,
  },
  fecha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.superficie,
    borderRadius: radio.campo,
    paddingHorizontal: espacio[2],
  },
  flecha: {
    width: areaTactilMinima,
    height: areaTactilMinima,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flechaInactiva: {
    opacity: 0.3,
  },
});
