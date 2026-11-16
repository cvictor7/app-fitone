import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Estas duas chaves são PÚBLICAS (vão dentro do app de qualquer jeito).
// Quem protege os dados são as regras de acesso (RLS) no banco.
// A chave secret / service_role NUNCA entra aqui.
const SUPABASE_URL = 'https://slsvnqrtaecppdtbmbgk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_JWcGZ3l5WWRSO63qqWo9Jg_27MnMMOj';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // A sessão fica salva no celular: a pessoa entra uma vez e não precisa logar de novo.
    storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renova o login sozinho só enquanto o app está aberto na tela (economiza bateria)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const VERSAO_TERMOS = '2026-11-16';
