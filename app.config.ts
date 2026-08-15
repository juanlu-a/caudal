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
    infoPlist: {
      UIViewControllerBasedStatusBarAppearance: true,
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
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
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
