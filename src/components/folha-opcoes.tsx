import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';

// Menu de opções que sobe de baixo. Substitui o Alert quando há mais de 2 escolhas
// (no Android o Alert mostra no máximo 3 botões e some com o resto).

export type Opcao = { texto: string; destrutivo?: boolean; aoTocar: () => void };

export type ConteudoFolha = { titulo: string; subtitulo?: string; opcoes: Opcao[] } | null;

export function FolhaOpcoes({ conteudo, aoFechar }: { conteudo: ConteudoFolha; aoFechar: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!conteudo} transparent animationType="slide" onRequestClose={aoFechar}>
      <Pressable style={estilos.fundo} onPress={aoFechar} />
      {conteudo ? (
        <View style={[estilos.folha, { paddingBottom: insets.bottom + Espaco.md }]}>
          <View style={estilos.alca} />
          <Texto variante="subtitulo" style={{ textAlign: 'center' }}>
            {conteudo.titulo}
          </Texto>
          {conteudo.subtitulo ? (
            <Texto variante="legenda" style={{ textAlign: 'center', marginTop: 4 }}>
              {conteudo.subtitulo}
            </Texto>
          ) : null}
          <ScrollView style={{ maxHeight: 420, marginTop: Espaco.md }} contentContainerStyle={{ gap: Espaco.sm }}>
            {conteudo.opcoes.map((o) => (
              <Pressable
                key={o.texto}
                onPress={() => {
                  aoFechar();
                  setTimeout(o.aoTocar, 250); // deixa a folha fechar antes (outro alerta pode abrir)
                }}
                style={({ pressed }) => [estilos.opcao, pressed && { opacity: 0.7 }]}>
                <Texto variante="corpo" cor={o.destrutivo ? Cores.perigo : Cores.texto} style={{ fontFamily: 'Archivo_600SemiBold' }}>
                  {o.texto}
                </Texto>
              </Pressable>
            ))}
            <Pressable onPress={aoFechar} style={[estilos.opcao, { backgroundColor: 'transparent' }]}>
              <Texto variante="corpo" cor={Cores.textoSecundario}>
                Cancelar
              </Texto>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  folha: {
    backgroundColor: Cores.superficie,
    borderTopLeftRadius: Raio.lg,
    borderTopRightRadius: Raio.lg,
    paddingHorizontal: Espaco.lg,
    paddingTop: Espaco.sm,
  },
  alca: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: Cores.borda, marginBottom: Espaco.md },
  opcao: {
    minHeight: 56,
    borderRadius: Raio.md,
    backgroundColor: Cores.superficieAlta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Espaco.md,
  },
});
