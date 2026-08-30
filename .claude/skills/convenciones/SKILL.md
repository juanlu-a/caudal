---
name: convenciones
description: Convenciones de Caudal — ramas y PRs, modelo de cuentas y transferencias, reglas del manual de marca, importación de PDFs del banco, distribución a TestFlight y las trampas conocidas. Leer antes de escribir código, armar una feature o tocar la distribución.
---

# Convenciones de Caudal

Caudal es una app de finanzas personales en React Native/Expo. Lo que la distingue de
un CRUD de gastos es que **la plata entra por PDFs del banco y tiene que cuadrar con
lo que el banco imprime**. Casi todas las decisiones raras del código salen de ahí.

## Cómo se trabaja

`staging` es la rama por defecto. Nunca se commitea en `staging` ni en `main`.

```
rama de feature (desde staging al día) → PR a staging → merge
staging → PR a main → merge          (esto es «promover»)
```

Cada merge dispara un build de TestFlight:

| Rama | Grupo | Quién lo recibe | Revisión de Apple |
|---|---|---|---|
| `staging` | «Equipo» (interno) | Solo Juan | No |
| `main` | «Testers» (externo) | El link público | Sí |

El proyecto es de una sola persona: `staging` no es «lo que revisa el equipo», es
**dónde Juan ve las cosas primero**, en su teléfono y sin esperar a Apple. Lo que le
convence pasa a `main`. Por eso el grupo interno importa tanto: es el ciclo corto, y
un build interno está instalable a los quince minutos del merge, mientras que uno
externo depende de la revisión de Apple.

Para probar una rama sin tocar ninguna de las dos: *Actions → TestFlight → Run
workflow*, eligiendo la rama y el destino (`interno` por defecto).

**Los grupos internos no tienen link público** — Apple solo los da para los externos.
El build interno aparece solo en la app TestFlight del iPhone, en la sesión del Apple
ID que figure como usuario de App Store Connect.

**Si un build sale mal no se despublica: se arregla y se sube otro.** Un revert en
`main` es un merge más y sube igual.

### Commits y PRs

En español, voseo, sin emojis. Una línea en imperativo que diga qué cambia, y después
en prosa **por qué** — sobre todo si el cambio arregla algo que fallaba en silencio.
Sin trailers de co-autoría de IA.

Los PRs cuentan qué se verificó y qué no. Si algo solo se puede comprobar corriendo
(un build, una subida a Apple), decirlo explícitamente en vez de dar a entender que
está probado.

### Antes de pushear

```sh
npm run lint && npm run typecheck && npm test
```

`npm test` compila a CommonJS con `tsconfig.test.json` y corre el runner de Node. No
hay dependencias de testing y no queremos agregarlas.

### Dónde se prueba

**Expo Go no se usa.** La app se corre como build nativo (`npm run ios`, `npm run
ios:device`) y se distribuye por TestFlight, nada más. No hace falta aclarar en el
código ni en la doc que algo «no anda en Expo Go»: la mitad de lo que usamos son
módulos nativos y esa aclaración sobra en todas.

Para mirar un cambio de UI en el simulador sin esperar quince minutos de TestFlight,
el build nativo se hace una sola vez y después alcanza con Metro y fast refresh. Dos
cosas que hacen falta y no son obvias:

- **Sin credenciales la app arranca en demo**, con datos sembrados y sin login:
  `EXPO_NO_DOTENV=1 npx expo start` levanta Metro sin leer el `.env`. Sirve para
  revisar pantallas sin tocar la base ni pedir la sesión.
- **El teclado por software no aparece** si el simulador tiene conectado el de
  hardware: `defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool
  false` y reiniciar el Simulator. Sin eso, cualquier cosa que se apoye en el teclado
  se ve como si no existiera.

## El modelo: cuentas, saldos y transferencias

Un usuario tiene **varias cuentas** (`accounts`): la caja de ahorro en pesos, la de
dólares, la tarjeta de crédito. Cada movimiento pertenece a una.

```
saldo de una cuenta = último saldo confirmado por el banco
                      + movimientos posteriores a esa fecha
gasto del mes       = movimientos negativos que NO son transferencia
```

