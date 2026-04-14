import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { debugLog, debugError } from './debug';

let supabaseInstance: SupabaseClient | null = null;

const customFetch = async (url: string, options: any) => {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const tableName = pathParts[pathParts.length - 1] || 'unknown';
  const method = options.method || 'GET';
  
  // Map HTTP methods to Operation Types
  const operationMap: Record<string, string> = {
    'GET': 'SELECT',
    'POST': 'INSERT',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE',
    'PUT': 'UPSERT'
  };
  
  const operation = operationMap[method] || method;
  
  // Extract payload if present
  let payload = null;
  if (options.body) {
    try {
      payload = JSON.parse(options.body);
    } catch (e) {
      payload = options.body;
    }
  }

  // Log the request
  debugLog('SUPABASE', `Request: ${operation} on table "${tableName}"`, {
    url: urlObj.pathname + urlObj.search,
    payload
  });

  try {
    const response = await fetch(url, options);
    const clonedResponse = response.clone();
    
    if (response.ok) {
      try {
        const data = await clonedResponse.json();
        debugLog('SUPABASE', `Response: SUCCESS from table "${tableName}"`, data);
      } catch (e) {
        debugLog('SUPABASE', `Response: SUCCESS from table "${tableName}" (No JSON)`);
      }
    } else {
      try {
        const errorData = await clonedResponse.json();
        debugError('SUPABASE', `Response: ERROR from table "${tableName}" (${response.status})`, errorData);
      } catch (e) {
        debugError('SUPABASE', `Response: ERROR from table "${tableName}" (${response.status})`);
      }
    }
    
    return response;
  } catch (error) {
    debugError('SUPABASE', `Network Error on table "${tableName}"`, error);
    throw error;
  }
};

export const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ncpqhkoljjikqrgtelbv.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseAnonKey || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE' || supabaseAnonKey === 'your_supabase_anon_key_here') {
    console.warn('Supabase API key is missing or using placeholder. Please set VITE_SUPABASE_ANON_KEY in your environment.');
  }

  if (!supabaseUrl) {
    console.error('Supabase URL is missing.');
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey || 'placeholder', {
      global: {
        fetch: customFetch
      },
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
