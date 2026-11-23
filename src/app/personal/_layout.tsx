import { Stack } from 'expo-router';

import { Cores } from '@/constants/theme';

// Lado do personal: abas + telas de detalhe (ficha do aluno, plano, exercício).
export default function LayoutPersonal() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Cores.fundo } }} />;
}
