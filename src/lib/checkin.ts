import * as Location from 'expo-location';

import { supabase } from '@/lib/supabase';

// Check-in na academia: o aluno escaneia o QR da recepção. Se a academia marcou o local,
// o celular precisa estar perto (até 300 m) — vale contra foto do QR usada de casa.

export const PREFIXO_QR = 'FITONE-CHECKIN:';

export type ResultadoCheckin = { novo: boolean; criadoEm: Date; noMes: number };

/** Lê o texto do QR e devolve o token, ou null se não for um QR de check-in da Fit One. */
export function tokenDoQr(texto: string): string | null {
  const t = texto.trim();
  return t.startsWith(PREFIXO_QR) ? t.slice(PREFIXO_QR.length) : null;
}

async function localizacao(): Promise<{ lat: number; lng: number } | null> {
  try {
    const p = await Location.requestForegroundPermissionsAsync();
    if (p.status !== 'granted') return null;
    const l = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: l.coords.latitude, lng: l.coords.longitude };
  } catch {
    return null;
  }
}

export async function fazerCheckin(token: string): Promise<ResultadoCheckin> {
  const loc = await localizacao();
  const { data, error } = await supabase.rpc('fazer_checkin', { p_token: token, p_lat: loc?.lat ?? null, p_lng: loc?.lng ?? null });
  if (error) throw new Error(error.message);
  const r = (data as any[])[0];
  return { novo: !!r.novo, criadoEm: new Date(r.criado_em), noMes: Number(r.no_mes) };
}

export function traduzirErroCheckin(msg: string) {
  if (msg.includes('estar na academia')) return msg.replace('Você precisa estar na academia', 'Você precisa estar na Fit One para o check-in');
  if (msg.includes('localização')) return 'Libere a localização para fazer o check-in (Ajustes → Localização).';
  if (msg.includes('QR inválido')) return 'Esse QR não é o da Fit One (ou foi trocado). Peça na recepção.';
  if (msg.includes('Entre na academia')) return 'Entre na academia primeiro.';
  return 'Não deu certo. Confira a internet e tente de novo.';
}

/** Meu check-in de hoje (se teve). */
export async function checkinDeHoje(): Promise<Date | null> {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('checkins')
    .select('criado_em')
    .gte('criado_em', inicio.toISOString())
    .order('criado_em', { ascending: false })
    .limit(1);
  return data?.[0] ? new Date(data[0].criado_em) : null;
}

// ---------- admin ----------

export type ConfigCheckin = { token: string; latitude: number | null; longitude: number | null };
export type PainelCheckin = { hoje: number; semana: number; mes: number; pessoas30d: number; porHora: number[]; porDia: number[] };

export async function configCheckin(gymId: string): Promise<ConfigCheckin> {
  const { data, error } = await supabase.rpc('config_checkin', { p_gym: gymId });
  if (error) throw error;
  const r = (data as any[])[0];
  return { token: r.token, latitude: r.latitude, longitude: r.longitude };
}

export async function novoQr(gymId: string): Promise<string> {
  const { data, error } = await supabase.rpc('novo_qr_checkin', { p_gym: gymId });
  if (error) throw error;
  return data as string;
}

/** Marca a posição atual do celular do admin como o local da academia. */
export async function marcarLocalAqui(gymId: string) {
  const loc = await localizacao();
  if (!loc) throw new Error('Sem localização: libere nos Ajustes e tente de novo, estando na academia.');
  const { error } = await supabase.rpc('definir_local_academia', { p_gym: gymId, p_lat: loc.lat, p_lng: loc.lng });
  if (error) throw error;
}

export async function painelCheckin(gymId: string): Promise<PainelCheckin> {
  const { data, error } = await supabase.rpc('painel_checkins', { p_gym: gymId });
  if (error) throw error;
  const r = (data as any[])[0];
  const horas = Array(24).fill(0);
  for (const [h, n] of Object.entries(r.por_hora ?? {})) horas[Number(h)] = Number(n);
  const dias = Array(7).fill(0);
  for (const [d, n] of Object.entries(r.por_dia ?? {})) dias[Number(d)] = Number(n);
  return { hoje: Number(r.hoje), semana: Number(r.semana), mes: Number(r.mes), pessoas30d: Number(r.pessoas_30d), porHora: horas, porDia: dias };
}
