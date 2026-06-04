import { AppProvider } from '@/contexts/AppContext';
import { initDatabase } from '@/database/db';
import { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, useFonts } from '@expo-google-fonts/nunito';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  
  const paperTheme = {
    ...MD3LightTheme,
    fonts: {
      ...MD3LightTheme.fonts,
      bodyLarge: {
        ...MD3LightTheme.fonts.bodyLarge,
        fontFamily: 'Nunito_400Regular',
      },
      bodyMedium: {
        ...MD3LightTheme.fonts.bodyMedium,
        fontFamily: 'Nunito_400Regular',
      },
      bodySmall: {
        ...MD3LightTheme.fonts.bodySmall,
        fontFamily: 'Nunito_400Regular',
      },
      displayLarge: {
        ...MD3LightTheme.fonts.displayLarge,
        fontFamily: 'Nunito_700Bold',
      },
      displayMedium: {
        ...MD3LightTheme.fonts.displayMedium,
        fontFamily: 'Nunito_600SemiBold',
      },
      displaySmall: {
        ...MD3LightTheme.fonts.displaySmall,
        fontFamily: 'Nunito_500Medium',
      },
      headlineLarge: {
        ...MD3LightTheme.fonts.headlineLarge,
        fontFamily: 'Nunito_700Bold',
      },
      headlineMedium: {
        ...MD3LightTheme.fonts.headlineMedium,
        fontFamily: 'Nunito_600SemiBold',
      },
      headlineSmall: {
        ...MD3LightTheme.fonts.headlineSmall,
        fontFamily: 'Nunito_500Medium',
      },
      titleLarge: {
        ...MD3LightTheme.fonts.titleLarge,
        fontFamily: 'Nunito_600SemiBold',
      },
      titleMedium: {
        ...MD3LightTheme.fonts.titleMedium,
        fontFamily: 'Nunito_500Medium',
      },
      titleSmall: {
        ...MD3LightTheme.fonts.titleSmall,
        fontFamily: 'Nunito_500Medium',
      },
      labelLarge: {
        ...MD3LightTheme.fonts.labelLarge,
        fontFamily: 'Nunito_500Medium',
      },
      labelMedium: {
        ...MD3LightTheme.fonts.labelMedium,
        fontFamily: 'Nunito_400Regular',
      },
      labelSmall: {
        ...MD3LightTheme.fonts.labelSmall,
        fontFamily: 'Nunito_400Regular',
      },
    },
  };
  
  useEffect(() => {
    initDatabase();
  }, []);
  
  if (!fontsLoaded) {
    return null; // Or a loading screen
  }
  
  return (
    <PaperProvider theme={paperTheme}>
      <AppProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="vendas/nova" options={{ headerShown: false }} />
            <Stack.Screen name="vendas/editar" options={{ headerShown: false }} />
            <Stack.Screen name="remessas/nova" options={{ headerShown: false }} />
            <Stack.Screen name="remessas/editar" options={{ headerShown: false }} />
            <Stack.Screen name="config/produtos" options={{ headerShown: false }} />
            <Stack.Screen name="config/metas" options={{ headerShown: false }} />
            <Stack.Screen name="clientes/[nome]" options={{ headerShown: false }} />
            <Stack.Screen name="remessas/[id]" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AppProvider>
    </PaperProvider>
  );
}
