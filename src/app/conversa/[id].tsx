import { useLocalSearchParams } from 'expo-router';

import { TelaConversa } from '@/components/tela-conversa';

// Aluno · conversa com o personal
export default function ConversaAluno() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TelaConversa outroId={id} souPersonal={false} />;
}
