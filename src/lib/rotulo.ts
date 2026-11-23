import { infoModalidade } from '@/constants/theme';

// Palavra curta que aparece grande no lugar da letra (PUSH, PULL, LEGS, COSTAS, HYBRID...).
// Ordem: o que o personal escreveu → nome da modalidade (se não for musculação) → 1ª palavra do nome → letra.
export function rotuloTreino(t: { rotulo?: string | null; nome?: string | null; modalidade?: string | null; letra?: string | null }) {
  const proprio = t.rotulo?.trim();
  if (proprio) return proprio.toUpperCase();
  if (t.modalidade && t.modalidade !== 'musculacao') return infoModalidade(t.modalidade).nome.toUpperCase();
  const primeira = (t.nome ?? '').trim().split(/[\s,/·+-]+/)[0] ?? '';
  if (primeira && primeira.length <= 8 && !/^treino$/i.test(primeira)) return primeira.toUpperCase();
  return (t.letra ?? '✓').toUpperCase();
}
