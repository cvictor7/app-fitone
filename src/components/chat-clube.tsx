import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { CampoMencao } from '@/components/campo-mencao';
import { FolhaOpcoes, type ConteudoFolha } from '@/components/folha-opcoes';
import { Texto } from '@/components/texto';
import { TextoComMencoes } from '@/components/texto-mencoes';
import { Cores, Espaco, Raio } from '@/constants/theme';
import {
  apagarMensagemClube,
  enviarNoClube,
  fixarMensagem,
  marcarClubeLido,
  mensagensDoClube,
  ouvirClube,
  type Clube,
  type MensagemClube,
} from '@/lib/clubes';

// Conversa do clube (jeito WhatsApp): mensagens fixadas no alto, balões, @menção,
// segurar a mensagem para fixar/apagar. Mensagem nova chega na hora (e confere a cada 15 s).

function dia(d: Date) {
  const hoje = new Date();
  const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
}
const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const semCodigo = (t: string) => t.replace(/@\[([^\]]{1,40})\]\([0-9a-f-]{36}\)/g, '@$1');

export function ChatClube({ clube }: { clube: Clube }) {
  const [msgs, setMsgs] = useState<MensagemClube[]>([]);
  const [texto, setTexto] = useState('');
  const [textoEnvio, setTextoEnvio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [folha, setFolha] = useState<ConteudoFolha>(null);
  const lista = useRef<ComponentRef<typeof FlatList<MensagemClube>>>(null);
  const podeEnviar = !clube.soAdminsEnviam || clube.souAdmin;

  const carregar = useCallback(async () => {
    try {
      const ms = await mensagensDoClube(clube.id);
      setMsgs((atual) => (atual.length === ms.length && atual.every((m, i) => m.id === ms[i].id && m.fixada === ms[i].fixada) ? atual : ms));
      marcarClubeLido(clube.id);
    } catch {
      // tenta de novo no próximo ciclo
    }
  }, [clube.id]);

  useEffect(() => {
    carregar();
    const desligar = ouvirClube(clube.id, carregar);
    const relogio = setInterval(carregar, 15000);
    return () => {
      desligar();
      clearInterval(relogio);
    };
  }, [carregar, clube.id]);

  useEffect(() => {
    if (msgs.length) setTimeout(() => lista.current?.scrollToEnd({ animated: true }), 80);
  }, [msgs.length]);

  async function enviar() {
    const t = textoEnvio.trim();
    if (!t || enviando) return;
    setErro(null);
    setEnviando(true);
    try {
      await enviarNoClube(clube.id, t);
      setTexto('');
      setTextoEnvio('');
      Haptics.selectionAsync();
      await carregar();
    } catch {
      setErro(podeEnviar ? 'Não deu para enviar. Confira a internet.' : 'Só admins enviam mensagens neste clube.');
    } finally {
      setEnviando(false);
    }
  }

  function opcoes(m: MensagemClube) {
    const ops = [];
    if (clube.souAdmin)
      ops.push({
        texto: m.fixada ? 'Desafixar' : '📌 Fixar no alto',
        aoTocar: () =>
          fixarMensagem(m.id, !m.fixada)
            .then(carregar)
            .catch((e: any) => setErro(String(e?.message ?? '').includes('3 mensagens') ? 'Já tem 3 fixadas: desafixe uma antes.' : 'Não deu certo.')),
      });
    if (m.eu || clube.souAdmin)
      ops.push({
        texto: 'Apagar mensagem',
        destrutivo: true,
        aoTocar: () =>
          apagarMensagemClube(m.id)
            .then(() => setMsgs((l) => l.filter((x) => x.id !== m.id)))
            .catch(() => setErro('Não deu para apagar.')),
      });
    if (ops.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFolha({ titulo: m.eu ? 'Sua mensagem' : `Mensagem de ${m.autor}`, subtitulo: semCodigo(m.texto).slice(0, 80), opcoes: ops });
  }

  const fixadas = msgs.filter((m) => m.fixada);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {fixadas.length > 0 ? (
        <View style={estilos.fixadas}>
          {fixadas.map((m) => (
            <Pressable key={m.id} onLongPress={() => opcoes(m)} style={estilos.fixada}>
              <Texto style={{ fontSize: 14 }}>📌</Texto>
              <Texto variante="legenda" cor={Cores.texto} numberOfLines={2} style={{ flex: 1 }}>
                <Texto variante="legenda" cor={Cores.verde} style={{ fontFamily: 'Archivo_700Bold' }}>
                  {m.autor}:{' '}
                </Texto>
                {semCodigo(m.texto)}
              </Texto>
            </Pressable>
          ))}
        </View>
      ) : null}

      <FlatList
        ref={lista}
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={estilos.vazio}>
            <Texto variante="subtitulo">Comece a conversa</Texto>
            <Texto variante="corpo" cor={Cores.textoSecundario} style={{ textAlign: 'center' }}>
              Combine treino, avise horário, chame a galera. Segure uma mensagem para fixar ou apagar.
            </Texto>
          </View>
        }
        renderItem={({ item, index }) => {
          const anterior = msgs[index - 1];
          const novoDia = !anterior || anterior.criadoEm.toDateString() !== item.criadoEm.toDateString();
          const mesmoAutor = !novoDia && anterior && anterior.autorId === item.autorId && item.criadoEm.getTime() - anterior.criadoEm.getTime() < 180000;
          return (
            <View>
              {novoDia ? (
                <Texto variante="legenda" style={estilos.dia}>
                  {dia(item.criadoEm)}
                </Texto>
              ) : null}
              <View style={[{ flexDirection: 'row', marginTop: mesmoAutor ? 2 : Espaco.sm }, item.eu && { justifyContent: 'flex-end' }]}>
                <Pressable onLongPress={() => opcoes(item)} delayLongPress={350} style={[estilos.balao, item.eu ? estilos.meu : estilos.dele]}>
                  {!item.eu && !mesmoAutor ? (
                    <Texto variante="legenda" cor={Cores.verde} style={{ fontFamily: 'Archivo_700Bold' }}>
                      {item.autor}
                      {item.autorAdmin ? '  · admin' : ''}
                    </Texto>
                  ) : null}
                  <TextoComMencoes texto={item.texto} cor={item.eu ? Cores.preto : Cores.texto} corMencao={item.eu ? Cores.preto : Cores.verde} />
                  <Texto
                    variante="legenda"
                    cor={item.eu ? 'rgba(10,10,10,0.6)' : Cores.textoApagado}
                    style={{ fontSize: 11, lineHeight: 14, alignSelf: 'flex-end' }}>
                    {item.fixada ? '📌 ' : ''}
                    {hora(item.criadoEm)}
                  </Texto>
                </Pressable>
              </View>
            </View>
          );
        }}
      />

      {erro ? (
        <Texto variante="legenda" cor={Cores.perigo} style={{ paddingHorizontal: Espaco.lg }}>
          {erro}
        </Texto>
      ) : null}

      {podeEnviar ? (
        <View style={estilos.barra}>
          <CampoMencao
            valor={texto}
            aoMudar={(v, e) => {
              setTexto(v);
              setTextoEnvio(e);
            }}
            sugestoesEmCima
            placeholder="Mensagem · @ para marcar"
            maxLength={600}
            multiline
            style={{ flex: 1, minHeight: 48, maxHeight: 130, paddingTop: 12, fontSize: 16 }}
          />
          <Pressable onPress={enviar} disabled={!texto.trim() || enviando} style={[estilos.enviar, (!texto.trim() || enviando) && { opacity: 0.4 }]}>
            <Texto variante="corpo" cor={Cores.preto} style={{ fontFamily: 'Archivo_700Bold' }}>
              {enviando ? '...' : 'Enviar'}
            </Texto>
          </Pressable>
        </View>
      ) : (
        <Texto variante="legenda" style={{ textAlign: 'center', padding: Espaco.md }}>
          📢 Clube de avisos: só os admins enviam mensagens.
        </Texto>
      )}

      <FolhaOpcoes conteudo={folha} aoFechar={() => setFolha(null)} />
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { paddingHorizontal: Espaco.lg, paddingVertical: Espaco.md, flexGrow: 1 },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Espaco.sm, paddingVertical: Espaco.xxl },
  dia: { alignSelf: 'center', marginTop: Espaco.md, backgroundColor: Cores.superficie, borderRadius: Raio.pilula, paddingHorizontal: 12, paddingVertical: 3, overflow: 'hidden', textTransform: 'capitalize' },
  balao: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 7, borderRadius: Raio.lg, gap: 2 },
  meu: { backgroundColor: Cores.verde, borderBottomRightRadius: 6 },
  dele: { backgroundColor: Cores.superficieAlta, borderBottomLeftRadius: 6 },
  fixadas: { borderBottomWidth: 1, borderBottomColor: Cores.borda, paddingHorizontal: Espaco.lg, paddingVertical: Espaco.sm, gap: 6 },
  fixada: { flexDirection: 'row', gap: Espaco.sm, alignItems: 'flex-start' },
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Espaco.sm,
    paddingHorizontal: Espaco.lg,
    paddingVertical: Espaco.sm,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
  },
  enviar: { minHeight: 48, paddingHorizontal: Espaco.md, borderRadius: Raio.md, backgroundColor: Cores.verde, alignItems: 'center', justifyContent: 'center' },
});
