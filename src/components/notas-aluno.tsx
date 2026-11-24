import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { textoQuando } from '@/lib/dados';
import { supabase } from '@/lib/supabase';

// Personal · o que o aluno anotou nos exercícios ("senti o ombro"...). O banco só deixa ver
// se o aluno autorizou compartilhar os treinos.
type Nota = { texto: string; quando: Date; exercicio: string };

export function NotasAluno({ alunoId }: { alunoId: string }) {
  const [notas, setNotas] = useState<Nota[]>([]);

  useEffect(() => {
    supabase
      .from('notas_exercicio')
      .select('texto, criado_em, exercicios(nome)')
      .eq('aluno_id', alunoId)
      .order('criado_em', { ascending: false })
      .limit(10)
      .then(({ data }) =>
        setNotas(
          ((data ?? []) as any[]).map((n) => ({ texto: n.texto, quando: new Date(n.criado_em), exercicio: n.exercicios?.nome ?? 'Exercício' })),
        ),
      );
  }, [alunoId]);

  if (notas.length === 0) return null;

  return (
    <View style={{ gap: Espaco.sm }}>
      <Texto variante="rotulo">ANOTAÇÕES DO ALUNO</Texto>
      <View style={{ backgroundColor: Cores.superficie, borderRadius: Raio.lg, padding: Espaco.md, gap: Espaco.sm }}>
        {notas.map((n, i) => (
          <View key={i} style={{ gap: 2 }}>
            <Texto variante="legenda">
              {n.exercicio} · {textoQuando(n.quando)}
            </Texto>
            <Texto variante="corpo">📝 {n.texto}</Texto>
          </View>
        ))}
      </View>
    </View>
  );
}