El saldo se ancla al **último** saldo que confirmó el banco, no al más viejo: si se
suman todos los movimientos desde el principio de los tiempos, cualquier hueco en el
historial descuadra el total para siempre.

### La tarjeta de crédito

Si se cargan el estado de cuenta **y** el resumen de la tarjeta, la misma plata
aparece dos veces: como el pago de la tarjeta y como las compras que lo componen. Por
eso el pago se marca `is_transfer`: baja el saldo del banco pero no cuenta como gasto,
y el gasto queda en el mes en que se compró.

**No se inventa la contrapartida del pago.** Cada pata sale de una fila real de un
archivo; si se inventara, al importar el resumen el mismo pago entraría dos veces.

Si no se lleva el resumen de la tarjeta, el pago sí cuenta como gasto: es el único
rastro que queda. Eso lo elige un interruptor en la pantalla de importación.

### Los traspasos

«TRASPASO DE 3650979» y «TRASPASO A 2359042» se ven iguales y no lo son: el primero es
plata que se mueve entre cuentas propias, el segundo es plata que se le manda a
alguien. Se distinguen por `external_number`, que guarda el número de cuenta tal como
lo escribe el banco. El primero no es ingreso ni gasto; el segundo sí.

### Duplicados

Cada fila importada tiene una clave estable —cuenta, fecha, importe, descripción y
**orden entre filas idénticas**— con índice único en la base. Reimportar el mismo
archivo no agrega nada, y dos cafés iguales del mismo día siguen siendo dos gastos.

## Leer los PDFs del banco

`src/features/importacion/`. El texto plano de un PDF no alcanza: en el resumen de
tarjeta las descripciones salen por un lado y los importes por otro. `pdf.ts`
reconstruye la tabla con las coordenadas de pdf.js, agrupando por altura y ordenando
por posición.

Tres lectores, todos de Itaú: estado de cuenta mensual, resumen de tarjeta y consulta
de Itaú Link (el mes en curso). Al soltar un archivo no se le pregunta al usuario qué
es: entre los lectores del banco elegido, el que lo reconoce es el correcto.

**El signo no está escrito en el PDF.** Sale de cómo se movió el saldo corriente, o de
en qué columna cae el importe. Eso permite algo que vale más que la comodidad: cada
lectura se controla contra el saldo que el propio banco imprime, y ese `descuadre` se
muestra antes de importar. Si un lector nuevo no puede cuadrar contra nada, es señal
de que está adivinando.

Los archivos se leen dentro del teléfono. **Los PDFs reales nunca entran al repo**: los
tests arman `LineaDePdf` a mano.

## El manual de marca manda

Las decisiones visuales no se toman en la pantalla, salen de `src/theme`:

- **No hay rojo para gastos.** Un gasto va en Espuma con signo menos real (−). El
  coral queda para errores de verdad. (Única excepción, pedida explícitamente: los
  gastos del panel de resumen del mes.)
- **Un solo acento verde por pieza**, nunca más del 10% de la superficie.
- **La cifra manda**: al menos el doble de grande que su etiqueta, siempre tabular.
- **Nada rebota**: 120/240/400 ms con curvas asimétricas, sin resortes ni overshoot.
- **Voseo, sentence case, sin exclamaciones ni emojis cerca de una cifra.**

Las cifras se formatean con `src/lib/format.ts` y nunca a mano: punto de miles, coma
decimal, signo menos real U+2212, decimales ocultos cuando son cero.

React Native no soporta ejes de fuentes variables, así que `scripts/build-fonts.py`
corta instancias estáticas de Archivo con el ancho que pide el manual. Los `.ttf`
quedan versionados: **no regenerarlos en CI**.

## Distribución

`scripts/testflight.sh` archiva y sube en un solo paso (`destination: upload`, sin
`altool`, que no acepta claves de API). `scripts/testflight-distribute.mjs` espera a
que Apple procese **ese** build, escribe las notas, lo deja como único del grupo y, si
el grupo es externo, lo manda a Beta App Review.

