import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

// Guarda quem está logado e em que ponto do cadastro a pessoa está.
// O layout raiz usa isso para decidir qual tela mostrar.

export type Perfil = { id: string; nome: string };
export type Papel = 'aluno' | 'personal' | 'admin';

type EstadoSessao = {
  carregando: boolean;
  sessao: Session | null;
  perfil: Perfil | null;
  aceitouTermos: boolean;
  gymId: string | null;
  papel: Papel | null;
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
};

const Contexto = createContext<EstadoSessao | null>(null);

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [gymId, setGymId] = useState<string | null>(null);
  const [papel, setPapel] = useState<Papel | null>(null);

  const carregarDados = useCallback(async (s: Session | null) => {
    if (!s) {
      setPerfil(null);
      setAceitouTermos(false);
      setGymId(null);
      setPapel(null);
      return;
    }
    const [p, c, m] = await Promise.all([
      supabase.from('profiles').select('id, nome').eq('id', s.user.id).maybeSingle(),
      supabase
        .from('consentimentos')
        .select('tipo')
        .eq('user_id', s.user.id)
        .in('tipo', ['termos', 'privacidade'])
        .is('revogado_em', null),
      supabase.from('gym_members').select('gym_id, papel').eq('user_id', s.user.id).eq('ativo', true).limit(1),
    ]);
    setPerfil(p.data ?? null);
    const tipos = new Set((c.data ?? []).map((x) => x.tipo));
    setAceitouTermos(tipos.has('termos') && tipos.has('privacidade'));
    setGymId(m.data?.[0]?.gym_id ?? null);
    setPapel((m.data?.[0]?.papel as Papel) ?? null);
  }, []);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      setSessao(data.session);
      await carregarDados(data.session);
      if (ativo) setCarregando(false);
    });
    const { data: escuta } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSessao(s);
      // Fora do callback, para não travar o cliente do Supabase
      setTimeout(() => carregarDados(s), 0);
    });
    return () => {
      ativo = false;
      escuta.subscription.unsubscribe();
    };
  }, [carregarDados]);

  const recarregar = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await carregarDados(data.session);
  }, [carregarDados]);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <Contexto.Provider value={{ carregando, sessao, perfil, aceitouTermos, gymId, papel, recarregar, sair }}>
      {children}
    </Contexto.Provider>
  );
}

export function useSessao() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useSessao fora do ProvedorSessao');
  return ctx;
}
