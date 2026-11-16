import { Tabs } from 'expo-router/tabs';

import { IconeEvolucao, IconeHoje, IconePerfil, IconeTreinar } from '@/components/icones';
import { Cores, Fontes } from '@/constants/theme';

export default function LayoutAbas() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Cores.verde,
        tabBarInactiveTintColor: Cores.textoApagado,
        tabBarStyle: {
          backgroundColor: Cores.fundo,
          borderTopColor: Cores.borda,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: Fontes.textoSemi,
          fontSize: 11,
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Hoje', tabBarIcon: ({ color }) => <IconeHoje cor={String(color)} /> }}
      />
      <Tabs.Screen
        name="treinar"
        options={{ title: 'Treinar', tabBarIcon: ({ color }) => <IconeTreinar cor={String(color)} /> }}
      />
      <Tabs.Screen
        name="evolucao"
        options={{ title: 'Evolução', tabBarIcon: ({ color }) => <IconeEvolucao cor={String(color)} /> }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: ({ color }) => <IconePerfil cor={String(color)} /> }}
      />
    </Tabs>
  );
}
