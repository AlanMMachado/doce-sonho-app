/** @type {import('expo/config').ExpoConfig} */
export default {
  name: 'Doce Sonho',
  slug: 'doce-sonho',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'docesonho',
  userInterfaceStyle: 'automatic',
  icon: './assets/images/icon.png',
  ios: {
    supportsTablet: true,
    icon: './assets/images/icon.png',
    bundleIdentifier: 'com.alanmmachado.docesonho',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    predictiveBackGestureEnabled: false,
    package: 'com.alanmmachado.docesonho',
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
  web: {
    output: 'static',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-font',
    'expo-web-browser',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/images/splash-icon.png',
        dark: {
          image: './assets/images/splash-icon.png',
          backgroundColor: '#FFFFFF',
        },
        imageWidth: 200,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '816a7c0e-b09f-45e0-b75f-df0ec1a44452',
    },
  },
  owner: 'alanmmachado',
};
