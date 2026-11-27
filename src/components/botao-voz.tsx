import { Pressable } from 'react-native';

import { Texto } from '@/components/texto';
import { Cores } from '@/constants/theme';
import { useVoz } from '@/lib/voz';

// Liga/desliga a voz (contagem 3, 2, 1 e avisos). Fica salvo para as próximas vezes.
export function BotaoVoz() {
  const [ligada, setLigada] = useVoz();
  return (
    <Pressable
      onPress={() => setLigada(!ligada)}
      hitSlop={12}
      accessibilityRole="switch"
      accessibilityState={{ checked: ligada }}
      accessibilityLabel={ligada ? 'Voz ligada. Toque para desligar' : 'Voz desligada. Toque para ligar'}>
      <Texto variante="corpo" cor={ligada ? Cores.texto : Cores.textoApagado}>
        {ligada ? '🔊 Voz' : '🔇 Sem voz'}
      </Texto>
    </Pressable>
  );
}
