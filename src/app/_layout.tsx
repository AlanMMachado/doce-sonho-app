import { AppProvider } from '@/contexts/AppContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, useFonts } from '@expo-google-fonts/nunito';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';

const paperTheme = {
  ...MD3LightTheme,
  fonts: {
    ...MD3LightTheme.fonts,
    bodyLarge:    { ...MD3LightTheme.fonts.bodyLarge,    fontFamily: 'Nunito_400Regular' },
    bodyMedium:   { ...MD3LightTheme.fonts.bodyMedium,   fontFamily: 'Nunito_400Regular' },
    bodySmall:    { ...MD3LightTheme.fonts.bodySmall,    fontFamily: 'Nunito_400Regular' },
    displayLarge: { ...MD3LightTheme.fonts.displayLarge, fontFamily: 'Nunito_700Bold' },
    displayMedium:{ ...MD3LightTheme.fonts.displayMedium,fontFamily: 'Nunito_600SemiBold' },
    displaySmall: { ...MD3LightTheme.fonts.displaySmall, fontFamily: 'Nunito_500Medium' },
    headlineLarge:{ ...MD3LightTheme.fonts.headlineLarge,fontFamily: 'Nunito_700Bold' },
    headlineMedium:{...MD3LightTheme.fonts.headlineMedium,fontFamily:'Nunito_600SemiBold'},
    headlineSmall:{ ...MD3LightTheme.fonts.headlineSmall,fontFamily: 'Nunito_500Medium' },
    titleLarge:   { ...MD3LightTheme.fonts.titleLarge,   fontFamily: 'Nunito_600SemiBold' },
    titleMedium:  { ...MD3LightTheme.fonts.titleMedium,  fontFamily: 'Nunito_500Medium' },
    titleSmall:   { ...MD3LightTheme.fonts.titleSmall,   fontFamily: 'Nunito_500Medium' },
    labelLarge:   { ...MD3LightTheme.fonts.labelLarge,   fontFamily: 'Nunito_500Medium' },
    labelMedium:  { ...MD3LightTheme.fonts.labelMedium,  fontFamily: 'Nunito_400Regular' },
    labelSmall:   { ...MD3LightTheme.fonts.labelSmall,   fontFamily: 'Nunito_400Regular' },
  },
};

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sales" />
        <Stack.Screen name="shipments" />
        <Stack.Screen name="config" />
        <Stack.Screen name="customers" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PaperProvider theme={paperTheme}>
      <AuthProvider>
        <AppProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <RootNavigator />
            <StatusBar style="auto" />
          </ThemeProvider>
        </AppProvider>
      </AuthProvider>
    </PaperProvider>
  );
}
