import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { CampoMencao } from '@/components/campo-mencao';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { publicacaoDaSessao, publicarTreino, removerPublicacao } from '@/lib/comunidade';

// Caixa "Publicar na comunidade" da tela de treino concluído.
// Só publica se o aluno tocar no botão. Dá para tirar depois.

export function PublicarTreino({ sessaoId, rotulo }: { sessaoId: string; rotulo: string }) {
  const [estado, setEstado] = useState<'carregando' | 'livre' | 'enviando' | 'publicado'>('carregando');
  const [pubId, setPubId] = useState<string | null>(null);
  const [legenda, setLegenda] = useState('');
  const [legendaEnvio, setLegendaEnvio] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    publicacaoDaSessao(sessaoId).then((p) => {
      if (p) {
        setPubId(p.id);
        const visivel = (p.legenda ?? '').replace(/@\[([^\]]{1,40})\]\([0-9a-f-]{36}\)/g, '@$1');
        setLegenda(visivel);
        setLegendaEnvio(visivel);
        setEstado('publicado');
      } else setEstado('livre');
    });
  }, [sessaoId]);

  async function publicar() {
    setErro(null);
    setEstado('enviando');
    try {
      await publicarTreino(sessaoId, rotulo, legendaEnvio);
      const p = await publicacaoDaSessao(sessaoId);
      setPubId(p?.id ?? null);
      setEstado('publicado');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setErro(e?.message?.includes('Entre na academia') ? 'Entre na academia primeiro.' : 'Não deu para publicar. Tente de novo.');
      setEstado('livre');
    }
  }

  async function tirar() {
    if (!pubId) return;
    try {
      await removerPublicacao(pubId);
      setPubId(null);
      setEstado('livre');
    } catch {
      setErro('Não deu para tirar agora.');
    }
  }

  if (estado === 'carregando') {
    return (
      <View style={estilos.caixa}>
        <ActivityIndicator color={Cores.verde} />
      </View>
    );
  }

  if (estado === 'publicado') {
    return (
      <View style={[estilos.caixa, { borderColor: Cores.verde }]}>
        <Texto variante="rotulo" cor={Cores.verde}>
          NA COMUNIDADE ✓
        </Texto>
        <Texto variante="corpo" cor={Cores.textoSecundario}>
          A galera da Fit One já pode ver e mandar um "Boa!".
        </Texto>
        <Pressable onPress={tirar} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
          <Texto variante="corpo" cor={Cores.textoSecundario} style={{ textDecorationLine: 'underline' }}>
            Tirar da comunidade
          </Texto>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={estilos.caixa}>
      <Texto variante="rotulo">PUBLICAR NA COMUNIDADE</Texto>
      <Texto variante="legenda">Só a galera da Fit One vê, com seu nome abreviado. Nada de peso corporal.</Texto>
      <CampoMencao
        valor={legenda}
        aoMudar={(v, e) => {
          setLegenda(v);
          setLegendaEnvio(e);
        }}
        placeholder="Escreva algo · @ para marcar quem treinou junto"
        maxLength={280}
        multiline
        style={{ minHeight: 56, paddingTop: 14, fontSize: 16 }}
      />
      {erro ? (
        <Texto variante="legenda" cor={Cores.perigo}>
          {erro}
        </Texto>
      ) : null}
      <Botao titulo={estado === 'enviando' ? 'Publicando...' : 'Publicar'} disabled={estado === 'enviando'} onPress={publicar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    padding: Espaco.md,
    gap: Espaco.sm,
  },
});
