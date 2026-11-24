import { useLocalSearchParams } from 'expo-router';

import { TelaClube } from '@/components/tela-clube';

// Personal/admin · um clube (ou "novo" para criar)
export default function ClubePersonal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TelaClube id={id} lado="personal" />;
}
