import * as Haptics from 'expo-haptics';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { IconeBalao, IconeFogo } from '@/components/icones';
import { Texto } from '@/components/texto';
import { TextoComMencoes } from '@/components/texto-mencoes';
import { Cores, Espaco, Raio, infoModalidade } from '@/constants/theme';
import { tempoAtras, type Publicacao } from '@/lib/comunidade';
import { textoDuracao, textoVolume } from '@/lib/sessao-resumo';

// Um treino publicado no feed. Mostra só números do treino (nunca peso corporal).

type Props = {
  p: Publicacao;
  aoCurtir: (p: Publicacao) => void;
  aoRemover: (p: Publicacao) => void;
  aoComentar?: (p: Publicacao) => void; // sem isso (tela do próprio post), o botão some
  podeRemover?: boolean; // padrão: só o autor; o admin também pode (moderação)
};

export function CardPublicacao({ p, aoCurtir, aoRemover, aoComentar, podeRemover }: Props) {
  const info = infoModalidade(p.modalidade);
  const musculacao = p.modalidade === 'musculacao';

  const numeros: [string, string][] = [];
  if (p.duracaoS) numeros.push([textoDuracao(p.duracaoS), 'tempo']);
  if (musculacao && p.volumeKg > 0) numeros.push([textoVolume(p.volumeKg), 'kg']);
  if (musculacao && p.series > 0) numeros.push([String(p.series), p.series === 1 ? 'série' : 'séries']);
  if (p.recordes > 0) numeros.push([String(p.recordes), p.recordes === 1 ? 'recorde' : 'recordes']);

  function segurar() {
    if (!(podeRemover ?? p.eu)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const titulo = p.eu ? 'Tirar da comunidade?' : `Apagar a publicação de ${p.autor}?`;
    const texto = p.eu ? 'O treino continua no seu histórico. Só sai do feed.' : 'Moderação: sai do feed para todos. O treino continua no histórico do aluno.';
    Alert.alert(titulo, texto, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tirar', style: 'destructive', onPress: () => aoRemover(p) },
    ]);
  }

  return (
    <Pressable onLongPress={segurar} delayLongPress={450} style={[estilos.card, { borderLeftColor: info.cor }]}>
      <View style={estilos.topo}>
        <Avatar nome={p.autor} tamanho={40} />
        <View style={{ flex: 1 }}>
          <Texto variante="corpo" style={{ fontFamily: 'Archivo_600SemiBold' }}>
            {p.eu ? `${p.autor} (você)` : p.autor}
          </Texto>
          <Texto variante="legenda">
            {info.nome} · {tempoAtras(p.criadoEm)}
          </Texto>
        </View>
      </View>

      <Texto variante="display" cor={info.cor} numberOfLines={1} adjustsFontSizeToFit style={estilos.rotulo}>
        {p.rotulo}
      </Texto>

      {numeros.length > 0 ? (
        <View style={estilos.numeros}>
          {numeros.map(([n, r]) => (
            <View key={r}>
              <Texto variante="numero" cor={r.startsWith('recorde') ? Cores.amarelo : Cores.texto} style={{ fontSize: 24, lineHeight: 26 }}>
                {n}
              </Texto>
              <Texto variante="legenda">{r}</Texto>
            </View>
          ))}
        </View>
      ) : null}

      {p.resumo ? (
        <Texto variante="corpo" cor={Cores.textoSecundario} numberOfLines={3}>
          {p.resumo}
        </Texto>
      ) : null}
      {p.legenda ? <TextoComMencoes texto={p.legenda} /> : null}

      <View style={estilos.rodape}>
        <Pressable
          onPress={() => aoCurtir(p)}
          hitSlop={10}
          style={[estilos.boa, p.euCurti && { backgroundColor: Cores.verde, borderColor: Cores.verde }]}>
          <IconeFogo cor={p.euCurti ? Cores.preto : Cores.verde} cheio={p.euCurti} tamanho={18} />
          <Texto variante="corpo" cor={p.euCurti ? Cores.preto : Cores.texto} style={{ fontFamily: 'Archivo_600SemiBold' }}>
            Boa!
          </Texto>
        </Pressable>
        <Texto variante="legenda" style={{ flex: 1 }}>
          {p.curtidas === 0 ? 'Seja o primeiro' : p.curtidas === 1 ? '1 pessoa' : `${p.curtidas} pessoas`}
        </Texto>
        {aoComentar ? (
          <Pressable onPress={() => aoComentar(p)} hitSlop={10} style={estilos.boa}>
            <IconeBalao cor={Cores.texto} />
            <Texto variante="corpo" style={{ fontFamily: 'Archivo_600SemiBold' }}>
              {p.comentarios > 0 ? p.comentarios : 'Comentar'}
            </Texto>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  card: {
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderLeftWidth: 4,
    padding: Espaco.md,
    gap: Espaco.sm,
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: Espaco.sm },
  rotulo: { fontSize: 56, lineHeight: 58 },
  numeros: { flexDirection: 'row', gap: Espaco.lg },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, marginTop: Espaco.xs },
  boa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: Espaco.md,
    borderRadius: Raio.pilula,
    borderWidth: 1.5,
    borderColor: Cores.borda,
  },
});
