import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ncpqhkoljjikqrgtelbv.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE' || supabaseAnonKey === 'your_supabase_anon_key_here') {
    console.warn('Supabase API key is missing or using placeholder. Please set VITE_SUPABASE_ANON_KEY in your environment.');
    // We still try to initialize, but it will likely fail with 401/403
  }

  if (!supabaseUrl) {
    console.error('Supabase URL is missing.');
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey || 'placeholder', {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'nafa3-auth-token'
      }
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
  
  return supabaseInstance;
};

export const getRedirectUrl = () => {
  return window.location.origin;
};
