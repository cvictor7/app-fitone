import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type TextInputProps } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Campo } from '@/components/campo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { buscaAtual, buscarPessoas, montarTexto, type Pessoa } from '@/lib/mencoes';
import { useSessao } from '@/lib/sessao';

// Campo de texto com @menção: digitou "@", aparecem sugestões da galera da Fit One.
// Quem usa chama ref.textoParaEnviar() (ou usa aoMudarFinal) para receber o texto no formato do banco.

type Props = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  valor: string;
  aoMudar: (visivel: string, paraEnviar: string) => void;
  sugestoesEmCima?: boolean; // na barra de comentário (rodapé), a lista abre para cima
};

export function CampoMencao({ valor, aoMudar, sugestoesEmCima = false, ...resto }: Props) {
  const { gymId } = useSessao();
  const [sugestoes, setSugestoes] = useState<Pessoa[]>([]);
  const escolhidas = useRef<Pessoa[]>([]);
  const busca = buscaAtual(valor);

  // texto apagado: esquece quem foi escolhido
  useEffect(() => {
    if (!valor) escolhidas.current = [];
  }, [valor]);

  useEffect(() => {
    if (busca === null || !gymId) {
      setSugestoes([]);
      return;
    }
    let vivo = true;
    const t = setTimeout(() => {
      buscarPessoas(gymId, busca).then((r) => vivo && setSugestoes(r));
    }, 200);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [busca, gymId]);

  function mudar(t: string) {
    aoMudar(t, montarTexto(t, escolhidas.current));
  }

  function escolher(p: Pessoa) {
    if (!escolhidas.current.some((x) => x.userId === p.userId)) escolhidas.current.push(p);
    const novo = valor.replace(/@([^\s@]{0,20})$/, `@${p.nome} `);
    setSugestoes([]);
    mudar(novo);
  }

  const lista =
    sugestoes.length > 0 ? (
      <View style={[estilos.sugestoes, sugestoesEmCima && estilos.emCima]}>
        <ScrollView keyboardShouldPersistTaps="always" style={{ maxHeight: 220 }}>
          {sugestoes.map((p) => (
            <Pressable key={p.userId} onPress={() => escolher(p)} style={({ pressed }) => [estilos.sugestao, pressed && { opacity: 0.6 }]}>
              <Avatar nome={p.nome} tamanho={30} />
              <Texto variante="corpo">{p.nome}</Texto>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    ) : null;

  return (
    <View style={{ flex: (resto.style as any)?.flex }}>
      {sugestoesEmCima ? lista : null}
      <Campo value={valor} onChangeText={mudar} {...resto} />
      {!sugestoesEmCima ? lista : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  sugestoes: {
    backgroundColor: Cores.superficieAlta,
    borderRadius: Raio.md,
    borderWidth: 1,
    borderColor: Cores.borda,
    marginTop: Espaco.xs,
    overflow: 'hidden',
  },
  emCima: { position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: Espaco.xs, zIndex: 10 },
  sugestao: { flexDirection: 'row', alignItems: 'center', gap: Espaco.sm, paddingHorizontal: Espaco.md, minHeight: 48 },
});
