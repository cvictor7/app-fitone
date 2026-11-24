import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { conquistasNovas, marcarVistas, type Conquista } from '@/lib/conquistas';

// Abre sozinho quando há conquista nova (ex.: no fim do treino). Uma por vez.
export function ComemoracaoConquista({ verificar }: { verificar: boolean }) {
  const [fila, setFila] = useState<Conquista[]>([]);

  useEffect(() => {
    if (!verificar) return;
    conquistasNovas()
      .then((novas) => {
        if (novas.length) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setFila(novas);
      })
      .catch(() => {});
  }, [verificar]);

  const atual = fila[0];
  function proxima() {
    if (!atual) return;
    marcarVistas([atual.codigo]);
    setFila((f) => f.slice(1));
  }

  return (
    <Modal visible={!!atual} transparent animationType="fade" onRequestClose={proxima}>
      <View style={estilos.fundo}>
        {atual ? (
          <View style={estilos.cartao}>
            <Texto variante="rotulo" cor={Cores.verde}>
              NOVA CONQUISTA
            </Texto>
            <Texto style={{ fontSize: 96, lineHeight: 110 }}>{atual.emoji}</Texto>
            <Texto variante="titulo" style={{ textAlign: 'center' }}>
              {atual.titulo}
            </Texto>
            <Texto variante="corpo" cor={Cores.textoSecundario} style={{ textAlign: 'center' }}>
              {atual.descricao}
            </Texto>
            <Botao titulo={fila.length > 1 ? `Boa! (mais ${fila.length - 1})` : 'Boa!'} onPress={proxima} style={{ alignSelf: 'stretch', marginTop: Espaco.md }} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: Espaco.lg },
  cartao: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderWidth: 2,
    borderColor: Cores.verde,
    padding: Espaco.xl,
    alignItems: 'center',
    gap: Espaco.sm,
  },
});
