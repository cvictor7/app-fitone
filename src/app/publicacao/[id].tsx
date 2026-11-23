import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BarraTopo } from '@/components/barra-topo';
import { CardPublicacao } from '@/components/card-publicacao';
import { Campo } from '@/components/campo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import {
  apagarComentario,
  carregarPublicacao,
  comentar,
  curtir,
  listarComentarios,
  removerPublicacao,
  tempoAtras,
  type Comentario,
  type Publicacao,
} from '@/lib/comunidade';

// Um treino publicado + comentários. Segurar um comentário apaga (o seu, ou qualquer um no seu treino).

export default function TelaPublicacao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [p, setP] = useState<Publicacao | null | undefined>(undefined);
  const [lista, setLista] = useState<Comentario[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const rolagem = useRef<ComponentRef<typeof ScrollView>>(null);

  const carregar = useCallback(async () => {
    try {
      const [pub, cs] = await Promise.all([carregarPublicacao(id), listarComentarios(id)]);
      setP(pub);
      setLista(cs);
    } catch {
      setP((atual) => atual ?? null);
      setErro('Não deu para carregar.');
    }
  }, [id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setErro(null);
    setEnviando(true);
    try {
      await comentar(id, t);
      setTexto('');
      Haptics.selectionAsync();
      setLista(await listarComentarios(id));
      setP((atual) => (atual ? { ...atual, comentarios: atual.comentarios + 1 } : atual));
      setTimeout(() => rolagem.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setErro('Não deu para enviar. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  function segurarComentario(c: Comentario) {
    if (!c.possoApagar) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Apagar comentário?', `"${c.texto.slice(0, 60)}"`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apagarComentario(c.id);
            setLista((l) => l.filter((x) => x.id !== c.id));
            setP((atual) => (atual ? { ...atual, comentarios: Math.max(0, atual.comentarios - 1) } : atual));
          } catch {
            setErro('Não deu para apagar agora.');
          }
        },
      },
    ]);
  }

  async function aoCurtir(x: Publicacao) {
    const sim = !x.euCurti;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setP({ ...x, euCurti: sim, curtidas: x.curtidas + (sim ? 1 : -1) });
    try {
      await curtir(x.id, sim);
    } catch {
      setP(x);
    }
  }

  async function aoRemover(x: Publicacao) {
    try {
      await removerPublicacao(x.id);
      router.back();
    } catch {
      setErro('Não deu para tirar agora.');
    }
  }

  if (p === undefined) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Treino" />
        <ActivityIndicator color={Cores.verde} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (p === null) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Treino" />
        <Texto variante="corpo" cor={Cores.textoSecundario} style={{ padding: Espaco.lg }}>
          {erro ?? 'Esse treino saiu da comunidade.'}
        </Texto>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Treino" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={rolagem} contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <CardPublicacao p={p} aoCurtir={aoCurtir} aoRemover={aoRemover} />

          <Texto variante="rotulo">
            {lista.length === 0 ? 'COMENTÁRIOS' : `${lista.length} ${lista.length === 1 ? 'COMENTÁRIO' : 'COMENTÁRIOS'}`}
          </Texto>
          {lista.length === 0 ? (
            <Texto variante="corpo" cor={Cores.textoSecundario}>
              Ninguém comentou ainda. Manda a primeira!
            </Texto>
          ) : (
            lista.map((c) => (
              <Pressable key={c.id} onLongPress={() => segurarComentario(c)} delayLongPress={450} style={estilos.comentario}>
                <Avatar nome={c.autor} tamanho={32} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Texto variante="legenda">
                    <Texto variante="legenda" cor={Cores.texto} style={{ fontFamily: 'Archivo_600SemiBold' }}>
                      {c.eu ? 'Você' : c.autor}
                    </Texto>
                    {'  '}
                    {tempoAtras(c.criadoEm)}
                  </Texto>
                  <Texto variante="corpo">{c.texto}</Texto>
                </View>
              </Pressable>
            ))
          )}
          {lista.some((c) => c.possoApagar) ? (
            <Texto variante="legenda" style={{ textAlign: 'center' }}>
              Segure um comentário para apagar.
            </Texto>
          ) : null}
        </ScrollView>

        {erro ? (
          <Texto variante="legenda" cor={Cores.perigo} style={{ paddingHorizontal: Espaco.lg }}>
            {erro}
          </Texto>
        ) : null}
        <View style={estilos.barraEnviar}>
          <Campo
            value={texto}
            onChangeText={setTexto}
            placeholder="Escreva um comentário"
            maxLength={280}
            multiline
            style={{ flex: 1, minHeight: 48, maxHeight: 120, paddingTop: 12, fontSize: 16 }}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, gap: Espaco.md, paddingBottom: Espaco.xl },
  comentario: { flexDirection: 'row', gap: Espaco.sm, alignItems: 'flex-start' },
  barraEnviar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Espaco.sm,
    paddingHorizontal: Espaco.lg,
    paddingVertical: Espaco.sm,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
    backgroundColor: Cores.fundo,
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
