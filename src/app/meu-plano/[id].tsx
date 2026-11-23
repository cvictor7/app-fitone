import { useLocalSearchParams } from 'expo-router';

import { EditorPlano } from '@/components/editor-plano';
import { useSessao } from '@/lib/sessao';

// Aluno sem personal monta o próprio treino (/meu-plano/novo) ou edita (/meu-plano/ID)
export default function MeuPlano() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { sessao } = useSessao();
  return <EditorPlano id={id} aluno={sessao?.user.id} modo="aluno" />;
}
