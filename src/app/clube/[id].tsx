import { useLocalSearchParams } from 'expo-router';

import { TelaClube } from '@/components/tela-clube';

// Aluno · um clube (ou "novo" para criar)
export default function ClubeAluno() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TelaClube id={id} lado="aluno" />;
}
