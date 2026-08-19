const isDev = process.env.APP_VARIANT === 'development';

const idSuffix = isDev ? '.dev' : '';
const scheme = isDev ? 'docesonhodev' : 'docesonho';

/** @type {() => import('expo/config').ExpoConfig} */
export default () => ({
  name: 'Doce Sonho',
  slug: 'doce-sonho',
  version: '1.0.0',
  orientation: 'portrait',
  scheme,
  userInterfaceStyle: 'automatic',
  icon: './assets/images/icon.png',
  ios: {
    supportsTablet: true,
    icon: './assets/images/icon.png',
    bundleIdentifier: `com.alanmmachado.docesonho${idSuffix}`,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: isDev
        ? './assets/images/adaptive-icon-dev-source.png' // Icone 1024x1024 upscalado para build dev, necessário para o app-icon-badge funcionar corretamente.
        : './assets/images/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    predictiveBackGestureEnabled: false,
    package: `com.alanmmachado.docesonho${idSuffix}`, 
    googleServicesFile: isDev ? undefined : (process.env.GOOGLE_SERVICES_JSON ?? './google-services.json'),  // build dev não precisa do google-services.json
  },
  web: {
    output: 'static',
  },
  plugins: [
    'expo-router',
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
    [
      'app-icon-badge', // Plugin para adicionar um badge de "DEV" no ícone do app. Source: https://github.com/obytes/app-icon-badge
      {
        enabled: isDev,
        badges: [
          {
            text: 'DEV',
            type: 'banner',
            position: 'top',
            color: '#FFFFFF',
            background: '#000000',
          },
        ],
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
});
