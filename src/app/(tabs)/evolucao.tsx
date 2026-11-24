import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GraficoLinha } from '@/components/grafico-linha';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { textoKg, textoQuando, useDadosAluno } from '@/lib/dados';
import { listarConquistas, type Conquista } from '@/lib/conquistas';
import { useEvolucao } from '@/lib/evolucao';

// Aba "Evolução": resumo do mês, gráfico de carga por exercício e recordes.

function dataCurta(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function Evolucao() {
  const [conquistas, setConquistas] = useState<Conquista[]>([]);
  useFocusEffect(
    useCallback(() => {
      listarConquistas().then(setConquistas).catch(() => {});
    }, []),
  );
  const { recordes } = useDadosAluno();
  const evo = useEvolucao();
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [medida, setMedida] = useState<'carga' | 'rm'>('carga');

  const atual = evo.historicos.find((h) => h.exercicioId === escolhido) ?? evo.historicos[0];
  const pontos = atual ? atual.pontos.filter((p) => (medida === 'carga' ? p.cargaMax > 0 : p.rm !== null)) : [];
  const valores = pontos.map((p) => (medida === 'carga' ? p.cargaMax : (p.rm as number)));
  const diferenca = valores.length > 1 ? valores[valores.length - 1] - valores[0] : 0;

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        refreshControl={<RefreshControl refreshing={false} onRefresh={evo.recarregar} tintColor={Cores.verde} />}>
        <Texto variante="titulo" style={{ paddingTop: Espaco.sm }}>
          Evolução
        </Texto>

        <View style={estilos.resumo}>
          <View style={{ flex: 1 }}>
            <Texto variante="numero" cor={Cores.verde}>
              {evo.treinosNoMes}
            </Texto>
            <Texto variante="legenda">{evo.treinosNoMes === 1 ? 'treino' : 'treinos'} este mês</Texto>
          </View>
          <View style={estilos.divisor} />
          <View style={{ flex: 1 }}>
            <Texto variante="numero">{(Math.round(evo.volumeNoMes / 100) / 10).toLocaleString('pt-BR')} t</Texto>
            <Texto variante="legenda">levantadas este mês</Texto>
          </View>
        </View>

        {evo.carregando ? (
          <ActivityIndicator color={Cores.verde} style={{ paddingVertical: Espaco.xl }} />
        ) : !atual ? (
          <View style={estilos.cartao}>
            <Texto variante="corpo">Seu gráfico aparece aqui.</Texto>
            <Texto variante="legenda">Termine um treino de musculação e a evolução de cada exercício começa a contar.</Texto>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={estilos.chips}>
              {evo.historicos.map((h) => {
                const ativo = h.exercicioId === atual.exercicioId;
                return (
                  <Pressable key={h.exercicioId} onPress={() => setEscolhido(h.exercicioId)} style={[estilos.chip, ativo && estilos.chipAtivo]}>
                    <Texto variante="corpo" cor={ativo ? Cores.preto : Cores.texto} style={{ fontSize: 14 }}>
                      {h.nome}
                    </Texto>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={estilos.cartao}>
              <View style={estilos.cabecalhoGrafico}>
                <View>
                  <Texto variante="rotulo">{medida === 'carga' ? 'CARGA MÁXIMA' : '1RM ESTIMADO'} · 6 MESES</Texto>
                  <Texto variante="numero">
                    {valores.length > 0 ? (Math.round(valores[valores.length - 1] * 10) / 10).toLocaleString('pt-BR') : '—'}
                    <Texto variante="subtitulo" style={{ textTransform: 'none' }}>
                      {' '}
                      kg
                    </Texto>
                  </Texto>
                </View>
                {diferenca !== 0 ? (
                  <Texto variante="subtitulo" cor={diferenca > 0 ? Cores.verde : Cores.perigo}>
                    {diferenca > 0 ? '+' : ''}
                    {(Math.round(diferenca * 10) / 10).toLocaleString('pt-BR')} kg
                  </Texto>
                ) : null}
              </View>

              {valores.length > 0 ? (
                <GraficoLinha valores={valores} rotulos={pontos.map((p) => dataCurta(p.data))} />
              ) : (
                <Texto variante="legenda">Sem séries de até 12 reps para estimar o 1RM.</Texto>
              )}

              <View style={estilos.seletor}>
                {(['carga', 'rm'] as const).map((m) => (
                  <Pressable key={m} onPress={() => setMedida(m)} style={[estilos.opcao, medida === m && { backgroundColor: Cores.superficieAlta }]}>
                    <Texto variante="legenda" cor={medida === m ? Cores.texto : Cores.textoSecundario}>
                      {m === 'carga' ? 'Carga máxima' : '1RM estimado'}
                    </Texto>
                  </Pressable>
                ))}
              </View>
              <Texto variante="legenda">
                {atual.pontos.length} {atual.pontos.length === 1 ? 'treino' : 'treinos'} com {atual.nome.toLowerCase()} · último{' '}
                {textoQuando(atual.pontos[atual.pontos.length - 1].data)}
              </Texto>
            </View>
          </>
        )}

        <Pressable onPress={() => router.push('/conquistas')} style={estilos.botaoHistorico}>
          <View style={{ flex: 1, gap: 4 }}>
            <Texto variante="subtitulo" style={{ fontSize: 20 }}>
              Conquistas · {conquistas.filter((c) => c.conquistadaEm).length} de {conquistas.length || '–'}
            </Texto>
            <Texto style={{ fontSize: 26, lineHeight: 32 }} numberOfLines={1}>
              {conquistas
                .filter((c) => c.conquistadaEm)
                .sort((a, b) => b.conquistadaEm!.getTime() - a.conquistadaEm!.getTime())
                .slice(0, 6)
                .map((c) => c.emoji)
                .join(' ') || '🔒'}
            </Texto>
          </View>
          <Texto variante="subtitulo" cor={Cores.verde}>
            ›
          </Texto>
        </Pressable>

        <Pressable onPress={() => router.push('/historico')} style={estilos.botaoHistorico}>
          <View style={{ flex: 1 }}>
            <Texto variante="subtitulo" style={{ fontSize: 20 }}>
              Histórico de treinos
            </Texto>
            <Texto variante="legenda">Todos os treinos feitos, de qualquer modalidade. Dá para compartilhar de novo.</Texto>
          </View>
          <Texto variante="subtitulo" cor={Cores.verde}>
            ›
          </Texto>
        </Pressable>

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">ÚLTIMOS RECORDES</Texto>
          {recordes.length === 0 ? (
            <View style={estilos.cartao}>
              <Texto variante="corpo">Nenhum recorde ainda.</Texto>
              <Texto variante="legenda">Eles aparecem aqui quando você passa sua maior carga num exercício.</Texto>
            </View>
          ) : (
            <View style={estilos.lista}>
              {recordes.map((r, i) => (
                <View key={r.exercicio + r.quando.toISOString()} style={[estilos.linha, i > 0 && estilos.separador]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Texto variante="corpo">{r.exercicio}</Texto>
                    <Texto variante="legenda">{textoQuando(r.quando)}</Texto>
                  </View>
                  <Texto variante="numero" cor={Cores.verde} style={{ fontSize: 28, lineHeight: 30 }}>
                    {textoKg(r.valorKg)}
                  </Texto>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg - 4, paddingBottom: Espaco.xl, gap: Espaco.lg },
  resumo: { flexDirection: 'row' },
  botaoHistorico: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    padding: Espaco.md,
    borderLeftWidth: 4,
    borderLeftColor: Cores.verde,
  },
  divisor: { width: 1, backgroundColor: Cores.borda, marginHorizontal: Espaco.md },
  chips: { gap: Espaco.sm },
  chip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: Raio.pilula,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    backgroundColor: Cores.superficie,
    justifyContent: 'center',
  },
  chipAtivo: { backgroundColor: Cores.verde, borderColor: Cores.verde },
  cartao: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, padding: Espaco.md, gap: Espaco.md },
  cabecalhoGrafico: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  seletor: { flexDirection: 'row', backgroundColor: Cores.fundo, borderRadius: 10, padding: 3, gap: 3 },
  opcao: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  lista: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, paddingHorizontal: Espaco.md },
  linha: { flexDirection: 'row', alignItems: 'center', paddingVertical: Espaco.md, gap: Espaco.md },
  separador: { borderTopWidth: 1, borderTopColor: Cores.borda },
});
