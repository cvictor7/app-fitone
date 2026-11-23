import { Tabs } from 'expo-router/tabs';
import Svg, { Path, Rect } from 'react-native-svg';

import { IconePerfil, IconeTreinar, IconeTrofeu } from '@/components/icones';
import { Cores, Fontes } from '@/constants/theme';

function IconeAlunos({ cor }: { cor: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M8 12a3 3 0 100-6 3 3 0 000 6zM16.5 12a3 3 0 100-6 3 3 0 000 6z" stroke={cor} strokeWidth={2.2} />
      <Path d="M2.5 19c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5M11.5 19c.6-3 2.5-4.5 5-4.5s4.4 1.5 5 4.5" stroke={cor} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function IconeModelos({ cor }: { cor: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={3.5} width={16} height={17} rx={2} stroke={cor} strokeWidth={2.2} />
      <Path d="M8 8h8M8 12h8M8 16h5" stroke={cor} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export default function AbasPersonal() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Cores.verde,
        tabBarInactiveTintColor: Cores.textoApagado,
        tabBarStyle: { backgroundColor: Cores.fundo, borderTopColor: Cores.borda, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: Fontes.textoSemi, fontSize: 11, marginTop: 2 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Alunos', tabBarIcon: ({ color }) => <IconeAlunos cor={String(color)} /> }} />
      <Tabs.Screen name="modelos" options={{ title: 'Modelos', tabBarIcon: ({ color }) => <IconeModelos cor={String(color)} /> }} />
      <Tabs.Screen name="exercicios" options={{ title: 'Exercícios', tabBarIcon: ({ color }) => <IconeTreinar cor={String(color)} /> }} />
      <Tabs.Screen name="desafios" options={{ title: 'Desafios', tabBarIcon: ({ color }) => <IconeTrofeu cor={String(color)} /> }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: ({ color }) => <IconePerfil cor={String(color)} /> }} />
    </Tabs>
  );
}
