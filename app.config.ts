import type { ExpoConfig } from 'expo/config';

// Fondeo — el fondo base de la marca (manual de marca, seccion 03).
const FONDEO = '#071B2F';

const config: ExpoConfig = {
  name: 'Caudal',
  slug: 'caudal',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'caudal',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  backgroundColor: FONDEO,
  ios: {
    bundleIdentifier: 'com.juanabreu.caudal',
    supportsTablet: false,
    // App Store Connect rechaza subir dos veces el mismo build: este número sube
    // en cada envío, aunque la versión visible siga igual.
    buildNumber: '1',
    infoPlist: {
      // expo-status-bar maneja el estilo desde JS: con la clave en true,
      // RCTStatusBarManager tira error al setearlo.
      UIViewControllerBasedStatusBarAppearance: false,
      // La carpeta de la app aparece en Archivos: se pueden dejar ahí los
      // estados de cuenta y traerlos sin pasar por iCloud ni por el mail.
      UIFileSharingEnabled: true,
      LSSupportsOpeningDocumentsInPlace: true,
      // La app solo usa HTTPS, que es criptografía exenta. Declararlo evita que
      // App Store Connect pregunte por exportación en cada envío.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.juanabreu.caudal',
    adaptiveIcon: {
      backgroundColor: FONDEO,
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-build-properties',
      {
        ios: {
          // Los frameworks precompilados de Expo arrastran SwiftUICore en sus
          // .swiftmodule, y el simulador no puede linkearlo: «cannot link
          // directly with SwiftUICore». Compilando desde el código fuente el
          // problema no existe.
          //
          // Pero eso solo pasa en el simulador: para dispositivo los
          // precompilados andan bien y el build es varias veces más rápido, que
          // es lo que se archiva y lo que corre en CI. Por eso se decide acá:
          //   PARA_SIMULADOR=1 npx expo prebuild -p ios   → desde fuente
          //   npx expo prebuild -p ios                    → precompilados
          buildReactNativeFromSource: process.env.PARA_SIMULADOR === '1',
        },
      },
    ],
    'expo-router',
    'expo-secure-store',
    // Apple ID personal gratis: firma para el iPhone propio, con 7 días de vida.
    ['./plugins/withEquipoDeFirma', { teamId: 'VPNXQ8K2P8' }],
    [
      'expo-font',
      {
        // Se embeben en el binario: sin carga en runtime, sin flash de texto.
        fonts: [
          './assets/fonts/CaudalDisplayBold.ttf',
          './assets/fonts/CaudalTitleSemiBold.ttf',
          './assets/fonts/CaudalTextRegular.ttf',
          './assets/fonts/CaudalTextMedium.ttf',
          './assets/fonts/CaudalMicroBold.ttf',
          './assets/fonts/IBMPlexMono-Regular.ttf',
          './assets/fonts/IBMPlexMono-Medium.ttf',
        ],
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: FONDEO,
        image: './assets/splash-icon.png',
        imageWidth: 140,
        resizeMode: 'contain',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
