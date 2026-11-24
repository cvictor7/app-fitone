import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Texto } from '@/components/texto';
import { Cores, Espaco, Fontes, Raio } from '@/constants/theme';
import { ESTACOES_RAPIDAS, PROVA_OFICIAL, ehCorrida, type Estacao } from '@/lib/timer';

// Montar as estações de um treino Hybrid/Cross: toque nos atalhos para adicionar,
// edite nome e quantidade, mude a ordem (↑ ↓) ou tire (✕). Usado pelo aluno (timer)
// e pelo personal (plano).

export function EditorEstacoes({
  estacoes,
  aoMudar,
  cor = Cores.verde,
  titulo = 'ESTAÇÕES',
  extra = false,
}: {
  estacoes: Estacao[];
  aoMudar: (e: Estacao[]) => void;
  cor?: string;
  titulo?: string;
  extra?: boolean; // parte "antes"/"depois" do bloco: sem o modelo da prova
}) {
  const mudar = (i: number, parte: Partial<Estacao>) => aoMudar(estacoes.map((e, j) => (j === i ? { ...e, ...parte } : e)));
  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= estacoes.length) return;
    const nova = [...estacoes];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    aoMudar(nova);
  };

  return (
    <View style={{ gap: Espaco.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Texto variante="rotulo">
          {titulo} ({estacoes.length})
        </Texto>
        <View style={{ flexDirection: 'row', gap: Espaco.md }}>
          {!extra ? (
            <Pressable onPress={() => aoMudar(PROVA_OFICIAL)} hitSlop={8}>
              <Texto variante="legenda" cor={cor}>
                Modelo da prova
              </Texto>
            </Pressable>
          ) : null}
          {estacoes.length ? (
            <Pressable onPress={() => aoMudar([])} hitSlop={8}>
              <Texto variante="legenda" cor={Cores.textoSecundario}>
                Limpar
              </Texto>
            </Pressable>
          ) : null}
        </View>
      </View>

      {estacoes.length === 0 ? (
        <Texto variante="legenda">
          {extra ? 'Toque num atalho (ex.: Corrida 400 m).' : 'Toque nos atalhos abaixo para montar (ex.: Corrida 200 m → Wall ball → Corrida 200 m → Trenó).'}
        </Texto>
      ) : (
        estacoes.map((e, i) => (
          <View key={i} style={[estilos.linha, { borderLeftColor: ehCorrida(e) ? Cores.textoSecundario : cor }]}>
            <Texto variante="numero" style={{ width: 22, fontSize: 16, lineHeight: 18 }} cor={Cores.textoSecundario}>
              {i + 1}
            </Texto>
            <TextInput
              value={e.nome}
              onChangeText={(t) => mudar(i, { nome: t.slice(0, 30) })}
              placeholder="Exercício"
              placeholderTextColor={Cores.textoApagado}
              style={[estilos.campo, { flex: 1 }]}
            />
            <TextInput
              value={e.alvo}
              onChangeText={(t) => mudar(i, { alvo: t.slice(0, 14) })}
              placeholder="qtd."
              placeholderTextColor={Cores.textoApagado}
              style={[estilos.campo, { width: 78, textAlign: 'center' }]}
            />
            <Pressable onPress={() => mover(i, -1)} hitSlop={6} style={estilos.acao}>
              <Texto variante="corpo" cor={i === 0 ? Cores.textoApagado : Cores.texto}>
                ↑
              </Texto>
            </Pressable>
            <Pressable onPress={() => mover(i, 1)} hitSlop={6} style={estilos.acao}>
              <Texto variante="corpo" cor={i === estacoes.length - 1 ? Cores.textoApagado : Cores.texto}>
                ↓
              </Texto>
            </Pressable>
            <Pressable onPress={() => aoMudar(estacoes.filter((_, j) => j !== i))} hitSlop={6} style={estilos.acao}>
              <Texto variante="corpo" cor={Cores.perigo}>
                ✕
              </Texto>
            </Pressable>
          </View>
        ))
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Espaco.sm, paddingVertical: 4 }} keyboardShouldPersistTaps="handled">
        {ESTACOES_RAPIDAS.map((e) => (
          <Pressable key={`${e.nome}-${e.alvo}`} onPress={() => aoMudar([...estacoes, e])} style={[estilos.atalho, ehCorrida(e) && { borderColor: Cores.textoSecundario }]}>
            <Texto variante="legenda" cor={Cores.texto}>
              + {e.nome} {e.alvo}
            </Texto>
          </Pressable>
        ))}
        <Pressable onPress={() => aoMudar([...estacoes, { nome: '', alvo: '' }])} style={estilos.atalho}>
          <Texto variante="legenda" cor={cor}>
            + Outro
          </Texto>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.md,
    borderLeftWidth: 4,
    paddingLeft: Espaco.sm,
    paddingRight: 4,
    minHeight: 52,
  },
  campo: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: Cores.superficieAlta,
    paddingHorizontal: 10,
    color: Cores.texto,
    fontFamily: Fontes.texto,
    fontSize: 15,
  },
  acao: { width: 30, height: 40, alignItems: 'center', justifyContent: 'center' },
  atalho: { minHeight: 38, paddingHorizontal: 12, borderRadius: Raio.pilula, borderWidth: 1.5, borderColor: Cores.borda, justifyContent: 'center' },
});
