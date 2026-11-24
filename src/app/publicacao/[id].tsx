import { useLocalSearchParams } from 'expo-router';

import { TelaPublicacao } from '@/components/tela-publicacao';

// Aluno · um treino publicado com os comentários
export default function PublicacaoAluno() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TelaPublicacao id={id} />;
}
