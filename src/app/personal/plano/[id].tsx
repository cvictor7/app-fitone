import { useLocalSearchParams } from 'expo-router';

import { EditorPlano } from '@/components/editor-plano';

// Personal · montar plano de aluno (/personal/plano/novo?aluno=ID), modelo (/personal/plano/modelo) ou editar (/personal/plano/ID)
export default function PlanoPersonal() {
  const { id, aluno } = useLocalSearchParams<{ id: string; aluno?: string }>();
  return <EditorPlano id={id} aluno={aluno} modo="personal" />;
}
