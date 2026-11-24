import { useLocalSearchParams } from 'expo-router';

import { TelaPublicacao } from '@/components/tela-publicacao';

// Personal/admin · um treino publicado com os comentários
export default function PublicacaoPersonal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TelaPublicacao id={id} />;
}