El número de build es `AAAAMMDDhhmmss` en UTC, escrito con PlistBuddy sobre el
`Info.plist` ya generado.

## Trampas que ya nos costaron una corrida

Todas salieron de correr las cosas, no de leerlas. Vale la pena conocerlas antes de
tocar esta zona.

- **`new Date('2026-08-01')` da 31 de julio** en Montevideo, y el mes aparecía vacío.
  Para fechas ISO va `parseFechaISO`, siempre.
- **Una lectura que falla no es una lista vacía.** La limpieza del grupo de TestFlight
  no corrió nunca y terminaba en verde: `include` no está permitido en
  `/v1/betaGroups/{id}/builds`, la consulta daba 400 y el cuerpo de error se leía como
  «el grupo no tiene builds». Si una respuesta no es la que se espera, cortar y decirlo.
- **Repartir «el último build» reparte el anterior.** Apple tarda minutos en procesar;
  hay que esperar por el número que se subió.
- **Expo escribe `CFBundleVersion` como literal** al hacer prebuild: pasarle
  `CURRENT_PROJECT_VERSION` a `xcodebuild` no lo pisa.
- **El bash de macOS es 3.2**: `"${ARR[@]}"` con el array vacío corta el script bajo
  `set -u`. Va `${ARR[@]+"${ARR[@]}"}`.
- **Un módulo que también es CLI necesita guardia de entry point**, o corre al
  importarlo y se come los argumentos de quien lo importó.
- **Un sheet de iOS tapa la barra de tabs entera.** No hay presentación modal que la
  deje a la vista: si el alta se abre desde la tab del medio, apretar «Movimiento»
  hace desaparecer la navegación. Por eso **el alta es una tab de verdad**
  (`app/(app)/agregar.tsx`), no un modal, con su propio «‹ Atrás» arriba a la
  izquierda. Como la tab queda montada, el formulario conserva lo tecleado al cambiar
  de tab: se limpia al guardar y al salir por «Atrás».
- **`InputAccessoryView` no renderiza nada con la arquitectura nueva.** Se ve el
  teclado y ninguna barra, sin error. Como el `decimal-pad` tampoco trae tecla de
  retorno, el «Listo» se pone a mano: una barra absoluta a la altura que anuncia
  `keyboardWillShow`, fuera del `KeyboardAvoidingView` para que la altura no se cuente
  dos veces.
- **`contentInsetAdjustmentBehavior="automatic"` ya suma el safe area.** Sumarle
  además un `paddingTop: insets.top` deja el doble de aire arriba del encabezado. En
  las pantallas de tabs va `"never"` y el inset a mano, que es el que se controla.
- **`Boton` con `ancho="contenido"` hereda la alineación del contenedor.** No se
  ancla solo: en un panel el contenedor pide `alignItems: 'flex-start'`, y en un
  `EstadoVacio` sale centrado porque el estado vacío centra.
- **El simulador no puede linkear SwiftUICore** contra los frameworks precompilados de
  Expo: `PARA_SIMULADOR=1 npx expo prebuild -p ios --no-clean`. Para dispositivo y CI
  van los precompilados, que compilan mucho más rápido.
- **`revision@caudal.app` es la cuenta con la que Apple revisa la app.** Al vaciar la
  base para probar de cero, esa no se toca.

## Dónde está cada cosa

```
app/                  rutas (expo-router)
  (auth)/             ingresar · crear-cuenta
  (app)/              tabs: mes · movimiento · historial
    agregar.tsx       alta de movimiento, manual o desde el banco
  cuenta.tsx          perfil y preferencias, desde el avatar de Mes
src/
  components/         Cifra, Panel, FilaMovimiento, GraficoBarras…
  features/
    auth/             sesión de Supabase
    datos/            repo real y repo demo (sin .env arranca en demo)
    importacion/      pdf.ts · itau.ts · importar.ts · PanelDeImportacion.tsx
    movimientos/      queries de react-query
  theme/              color, tipografía, espaciado, radios, movimiento
  lib/                supabase, config y formato de cifras
supabase/migrations/  esquema con RLS en todas las tablas
scripts/              fuentes, iconos, testflight.sh, asc.mjs
```
