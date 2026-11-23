import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio, infoModalidade } from '@/constants/theme';
import { textoQuando } from '@/lib/dados';
import { listarHistorico, type ItemHistorico } from '@/lib/historico';
import { textoDuracao } from '@/lib/sessao-resumo';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';

// Comunidade → "+ Publicar": escolhe um treino dos últimos 14 dias para postar no feed.

export default function Publicar() {
  const { sessao } = useSessao();
  const [lista, setLista] = useState<(ItemHistorico & { publicado: boolean })[] | null>(null);

  useEffect(() => {
    const uid = sessao?.user.id;
    if (!uid) return;
    (async () => {
      try {
        const desde = Date.now() - 14 * 86400000;
        const itens = (await listarHistorico(uid, 40)).filter((i) => i.data.getTime() >= desde);
        const { data } = await supabase.from('publicacoes').select('sessao_id').eq('autor_id', uid);
        const publicados = new Set(((data ?? []) as any[]).map((p) => p.sessao_id));
        setLista(itens.map((i) => ({ ...i, publicado: publicados.has(i.id) })));
      } catch {
        setLista([]);
      }
    })();
  }, [sessao?.user.id]);

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Publicar treino" />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Texto variante="corpo" cor={Cores.textoSecundario}>
          Escolha o treino. Na próxima tela, escreva uma legenda e toque em Publicar.
        </Texto>

        {lista === null ? (
          <ActivityIndicator color={Cores.verde} style={{ marginTop: Espaco.xl }} />
        ) : lista.length === 0 ? (
          <View style={{ gap: Espaco.md, marginTop: Espaco.lg }}>
            <Texto variante="subtitulo">Nenhum treino nos últimos 14 dias</Texto>
            <Texto variante="corpo" cor={Cores.textoSecundario}>
              Termine um treino pelo app e ele aparece aqui.
            </Texto>
            <Botao titulo="Ir treinar" onPress={() => router.replace('/treinar')} />
          </View>
        ) : (
          lista.map((i) => {
            const info = infoModalidade(i.modalidade);
            return (
              <Pressable
                key={i.id}
                onPress={() => router.push(`/sessao/concluido/${i.id}?ver=1`)}
                style={({ pressed }) => [estilos.item, { borderLeftColor: info.cor }, pressed && { opacity: 0.7 }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Texto variante="subtitulo" cor={info.cor}>
                    {i.rotulo}
                  </Texto>
                  <Texto variante="legenda">
                    {textoQuando(i.data)} · {textoDuracao(i.duracaoS)}
                  </Texto>
                </View>
                <Texto variante="rotulo" cor={i.publicado ? Cores.verde : Cores.texto}>
                  {i.publicado ? 'PUBLICADO ✓' : 'PUBLICAR ›'}
                </Texto>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, gap: Espaco.sm, paddingBottom: Espaco.xxl },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderLeftWidth: 4,
    padding: Espaco.md,
    minHeight: 64,
  },
});
