import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { FolhaOpcoes, type ConteudoFolha } from '@/components/folha-opcoes';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Modalidades, Raio, type Modalidade, infoModalidade } from '@/constants/theme';
import { textoQuando } from '@/lib/dados';
import { listarAlunos, listarModelos, usarModeloEmAluno, type AlunoResumo } from '@/lib/personal';
import { textoDuracao } from '@/lib/sessao-resumo';
import { supabase } from '@/lib/supabase';

// Personal · ficha do aluno: frequência, plano ativo, últimos treinos.
// Treinos feitos só aparecem se o aluno autorizou.

type PlanoResumo = { id: string; nome: string; ativo: boolean; fim: string | null; treinos: { letra: string; nome: string }[] };
type SessaoResumo = { id: string; modalidade: Modalidade; letra: string | null; duracaoS: number; volume: number; sensacao: number | null; quando: Date };

export default function FichaAluno() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [aluno, setAluno] = useState<AlunoResumo | null>(null);
  const [planos, setPlanos] = useState<PlanoResumo[]>([]);
  const [sessoes, setSessoes] = useState<SessaoResumo[]>([]);
  const [recordesMes, setRecordesMes] = useState(0);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const umMes = new Date(Date.now() - 30 * 86400000).toISOString();
    const [lista, rp, rs, rr] = await Promise.all([
      listarAlunos(),
      supabase
        .from('planos')
        .select('id, nome, ativo, fim, criado_em, treinos(letra, nome, ordem)')
        .eq('aluno_id', id)
        .order('criado_em', { ascending: false }),
      supabase
        .from('sessoes')
        .select('id, modalidade, duracao_s, volume_kg, sensacao, concluida_em, treino:treinos(letra)')
        .eq('aluno_id', id)
        .eq('status', 'concluida')
        .order('concluida_em', { ascending: false })
        .limit(8),
      supabase.from('recordes').select('id', { count: 'exact', head: true }).eq('aluno_id', id).gte('alcancado_em', umMes),
    ]);
    setAluno(lista.find((a) => a.id === id) ?? null);
    setPlanos(
      ((rp.data ?? []) as any[]).map((p) => ({
        id: p.id,
        nome: p.nome,
        ativo: p.ativo,
        fim: p.fim,
        treinos: ((p.treinos ?? []) as any[]).sort((a, b) => a.ordem - b.ordem),
      })),
    );
    setSessoes(
      ((rs.data ?? []) as any[]).map((s) => ({
        id: s.id,
        modalidade: s.modalidade,
        letra: s.treino?.letra ?? null,
        duracaoS: s.duracao_s ?? 0,
        volume: Number(s.volume_kg ?? 0),
        sensacao: s.sensacao,
        quando: new Date(s.concluida_em),
      })),
    );
    setRecordesMes(rr.count ?? 0);
    setCarregando(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const [folha, setFolha] = useState<ConteudoFolha>(null);

  async function escolherModelo() {
    try {
      const modelos = await listarModelos();
      if (modelos.length === 0) {
        Alert.alert('Nenhum modelo ainda', 'Crie modelos na aba Modelos para montar planos em 1 minuto.');
        return;
      }
      setFolha({
        titulo: 'Usar qual modelo?',
        subtitulo: 'O plano ativo atual fica guardado no histórico.',
        opcoes: modelos.map((m) => ({
          texto: `${m.nome} (${m.letras.join('')})`,
          aoTocar: async () => {
            try {
              const novo = await usarModeloEmAluno(m.id, id);
              router.push(`/personal/plano/${novo}`);
            } catch (e: any) {
              Alert.alert('Não deu certo', e.message);
            }
          },
        })),
      });
    } catch (e: any) {
      Alert.alert('Não deu certo', e.message);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Aluno" />
        <ActivityIndicator color={Cores.verde} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }
  if (!aluno) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Aluno" />
        <Texto variante="corpo" style={{ padding: Espaco.lg }}>
          Esse aluno não está mais com você.
        </Texto>
      </SafeAreaView>
    );
  }

  const ativo = planos.find((p) => p.ativo);
  const outros = planos.filter((p) => !p.ativo);

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Aluno" />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.cabecalho}>
          <Avatar nome={aluno.nome} tamanho={64} />
          <View style={{ flex: 1, gap: 2 }}>
            <Texto variante="subtitulo">{aluno.nome}</Texto>
            <Texto variante="legenda">
              Com você desde {aluno.desde.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
            </Texto>
          </View>
        </View>

        {aluno.consentiu ? (
          <View style={estilos.numeros}>
            {[
              [String(aluno.treinos7d), 'treinos em 7 dias'],
              [aluno.ultimoTreino ? textoQuando(aluno.ultimoTreino) : '—', 'último treino'],
              [String(recordesMes), 'recordes no mês'],
            ].map(([n, r]) => (
              <View key={r} style={{ flex: 1, alignItems: 'center' }}>
                <Texto variante="numero" style={{ fontSize: 26, lineHeight: 28 }}>
                  {n}
                </Texto>
                <Texto variante="legenda" style={{ textAlign: 'center' }}>
                  {r}
                </Texto>
              </View>
            ))}
          </View>
        ) : (
          <View style={estilos.aviso}>
            <Texto variante="corpo">O aluno ainda não liberou você para ver os treinos feitos.</Texto>
            <Texto variante="legenda">Ele libera no Perfil → Privacidade. O plano você monta normalmente.</Texto>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: Espaco.sm }}>
          <Botao
            titulo={ativo ? 'Editar plano' : 'Criar plano'}
            style={{ flex: 1 }}
            onPress={() => router.push(ativo ? `/personal/plano/${ativo.id}` : `/personal/plano/novo?aluno=${id}`)}
          />
          <Botao titulo="Usar modelo" tipo="secundario" style={{ flex: 1 }} onPress={escolherModelo} />
        </View>
        <Botao titulo="Mensagem" tipo="secundario" onPress={() => router.push(`/personal/conversa/${id}`)} />

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">
            {ativo ? `PLANO ATIVO · ${ativo.nome.toUpperCase()}${ativo.fim ? ` · VENCE ${ativo.fim.split('-').reverse().join('/')}` : ''}` : 'SEM PLANO ATIVO'}
          </Texto>
          {ativo ? (
            <View style={estilos.lista}>
              {ativo.treinos.map((t, i) => (
                <View key={t.letra} style={[estilos.linha, i > 0 && estilos.separador]}>
                  <Texto variante="numero" cor={Cores.verde} style={{ width: 30, fontSize: 30, lineHeight: 32 }}>
                    {t.letra}
                  </Texto>
                  <Texto variante="corpo" style={{ flex: 1 }}>
                    {t.nome}
                  </Texto>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {aluno.consentiu ? (
          <View style={{ gap: Espaco.sm }}>
            <Texto variante="rotulo">ÚLTIMOS TREINOS</Texto>
            {sessoes.length === 0 ? (
              <Texto variante="legenda">Nenhum treino registrado ainda.</Texto>
            ) : (
              <View style={estilos.lista}>
                {sessoes.map((s, i) => {
                  const info = infoModalidade(s.modalidade);
                  return (
                    <View key={s.id} style={[estilos.linha, i > 0 && estilos.separador]}>
                      <View style={[estilos.selo, { backgroundColor: info.cor }]}>
                        <Texto variante="subtitulo" cor={Cores.preto} style={{ fontSize: 13 }}>
                          {s.letra ?? info.nome}
                        </Texto>
                      </View>
                      <Texto variante="corpo" style={{ flex: 1 }}>
                        {textoDuracao(s.duracaoS)}
                        {s.volume > 0 ? ` · ${(Math.round(s.volume / 100) / 10).toLocaleString('pt-BR')} t` : ''}
                        {s.sensacao ? ` · sensação ${s.sensacao}/5` : ''}
                      </Texto>
                      <Texto variante="legenda">{textoQuando(s.quando)}</Texto>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {outros.length > 0 ? (
          <View style={{ gap: Espaco.sm }}>
            <Texto variante="rotulo">PLANOS ANTERIORES</Texto>
            <View style={estilos.lista}>
              {outros.map((p, i) => (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/personal/plano/${p.id}`)}
                  style={[estilos.linha, i > 0 && estilos.separador]}>
                  <Texto variante="corpo" style={{ flex: 1 }}>
                    {p.nome}
                  </Texto>
                  <Texto variante="legenda">{p.treinos.map((t) => t.letra).join('')} ›</Texto>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <FolhaOpcoes conteudo={folha} aoFechar={() => setFolha(null)} />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg - 4, paddingBottom: Espaco.xl, gap: Espaco.lg },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
  numeros: { flexDirection: 'row' },
  aviso: { backgroundColor: Cores.superficie, borderRadius: Raio.md, padding: Espaco.md, gap: Espaco.xs },
  lista: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, paddingHorizontal: Espaco.md },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, minHeight: 56, paddingVertical: Espaco.sm },
  separador: { borderTopWidth: 1, borderTopColor: Cores.borda },
  selo: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, minWidth: 30, alignItems: 'center' },
});
