import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/texto';
import { Cores, Modalidades, Raio, type Modalidade } from '@/constants/theme';

type Props = {
  modalidade: Modalidade;
  onPress?: () => void;
};

export function ChipModalidade({ modalidade, onPress }: Props) {
  const { nome, cor } = Modalidades[modalidade];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [estilos.chip, { borderColor: cor }, pressed && { backgroundColor: cor + '22' }]}>
      <View style={[estilos.ponto, { backgroundColor: cor }]} />
      <Texto variante="corpo" style={estilos.nome}>
        {nome}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: Raio.pilula,
    borderWidth: 1.5,
    backgroundColor: Cores.superficie,
  },
  ponto: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nome: {
    fontSize: 15,
  },
});
