import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ArquivosDeFonte, Cores } from '@/constants/theme';
import { ProvedorSessao, useSessao } from '@/lib/sessao';

// Segura a tela de abertura (logo) até as fontes e o login carregarem
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
  if (!fontesProntas && !erroFontes) return null;

  return (
    <ThemeProvider value={TemaFitOne}>
      <StatusBar style="light" />
      <ProvedorSessao>
        <Navegacao />
      </ProvedorSessao>
    </ThemeProvider>
  );
}

// Cada pessoa vê só as telas da etapa em que está:
// sem login → entrar; logado sem termos/nome → cadastro; sem academia → academia; pronto → abas.
function Navegacao() {
  const { carregando, sessao, perfil, aceitouTermos, gymId } = useSessao();

  useEffect(() => {
    if (!carregando) SplashScreen.hideAsync();
  }, [carregando]);

  if (carregando) return null;

  const logado = !!sessao;
  const cadastroFeito = logado && aceitouTermos && !!perfil?.nome;
  const temAcademia = cadastroFeito && !!gymId;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Cores.fundo } }}>
      <Stack.Protected guard={!logado}>
        <Stack.Screen name="entrar" />
      </Stack.Protected>
      <Stack.Protected guard={logado && !cadastroFeito}>
        <Stack.Screen name="cadastro" />
      </Stack.Protected>
      <Stack.Protected guard={cadastroFeito && !temAcademia}>
        <Stack.Screen name="academia" />
      </Stack.Protected>
      <Stack.Protected guard={temAcademia}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="treino/[id]" />
        <Stack.Screen name="registro/[modalidade]" />
      </Stack.Protected>
      <Stack.Screen name="privacidade" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
