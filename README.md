# Caudal

App de finanzas personales. iOS primero, con Android abierto: todo el código es
React Native y no hay nada atado a UIKit salvo los efectos nativos, que degradan solos.

Tu plata tiene un caudal: la app solo lo hace visible.

## Cómo está armado

| Capa | Qué usa |
|---|---|
| App | Expo SDK 57 · React Native 0.86 · expo-router v6 (rutas por archivo) |
| Navegación | `NativeTabs` — `UITabBarController` real, con Liquid Glass del sistema en iOS 26 |
| Backend | Supabase (Postgres + Auth), con RLS en todas las tablas |
| Datos | `@tanstack/react-query` |
| Marca | Sistema de diseño derivado del manual, en `src/theme` |

## Arrancar

```sh
npm install
npm run fonts               # genera las instancias de Archivo (necesita python3 + fonttools)
npm run icons               # rasteriza el isotipo a iconos y splash
npx expo run:ios            # simulador
npm run ios:device          # iPhone por cable
```

Para el **simulador** hay que regenerar el proyecto nativo desde fuente:

```sh
PARA_SIMULADOR=1 npx expo prebuild -p ios --no-clean && (cd ios && pod install)
npx expo run:ios
```

Los frameworks precompilados de Expo arrastran `SwiftUICore` en sus `.swiftmodule` y
el simulador no puede linkearlo. Para dispositivo no pasa, y ahí los precompilados
son varias veces más rápidos: por eso el build de TestFlight y el de CI no llevan
esa variable.

### Modo demo

Sin `.env` la app arranca igual, contra un almacén local en AsyncStorage sembrado con
siete meses de movimientos de ejemplo (`src/features/datos/repoDemo.ts`). No hay cuentas
y los datos no salen del teléfono. Sirve para ver la app funcionando antes de tener backend.

Para conectar Supabase:

```sh
cp .env.example .env        # completar URL y key del proyecto
```

Las pantallas no cambian: `src/features/datos/repo.ts` elige la implementación según
si hay credenciales.

### Base de datos

```sh
supabase link --project-ref <ref-del-proyecto>
supabase db push
```

El trigger `on_auth_user_created` siembra el perfil y ocho categorías con su color
de la rampa cuando alguien crea la cuenta.

## Importar del banco

**Agregar movimiento → Desde el banco**, y se trae el PDF tal cual lo descarga el banco.
No hay que decir qué documento es: entre los lectores del banco elegido, el que lo
reconoce es el correcto. Hoy se leen tres formatos de Itaú, y el archivo se lee dentro
del teléfono — los estados de cuenta no salen del dispositivo.

| Archivo | Qué trae |
|---|---|
| Estado de cuenta mensual | Secciones en pesos y en dólares, con saldo de apertura y cierre |
| Resumen de tarjeta | Consumos y pagos, con columna de pesos y de dólares |
| Consulta de Itaú Link | El mes en curso, con débito y crédito en columnas separadas |

El texto plano de un PDF no alcanza: el resumen de tarjeta sale con las descripciones de
un lado y los importes del otro. `src/features/importacion/pdf.ts` reconstruye la tabla
con las coordenadas que da pdf.js, agrupando por altura y ordenando por posición.

**El signo no está escrito en el PDF**: sale de cómo se movió el saldo corriente, o de en
qué columna cae el importe. Eso permite controlar la lectura entera contra el propio
banco, y ese cuadre se muestra antes de importar.

Al leer un archivo, un modal ofrece crear las cuentas que trajo, con el nombre y la
moneda sacados del propio PDF.

### La tarjeta de crédito

Si cargás el estado de cuenta **y** el resumen de la tarjeta, la misma plata aparece dos
veces: como el pago de la tarjeta y como las compras que lo componen. Por eso cada
movimiento pertenece a una cuenta y el pago se marca `is_transfer`:

```
saldo de una cuenta = último saldo confirmado por el banco
                      + movimientos posteriores a esa fecha
gasto del mes       = movimientos negativos que NO son transferencia
```

