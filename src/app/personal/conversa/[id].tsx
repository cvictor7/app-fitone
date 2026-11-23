import { useLocalSearchParams } from 'expo-router';

import { TelaConversa } from '@/components/tela-conversa';

// Personal · conversa com um aluno
export default function ConversaPersonal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TelaConversa outroId={id} souPersonal />;
}
