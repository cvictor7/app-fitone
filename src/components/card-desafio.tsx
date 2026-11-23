import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio, infoModalidade } from '@/constants/theme';
import { situacao, textoMeta, textoPeriodo, type Desafio } from '@/lib/desafios';

// Card de um desafio: título, período, meta e (se entrei) a barra do meu progresso.

export function BarraProgresso({ valor, meta, cor = Cores.verde }: { valor: number; meta: number; cor?: string }) {
  const p = Math.max(0, Math.min(1, meta > 0 ? valor / meta : 0));
  return (
    <View style={estilos.trilho}>
      <View style={[estilos.barra, { width: `${p * 100}%`, backgroundColor: cor }]} />
    </View>
  );
}

export function CardDesafio({ d, onPress, mostrarMeu = true }: { d: Desafio; onPress: () => void; mostrarMeu?: boolean }) {
  const s = situacao(d);
  const completou = d.entrei && d.meuProgresso >= d.meta;
  const corModalidade = d.modalidade ? infoModalidade(d.modalidade).cor : Cores.verde;

  return (
    <Pressable onPress={onPress} style={[estilos.card, s === 'acabou' && { opacity: 0.6 }, completou && { borderColor: Cores.verde }]}>
      <View style={estilos.topo}>
        <Texto variante="rotulo" cor={s === 'valendo' ? Cores.verde : Cores.textoSecundario}>
          {s === 'valendo' ? 'VALENDO' : s === 'em-breve' ? 'EM BREVE' : 'ENCERRADO'}
        </Texto>
        {d.modalidade ? (
          <Texto variante="rotulo" cor={corModalidade}>
            {infoModalidade(d.modalidade).nome.toUpperCase()}
          </Texto>
        ) : null}
      </View>

      <Texto variante="subtitulo">{d.titulo}</Texto>
      <Texto variante="legenda">
        Meta: {textoMeta(d.medida, d.meta)} · {textoPeriodo(d)}
      </Texto>

      {mostrarMeu && d.entrei ? (
        <View style={{ gap: 6, marginTop: Espaco.xs }}>
          <BarraProgresso valor={d.meuProgresso} meta={d.meta} />
          <Texto variante="legenda" cor={completou ? Cores.verde : Cores.texto}>
            {completou
              ? `Concluído! ${textoMeta(d.medida, d.meuProgresso)} ✓`
              : `Você: ${d.meuProgresso} de ${textoMeta(d.medida, d.meta)}`}
          </Texto>
        </View>
      ) : (
        <Texto variante="legenda">
          {d.participantes === 0 ? 'Ninguém entrou ainda' : `${d.participantes} ${d.participantes === 1 ? 'pessoa' : 'pessoas'} no desafio`}
        </Texto>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  card: {
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    padding: Espaco.md,
    gap: 4,
  },
  topo: { flexDirection: 'row', justifyContent: 'space-between' },
  trilho: { height: 10, borderRadius: 5, backgroundColor: Cores.superficieAlta, overflow: 'hidden' },
  barra: { height: 10, borderRadius: 5 },
});
