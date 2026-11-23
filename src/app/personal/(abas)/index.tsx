import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Campo } from '@/components/campo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { DIAS_SUMIU, diasDesde, gerarConvite, listarAlunos, type AlunoResumo } from '@/lib/personal';
import { useSessao } from '@/lib/sessao';

// Personal · Alunos: quem sumiu, quem está sem plano, plano vencendo.

type Filtro = 'todos' | 'sumiram' | 'semPlano' | 'vencendo';

function situacao(a: AlunoResumo): { texto: string; cor: string } {
  if (!a.planoId) return { texto: 'sem plano ainda', cor: Cores.amarelo };
  const venceEm = a.planoFim ? Math.ceil((a.planoFim.getTime() - Date.now()) / 86400000) : null;
  if (venceEm !== null && venceEm < 0) return { texto: 'plano vencido', cor: Cores.perigo };
  if (!a.consentiu) return { texto: 'não liberou ver os treinos', cor: Cores.textoApagado };
  const d = diasDesde(a.ultimoTreino);
  if (d === null) return { texto: 'ainda não treinou pelo app', cor: Cores.textoSecundario };
  if (d >= DIAS_SUMIU) return { texto: `sumiu há ${d} dias`, cor: Cores.perigo };
  if (venceEm !== null && venceEm <= 7) return { texto: `plano vence em ${venceEm} ${venceEm === 1 ? 'dia' : 'dias'}`, cor: Cores.amarelo };
  return { texto: d === 0 ? 'treinou hoje' : d === 1 ? 'treinou ontem' : `treinou há ${d} dias`, cor: Cores.textoSecundario };
}

export default function Alunos() {
  const { gymId } = useSessao();
  const [alunos, setAlunos] = useState<AlunoResumo[] | null>(null);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    try {
      setErro('');
      setAlunos(await listarAlunos());
    } catch (e: any) {
      setErro(e.message);
      setAlunos([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const grupos = useMemo(() => {
    const lista = alunos ?? [];
    const sumiram = lista.filter((a) => a.consentiu && (diasDesde(a.ultimoTreino) ?? 0) >= DIAS_SUMIU);
    const semPlano = lista.filter((a) => !a.planoId);
    const vencendo = lista.filter((a) => a.planoFim && (a.planoFim.getTime() - Date.now()) / 86400000 <= 7);
    return { todos: lista, sumiram, semPlano, vencendo };
  }, [alunos]);

  const visiveis = grupos[filtro].filter((a) => a.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  async function convidar() {
    if (!gymId) return;
    try {
      const codigo = await gerarConvite(gymId);
      Alert.alert(`Código: ${codigo}`, 'O aluno digita esse código ao criar a conta no app (vale 7 dias, 1 aluno).', [
        { text: 'Fechar', style: 'cancel' },
        {
          text: 'Enviar pelo WhatsApp…',
          onPress: () =>
            Share.share({
              message: `Bora treinar comigo pelo app da Fit One! Crie sua conta e, na parte do personal, use o código ${codigo}. Código da academia: FITONE.`,
            }),
        },
      ]);
    } catch (e: any) {
      Alert.alert('Não deu para gerar o código', e.message);
    }
  }

  const FILTROS: { id: Filtro; nome: string }[] = [
    { id: 'todos', nome: 'Todos' },
    { id: 'sumiram', nome: 'Sumiram' },
    { id: 'semPlano', nome: 'Sem plano' },
    { id: 'vencendo', nome: 'Vencendo' },
  ];

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={false} onRefresh={carregar} tintColor={Cores.verde} />}>
        <View style={estilos.topo}>
          <Texto variante="titulo">Alunos</Texto>
          <Pressable onPress={convidar} style={estilos.pilula}>
            <Texto variante="subtitulo" cor={Cores.preto} style={{ fontSize: 16 }}>
              + Convidar
            </Texto>
          </Pressable>
        </View>

        <Campo value={busca} onChangeText={setBusca} placeholder="Buscar aluno" style={{ minHeight: 48, fontSize: 16 }} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: Espaco.sm }}>
          {FILTROS.map((f) => {
            const ativo = filtro === f.id;
            return (
              <Pressable key={f.id} onPress={() => setFiltro(f.id)} style={[estilos.chip, ativo && estilos.chipAtivo]}>
                <Texto variante="corpo" cor={ativo ? Cores.preto : Cores.texto} style={{ fontSize: 14 }}>
                  {f.nome} {grupos[f.id].length}
                </Texto>
              </Pressable>
            );
          })}
        </ScrollView>

        {alunos === null ? (
          <ActivityIndicator color={Cores.verde} style={{ paddingVertical: Espaco.xl }} />
        ) : erro ? (
          <Texto variante="corpo" cor={Cores.perigo}>
            {erro}
          </Texto>
        ) : visiveis.length === 0 ? (
          <View style={estilos.vazio}>
            <Texto variante="corpo">{alunos.length === 0 ? 'Nenhum aluno ainda.' : 'Ninguém nesse filtro.'}</Texto>
            {alunos.length === 0 ? (
              <Texto variante="legenda">Toque em "+ Convidar" e mande o código para o aluno.</Texto>
            ) : null}
          </View>
        ) : (
          <View style={estilos.lista}>
            {visiveis.map((a, i) => {
              const s = situacao(a);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => router.push(`/personal/aluno/${a.id}`)}
                  style={({ pressed }) => [estilos.linha, i > 0 && estilos.separador, pressed && { opacity: 0.7 }]}>
                  <Avatar nome={a.nome} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Texto variante="corpo">{a.nome}</Texto>
                    <Texto variante="legenda" cor={s.cor}>
                      {s.texto}
                    </Texto>
                  </View>
                  {a.consentiu ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Texto variante="numero" style={{ fontSize: 22, lineHeight: 24 }}>
                        {a.treinos7d}
                      </Texto>
                      <Texto variante="legenda">/7 dias</Texto>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg - 4, paddingBottom: Espaco.xl, gap: Espaco.md },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Espaco.sm },
  pilula: { backgroundColor: Cores.verde, borderRadius: Raio.pilula, paddingHorizontal: 14, paddingVertical: 8 },
  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: Raio.pilula,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    backgroundColor: Cores.superficie,
    justifyContent: 'center',
  },
  chipAtivo: { backgroundColor: Cores.verde, borderColor: Cores.verde },
  vazio: { backgroundColor: Cores.superficie, borderRadius: Raio.md, padding: Espaco.md, gap: Espaco.xs },
  lista: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, paddingHorizontal: Espaco.md },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, minHeight: 68, paddingVertical: Espaco.sm },
  separador: { borderTopWidth: 1, borderTopColor: Cores.borda },
});
