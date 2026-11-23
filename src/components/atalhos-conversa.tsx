import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { IconeBalao } from '@/components/icones';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { listarConversas, type Conversa } from '@/lib/chat';

// Aluno · atalho para falar com o personal. Em "Hoje" aparece só quando tem mensagem nova.

export function AtalhosConversa({ soNaoLidas = false }: { soNaoLidas?: boolean }) {
  const [conversas, setConversas] = useState<Conversa[]>([]);

  useFocusEffect(
    useCallback(() => {
      listarConversas()
        .then((cs) => setConversas(cs.filter((c) => !c.souPersonal)))
        .catch(() => setConversas([]));
    }, []),
  );

  const visiveis = soNaoLidas ? conversas.filter((c) => c.naoLidas > 0) : conversas;
  if (visiveis.length === 0) return null;

  return (
    <View style={{ gap: Espaco.sm }}>
      {visiveis.map((c) => {
        const nova = c.naoLidas > 0;
        return (
          <Pressable
            key={c.outroId}
            onPress={() => router.push(`/conversa/${c.outroId}`)}
            style={({ pressed }) => [estilos.linha, nova && { borderColor: Cores.verde }, pressed && { opacity: 0.7 }]}>
            <Avatar nome={c.outroNome} tamanho={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Texto variante="corpo" style={{ fontFamily: 'Archivo_600SemiBold' }} numberOfLines={1}>
                {nova ? `Mensagem de ${c.outroNome.split(' ')[0]}` : `Falar com ${c.outroNome.split(' ')[0]}`}
              </Texto>
              <Texto variante="legenda" numberOfLines={1}>
                {c.ultima ? `${c.ultimaMinha ? 'Você: ' : ''}${c.ultima}` : 'Seu personal · tire dúvidas do treino'}
              </Texto>
            </View>
            {nova ? (
              <View style={estilos.contador}>
                <Texto variante="legenda" cor={Cores.preto} style={{ fontFamily: 'Archivo_700Bold' }}>
                  {c.naoLidas}
                </Texto>
              </View>
            ) : (
              <IconeBalao cor={Cores.textoSecundario} tamanho={22} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.sm,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    padding: Espaco.md,
  },
  contador: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 6,
    backgroundColor: Cores.verde,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