Así el saldo del banco baja cuando pagás la tarjeta, el gasto queda en el mes en que
compraste, y nada se cuenta dos veces. **Si no llevás el resumen de la tarjeta**, el pago
sí cuenta como gasto: es el único rastro que queda. Eso se elige con el interruptor de
la pantalla de importación.

No se inventa la contrapartida del pago — cada pata sale de una fila real de un archivo.
Inventarla haría que al importar el resumen el mismo pago entrara dos veces.

### Los traspasos

«TRASPASO DE 3650979» y «TRASPASO A 2359042» se ven igual pero no lo son: el primero es
plata que pasa entre cuentas propias, el segundo es plata que se le manda a alguien. La
cuenta guarda su número tal como lo escribe el banco y con eso se distinguen. El primero
no es ingreso ni gasto; el segundo sí.

### Duplicados

Reimportar el mismo archivo no duplica nada: cada fila tiene una clave estable
(cuenta, fecha, importe, descripción y orden entre filas idénticas) con índice único en
la base, así que dos cafés iguales del mismo día sí son dos gastos.

## Firma en el iPhone

Está firmada con el Apple ID personal (team `Juan Abreu`, `VPNXQ8K2P8`), que es gratis
pero da **7 días de vida** al build. El equipo de firma queda fijado por
`plugins/withEquipoDeFirma.js`, así que sobrevive a cada `expo prebuild`.

La primera vez:

1. Xcode → Settings (⌘,) → Accounts → **+** → Apple ID, e iniciar sesión.
   Sin esto el build falla con «No Accounts: Add a new account in Accounts settings».
2. Enchufar el iPhone y desbloquearlo.
3. `npm run ios:device`
4. En el teléfono: Ajustes → General → VPN y gestión de dispositivos → confiar en el
   desarrollador.

Después, cuando la app deje de abrir a los 7 días, alcanza con repetir el paso 3.

Con la cuenta paga se sube a TestFlight — ver más abajo.

## El manual de marca manda

Las decisiones visuales no se toman en la pantalla, salen de `src/theme` y del manual:

- **No hay rojo para gastos.** Un gasto va en Espuma con signo menos real (−). El
  coral queda para errores de verdad.
- **Un solo acento verde por pieza.** El verde nunca pasa del 10% de la superficie.
- **La cifra manda:** al menos el doble de grande que su etiqueta, siempre tabular.
- **Nada rebota:** curvas asimétricas de 120/240/400 ms, sin resortes ni overshoot.
- **Voseo, sentence case, sin exclamaciones ni emojis cerca de una cifra.**

### Fuentes

React Native no soporta ejes de fuentes variables, así que `scripts/build-fonts.py`
corta instancias estáticas de Archivo con el ancho exacto que pide el manual
(wdth 118 para cifras, 106 para títulos, 100 para el resto) y les da un nombre de
familia propio. Los `.ttf` quedan versionados en `assets/fonts`.

## Estructura

```
app/                  rutas (expo-router)
  (auth)/             ingresar · crear-cuenta
  (app)/              tabs: mes · movimiento (alta) · historial
  cuenta.tsx          perfil y preferencias, desde el avatar de Mes
  nuevo.tsx           alta de movimiento (modal)
  movimiento/[id].tsx detalle y borrado
src/
  components/         Cifra, Panel, FilaMovimiento, GraficoBarras, Isotipo…
  features/           auth y queries de movimientos
  theme/              color, tipografía, espaciado, radios, movimiento
  lib/                supabase y formato de cifras
supabase/migrations/  esquema con RLS
scripts/              build-fonts.py · build-icons.mjs · testflight.sh · asc.mjs
```

## Ramas y TestFlight

Dos ramas largas, y cada una tiene su público:

