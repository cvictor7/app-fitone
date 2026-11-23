import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraTopo } from '@/components/barra-topo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { useSessao } from '@/lib/sessao';
import { VERSAO_TERMOS, supabase } from '@/lib/supabase';

// Privacidade: o aluno liga/desliga o que o personal vê + texto da política (rascunho).

const SECOES = [
  {
    titulo: 'O que o app guarda',
    texto:
      'Seu nome, e-mail, foto (se você colocar), os treinos que você faz (exercícios, séries, cargas, repetições, duração e como foi) e os recordes. O app não pede nem guarda peso corporal, medidas, altura ou data de nascimento.',
  },
  {
    titulo: 'Quem vê',
    texto:
      'Você vê tudo seu. Seu personal vê o plano que ele montou e, só se você autorizar, os treinos que você fez. Na comunidade, outros alunos veem só seu nome abreviado, sua foto e seus pontos. Ninguém de fora da academia vê seus dados.',
  },
  {
    titulo: 'Para que',
    texto: 'Para montar e registrar seus treinos, mostrar sua evolução e deixar seu personal acompanhar. Nada é vendido nem usado para propaganda.',
  },
  {
    titulo: 'Onde fica',
    texto: 'Num banco de dados do Supabase, com acesso protegido por regras que deixam cada pessoa ver só o que deve.',
  },
  {
    titulo: 'Seus direitos (LGPD)',
    texto:
      'Você pode ver, corrigir e apagar seus dados, e tirar a permissão do personal a qualquer hora aqui nesta tela. Excluir a conta apaga seus treinos e seu perfil.',
  },
];

export default function Privacidade() {
  const { sessao, papel } = useSessao();
  const ehAluno = !!sessao && papel === 'aluno';
  const [compartilha, setCompartilha] = useState<boolean | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!ehAluno) return;
    supabase
      .from('consentimentos')
      .select('id')
      .eq('user_id', sessao!.user.id)
      .eq('tipo', 'compartilhar_com_personal')
      .is('revogado_em', null)
      .then(({ data }) => setCompartilha((data ?? []).length > 0));
  }, [ehAluno, sessao]);

  async function mudar(valor: boolean) {
    if (!sessao) return;
    setSalvando(true);
    setCompartilha(valor);
    const r = valor
      ? await supabase.from('consentimentos').insert({ user_id: sessao.user.id, tipo: 'compartilhar_com_personal', versao: VERSAO_TERMOS })
      : await supabase
          .from('consentimentos')
          .update({ revogado_em: new Date().toISOString() })
          .eq('user_id', sessao.user.id)
          .eq('tipo', 'compartilhar_com_personal')
          .is('revogado_em', null);
    if (r.error) setCompartilha(!valor);
    setSalvando(false);
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Privacidade" />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        {ehAluno ? (
          <View style={estilos.cartao}>
            <View style={{ flex: 1, gap: 2 }}>
              <Texto variante="corpo">Deixar meu personal ver meus treinos</Texto>
              <Texto variante="legenda">Séries, cargas, frequência e recordes. Sem isso ele vê só o plano que montou.</Texto>
            </View>
            {compartilha === null ? null : (
              <Switch
                value={compartilha}
                onValueChange={mudar}
                disabled={salvando}
                trackColor={{ true: Cores.verde, false: Cores.borda }}
                thumbColor={Cores.branco}
              />
            )}
          </View>
        ) : null}

        {SECOES.map((s) => (
          <View key={s.titulo} style={{ gap: Espaco.xs }}>
            <Texto variante="corpo" style={{ fontFamily: 'Archivo_700Bold' }}>
              {s.titulo}
            </Texto>
            <Texto variante="corpo" cor={Cores.textoSecundario}>
              {s.texto}
            </Texto>
          </View>
        ))}
        <Texto variante="legenda">Versão de 16/11/2026 · rascunho</Texto>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, gap: Espaco.lg },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.md,
    padding: Espaco.md,
  },
});
