import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BarraTopo } from '@/components/barra-topo';
import { Campo } from '@/components/campo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import {
  enviarMensagem,
  horaMensagem,
  listarConversas,
  listarMensagens,
  marcarLidas,
  ouvirMensagens,
  type Conversa,
  type Mensagem,
} from '@/lib/chat';

// Conversa entre personal e aluno (a mesma tela serve aos dois lados).

export function TelaConversa({ outroId, souPersonal }: { outroId: string; souPersonal: boolean }) {
  const [conversa, setConversa] = useState<Conversa | null | undefined>(undefined);
  const [msgs, setMsgs] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const lista = useRef<ComponentRef<typeof FlatList<Mensagem>>>(null);

  const carregar = useCallback(async () => {
    try {
      const [cs, ms] = await Promise.all([listarConversas(), listarMensagens(outroId, souPersonal)]);
      setConversa(cs.find((c) => c.outroId === outroId) ?? null);
      setMsgs(ms);
      marcarLidas(outroId);
    } catch {
      setConversa((atual) => atual ?? null);
    }
  }, [outroId, souPersonal]);

  useEffect(() => {
    carregar();
    // Mensagem nova na hora; e, por garantia, confere a cada 20 s
    const desligar = ouvirMensagens(outroId, souPersonal, (m) => {
      setMsgs((atual) => (atual.some((x) => x.id === m.id) ? atual : [...atual, m]));
      Haptics.selectionAsync();
      marcarLidas(outroId);
    });
    const relogio = setInterval(() => {
      listarMensagens(outroId, souPersonal)
        .then((ms) => setMsgs((atual) => (ms.length !== atual.length ? ms : atual)))
        .catch(() => {});
    }, 20000);
    return () => {
      desligar();
      clearInterval(relogio);
    };
  }, [carregar, outroId, souPersonal]);

  useEffect(() => {
    if (msgs.length > 0) setTimeout(() => lista.current?.scrollToEnd({ animated: true }), 80);
  }, [msgs.length]);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setErro(null);
    setEnviando(true);
    try {
      const m = await enviarMensagem(outroId, souPersonal, t);
      setTexto('');
      setMsgs((atual) => [...atual, m]);
    } catch {
      setErro('Não deu para enviar. Confira a internet e tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  if (conversa === undefined) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Mensagens" />
        <ActivityIndicator color={Cores.verde} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (conversa === null) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Mensagens" />
        <Texto variante="corpo" cor={Cores.textoSecundario} style={{ padding: Espaco.lg }}>
          Essa conversa não está disponível. Vocês precisam estar vinculados (personal e aluno).
        </Texto>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo
        titulo={conversa.outroNome}
        direita={<Avatar nome={conversa.outroNome} tamanho={34} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={lista}
          data={msgs}
          keyExtractor={(m) => m.id}
          contentContainerStyle={estilos.conteudo}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={estilos.vazio}>
              <Texto variante="subtitulo">Comece a conversa</Texto>
              <Texto variante="corpo" cor={Cores.textoSecundario} style={{ textAlign: 'center' }}>
                {souPersonal
                  ? 'Mande um recado sobre o treino, uma dica ou um "e aí, sumiu?".'
                  : 'Tire dúvidas sobre o treino direto com seu personal.'}
              </Texto>
            </View>
          }
          renderItem={({ item, index }) => {
            const anterior = msgs[index - 1];
            const juntar = anterior && anterior.minha === item.minha && item.criadoEm.getTime() - anterior.criadoEm.getTime() < 120000;
            return (
              <View style={[estilos.linha, item.minha ? { justifyContent: 'flex-end' } : null, { marginTop: juntar ? 2 : Espaco.sm }]}>
                <View style={[estilos.balao, item.minha ? estilos.minha : estilos.dele]}>
                  <Texto variante="corpo" cor={item.minha ? Cores.preto : Cores.texto}>
                    {item.texto}
                  </Texto>
                  <Texto
                    variante="legenda"
                    cor={item.minha ? 'rgba(10,10,10,0.6)' : Cores.textoApagado}
                    style={{ fontSize: 11, lineHeight: 14, alignSelf: 'flex-end', marginTop: 2 }}>
                    {horaMensagem(item.criadoEm)}
                    {item.minha && item.lida ? ' · lida' : ''}
                  </Texto>
                </View>
              </View>
            );
          }}
        />

        {erro ? (
          <Texto variante="legenda" cor={Cores.perigo} style={{ paddingHorizontal: Espaco.lg }}>
            {erro}
          </Texto>
        ) : null}

        {conversa.ativo ? (
          <View style={estilos.barraEnviar}>
            <Campo
              value={texto}
              onChangeText={setTexto}
              placeholder="Mensagem"
              maxLength={1000}
              multiline
              style={{ flex: 1, minHeight: 48, maxHeight: 130, paddingTop: 12, fontSize: 16 }}
            />
            <Pressable
              onPress={enviar}
              disabled={!texto.trim() || enviando}
              style={[estilos.enviar, (!texto.trim() || enviando) && { opacity: 0.4 }]}>
              <Texto variante="corpo" cor={Cores.preto} style={{ fontFamily: 'Archivo_700Bold' }}>
                {enviando ? '...' : 'Enviar'}
              </Texto>
            </Pressable>
          </View>
        ) : (
          <Texto variante="legenda" style={{ textAlign: 'center', padding: Espaco.md }}>
            O vínculo acabou. Dá para ler o histórico, mas não enviar.
          </Texto>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, paddingBottom: Espaco.md, flexGrow: 1 },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Espaco.sm, paddingVertical: Espaco.xxl },
  linha: { flexDirection: 'row' },
  balao: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: Raio.lg },
  minha: { backgroundColor: Cores.verde, borderBottomRightRadius: 6 },
  dele: { backgroundColor: Cores.superficieAlta, borderBottomLeftRadius: 6 },
  barraEnviar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Espaco.sm,
    paddingHorizontal: Espaco.lg,
    paddingVertical: Espaco.sm,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
  },
  enviar: {
    minHeight: 48,
    paddingHorizontal: Espaco.md,
    borderRadius: Raio.md,
    backgroundColor: Cores.verde,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
