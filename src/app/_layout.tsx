import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ArquivosDeFonte, Cores } from '@/constants/theme';

// Segura a tela de abertura (logo) até as fontes carregarem
SplashScreen.preventAutoHideAsync();

const TemaFitOne = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Cores.verde,
    background: Cores.fundo,
    card: Cores.fundo,
    text: Cores.texto,
    border: Cores.borda,
  },
};

export default function RootLayout() {
  const [fontesProntas, erroFontes] = useFonts(ArquivosDeFonte);

  useEffect(() => {
    if (fontesProntas || erroFontes) SplashScreen.hideAsync();
  }, [fontesProntas, erroFontes]);

  if (!fontesProntas && !erroFontes) return null;

  return (
    <ThemeProvider value={TemaFitOne}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Cores.fundo } }} />
    </ThemeProvider>
  );
}
