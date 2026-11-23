import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { CardFeitoHoje } from '@/components/card-feito-hoje';
import { ChipModalidade } from '@/components/chip-modalidade';
import { Logo } from '@/components/logo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, ListaModalidades, Modalidades, Raio, infoModalidade } from '@/constants/theme';
import { META_SEMANAL, resumoTreino, textoQuando, useDadosAluno } from '@/lib/dados';
import { rotaPorContaPropria } from '@/lib/dados';
import { useSessao } from '@/lib/sessao';
import { lerTreinoAtivo, type TreinoAtivo } from '@/lib/treino-ativo';

// Tela "Hoje": o treino que o plano manda hoje, a semana, a sequência e o último recorde.
// O app não sugere troca: para fazer outro, o aluno abre "Ver todos os meus treinos".

function dataDeHoje() {
  const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
  const limpo = t.replace('.', '').replace('-feira', '');
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

export default function Hoje() {
  const { perfil } = useSessao();
  const dados = useDadosAluno();
  const primeiroNome = perfil?.nome?.split(' ')[0] ?? '';
  const recorde = dados.recordes[0];
  const diasComTreino = dados.semana.filter((d) => d.feitos.length > 0).length;
  const [emAndamento, setEmAndamento] = useState<TreinoAtivo | null>(null);
  useFocusEffect(
    useCallback(() => {
      lerTreinoAtivo().then(setEmAndamento);
    }, []),
  );

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={dados.recarregar} tintColor={Cores.verde} />}>
        <View style={estilos.topo}>
          <Logo largura={118} comCidade={false} />
          <Texto variante="legenda">{dataDeHoje()}</Texto>
        </View>

        <Texto variante="titulo">Bora, {primeiroNome}</Texto>

        {emAndamento ? (
          <Pressable onPress={() => router.push(`/sessao/${emAndamento.treinoId}`)} style={estilos.andamento}>
            <View style={{ flex: 1 }}>
              <Texto variante="rotulo" cor={Cores.preto}>
                TREINO EM ANDAMENTO
              </Texto>
              <Texto variante="subtitulo" cor={Cores.preto} style={{ fontSize: 20 }}>
                {emAndamento.letra} · {emAndamento.nome}
              </Texto>
            </View>
            <Texto variante="subtitulo" cor={Cores.preto}>
              Continuar →
            </Texto>
          </Pressable>
        ) : null}

        {dados.carregando ? (
          <View style={[estilos.treinoDia, { alignItems: 'center', paddingVertical: Espaco.xxl }]}>
            <ActivityIndicator color={Cores.verde} />
          </View>
        ) : dados.erro ? (
          <View style={estilos.treinoDia}>
            <Texto variante="corpo">Não deu para carregar seus treinos.</Texto>
            <Texto variante="legenda">{dados.erro}</Texto>
            <Botao titulo="Tentar de novo" tipo="secundario" onPress={dados.recarregar} />
          </View>
        ) : dados.treinosDeHoje.length > 0 ? (
          // Pode ter mais de um treino no dia (ex.: musculação + Hybrid). Os que faltam vêm primeiro.
          <View style={{ gap: Espaco.md }}>
            {dados.treinosDeHoje.map((t, idx) => {
              const feito = dados.feitosHoje.find((f) => f.treinoId === t.id);
              if (feito) return <CardFeitoHoje key={t.id} sessaoId={feito.id} letra={t.rotulo} nome={t.nome} />;
              const info = infoModalidade(t.modalidade);
              const total = dados.treinosDeHoje.length;
              const primeiroPendente = dados.treinosDeHoje.findIndex((x) => !dados.feitosHoje.some((f) => f.treinoId === x.id)) === idx;
              return (
                // A letra gigante é o elemento marcante, como o "1" dentro do ONE do logo
                <View key={t.id} style={[estilos.treinoDia, { borderLeftColor: info.cor }]}>
                  <View style={{ gap: Espaco.xs }}>
                    <Texto variante="rotulo" cor={info.cor}>
                      {total > 1 ? `TREINO DE HOJE · ${idx + 1} DE ${total}` : 'TREINO DE HOJE'}
                    </Texto>
                    <Texto variante="display" cor={info.cor} numberOfLines={1} adjustsFontSizeToFit style={estilos.rotulo}>
                      {t.rotulo}
                    </Texto>
                    {t.nome.toUpperCase() !== t.rotulo ? <Texto variante="subtitulo">{t.nome}</Texto> : null}
                    <Texto variante="legenda">
                      {resumoTreino(t, info.nome)}
                      {t.cardio ? ' + cardio' : ''} · último: {textoQuando(t.ultimaVez)}
                    </Texto>
                    {t.observacao ? (
                      <Texto variante="legenda" cor={info.cor}>
                        {t.observacao}
                      </Texto>
                    ) : null}
                  </View>
                  <Botao titulo="Começar treino" cor={info.cor} onPress={() => router.push(`/treino/${t.id}`)} />
                  {primeiroPendente ? (
                    <Link href="/treinar" style={estilos.linkTreinos}>
                      <Texto variante="corpo" cor={Cores.textoSecundario}>
                        Ver todos os meus treinos →
                      </Texto>
                    </Link>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={estilos.treinoDia}>
            <Texto variante="rotulo" cor={Cores.verde}>
              SEM PLANO AINDA
            </Texto>
            <Texto variante="subtitulo">Ainda sem treino montado</Texto>
            <Texto variante="legenda">Espere seu personal montar ou monte o seu agora. Dá também para treinar por conta própria aqui embaixo.</Texto>
            <Botao titulo="Montar meu treino" tipo="secundario" onPress={() => router.push('/meu-plano/novo')} />
          </View>
        )}

        <View style={estilos.linhaNumeros}>
          <View style={estilos.numeroBloco}>
            <Texto variante="numero" cor={dados.sequencia > 0 ? Cores.verde : Cores.texto}>
              {dados.sequencia}
            </Texto>
            <Texto variante="legenda">
              {dados.sequencia === 1 ? 'semana' : 'semanas'} seguidas com {META_SEMANAL}+ treinos
            </Texto>
          </View>
          <View style={estilos.divisor} />
          <View style={estilos.numeroBloco}>
            {recorde ? (
              <>
                <Texto variante="numero">
                  {recorde.valorKg.toLocaleString('pt-BR')}
                  <Texto variante="subtitulo" style={{ textTransform: 'none' }}>
                    {' '}
                    kg
                  </Texto>
                </Texto>
                <Texto variante="legenda">
                  recorde no {recorde.exercicio.toLowerCase()}, {textoQuando(recorde.quando)}
                </Texto>
              </>
            ) : (
              <>
                <Texto variante="numero" cor={Cores.textoApagado}>
                  —
                </Texto>
                <Texto variante="legenda">seu primeiro recorde aparece aqui</Texto>
              </>
            )}
          </View>
        </View>

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">
            ESTA SEMANA · {dados.treinosNaSemana} {dados.treinosNaSemana === 1 ? 'TREINO' : 'TREINOS'}
            {diasComTreino > 0 && diasComTreino !== dados.treinosNaSemana ? ` EM ${diasComTreino} DIAS` : ''}
          </Texto>
          <View style={estilos.semana}>
            {dados.semana.map((d, i) => (
              <View key={i} style={estilos.diaColuna}>
                <View
                  style={[
                    estilos.dia,
                    d.feitos.length > 0 && { borderColor: infoModalidade(d.feitos[0]).cor },
                    d.hoje && { borderColor: Cores.branco },
                  ]}>
                  {/* dois treinos no dia = bolinha dividida com as cores das modalidades */}
                  {d.feitos.slice(0, 3).map((m, j) => (
                    <View key={j} style={{ flex: 1, backgroundColor: infoModalidade(m).cor }} />
                  ))}
                </View>
                <Texto variante="legenda" cor={d.hoje ? Cores.branco : Cores.textoApagado}>
                  {d.rotulo}
                </Texto>
              </View>
            ))}
          </View>
        </View>

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">POR CONTA PRÓPRIA</Texto>
          <View style={estilos.chips}>
            {ListaModalidades.filter((m) => m !== 'musculacao').map((m) => (
              <ChipModalidade key={m} modalidade={m} onPress={() => router.push(rotaPorContaPropria(m) as any)} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg - 4, paddingBottom: Espaco.xl, gap: Espaco.lg },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Espaco.sm },
  treinoDia: {
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderLeftWidth: 4,
    borderLeftColor: Cores.verde,
    padding: Espaco.md + 4,
    gap: Espaco.md,
    overflow: 'hidden',
  },
  andamento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
    backgroundColor: Cores.verde,
    borderRadius: Raio.md,
    padding: Espaco.md,
  },
  rotulo: { fontSize: 84, lineHeight: 84, marginBottom: -4 },
  linkTreinos: { alignSelf: 'center', paddingVertical: Espaco.xs },
  linhaNumeros: { flexDirection: 'row', alignItems: 'stretch' },
  numeroBloco: { flex: 1, gap: 2 },
  divisor: { width: 1, backgroundColor: Cores.borda, marginHorizontal: Espaco.md },
  semana: { flexDirection: 'row', justifyContent: 'space-between' },
  diaColuna: { alignItems: 'center', gap: 6 },
  dia: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Cores.borda,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
});
