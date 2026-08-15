# Caudal

App de finanzas personales. iOS primero, con Android abierto: todo el código es
React Native y no hay nada atado a UIKit salvo los efectos nativos, que degradan solos.

Tu plata tiene un caudal: la app solo lo hace visible.

## Cómo está armado

| Capa | Qué usa |
|---|---|
| App | Expo SDK 57 · React Native 0.86 · expo-router v6 (rutas por archivo) |
| Navegación | `NativeTabs` — `UITabBarController` real, con Liquid Glass del sistema en iOS 26 |
| Backend | Supabase (Postgres + Auth), con RLS en las tres tablas |
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

`NativeTabs` no funciona en Expo Go: hay que correr el dev build.

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

Para pasar a TestFlight hace falta la cuenta paga de Apple Developer (US$ 99/año)
y agregar `eas.json`; el código no cambia.

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
  (app)/              tabs: mes · movimientos · cuenta
  nuevo.tsx           alta de movimiento (modal)
  movimiento/[id].tsx detalle y borrado
src/
  components/         Cifra, Panel, FilaMovimiento, GraficoBarras, Isotipo…
  features/           auth y queries de movimientos
  theme/              color, tipografía, espaciado, radios, movimiento
  lib/                supabase y formato de cifras
supabase/migrations/  esquema con RLS
scripts/              build-fonts.py · build-icons.mjs
```