| Rama | Grupo de TestFlight | Quién lo recibe | Revisión de Apple |
|---|---|---|---|
| `staging` (por defecto) | **Equipo** — interno | Solo yo, en mi teléfono | No |
| `main` | **Testers** — externo | Cualquiera con el [link público](https://testflight.apple.com/join/QJmaF4wy) | Sí, la primera vez y en cada versión |

`staging` es donde veo las cosas primero, sin esperar a nadie: un build interno está
instalable a los quince minutos del merge. Lo que me convence pasa a `main`. Los
grupos internos no tienen link — el build aparece directamente en la app TestFlight
del iPhone.

Todo sale de `staging`: rama de feature → PR a `staging` → merge, y el merge sube
solo al grupo interno. **Promover** es abrir un PR de `staging` a `main`; ese merge
es el que sale al link público.

Cada grupo ve **un solo build**: al asignar el nuevo, el script saca los anteriores.
Así nadie instala por error uno viejo, que es lo que pasa cuando la lista se
acumula. En el grupo externo se conserva el último aprobado hasta que Apple
aprueba el nuevo, para no dejar el link sin nada que instalar mientras tanto.

Para probar una rama de feature sin tocar ninguna de las dos, *Actions → TestFlight →
Run workflow*, se elige la rama y el destino (`interno` por defecto).

**Si un build sale mal, no se despublica: se arregla y se sube otro.** Un revert
en `main` es un merge más, y sube igual.

### Números de build

`AAAAMMDDhhmmss` en UTC, puesto por `scripts/testflight.sh` sobre el `Info.plist`
ya generado. Siempre sube y nunca repite, que es todo lo que App Store Connect
pide. El número de corrida de Actions no servía: se reinicia si se recrea el
workflow. Los segundos tampoco sobran: al promover, el merge a `staging` y el de
`staging` a `main` caen en el mismo minuto.

Expo escribe `CFBundleVersion` como literal al hacer prebuild, así que pasarle
`CURRENT_PROJECT_VERSION` a `xcodebuild` no alcanza — hay que tocar el plist.

### Antes de compilar

`lint`, `typecheck` y `test` corren primero, en los dos workflows. Un build de iOS
en un runner de Apple no baja de 40 minutos: no vale la pena gastarlos para
enterarse al final de que faltaba un tipo.

```sh
npm run lint
npm run typecheck
npm test        # runner de Node, sin dependencias de testing
```

Los tests cubren el formato de cifras y los lectores de PDF, que es donde están las
decisiones que no se ven: de dónde sale el signo, cómo se separan pesos de dólares,
qué es un traspaso entre cuentas propias. Las líneas de PDF de los tests están
escritas a mano — los extractos de verdad no entran en el repo.

### Subir a mano desde la Mac

```sh
export APPLE_TEAM_ID=VPNXQ8K2P8
export ASC_KEY_ID=... ASC_ISSUER_ID=...
# la clave: se busca sola en ~/.private_keys, ~/private_keys y
# ~/.appstoreconnect/private_keys, o se apunta con ASC_KEY_PATH

npx expo prebuild --platform ios --no-install && (cd ios && pod install)
npm run testflight
node scripts/testflight-distribute.mjs \
  --build-number "$(cat build/ipa/build-number.txt)" --group Equipo --internal
```

`testflight.sh` archiva y sube en un solo paso (`destination: upload` en las
opciones de export), sin pasar por `altool`. Xcode se encarga de la firma con
`-allowProvisioningUpdates` y la clave de la API: crea el certificado y el perfil
en la nube, sin depender de que haya una sesión de Apple ID abierta en la máquina.

`testflight-distribute.mjs` espera a que Apple termine de procesar **ese** build —
no el último que haya, que es distinto: procesar tarda minutos y el anterior ya
está listo — y recién ahí lo asigna, escribe las notas y, si el grupo es externo,
lo manda a revisión.

### Puesta a punto, una sola vez

1. App creada en App Store Connect con el bundle id `com.juanabreu.caudal`.
2. Clave de la App Store Connect API (*Users and Access → Integrations*), rol
   App Manager.
3. Los secrets del repo: `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`,
   `ASC_KEY_P8` (el contenido del `.p8`), `EXPO_PUBLIC_SUPABASE_URL`,
   `EXPO_PUBLIC_SUPABASE_KEY`.
4. La información de Beta App Review en App Store Connect (contacto y qué probar):
   se completa a mano y queda para siempre.

El `.p8` del runner se escribe en `$RUNNER_TEMP`, que se borra al terminar el job.
